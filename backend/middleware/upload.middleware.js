import fs from "fs";
import path from "path";
import multer from "multer";

const supportUploadDir = path.join(process.cwd(), "uploads", "support");
if (!fs.existsSync(supportUploadDir)) {
  fs.mkdirSync(supportUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, supportUploadDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt", ".zip"]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new Error("Destek eki için dosya tipi desteklenmiyor"));
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!allowedExtensions.has(ext)) {
    return cb(new Error("Dosya uzantisi desteklenmiyor"));
  }

  return cb(null, true);
};

const supportUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
});

export { supportUpload };
