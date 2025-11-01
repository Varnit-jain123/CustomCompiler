const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");

const config = require("./src/config/config");
const logger = require("./src/utils/logger.util");
const cleanTempFiles = require("./src/utils/cleanTempFiles");

// Services & Routes
const otaService = require("./src/services/ota.service");
const otaRoutes = require("./src/routes/ota.routes");

const compilerRoutes = require("./src/routes/compiler.routes");
const executablesRoutes = require("./src/routes/executables.routes");
const embeddedRoutes = require("./src/routes/embedded.routes");
const devicesRoutes = require("./src/routes/devices.routes");
const serialRoutes = require("./src/routes/serial.routes");
const chatbotRoutes = require("./src/routes/chatbot.routes");

// WebSocket Handlers
const compileSocket = require("./src/websockets/compile.socket");
const serialSocket = require("./src/websockets/serial.socket");

// Middleware
const securityMiddleware = require("./src/middleware/security.middleware");
const rateLimiter = require("./src/middleware/rate-limiter.middleware");

const TEMP_DIR = path.join(__dirname, "temp");
const FIRMWARE_DIR = path.join(__dirname, "executables", "firmware");

// Ensure required folders exist
[TEMP_DIR, FIRMWARE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created folder: ${dir}`);
  }
});

// Clean up temp files from previous runs
cleanTempFiles(TEMP_DIR);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

app.use(helmet());
app.use(cors(config.corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(securityMiddleware.sanitizeInput);
app.use(rateLimiter.globalLimiter);

app.use("/api/ota", otaRoutes);
app.use("/api/compiler", compilerRoutes);
app.use("/api/executables", executablesRoutes);
app.use("/api/embedded", embeddedRoutes);
app.use("/api/devices", devicesRoutes);
app.use("/api/serial", serialRoutes);
app.use("/api/chatbot", chatbotRoutes);

// Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      compiler: "ready",
      embedded: "ready",
      devices: "ready",
    },
  });
});

wss.on("connection", (ws, req) => {
  const urlPath = req.url;

  if (urlPath.startsWith("/ws/compile")) {
    compileSocket.handleConnection(ws, req);
  } else if (urlPath.startsWith("/ws/serial")) {
    serialSocket.handleConnection(ws, req);
  } else {
    ws.close(1008, "Unknown WebSocket path");
  }
});

app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(config.env === "development" && { stack: err.stack }),
  });
});

server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`WebSocket endpoint: ws://localhost:${config.port}/ws`);

  // Start OTA device discovery
  otaService.startDiscovery();
});

const shutdown = () => {
  logger.info("Cleaning temp files and shutting down...");
  cleanTempFiles(TEMP_DIR);
  otaService.stopDiscovery();

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  shutdown();
});

module.exports = { app, server, wss };
