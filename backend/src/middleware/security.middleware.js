const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger.util');

class SecurityMiddleware {
  /**
   * Sanitize input data safely
   */
  sanitizeInput(req, res, next) {
    // Sanitize body
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query without overwriting read-only req.query
    if (req.query) {
      req.sanitizedQuery = this.sanitizeObject(req.query);
    }

    // Sanitize params safely
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    next();
  }

  /**
   * Recursively sanitize object
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeString(key);

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string (basic placeholder for XSS)
   */
  sanitizeString(str) {
    if (typeof str !== 'string') return str;
    // Example: replace < and > (can extend for full XSS protection)
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * Validate file paths
   */
  validatePath(filePath) {
    if (filePath.includes('..') || filePath.includes('~')) {
      logger.warn(`Path traversal attempt detected: ${filePath}`);
      return false;
    }
    if (!/^[a-zA-Z0-9_\-./]+$/.test(filePath)) {
      logger.warn(`Invalid characters in path: ${filePath}`);
      return false;
    }
    return true;
  }

  /**
   * Check request origin
   */
  checkOrigin(req, res, next) {
    const origin = req.headers.origin;
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn(`Unauthorized origin: ${origin}`);
    }

    next();
  }

  /**
   * Check for dangerous code patterns
   */
  checkDangerousCode(req, res, next) {
    const { code } = req.body;

    if (!code) return next();

    const dangerousPatterns = [
      /system\s*\(/i,
      /exec\s*\(/i,
      /popen\s*\(/i,
      /fork\s*\(/i,
      /\beval\s*\(/i,
      /require\s*\(/i,
      /import\s+os/i,
      /import\s+subprocess/i,
      /__import__/i,
      /Runtime\.getRuntime/i,
      /\/etc\/passwd/i,
      /\/etc\/shadow/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        logger.warn('Dangerous code pattern detected', { pattern: pattern.toString() });
        return res.status(403).json({
          success: false,
          error: 'Code contains potentially dangerous operations and cannot be compiled'
        });
      }
    }

    const fileOperationPatterns = [
      /fopen\s*\(/i,
      /open\s*\(/i,
      /File\s*\(/i,
    ];

    let fileOpCount = 0;
    for (const pattern of fileOperationPatterns) {
      const matches = code.match(new RegExp(pattern, 'gi'));
      if (matches) fileOpCount += matches.length;
    }

    if (fileOpCount > 5) {
      logger.warn('Too many file operations detected', { count: fileOpCount });
      return res.status(403).json({
        success: false,
        error: 'Code contains too many file operations'
      });
    }

    next();
  }
}

// Rate limiter for compilation requests
const compilerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many compilation requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export middleware
const securityMiddleware = new SecurityMiddleware();

module.exports = {
  compilerLimiter,
  checkDangerousCode: securityMiddleware.checkDangerousCode.bind(securityMiddleware),
  sanitizeInput: securityMiddleware.sanitizeInput.bind(securityMiddleware),
  checkOrigin: securityMiddleware.checkOrigin.bind(securityMiddleware),
  validatePath: securityMiddleware.validatePath.bind(securityMiddleware)
};
