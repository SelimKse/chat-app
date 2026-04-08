import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { supportUpload } from "../middleware/upload.middleware.js";
import {
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
} from "../controllers/support.controller.js";

const router = express.Router();

router.use(protect);

// User support endpoints
router.post("/", supportUpload.array("attachments", 5), createTicket);
router.get("/my", listMyTickets);
router.get("/my/:ticketId", getMyTicketById);
router.post("/my/:ticketId/messages", supportUpload.array("attachments", 5), addMessageToMyTicket);
router.post("/my/:ticketId/close", closeMyTicket);

// Admin support endpoints
router.get("/admin", listTicketsAdmin);
router.get("/admin/:ticketId", getTicketByIdAdmin);
router.patch("/admin/:ticketId/assign", assignTicketAdmin);
router.patch("/admin/:ticketId/status", updateTicketStatusAdmin);
router.post("/admin/:ticketId/reply", supportUpload.array("attachments", 5), replyTicketAdmin);
router.post("/admin/:ticketId/internal-note", addInternalNoteAdmin);

export default router;
