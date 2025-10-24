const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger.util');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later'
    });
  }
});

// Compilation rate limiter
const compileLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxCompilations,
  message: {
    success: false,
    error: 'Too many compilation requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Compilation rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many compilation requests, please try again later'
    });
  }
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxUploads,
  message: {
    success: false,
    error: 'Too many upload requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many upload requests, please try again later'
    });
  }
});

// Serial connection rate limiter
const serialLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxSerialConnections,
  message: {
    success: false,
    error: 'Too many serial connection requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Serial connection rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many serial connection requests, please try again later'
    });
  }
});

module.exports = {
  globalLimiter,
  compileLimiter,
  uploadLimiter,
  serialLimiter
};