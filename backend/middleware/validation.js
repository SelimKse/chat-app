// middleware/validation.js
// Request body validation middleware'i

const validateJSON = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    if (req.is("multipart/form-data")) {
      return next();
    }

    if (!req.is("application/json")) {
      return res.status(400).json({
        status: false,
        code: "INVALID_CONTENT_TYPE",
        message: "Content-Type: application/json gönderin",
        statusCode: 400,
      });
    }
  }
  next();
};

const validateNotEmpty = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    if (req.is("multipart/form-data")) {
      return next();
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: false,
        code: "EMPTY_BODY",
        message: "Request body boş olamaz",
        statusCode: 400,
      });
    }
  }
  next();
};

export { validateJSON, validateNotEmpty };
