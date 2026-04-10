// middleware/logger.js
// Morgan logger yapılandırması
import morgan from "morgan";
import chalk from "chalk";

// Custom Morgan token'ı yapılandır
morgan.token("status-color", (req, res) => {
  const status = res.statusCode;
  if (status >= 500) return chalk.red(status);
  if (status >= 400) return chalk.yellow(status);
  if (status >= 300) return chalk.cyan(status);
  if (status >= 200) return chalk.green(status);
  return status;
});

morgan.token("request-id", (req) => req.requestId || "-");

// Geliştirme ortamı için custom format
const devFormat = "[:request-id] :method :url :status-color :response-time ms";

// Üretim ortamı için custom format
const prodFormat = ':remote-addr - [":request-id"] ":method :url" :status :response-time ms';

const logger = morgan(process.env.NODE_ENV === "production" ? prodFormat : devFormat);

export { logger };
