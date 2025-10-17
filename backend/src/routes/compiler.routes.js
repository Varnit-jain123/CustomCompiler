const express = require('express');
const router = express.Router();
const compilerController = require('../controllers/compiler.controller');
const { validateCompileRequest } = require('../middleware/validation.middleware');
const { compilerLimiter, checkDangerousCode } = require('../middleware/security.middleware');

router.post(
  '/compile',
  compilerLimiter,
  validateCompileRequest,
  checkDangerousCode,
  compilerController.compile
);

module.exports = router;