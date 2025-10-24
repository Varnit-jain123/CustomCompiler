const { SerialPort } = require('serialport');
const logger = require('../utils/logger.util');
const boardsConfig = require('../config/boards.config');

class DeviceManagerService {
  constructor() {
    this.devices = [];
    this.portLocks = new Map();
    this.refreshInterval = null;
  }

  /**
   * Initialize device manager
   */
  async initialize() {
    await this.refresh();
    
    // Auto-refresh every 3 seconds
    this.refreshInterval = setInterval(() => {
      this.refresh().catch(err => {
        logger.error('Device refresh error:', err);
      });
    }, 3000);

    logger.info('Device manager initialized');
  }

  /**
   * List all connected serial devices
   */
  async listDevices() {
    try {
      const ports = await SerialPort.list();
      
      this.devices = ports.map(port => {
        const boardInfo = this.identifyBoard(port);
        
        return {
          path: port.path,
          manufacturer: port.manufacturer,
          serialNumber: port.serialNumber,
          vendorId: port.vendorId,
          productId: port.productId,
          boardName: boardInfo?.name || 'Unknown Device',
          boardId: boardInfo?.id || null,
          isArduino: boardInfo !== null,
          locked: this.portLocks.has(port.path)
        };
      });

      return this.devices;

    } catch (error) {
      logger.error('Failed to list devices:', error);
      throw error;
    }
  }

  /**
   * Identify board from VID/PID
   */
  identifyBoard(port) {
    if (!port.vendorId || !port.productId) {
      return null;
    }

    const vid = port.vendorId.toLowerCase();
    const pid = port.productId.toLowerCase();

    for (const board of boardsConfig.boards) {
      if (board.vid_pid) {
        for (const vidPid of board.vid_pid) {
          if (vidPid.vid.toLowerCase() === vid && vidPid.pid.toLowerCase() === pid) {
            return board;
          }
        }
      }
    }

    return null;
  }

  /**
   * Get device information
   */
  async getDeviceInfo(portPath) {
    await this.refresh();
    return this.devices.find(device => device.path === portPath) || null;
  }

  /**
   * Refresh device list
   */
  async refresh() {
    await this.listDevices();
  }

  /**
   * Lock port for exclusive access
   */
  async lockPort(portPath, lockId) {
    if (this.portLocks.has(portPath)) {
      throw new Error(`Port ${portPath} is already locked`);
    }

    this.portLocks.set(portPath, {
      lockId,
      timestamp: Date.now()
    });

    logger.info(`Port ${portPath} locked by ${lockId}`);
  }

  /**
   * Unlock port
   */
  async unlockPort(portPath) {
    if (this.portLocks.has(portPath)) {
      this.portLocks.delete(portPath);
      logger.info(`Port ${portPath} unlocked`);
    }
  }

  /**
   * Check if port is locked
   */
  isPortLocked(portPath) {
    return this.portLocks.has(portPath);
  }

  /**
   * Clean up stale locks (older than 2 minutes)
   */
  cleanupStaleLocks() {
    const now = Date.now();
    const timeout = 120000; // 2 minutes

    for (const [port, lock] of this.portLocks.entries()) {
      if (now - lock.timestamp > timeout) {
        logger.warn(`Cleaning up stale lock on ${port}`);
        this.portLocks.delete(port);
      }
    }
  }

  /**
   * Shutdown
   */
  shutdown() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    logger.info('Device manager shutdown');
  }
}

module.exports = new DeviceManagerService();