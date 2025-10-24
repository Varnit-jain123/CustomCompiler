const express = require('express');
const router = express.Router();
const embeddedController = require('../controllers/embedded.controller');
const validation = require('../middleware/validation.middleware');
const rateLimiter = require('../middleware/rate-limiter.middleware');

// Compile .ino code (verify only, no upload)
router.post(
  '/compile',
  rateLimiter.compileLimiter,
  validation.validateEmbeddedCompileRequest,
  embeddedController.compile
);

// Compile and upload to board
router.post(
  '/upload',
  rateLimiter.uploadLimiter,
  validation.validateEmbeddedUploadRequest,
  embeddedController.upload
);

// Get supported boards
router.get(
  '/boards',
  embeddedController.getBoards
);

// Get board details by ID
router.get(
  '/boards/:boardId',
  embeddedController.getBoardDetails
);

// Get board libraries
router.get(
  '/boards/:boardId/libraries',
  embeddedController.getBoardLibraries
);

// Get available code templates
router.get(
  '/templates',
  embeddedController.getTemplates
);

// Get template by ID
router.get(
  '/templates/:templateId',
  embeddedController.getTemplate
);

module.exports = router;