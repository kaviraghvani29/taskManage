import express from "express";
import {
  getDashboard,
  getWorkload,
  getUrgentTasks,
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/dashboard", getDashboard);
router.get("/workload", getWorkload);
router.get("/urgent-tasks", getUrgentTasks);

export default router;
