import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  reviewTask,
  logTaskTime,
} from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createTask);
router.get("/", getTasks);
router.patch("/:id", updateTask);
router.patch("/:id/review", reviewTask);
router.post("/:id/time-entries", logTaskTime);

export default router;
