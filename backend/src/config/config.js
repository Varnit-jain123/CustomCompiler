const path = require('path');

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Directories
  tempDir: path.join(__dirname, '../../temp'),
  executablesDir: path.join(__dirname, '../../executables'),
  
  // Compiler settings
  maxCodeSize: 50000, // 50KB
  executionTimeout: 5000, // 5 seconds
  maxOutputSize: 10000, // 10KB
  
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100, // max requests per window
  
  // Supported languages
  supportedLanguages: {
    c: {
      compiler: 'gcc',
      extension: '.c',
      compileFlags: ['-Wall', '-Wextra', '-O2'],
      executable: process.platform === 'win32' ? '.exe' : ''
    },
    cpp: {
      compiler: 'g++',
      extension: '.cpp',
      compileFlags: ['-Wall', '-Wextra', '-O2', '-std=c++17'],
      executable: process.platform === 'win32' ? '.exe' : ''
    }
  },
  
  // Security
  forbiddenKeywords: [
    'system(',
    'exec(',
    'popen(',
    'fork(',
    '__asm__',
    'asm(',
    '#pragma'
  ]
};