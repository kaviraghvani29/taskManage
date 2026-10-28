import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import taskHistoryRoutes from "./routes/taskHistoryRoutes.js";
import startTaskScheduler from "./jobs/taskScheduler.js";
import userRoutes from "./routes/userRoutes.js";
import { uploadsDir } from "./middleware/uploadMiddleware.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import { setSocketServer } from "./config/socket.js";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.set("io", io);

setSocketServer(io);

io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";

    const tokenCookie = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("token="));

    const cookieToken = tokenCookie
      ? decodeURIComponent(tokenCookie.slice("token=".length))
      : null;

    const bearerToken = socket.handshake.headers.authorization?.replace(
      /^Bearer\s+/i,
      "",
    );

    const token = cookieToken || socket.handshake.auth?.token || bearerToken;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new Error("User not found or inactive"));
    }

    socket.userId = user._id.toString();
    socket.userRole = user.role;

    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || "";

    const tokenCookie = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("token="));

    const cookieToken = tokenCookie
      ? decodeURIComponent(tokenCookie.slice("token=".length))
      : null;

    const bearerToken = socket.handshake.headers.authorization?.replace(
      /^Bearer\s+/i,
      "",
    );

    const token = cookieToken || socket.handshake.auth?.token || bearerToken;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return next(new Error("User not found or inactive"));
    }

    socket.userId = user._id.toString();
    socket.userRole = user.role;

    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);

  console.log(`Authenticated Socket.IO user connected: ${socket.userId}`);

  socket.on("disconnect", () => {
    console.log(`Socket.IO user disconnected: ${socket.userId}`);
  });
});

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Task Management API is running" });
});
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/task-history", taskHistoryRoutes);

const startServer = async () => {
  await connectDB();
  startTaskScheduler();

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
