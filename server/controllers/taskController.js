import Task from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import TaskHistory from "../models/TaskHistory.js";
import Notification from "../models/Notification.js";

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignedTo,
      priority,
      dueDate,
      estimatedHours,
      tags,
      dependsOn,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (
      estimatedHours !== undefined &&
      (!Number.isFinite(estimatedHours) || estimatedHours < 0)
    ) {
      return res.status(400).json({
        message: "Estimated hours must be a non-negative number",
      });
    }

    if (priority && !["Low", "Medium", "High", "Critical"].includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const isEmployee = req.user.role === "Employee";

    if (!isEmployee && (!project || !assignedTo)) {
      return res.status(400).json({
        message: "Project and assignee are required",
      });
    }

    let projectDoc = null;

    if (project) {
      projectDoc = await Project.findById(project);

      if (!projectDoc) {
        return res.status(404).json({ message: "Project not found" });
      }

      const canAccessProject =
        req.user.role === "Admin" ||
        projectDoc.createdBy.equals(req.user._id) ||
        projectDoc.teamMembers.some((id) => id.equals(req.user._id));

      if (!canAccessProject) {
        return res.status(403).json({
          message: "You cannot create tasks in this project",
        });
      }
    }

    const targetId = assignedTo || req.user._id;
    const targetUser = await User.findById(targetId);

    if (!targetUser || !targetUser.isActive) {
      return res.status(400).json({ message: "Invalid assignee" });
    }

    if (targetUser.role !== "Employee") {
      return res.status(400).json({
        message: "Tasks can only be assigned to employees",
      });
    }

    if (projectDoc) {
      const isMember = projectDoc.teamMembers.some((id) =>
        id.equals(targetUser._id),
      );

      if (!isMember) {
        return res.status(400).json({
          message: "Assignee must belong to the project team",
        });
      }
    }

    const assigningPeer = isEmployee && !targetUser._id.equals(req.user._id);

    if (isEmployee && !project && assigningPeer) {
      return res.status(400).json({
        message: "Peer assignment requires a project",
      });
    }

    const dependencyIds = [...new Set((dependsOn || []).map(String))];

    const dependencies = await Task.find({
      _id: { $in: dependencyIds },
    });

    if (dependencies.length !== dependencyIds.length) {
      return res.status(400).json({
        message: "One or more dependency tasks do not exist",
      });
    }

    if (
      dependencies.some(
        (task) => !task.project || !project || !task.project.equals(project),
      )
    ) {
      return res.status(400).json({
        message: "Dependencies must belong to the same project",
      });
    }

    const blocked = dependencies.some(
      (task) => !["Completed", "Closed"].includes(task.status),
    );

    const status = assigningPeer
      ? "Draft"
      : isEmployee
        ? project
          ? blocked
            ? "Blocked"
            : "Open"
          : "Draft"
        : blocked
          ? "Blocked"
          : "Assigned";

    const task = await Task.create({
      title: title.trim(),
      description,
      project: project || null,
      assignedTo: targetUser._id,
      assignedBy: req.user._id,
      priority,
      status,
      dueDate,
      estimatedHours,
      tags,
      dependsOn: dependencyIds,
      approvalStatus: assigningPeer ? "Pending" : "None",
    });

    await TaskHistory.create({
      task: task._id,
      changedBy: req.user._id,
      field: "created",
      oldValue: null,
      newValue: { title: task.title, status: task.status },
    });

    if (!targetUser._id.equals(req.user._id)) {
      await Notification.create({
        user: targetUser._id,
        task: task._id,
        message: `You have been assigned: ${task.title}`,
        type: "Assignment",
      });
    }

    return res.status(201).json({ success: true, task });
  } catch (error) {
    console.error("Create task error:", error.message);
    return res.status(500).json({ message: "Failed to create task" });
  }
};

export const getTasks = async (req, res) => {
  try {
    const conditions = [];
    const { status, priority, project, assignedTo, overdue, search } =
      req.query;

    if (req.user.role === "Manager") {
      const projects = await Project.find({
        $or: [{ createdBy: req.user._id }, { teamMembers: req.user._id }],
      }).select("_id");

      conditions.push({
        project: { $in: projects.map((p) => p._id) },
      });
    } else if (req.user.role === "Employee") {
      conditions.push({
        $or: [{ assignedTo: req.user._id }, { assignedBy: req.user._id }],
      });
    }

    if (status) conditions.push({ status });
    if (priority) conditions.push({ priority });
    if (project) conditions.push({ project });
    if (assignedTo) conditions.push({ assignedTo });

    if (overdue === "true") {
      conditions.push({
        dueDate: { $lt: new Date() },
        status: { $nin: ["Completed", "Closed"] },
      });
    }

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      conditions.push({
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { description: { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    const filter = conditions.length ? { $and: conditions } : {};

    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("project", "name")
      .sort({ dueDate: 1, createdAt: -1 });

    return res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    console.error("Get tasks error:", error.message);
    return res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user.role === "Admin";
    const isManager = req.user.role === "Manager";
    const isEmployee = req.user.role === "Employee";

    if (
      isEmployee &&
      !task.assignedTo?.equals(req.user._id) &&
      !task.assignedBy.equals(req.user._id)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (isManager) {
      const projectDoc = task.project
        ? await Project.findById(task.project)
        : null;

      const canManage =
        projectDoc &&
        (projectDoc.createdBy.equals(req.user._id) ||
          projectDoc.teamMembers.some((id) => id.equals(req.user._id)));

      if (!canManage) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const oldStatus = task.status;
    const allowedFields = [
      "title",
      "description",
      "priority",
      "dueDate",
      "estimatedHours",
      "progress",
      "remarks",
      "tags",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    }

    if (req.body.status !== undefined) {
      if (isEmployee) {
        if (["Closed", "Pending Review"].includes(req.body.status)) {
          return res.status(403).json({
            message: "Only a manager or admin can review tasks",
          });
        }

        if (req.body.status === "Completed") {
          task.status = "Pending Review";
          task.approvalStatus = "Pending";
          task.progress = 100;
        } else if (
          ["In Progress", "Blocked", "Open"].includes(req.body.status)
        ) {
          task.status = req.body.status;
        } else {
          return res.status(400).json({
            message: "Invalid status transition",
          });
        }
      } else {
        task.status = req.body.status;
      }
    }

    if (task.status === "In Progress" && task.dependsOn.length) {
      const dependencies = await Task.find({
        _id: { $in: task.dependsOn },
      });

      if (
        dependencies.some(
          (dependency) => !["Completed", "Closed"].includes(dependency.status),
        )
      ) {
        return res.status(400).json({
          message: "Complete dependent tasks before starting this task",
        });
      }
    }

    await task.save();

    const changes = [];

    if (oldStatus !== task.status) {
      changes.push({
        task: task._id,
        changedBy: req.user._id,
        field: "status",
        oldValue: oldStatus,
        newValue: task.status,
      });

      if (task.assignedTo) {
        await Notification.create({
          user: task.assignedTo,
          task: task._id,
          message: `Task "${task.title}" status changed to ${task.status}`,
          type: "Status",
        });
      }
    }

    if (changes.length) {
      await TaskHistory.insertMany(changes);
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error("Update task error:", error.message);
    res.status(500).json({ message: "Failed to update task" });
  }
};

export const reviewTask = async (req, res) => {
  try {
    const { action, reason } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!["Admin", "Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (task.status !== "Pending Review") {
      return res.status(400).json({
        message: "Task is not pending review",
      });
    }

    if (!["approve", "reopen"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reopen",
      });
    }

    if (action === "reopen" && !reason?.trim()) {
      return res.status(400).json({
        message: "A rejection reason is required",
      });
    }

    if (req.user.role === "Manager") {
      const projectDoc = task.project
        ? await Project.findById(task.project)
        : null;

      const canReview =
        projectDoc &&
        (projectDoc.createdBy.equals(req.user._id) ||
          projectDoc.teamMembers.some((id) => id.equals(req.user._id)));

      if (!canReview) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const oldStatus = task.status;

    task.status = action === "approve" ? "Closed" : "In Progress";
    task.approvalStatus = action === "approve" ? "Approved" : "Rejected";
    task.rejectionReason = action === "reopen" ? reason.trim() : "";

    await task.save();

    await TaskHistory.create({
      task: task._id,
      changedBy: req.user._id,
      field: "status",
      oldValue: oldStatus,
      newValue: task.status,
    });

    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        task: task._id,
        message: `Task "${task.title}" was ${action === "approve" ? "approved" : "reopened"}`,
        type: "Status",
      });
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error("Review task error:", error.message);
    res.status(500).json({ message: "Failed to review task" });
  }
};
