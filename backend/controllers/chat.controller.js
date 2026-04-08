import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getActiveRestriction, syncExpiredBan, syncExpiredRestrictions } from "../utils/ban.js";

// @desc    Chat oluştur (direct veya group)
// @route   POST /api/chat/create
// @access  Private
const createChat = async (req, res) => {
  try {
    const { type, participantIds, name, description } = req.body;
    const userId = req.user._id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const { activeBan } = await syncExpiredBan(currentUser);
    await syncExpiredRestrictions(currentUser);

    if (activeBan && ["chat_only", "add_users_only"].includes(activeBan.scope)) {
      return res.status(403).json({
        status: false,
        code: "ACTION_BLOCKED_BY_BAN",
        message: "Bu işlem ban kapsamı nedeniyle engellendi",
        statusCode: 403,
        data: {
          scope: activeBan.scope,
          reason: activeBan.reason,
          bannedUntil: activeBan.bannedUntil,
        },
      });
    }

    const addUsersRestriction = getActiveRestriction(currentUser, "addUsers");
    if (addUsersRestriction && participantIds?.length > 0) {
      return res.status(403).json({
        status: false,
        code: "ADD_USERS_RESTRICTED",
        message: "Yeni kullanıcı ekleme işlemi kısıtlandı",
        statusCode: 403,
        data: {
          restrictedUntil: addUsersRestriction.restrictedUntil,
          reason: addUsersRestriction.reason,
        },
      });
    }

    if (!type || !["direct", "group"].includes(type)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_CHAT_TYPE",
        message: "Geçersiz chat türü",
        statusCode: 400,
      });
    }

    if (type === "direct") {
      if (!participantIds || participantIds.length !== 1) {
        return res.status(400).json({
          status: false,
          code: "INVALID_PARTICIPANTS",
          message: "Direct chat için 1 katılımcı gerekli",
          statusCode: 400,
        });
      }

      // Existing direct chat kontrol et
      const existingChat = await Chat.findOne({
        type: "direct",
        participants: { $all: [userId, participantIds[0]] },
      });

      if (existingChat) {
        return res.status(200).json({
          status: true,
          code: "CHAT_EXISTS",
          message: "Chat zaten mevcut",
          statusCode: 200,
          data: existingChat,
        });
      }

      const newChat = new Chat({
        type: "direct",
        participants: [{ userId: userId }, { userId: participantIds[0] }],
      });

      await newChat.save();

      return res.status(201).json({
        status: true,
        code: "CHAT_CREATED",
        message: "Chat başarıyla oluşturuldu",
        statusCode: 201,
        data: newChat,
      });
    }

    // Group chat
    if (!name) {
      return res.status(400).json({
        status: false,
        code: "GROUP_NAME_REQUIRED",
        message: "Grup adı gerekli",
        statusCode: 400,
      });
    }

    const newChat = new Chat({
      type: "group",
      name,
      description: description || "",
      admin: userId,
      participants: [{ userId: userId, role: "admin" }, ...participantIds.map((id) => ({ userId: id, role: "member" }))],
    });

    await newChat.save();

    res.status(201).json({
      status: true,
      code: "CHAT_CREATED",
      message: "Grup başarıyla oluşturuldu",
      statusCode: 201,
      data: newChat,
    });
  } catch (error) {
    console.error("Chat oluşturma hatası:", error);
    res.status(500).json({
      status: false,
      code: "CHAT_CREATE_ERROR",
      message: "Chat oluşturulurken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcının tüm chat'lerini getir
// @route   GET /api/chat
// @access  Private
const getChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const chats = await Chat.find({
      "participants.userId": userId,
    })
      .populate("participants.userId", "firstName lastName profilePicture isOnline lastSeen")
      .populate("lastMessage.senderId", "firstName lastName profilePicture")
      .populate("admin", "firstName lastName profilePicture")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Chat.countDocuments({
      "participants.userId": userId,
    });

    res.status(200).json({
      status: true,
      code: "CHATS_RETRIEVED",
      message: "Chat'ler başarıyla alındı",
      statusCode: 200,
      data: chats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Chat'ler getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "CHATS_RETRIEVE_ERROR",
      message: "Chat'ler getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Chat detaylarını getir
// @route   GET /api/chat/:chatId
// @access  Private
const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate("participants.userId", "firstName lastName profilePicture isOnline lastSeen")
      .populate("admin", "firstName lastName profilePicture")
      .populate("lastMessage.senderId", "firstName lastName");

    if (!chat) {
      return res.status(404).json({
        status: false,
        code: "CHAT_NOT_FOUND",
        message: "Chat bulunamadı",
        statusCode: 404,
      });
    }

    // Kullanıcı katılımcı mı kontrol et
    const isParticipant = chat.participants.some((p) => p.userId._id.toString() === userId.toString());
    if (!isParticipant) {
      return res.status(403).json({
        status: false,
        code: "NOT_PARTICIPANT",
        message: "Bu chat'e erişim yetkiniz yok",
        statusCode: 403,
      });
    }

    res.status(200).json({
      status: true,
      code: "CHAT_RETRIEVED",
      message: "Chat başarıyla alındı",
      statusCode: 200,
      data: chat,
    });
  } catch (error) {
    console.error("Chat getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "CHAT_RETRIEVE_ERROR",
      message: "Chat getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Mesaj gönder
// @route   POST /api/chat/:chatId/messages
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = "text", attachments = [] } = req.body;
    const userId = req.user._id;

    if (!content && attachments.length === 0) {
      return res.status(400).json({
        status: false,
        code: "EMPTY_MESSAGE",
        message: "Mesaj boş olamaz",
        statusCode: 400,
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        status: false,
        code: "CHAT_NOT_FOUND",
        message: "Chat bulunamadı",
        statusCode: 404,
      });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const { activeBan } = await syncExpiredBan(currentUser);
    await syncExpiredRestrictions(currentUser);

    if (activeBan && ["chat_only", "messaging_only"].includes(activeBan.scope)) {
      return res.status(403).json({
        status: false,
        code: "ACTION_BLOCKED_BY_BAN",
        message: "Mesaj gönderme işlemi ban kapsamı nedeniyle engellendi",
        statusCode: 403,
        data: {
          scope: activeBan.scope,
          reason: activeBan.reason,
          bannedUntil: activeBan.bannedUntil,
        },
      });
    }

    if (activeBan && activeBan.scope === "group_message_only" && chat.type === "group") {
      return res.status(403).json({
        status: false,
        code: "GROUP_MESSAGE_BLOCKED_BY_BAN",
        message: "Grup mesajı gönderme işlemi ban kapsamı nedeniyle engellendi",
        statusCode: 403,
        data: {
          scope: activeBan.scope,
          reason: activeBan.reason,
          bannedUntil: activeBan.bannedUntil,
        },
      });
    }

    const groupMessagingRestriction = getActiveRestriction(currentUser, "groupMessaging");
    if (groupMessagingRestriction && chat.type === "group") {
      return res.status(403).json({
        status: false,
        code: "GROUP_MESSAGE_RESTRICTED",
        message: "Grup mesajı gönderme yetkiniz geçici olarak kısıtlandı",
        statusCode: 403,
        data: {
          restrictedUntil: groupMessagingRestriction.restrictedUntil,
          reason: groupMessagingRestriction.reason,
        },
      });
    }

    const message = new Message({
      chatId,
      senderId: userId,
      content,
      type,
      attachments,
    });

    await message.save();

    // Populate sender info
    await message.populate("senderId", "firstName lastName profilePicture");

    // Chat lastMessage güncelle
    chat.lastMessage = {
      messageId: message._id,
      content,
      senderId: userId,
      sentAt: new Date(),
    };
    chat.metadata.totalMessages = (chat.metadata.totalMessages || 0) + 1;
    await chat.save();

    res.status(201).json({
      status: true,
      code: "MESSAGE_SENT",
      message: "Mesaj başarıyla gönderildi",
      statusCode: 201,
      data: message,
    });
  } catch (error) {
    console.error("Mesaj gönderme hatası:", error);
    res.status(500).json({
      status: false,
      code: "MESSAGE_SEND_ERROR",
      message: "Mesaj gönderilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Chat mesajlarını getir
// @route   GET /api/chat/:chatId/messages
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    const messages = await Message.find({ chatId, deleted: false })
      .populate("senderId", "firstName lastName profilePicture isOnline")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ chatId, deleted: false });

    res.status(200).json({
      status: true,
      code: "MESSAGES_RETRIEVED",
      message: "Mesajlar başarıyla alındı",
      statusCode: 200,
      data: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Mesajlar getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "MESSAGES_RETRIEVE_ERROR",
      message: "Mesajlar getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Mesajı düzenle
// @route   PUT /api/chat/:chatId/messages/:messageId
// @access  Private
const editMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({
        status: false,
        code: "EMPTY_CONTENT",
        message: "Mesaj içerik boş olamaz",
        statusCode: 400,
      });
    }

    const message = await Message.findOneAndUpdate(
      { _id: messageId, chatId, senderId: userId },
      {
        content,
        edited: true,
        editedAt: new Date(),
        $push: {
          editHistory: {
            content,
            editedAt: new Date(),
          },
        },
      },
      { new: true },
    ).populate("senderId", "firstName lastName profilePicture");

    if (!message) {
      return res.status(404).json({
        status: false,
        code: "MESSAGE_NOT_FOUND",
        message: "Mesaj bulunamadı veya düzenlemek için yetkiniz yok",
        statusCode: 404,
      });
    }

    res.status(200).json({
      status: true,
      code: "MESSAGE_EDITED",
      message: "Mesaj başarıyla düzenlendi",
      statusCode: 200,
      data: message,
    });
  } catch (error) {
    console.error("Mesaj düzenleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "MESSAGE_EDIT_ERROR",
      message: "Mesaj düzenlenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Mesajı sil
// @route   DELETE /api/chat/:chatId/messages/:messageId
// @access  Private
const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findOneAndUpdate(
      { _id: messageId, chatId, senderId: userId },
      {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true },
    );

    if (!message) {
      return res.status(404).json({
        status: false,
        code: "MESSAGE_NOT_FOUND",
        message: "Mesaj bulunamadı veya silmek için yetkiniz yok",
        statusCode: 404,
      });
    }

    res.status(200).json({
      status: true,
      code: "MESSAGE_DELETED",
      message: "Mesaj başarıyla silindi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Mesaj silme hatası:", error);
    res.status(500).json({
      status: false,
      code: "MESSAGE_DELETE_ERROR",
      message: "Mesaj silinirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Mesajı okundu olarak işaretle
// @route   POST /api/chat/:chatId/messages/:messageId/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        $addToSet: {
          readBy: {
            userId,
            readAt: new Date(),
          },
        },
        status: "read",
      },
      { new: true },
    );

    if (!message) {
      return res.status(404).json({
        status: false,
        code: "MESSAGE_NOT_FOUND",
        message: "Mesaj bulunamadı",
        statusCode: 404,
      });
    }

    res.status(200).json({
      status: true,
      code: "MESSAGE_READ",
      message: "Mesaj okundu olarak işaretlendi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Mesaj okundu işaretleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "MESSAGE_READ_ERROR",
      message: "Mesaj okundu işareti eklenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Chat sil
// @route   DELETE /api/chat/:chatId
// @access  Private
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        status: false,
        code: "CHAT_NOT_FOUND",
        message: "Chat bulunamadı",
        statusCode: 404,
      });
    }

    // Group chat'te sadece admin silebilir
    if (chat.type === "group" && chat.admin.toString() !== userId.toString()) {
      return res.status(403).json({
        status: false,
        code: "NOT_AUTHORIZED",
        message: "Sadece grup yöneticisi grubu silebilir",
        statusCode: 403,
      });
    }

    await Chat.findByIdAndDelete(chatId);
    await Message.deleteMany({ chatId });

    res.status(200).json({
      status: true,
      code: "CHAT_DELETED",
      message: "Chat başarıyla silindi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Chat silme hatası:", error);
    res.status(500).json({
      status: false,
      code: "CHAT_DELETE_ERROR",
      message: "Chat silinirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Chat ayarlarını güncelle
// @route   PUT /api/chat/:chatId/settings
// @access  Private
const updateChatSettings = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const { notificationsEnabled, muted } = req.body;

    const chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $set: {
          "settings.notificationsEnabled": notificationsEnabled,
          ...(muted && { "settings.mutedUntil": new Date(muted) }),
        },
      },
      { new: true },
    );

    if (!chat) {
      return res.status(404).json({
        status: false,
        code: "CHAT_NOT_FOUND",
        message: "Chat bulunamadı",
        statusCode: 404,
      });
    }

    res.status(200).json({
      status: true,
      code: "SETTINGS_UPDATED",
      message: "Ayarlar başarıyla güncellendi",
      statusCode: 200,
      data: chat,
    });
  } catch (error) {
    console.error("Ayarlar güncelleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "SETTINGS_UPDATE_ERROR",
      message: "Ayarlar güncellenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Gruba kullanıcı ekle
// @route   POST /api/chat/:chatId/participants
// @access  Private
const addParticipants = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { participantIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({
        status: false,
        code: "INVALID_PARTICIPANTS",
        message: "Eklenecek kullanıcı listesi geçersiz",
        statusCode: 400,
      });
    }

    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const { activeBan } = await syncExpiredBan(currentUser);
    await syncExpiredRestrictions(currentUser);

    if (activeBan && ["chat_only", "add_users_only"].includes(activeBan.scope)) {
      return res.status(403).json({
        status: false,
        code: "ACTION_BLOCKED_BY_BAN",
        message: "Kullanıcı ekleme işlemi ban kapsamı nedeniyle engellendi",
        statusCode: 403,
        data: {
          scope: activeBan.scope,
          reason: activeBan.reason,
          bannedUntil: activeBan.bannedUntil,
        },
      });
    }

    const addUsersRestriction = getActiveRestriction(currentUser, "addUsers");
    if (addUsersRestriction) {
      return res.status(403).json({
        status: false,
        code: "ADD_USERS_RESTRICTED",
        message: "Yeni kullanıcı ekleme işlemi kısıtlandı",
        statusCode: 403,
        data: {
          restrictedUntil: addUsersRestriction.restrictedUntil,
          reason: addUsersRestriction.reason,
        },
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        status: false,
        code: "CHAT_NOT_FOUND",
        message: "Chat bulunamadı",
        statusCode: 404,
      });
    }

    if (chat.type !== "group") {
      return res.status(400).json({
        status: false,
        code: "NOT_GROUP_CHAT",
        message: "Bu işlem sadece grup chatlerinde yapılabilir",
        statusCode: 400,
      });
    }

    if (chat.admin.toString() !== userId.toString()) {
      return res.status(403).json({
        status: false,
        code: "NOT_GROUP_ADMIN",
        message: "Sadece grup yöneticisi kullanıcı ekleyebilir",
        statusCode: 403,
      });
    }

    const existingIds = new Set(chat.participants.map((p) => p.userId.toString()));
    const participantsToAdd = participantIds
      .map((id) => id.toString())
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ userId: id, role: "member" }));

    if (participantsToAdd.length === 0) {
      return res.status(200).json({
        status: true,
        code: "NO_NEW_PARTICIPANTS",
        message: "Eklenecek yeni kullanıcı bulunamadı",
        statusCode: 200,
      });
    }

    chat.participants.push(...participantsToAdd);
    chat.metadata.totalParticipants = chat.participants.length;
    await chat.save();

    return res.status(200).json({
      status: true,
      code: "PARTICIPANTS_ADDED",
      message: "Kullanıcılar gruba eklendi",
      statusCode: 200,
      data: {
        addedCount: participantsToAdd.length,
        totalParticipants: chat.participants.length,
      },
    });
  } catch (error) {
    console.error("Gruba kullanıcı ekleme hatası:", error);
    return res.status(500).json({
      status: false,
      code: "ADD_PARTICIPANTS_ERROR",
      message: "Kullanıcılar gruba eklenirken hata oluştu",
      statusCode: 500,
    });
  }
};

export { createChat, getChats, getChatById, sendMessage, getMessages, editMessage, deleteMessage, markAsRead, deleteChat, updateChatSettings, addParticipants };
