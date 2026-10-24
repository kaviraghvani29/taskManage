import Task from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

const unblockDependentTasks = async (completedTaskId, changedBy) => {
  const blockedTasks = await Task.find({
    status: "Blocked",
    dependsOn: completedTaskId,
  });

  for (const task of blockedTasks) {
    const dependencies = await Task.find({
      _id: { $in: task.dependsOn },
    });

    const allCompleted = dependencies.every((dependency) =>
      ["Completed", "Closed"].includes(dependency.status),
    );

    if (allCompleted) {
      task.status = "Assigned";

      // Record who triggered this automatic transition.
      task.$locals.auditUser = changedBy || task.assignedBy;

      // Task.js middleware records the status change.
      await task.save();

      if (task.assignedTo) {
        await Notification.create({
          user: task.assignedTo,
          task: task._id,
          message: `Task "${task.title}" is unblocked and ready to start`,
          type: "Status",
        });
      }
    }
  }
};

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

      const userId = String(req.user._id);

      const canAccessProject =
        req.user.role === "Admin" ||
        String(projectDoc.createdBy) === userId ||
        projectDoc.teamMembers.some((member) => String(member) === userId);

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
      const isMember = projectDoc.teamMembers.some(
        (member) => String(member) === String(targetUser._id),
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

    const task = new Task({
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

    // Tell the automatic Task middleware who performed this action.
    task.$locals.auditUser = req.user._id;

    // The Task model's save middleware records creation history.
    await task.save();

    if (!targetUser._id.equals(req.user._id)) {
      await Notification.create({
        user: targetUser._id,
        task: task._id,
        message: `You have been assigned: ${task.title}`,
        type: "Assignment",
      });
    }

    return res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Create task error:", error.message);
    return res.status(500).json({
      message: "Failed to create task",
    });
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

    const paginate =
      req.query.page !== undefined || req.query.limit !== undefined;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );

    let query = Task.find(filter)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email role")
      .populate("project", "name")
      .sort({ dueDate: 1, createdAt: -1 });

    if (paginate) {
      query = query.skip((page - 1) * limit).limit(limit);
    }

    const [tasks, total] = await Promise.all([
      query,
      Task.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: total,
      tasks,
      ...(paginate && {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
    });
  } catch (error) {
    console.error("Get tasks error:", error.message);
    return res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const userId = req.user._id.toString();
    const role = req.user.role;

    const isAdmin = role === "Admin";
    const isManager = role === "Manager";
    const isEmployee = role === "Employee";

    if (!isAdmin && !isManager && !isEmployee) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Employees can only update assigned tasks or their own drafts.
    if (isEmployee) {
      const isAssignee = task.assignedTo?.toString() === userId;
      const isOwnDraft =
        task.assignedBy?.toString() === userId && task.status === "Draft";

      if (!isAssignee && !isOwnDraft) {
        return res.status(403).json({
          success: false,
          message:
            "You can only update tasks assigned to you or your own drafts.",
        });
      }

      const restrictedFields = [
        "assignedTo",
        "assignedBy",
        "project",
        "approvalStatus",
        "rejectionReason",
      ];

      if (restrictedFields.some((field) => field in req.body)) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to change these task fields.",
        });
      }
    }

    // Load the associated project.
    const projectDoc = task.project
      ? await Project.findById(task.project)
      : null;

    // Managers can only manage projects they own or belong to.
    if (isManager) {
      const canManage =
        projectDoc &&
        (projectDoc.createdBy?.toString() === userId ||
          projectDoc.teamMembers.some(
            (member) => member.toString() === userId,
          ));

      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: "You cannot manage tasks in this project.",
        });
      }
    }

    const oldStatus = task.status;
    const oldAssigneeId = task.assignedTo?.toString() || null;

    // Reassign tasks: Admin or authorized Manager only.
    if (req.body.assignedTo !== undefined) {
      if (!isAdmin && !isManager) {
        return res.status(403).json({
          success: false,
          message: "Only Admins and Managers can reassign tasks.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.body.assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "A valid employee ID is required.",
        });
      }

      if (!projectDoc) {
        return res.status(400).json({
          success: false,
          message: "A valid project is required for reassignment.",
        });
      }

      const newAssignee = await User.findById(req.body.assignedTo);

      if (!newAssignee) {
        return res.status(404).json({
          success: false,
          message: "The selected employee was not found.",
        });
      }

      if (newAssignee.role !== "Employee" || newAssignee.isActive === false) {
        return res.status(400).json({
          success: false,
          message: "Select an active employee for reassignment.",
        });
      }

      const isProjectMember = projectDoc.teamMembers.some(
        (member) => member.toString() === newAssignee._id.toString(),
      );

      if (!isProjectMember) {
        return res.status(400).json({
          success: false,
          message: "The employee must belong to this project's team.",
        });
      }

      task.assignedTo = newAssignee._id;
    }

    // Update ordinary task fields.
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

    // Validate and apply status transitions.
    if (req.body.status !== undefined) {
      const requestedStatus = req.body.status;

      if (isEmployee) {
        if (["Closed", "Pending Review"].includes(requestedStatus)) {
          return res.status(403).json({
            success: false,
            message: "Only a Manager or Admin can review tasks.",
          });
        }

        if (requestedStatus === "Completed") {
          task.status = "Pending Review";
          task.approvalStatus = "Pending";
          task.progress = 100;
        } else if (
          ["In Progress", "Blocked", "Open"].includes(requestedStatus)
        ) {
          task.status = requestedStatus;
        } else {
          return res.status(400).json({
            success: false,
            message: "Invalid status transition.",
          });
        }
      } else {
        // Use the dedicated review endpoint for completion approval.
        if (
          ["Completed", "Pending Review", "Closed"].includes(requestedStatus)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Use the task review endpoint to approve or reopen a task.",
          });
        }

        if (
          !["Draft", "Open", "Assigned", "In Progress", "Blocked"].includes(
            requestedStatus,
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid status.",
          });
        }

        task.status = requestedStatus;
      }
    }

    // A task cannot start while any dependency is unfinished.
    if (task.status === "In Progress" && task.dependsOn.length > 0) {
      const dependencies = await Task.find({
        _id: { $in: task.dependsOn },
      });

      if (
        dependencies.length !== task.dependsOn.length ||
        dependencies.some(
          (dependency) => !["Completed", "Closed"].includes(dependency.status),
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Complete dependent tasks before starting this task.",
        });
      }
    }

    // Automatic TaskHistory middleware records changed fields.
    task.$locals.auditUser = req.user._id;
    await task.save();

    // Notify the new assignee after successful reassignment.
    const newAssigneeId = task.assignedTo?.toString() || null;

    if (oldAssigneeId !== newAssigneeId && newAssigneeId) {
      await Notification.create({
        user: task.assignedTo,
        task: task._id,
        message: `Task "${task.title}" has been assigned to you.`,
        type: "Assignment",
      });

      // Notify the previous assignee as well.
      if (oldAssigneeId) {
        await Notification.create({
          user: oldAssigneeId,
          task: task._id,
          message: `Task "${task.title}" has been reassigned to another employee.`,
          type: "Assignment",
        });
      }
    }

    // Notify the current assignee of status changes.
    if (oldStatus !== task.status && task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        task: task._id,
        message: `Task "${task.title}" status changed to ${task.status}.`,
        type: "Status",
      });
    }

    return res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Update task error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update task.",
    });
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

    task.status = action === "approve" ? "Closed" : "In Progress";
    task.approvalStatus = action === "approve" ? "Approved" : "Rejected";
    task.rejectionReason = action === "reopen" ? reason.trim() : "";

    // Record the authenticated user for automatic audit history.
    task.$locals.auditUser = req.user._id;

    // Task.js middleware records all changed fields automatically.
    await task.save();

    if (action === "approve") {
      await unblockDependentTasks(task._id, req.user._id);
    }

    if (task.assignedTo) {
      await Notification.create({
        user: task.assignedTo,
        task: task._id,
        message: `Task "${task.title}" was ${
          action === "approve" ? "approved" : "reopened"
        }`,
        type: "Status",
      });
    }

    return res.json({ success: true, task });
  } catch (error) {
    console.error("Review task error:", error.message);

    return res.status(500).json({
      message: "Failed to review task",
    });
  }
};

export const logTaskTime = async (req, res) => {
  try {
    const { hours, remarks = "" } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (!task.assignedTo?.equals(req.user._id)) {
      return res.status(403).json({
        message: "Only the assigned employee can log work",
      });
    }

    if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) {
      return res.status(400).json({
        message: "Hours must be a positive number",
      });
    }

    task.timeEntries.push({
      hours,
      remarks,
      loggedBy: req.user._id,
    });

    task.actualHours += hours;

    // Identify the employee who logged the time.
    task.$locals.auditUser = req.user._id;

    // Task.js middleware records actualHours and timeEntries.
    await task.save();

    return res.json({ success: true, task });
  } catch (error) {
    console.error("Log task time error:", error.message);

    return res.status(500).json({
      message: "Failed to log work time",
    });
  }
};

export const authorizeTaskAttachment = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    let allowed = req.user.role === "Admin";

    if (req.user.role === "Employee") {
      allowed =
        task.assignedTo?.equals(req.user._id) ||
        task.assignedBy?.equals(req.user._id);
    }

    if (req.user.role === "Manager" && task.project) {
      const project = await Project.findById(task.project);

      allowed = Boolean(
        project &&
        (project.createdBy.equals(req.user._id) ||
          project.teamMembers.some((id) => id.equals(req.user._id))),
      );
    }

    if (!allowed) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.task = task;
    next();
  } catch {
    res.status(500).json({ message: "Unable to verify task access" });
  }
};

export const uploadTaskAttachments = async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({
        message: "Select at least one file",
      });
    }

    const task = req.task;

    const newAttachments = req.files.map((file) => `/uploads/${file.filename}`);

    task.attachments.push(...newAttachments);

    // Record the authenticated user for automatic audit history.
    task.$locals.auditUser = req.user._id;

    // Task.js middleware records attachment changes automatically.
    await task.save();

    return res.json({
      success: true,
      message: "Attachments uploaded successfully",
      attachments: task.attachments,
    });
  } catch (error) {
    console.error("Attachment upload error:", error.message);

    return res.status(500).json({
      message: "Failed to upload attachments",
    });
  }
};

export const reviewTaskAssignment = async (req, res) => {
  try {
    const { action, reason } = req.body;

    if (!["Admin", "Manager"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Action must be approve or reject",
      });
    }

    if (action === "reject" && !reason?.trim()) {
      return res.status(400).json({
        message: "A rejection reason is required",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.status !== "Draft" || task.approvalStatus !== "Pending") {
      return res.status(400).json({
        message: "Task is not awaiting assignment approval",
      });
    }

    if (!task.project) {
      return res.status(400).json({
        message: "Assignment approval requires a project",
      });
    }

    if (req.user.role === "Manager") {
      const project = await Project.findById(task.project);

      const allowed =
        project &&
        (project.createdBy.equals(req.user._id) ||
          project.teamMembers.some((id) => id.equals(req.user._id)));

      if (!allowed) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (action === "approve") {
      const dependencies = await Task.find({
        _id: { $in: task.dependsOn },
      });

      const blocked = dependencies.some(
        (dependency) => !["Completed", "Closed"].includes(dependency.status),
      );

      task.status = blocked ? "Blocked" : "Assigned";
      task.approvalStatus = "Approved";
      task.rejectionReason = "";
    } else {
      task.status = "Draft";
      task.approvalStatus = "Rejected";
      task.rejectionReason = reason.trim();
    }

    // Identify the Admin/Manager who made this decision.
    task.$locals.auditUser = req.user._id;

    // Task.js middleware records all changed fields automatically.
    await task.save();

    const recipients = [
      ...new Set(
        [task.assignedBy, task.assignedTo].filter(Boolean).map(String),
      ),
    ];

    await Notification.insertMany(
      recipients.map((userId) => ({
        user: userId,
        task: task._id,
        type: "Status",
        message:
          action === "approve"
            ? `Assignment approved: ${task.title}`
            : `Assignment rejected: ${task.title}. Reason: ${reason.trim()}`,
      })),
    );

    return res.json({ success: true, task });
  } catch (error) {
    console.error("Assignment review error:", error.message);

    return res.status(500).json({
      message: "Failed to review task assignment",
    });
  }
};
