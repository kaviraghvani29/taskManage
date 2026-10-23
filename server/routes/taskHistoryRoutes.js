import express from "express";
import { getTaskHistory } from "../controllers/taskHistoryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:taskId", protect, getTaskHistory);

export default router;
