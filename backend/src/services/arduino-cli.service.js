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
  }

  /**
   * Main compile method
   */
  async compile({ compilationId, code, board, options }) {
    const startTime = Date.now();

    try {
      logger.info(`Arduino CLI Compilation ${compilationId}: Starting for ${board.name}`);

      // Create sketch directory structure
      const baseDir = path.join(config.paths.temp, `compile-${compilationId}`);
      const sketchDir = path.join(baseDir, 'sketch');
      const sketchFile = path.join(sketchDir, 'sketch.ino');
      const buildDir = path.join(baseDir, 'build');

      await fs.mkdir(sketchDir, { recursive: true });
      await fs.mkdir(buildDir, { recursive: true });

      // Decode HTML entities to proper C++/Arduino syntax
      const decodedCode = he.decode(code);
      await fs.writeFile(sketchFile, decodedCode, 'utf-8');
      logger.info(`Created sketch: ${sketchFile}`);

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

      // Find generated firmware file
      let firmwareFile;
      if (board.architecture === 'esp32') {
        firmwareFile = (await fs.readdir(buildDir)).find(f => f.endsWith('.bin'));
      } else {
        firmwareFile = (await fs.readdir(buildDir)).find(f => f.endsWith('.hex'));
      }

      if (!firmwareFile) {
        throw new Error(`${board.architecture === 'esp32' ? 'Bin' : 'Hex'} file not generated after compilation`);
      }

      const firmwarePath = path.join(buildDir, firmwareFile);
      const firmwareStats = await fs.stat(firmwarePath);

      const memoryUsage = this.parseMemoryUsage(result.stdout + result.stderr, board);
      const buildTime = Date.now() - startTime;

      logger.info(`Compilation ${compilationId}: Success in ${buildTime}ms`);

      // Store firmware
      const storageDir = await this.storeFirmware({
        compilationId,
        code: decodedCode,
        board,
        buildDir,
        firmwarePath,
        firmwareFile
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
          firmwareFile: firmwarePath,
          firmwareSize: firmwareStats.size
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
   * Upload firmware to board
   */
  async upload({ uploadId, firmwarePath, board, port, options }) {
    const startTime = Date.now();

    try {
      logger.info(`Upload ${uploadId}: Starting to ${board.name} on ${port}`);

      const files = await fs.readdir(firmwarePath);
      const firmwareFile = board.architecture === 'esp32'
        ? files.find(f => f.endsWith('.bin'))
        : files.find(f => f.endsWith('.hex'));

      if (!firmwareFile) throw new Error('Firmware file not found in firmware directory');

      const firmwareFullPath = path.join(firmwarePath, firmwareFile);
      const fqbn = this.getBoardFQBN(board.id);

      const uploadArgs = [
        'upload',
        '--fqbn', fqbn,
        '--port', port,
        '--input-file', firmwareFullPath,
        '--verbose'
      ];

      logger.info(`Executing: arduino-cli ${uploadArgs.join(' ')}`);
      await this.executeCommand(this.cliPath, uploadArgs);

      const duration = Date.now() - startTime;
      logger.info(`Upload ${uploadId}: Success in ${duration}ms`);

      return {
        success: true,
        duration,
        bytesWritten: (await fs.stat(firmwareFullPath)).size,
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
   * Execute command with proper error handling
   */
  executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { shell: true, cwd: config.paths.temp, env: process.env });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });

      proc.on('close', code => {
        if (code === 0) resolve({ stdout, stderr, code });
        else {
          const error = new Error(`Command failed with exit code ${code}`);
          error.stdout = stdout;
          error.stderr = stderr;
          error.code = code;
          reject(error);
        }
      });

      proc.on('error', err => { err.stdout = stdout; err.stderr = stderr; reject(err); });

      setTimeout(() => {
        proc.kill();
        const error = new Error('Command timeout (120s)');
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }, 120000);
    });
  }

  parseMemoryUsage(output, board) {
    const flashMatch = output.match(/Sketch uses (\d+) bytes \((\d+)%\) of program storage/);
    const ramMatch = output.match(/Global variables use (\d+) bytes \((\d+)%\)/);

    return {
      flash: {
        used: flashMatch ? parseInt(flashMatch[1]) : 0,
        total: board.specs.flash,
        percentage: flashMatch ? parseFloat(flashMatch[2]).toFixed(1) : 0
      },
      ram: {
        used: ramMatch ? parseInt(ramMatch[1]) : 0,
        total: board.specs.sram,
        percentage: ramMatch ? parseFloat(ramMatch[2]).toFixed(1) : 0
      }
    };
  }

  parseWarnings(stderr) {
    return stderr.split('\n').filter(line => line.includes('warning:')).map(line => line.trim());
  }

  async storeFirmware({ compilationId, code, board, buildDir, firmwarePath, firmwareFile }) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 8);

    const storageDir = path.join(config.paths.firmware, `${timestamp}-${board.id}-${codeHash}`);
    await fs.mkdir(storageDir, { recursive: true });

    const ext = board.architecture === 'esp32' ? 'bin' : 'hex';
    await fs.copyFile(firmwarePath, path.join(storageDir, `firmware.${ext}`));
    await fs.writeFile(path.join(storageDir, 'source.ino'), code);

    const metadata = {
      compilationId,
      timestamp: new Date().toISOString(),
      board: { id: board.id, name: board.name, architecture: board.architecture },
      firmware: { format: ext, file: firmwareFile },
      source: { hash: codeHash, lines: code.split('\n').length },
      method: 'arduino-cli'
    };

    await fs.writeFile(path.join(storageDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    logger.info(`Firmware stored at ${storageDir}`);
    return storageDir;
  }
}

module.exports = new ArduinoCLIService();
