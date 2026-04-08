// config/socket.js
// Socket.IO yapılandırması
import { Server } from "socket.io";
import { decodedToken } from "../utils/generateToken.js";
import User from "../models/User.js";
import { syncExpiredBan } from "../utils/ban.js";

let io = null;
const connectedUsers = new Map(); // userId -> socket info

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Middleware: Token doğrulama
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
      if (!token) {
        return next(new Error("Token bulunamadı"));
      }

      const decoded = decodedToken(token);
      if (!decoded) {
        return next(new Error("Geçersiz token"));
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error("Kullanıcı bulunamadı"));
      }

      const { activeBan } = await syncExpiredBan(user);
      if (activeBan && ["full", "chat_only"].includes(activeBan.scope)) {
        return next(new Error("Hesap chat erişimi için banlanmış"));
      }

      socket.userId = decoded.id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Doğrulama hatası: " + error.message));
    }
  });

  // Connection event
  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    socket.join(`role:${socket.user.role}`);

    connectedUsers.set(userId, {
      socketId: socket.id,
      connectedAt: new Date(),
      role: socket.user.role,
    });

    console.log(`[Socket] Kullanıcı bağlandı: ${userId} (${socket.id})`);

    // User online event
    socket.broadcast.emit("user:online", { userId, timestamp: new Date() });

    // Hata handling
    socket.on("error", (error) => {
      console.error(`[Socket Error] ${userId}:`, error);
    });

    // Disconnect event
    socket.on("disconnect", () => {
      connectedUsers.delete(userId);
      console.log(`[Socket] Kullanıcı ayrıldı: ${userId}`);
      socket.broadcast.emit("user:offline", { userId, timestamp: new Date() });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO henüz başlatılmadı");
  }
  return io;
};

const getConnectedUsers = () => connectedUsers;

const isUserOnline = (userId) => connectedUsers.has(userId);

const emitToRole = (role, event, payload) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export { initializeSocket, getIO, getConnectedUsers, isUserOnline, emitToRole, emitToUser };
