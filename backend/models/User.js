import mongoose from "mongoose";
import { hashPassword, generateUserID } from "../utils/generateToken.js";

// isBcryptHash fonksiyonu, bir değerin bcrypt hash formatında olup olmadığını kontrol eder.
const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]?\$/.test(value);

const userSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: false, unique: true }, // UUID Kullanarak benzersiz kimlik
    firstName: { type: String, required: true, trim: true }, // Kullanıcının adı
    lastName: { type: String, required: true, trim: true }, // Kullanıcının soyadı
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 }, // Kullanıcı adı (unique)
    password: { type: String, required: true }, // Şifre (hashlenmiş olarak saklanacak)
    email: {
      address: { type: String, required: true, trim: true, lowercase: true, unique: true }, // E-posta adresi
      verified: { type: Boolean, default: false }, // E-posta doğrulandı mı?
      verifiedAt: { type: Date, required: false }, // E-posta doğrulama tarihi
    },
    phone: {
      phoneNumber: { type: String, required: true, trim: true, unique: true }, // Telefon numarası
      countryCode: { type: String, required: true, trim: true }, // Ülke kodu (örneğin +90)
      verified: { type: Boolean, default: false }, // Telefon numarası doğrulandı mı?
      verifiedAt: { type: Date, required: false }, // Telefon doğrulama tarihi
    },
    // Profile bilgileri
    profilePicture: { type: String, required: false }, // Profil resmi URL'si
    bio: { type: String, required: false, maxlength: 500 }, // Kullanıcı biografi
    status: { type: String, enum: ["active", "inactive", "banned"], default: "active" }, // Kullanıcı durumu
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" }, // Kullanıcı rolü (degişebilir)

    // Online status
    isOnline: { type: Boolean, default: false }, // Şu anda online mi?
    lastSeen: { type: Date, default: Date.now }, // Son görülme tarihi

    // Gizlilik ayarları
    privacySettings: {
      phoneNumberHidden: { type: Boolean, default: false }, // Telefon numarasını gizle
      emailHidden: { type: Boolean, default: false }, // E-posta adresini gizle
      lastSeenHidden: { type: Boolean, default: false }, // Son görülme zamanını gizle
      profileVisible: { type: String, enum: ["everyone", "contacts_only", "private"], default: "everyone" }, // Profil görünürlüğü
      blockList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Engellenen kullanıcılar
    },

    // Kontaklar/Arkadaşlar
    contacts: {
      friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }], // Arkadaş listesi
      pendingRequests: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // İstek gönderen kullanıcı
          requestedAt: { type: Date, default: Date.now }, // İstek zamanı
        },
      ],
      blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Engellenen kullanıcılar (redundant ama hızlı erişim için)
    },

    // Referral Sistemi
    referral: {
      referralCode: { type: String, unique: true, sparse: true, index: true }, // Unique referral kodu
      referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // Hangi kullanıcı tarafından davet edildiği
      referredUsers: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Davet edilen kullanıcı
          referredAt: { type: Date, default: Date.now }, // Davet tarihi
          status: { type: String, enum: ["pending", "active", "inactive"], default: "pending" }, // Durum
        },
      ],
    },

    // Bakiye Sistemi (Wallet) - Sadece Coin
    wallet: {
      coins: { type: Number, default: 0, min: 0 }, // Premium coin'ler
      currency: { type: String, default: "COIN" }, // Default para birimi

      // İstatistikler
      totalEarnedCoins: { type: Number, default: 0 }, // Toplam kazanılan Coin
      totalSpentCoins: { type: Number, default: 0 }, // Toplam harcanan Coin
      lastTransactionAt: { type: Date, required: false }, // Son işlem zamanı
    },

    // Referral Ödül İstatistikleri
    referralRewards: {
      totalReferrals: { type: Number, default: 0 }, // Toplam davet edilen kullanıcı sayısı
      activeReferrals: { type: Number, default: 0 }, // Aktif davet edilen kullanıcı sayısı
      totalRewardsEarned: { type: Number, default: 0 }, // Referral'dan kazanılan toplam ödül
      rewardPerReferral: { type: Number, default: 10 }, // Her başarılı referral için ödül (COIN)
      lastRewardAt: { type: Date, required: false }, // Son ödül tarihi
    },

    // Moderasyon ve ban yönetimi
    moderation: {
      ban: {
        isBanned: { type: Boolean, default: false },
        type: { type: String, enum: ["temporary", "permanent"], required: false },
        reason: { type: String, trim: true, required: false, maxlength: 500 },
        category: {
          type: String,
          enum: ["spam", "abuse", "harassment", "fraud", "illegal", "other"],
          default: "other",
        },
        scope: {
          type: String,
          enum: ["full", "chat_only", "messaging_only", "group_message_only", "add_users_only"],
          default: "full",
        },
        source: {
          type: String,
          enum: ["manual", "automated", "system"],
          default: "manual",
        },
        notes: { type: String, trim: true, required: false, maxlength: 1000 },
        evidence: [{ type: String, trim: true }],
        bannedAt: { type: Date, required: false },
        bannedUntil: { type: Date, required: false },
        bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
      },
      banHistory: [
        {
          action: {
            type: String,
            enum: ["ban", "unban", "extend", "shorten", "auto_unban"],
            required: true,
          },
          type: { type: String, enum: ["temporary", "permanent"], required: false },
          reason: { type: String, trim: true, required: false, maxlength: 500 },
          category: {
            type: String,
            enum: ["spam", "abuse", "harassment", "fraud", "illegal", "other"],
            required: false,
          },
          scope: {
            type: String,
            enum: ["full", "chat_only", "messaging_only", "group_message_only", "add_users_only"],
            required: false,
          },
          source: {
            type: String,
            enum: ["manual", "automated", "system"],
            default: "manual",
          },
          performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
          previousBanUntil: { type: Date, required: false },
          newBanUntil: { type: Date, required: false },
          metadata: { type: mongoose.Schema.Types.Mixed, required: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      restrictions: {
        groupMessaging: {
          isRestricted: { type: Boolean, default: false },
          reason: { type: String, trim: true, required: false, maxlength: 500 },
          restrictedUntil: { type: Date, required: false },
          updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
          updatedAt: { type: Date, required: false },
        },
        addUsers: {
          isRestricted: { type: Boolean, default: false },
          reason: { type: String, trim: true, required: false, maxlength: 500 },
          restrictedUntil: { type: Date, required: false },
          updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
          updatedAt: { type: Date, required: false },
        },
      },
      restrictionHistory: [
        {
          type: { type: String, enum: ["groupMessaging", "addUsers"], required: true },
          action: { type: String, enum: ["restrict", "unrestrict", "auto_unrestrict"], required: true },
          reason: { type: String, trim: true, required: false, maxlength: 500 },
          previousUntil: { type: Date, required: false },
          newUntil: { type: Date, required: false },
          performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },

    // Güvenlik ayarları (iyi korunuyor)
    accountSecurity: {
      twoFactorAuth: {
        enabled: { type: Boolean, default: false }, // İki faktörlü kimlik doğrulama etkin mi?
        type: { type: String, enum: ["sms", "email", "authenticator"], required: false }, // 2FA türü
        confirmedAt: { type: Date, required: false }, // 2FA onaylama tarihi
      },
      twoFactorAuthSecret: { type: String, required: false }, // 2FA gizli anahtar
      twoFactorAuthRecoveryCodes: [{ type: String }], // 2FA kurtarma kodları
      passwordChangeRequired: { type: Boolean, default: false }, // Şifre değiştirme zorunlu mu?
    },

    // Account lockout (brute force saldırı koruması)
    lockout: {
      isLocked: { type: Boolean, default: false }, // Hesap kilitli mi?
      lockoutEnd: { type: Date, required: false }, // Kilitlenme süresi bitiş tarihi
      failedLoginAttempts: { type: Number, default: 0 }, // Başarısız giriş denemeleri sayısı
      lastFailedAttempt: { type: Date, required: false }, // Son başarısız giriş zamanı
    },

    // Şifre geçmişi
    passwordHistory: [
      {
        password: { type: String, required: true }, // Önceki şifre (hashlenmiş)
        changedAt: { type: Date, default: Date.now }, // Şifre değişiklik tarihi
      },
    ],
  },
  { timestamps: true },
);

// İndeksler
userSchema.index({ createdAt: -1 });
userSchema.index({ "privacySettings.blockList": 1 });
userSchema.index({ "referral.referredBy": 1 });
userSchema.index({ "wallet.coins": -1 });
userSchema.index({ "moderation.ban.isBanned": 1 });
userSchema.index({ "moderation.ban.bannedUntil": 1 });
userSchema.index({ "moderation.restrictions.groupMessaging.restrictedUntil": 1 });
userSchema.index({ "moderation.restrictions.addUsers.restrictedUntil": 1 });

// Select işlemlerinde password'ü default olarak dışarıda tut
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.accountSecurity.twoFactorAuthSecret;
    delete ret.accountSecurity.twoFactorAuthRecoveryCodes;
    delete ret.passwordHistory;
    delete ret.lockout;
    return ret;
  },
});

// Kullanıcı oluşturulmadan önce şifreyi hashle ve referral kodu oluştur
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    const hashedPassword = isBcryptHash(this.password) ? this.password : await hashPassword(this.password);
    this.password = hashedPassword;
  }

  // UUID oluştur
  if (!this.uuid) {
    this.uuid = await generateUserID();
  }

  // Referral kodu oluştur (henüz yoksa)
  if (!this.referral.referralCode) {
    const referralCode = `${this.username.toUpperCase()}_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    this.referral.referralCode = referralCode;
  }
});

export default mongoose.model("User", userSchema);
