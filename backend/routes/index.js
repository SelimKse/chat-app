// Rotalar dosyası, uygulamanın farklı bölümlerine ait rotaları tanımlar ve bu rotaları Express.js sunucusuna entegre eder.
import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import chatRoutes from "./chat.routes.js";
import adminRoutes from "./admin.routes.js";
import supportRoutes from "./support.routes.js";

const router = express.Router();

// Auth rotalarını ekle
router.use("/auth", authRoutes);

// User rotalarını ekle
router.use("/user", userRoutes);

// Chat rotalarını ekle
router.use("/chat", chatRoutes);

// Admin rotalarını ekle
router.use("/admin", adminRoutes);

// Support rotalarını ekle
router.use("/support", supportRoutes);

router.get("/", (req, res) => {
  res.json({ message: "Afet Koordinasyon API'sine hoş geldiniz!" });
});

export default router;
