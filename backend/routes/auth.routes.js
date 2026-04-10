import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authLimiter, loginLimiter } from "../middleware/rateLimit.middleware.js";

import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  sendEmailVerificationCode,
  sendTwoFactorCode,
  sendVerificationCode,
  switchTwoFactorAuth,
  verifyEmail,
  verifyPhoneNumber,
  verifyTwoFactorCode,
} from "../controllers/auth.controller.js";
const router = express.Router();

router.use(authLimiter);

// @route   POST /api/auth/register
// @desc    Kullanıcı kaydı
// @access  Public
router.get("/me", protect, getCurrentUser);
router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/send-verification-code", sendVerificationCode);
router.post("/verify-phone", verifyPhoneNumber);
router.post("/send-email-verification-code", sendEmailVerificationCode);
router.post("/verify-email", verifyEmail);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/change-password", protect, changePassword);
router.patch("/two-factor", protect, switchTwoFactorAuth);
router.post("/two-factor/send-code", sendTwoFactorCode);
router.post("/two-factor/verify", verifyTwoFactorCode);
router.post("/logout", protect, logoutUser);

export default router;
