import mongoose from "mongoose";

const taskHistorySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      immutable: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.actorType !== "system";
      },
      immutable: true,
    },
    actorType: {
      type: String,
      enum: ["user", "system"],
      default: "user",
      immutable: true,
    },
    field: {
      type: String,
      required: true,
      immutable: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      immutable: true,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      immutable: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  },
);

// Allow creating history records, but prevent editing existing records.
taskHistorySchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Task history records cannot be modified.");
  }
});

// Block query-based modifications.
const blockModification = function () {
  throw new Error("Task history records are immutable.");
};

[
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "replaceOne",
  "findOneAndReplace",
].forEach((operation) => {
  taskHistorySchema.pre(operation, blockModification);
});

// Block query-based deletion.
["deleteOne", "deleteMany", "findOneAndDelete"].forEach((operation) => {
  taskHistorySchema.pre(operation, blockModification);
});

// Block document-based deletion.
taskHistorySchema.pre(
  "deleteOne",
  { document: true, query: false },
  blockModification,
);

export default mongoose.model("TaskHistory", taskHistorySchema);
