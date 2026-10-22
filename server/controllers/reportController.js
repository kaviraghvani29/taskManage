import Task from "../models/Task.js";
import Project from "../models/Project.js";

const getTaskFilter = async (user) => {
  if (user.role === "Admin") return {};

  if (user.role === "Manager") {
    const projects = await Project.find({
      $or: [{ createdBy: user._id }, { teamMembers: user._id }],
    }).select("_id");

    return { project: { $in: projects.map((p) => p._id) } };
  }

  return { assignedTo: user._id };
};

export const getDashboard = async (req, res) => {
  try {
    const filter = await getTaskFilter(req.user);

    const counts = await Task.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({ success: true, counts });
  } catch {
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};

export const getWorkload = async (req, res) => {
  try {
    const filter = await getTaskFilter(req.user);

    const workload = await Task.aggregate([
      {
        $match: {
          ...filter,
          assignedTo: { $ne: null },
          status: { $nin: ["Completed", "Closed"] },
        },
      },
      {
        $group: {
          _id: "$assignedTo",
          estimatedHours: { $sum: "$estimatedHours" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "employee",
        },
      },
      { $unwind: "$employee" },
      {
        $project: {
          _id: 0,
          employeeId: "$_id",
          name: "$employee.name",
          estimatedHours: 1,
          overloaded: { $gt: ["$estimatedHours", 40] },
        },
      },
    ]);

    res.json({ success: true, workload });
  } catch {
    res.status(500).json({ message: "Failed to calculate workload" });
  }
};

export const getUrgentTasks = async (req, res) => {
  try {
    const filter = await getTaskFilter(req.user);
    const tasks = await Task.find({
      ...filter,
      status: { $nin: ["Completed", "Closed"] },
    });

    const weights = { Low: 1, Medium: 2, High: 3, Critical: 4 };

    const urgentTasks = tasks
      .map((task) => {
        const daysLeft = task.dueDate
          ? (new Date(task.dueDate) - Date.now()) / 86400000
          : null;

        const urgencyScore =
          (weights[task.priority] || 1) +
          (daysLeft === null ? 0 : 10 / Math.max(1, daysLeft));

        return { ...task.toJSON(), urgencyScore };
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore);

    res.json({ success: true, tasks: urgentTasks });
  } catch {
    res.status(500).json({ message: "Failed to sort urgent tasks" });
  }
};
