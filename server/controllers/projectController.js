import Project from "../models/Project.js";
import User from "../models/User.js";

export const createProject = async (req, res) => {
  try {
    const { name, description, teamMembers = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    if (!Array.isArray(teamMembers)) {
      return res.status(400).json({ message: "Invalid team members" });
    }

    const uniqueMembers = [...new Set(teamMembers.map(String))];

    const users = await User.find({
      _id: { $in: uniqueMembers },
      isActive: true,
    });

    if (users.length !== uniqueMembers.length) {
      return res.status(400).json({
        message: "One or more team members are invalid",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      createdBy: req.user._id,
      teamMembers: uniqueMembers,
    });

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ message: "Failed to create project" });
  }
};

export const getProjects = async (req, res) => {
  try {
    const filter =
      req.user.role === "Admin"
        ? {}
        : {
            $or: [{ createdBy: req.user._id }, { teamMembers: req.user._id }],
          };

    const projects = await Project.find(filter)
      .populate("createdBy", "name email role")
      .populate("teamMembers", "name email role");

    res.json({ success: true, projects });
  } catch {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};
