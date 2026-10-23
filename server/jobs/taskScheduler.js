import cron from "node-cron";
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";

const startTaskScheduler = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);

      const activeTasks = await Task.find({
        status: { $nin: ["Completed", "Closed"] },
        dueDate: { $ne: null },
      });

      for (const task of activeTasks) {
        if (!task.assignedTo) continue;

        if (task.dueDate > now && task.dueDate <= tomorrow) {
          const recentReminder = await Notification.findOne({
            task: task._id,
            user: task.assignedTo,
            type: "Reminder",
            createdAt: { $gte: new Date(now.getTime() - 24 * 3600000) },
          });

          if (!recentReminder) {
            await Notification.create({
              user: task.assignedTo,
              task: task._id,
              message: `Reminder: "${task.title}" is due within 24 hours`,
              type: "Reminder",
            });
          }
        }

        if (task.dueDate < twoDaysAgo) {
          const alreadyNotified = await Notification.findOne({
            task: task._id,
            type: "Overdue",
          });

          if (task.priority !== "Critical") {
            task.priority = "Critical";
            task.$locals.auditActorType = "system";
            await task.save();
          }

          if (!alreadyNotified && task.assignedBy) {
            await Notification.create({
              user: task.assignedBy,
              task: task._id,
              message: `Task "${task.title}" is overdue by more than 2 days`,
              type: "Overdue",
            });
          }
        }
      }
    } catch (error) {
      console.error("Task scheduler error:", error.message);
    }
  });
};

export default startTaskScheduler;
