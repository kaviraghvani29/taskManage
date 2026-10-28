import mongoose from "mongoose";
import { getSocketServer } from "../config/socket.js";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["Assignment", "Status", "Reminder", "Overdue"],
      default: "Assignment",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

notificationSchema.post("save", function (doc) {
  const io = getSocketServer();

  if (!io) return;

  io.to(`user:${doc.user.toString()}`).emit("notification:new", doc.toObject());
});

export default mongoose.model("Notification", notificationSchema);
