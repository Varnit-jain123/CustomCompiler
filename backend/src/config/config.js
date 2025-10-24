const path = require('path');
require('dotenv').config();

module.exports = {
  // Server configuration
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  host: process.env.HOST || 'localhost',

  // CORS configuration
  corsOptions: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200
  },

  // Paths
  paths: {
    temp: path.join(__dirname, '../../temp'),
    executables: path.join(__dirname, '../../executables'),
    firmware: path.join(__dirname, '../../executables/firmware'),
    cache: path.join(__dirname, '../../executables/cache'),
    toolchains: path.join(__dirname, '../../toolchains'),
    arduinoCores: path.join(__dirname, '../../arduino-cores'),
    libraries: path.join(__dirname, '../../libraries'),
    logs: path.join(__dirname, '../../logs')
  },

  // Compilation settings
  compilation: {
    maxFileSize: 500 * 1024, // 500KB
    maxFiles: 50,
    timeout: 60000, // 60 seconds
    maxConcurrent: 50,
    maxPerUser: 5
  },

  // Upload settings
  upload: {
    timeout: 60000, // 60 seconds
    maxRetries: 3,
    retryDelay: 2000 // 2 seconds
  },

  // Security settings
  security: {
    enableSandbox: process.env.ENABLE_SANDBOX !== 'false',
    useDocker: process.env.USE_DOCKER === 'true',
    maxMemoryMB: 2048,
    maxCPUCores: 2,
    sessionTimeout: 3600000 // 1 hour
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxCompilations: 50,
    maxUploads: 20,
    maxSerialConnections: 10
  },

  // WebSocket settings
  websocket: {
    pingInterval: 30000, // 30 seconds
    connectionTimeout: 120000 // 2 minutes
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: path.join(__dirname, '../../logs/app.log')
  }
};