const express = require('express');
const router = express.Router();
const otaController = require('../controllers/ota.controller');
const rateLimiter = require('../middleware/rate-limiter.middleware');

// Get OTA devices on network
router.get('/devices', otaController.getDevices);

// Refresh device list
router.post('/devices/refresh', otaController.refreshDevices);

// Upload via OTA
router.post('/upload', rateLimiter.uploadLimiter, otaController.uploadOTA);

module.exports = router;