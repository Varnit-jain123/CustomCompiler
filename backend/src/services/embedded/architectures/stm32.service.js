const BaseArchitecture = require('./base.architecture');
const path = require('path');
const fs = require('fs').promises;
const toolchainsConfig = require('../../../config/toolchains.config');
const logger = require('../../../utils/logger.util');

class STM32Architecture extends BaseArchitecture {
  constructor() {
    super('STM32');
    this.toolchain = toolchainsConfig.stm32;
  }

  /**
   * Validate STM32 board configuration
   */
  validateBoard(boardConfig) {
    if (!boardConfig.mcu) {
      throw new Error('MCU not specified in board configuration');
    }
    return true;
  }

  /**
   * Get compiler command
   */
  getCompilerCommand(sourceFile, outputFile, boardConfig, includePaths = []) {
    const command = this.toolchain.compiler.gpp;
    
    const args = [
      ...boardConfig.compiler.flags,
      ...boardConfig.compiler.defines,
      ...includePaths.map(p => `-I${p}`),
      sourceFile,
      '-o',
      outputFile
    ];

    return { command, args };
  }

  /**
   * Link object files
   */
  getLinkerCommand(objectFiles, outputElf, boardConfig) {
    const command = this.toolchain.compiler.gcc;
    
    const linkerScript = path.join(
      this.toolchain.arduinoCore,
      'variants',
      boardConfig.linker.script || 'ld/jtag.ld'
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
   * Generate BIN firmware
   */
  async generateFirmware(elfFile, outputDir, boardConfig) {
    try {
      const binFile = path.join(outputDir, 'firmware.bin');
      const hexFile = path.join(outputDir, 'firmware.hex');

      // Generate BIN file
      const binCommand = this.toolchain.compiler.objcopy;
      const binArgs = [
        '-O',
        'binary',
        elfFile,
        binFile
      ];

      await this.executeCommand(binCommand, binArgs);
      logger.info('Generated BIN file for STM32');

      // Generate HEX file (optional)
      const hexArgs = [
        '-O',
        'ihex',
        elfFile,
        hexFile
      ];

      await this.executeCommand(binCommand, hexArgs);
      logger.info('Generated HEX file for STM32');

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
        hex: hexFile,
        elf: elfFile,
        size: sizeInfo
      };

    } catch (error) {
      logger.error('STM32 firmware generation failed:', error);
      throw error;
    }
  }

  /**
   * Get upload command
   */
  getUploadCommand(firmwareData, port, boardConfig) {
    const uploader = boardConfig.uploader.tool;
    
    if (uploader === 'stm32flash') {
      // Serial bootloader
      return {
        command: this.toolchain.uploader.stm32flash,
        args: [
          '-g', '0x8000000',
          '-b', boardConfig.uploadSpeed.toString(),
          '-w', firmwareData.bin,
          '-v',
          '-R',
          port
        ]
      };
    } else if (uploader === 'st-flash') {
      // ST-Link programmer
      return {
        command: this.toolchain.uploader.stlink,
        args: [
          'write',
          firmwareData.bin,
          '0x8000000'
        ]
      };
    }

    throw new Error(`Unsupported STM32 uploader: ${uploader}`);
  }

  /**
   * Parse upload output
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
      // stm32flash output
      if (line.includes('Serial Config:')) {
        progress.stage = 'connecting';
        progress.message = 'Connecting to STM32...';
      } else if (line.includes('Erasing memory')) {
        progress.stage = 'erasing';
        progress.message = 'Erasing flash...';
      } else if (line.includes('Writing to memory')) {
        progress.stage = 'writing';
        progress.message = 'Writing firmware...';
      } else if (line.includes('Verifying')) {
        progress.stage = 'verifying';
        progress.message = 'Verifying...';
      }

      // Extract percentage
      const percentMatch = line.match(/(\d+)%/);
      if (percentMatch) {
        progress.percentage = parseInt(percentMatch[1]);
      }

      // Detect success
      if (line.includes('Starting execution') || 
          line.includes('Done.')) {
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
   * Build STM32 core library
   */
  async buildCoreLibrary(boardConfig, outputDir) {
    try {
      const coreDir = path.join(
        this.toolchain.arduinoCore,
        'cores/arduino'
      );
      
      const variantDir = path.join(
        this.toolchain.arduinoCore,
        'variants',
        boardConfig.compiler.includes.find(i => i.includes('variants'))?.split('/').pop() || 'PILL_F103XX'
      );

      const includePaths = [
        coreDir,
        variantDir,
        path.join(this.toolchain.cmsis, 'Include')
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
      logger.info('Built STM32 core library');

      return archiveFile;

    } catch (error) {
      logger.error('Failed to build STM32 core library:', error);
      throw error;
    }
  }
}

module.exports = new STM32Architecture();