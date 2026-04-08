import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

// @desc    Kullanıcı profil bilgilerini getir
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -accountSecurity.twoFactorAuthSecret -accountSecurity.twoFactorAuthRecoveryCodes")
      .populate("contacts.friends", "firstName lastName username profilePicture isOnline")
      .populate("referral.referredBy", "firstName lastName username profilePicture");

    if (!user) {
      return res.status(404).json({
        status: false,
        code: "USER_NOT_FOUND",
        message: "Kullanıcı bulunamadı",
        statusCode: 404,
      });
    }

    res.status(200).json({
      status: true,
      code: "PROFILE_RETRIEVED",
      message: "Profil başarıyla alındı",
      statusCode: 200,
      data: user,
    });
  } catch (error) {
    console.error("Profil getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "PROFILE_ERROR",
      message: "Profil getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcı profili güncelle
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, profilePicture } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePicture) updateData.profilePicture = profilePicture;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select(
      "-password -accountSecurity.twoFactorAuthSecret -accountSecurity.twoFactorAuthRecoveryCodes",
    );

    res.status(200).json({
      status: true,
      code: "PROFILE_UPDATED",
      message: "Profil başarıyla güncellendi",
      statusCode: 200,
      data: user,
    });
  } catch (error) {
    console.error("Profil güncelleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "PROFILE_UPDATE_ERROR",
      message: "Profil güncellenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Gizlilik ayarlarını güncelle
// @route   PUT /api/user/privacy
// @access  Private
const updatePrivacy = async (req, res) => {
  try {
    const { phoneNumberHidden, emailHidden, lastSeenHidden, profileVisible } = req.body;

    const updateData = { privacySettings: {} };
    if (phoneNumberHidden !== undefined) updateData.privacySettings.phoneNumberHidden = phoneNumberHidden;
    if (emailHidden !== undefined) updateData.privacySettings.emailHidden = emailHidden;
    if (lastSeenHidden !== undefined) updateData.privacySettings.lastSeenHidden = lastSeenHidden;
    if (profileVisible) updateData.privacySettings.profileVisible = profileVisible;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

    res.status(200).json({
      status: true,
      code: "PRIVACY_UPDATED",
      message: "Gizlilik ayarları güncellendi",
      statusCode: 200,
      data: {
        privacySettings: user.privacySettings,
      },
    });
  } catch (error) {
    console.error("Gizlilik ayarları güncelleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "PRIVACY_ERROR",
      message: "Gizlilik ayarları güncellenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Referral kodunu getir
// @route   GET /api/user/referral
// @access  Private
const getReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("referral");

    res.status(200).json({
      status: true,
      code: "REFERRAL_CODE_RETRIEVED",
      message: "Referral kodu başarıyla alındı",
      statusCode: 200,
      data: {
        referralCode: user.referral.referralCode,
        totalReferrals: user.referral.totalReferrals || 0,
        referralLink: `https://your-app.com/signup?ref=${user.referral.referralCode}`, // Frontend'de güncelle
      },
    });
  } catch (error) {
    console.error("Referral kodu getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "REFERRAL_ERROR",
      message: "Referral kodu getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Referral kodu ile kaydolma
// @route   PUT /api/user/apply-referral
// @access  Private
const applyReferralCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user._id;

    if (!referralCode) {
      return res.status(400).json({
        status: false,
        code: "MISSING_REFERRAL_CODE",
        message: "Referral kodu gerekli",
        statusCode: 400,
      });
    }

    // Referral kodunu kontrol et
    const referrer = await User.findOne({ "referral.referralCode": referralCode });
    if (!referrer) {
      return res.status(404).json({
        status: false,
        code: "INVALID_REFERRAL_CODE",
        message: "Geçersiz referral kodu",
        statusCode: 404,
      });
    }

    // Kendi referral kodunu kullanmaya çalışıyorsa
    if (referrer._id.toString() === userId.toString()) {
      return res.status(400).json({
        status: false,
        code: "SELF_REFERRAL",
        message: "Kendi referral kodunu kullanamassın",
        statusCode: 400,
      });
    }

    // Kullanıcının zaten referral'ı varsa
    const currentUser = await User.findById(userId);
    if (currentUser.referral.referredBy) {
      return res.status(400).json({
        status: false,
        code: "ALREADY_REFERRED",
        message: "Zaten bir referral kodunu kullanmışsın",
        statusCode: 400,
      });
    }

    // Referral'ı uygula
    currentUser.referral.referredBy = referrer._id;
    await currentUser.save();

    // Referrer'a davet edilen kullanıcıyı ekle
    const rewardAmount = referrer.referralRewards.rewardPerReferral || 10;

    referrer.referral.referredUsers.push({
      userId,
      status: "active",
    });
    referrer.referral.totalReferrals = (referrer.referral.totalReferrals || 0) + 1;
    referrer.referral.activeReferrals = (referrer.referral.activeReferrals || 0) + 1;

    // Bakiye ödülü ver (COIN)
    const balanceBefore = referrer.wallet.coins;
    referrer.wallet.coins += rewardAmount;
    const balanceAfter = referrer.wallet.coins;

    referrer.wallet.totalEarnedCoins = (referrer.wallet.totalEarnedCoins || 0) + rewardAmount;
    referrer.wallet.lastTransactionAt = new Date();
    referrer.referralRewards.totalRewardsEarned = (referrer.referralRewards.totalRewardsEarned || 0) + rewardAmount;
    referrer.referralRewards.lastRewardAt = new Date();

    await referrer.save();

    // Transaction kaydı oluştur
    const transaction = new Transaction({
      userId: referrer._id,
      type: "referral_bonus",
      amount: rewardAmount,
      currency: "COIN",
      description: `${currentUser.firstName} ${currentUser.lastName} referral ödülü`,
      referenceId: currentUser._id,
      referenceType: "referral",
      balanceBefore,
      balanceAfter,
      status: "completed",
    });
    await transaction.save();

    res.status(200).json({
      status: true,
      code: "REFERRAL_APPLIED",
      message: "Referral kodu başarıyla uygulandı",
      statusCode: 200,
      data: {
        referredByUser: {
          firstName: referrer.firstName,
          lastName: referrer.lastName,
          username: referrer.username,
        },
        reward: rewardAmount,
        currency: "COIN",
      },
    });
  } catch (error) {
    console.error("Referral uygulama hatası:", error);
    res.status(500).json({
      status: false,
      code: "REFERRAL_APPLY_ERROR",
      message: "Referral uygulanırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Cüzdan bakiyesini getir
// @route   GET /api/user/wallet
// @access  Private
const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("wallet");

    res.status(200).json({
      status: true,
      code: "WALLET_RETRIEVED",
      message: "Cüzdan bilgileri başarıyla alındı",
      statusCode: 200,
      data: {
        coins: user.wallet.coins,
        totalEarnedCoins: user.wallet.totalEarnedCoins,
        totalSpentCoins: user.wallet.totalSpentCoins,
        lastTransactionAt: user.wallet.lastTransactionAt,
      },
    });
  } catch (error) {
    console.error("Cüzdan getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "WALLET_ERROR",
      message: "Cüzdan getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Coin satın al (TL -> COIN dönüşümü)
// @route   POST /api/user/buy-coins
// @access  Private
const buyCoins = async (req, res) => {
  try {
    const { amountTRY } = req.body; // TL cinsinden tutar
    const userId = req.user._id;

    if (!amountTRY || amountTRY <= 0) {
      return res.status(400).json({
        status: false,
        code: "INVALID_AMOUNT",
        message: "Geçersiz tutar",
        statusCode: 400,
      });
    }

    // TL -> COIN dönüşüm oranı (1 TL = 10 COIN)
    const conversionRate = 10;
    const coinsToBuy = Math.floor(amountTRY * conversionRate);

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
    user.wallet.coins += coinsToBuy;
    user.wallet.totalEarnedCoins += coinsToBuy;
    user.wallet.lastTransactionAt = new Date();
    await user.save();

    // Transaction kaydı oluştur
    const transaction = new Transaction({
      userId,
      type: "coin_purchase",
      amount: coinsToBuy,
      currency: "COIN",
      status: "completed",
      balanceBefore,
      balanceAfter: user.wallet.coins,
      description: `${amountTRY} TL karşılığında ${coinsToBuy} Coin satın alındı`,
      metadata: {
        amountTRY,
        conversionRate,
      },
    });
    await transaction.save();

    res.status(200).json({
      status: true,
      code: "COINS_PURCHASED",
      message: "Coin başarıyla satın alındı",
      statusCode: 200,
      data: {
        amountTRY,
        coinsPurchased: coinsToBuy,
        conversionRate: `1 TL = ${conversionRate} COIN`,
        newBalance: user.wallet.coins,
      },
    });
  } catch (error) {
    console.error("Coin satın alma hatası:", error);
    res.status(500).json({
      status: false,
      code: "PURCHASE_ERROR",
      message: "Coin satın alınırken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    İşlem geçmişini getir
// @route   GET /api/user/transactions
// @access  Private
const getTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const query = { userId };

    const transactions = await Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      status: true,
      code: "TRANSACTIONS_RETRIEVED",
      message: "İşlem geçmişi başarıyla alındı",
      statusCode: 200,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("İşlem geçmişi getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "TRANSACTIONS_ERROR",
      message: "İşlem geçmişi getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Referral istatistiklerini getir
// @route   GET /api/user/referral-stats
// @access  Private
const getReferralStats = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("referral.referredUsers.userId", "firstName lastName username profilePicture");

    res.status(200).json({
      status: true,
      code: "REFERRAL_STATS_RETRIEVED",
      message: "Referral istatistikleri başarıyla alındı",
      statusCode: 200,
      data: {
        totalReferrals: user.referral.totalReferrals || 0,
        activeReferrals: user.referral.activeReferrals || 0,
        totalRewardsEarned: user.referralRewards.totalRewardsEarned || 0,
        rewardPerReferral: user.referralRewards.rewardPerReferral,
        lastRewardAt: user.referralRewards.lastRewardAt,
        referredUsers: user.referral.referredUsers || [],
      },
    });
  } catch (error) {
    console.error("Referral istatistikleri getirme hatası:", error);
    res.status(500).json({
      status: false,
      code: "REFERRAL_STATS_ERROR",
      message: "Referral istatistikleri getirilirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Başka kullanıcıyı engelle
// @route   POST /api/user/block/:userId
// @access  Private
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        status: false,
        code: "CANNOT_BLOCK_SELF",
        message: "Kendinizi engel leyemezsiniz",
        statusCode: 400,
      });
    }

    const user = await User.findByIdAndUpdate(currentUserId, { $addToSet: { "privacySettings.blockList": userId } }, { new: true });

    res.status(200).json({
      status: true,
      code: "USER_BLOCKED",
      message: "Kullanıcı başarıyla engellendi",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Kullanıcı engelleme hatası:", error);
    res.status(500).json({
      status: false,
      code: "BLOCK_ERROR",
      message: "Kullanıcı engellenirken hata oluştu",
      statusCode: 500,
    });
  }
};

// @desc    Kullanıcının engelini kaldır
// @route   POST /api/user/unblock/:userId
// @access  Private
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findByIdAndUpdate(currentUserId, { $pull: { "privacySettings.blockList": userId } }, { new: true });

    res.status(200).json({
      status: true,
      code: "USER_UNBLOCKED",
      message: "Kullanıcının engellemesi kaldırıldı",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Engel kaldırma hatası:", error);
    res.status(500).json({
      status: false,
      code: "UNBLOCK_ERROR",
      message: "Engel kaldırılırken hata oluştu",
      statusCode: 500,
    });
  }
};

export {
  getProfile,
  updateProfile,
  updatePrivacy,
  getReferralCode,
  applyReferralCode,
  getWalletBalance,
  buyCoins,
  getTransactionHistory,
  getReferralStats,
  blockUser,
  unblockUser,
};
