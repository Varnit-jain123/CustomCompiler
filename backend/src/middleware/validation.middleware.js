const config = require('../config/config');

const validateCompileRequest = (req, res, next) => {
  const { code, language } = req.body;
  
  // Check if code exists
  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Code is required and must be a string'
    });
  }
  
  // Check code size
  if (code.length > config.maxCodeSize) {
    return res.status(400).json({
      success: false,
      error: `Code size exceeds maximum allowed (${config.maxCodeSize} bytes)`
    });
  }
  
  // Check language
  const lang = language || 'c';
  if (!config.supportedLanguages[lang]) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language: ${lang}. Supported: ${Object.keys(config.supportedLanguages).join(', ')}`
    });
  }
  
  req.body.language = lang;
  next();
};

const validateExecutableName = (req, res, next) => {
  const { execName } = req.params;
  
  // Allow alphanumeric, hyphens, underscores, and dots (for .exe extension)
  if (!execName || !/^[a-zA-Z0-9_.-]+$/.test(execName)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid executable name'
    });
  }
  
  // Prevent directory traversal attacks
  if (execName.includes('..') || execName.includes('/') || execName.includes('\\')) {
    return res.status(403).json({
      success: false,
      error: 'Invalid executable name: path traversal detected'
    });
  }
  
  next();
};

module.exports = {
  validateCompileRequest,
  validateExecutableName
};