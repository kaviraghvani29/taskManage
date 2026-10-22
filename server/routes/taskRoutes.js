import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  reviewTask,
} from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createTask);
router.get("/", getTasks);
router.patch("/:id", updateTask);
router.patch("/:id/review", reviewTask);

export default router;
