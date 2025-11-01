const otaService = require('../services/ota.service');
const arduinoCLIService = require('../services/arduino-cli.service');
const boardsConfig = require('../config/boards.config');
const logger = require('../utils/logger.util');
const { v4: uuidv4 } = require('uuid');

class OTAController {
  /**
   * Get list of OTA-enabled devices on network
   */
  async getDevices(req, res) {
    try {
      const devices = otaService.getDevices();

      res.json({
        success: true,
        count: devices.length,
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          ip: d.ip,
          port: d.port,
          board: d.board,
          lastSeen: d.lastSeen
        }))
      });

    } catch (error) {
      logger.error('Failed to get OTA devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve OTA devices'
      });
    }
  }

  /**
   * Refresh OTA device list
   */
  async refreshDevices(req, res) {
    try {
      await otaService.refresh();
      
      // Wait a bit for devices to be discovered
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const devices = otaService.getDevices();

      res.json({
        success: true,
        count: devices.length,
        devices
      });

    } catch (error) {
      logger.error('Failed to refresh OTA devices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh devices'
      });
    }
  }

  /**
   * Compile and upload via OTA
   */
  async uploadOTA(req, res) {
    const uploadId = uuidv4();

    try {
      const { code, boardId, deviceId, password = '' } = req.body;

      logger.info(`Starting OTA upload ${uploadId} for board ${boardId} to device ${deviceId}`);

      // Get board configuration
      const board = boardsConfig.getBoard(boardId);
      if (!board) {
        return res.status(400).json({
          success: false,
          error: `Board '${boardId}' not found`
        });
      }

      // Check if board supports OTA
      if (board.architecture !== 'esp32' && board.architecture !== 'esp8266') {
        return res.status(400).json({
          success: false,
          error: 'OTA is only supported on ESP32/ESP8266 boards'
        });
      }

      // Compile first
      const compilationResult = await arduinoCLIService.compile({
        compilationId: uploadId,
        code,
        board,
        options: {}
      });

      logger.info(`OTA Upload ${uploadId}: Compilation completed`);

      // Upload via OTA
      const uploadResult = await otaService.uploadOTA({
        deviceId,
        firmwarePath: compilationResult.firmwarePath,
        password
      });

      logger.info(`OTA Upload ${uploadId} completed successfully`);

      res.json({
        success: true,
        uploadId,
        result: {
          compilation: {
            firmwareSize: compilationResult.firmwareSize,
            memoryUsage: compilationResult.memoryUsage,
            warnings: compilationResult.warnings,
            buildTime: compilationResult.buildTime
          },
          ota: uploadResult
        }
      });

    } catch (error) {
      logger.error(`OTA Upload ${uploadId} failed:`, error);

      res.status(400).json({
        success: false,
        uploadId,
        error: error.message,
        details: error.details || null
      });
    }
  }
}

module.exports = new OTAController();