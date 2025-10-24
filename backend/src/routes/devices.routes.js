const express = require('express');
const router = express.Router();
const devicesController = require('../controllers/devices.controller');

// List all connected serial devices
router.get(
  '/',
  devicesController.listDevices
);

// Get device information
router.get(
  '/:port/info',
  devicesController.getDeviceInfo
);

// Refresh device list
router.post(
  '/refresh',
  devicesController.refreshDevices
);

module.exports = router;