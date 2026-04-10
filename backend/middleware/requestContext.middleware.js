import { randomUUID } from "crypto";

const requestContext = (req, res, next) => {
  const incomingId = req.headers["x-request-id"];
  const requestId = typeof incomingId === "string" && incomingId.trim() ? incomingId.trim() : randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  next();
};

export { requestContext };
