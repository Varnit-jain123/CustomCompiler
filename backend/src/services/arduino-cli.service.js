const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config/config');
const logger = require('../utils/logger.util');

class ArduinoCLIService {
  constructor() {
    this.cliPath = 'arduino-cli';
  }

  /**
   * Main compile method
   */
  async compile({ compilationId, code, board, options }) {
    const startTime = Date.now();

    try {
      logger.info(`Arduino CLI Compilation ${compilationId}: Starting for ${board.name}`);

      // Create sketch directory structure: temp/compile-<uuid>/sketch/sketch.ino
      const baseDir = path.join(config.paths.temp, `compile-${compilationId}`);
      const sketchDir = path.join(baseDir, 'sketch');
      const sketchFile = path.join(sketchDir, 'sketch.ino');
      const buildDir = path.join(baseDir, 'build');

      // Create directories recursively
      await fs.mkdir(sketchDir, { recursive: true });
      await fs.mkdir(buildDir, { recursive: true });

      // Write Arduino code to sketch.ino
      await fs.writeFile(sketchFile, code, 'utf-8');

      logger.info(`Created sketch: ${sketchFile}`);

      // Get FQBN (Fully Qualified Board Name)
      const fqbn = this.getBoardFQBN(board.id);
      logger.info(`Using FQBN: ${fqbn}`);

      // Compile using Arduino CLI
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

      // Find generated hex file
      const files = await fs.readdir(buildDir);
      const hexFile = files.find(f => f.endsWith('.hex'));

      if (!hexFile) {
        throw new Error('Hex file not generated after compilation');
      }

      const hexPath = path.join(buildDir, hexFile);
      const hexStats = await fs.stat(hexPath);

      // Parse memory usage from compiler output
      const memoryUsage = this.parseMemoryUsage(result.stdout + result.stderr, board);

      const buildTime = Date.now() - startTime;

      logger.info(`Compilation ${compilationId}: Success in ${buildTime}ms`);

      // Store firmware
      const storageDir = await this.storeFirmware({
        compilationId,
        code,
        board,
        buildDir,
        hexPath,
        hexFile
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
          hexFile: hexPath,
          hexSize: hexStats.size
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
    if (!fqbn) {
      throw new Error(`Unknown board ID: ${boardId}`);
    }

    return fqbn;
  }

  /**
   * Execute command with proper error handling
   */
  executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        shell: true,
        cwd: config.paths.temp,
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
      });

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          const error = new Error(`Command failed with exit code ${code}`);
          error.stdout = stdout;
          error.stderr = stderr;
          error.code = code;
          reject(error);
        }
      });

      proc.on('error', (err) => {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        proc.kill();
        const error = new Error('Compilation timeout (120s)');
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }, 120000);
    });
  }

  /**
   * Parse memory usage from Arduino CLI output
   */
  parseMemoryUsage(output, board) {
    // Example: "Sketch uses 928 bytes (2%) of program storage space."
    const flashMatch = output.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage/);
    
    // Example: "Global variables use 9 bytes (0%) of dynamic memory"
    const ramMatch = output.match(/Global variables use (\d+) bytes \((\d+)%\)/);

    const flashUsed = flashMatch ? parseInt(flashMatch[1]) : 0;
    const flashPercent = flashMatch ? parseFloat(flashMatch[2]) : 0;
    
    const ramUsed = ramMatch ? parseInt(ramMatch[1]) : 0;
    const ramPercent = ramMatch ? parseFloat(ramMatch[2]) : 0;

    return {
      flash: {
        used: flashUsed,
        total: board.specs.flash,
        percentage: flashPercent.toFixed(1)
      },
      ram: {
        used: ramUsed,
        total: board.specs.sram,
        percentage: ramPercent.toFixed(1)
      }
    };
  }

  /**
   * Parse warnings from compiler output
   */
  parseWarnings(stderr) {
    const warnings = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
      if (line.includes('warning:')) {
        warnings.push(line.trim());
      }
    }

    return warnings;
  }

  /**
   * Store firmware in executables directory
   */
  async storeFirmware({ compilationId, code, board, buildDir, hexPath, hexFile }) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 8);
    
    const storageDir = path.join(
      config.paths.firmware,
      `${timestamp}-${board.id}-${codeHash}`
    );

    await fs.mkdir(storageDir, { recursive: true });

    // Copy hex file
    await fs.copyFile(hexPath, path.join(storageDir, 'firmware.hex'));

    // Save source code
    await fs.writeFile(path.join(storageDir, 'source.ino'), code);

    // Save metadata
    const metadata = {
      compilationId,
      timestamp: new Date().toISOString(),
      board: {
        id: board.id,
        name: board.name,
        architecture: board.architecture
      },
      firmware: {
        format: 'hex',
        hexFile: hexFile
      },
      source: {
        hash: codeHash,
        lines: code.split('\n').length
      },
      method: 'arduino-cli'
    };

    await fs.writeFile(
      path.join(storageDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    logger.info(`Firmware stored at ${storageDir}`);

    return storageDir;
  }

  /**
   * Upload firmware to board
   */
  async upload({ uploadId, firmwarePath, board, port, options }) {
    const startTime = Date.now();

    try {
      logger.info(`Upload ${uploadId}: Starting to ${board.name} on ${port}`);

      // Find hex file
      const files = await fs.readdir(firmwarePath);
      const hexFile = files.find(f => f.endsWith('.hex'));

      if (!hexFile) {
        throw new Error('Hex file not found in firmware directory');
      }

      const hexPath = path.join(firmwarePath, hexFile);
      const fqbn = this.getBoardFQBN(board.id);

      // Upload using Arduino CLI
      const uploadArgs = [
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--input-file', hexPath,
        '--verbose'
      ];

      logger.info(`Executing: arduino-cli ${uploadArgs.join(' ')}`);

      const result = await this.executeCommand(this.cliPath, uploadArgs);

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
   * Get available libraries
   */
  async getAvailableLibraries(architecture) {
    try {
      const result = await this.executeCommand(this.cliPath, ['lib', 'list', '--format', 'json']);
      const libraries = JSON.parse(result.stdout);
      
      return libraries
        .filter(lib => !lib.architectures || lib.architectures.includes(architecture) || lib.architectures.includes('*'))
        .map(lib => ({
          name: lib.name,
          version: lib.latest,
          folder: lib.name,
          architectures: lib.architectures || ['*']
        }));
    } catch (error) {
      logger.error('Failed to get libraries:', error);
      return [];
    }
  }
}

module.exports = new ArduinoCLIService();