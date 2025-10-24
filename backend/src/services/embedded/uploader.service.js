const deviceManager = require('../device-manager.service');
const logger = require('../../utils/logger.util');
const config = require('../../config/config');

class UploaderService {
  constructor() {
    this.activeUploads = new Map();
  }

  /**
   * Upload firmware to board
   */
  async upload({ uploadId, firmwarePath, board, port, options }) {
    const startTime = Date.now();

    try {
      logger.info(`Upload ${uploadId}: Starting upload to ${board.name} on ${port}`);

      // Verify device is connected
      const device = await deviceManager.getDeviceInfo(port);
      if (!device) {
        throw new Error(`Device not found on port ${port}`);
      }

      // Lock the port
      await deviceManager.lockPort(port, uploadId);

      // Get architecture service
      const archService = this.getArchitectureService(board.architecture);

      // Prepare firmware data
      const firmwareData = await this.prepareFirmwareData(firmwarePath, board);

      // Get upload command
      const { command, args } = archService.getUploadCommand(
        firmwareData,
        port,
        board
      );

      logger.info(`Upload ${uploadId}: Executing upload command`);

      // Execute upload with progress tracking
      const result = await archService.executeCommand(command, args, {
        timeout: config.upload.timeout,
        onStdout: (data) => {
          this.handleUploadProgress(uploadId, data, archService);
        },
        onStderr: (data) => {
          this.handleUploadProgress(uploadId, data, archService);
        }
      });

      // Parse final result
      const uploadResult = archService.parseUploadOutput(result.stdout, result.stderr);

      if (!uploadResult.success) {
        throw new Error('Upload verification failed');
      }

      const duration = Date.now() - startTime;

      logger.info(`Upload ${uploadId}: Completed successfully in ${duration}ms`);

      return {
        success: true,
        duration,
        bytesWritten: firmwareData.size || 0,
        verified: options.verify !== false
      };

    } catch (error) {
      logger.error(`Upload ${uploadId} failed:`, error);
      throw {
        message: error.message || 'Upload failed',
        stage: 'upload',
        details: error.stderr || error.stdout || null
      };
    } finally {
      // Release port lock
      await deviceManager.unlockPort(port);
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Get architecture service
   */
  getArchitectureService(architecture) {
    const services = {
      avr: require('./architectures/avr.service'),
      esp32: require('./architectures/esp32.service'),
      stm32: require('./architectures/stm32.service')
    };

    const service = services[architecture];
    if (!service) {
      throw new Error(`Unsupported architecture: ${architecture}`);
    }

    return service;
  }

  /**
   * Prepare firmware data for upload
   */
  async prepareFirmwareData(firmwarePath, board) {
    const fs = require('fs').promises;
    const path = require('path');

    if (board.architecture === 'esp32') {
      // ESP32 requires multiple partition files
      return {
        partitions: {
          bootloader: require('../../config/toolchains.config').esp32.bootloader,
          partitionTable: require('../../config/toolchains.config').esp32.partitions,
          bootApp: require('../../config/toolchains.config').esp32.bootApp,
          app: path.join(firmwarePath, 'firmware.bin')
        },
        size: (await fs.stat(path.join(firmwarePath, 'firmware.bin'))).size
      };
    } else if (board.architecture === 'avr') {
      // AVR uses HEX file
      const hexFile = path.join(firmwarePath, 'firmware.hex');
      return {
        hex: hexFile,
        size: (await fs.stat(hexFile)).size
      };
    } else if (board.architecture === 'stm32') {
      // STM32 uses BIN file
      const binFile = path.join(firmwarePath, 'firmware.bin');
      return {
        bin: binFile,
        size: (await fs.stat(binFile)).size
      };
    }

    throw new Error(`Unknown architecture: ${board.architecture}`);
  }

  /**
   * Handle upload progress
   */
  handleUploadProgress(uploadId, data, archService) {
    const progress = archService.parseUploadOutput(data, '');
    
    this.activeUploads.set(uploadId, progress);

    // Emit to WebSocket if connected
    const wsHandler = require('../../websockets/compile.socket');
    wsHandler.broadcastProgress(uploadId, {
      type: 'upload_progress',
      ...progress
    });
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId) {
    return this.activeUploads.get(uploadId) || null;
  }
}

module.exports = new UploaderService();