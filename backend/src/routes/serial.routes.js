const express = require('express');
const router = express.Router();
const serialController = require('../controllers/serial.controller');
const rateLimiter = require('../middleware/rate-limiter.middleware');

// Open serial connection
router.post(
  '/connect',
  rateLimiter.serialLimiter,
  serialController.connect
);

// Close serial connection
router.post(
  '/disconnect',
  serialController.disconnect
);

// Send data to serial port
router.post(
  '/send',
  serialController.sendData
);

// Get connection status
router.get(
  '/status/:port',
  serialController.getStatus
);

module.exports = router;