import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createChat,
  getChats,
  getChatById,
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  markAsRead,
  deleteChat,
  updateChatSettings,
  addParticipants,
} from "../controllers/chat.controller.js";

const router = express.Router();

// Tüm routes korumalı
router.use(protect);

// Chat CRUD
router.post("/create", createChat);
router.get("/", getChats);
router.get("/:chatId", getChatById);
router.delete("/:chatId", deleteChat);
router.put("/:chatId/settings", updateChatSettings);
router.post("/:chatId/participants", addParticipants);

// Mesajlar
router.post("/:chatId/messages", sendMessage);
router.get("/:chatId/messages", getMessages);
router.put("/:chatId/messages/:messageId", editMessage);
router.delete("/:chatId/messages/:messageId", deleteMessage);
router.post("/:chatId/messages/:messageId/read", markAsRead);

export default router;
