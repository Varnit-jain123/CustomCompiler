const express = require('express');
const router = express.Router();

// Controllers
const compilerController = require('../controllers/compiler.controller');

// Middlewares
const { validateCompileRequest } = require('../middleware/validation.middleware');
const { compilerLimiter, checkDangerousCode } = require('../middleware/security.middleware');

// Routes
router.post(
  '/compile',
  compilerLimiter,          // ✅ Works - exported directly
  validateCompileRequest,   // ✅ Works - bound method
  checkDangerousCode,       // ✅ Works - bound method
  compilerController.compile // ✅ Works - exported method
);

module.exports = router;