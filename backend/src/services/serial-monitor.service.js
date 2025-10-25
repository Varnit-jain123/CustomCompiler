const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const logger = require('../utils/logger.util');
const deviceManager = require('./device-manager.service');

class SerialMonitorService {
  constructor() {
    this.connections = new Map();

    // ✅ Automatically close ports on process exit
    process.on('exit', () => this.disconnectAll());
    process.on('SIGINT', () => this.disconnectAll());
    process.on('SIGTERM', () => this.disconnectAll());
  }

  /**
   * Open serial connection
   */
  async connect(portPath, baudRate, options = {}) {
    try {
      // Check if port is locked by another operation
      if (deviceManager.isPortLocked(portPath)) {
        throw new Error('Port is locked by another operation');
      }

      // ✅ Prevent reopening if already connected or connecting
      if (this.connections.has(portPath)) {
        const existing = this.connections.get(portPath);
        if (existing.port && existing.port.isOpen) {
          logger.warn(`Serial port ${portPath} is already open`);
          return;
        }
        if (existing.connecting) {
          logger.warn(`Serial port ${portPath} is still connecting`);
          return;
        }
      }

      logger.info(`Opening serial port ${portPath} at ${baudRate} baud`);

      const port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: options.dataBits || 8,
        stopBits: options.stopBits || 1,
        parity: options.parity || 'none',
        rtscts: options.rtscts || false,
        autoOpen: false
      });

      // Mark as connecting (to prevent concurrent opens)
      this.connections.set(portPath, { connecting: true });

      return new Promise((resolve, reject) => {
        port.open((err) => {
          if (err) {
            logger.error(`Failed to open ${portPath}:`, err);
            this.connections.delete(portPath); // cleanup failed attempt
            reject(err);
            return;
          }

          const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

          const connection = {
            port,
            parser,
            baudRate,
            bytesReceived: 0,
            bytesSent: 0,
            listeners: new Set(),
            startTime: Date.now()
          };

          // Data listener
          parser.on('data', (data) => {
            connection.bytesReceived += Buffer.byteLength(data);
            this.broadcastData(portPath, data);
          });

          // Error listener
          port.on('error', (err) => {
            logger.error(`Serial error on ${portPath}:`, err);
            this.broadcastError(portPath, err.message);
          });

          // Close listener
          port.on('close', () => {
            logger.info(`Serial port ${portPath} closed`);
            this.connections.delete(portPath);
            this.broadcastDisconnect(portPath);
          });

          this.connections.set(portPath, connection);
          logger.info(`Serial port ${portPath} opened successfully`);
          resolve();
        });
      });

    } catch (error) {
      logger.error('Serial connection error:', error);
      throw error;
    }
  }

  /**
   * Close serial connection
   */
  async disconnect(portPath) {
    const connection = this.connections.get(portPath);

    if (!connection || !connection.port) {
      throw new Error('Port is not connected');
    }

    return new Promise((resolve, reject) => {
      connection.port.close((err) => {
        if (err) {
          logger.error(`Failed to close ${portPath}:`, err);
          reject(err);
          return;
        }

        this.connections.delete(portPath);
        logger.info(`Serial port ${portPath} closed`);
        resolve();
      });
    });
  }

  /**
   * Send data to serial port
   */
  async sendData(portPath, data, lineEnding = '\n') {
    const connection = this.connections.get(portPath);

    if (!connection || !connection.port || !connection.port.isOpen) {
      throw new Error('Port is not connected');
    }

    const dataToSend = data + lineEnding;

    return new Promise((resolve, reject) => {
      connection.port.write(dataToSend, (err) => {
        if (err) {
          logger.error(`Failed to write to ${portPath}:`, err);
          reject(err);
          return;
        }

        connection.bytesSent += Buffer.byteLength(dataToSend);
        logger.debug(`Sent to ${portPath}: ${data}`);
        resolve();
      });
    });
  }

  /**
   * Get connection status
   */
  getStatus(portPath) {
    const connection = this.connections.get(portPath);

    if (!connection || !connection.port || !connection.port.isOpen) {
      return { connected: false };
    }

    return {
      connected: true,
      baudRate: connection.baudRate,
      bytesReceived: connection.bytesReceived,
      bytesSent: connection.bytesSent,
      uptime: Date.now() - connection.startTime
    };
  }

  /**
   * Add data listener
   */
  addListener(portPath, listener) {
    const connection = this.connections.get(portPath);
    if (connection) {
      connection.listeners.add(listener);
    }
  }

  /**
   * Remove data listener
   */
  removeListener(portPath, listener) {
    const connection = this.connections.get(portPath);
    if (connection) {
      connection.listeners.delete(listener);
    }
  }

  /**
   * Broadcast data to all listeners
   */
  broadcastData(portPath, data) {
    const connection = this.connections.get(portPath);
    if (connection) {
      for (const listener of connection.listeners) {
        try {
          listener({ type: 'data', data });
        } catch (error) {
          logger.error('Listener error:', error);
        }
      }
    }
  }

  /**
   * Broadcast error
   */
  broadcastError(portPath, message) {
    const connection = this.connections.get(portPath);
    if (connection) {
      for (const listener of connection.listeners) {
        try {
          listener({ type: 'error', message });
        } catch (error) {
          logger.error('Listener error:', error);
        }
      }
    }
  }

  /**
   * Broadcast disconnect
   */
  broadcastDisconnect(portPath) {
    const connection = this.connections.get(portPath);
    if (connection) {
      for (const listener of connection.listeners) {
        try {
          listener({ type: 'disconnect' });
        } catch (error) {
          logger.error('Listener error:', error);
        }
      }
    }
  }

  /**
   * Disconnect all ports (called on exit or restart)
   */
  async disconnectAll() {
    const ports = Array.from(this.connections.keys());

    for (const port of ports) {
      try {
        await this.disconnect(port);
      } catch (error) {
        logger.error(`Failed to disconnect ${port}:`, error);
      }
    }

    logger.info('All serial ports disconnected.');
  }
}

module.exports = new SerialMonitorService();
