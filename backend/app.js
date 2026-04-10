import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import path from "path";
import mongoose from "mongoose";

import { logger } from "./middleware/logger.js";
import { requestContext } from "./middleware/requestContext.middleware.js";
import { getMetricsSnapshot, metricsMiddleware } from "./middleware/metrics.middleware.js";
import { globalApiLimiter } from "./middleware/rateLimit.middleware.js";
import { validateJSON, validateNotEmpty } from "./middleware/validation.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const createApp = () => {
  const app = express();

  // Middleware - Helmet (Security)
  app.use(helmet());

  // Request context (request-id)
  app.use(requestContext);

  // Metrics middleware
  app.use(metricsMiddleware);

  // Middleware - Logger
  app.use(logger);

  // Middleware - CORS ve Parser
  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // Static dosya servisi (destek ticket ekleri)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Middleware - Validation
  app.use(validateJSON);
  app.use(validateNotEmpty);

  // Global API rate limit
  app.use("/api", globalApiLimiter);

  // Health check endpoint
  app.get("/health", (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;

    res.status(200).json({
      status: true,
      message: "Sunucu çalışıyor",
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      checks: {
        database: dbReady ? "up" : "down",
      },
    });
  });

  // Liveness endpoint
  app.get("/livez", (req, res) => {
    res.status(200).json({
      status: true,
      message: "alive",
      requestId: req.requestId,
    });
  });

  // Readiness endpoint
  app.get("/readyz", (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    if (!dbReady) {
      return res.status(503).json({
        status: false,
        message: "not ready",
        requestId: req.requestId,
        checks: {
          database: "down",
        },
      });
    }

    return res.status(200).json({
      status: true,
      message: "ready",
      requestId: req.requestId,
      checks: {
        database: "up",
      },
    });
  });

  // Basic metrics endpoint
  app.get("/metrics", (req, res) => {
    res.status(200).json({
      status: true,
      requestId: req.requestId,
      data: getMetricsSnapshot(),
    });
  });

  // Rotalar
  app.use("/api", routes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: false,
      code: "NOT_FOUND",
      message: "Endpoint bulunamadı",
      statusCode: 404,
    });
  });

  // Global error handler (en son middleware olmalı)
  app.use(errorHandler);

  return app;
};

export { createApp };
