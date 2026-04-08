import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  addCoins,
  deductCoins,
  getUserStats,
  banUser,
  unbanUser,
  updateUserBan,
  getUserBanStatus,
  listBannedUsers,
  setUserRestriction,
  clearUserRestriction,
  getUserRestrictions,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(protect);

// Wallet yönetimi
router.post("/add-coins", addCoins);
router.post("/deduct-coins", deductCoins);
router.get("/user-stats/:userId", getUserStats);

// Ban yönetimi
router.post("/ban/:userId", banUser);
router.post("/unban/:userId", unbanUser);
router.patch("/ban/:userId", updateUserBan);
router.get("/ban/:userId", getUserBanStatus);
router.get("/banned-users", listBannedUsers);

// Restriction yönetimi
router.post("/restrictions/:userId", setUserRestriction);
router.delete("/restrictions/:userId/:restrictionType", clearUserRestriction);
router.get("/restrictions/:userId", getUserRestrictions);

export default router;
