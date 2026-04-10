// server.js
// Bu dosya, Express.js sunucusunu başlatır ve gerekli middleware'leri, rotaları ve veritabanı bağlantısını yapılandırır.
import dotenv from "dotenv";
import chalk from "chalk";
import { createServer } from "http";

import { connectDB } from "./config/database.js";
import { initializeSocket } from "./config/socket.js";
import { createApp } from "./app.js";
import { runSupportSlaSweep } from "./controllers/support.controller.js";

dotenv.config();

const app = createApp();
const server = createServer(app);

// Socket.IO başlat
initializeSocket(server);

// Veritabanı bağlantısı
connectDB();

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
