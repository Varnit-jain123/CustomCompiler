const serialMonitor = require('../services/serial-monitor.service');
const logger = require('../utils/logger.util');

class SerialController {
  /**
   * Open serial connection
   */
  async connect(req, res) {
    try {
      const { port, baudRate = 9600, options = {} } = req.body;

      if (!port) {
        return res.status(400).json({
          success: false,
          error: 'Port is required'
        });
      }

      await serialMonitor.connect(port, baudRate, {
        dataBits: options.dataBits || 8,
        stopBits: options.stopBits || 1,
        parity: options.parity || 'none',
        rtscts: options.rtscts || false
      });

      logger.info(`Serial connection opened on ${port} at ${baudRate} baud`);

      res.json({
        success: true,
        port,
        baudRate,
        status: 'connected'
      });

    } catch (error) {
      logger.error('Failed to connect to serial port:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Close serial connection
   */
  async disconnect(req, res) {
    try {
      const { port } = req.body;

      if (!port) {
        return res.status(400).json({
          success: false,
          error: 'Port is required'
        });
      }

      await serialMonitor.disconnect(port);

      logger.info(`Serial connection closed on ${port}`);

      res.json({
        success: true,
        port,
        status: 'disconnected'
      });

    } catch (error) {
      logger.error('Failed to disconnect from serial port:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Send data to serial port
   */
  async sendData(req, res) {
    try {
      const { port, data, lineEnding = '\n' } = req.body;

      if (!port || data === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Port and data are required'
        });
      }

      await serialMonitor.sendData(port, data, lineEnding);

      res.json({
        success: true,
        port,
        bytesSent: Buffer.byteLength(data + lineEnding)
      });

    } catch (error) {
      logger.error('Failed to send data to serial port:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get connection status
   */
  async getStatus(req, res) {
    try {
      const { port } = req.params;

      const status = serialMonitor.getStatus(port);

      res.json({
        success: true,
        port,
        connected: status.connected,
        baudRate: status.baudRate,
        bytesReceived: status.bytesReceived,
        bytesSent: status.bytesSent
      });

    } catch (error) {
      logger.error('Failed to get serial status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new SerialController();