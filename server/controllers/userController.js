import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Project from "../models/Project.js";

export const getUsers = async (req, res) => {
  try {
    let filter = req.user.role === "Admin" ? {} : { isActive: true };

    if (req.user.role === "Manager") {
      const projects = await Project.find({
        $or: [{ createdBy: req.user._id }, { teamMembers: req.user._id }],
      }).select("createdBy teamMembers");

      const ids = new Set([req.user._id.toString()]);

      projects.forEach((project) => {
        ids.add(project.createdBy.toString());
        project.teamMembers.forEach((member) => {
          ids.add(member.toString());
        });
      });

      filter._id = { $in: [...ids] };
    } else if (req.user.role === "Employee") {
      const projects = await Project.find({
        teamMembers: req.user._id,
      }).select("teamMembers");

      const ids = new Set();

      projects.forEach((project) => {
        project.teamMembers.forEach((member) => {
          ids.add(member.toString());
        });
      });

      filter = {
        isActive: true,
        role: "Employee",
        _id: {
          $in: [...ids],
          $ne: req.user._id,
        },
      };
    } else if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find(filter)
      .select("name email role isActive createdAt")
      .sort({ name: 1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters",
      });
    }

    if (!["Admin", "Manager", "Employee"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role,
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to create user" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updates = {};

    if (role !== undefined) {
      if (!["Admin", "Manager", "Employee"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updates.role = role;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be boolean" });
      }
      updates.isActive = isActive;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "No valid updates provided" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("name email role isActive");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch {
    res.status(500).json({ message: "Failed to update user" });
  }
};
