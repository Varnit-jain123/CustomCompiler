const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/config');
const boardsConfig = require('../../config/boards.config');
const preprocessor = require('./preprocessor.service');
const avrService = require('./architectures/avr.service');
const esp32Service = require('./architectures/esp32.service');
const stm32Service = require('./architectures/stm32.service');
const logger = require('../../utils/logger.util');

class ToolchainService {
  constructor() {
    this.architectures = {
      avr: avrService,
      esp32: esp32Service,
      stm32: stm32Service
    };
  }

  /**
   * Main compile function
   */
  async compile({ compilationId, code, board, options }) {
    const startTime = Date.now();
    let workDir;

    try {
      // Create work directory
      workDir = path.join(
        config.paths.temp,
        `compile-${compilationId}`
      );
      await fs.mkdir(workDir, { recursive: true });

      logger.info(`Compilation ${compilationId}: Starting for ${board.name}`);

      // Get architecture service
      const archService = this.architectures[board.architecture];
      if (!archService) {
        throw new Error(`Unsupported architecture: ${board.architecture}`);
      }

      // Validate board
      archService.validateBoard(board);

      // Preprocess .ino to .cpp
      const preprocessed = await preprocessor.preprocessIno(code, options);
      const cppFile = path.join(workDir, 'sketch.cpp');
      await fs.writeFile(cppFile, preprocessed.code);

      logger.info(`Compilation ${compilationId}: Preprocessing completed`);

      // Compile user code
      const userObjectFile = path.join(workDir, 'sketch.cpp.o');
      const includePaths = this.getIncludePaths(board);
      
      const { command: compileCmd, args: compileArgs } = archService.getCompilerCommand(
        cppFile,
        userObjectFile,
        board,
        includePaths
      );

      await archService.executeCommand(compileCmd, compileArgs, {
        timeout: config.compilation.timeout
      });

      logger.info(`Compilation ${compilationId}: User code compiled`);

      // Build or use cached core library
      const coreLibrary = await this.getCoreLibrary(board, archService, workDir);

      logger.info(`Compilation ${compilationId}: Core library ready`);

      // Link
      const elfFile = path.join(workDir, 'sketch.elf');
      const { command: linkCmd, args: linkArgs } = archService.getLinkerCommand(
        [userObjectFile],
        elfFile,
        board
      );

      // Add core library to linker args
      linkArgs.push(coreLibrary);

      await archService.executeCommand(linkCmd, linkArgs, {
        timeout: config.compilation.timeout
      });

      logger.info(`Compilation ${compilationId}: Linking completed`);

      // Generate firmware
      const firmwareData = await archService.generateFirmware(elfFile, workDir, board);

      logger.info(`Compilation ${compilationId}: Firmware generated`);

      // Store firmware
      const storagePath = await this.storeFirmware({
        compilationId,
        code,
        board,
        firmwareData,
        preprocessed,
        workDir
      });

      const buildTime = Date.now() - startTime;

      return {
        firmwarePath: storagePath,
        firmwareSize: firmwareData.size,
        memoryUsage: firmwareData.size,
        warnings: [], // TODO: Parse warnings
        buildTime,
        metadata: {
          compilationId,
          board: board.id,
          architecture: board.architecture,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error(`Compilation ${compilationId} failed:`, error);
      throw {
        message: error.message || 'Compilation failed',
        stage: 'compilation',
        details: error.stderr || error.stdout || null
      };
    } finally {
      // Cleanup work directory
      if (workDir && config.env !== 'development') {
        try {
          await fs.rm(workDir, { recursive: true, force: true });
        } catch (error) {
          logger.warn(`Failed to cleanup work directory: ${error.message}`);
        }
      }
    }
  }
  /**
   * Get include paths for board
   */
  getIncludePaths(board) {
    const paths = [];

    // Add core paths from board config
    if (board.compiler.includes && Array.isArray(board.compiler.includes)) {
      for (const includePath of board.compiler.includes) {
        // Path is already resolved from toolchains.config
        paths.push(includePath);
      }
    }

    // Add standard library path if it exists
    const librariesPath = config.paths.libraries;
    try {
      if (require('fs').existsSync(librariesPath)) {
        paths.push(librariesPath);
      }
    } catch (error) {
      // Ignore if libraries path doesn't exist
    }

    logger.info(`Include paths for ${board.name}: ${paths.join(', ')}`);

    return paths;
  }

  /**
   * Get or build core library (with caching)
   */
  async getCoreLibrary(board, archService, workDir) {
    const cacheKey = `${board.architecture}-${board.id}`;
    const cacheFile = path.join(config.paths.cache, 'cores', `${cacheKey}.a`);

    // Check cache
    try {
      await fs.access(cacheFile);
      logger.info(`Using cached core library for ${board.id}`);
      return cacheFile;
    } catch (error) {
      // Cache miss, build core
      logger.info(`Building core library for ${board.id}`);
      
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      
      const coreLibrary = await archService.buildCoreLibrary(board, workDir);
      
      // Copy to cache
      await fs.copyFile(coreLibrary, cacheFile);
      
      return cacheFile; // Fixed: was 'cacheLibrary' (typo)
    }
  }

  /**
   * Store firmware in executables directory
   */
  async storeFirmware({ compilationId, code, board, firmwareData, preprocessed, workDir }) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const codeHash = crypto.createHash('sha256').update(code).digest('hex').substring(0, 8);
    
    const storageDir = path.join(
      config.paths.firmware,
      `${timestamp}-${board.id}-${codeHash}`
    );

    await fs.mkdir(storageDir, { recursive: true });

    // Copy firmware files
    const firmwareFile = firmwareData.hex || firmwareData.bin;
    const firmwareExt = path.extname(firmwareFile);
    await fs.copyFile(firmwareFile, path.join(storageDir, `firmware${firmwareExt}`));

    if (firmwareData.elf) {
      await fs.copyFile(firmwareData.elf, path.join(storageDir, 'firmware.elf'));
    }

    // Store source code
    await fs.writeFile(path.join(storageDir, 'source.ino'), code);
    await fs.writeFile(path.join(storageDir, 'preprocessed.cpp'), preprocessed.code);

    // Store metadata
    const metadata = {
      compilationId,
      timestamp: new Date().toISOString(),
      board: {
        id: board.id,
        name: board.name,
        architecture: board.architecture
      },
      firmware: {
        format: firmwareExt.substring(1),
        size: firmwareData.size
      },
      source: {
        hash: codeHash,
        lines: code.split('\n').length
      }
    };

    await fs.writeFile(
      path.join(storageDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    logger.info(`Firmware stored at ${storageDir}`);

    return storageDir;
  }

  /**
   * Get available libraries for architecture
   */
  async getAvailableLibraries(architecture) {
    try {
      const librariesDir = config.paths.libraries;
      const entries = await fs.readdir(librariesDir, { withFileTypes: true });
      
      const libraries = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const libPath = path.join(librariesDir, entry.name);
          const propsFile = path.join(libPath, 'library.properties');

          try {
            const props = await fs.readFile(propsFile, 'utf-8');
            const name = props.match(/name=(.+)/)?.[1] || entry.name;
            const version = props.match(/version=(.+)/)?.[1] || '1.0.0';
            const architectures = props.match(/architectures=(.+)/)?.[1]?.split(',') || ['*'];

            if (architectures.includes('*') || architectures.includes(architecture)) {
              libraries.push({
                name,
                version,
                folder: entry.name,
                architectures
              });
            }
          } catch (error) {
            // No properties file, include anyway
            libraries.push({
              name: entry.name,
              version: 'unknown',
              folder: entry.name,
              architectures: ['*']
            });
          }
        }
      }

      return libraries;

    } catch (error) {
      logger.error('Failed to list libraries:', error);
      return [];
    }
  }
}

module.exports = new ToolchainService();