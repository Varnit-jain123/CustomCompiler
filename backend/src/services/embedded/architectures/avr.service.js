const BaseArchitecture = require('./base.architecture');
const path = require('path');
const fs = require('fs').promises;
const toolchainsConfig = require('../../../config/toolchains.config');
const logger = require('../../../utils/logger.util');

class AVRArchitecture extends BaseArchitecture {
  constructor() {
    super('AVR');
    this.toolchain = toolchainsConfig.avr;
  }

  /**
   * Validate AVR board configuration
   */
  validateBoard(boardConfig) {
    if (!boardConfig.mcu) {
      throw new Error('MCU not specified in board configuration');
    }
    if (!boardConfig.f_cpu) {
      throw new Error('F_CPU not specified in board configuration');
    }
    return true;
  }

  /**
   * Compile C++ source file to object file
   */
  getCompilerCommand(sourceFile, outputFile, boardConfig, includePaths = []) {
    const command = this.toolchain.compiler.gpp;
    
    const args = [
      ...boardConfig.compiler.flags,
      ...boardConfig.compiler.defines,
      `-mmcu=${boardConfig.mcu}`,
      ...includePaths.map(p => `-I${p}`),
      sourceFile,
      '-o',
      outputFile
    ];

    return { command, args };
  }

  /**
   * Compile C source file to object file
   */
  getCompilerCommandC(sourceFile, outputFile, boardConfig, includePaths = []) {
    const command = this.toolchain.compiler.gcc;
    
    const args = [
      '-c',
      '-g',
      '-Os',
      '-w',
      '-std=gnu11',
      '-ffunction-sections',
      '-fdata-sections',
      '-MMD',
      '-flto',
      `-mmcu=${boardConfig.mcu}`,
      ...boardConfig.compiler.defines,
      ...includePaths.map(p => `-I${p}`),
      sourceFile,
      '-o',
      outputFile
    ];

    return { command, args };
  }

  /**
   * Link object files into ELF executable
   */
  getLinkerCommand(objectFiles, outputElf, boardConfig) {
    const command = this.toolchain.compiler.gcc;
    
    const args = [
      ...boardConfig.linker.flags,
      `-mmcu=${boardConfig.mcu}`,
      '-o',
      outputElf,
      ...objectFiles,
      ...boardConfig.linker.libs
    ];

    return { command, args };
  }

  /**
   * Generate HEX firmware from ELF
   */
  async generateFirmware(elfFile, outputDir, boardConfig) {
    try {
      const hexFile = path.join(outputDir, 'firmware.hex');
      const eepFile = path.join(outputDir, 'firmware.eep');

      // Generate HEX file (Flash memory)
      const hexCommand = this.toolchain.compiler.objcopy;
      const hexArgs = [
        '-O',
        'ihex',
        '-R',
        '.eeprom',
        elfFile,
        hexFile
      ];

      await this.executeCommand(hexCommand, hexArgs);
      logger.info('Generated HEX file');

      // Generate EEPROM file
      try {
        const eepArgs = [
          '-O',
          'ihex',
          '-j',
          '.eeprom',
          '--set-section-flags=.eeprom=alloc,load',
          '--no-change-warnings',
          '--change-section-lma',
          '.eeprom=0',
          elfFile,
          eepFile
        ];

        await this.executeCommand(hexCommand, eepArgs);
        logger.info('Generated EEPROM file');
      } catch (error) {
        // EEPROM generation might fail if no EEPROM data - this is OK
        logger.warn('EEPROM file not generated (may be empty)');
      }

      // Get size information
      const sizeInfo = await this.getFirmwareSize(elfFile, boardConfig);

      return {
        hex: hexFile,
        eep: eepFile,
        elf: elfFile,
        size: sizeInfo
      };

    } catch (error) {
      logger.error('Firmware generation failed:', error);
      throw error;
    }
  }

  /**
   * Get firmware size information
   */
  async getFirmwareSize(elfFile, boardConfig) {
    try {
      const command = this.toolchain.compiler.size;
      const args = ['-C', `--mcu=${boardConfig.mcu}`, elfFile];

      const { stdout } = await this.executeCommand(command, args);

      // Parse output
      const lines = stdout.split('\n');
      const dataLine = lines.find(line => line.includes('data') || line.includes('Data'));
      const textLine = lines.find(line => line.includes('text') || line.includes('Program'));

      const flashUsed = textLine ? parseInt(textLine.match(/\d+/)[0]) : 0;
      const ramUsed = dataLine ? parseInt(dataLine.match(/\d+/)[0]) : 0;

      return {
        flash: {
          used: flashUsed,
          total: boardConfig.specs.flash,
          percentage: ((flashUsed / boardConfig.specs.flash) * 100).toFixed(1)
        },
        ram: {
          used: ramUsed,
          total: boardConfig.specs.sram,
          percentage: ((ramUsed / boardConfig.specs.sram) * 100).toFixed(1)
        }
      };

    } catch (error) {
      logger.error('Failed to get firmware size:', error);
      return null;
    }
  }

  /**
   * Get upload command using avrdude
   */
  getUploadCommand(firmwareFile, port, boardConfig) {
    const command = this.toolchain.uploader.avrdude;
    
    const replacements = {
      'avrdude.config': this.toolchain.uploader.configFile,
      'serial.port': port,
      'firmware.hex': firmwareFile
    };

    const args = this.replacePlaceholders(
      boardConfig.uploader.flags,
      replacements
    );

    return { command, args };
  }

  /**
   * Parse avrdude upload output for progress
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
      if (line.includes('Writing')) {
        progress.stage = 'writing';
      } else if (line.includes('Reading')) {
        progress.stage = 'verifying';
      }

      // Extract percentage
      const percentMatch = line.match(/(\d+)%/);
      if (percentMatch) {
        progress.percentage = parseInt(percentMatch[1]);
      }

      // Detect success
      if (line.includes('bytes of flash verified') || 
          line.includes('avrdude: done')) {
        progress.success = true;
        progress.message = 'Upload completed successfully';
      }

      // Detect errors
      if (line.includes('error') || line.includes('Error')) {
        progress.success = false;
        progress.message = line;
      }
    }

    return progress;
  }

  /**
   * Create Arduino core library archive
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
        boardConfig.compiler.includes.find(i => i.includes('variants'))?.split('/').pop() || 'standard'
      );

      const coreFiles = await fs.readdir(coreDir);
      const objectFiles = [];

      // Compile core C files
      for (const file of coreFiles) {
        if (file.endsWith('.c')) {
          const sourceFile = path.join(coreDir, file);
          const objectFile = path.join(outputDir, 'core', `${file}.o`);
          
          await fs.mkdir(path.dirname(objectFile), { recursive: true });

          const { command, args } = this.getCompilerCommandC(
            sourceFile,
            objectFile,
            boardConfig,
            [coreDir, variantDir]
          );

          await this.executeCommand(command, args);
          objectFiles.push(objectFile);
        }
      }

      // Compile core C++ files
      for (const file of coreFiles) {
        if (file.endsWith('.cpp')) {
          const sourceFile = path.join(coreDir, file);
          const objectFile = path.join(outputDir, 'core', `${file}.o`);
          
          await fs.mkdir(path.dirname(objectFile), { recursive: true });

          const { command, args } = this.getCompilerCommand(
            sourceFile,
            objectFile,
            boardConfig,
            [coreDir, variantDir]
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
      logger.info('Built Arduino core library');

      return archiveFile;

    } catch (error) {
      logger.error('Failed to build core library:', error);
      throw error;
    }
  }
}

module.exports = new AVRArchitecture();