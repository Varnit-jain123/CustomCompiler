const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const WebSocket = require('ws');
const path = require('path');
const config = require('./src/config/config');
const logger = require('./src/utils/logger.util');

// Routes
const compilerRoutes = require('./src/routes/compiler.routes');
const executablesRoutes = require('./src/routes/executables.routes');
const embeddedRoutes = require('./src/routes/embedded.routes');
const devicesRoutes = require('./src/routes/devices.routes');
const serialRoutes = require('./src/routes/serial.routes');

// WebSocket handlers
const compileSocket = require('./src/websockets/compile.socket');
const serialSocket = require('./src/websockets/serial.socket');

// Middleware
const securityMiddleware = require('./src/middleware/security.middleware');
const rateLimiter = require('./src/middleware/rate-limiter.middleware');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Middleware setup
app.use(helmet());
app.use(cors(config.corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityMiddleware.sanitizeInput);
app.use(rateLimiter.globalLimiter);

// API Routes
app.use('/api/compiler', compilerRoutes);
app.use('/api/executables', executablesRoutes);
app.use('/api/embedded', embeddedRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/serial', serialRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      compiler: 'ready',
      embedded: 'ready',
      devices: 'ready'
    }
  });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const urlPath = req.url;
  
  if (urlPath.startsWith('/ws/compile')) {
    compileSocket.handleConnection(ws, req);
  } else if (urlPath.startsWith('/ws/serial')) {
    serialSocket.handleConnection(ws, req);
  } else {
    ws.close(1008, 'Unknown WebSocket path');
  }
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

// Start server
server.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`WebSocket endpoint: ws://localhost:${config.port}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, wss };