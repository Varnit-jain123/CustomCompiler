
// const { spawn } = require('child_process');
// const fs = require('fs').promises;
// const path = require('path');
// const crypto = require('crypto');
// const he = require('he'); // Decode HTML entities
// const config = require('../config/config');
// const logger = require('../utils/logger.util');

// class ArduinoCLIService {
//   constructor() {
//     this.cliPath = 'arduino-cli';
//   }

//   /**
//    * Main compile method
//    */
//   async compile({ compilationId, code, board, options }) {
//     const startTime = Date.now();

//     try {
//       logger.info(`Arduino CLI Compilation ${compilationId}: Starting for ${board.name}`);

//       // Create sketch folder structure
//       const baseDir = path.join(config.paths.temp, `compile-${compilationId}`);
//       const sketchDir = path.join(baseDir, 'sketch');
//       const sketchFile = path.join(sketchDir, 'sketch.ino');
//       const buildDir = path.join(baseDir, 'build');

//       await fs.mkdir(sketchDir, { recursive: true });
//       await fs.mkdir(buildDir, { recursive: true });

//       // Decode HTML entities in code before writing
//       const decodedCode = he.decode(code);
//       await fs.writeFile(sketchFile, decodedCode, 'utf-8');
//       logger.info(`Sketch file created: ${sketchFile}`);

//       // Get FQBN
//       const fqbn = this.getBoardFQBN(board.id);
//       logger.info(`Using FQBN: ${fqbn}`);

//       // Compile with Arduino CLI
//       const compileArgs = [
//         'compile',
//         '--fqbn', fqbn,
//         '--output-dir', buildDir,
//         '--verbose',
//         sketchDir
//       ];

//       logger.info(`Executing: arduino-cli ${compileArgs.join(' ')}`);

//       const result = await this.executeCommand(this.cliPath, compileArgs);

//       logger.info('Compilation completed successfully');

//       // Find firmware files (architecture-specific)
//       const files = await fs.readdir(buildDir);
//       const firmwareData = await this.findFirmwareFiles(buildDir, files, board);

//       if (!firmwareData.mainFirmware) {
//         logger.error('Available files in build directory:', files);
//         throw new Error(`Firmware file not found for ${board.architecture} architecture`);
//       }

//       const firmwareStats = await fs.stat(firmwareData.mainFirmware);

//       // Parse memory usage
//       const memoryUsage = this.parseMemoryUsage(result.stdout + result.stderr, board);

//       const buildTime = Date.now() - startTime;

//       logger.info(`Compilation ${compilationId}: Success in ${buildTime}ms`);

//       // Store firmware
//       const storageDir = await this.storeFirmware({
//         compilationId,
//         code: decodedCode,
//         board,
//         buildDir,
//         firmwareData,
//         files
//       });

//       return {
//         firmwarePath: storageDir,
//         firmwareSize: memoryUsage,
//         memoryUsage: memoryUsage,
//         warnings: this.parseWarnings(result.stderr),
//         buildTime,
//         metadata: {
//           compilationId,
//           board: board.id,
//           architecture: board.architecture,
//           timestamp: new Date().toISOString(),
//           firmwareFile: firmwareData.mainFirmware,
//           firmwareSize: firmwareStats.size,
//           buildDir: buildDir
//         }
//       };

//     } catch (error) {
//       logger.error(`Compilation ${compilationId} failed:`, error);
//       throw {
//         message: error.message || 'Compilation failed',
//         stage: 'compilation',
//         details: error.stderr || error.stdout || error.stack
//       };
//     }
//   }

//   /**
//    * Find firmware files based on architecture
//    */
//   async findFirmwareFiles(buildDir, files, board) {
//     const firmwareData = {
//       mainFirmware: null,
//       bootloader: null,
//       partitions: null,
//       bootApp: null
//     };

//     if (board.architecture === 'avr') {
//       const hexFile = files.find(f => f.endsWith('.hex') && !f.includes('with_bootloader'));
//       if (hexFile) firmwareData.mainFirmware = path.join(buildDir, hexFile);
//     } else if (board.architecture === 'esp32') {
//       const mergedBin = files.find(f => f.includes('.merged.bin'));
//       const sketchBin = files.find(f => f === 'sketch.ino.bin');
//       firmwareData.mainFirmware = mergedBin ? path.join(buildDir, mergedBin) : (sketchBin ? path.join(buildDir, sketchBin) : null);
//       const bootloaderBin = files.find(f => f.includes('.bootloader.bin'));
//       if (bootloaderBin) firmwareData.bootloader = path.join(buildDir, bootloaderBin);
//       const partitionsBin = files.find(f => f.includes('.partitions.bin'));
//       if (partitionsBin) firmwareData.partitions = path.join(buildDir, partitionsBin);
//     } else if (board.architecture === 'stm32') {
//       const binFile = files.find(f => f.endsWith('.bin'));
//       const hexFile = files.find(f => f.endsWith('.hex'));
//       firmwareData.mainFirmware = binFile ? path.join(buildDir, binFile) : (hexFile ? path.join(buildDir, hexFile) : null);
//     }

//     return firmwareData;
//   }

//   /**
//    * Upload firmware to board
//    */
//   async upload({ uploadId, firmwarePath, board, port, options }) {
//     const startTime = Date.now();

//     try {
//       logger.info(`Upload ${uploadId}: Starting to ${board.name} on ${port}`);

//       const metadataPath = path.join(firmwarePath, 'metadata.json');
//       let buildDir = firmwarePath;
//       try {
//         const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
//         if (metadata.buildDir) buildDir = metadata.buildDir;
//       } catch (error) {
//         logger.warn('Could not read metadata, using firmware path as build dir');
//       }

//       if (board.architecture === 'esp32') return await this.uploadESP32WithCLI(uploadId, buildDir, board, port);

//       const files = await fs.readdir(firmwarePath);
//       const hexFile = files.find(f => f.endsWith('.hex'));
//       if (!hexFile) throw new Error('Hex file not found in firmware directory');

//       const hexPath = path.join(firmwarePath, hexFile);
//       const fqbn = this.getBoardFQBN(board.id);

//       const uploadArgs = [
//         'upload',
//         '--fqbn', fqbn,
//         '--port', port,
//         '--input-file', hexPath,
//         '--verbose'
//       ];

//       logger.info(`Executing: arduino-cli ${uploadArgs.join(' ')}`);

//       await this.executeCommand(this.cliPath, uploadArgs);

//       const duration = Date.now() - startTime;
//       logger.info(`Upload ${uploadId}: Success in ${duration}ms`);

//       return {
//         success: true,
//         duration,
//         bytesWritten: (await fs.stat(hexPath)).size,
//         verified: true
//       };

//     } catch (error) {
//       logger.error(`Upload ${uploadId} failed:`, error);
//       throw {
//         message: error.message || 'Upload failed',
//         stage: 'upload',
//         details: error.stderr || error.stdout || error.stack
//       };
//     }
//   }

//   /**
//    * Upload ESP32 using Arduino CLI (handles partitions automatically)
//    */
//   async uploadESP32WithCLI(uploadId, buildDir, board, port) {
//     const startTime = Date.now();

//     try {
//       logger.info(`ESP32 Upload: Using Arduino CLI to upload from ${buildDir}`);

//       const sketchDir = path.dirname(buildDir);
//       const fqbn = this.getBoardFQBN(board.id);

//       const uploadArgs = [
//         'upload',
//         '--fqbn', fqbn,
//         '--port', port,
//         '--input-dir', buildDir,
//         '--verbose'
//       ];

//       logger.info(`Executing: arduino-cli ${uploadArgs.join(' ')}`);
//       await this.executeCommand(this.cliPath, uploadArgs);

//       const duration = Date.now() - startTime;

//       const files = await fs.readdir(buildDir);
//       const mainBin = files.find(f => f.includes('.merged.bin') || f === 'sketch.ino.bin');
//       const firmwareSize = mainBin ? (await fs.stat(path.join(buildDir, mainBin))).size : 0;

//       logger.info(`ESP32 Upload ${uploadId}: Success in ${duration}ms`);
//       return { success: true, duration, bytesWritten: firmwareSize, verified: true };

//     } catch (error) {
//       logger.error(`ESP32 Upload failed:`, error);
//       throw error;
//     }
//   }

//   /**
//    * Get Board FQBN
//    */
//   getBoardFQBN(boardId) {
//     const fqbnMap = {
//       'arduino_uno': 'arduino:avr:uno',
//       'arduino_mega': 'arduino:avr:mega:cpu=atmega2560',
//       'arduino_nano': 'arduino:avr:nano:cpu=atmega328',
//       'esp32_devkit_v1': 'esp32:esp32:esp32',
//       'stm32_bluepill': 'STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C8'
//     };

//     const fqbn = fqbnMap[boardId];
//     if (!fqbn) throw new Error(`Unknown board ID: ${boardId}`);
//     return fqbn;
//   }

//   /**
//    * Execute command
//    */
//   executeCommand(command, args) {
//     return new Promise((resolve, reject) => {
//       const proc = spawn(command, args, { shell: true, cwd: config.paths.temp, env: process.env });

//       let stdout = '';
//       let stderr = '';

//       proc.stdout.on('data', (data) => stdout += data.toString());
//       proc.stderr.on('data', (data) => stderr += data.toString());

//       proc.on('close', (code) => {
//         if (code === 0) resolve({ stdout, stderr, code });
//         else {
//           const error = new Error(`Command failed with exit code ${code}`);
//           error.stdout = stdout;
//           error.stderr = stderr;
//           error.code = code;
//           reject(error);
//         }
//       });

//       proc.on('error', (err) => { err.stdout = stdout; err.stderr = stderr; reject(err); });

//       setTimeout(() => {
//         proc.kill();
//         const error = new Error('Command timeout (120s)');
//         error.stdout = stdout;
//         error.stderr = stderr;
//         reject(error);
//       }, 120000);
//     });
//   }

//   /**
//    * Parse memory usage
//    */
//   parseMemoryUsage(output, board) {
//     const flashMatch = output.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage/);
//     const ramMatch = output.match(/Global variables use (\d+) bytes \((\d+)%\)/);

//     const flashUsed = flashMatch ? parseInt(flashMatch[1]) : 0;
//     const flashPercent = flashMatch ? parseFloat(flashMatch[2]) : 0;
//     const ramUsed = ramMatch ? parseInt(ramMatch[1]) : 0;
//     const ramPercent = ramMatch ? parseFloat(ramMatch[2]) : 0;

//     return {
//       flash: { used: flashUsed, total: board.specs.flash, percentage: flashPercent.toFixed(1) },
//       ram: { used: ramUsed, total: board.specs.sram, percentage: ramPercent.toFixed(1) }
//     };
//   }

//   /**
//    * Parse warnings
//    */
//   parseWarnings(stderr) {
//     const warnings = [];
//     const lines = stderr.split('\n');
//     for (const line of lines) if (line.includes('warning:')) warnings.push(line.trim());
//     return warnings;
//   }

//   /**
//    * Store firmware
//    */
//   async storeFirmware({ compilationId, code, board, buildDir, firmwareData, files }) {
//     const timestamp = new Date().toISOString().replace(/:/g, '-');
//     const codeHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 8);
//     const storageDir = path.join(config.paths.firmware, `${timestamp}-${board.id}-${codeHash}`);
//     await fs.mkdir(storageDir, { recursive: true });

//     if (board.architecture === 'avr') {
//       if (firmwareData.mainFirmware) await fs.copyFile(firmwareData.mainFirmware, path.join(storageDir, path.basename(firmwareData.mainFirmware)));
//     } else if (board.architecture === 'esp32') {
//       for (const file of files) if (file.endsWith('.bin') || file.endsWith('.elf') || file.endsWith('.map')) await fs.copyFile(path.join(buildDir, file), path.join(storageDir, file));
//     } else if (board.architecture === 'stm32') {
//       if (firmwareData.mainFirmware) await fs.copyFile(firmwareData.mainFirmware, path.join(storageDir, path.basename(firmwareData.mainFirmware)));
//     }

//     await fs.writeFile(path.join(storageDir, 'source.ino'), code);

//     const metadata = {
//       compilationId,
//       timestamp: new Date().toISOString(),
//       board: { id: board.id, name: board.name, architecture: board.architecture },
//       firmware: { format: board.architecture === 'avr' ? 'hex' : 'bin', files: files.filter(f => f.endsWith('.bin') || f.endsWith('.hex')) },
//       source: { hash: codeHash, lines: code.split('\n').length },
//       method: 'arduino-cli',
//       buildDir: buildDir
//     };

//     await fs.writeFile(path.join(storageDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
//     logger.info(`Firmware stored at ${storageDir}`);
//     return storageDir;
//   }

//   /**
//    * Get available libraries
//    */
//   async getAvailableLibraries(architecture) {
//     try {
//       const result = await this.executeCommand(this.cliPath, ['lib', 'list', '--format', 'json']);
//       let libraries = [];
//       try { libraries = JSON.parse(result.stdout); } catch (error) { logger.warn('Failed to parse library list JSON'); return []; }
//       return libraries.filter(lib => {
//         if (!lib.library) return false;
//         const architectures = lib.library.architectures || ['*'];
//         return architectures.includes(architecture) || architectures.includes('*');
//       }).map(lib => ({
//         name: lib.library.name,
//         version: lib.library.version,
//         folder: lib.library.name,
//         architectures: lib.library.architectures || ['*']
//       }));
//     } catch (error) {
//       logger.error('Failed to get libraries:', error);
//       return [];
//     }
//   }
// }

// module.exports = new ArduinoCLIService();

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const he = require('he'); // Decode HTML entities
const config = require('../config/config');
const logger = require('../utils/logger.util');

class ArduinoCLIService {
  constructor() {
    this.cliPath = 'arduino-cli';

    // Handle process exit to clean temp files
    process.on('exit', () => this.cleanTempFiles());
    process.on('SIGINT', () => { this.cleanTempFiles().then(() => process.exit(0)); });
    process.on('SIGTERM', () => { this.cleanTempFiles().then(() => process.exit(0)); });
  }

  /**
   * Clean all temporary compilation folders
   */
  async cleanTempFiles() {
    try {
      const tempDir = config.paths.temp;
      const entries = await fs.readdir(tempDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(tempDir, entry.name);
        try {
          if (entry.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
            logger.info(`Deleted temp folder: ${fullPath}`);
          } else {
            await fs.unlink(fullPath);
            logger.info(`Deleted temp file: ${fullPath}`);
          }
        } catch (err) {
          logger.warn(`Failed to delete temp ${fullPath}: ${err.message}`);
        }
      }

      logger.info('Temp files cleanup completed.');
    } catch (error) {
      logger.error('Error during temp cleanup:', error);
    }
  }

  /**
   * Main compile method
   */
  async compile({ compilationId, code, board, options }) {
    await this.cleanTempFiles(); // Clean temp files before starting

    const startTime = Date.now();

    try {
      logger.info(`Arduino CLI Compilation ${compilationId}: Starting for ${board.name}`);

      // Create sketch folder structure
      const baseDir = path.join(config.paths.temp, `compile-${compilationId}`);
      const sketchDir = path.join(baseDir, 'sketch');
      const sketchFile = path.join(sketchDir, 'sketch.ino');
      const buildDir = path.join(baseDir, 'build');

      await fs.mkdir(sketchDir, { recursive: true });
      await fs.mkdir(buildDir, { recursive: true });

      // Decode HTML entities in code before writing
      const decodedCode = he.decode(code);
      await fs.writeFile(sketchFile, decodedCode, 'utf-8');
      logger.info(`Sketch file created: ${sketchFile}`);

      // Get FQBN
      const fqbn = this.getBoardFQBN(board.id);
      logger.info(`Using FQBN: ${fqbn}`);

      // Compile with Arduino CLI
      const compileArgs = [
        'compile',
        '--fqbn', fqbn,
        '--output-dir', buildDir,
        '--verbose',
        sketchDir
      ];

      logger.info(`Executing: arduino-cli ${compileArgs.join(' ')}`);
      const result = await this.executeCommand(this.cliPath, compileArgs);

      logger.info('Compilation completed successfully');

      // Find firmware files (architecture-specific)
      const files = await fs.readdir(buildDir);
      const firmwareData = await this.findFirmwareFiles(buildDir, files, board);

      if (!firmwareData.mainFirmware) {
        logger.error('Available files in build directory:', files);
        throw new Error(`Firmware file not found for ${board.architecture} architecture`);
      }

      const firmwareStats = await fs.stat(firmwareData.mainFirmware);

      // Parse memory usage
      const memoryUsage = this.parseMemoryUsage(result.stdout + result.stderr, board);

      const buildTime = Date.now() - startTime;

      logger.info(`Compilation ${compilationId}: Success in ${buildTime}ms`);

      // Store firmware
      const storageDir = await this.storeFirmware({
        compilationId,
        code: decodedCode,
        board,
        buildDir,
        firmwareData,
        files
      });

      return {
        firmwarePath: storageDir,
        firmwareSize: memoryUsage,
        memoryUsage: memoryUsage,
        warnings: this.parseWarnings(result.stderr),
        buildTime,
        metadata: {
          compilationId,
          board: board.id,
          architecture: board.architecture,
          timestamp: new Date().toISOString(),
          firmwareFile: firmwareData.mainFirmware,
          firmwareSize: firmwareStats.size,
          buildDir: buildDir
        }
      };

    } catch (error) {
      logger.error(`Compilation ${compilationId} failed:`, error);
      throw {
        message: error.message || 'Compilation failed',
        stage: 'compilation',
        details: error.stderr || error.stdout || error.stack
      };
    }
  }

  /**
   * Find firmware files based on architecture
   */
  async findFirmwareFiles(buildDir, files, board) {
    const firmwareData = {
      mainFirmware: null,
      bootloader: null,
      partitions: null,
      bootApp: null
    };

    if (board.architecture === 'avr') {
      const hexFile = files.find(f => f.endsWith('.hex') && !f.includes('with_bootloader'));
      if (hexFile) firmwareData.mainFirmware = path.join(buildDir, hexFile);
    } else if (board.architecture === 'esp32') {
      const mergedBin = files.find(f => f.includes('.merged.bin'));
      const sketchBin = files.find(f => f === 'sketch.ino.bin');
      firmwareData.mainFirmware = mergedBin ? path.join(buildDir, mergedBin) : (sketchBin ? path.join(buildDir, sketchBin) : null);
      const bootloaderBin = files.find(f => f.includes('.bootloader.bin'));
      if (bootloaderBin) firmwareData.bootloader = path.join(buildDir, bootloaderBin);
      const partitionsBin = files.find(f => f.includes('.partitions.bin'));
      if (partitionsBin) firmwareData.partitions = path.join(buildDir, partitionsBin);
    } else if (board.architecture === 'stm32') {
      const binFile = files.find(f => f.endsWith('.bin'));
      const hexFile = files.find(f => f.endsWith('.hex'));
      firmwareData.mainFirmware = binFile ? path.join(buildDir, binFile) : (hexFile ? path.join(buildDir, hexFile) : null);
    }

    return firmwareData;
  }

  /**
   * Upload firmware to board
   */
  async upload({ uploadId, firmwarePath, board, port, options }) {
    const startTime = Date.now();

    try {
      logger.info(`Upload ${uploadId}: Starting to ${board.name} on ${port}`);

      const metadataPath = path.join(firmwarePath, 'metadata.json');
      let buildDir = firmwarePath;
      try {
        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
        if (metadata.buildDir) buildDir = metadata.buildDir;
      } catch (error) {
        logger.warn('Could not read metadata, using firmware path as build dir');
      }

      if (board.architecture === 'esp32') return await this.uploadESP32WithCLI(uploadId, buildDir, board, port);

      const files = await fs.readdir(firmwarePath);
      const hexFile = files.find(f => f.endsWith('.hex'));
      if (!hexFile) throw new Error('Hex file not found in firmware directory');

      const hexPath = path.join(firmwarePath, hexFile);
      const fqbn = this.getBoardFQBN(board.id);

      const uploadArgs = [
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--input-file', hexPath,
        '--verbose'
      ];

      logger.info(`Executing: arduino-cli ${uploadArgs.join(' ')}`);
      await this.executeCommand(this.cliPath, uploadArgs);

      const duration = Date.now() - startTime;
      logger.info(`Upload ${uploadId}: Success in ${duration}ms`);

      return {
        success: true,
        duration,
        bytesWritten: (await fs.stat(hexPath)).size,
        verified: true
      };

    } catch (error) {
      logger.error(`Upload ${uploadId} failed:`, error);
      throw {
        message: error.message || 'Upload failed',
        stage: 'upload',
        details: error.stderr || error.stdout || error.stack
      };
    }
  }

  /**
   * Upload ESP32 using Arduino CLI
   */
  async uploadESP32WithCLI(uploadId, buildDir, board, port) {
    const startTime = Date.now();
    try {
      logger.info(`ESP32 Upload: Using Arduino CLI to upload from ${buildDir}`);
      const sketchDir = path.dirname(buildDir);
      const fqbn = this.getBoardFQBN(board.id);

      const uploadArgs = [
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--input-dir', buildDir,
        '--verbose'
      ];

      logger.info(`Executing: arduino-cli ${uploadArgs.join(' ')}`);
      await this.executeCommand(this.cliPath, uploadArgs);

      const duration = Date.now() - startTime;
      const files = await fs.readdir(buildDir);
      const mainBin = files.find(f => f.includes('.merged.bin') || f === 'sketch.ino.bin');
      const firmwareSize = mainBin ? (await fs.stat(path.join(buildDir, mainBin))).size : 0;

      logger.info(`ESP32 Upload ${uploadId}: Success in ${duration}ms`);
      return { success: true, duration, bytesWritten: firmwareSize, verified: true };
    } catch (error) {
      logger.error(`ESP32 Upload failed:`, error);
      throw error;
    }
  }

  /**
   * Get Board FQBN
   */
  getBoardFQBN(boardId) {
    const fqbnMap = {
      'arduino_uno': 'arduino:avr:uno',
      'arduino_mega': 'arduino:avr:mega:cpu=atmega2560',
      'arduino_nano': 'arduino:avr:nano:cpu=atmega328',
      'esp32_devkit_v1': 'esp32:esp32:esp32',
      'stm32_bluepill': 'STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C8'
    };

    const fqbn = fqbnMap[boardId];
    if (!fqbn) throw new Error(`Unknown board ID: ${boardId}`);
    return fqbn;
  }

  /**
   * Execute command
   */
  executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { shell: true, cwd: config.paths.temp, env: process.env });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => stdout += data.toString());
      proc.stderr.on('data', (data) => stderr += data.toString());

      proc.on('close', (code) => {
        if (code === 0) resolve({ stdout, stderr, code });
        else {
          const error = new Error(`Command failed with exit code ${code}`);
          error.stdout = stdout;
          error.stderr = stderr;
          error.code = code;
          reject(error);
        }
      });

      proc.on('error', (err) => { err.stdout = stdout; err.stderr = stderr; reject(err); });

      setTimeout(() => {
        proc.kill();
        const error = new Error('Command timeout (120s)');
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }, 120000);
    });
  }

  /**
   * Parse memory usage
   */
  parseMemoryUsage(output, board) {
    const flashMatch = output.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage/);
    const ramMatch = output.match(/Global variables use (\d+) bytes \((\d+)%\)/);

    const flashUsed = flashMatch ? parseInt(flashMatch[1]) : 0;
    const flashPercent = flashMatch ? parseFloat(flashMatch[2]) : 0;
    const ramUsed = ramMatch ? parseInt(ramMatch[1]) : 0;
    const ramPercent = ramMatch ? parseFloat(ramMatch[2]) : 0;

    return {
      flash: { used: flashUsed, total: board.specs.flash, percentage: flashPercent.toFixed(1) },
      ram: { used: ramUsed, total: board.specs.sram, percentage: ramPercent.toFixed(1) }
    };
  }

  /**
   * Parse warnings
   */
  parseWarnings(stderr) {
    return stderr.split('\n').filter(line => line.includes('warning:')).map(line => line.trim());
  }

  /**
   * Store firmware
   */
  async storeFirmware({ compilationId, code, board, buildDir, firmwareData, files }) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 8);
    const storageDir = path.join(config.paths.firmware, `${timestamp}-${board.id}-${codeHash}`);
    await fs.mkdir(storageDir, { recursive: true });

    if (board.architecture === 'avr') {
      if (firmwareData.mainFirmware) await fs.copyFile(firmwareData.mainFirmware, path.join(storageDir, path.basename(firmwareData.mainFirmware)));
    } else if (board.architecture === 'esp32') {
      for (const file of files) if (file.endsWith('.bin') || file.endsWith('.elf') || file.endsWith('.map')) await fs.copyFile(path.join(buildDir, file), path.join(storageDir, file));
    } else if (board.architecture === 'stm32') {
      if (firmwareData.mainFirmware) await fs.copyFile(firmwareData.mainFirmware, path.join(storageDir, path.basename(firmwareData.mainFirmware)));
    }

    await fs.writeFile(path.join(storageDir, 'source.ino'), code);

    const metadata = {
      compilationId,
      timestamp: new Date().toISOString(),
      board: { id: board.id, name: board.name, architecture: board.architecture },
      firmware: { format: board.architecture === 'avr' ? 'hex' : 'bin', files: files.filter(f => f.endsWith('.bin') || f.endsWith('.hex')) },
      source: { hash: codeHash, lines: code.split('\n').length },
      method: 'arduino-cli',
      buildDir: buildDir
    };

    await fs.writeFile(path.join(storageDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    logger.info(`Firmware stored at ${storageDir}`);
    return storageDir;
  }

  /**
   * Get available libraries
   */
  async getAvailableLibraries(architecture) {
    try {
      const result = await this.executeCommand(this.cliPath, ['lib', 'list', '--format', 'json']);
      let libraries = [];
      try { libraries = JSON.parse(result.stdout); } catch (error) { logger.warn('Failed to parse library list JSON'); return []; }
      return libraries.filter(lib => {
        if (!lib.library) return false;
        const architectures = lib.library.architectures || ['*'];
        return architectures.includes(architecture) || architectures.includes('*');
      }).map(lib => ({
        name: lib.library.name,
        version: lib.library.version,
        folder: lib.library.name,
        architectures: lib.library.architectures || ['*']
      }));
    } catch (error) {
      logger.error('Failed to get libraries:', error);
      return [];
    }
  }
}

module.exports = new ArduinoCLIService();
