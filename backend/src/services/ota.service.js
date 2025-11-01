const Bonjour = require('bonjour-service');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger.util');

class OTAService {
  constructor() {
    this.bonjour = new Bonjour.default();
    this.devices = new Map();
    this.browser = null;
  }

  /**
   * Start discovering OTA-enabled devices on the network
   */
  startDiscovery() {
    logger.info('Starting OTA device discovery...');

    // Browse for Arduino OTA devices
    this.browser = this.bonjour.find({ type: 'arduino' }, (service) => {
      this.handleDeviceFound(service);
    });

    // Also browse for ESP32 OTA
    this.bonjour.find({ type: 'esp32-ota' }, (service) => {
      this.handleDeviceFound(service);
    });

    logger.info('OTA discovery started');
  }

  /**
   * Handle discovered device
   */
  handleDeviceFound(service) {
    const deviceId = service.name || service.host;
    
    const device = {
      id: deviceId,
      name: service.name,
      host: service.host,
      ip: service.referer?.address || service.addresses?.[0],
      port: service.port || 3232,
      type: service.type,
      board: this.identifyBoard(service),
      lastSeen: Date.now()
    };

    this.devices.set(deviceId, device);
    
    logger.info(`OTA Device discovered: ${device.name} at ${device.ip}:${device.port}`);
  }

  /**
   * Identify board type from service info
   */
  identifyBoard(service) {
    const txt = service.txt || {};
    
    if (txt.board) {
      return txt.board;
    }
    
    if (service.type.includes('esp32')) {
      return 'esp32';
    }
    
    if (service.type.includes('esp8266')) {
      return 'esp8266';
    }
    
    return 'unknown';
  }

  /**
   * Get list of discovered devices
   */
  getDevices() {
    const now = Date.now();
    const timeout = 300000; // 5 minutes

    // Remove stale devices
    for (const [id, device] of this.devices.entries()) {
      if (now - device.lastSeen > timeout) {
        this.devices.delete(id);
        logger.info(`Removed stale OTA device: ${id}`);
      }
    }

    return Array.from(this.devices.values());
  }

  /**
   * Upload firmware via OTA
   */
  async uploadOTA({ deviceId, firmwarePath, password = '' }) {
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    logger.info(`Starting OTA upload to ${device.name} (${device.ip})`);

    try {
      // Find firmware file
      const files = await fs.readdir(firmwarePath);
      let firmwareFile;

      if (device.board === 'esp32') {
        firmwareFile = files.find(f => f.includes('.merged.bin') || f === 'sketch.ino.bin');
      } else if (device.board === 'esp8266') {
        firmwareFile = files.find(f => f.endsWith('.bin'));
      }

      if (!firmwareFile) {
        throw new Error('Firmware file not found');
      }

      const firmwareFullPath = path.join(firmwarePath, firmwareFile);
      const firmwareData = await fs.readFile(firmwareFullPath);

      // Create form data
      const form = new FormData();
      form.append('firmware', firmwareData, {
        filename: firmwareFile,
        contentType: 'application/octet-stream'
      });

      // Upload URL
      const uploadUrl = `http://${device.ip}:${device.port}/update`;

      logger.info(`Uploading to ${uploadUrl}`);

      // Send firmware
      const response = await axios.post(uploadUrl, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': password ? `Basic ${Buffer.from(`:${password}`).toString('base64')}` : undefined
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000, // 2 minutes
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          logger.info(`OTA Upload progress: ${percentage}%`);
        }
      });

      logger.info(`OTA upload completed: ${response.status} ${response.statusText}`);

      return {
        success: true,
        message: 'OTA upload successful',
        device: device.name,
        ip: device.ip
      };

    } catch (error) {
      logger.error(`OTA upload failed:`, error);
      
      if (error.response) {
        throw new Error(`OTA failed: ${error.response.status} - ${error.response.data}`);
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to device. Make sure OTA is enabled on the board.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Stop discovery
   */
  stopDiscovery() {
    if (this.browser) {
      this.browser.stop();
    }
    this.bonjour.destroy();
    logger.info('OTA discovery stopped');
  }

  /**
   * Refresh device list
   */
  async refresh() {
    this.devices.clear();
    this.stopDiscovery();
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.startDiscovery();
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for discovery
  }
}

module.exports = new OTAService();