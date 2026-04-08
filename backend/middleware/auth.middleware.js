import { decodedToken } from "../utils/generateToken.js";
import User from "../models/User.js";
import { getBanResponseData, syncExpiredBan, syncExpiredRestrictions } from "../utils/ban.js";

const isBanBlockingThisRoute = (scope, routePath) => {
  if (!scope || scope === "full") return true;
  const isChatRoute = routePath.startsWith("/api/chat");
  const isMessageRoute = /\/api\/chat\/.+\/messages/.test(routePath);

  if (scope === "chat_only" && isChatRoute) return true;
  if (scope === "messaging_only" && isMessageRoute) return true;
  return false;
};

// @desc    JWT token doğrulama middleware'i
// @route   Tüm korumalı rotalar
// @access  Private
const protect = async (req, res, next) => {
  // Authorization cookie ile oluyor, cookie'den token'ı al
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Token bulunamadı, yetkilendirme reddedildi" });
  }

  try {
    // Token'ı doğrula ve içindeki kullanıcı ID'sini al
    const decoded = decodedToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Geçersiz token, yetkilendirme reddedildi" });
    }
    // Veritabanından kullanıcıyı bul
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Kullanıcı bulunamadı, yetkilendirme reddedildi" });
    }

    const { activeBan } = await syncExpiredBan(user);
    await syncExpiredRestrictions(user);
    if (activeBan && isBanBlockingThisRoute(activeBan.scope, req.originalUrl || req.path || "")) {
      return res.status(403).json({
        status: false,
        code: "ACCOUNT_BANNED",
        message: "Hesabınız bu işlem için banlanmış durumda",
        statusCode: 403,
        data: getBanResponseData(activeBan),
      });
    }

    // Kullanıcıyı request objesine ekle
    req.user = user;
    next();
  } catch (error) {
    console.error("Token doğrulama hatası:", error);
    res.status(401).json({ message: "Token doğrulama hatası, yetkilendirme reddedildi" });
  }
};

export { protect };
