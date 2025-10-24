const logger = require('../utils/logger.util');
const config = require('../config/config');

class ValidationMiddleware {
  /**
   * Validate compile request
   */
  validateCompileRequest(req, res, next) {
    const { code, language } = req.body;

    // Validate code
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }

    if (code.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Code cannot be empty'
      });
    }

    // Check code length (prevent extremely large code submissions)
    const maxSize = config.compilation?.maxFileSize || 50000;
    if (code.length > maxSize) {
      return res.status(400).json({
        success: false,
        error: `Code size exceeds maximum allowed size of ${maxSize} bytes`
      });
    }

    // Validate language
    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Language is required and must be a string'
      });
    }

    // Check supported languages
    const supportedLanguages = ['cpp', 'c', 'python', 'java', 'javascript'];
    if (!supportedLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Language '${language}' is not supported. Supported languages: ${supportedLanguages.join(', ')}`
      });
    }

    // Security checks
    if (this.containsSuspiciousPatterns(code)) {
      logger.warn('Suspicious code pattern detected');
      return res.status(400).json({
        success: false,
        error: 'Code contains potentially dangerous patterns'
      });
    }

    next();
  }

  /**
   * Validate embedded compile request
   */
  validateEmbeddedCompileRequest(req, res, next) {
    const { code, boardId, options } = req.body;

    // Validate code
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }

    if (code.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Code cannot be empty'
      });
    }

    const maxSize = config.compilation?.maxFileSize || 50000;
    if (code.length > maxSize) {
      return res.status(400).json({
        success: false,
        error: `Code size exceeds maximum allowed size of ${maxSize} bytes`
      });
    }

    // Validate board ID
    if (!boardId || typeof boardId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Board ID is required'
      });
    }

    // Validate options if provided
    if (options && typeof options !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Options must be an object'
      });
    }

    // Security checks
    if (this.containsSuspiciousPatterns(code)) {
      logger.warn('Suspicious code pattern detected');
      return res.status(400).json({
        success: false,
        error: 'Code contains potentially dangerous patterns'
      });
    }

    next();
  }

  /**
   * Validate embedded upload request
   */
  validateEmbeddedUploadRequest(req, res, next) {
    const { code, boardId, port, options } = req.body;

    // Validate code
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Code is required and must be a string'
      });
    }

    if (code.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Code cannot be empty'
      });
    }

    const maxSize = config.compilation?.maxFileSize || 50000;
    if (code.length > maxSize) {
      return res.status(400).json({
        success: false,
        error: `Code size exceeds maximum allowed size of ${maxSize} bytes`
      });
    }

    // Validate board ID
    if (!boardId || typeof boardId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Board ID is required'
      });
    }

    // Validate port
    if (!port || typeof port !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Port is required'
      });
    }

    // Validate port format
    if (!this.isValidPort(port)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid port format'
      });
    }

    // Validate options if provided
    if (options && typeof options !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Options must be an object'
      });
    }

    // Security checks
    if (this.containsSuspiciousPatterns(code)) {
      logger.warn('Suspicious code pattern detected');
      return res.status(400).json({
        success: false,
        error: 'Code contains potentially dangerous patterns'
      });
    }

    next();
  }

  /**
   * Validate executable name
   */
  validateExecutableName(req, res, next) {
    const { execName } = req.params;

    if (!execName || typeof execName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Executable name is required'
      });
    }

    // Check for path traversal attempts
    if (execName.includes('..') || execName.includes('/') || execName.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid executable name - path traversal detected'
      });
    }

    // Only allow alphanumeric, underscore, hyphen, and dot
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(execName)) {
      return res.status(400).json({
        success: false,
        error: 'Executable name contains invalid characters'
      });
    }

    // Length check
    if (execName.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Executable name is too long'
      });
    }

    next();
  }

  /**
   * Check for suspicious patterns
   */
  containsSuspiciousPatterns(code) {
    const suspiciousPatterns = [
      /system\s*\(/,
      /exec\s*\(/,
      /popen\s*\(/,
      /fork\s*\(/,
      /\/etc\/passwd/,
      /\/etc\/shadow/,
      /__import__/,
      /eval\s*\(/,
      /subprocess/
    ];

    return suspiciousPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Validate port format
   */
  isValidPort(port) {
    // Linux/Mac
    if (port.startsWith('/dev/tty') || port.startsWith('/dev/cu.')) {
      return true;
    }

    // Windows
    if (/^COM\d+$/.test(port)) {
      return true;
    }

    return false;
  }
}

// Create instance
const validationMiddleware = new ValidationMiddleware();

// Export bound methods to preserve 'this' context
module.exports = {
  validateCompileRequest: validationMiddleware.validateCompileRequest.bind(validationMiddleware),
  validateEmbeddedCompileRequest: validationMiddleware.validateEmbeddedCompileRequest.bind(validationMiddleware),
  validateEmbeddedUploadRequest: validationMiddleware.validateEmbeddedUploadRequest.bind(validationMiddleware),
  validateExecutableName: validationMiddleware.validateExecutableName.bind(validationMiddleware)
};