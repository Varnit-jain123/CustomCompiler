const BaseArchitecture = require('./base.architecture');
const path = require('path');
const fs = require('fs').promises;
const toolchainsConfig = require('../../../config/toolchains.config');
const logger = require('../../../utils/logger.util');

class ESP32Architecture extends BaseArchitecture {
  constructor() {
    super('ESP32');
    this.toolchain = toolchainsConfig.esp32;
  }

  /**
   * Validate ESP32 board configuration
   */
  validateBoard(boardConfig) {
    if (!boardConfig.mcu) {
      throw new Error('MCU not specified in board configuration');
    }
    return true;
  }

  /**
   * Get compiler command for ESP32
   */
  getCompilerCommand(sourceFile, outputFile, boardConfig, includePaths = []) {
    const command = this.toolchain.compiler.gpp;
    
    const args = [
      ...boardConfig.compiler.flags,
      ...includePaths.map(p => `-I${p}`),
      sourceFile,
      '-o',
      outputFile
    ];

    return { command, args };
  }

  /**
   * Link object files into ELF
   */
  getLinkerCommand(objectFiles, outputElf, boardConfig) {
    const command = this.toolchain.compiler.gpp;
    
    const linkerScript = path.join(
      this.toolchain.arduinoCore,
      'tools/sdk/ld',
      boardConfig.linker.script || 'esp32.rom.ld'
    );

    const replacements = {
      'linker.script': linkerScript
    };

    const args = [
      ...boardConfig.linker.flags.map(arg => 
        this.replacePlaceholders([arg], replacements)[0]
      ),
      '-o',
      outputElf,
      ...objectFiles,
      ...boardConfig.linker.libs
    ];

    return { command, args };
  }

  /**
   * Generate BIN firmware from ELF
   */
  async generateFirmware(elfFile, outputDir, boardConfig) {
    try {
      const binFile = path.join(outputDir, 'firmware.bin');

      // Convert ELF to BIN
      const command = this.toolchain.uploader.esptool;
      const args = [
        '--chip', 'esp32',
        'elf2image',
        '--flash_mode', 'dio',
        '--flash_freq', '80m',
        '--flash_size', '4MB',
        '-o', binFile,
        elfFile
      ];

      await this.executeCommand(command, args);
      logger.info('Generated BIN file for ESP32');

      // Get size information
      const stats = await fs.stat(binFile);
      const sizeInfo = {
        flash: {
          used: stats.size,
          total: boardConfig.specs.flash,
          percentage: ((stats.size / boardConfig.specs.flash) * 100).toFixed(1)
        }
      };

      return {
        bin: binFile,
        elf: elfFile,
        size: sizeInfo,
        partitions: {
          bootloader: this.toolchain.bootloader,
          partitionTable: this.toolchain.partitions,
          bootApp: this.toolchain.bootApp,
          app: binFile
        }
      };

    } catch (error) {
      logger.error('ESP32 firmware generation failed:', error);
      throw error;
    }
  }

  /**
   * Get upload command using esptool
   */
  getUploadCommand(firmwareData, port, boardConfig) {
    const command = this.toolchain.uploader.esptool;
    
    const args = [
      '--chip', 'esp32',
      '--port', port,
      '--baud', boardConfig.uploadSpeed.toString(),
      '--before', 'default_reset',
      '--after', 'hard_reset',
      'write_flash',
      '-z',
      '--flash_mode', 'dio',
      '--flash_freq', '80m',
      '--flash_size', 'detect',
      '0x1000', firmwareData.partitions.bootloader,
      '0x8000', firmwareData.partitions.partitionTable,
      '0xe000', firmwareData.partitions.bootApp,
      '0x10000', firmwareData.partitions.app
    ];

    return { command, args };
  }

  /**
   * Parse esptool upload output
   */
  parseUploadOutput(stdout, stderr) {
    const output = stdout + '\n' + stderr;
    const lines = output.split('\n');
    
    const progress = {
      stage: 'uploading',
      percentage: 0,
      message: '',
      success: false
    };

    for (const line of lines) {
      // Detect stages
      if (line.includes('Connecting')) {
        progress.stage = 'connecting';
        progress.message = 'Connecting to ESP32...';
      } else if (line.includes('Erasing')) {
        progress.stage = 'erasing';
        progress.message = 'Erasing flash...';
      } else if (line.includes('Writing')) {
        progress.stage = 'writing';
        progress.message = 'Writing firmware...';
      } else if (line.includes('Verifying')) {
        progress.stage = 'verifying';
        progress.message = 'Verifying...';
      }

      // Extract percentage
      const percentMatch = line.match(/(\d+)\s*%/);
      if (percentMatch) {
        progress.percentage = parseInt(percentMatch[1]);
      }

      // Detect success
      if (line.includes('Hash of data verified') || 
          line.includes('Leaving...') ||
          line.includes('Hard resetting')) {
        progress.success = true;
        progress.message = 'Upload completed successfully';
      }

      // Detect errors
      if (line.toLowerCase().includes('error') || 
          line.includes('Failed')) {
        progress.success = false;
        progress.message = line;
      }
    }

    return progress;
  }

  /**
   * Build ESP32 core library
   */
  async buildCoreLibrary(boardConfig, outputDir) {
    try {
      const coreDir = path.join(
        this.toolchain.arduinoCore,
        'cores/esp32'
      );
      
      const variantDir = path.join(
        this.toolchain.arduinoCore,
        'variants/esp32'
      );

      const includePaths = [
        coreDir,
        variantDir,
        path.join(this.toolchain.arduinoCore, 'tools/sdk/include'),
        path.join(this.toolchain.arduinoCore, 'tools/sdk/include/freertos')
      ];

      const coreFiles = await fs.readdir(coreDir);
      const objectFiles = [];

      // Compile core files
      for (const file of coreFiles) {
        if (file.endsWith('.c') || file.endsWith('.cpp')) {
          const sourceFile = path.join(coreDir, file);
          const objectFile = path.join(outputDir, 'core', `${file}.o`);
          
          await fs.mkdir(path.dirname(objectFile), { recursive: true });

          const { command, args } = this.getCompilerCommand(
            sourceFile,
            objectFile,
            boardConfig,
            includePaths
          );

          await this.executeCommand(command, args);
          objectFiles.push(objectFile);
        }
      }

      // Create archive
      const archiveFile = path.join(outputDir, 'core.a');
      const arCommand = this.toolchain.compiler.ar;
      const arArgs = ['rcs', archiveFile, ...objectFiles];

      await this.executeCommand(arCommand, arArgs);
      logger.info('Built ESP32 core library');

      return archiveFile;

    } catch (error) {
      logger.error('Failed to build ESP32 core library:', error);
      throw error;
    }
  }
}

module.exports = new ESP32Architecture();