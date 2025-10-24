const deviceManager = require('../services/device-manager.service');
const logger = require('../utils/logger.util');

class DevicesController {
  /**
   * List all connected serial devices
   */
  async listDevices(req, res) {
    try {
      const devices = await deviceManager.listDevices();
      
      res.json({
        success: true,
        count: devices.length,
        devices: devices.map(device => ({
          port: device.path,
          manufacturer: device.manufacturer || 'Unknown',
          serialNumber: device.serialNumber || null,
          vendorId: device.vendorId || null,
          productId: device.productId || null,
          boardName: device.boardName || 'Unknown Device',
          isArduino: device.isArduino || false
        }))
      });

    } catch (error) {
      logger.error('Failed to list devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list devices'
      });
    }
  }

  /**
   * Get detailed device information
   */
  async getDeviceInfo(req, res) {
    try {
      const { port } = req.params;
      
      const deviceInfo = await deviceManager.getDeviceInfo(port);
      
      if (!deviceInfo) {
        return res.status(404).json({
          success: false,
          error: `Device on port '${port}' not found`
        });
      }

      res.json({
        success: true,
        device: deviceInfo
      });

    } catch (error) {
      logger.error('Failed to get device info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve device information'
      });
    }
  }

  /**
   * Refresh device list
   */
  async refreshDevices(req, res) {
    try {
      await deviceManager.refresh();
      const devices = await deviceManager.listDevices();
      
      res.json({
        success: true,
        count: devices.length,
        devices: devices.map(device => ({
          port: device.path,
          boardName: device.boardName || 'Unknown Device',
          manufacturer: device.manufacturer || 'Unknown'
        }))
      });

    } catch (error) {
      logger.error('Failed to refresh devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh device list'
      });
    }
  }
}

module.exports = new DevicesController();