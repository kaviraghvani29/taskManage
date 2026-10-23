import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
} from "../controllers/userController.js";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getUsers);
router.post("/", authorizeRoles("Admin"), createUser);
router.patch("/:id", authorizeRoles("Admin"), updateUser);

export default router;
