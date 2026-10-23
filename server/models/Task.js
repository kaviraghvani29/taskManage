import mongoose from "mongoose";
import TaskHistory from "./TaskHistory.js";

const AUDITED_FIELDS = [
  "title",
  "description",
  "project",
  "assignedTo",
  "assignedBy",
  "priority",
  "status",
  "dueDate",
  "estimatedHours",
  "actualHours",
  "progress",
  "remarks",
  "tags",
  "attachments",
  "dependsOn",
  "approvalStatus",
  "rejectionReason",
  "timeEntries",
];

// Convert Mongoose values to stable, comparable plain values.
function normalizeValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (typeof value?.toObject === "function") {
    value = value.toObject({ depopulate: true });
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== "__v")
        .sort()
        .map((key) => [key, normalizeValue(value[key])]),
    );
  }

  return value;
}

function sameValue(first, second) {
  return (
    JSON.stringify(normalizeValue(first)) ===
    JSON.stringify(normalizeValue(second))
  );
}

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

// PRE-SAVE: capture old values before the task is saved.
taskSchema.pre("save", async function () {
  this.$locals.auditWasNew = this.isNew;
  this.$locals.auditChanges = [];

  if (this.isNew) {
    this.$locals.auditChanges.push({
      field: "created",
      oldValue: null,
      newValue: {
        title: this.title,
        status: this.status,
      },
    });

    return;
  }

  const oldTask = await this.constructor
    .findById(this._id)
    .select(AUDITED_FIELDS.join(" "))
    .lean();

  if (!oldTask) {
    return;
  }

  for (const field of AUDITED_FIELDS) {
    const oldValue = normalizeValue(oldTask[field]);
    const newValue = normalizeValue(this.get(field));

    if (!sameValue(oldValue, newValue)) {
      this.$locals.auditChanges.push({
        field,
        oldValue,
        newValue,
      });
    }
  }
});

// POST-SAVE: persist the audit records after saving the task.
taskSchema.post("save", async function () {
  const changes = this.$locals.auditChanges || [];

  if (changes.length === 0) {
    return;
  }

  // Controllers will set auditUser to the authenticated user.
  // The fallback keeps task creation auditable until controllers
  // are updated to set the actor for every save.
  const changedBy = this.$locals.auditUser || this.assignedBy;

  if (!changedBy) {
    throw new Error("Cannot record task history: changedBy user is missing.");
  }

  await TaskHistory.create(
    changes.map((change) => ({
      task: this._id,
      changedBy,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      timestamp: new Date(),
    })),
  );

  delete this.$locals.auditChanges;
  delete this.$locals.auditWasNew;
});

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
