import mongoose from "mongoose";
import SupportTicket from "../models/SupportTicket.js";
import { emitToRole, emitToUser } from "../config/socket.js";
import { cleanupUploadedFiles, scanFilesForThreats } from "../utils/fileSecurity.js";

const ensureAdmin = (req, res) => {
  if (req.user.role !== "admin") {
    res.status(403).json({
      status: false,
      code: "NOT_ADMIN",
      message: "Sadece yöneticiler bu işlemi yapabilir",
      statusCode: 403,
    });
    return false;
  }
  return true;
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const prioritySlaMinutes = {
  low: { firstResponse: 240, resolution: 4320 },
  normal: { firstResponse: 120, resolution: 2880 },
  high: { firstResponse: 60, resolution: 1440 },
  urgent: { firstResponse: 30, resolution: 720 },
};

const nextEscalationPriority = {
  low: "normal",
  normal: "high",
  high: "urgent",
  urgent: "urgent",
};

const emitToAssignedAdmins = (ticket, event, payload) => {
  if (ticket?.assignedTo) {
    emitToUser(ticket.assignedTo.toString(), event, payload);
    return;
  }
  emitToRole("admin", event, payload);
};

const buildAttachmentsFromFiles = (files = []) =>
  files.map((file) => ({
    url: `/uploads/support/${file.filename}`,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  }));

const applySlaOnCreate = (ticket) => {
  const now = new Date();
  const config = prioritySlaMinutes[ticket.priority] || prioritySlaMinutes.normal;

  ticket.sla = {
    ...ticket.sla,
    firstResponseDueAt: new Date(now.getTime() + config.firstResponse * 60 * 1000),
    resolutionDueAt: new Date(now.getTime() + config.resolution * 60 * 1000),
    totalFirstResponseMinutes: 0,
    totalResolutionMinutes: 0,
    isFirstResponseBreached: false,
    isResolutionBreached: false,
  };
};

const applyFirstResponseSlaOnAdminReply = (ticket) => {
  if (ticket.sla?.firstResponseAt) return;

  const now = new Date();
  const diffMinutes = Math.max(0, Math.round((now.getTime() - new Date(ticket.createdAt).getTime()) / 60000));
  ticket.sla.firstResponseAt = now;
  ticket.sla.totalFirstResponseMinutes = diffMinutes;
  ticket.sla.isFirstResponseBreached = Boolean(ticket.sla.firstResponseDueAt && now > new Date(ticket.sla.firstResponseDueAt));
};

const applyResolutionSlaIfDone = (ticket, status) => {
  if (!["resolved", "closed"].includes(status)) return;
  const now = new Date();
  const diffMinutes = Math.max(0, Math.round((now.getTime() - new Date(ticket.createdAt).getTime()) / 60000));
  ticket.sla.totalResolutionMinutes = diffMinutes;
  ticket.sla.isResolutionBreached = Boolean(ticket.sla.resolutionDueAt && now > new Date(ticket.sla.resolutionDueAt));
};

const createTicket = async (req, res) => {
  try {
    await scanFilesForThreats(req.files || []);

    const { subject, message, category = "other", priority = "normal" } = req.body;
    const attachments = buildAttachmentsFromFiles(req.files || []);

    if (!subject || !message) {
      return res.status(400).json({
        status: false,
        code: "MISSING_FIELDS",
        message: "Konu ve mesaj alanlari zorunludur",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.create({
      createdBy: req.user._id,
      subject,
      category,
      priority,
      status: "open",
      messages: [
        {
          sender: req.user._id,
          senderRole: "user",
          message,
          attachments,
          isInternalNote: false,
        },
      ],
      lastMessageAt: new Date(),
    });

    applySlaOnCreate(ticket);
    await ticket.save();

    emitToAssignedAdmins(ticket, "support:ticket_created", {
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      priority: ticket.priority,
      category: ticket.category,
      createdBy: req.user._id,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
    });

    return res.status(201).json({
      status: true,
      code: "TICKET_CREATED",
      message: "Destek talebi olusturuldu",
      statusCode: 201,
      data: {
        ticketId: ticket._id,
        ticketNo: ticket.ticketNo,
        status: ticket.status,
        sla: ticket.sla,
      },
    });
  } catch (error) {
    await cleanupUploadedFiles(req.files || []);
    console.error("Ticket olusturma hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_CREATE_ERROR",
      message: "Destek talebi olusturulurken hata olustu",
      statusCode: 500,
    });
  }
};

const listMyTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = { createdBy: req.user._id };
    if (status) query.status = status;

    const tickets = await SupportTicket.find(query)
      .select("ticketNo subject category priority status assignedTo lastMessageAt createdAt updatedAt sla")
      .populate("assignedTo", "firstName lastName username")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SupportTicket.countDocuments(query);

    return res.status(200).json({
      status: true,
      code: "MY_TICKETS_RETRIEVED",
      message: "Destek talepleri getirildi",
      statusCode: 200,
      data: tickets,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Ticket listeleme hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_LIST_ERROR",
      message: "Destek talepleri listelenirken hata olustu",
      statusCode: 500,
    });
  }
};

const getMyTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findOne({ _id: ticketId, createdBy: req.user._id })
      .populate("createdBy", "firstName lastName username")
      .populate("assignedTo", "firstName lastName username")
      .populate("messages.sender", "firstName lastName username role");

    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Destek talebi bulunamadi",
        statusCode: 404,
      });
    }

    const visibleMessages = ticket.messages.filter((m) => !m.isInternalNote);
    const payload = ticket.toObject();
    payload.messages = visibleMessages;

    return res.status(200).json({
      status: true,
      code: "TICKET_RETRIEVED",
      message: "Destek talebi getirildi",
      statusCode: 200,
      data: payload,
    });
  } catch (error) {
    console.error("Ticket detay hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_DETAIL_ERROR",
      message: "Destek talebi getirilirken hata olustu",
      statusCode: 500,
    });
  }
};

const addMessageToMyTicket = async (req, res) => {
  try {
    await scanFilesForThreats(req.files || []);

    const { ticketId } = req.params;
    const { message } = req.body;
    const attachments = buildAttachmentsFromFiles(req.files || []);

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    if (!message && attachments.length === 0) {
      return res.status(400).json({
        status: false,
        code: "MESSAGE_REQUIRED",
        message: "Mesaj veya ek alanindan en az biri zorunludur",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findOne({ _id: ticketId, createdBy: req.user._id });
    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Destek talebi bulunamadi",
        statusCode: 404,
      });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({
        status: false,
        code: "TICKET_CLOSED",
        message: "Kapali ticketa mesaj eklenemez",
        statusCode: 400,
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      senderRole: "user",
      message: message || "Dosya eklendi",
      attachments,
      isInternalNote: false,
    });

    ticket.lastMessageAt = new Date();
    if (ticket.status === "resolved") {
      ticket.status = "waiting_user";
      ticket.resolvedAt = null;
    }

    await ticket.save();

    emitToAssignedAdmins(ticket, "support:ticket_user_replied", {
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      byUserId: req.user._id,
      hasAttachments: attachments.length > 0,
      at: ticket.lastMessageAt,
    });

    return res.status(200).json({
      status: true,
      code: "TICKET_MESSAGE_ADDED",
      message: "Mesaj eklendi",
      statusCode: 200,
    });
  } catch (error) {
    await cleanupUploadedFiles(req.files || []);
    console.error("Ticket mesaj hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_MESSAGE_ERROR",
      message: "Mesaj eklenirken hata olustu",
      statusCode: 500,
    });
  }
};

const closeMyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findOne({ _id: ticketId, createdBy: req.user._id });
    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Destek talebi bulunamadi",
        statusCode: 404,
      });
    }

    if (ticket.status === "closed") {
      return res.status(200).json({
        status: true,
        code: "TICKET_ALREADY_CLOSED",
        message: "Ticket zaten kapali",
        statusCode: 200,
      });
    }

    ticket.status = "closed";
    ticket.closedAt = new Date();
    applyResolutionSlaIfDone(ticket, "closed");
    ticket.messages.push({
      sender: req.user._id,
      senderRole: "user",
      message: "Kullanici ticketi kapatti",
      attachments: [],
      isInternalNote: false,
    });
    await ticket.save();

    return res.status(200).json({
      status: true,
      code: "TICKET_CLOSED",
      message: "Ticket kapatildi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Ticket kapatma hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_CLOSE_ERROR",
      message: "Ticket kapatilirken hata olustu",
      statusCode: 500,
    });
  }
};

const listTicketsAdmin = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { page = 1, limit = 20, status, priority, category, assignedTo, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedTo && isValidObjectId(assignedTo)) query.assignedTo = assignedTo;
    if (search) {
      query.$or = [{ ticketNo: { $regex: search, $options: "i" } }, { subject: { $regex: search, $options: "i" } }];
    }

    const tickets = await SupportTicket.find(query)
      .populate("createdBy", "firstName lastName username")
      .populate("assignedTo", "firstName lastName username")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await SupportTicket.countDocuments(query);

    return res.status(200).json({
      status: true,
      code: "TICKETS_RETRIEVED",
      message: "Ticketlar getirildi",
      statusCode: 200,
      data: tickets,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin ticket listeleme hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "ADMIN_TICKET_LIST_ERROR",
      message: "Ticketlar listelenirken hata olustu",
      statusCode: 500,
    });
  }
};

const getTicketByIdAdmin = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { ticketId } = req.params;
    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findById(ticketId)
      .populate("createdBy", "firstName lastName username")
      .populate("assignedTo", "firstName lastName username")
      .populate("messages.sender", "firstName lastName username role");

    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Ticket bulunamadi",
        statusCode: 404,
      });
    }

    return res.status(200).json({
      status: true,
      code: "TICKET_RETRIEVED",
      message: "Ticket detayi getirildi",
      statusCode: 200,
      data: ticket,
    });
  } catch (error) {
    console.error("Admin ticket detay hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "ADMIN_TICKET_DETAIL_ERROR",
      message: "Ticket detayi getirilirken hata olustu",
      statusCode: 500,
    });
  }
};

const assignTicketAdmin = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { ticketId } = req.params;
    const { assignedTo } = req.body;

    if (!isValidObjectId(ticketId) || !isValidObjectId(assignedTo)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_IDS",
        message: "Gecersiz ticket veya kullanici id",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Ticket bulunamadi",
        statusCode: 404,
      });
    }

    ticket.assignedTo = assignedTo;
    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    ticket.messages.push({
      sender: req.user._id,
      senderRole: "admin",
      message: `Ticket admin tarafindan atandi: ${assignedTo}`,
      isInternalNote: true,
      attachments: [],
    });

    await ticket.save();

    emitToUser(assignedTo, "support:ticket_assigned", {
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      assignedBy: req.user._id,
      status: ticket.status,
      at: ticket.updatedAt,
    });

    return res.status(200).json({
      status: true,
      code: "TICKET_ASSIGNED",
      message: "Ticket atandi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Ticket atama hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_ASSIGN_ERROR",
      message: "Ticket atanirken hata olustu",
      statusCode: 500,
    });
  }
};

const updateTicketStatusAdmin = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { ticketId } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    const validStatuses = ["open", "in_progress", "waiting_user", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_STATUS",
        message: "Gecersiz ticket durumu",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Ticket bulunamadi",
        statusCode: 404,
      });
    }

    ticket.status = status;
    if (status === "resolved") ticket.resolvedAt = new Date();
    if (status === "closed") ticket.closedAt = new Date();
    applyResolutionSlaIfDone(ticket, status);

    ticket.messages.push({
      sender: req.user._id,
      senderRole: "admin",
      message: `Ticket durumu guncellendi: ${status}`,
      attachments: [],
      isInternalNote: true,
    });

    await ticket.save();

    emitToUser(ticket.createdBy.toString(), "support:ticket_status_updated", {
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      status: ticket.status,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
    });

    emitToAssignedAdmins(ticket, "support:ticket_status_admin_updated", {
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      status: ticket.status,
      byAdmin: req.user._id,
      at: ticket.updatedAt,
    });

    return res.status(200).json({
      status: true,
      code: "TICKET_STATUS_UPDATED",
      message: "Ticket durumu guncellendi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Ticket status guncelleme hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_STATUS_UPDATE_ERROR",
      message: "Ticket durumu guncellenirken hata olustu",
      statusCode: 500,
    });
  }
};

const replyTicketAdmin = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    await scanFilesForThreats(req.files || []);

    const { ticketId } = req.params;
    const { message } = req.body;
    const attachments = buildAttachmentsFromFiles(req.files || []);

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    if (!message && attachments.length === 0) {
      return res.status(400).json({
        status: false,
        code: "MESSAGE_REQUIRED",
        message: "Mesaj veya ek alanindan en az biri zorunludur",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Ticket bulunamadi",
        statusCode: 404,
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      senderRole: "admin",
      message: message || "Dosya eklendi",
      attachments,
      isInternalNote: false,
    });

    applyFirstResponseSlaOnAdminReply(ticket);

    ticket.lastMessageAt = new Date();
    if (["open", "waiting_user"].includes(ticket.status)) {
      ticket.status = "in_progress";
    }

    await ticket.save();

    emitToUser(ticket.createdBy.toString(), "support:ticket_admin_replied", {
      ticketId: ticket._id,
      ticketNo: ticket.ticketNo,
      status: ticket.status,
      hasAttachments: attachments.length > 0,
      at: ticket.lastMessageAt,
    });

    return res.status(200).json({
      status: true,
      code: "TICKET_REPLY_ADDED",
      message: "Ticketa yanit eklendi",
      statusCode: 200,
    });
  } catch (error) {
    await cleanupUploadedFiles(req.files || []);
    console.error("Ticket yanit hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "TICKET_REPLY_ERROR",
      message: "Ticket yaniti eklenirken hata olustu",
      statusCode: 500,
    });
  }
};

const runSupportSlaSweep = async () => {
  const now = new Date();
  const tickets = await SupportTicket.find({ status: { $in: ["open", "in_progress", "waiting_user"] } });

  for (const ticket of tickets) {
    let changed = false;

    if (
      ticket.sla?.firstResponseAt == null &&
      ticket.sla?.firstResponseDueAt &&
      now > new Date(ticket.sla.firstResponseDueAt) &&
      !ticket.sla.isFirstResponseBreached
    ) {
      ticket.sla.isFirstResponseBreached = true;
      ticket.messages.push({
        sender: ticket.createdBy,
        senderRole: "system",
        message: "SLA ihlali: Ilk yanit suresi asildi",
        attachments: [],
        isInternalNote: true,
      });
      changed = true;
    }

    if (ticket.sla?.resolutionDueAt && now > new Date(ticket.sla.resolutionDueAt) && !ticket.sla.isResolutionBreached) {
      ticket.sla.isResolutionBreached = true;
      const nextPriority = nextEscalationPriority[ticket.priority] || ticket.priority;
      if (nextPriority !== ticket.priority) {
        ticket.priority = nextPriority;
      }

      ticket.messages.push({
        sender: ticket.createdBy,
        senderRole: "system",
        message: "SLA ihlali: Cozum suresi asildi, ticket onceligi yukseltildi",
        attachments: [],
        isInternalNote: true,
      });
      changed = true;
    }

    if (changed) {
      await ticket.save();
      emitToAssignedAdmins(ticket, "support:sla_breached", {
        ticketId: ticket._id,
        ticketNo: ticket.ticketNo,
        priority: ticket.priority,
        isFirstResponseBreached: ticket.sla?.isFirstResponseBreached,
        isResolutionBreached: ticket.sla?.isResolutionBreached,
        at: now,
      });
    }
  }
};

const addInternalNoteAdmin = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { ticketId } = req.params;
    const { message } = req.body;

    if (!isValidObjectId(ticketId)) {
      return res.status(400).json({
        status: false,
        code: "INVALID_TICKET_ID",
        message: "Gecersiz ticket id",
        statusCode: 400,
      });
    }

    if (!message) {
      return res.status(400).json({
        status: false,
        code: "MESSAGE_REQUIRED",
        message: "Mesaj alani zorunludur",
        statusCode: 400,
      });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        status: false,
        code: "TICKET_NOT_FOUND",
        message: "Ticket bulunamadi",
        statusCode: 404,
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      senderRole: "admin",
      message,
      attachments: [],
      isInternalNote: true,
    });

    await ticket.save();

    return res.status(200).json({
      status: true,
      code: "INTERNAL_NOTE_ADDED",
      message: "Ic not eklendi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Ic not ekleme hatasi:", error);
    return res.status(500).json({
      status: false,
      code: "INTERNAL_NOTE_ERROR",
      message: "Ic not eklenirken hata olustu",
      statusCode: 500,
    });
  }
};

export {
  createTicket,
  listMyTickets,
  getMyTicketById,
  addMessageToMyTicket,
  closeMyTicket,
  listTicketsAdmin,
  getTicketByIdAdmin,
  assignTicketAdmin,
  updateTicketStatusAdmin,
  replyTicketAdmin,
  addInternalNoteAdmin,
  runSupportSlaSweep,
};
