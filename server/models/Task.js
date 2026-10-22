import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 150,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: [
        "Draft",
        "Open",
        "Assigned",
        "In Progress",
        "Blocked",
        "Pending Review",
        "Completed",
        "Closed",
      ],
      default: "Draft",
    },
    dueDate: Date,
    estimatedHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    remarks: {
      type: String,
      default: "",
    },
    tags: [String],
    attachments: [String],
    dependsOn: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    approvalStatus: {
      type: String,
      enum: ["None", "Pending", "Approved", "Rejected"],
      default: "None",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    timeEntries: [
      {
        hours: { type: Number, required: true, min: 0 },
        remarks: { type: String, default: "" },
        loggedAt: { type: Date, default: Date.now },
        loggedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  { timestamps: true },
);

taskSchema.virtual("isOverdue").get(function () {
  return Boolean(
    this.dueDate &&
    this.dueDate < new Date() &&
    !["Completed", "Closed"].includes(this.status),
  );
});

taskSchema.set("toJSON", { virtuals: true });
taskSchema.set("toObject", { virtuals: true });

export default mongoose.model("Task", taskSchema);
