const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Rate limiting
const compilerLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Check for dangerous code patterns
const checkDangerousCode = (req, res, next) => {
  const { code } = req.body;
  
  // Check for forbidden keywords
  for (const keyword of config.forbiddenKeywords) {
    if (code.includes(keyword)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden operation detected: ${keyword}`
      });
    }
  }
  
  // Check for network operations
  const networkPatterns = [
    /socket\s*\(/i,
    /bind\s*\(/i,
    /listen\s*\(/i,
    /connect\s*\(/i,
    /#include\s*<sys\/socket\.h>/i,
    /#include\s*<netinet\/in\.h>/i
  ];
  
  for (const pattern of networkPatterns) {
    if (pattern.test(code)) {
      return res.status(403).json({
        success: false,
        error: 'Network operations are not allowed'
      });
    }
  }
  
  // Check for file operations outside allowed scope
  const filePatterns = [
    /fopen\s*\(\s*["']\/etc\//i,
    /fopen\s*\(\s*["']\/root\//i,
    //remove\s*\(/i,
    /unlink\s*\(/i
  ];
  
  for (const pattern of filePatterns) {
    if (pattern.test(code)) {
      return res.status(403).json({
        success: false,
        error: 'Potentially dangerous file operations detected'
      });
    }
  }
  
  next();
};

module.exports = {
  compilerLimiter,
  checkDangerousCode
};