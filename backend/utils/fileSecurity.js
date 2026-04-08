import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf", ".txt", ".zip"]);
const blockedExtensions = new Set([".exe", ".bat", ".cmd", ".com", ".ps1", ".js", ".vbs", ".msi", ".dll", ".scr"]);

const assertFileExtensionSafe = (file) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  if (blockedExtensions.has(ext)) {
    throw new Error(`Tehlikeli dosya uzantisi engellendi: ${ext}`);
  }

  if (!allowedExtensions.has(ext)) {
    throw new Error(`Desteklenmeyen dosya uzantisi: ${ext}`);
  }
};

const scanFilesForThreats = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  for (const file of files) {
    assertFileExtensionSafe(file);
  }

  if (process.env.ENABLE_CLAMAV_SCAN !== "true") {
    return;
  }

  const scannerBin = process.env.CLAMAV_BIN || "clamscan";
  for (const file of files) {
    try {
      await execFileAsync(scannerBin, ["--no-summary", file.path]);
    } catch (error) {
      throw new Error(`Dosya guvenlik taramasini gecemedi: ${file.originalname}`);
    }
  }
};

const cleanupUploadedFiles = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  await Promise.all(
    files.map(async (file) => {
      try {
        if (file?.path) {
          await fs.unlink(file.path);
        }
      } catch {
        // Sessizce geç
      }
    }),
  );
};

export { scanFilesForThreats, cleanupUploadedFiles };
