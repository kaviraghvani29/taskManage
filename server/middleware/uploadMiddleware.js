import multer from "multer";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(currentDir, "../uploads");

mkdirSync(uploadsDir, { recursive: true });

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  if (!allowedTypes.has(file.mimetype)) {
    return callback(
      new Error("Only PDF, Word, TXT, JPG, PNG, and WEBP files are allowed."),
    );
  }

  callback(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
});
