import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getProfile,
  updateProfile,
  updatePrivacy,
  getReferralCode,
  applyReferralCode,
  getWalletBalance,
  getTransactionHistory,
  getReferralStats,
  blockUser,
  unblockUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// Tüm routes korumalı
router.use(protect);

// Profile routes
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Privacy routes
router.put("/privacy", updatePrivacy);
router.post("/block/:userId", blockUser);
router.post("/unblock/:userId", unblockUser);

// Referral routes
router.get("/referral", getReferralCode);
router.put("/apply-referral", applyReferralCode);
router.get("/referral-stats", getReferralStats);

// Wallet routes
router.get("/wallet", getWalletBalance);
router.get("/transactions", getTransactionHistory);

export default router;
