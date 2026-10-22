import express from "express";
import {
  createProject,
  getProjects,
} from "../controllers/projectController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("Admin", "Manager"), createProject);

router.get("/", protect, getProjects);

export default router;
