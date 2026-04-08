// server.js
// Bu dosya, Express.js sunucusunu başlatır ve gerekli middleware'leri, rotaları ve veritabanı bağlantısını yapılandırır.
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import chalk from "chalk";
import helmet from "helmet";
import { createServer } from "http";
import path from "path";

import { connectDB } from "./config/database.js";
import { initializeSocket } from "./config/socket.js";
import { logger } from "./middleware/logger.js";
import { validateJSON, validateNotEmpty } from "./middleware/validation.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { runSupportSlaSweep } from "./controllers/support.controller.js";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const server = createServer(app);

// Socket.IO başlat
initializeSocket(server);

// Middleware - Helmet (Security)
app.use(helmet());

// Middleware - Logger
app.use(logger);

// Middleware - CORS ve Parser
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Static dosya servisi (destek ticket ekleri)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Middleware - Validation
app.use(validateJSON);
app.use(validateNotEmpty);

// Veritabanı bağlantısı
connectDB();

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Sunucu çalışıyor",
    timestamp: new Date().toISOString(),
  });
});

// Rotalar
app.use("/api", routes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: false,
    code: "NOT_FOUND",
    message: "Endpoint bulunamadı",
    statusCode: 404,
  });
});

// Global error handler (en son middleware olmalı)
app.use(errorHandler);

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(chalk.blue(`\n🚀 Sunucu ${PORT} portunda çalışıyor...`));
  console.log(chalk.green(`📡 Socket.IO aktif`));
  console.log(chalk.yellow(`🔒 CORS kaynağı: ${process.env.CORS_ORIGIN || "http://localhost:3000"}\n`));
});

const SUPPORT_SLA_SWEEP_MS = Number(process.env.SUPPORT_SLA_SWEEP_MS || 5 * 60 * 1000);
setInterval(async () => {
  try {
    await runSupportSlaSweep();
  } catch (error) {
    console.error("[SLA Sweep Error]", error.message);
  }
}, SUPPORT_SLA_SWEEP_MS);
