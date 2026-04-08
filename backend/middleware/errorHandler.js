// middleware/errorHandler.js
// Global hata işleme middleware'i
// Tüm rotaları yakalayan ve standardize hata response'u dönen middleware

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Sunucu hatası";
  const code = err.code || "INTERNAL_SERVER_ERROR";

  console.error({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    code,
    message,
    error: err,
  });

  res.status(statusCode).json({
    status: false,
    code,
    message,
    statusCode,
    ...(process.env.NODE_ENV === "development" && { error: err.stack }),
  });
};

export { errorHandler };
