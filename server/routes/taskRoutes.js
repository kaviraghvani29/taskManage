import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  reviewTask,
  logTaskTime,
  reviewTaskAssignment,
} from "../controllers/taskController.js";
import {
  authorizeTaskAttachment,
  uploadTaskAttachments,
} from "../controllers/taskController.js";

import { upload } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createTask);
router.get("/", getTasks);
router.patch("/:id", updateTask);
router.patch("/:id/review", reviewTask);
router.post("/:id/time-entries", logTaskTime);
router.post(
  "/:id/attachments",
  authorizeTaskAttachment,
  (req, res, next) => {
    upload.array("attachments", 5)(req, res, (error) => {
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      next();
    });
  },
  uploadTaskAttachments,
);
router.patch("/:id/assignment-review", reviewTaskAssignment);

export default router;
