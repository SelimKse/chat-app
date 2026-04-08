import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import {
  clearBanPayload,
  getActiveRestriction,
  getBanResponseData,
  getRestrictionPath,
  getRestrictionResponseData,
  normalizeBanPayload,
  syncExpiredBan,
  syncExpiredRestrictions,
} from "../utils/ban.js";

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

const parseBanUntil = ({ type, durationHours, bannedUntil }) => {
  if (type === "permanent") {
    return null;
  }

  if (bannedUntil) {
    const parsed = new Date(bannedUntil);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  const duration = Number(durationHours || 0);
  if (!duration || duration <= 0) {
    return null;
  }
  return new Date(Date.now() + duration * 60 * 60 * 1000);
};

const parseRestrictionUntil = ({ durationHours, until }) => {
  if (until) {
    const parsed = new Date(until);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  const duration = Number(durationHours || 0);
  if (!duration || duration <= 0) return null;
  return new Date(Date.now() + duration * 60 * 60 * 1000);
};

// @desc    Kullanıcıya Coin ekle (Admin)
// @route   POST /api/admin/add-coins
// @access  Private (Admin Only)
const addCoins = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user._id;

    // Admin kontrolü yapılmalı - middleware'de olmalı
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        code: "NOT_ADMIN",
        message: "Sadece yöneticiler bu işlemi yapabilir",
        statusCode: 403,
      });
    }

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        status: false,
        code: "INVALID_PARAMS",
        message: "Geçersiz parametreler",
        statusCode: 400,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const balanceBefore = user.wallet.coins;
    user.wallet.coins += amount;
    const balanceAfter = user.wallet.coins;
    user.wallet.totalEarnedCoins += amount;

    user.wallet.lastTransactionAt = new Date();
    await user.save();

    // Transaction kaydı oluştur
    const transaction = new Transaction({
      userId,
      type: "credit",
      amount,
      currency: "COIN",
      description: reason || `Admin tarafından COIN eklendi`,
      referenceId: adminId,
      referenceType: "admin",
      balanceBefore,
      balanceAfter,
      status: "completed",
    });
    await transaction.save();

    res.status(200).json({
      status: true,
      code: "COINS_ADDED",
      message: "Coin başarıyla eklendi",
      statusCode: 200,
      data: {
        userId,
        addedAmount: amount,
        balanceBefore,
        balanceAfter,
      },
    });
  } catch (error) {
    console.error("Coin ekleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "ADD_COINS_ERROR",
      message: "Coin eklenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcıdan Coin çıkar (Admin)
// @route   POST /api/admin/deduct-coins
// @access  Private (Admin Only)
const deductCoins = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;
    const adminId = req.user._id;

    // Admin kontrolü
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        code: "NOT_ADMIN",
        message: "Sadece yöneticiler bu işlemi yapabilir",
        statusCode: 403,
      });
    }

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        status: false,
        code: "INVALID_PARAMS",
        message: "Geçersiz parametreler",
        statusCode: 400,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    if (user.wallet.coins < amount) {
      return res.status(400).json({
        status: false,
        code: "INSUFFICIENT_COINS",
        message: "Yetersiz coin",
        statusCode: 400,
      });
    }

    const balanceBefore = user.wallet.coins;
    user.wallet.coins -= amount;
    const balanceAfter = user.wallet.coins;
    user.wallet.totalSpentCoins += amount;

    user.wallet.lastTransactionAt = new Date();
    await user.save();

    // Transaction kaydı oluştur
    const transaction = new Transaction({
      userId,
      type: "debit",
      amount,
      currency: "COIN",
      description: reason || `Admin tarafından COIN çıkarıldı`,
      referenceId: adminId,
      referenceType: "admin",
      balanceBefore,
      balanceAfter,
      status: "completed",
    });
    await transaction.save();

    res.status(200).json({
      status: true,
      code: "COINS_DEDUCTED",
      message: "Coin başarıyla çıkarıldı",
      statusCode: 200,
      data: {
        userId,
        deductedAmount: amount,
        balanceBefore,
        balanceAfter,
      },
    });
  } catch (error) {
    console.error("Coin çıkarma hatası:", error);
    res.status(500).json({
      status: false,
      code: "DEDUCT_COINS_ERROR",
      message: "Coin çıkarılırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcı statistiklerini getir (Admin)
// @route   GET /api/admin/user-stats/:userId
// @access  Private (Admin Only)
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!ensureAdmin(req, res)) return;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);

    res.status(200).json({
      status: true,
      code: "USER_STATS_RETRIEVED",
      message: "Kullanıcı istatistikleri başarıyla alındı",
      statusCode: 200,
      data: {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email.address,
          status: user.status,
          role: user.role,
          createdAt: user.createdAt,
        },
        wallet: {
          coins: user.wallet.coins,
          totalEarnedCoins: user.wallet.totalEarnedCoins,
          totalSpentCoins: user.wallet.totalSpentCoins,
        },
        referral: {
          totalReferrals: user.referral.totalReferrals,
          activeReferrals: user.referral.activeReferrals,
          totalRewardsEarned: user.referralRewards.totalRewardsEarned,
        },
        recentTransactions: transactions,
      },
    });
  } catch (error) {
    console.error("Kullanıcı istatistikleri getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "STATS_ERROR",
      message: "İstatistikler getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcıyı banla (Admin)
// @route   POST /api/admin/ban/:userId
// @access  Private (Admin Only)
const banUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const {
      reason,
      category = "other",
      scope = "full",
      type = "temporary",
      durationHours,
      bannedUntil,
      notes,
      evidence = [],
      source = "manual",
    } = req.body;

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({
        status: false,
        code: "BAN_REASON_REQUIRED",
        message: "Ban nedeni en az 3 karakter olmalıdır",
        statusCode: 400,
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: false,
        code: "SELF_BAN_NOT_ALLOWED",
        message: "Kendinizi banlayamazsınız",
        statusCode: 400,
      });
    }

    if (targetUser.role === "admin") {
      return res.status(400).json({
        status: false,
        code: "ADMIN_BAN_NOT_ALLOWED",
        message: "Admin kullanıcı banlanamaz",
        statusCode: 400,
      });
    }

    const until = parseBanUntil({ type, durationHours, bannedUntil });
    if (type === "temporary" && !until) {
      return res.status(400).json({
        status: false,
        code: "INVALID_BAN_DURATION",
        message: "Geçici ban için geçerli süre bilgisi girin",
        statusCode: 400,
      });
    }

    const previousBanUntil = targetUser.moderation?.ban?.bannedUntil || null;
    const now = new Date();

    targetUser.moderation.ban = normalizeBanPayload({
      type,
      reason: reason.trim(),
      category,
      scope,
      source,
      notes,
      evidence,
      bannedAt: now,
      bannedUntil: until,
      bannedBy: req.user._id,
    });
    targetUser.status = scope === "full" ? "banned" : "active";
    targetUser.moderation.banHistory.push({
      action: "ban",
      type,
      reason: reason.trim(),
      category,
      scope,
      source,
      performedBy: req.user._id,
      previousBanUntil,
      newBanUntil: until,
      metadata: { notes, evidenceCount: evidence?.length || 0 },
    });

    await targetUser.save();

    return res.status(200).json({
      status: true,
      code: "USER_BANNED",
      message: "Kullanıcı başarıyla banlandı",
      statusCode: 200,
      data: {
        userId: targetUser._id,
        ban: getBanResponseData(targetUser.moderation.ban),
      },
    });
  } catch (error) {
    console.error("Kullanıcı banlama hatası:", error);
    return res.status(500).json({
      status: false,
      code: "BAN_USER_ERROR",
      message: "Kullanıcı banlanırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcı banını kaldır (Admin)
// @route   POST /api/admin/unban/:userId
// @access  Private (Admin Only)
const unbanUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const { reason = "Ban manuel olarak kaldırıldı" } = req.body;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const previousBanUntil = targetUser.moderation?.ban?.bannedUntil || null;
    targetUser.moderation.ban = clearBanPayload();
    if (targetUser.status === "banned") {
      targetUser.status = "active";
    }

    targetUser.moderation.banHistory.push({
      action: "unban",
      reason,
      source: "manual",
      performedBy: req.user._id,
      previousBanUntil,
      newBanUntil: null,
    });

    await targetUser.save();

    return res.status(200).json({
      status: true,
      code: "USER_UNBANNED",
      message: "Kullanıcının banı kaldırıldı",
      statusCode: 200,
      data: { userId: targetUser._id },
    });
  } catch (error) {
    console.error("Kullanıcı ban kaldırma hatası:", error);
    return res.status(500).json({
      status: false,
      code: "UNBAN_USER_ERROR",
      message: "Ban kaldırılırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Aktif banı güncelle (süre/alan)
// @route   PATCH /api/admin/ban/:userId
// @access  Private (Admin Only)
const updateUserBan = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const { reason, category, scope, durationHours, bannedUntil, type, notes, evidence } = req.body;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const { activeBan } = await syncExpiredBan(targetUser);
    if (!activeBan) {
      return res.status(400).json({
        status: false,
        code: "NO_ACTIVE_BAN",
        message: "Kullanıcının aktif banı bulunmuyor",
        statusCode: 400,
      });
    }

    const previousBanUntil = targetUser.moderation.ban.bannedUntil || null;
    if (reason !== undefined) targetUser.moderation.ban.reason = reason;
    if (category !== undefined) targetUser.moderation.ban.category = category;
    if (scope !== undefined) targetUser.moderation.ban.scope = scope;
    if (notes !== undefined) targetUser.moderation.ban.notes = notes;
    if (evidence !== undefined) targetUser.moderation.ban.evidence = evidence;
    if (type !== undefined) targetUser.moderation.ban.type = type;

    if (targetUser.moderation.ban.type === "temporary") {
      const nextUntil = parseBanUntil({
        type: "temporary",
        durationHours,
        bannedUntil,
      });

      if (nextUntil) {
        targetUser.moderation.ban.bannedUntil = nextUntil;
      }
    } else {
      targetUser.moderation.ban.bannedUntil = null;
    }

    targetUser.status = targetUser.moderation.ban.scope === "full" ? "banned" : "active";

    const updatedBanUntil = targetUser.moderation.ban.bannedUntil || null;
    const action =
      previousBanUntil && updatedBanUntil
        ? new Date(updatedBanUntil) > new Date(previousBanUntil)
          ? "extend"
          : "shorten"
        : "extend";

    targetUser.moderation.banHistory.push({
      action,
      type: targetUser.moderation.ban.type,
      reason: targetUser.moderation.ban.reason,
      category: targetUser.moderation.ban.category,
      scope: targetUser.moderation.ban.scope,
      source: targetUser.moderation.ban.source,
      performedBy: req.user._id,
      previousBanUntil,
      newBanUntil: updatedBanUntil,
      metadata: { notesUpdated: notes !== undefined, evidenceUpdated: evidence !== undefined },
    });

    await targetUser.save();

    return res.status(200).json({
      status: true,
      code: "BAN_UPDATED",
      message: "Ban bilgisi güncellendi",
      statusCode: 200,
      data: {
        userId: targetUser._id,
        ban: getBanResponseData(targetUser.moderation.ban),
      },
    });
  } catch (error) {
    console.error("Ban güncelleme hatası:", error);
    return res.status(500).json({
      status: false,
      code: "BAN_UPDATE_ERROR",
      message: "Ban güncellenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcının ban durumunu getir
// @route   GET /api/admin/ban/:userId
// @access  Private (Admin Only)
const getUserBanStatus = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const user = await User.findById(userId).select("firstName lastName username status moderation");

    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const { activeBan } = await syncExpiredBan(user);

    return res.status(200).json({
      status: true,
      code: "BAN_STATUS_RETRIEVED",
      message: "Ban durumu alındı",
      statusCode: 200,
      data: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        status: user.status,
        activeBan: getBanResponseData(activeBan),
        banHistory: user.moderation?.banHistory || [],
      },
    });
  } catch (error) {
    console.error("Ban durumu getirme hatası:", error);
    return res.status(500).json({
      status: false,
      code: "BAN_STATUS_ERROR",
      message: "Ban durumu getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Banlı kullanıcıları listele
// @route   GET /api/admin/banned-users
// @access  Private (Admin Only)
const listBannedUsers = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find({ "moderation.ban.isBanned": true })
      .select("firstName lastName username status moderation.ban")
      .sort({ "moderation.ban.bannedAt": -1 })
      .skip(skip)
      .limit(Number(limit));

    const filtered = [];
    for (const user of users) {
      const { activeBan } = await syncExpiredBan(user);
      if (activeBan) {
        filtered.push({
          userId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          status: user.status,
          ban: getBanResponseData(activeBan),
        });
      }
    }

    const total = await User.countDocuments({ "moderation.ban.isBanned": true });

    return res.status(200).json({
      status: true,
      code: "BANNED_USERS_RETRIEVED",
      message: "Banlı kullanıcılar getirildi",
      statusCode: 200,
      data: filtered,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Banlı kullanıcıları getirme hatası:", error);
    return res.status(500).json({
      status: false,
      code: "BANNED_USERS_ERROR",
      message: "Banlı kullanıcılar getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcıya süreli aksiyon kısıtı uygula (Admin)
// @route   POST /api/admin/restrictions/:userId
// @access  Private (Admin Only)
const setUserRestriction = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const { restrictionType, durationHours, until, reason } = req.body;

    const key = getRestrictionPath(restrictionType);
    if (!key) {
      return res.status(400).json({
        status: false,
        code: "INVALID_RESTRICTION_TYPE",
        message: "Geçersiz kısıt türü. groupMessaging veya addUsers olmalı",
        statusCode: 400,
      });
    }

    const restrictedUntil = parseRestrictionUntil({ durationHours, until });
    if (!restrictedUntil) {
      return res.status(400).json({
        status: false,
        code: "INVALID_RESTRICTION_DURATION",
        message: "Kısıt süresi geçersiz",
        statusCode: 400,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const previousUntil = user.moderation?.restrictions?.[key]?.restrictedUntil || null;
    user.moderation.restrictions[key] = {
      isRestricted: true,
      reason: reason || null,
      restrictedUntil,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    };

    user.moderation.restrictionHistory.push({
      type: key,
      action: "restrict",
      reason: reason || null,
      previousUntil,
      newUntil: restrictedUntil,
      performedBy: req.user._id,
    });

    await user.save();

    return res.status(200).json({
      status: true,
      code: "USER_RESTRICTED",
      message: "Kullanıcı kısıtlandı",
      statusCode: 200,
      data: {
        userId: user._id,
        restrictionType: key,
        restriction: getRestrictionResponseData(user.moderation.restrictions[key]),
      },
    });
  } catch (error) {
    console.error("Kullanıcı kısıtlama hatası:", error);
    return res.status(500).json({
      status: false,
      code: "RESTRICTION_ERROR",
      message: "Kullanıcı kısıtlanırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcının aksiyon kısıtını kaldır (Admin)
// @route   DELETE /api/admin/restrictions/:userId/:restrictionType
// @access  Private (Admin Only)
const clearUserRestriction = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId, restrictionType } = req.params;
    const key = getRestrictionPath(restrictionType);
    if (!key) {
      return res.status(400).json({
        status: false,
        code: "INVALID_RESTRICTION_TYPE",
        message: "Geçersiz kısıt türü",
        statusCode: 400,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    const previousUntil = user.moderation?.restrictions?.[key]?.restrictedUntil || null;
    user.moderation.restrictions[key] = {
      isRestricted: false,
      reason: null,
      restrictedUntil: null,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    };

    user.moderation.restrictionHistory.push({
      type: key,
      action: "unrestrict",
      previousUntil,
      newUntil: null,
      performedBy: req.user._id,
    });

    await user.save();

    return res.status(200).json({
      status: true,
      code: "RESTRICTION_CLEARED",
      message: "Kısıt kaldırıldı",
      statusCode: 200,
      data: { userId: user._id, restrictionType: key },
    });
  } catch (error) {
    console.error("Kısıt kaldırma hatası:", error);
    return res.status(500).json({
      status: false,
      code: "RESTRICTION_CLEAR_ERROR",
      message: "Kısıt kaldırılırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcının aktif kısıtlarını getir (Admin)
// @route   GET /api/admin/restrictions/:userId
// @access  Private (Admin Only)
const getUserRestrictions = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { userId } = req.params;
    const user = await User.findById(userId).select("firstName lastName username moderation");
    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    await syncExpiredRestrictions(user);

    const groupMessaging = getActiveRestriction(user, "groupMessaging");
    const addUsers = getActiveRestriction(user, "addUsers");

    return res.status(200).json({
      status: true,
      code: "RESTRICTIONS_RETRIEVED",
      message: "Kullanıcı kısıtları getirildi",
      statusCode: 200,
      data: {
        userId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        activeRestrictions: {
          groupMessaging: getRestrictionResponseData(groupMessaging),
          addUsers: getRestrictionResponseData(addUsers),
        },
        history: user.moderation?.restrictionHistory || [],
      },
    });
  } catch (error) {
    console.error("Kısıtları getirme hatası:", error);
    return res.status(500).json({
      status: false,
      code: "RESTRICTION_RETRIEVE_ERROR",
      message: "Kısıtlar getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

export {
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
};
