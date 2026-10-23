import Task from "../models/Task.js";
import Project from "../models/Project.js";
import TaskHistory from "../models/TaskHistory.js";

export const getTaskHistory = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    let allowed = req.user.role === "Admin";

    if (req.user.role === "Employee") {
      allowed =
        task.assignedTo?.equals(req.user._id) ||
        task.assignedBy.equals(req.user._id);
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

    const history = await TaskHistory.find({ task: task._id })
      .populate("changedBy", "name email role")
      .sort({ timestamp: -1 });

    res.json({ success: true, history });
  } catch {
    res.status(500).json({ message: "Failed to fetch task history" });
  }
};
