const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const he = require('he'); // Decode HTML entities
const config = require('../config/config');
const ArduinoCLIService = require('./arduino-cli.service');

class CompilerService {
  /**
   * Main compile function
   * Supports C/C++ and Arduino sketches
   */
  async compile(code, language = 'c', board = null) {
    if (language.toLowerCase() === 'arduino') {
      if (!board) throw new Error('Board information required for Arduino compilation');

      const compilationId = uuidv4();
      const decodedCode = he.decode(code);

      return await ArduinoCLIService.compile({
        compilationId,
        code: decodedCode,
        board
      });
    }

    // Fallback for C/C++ compilation
    const langConfig = config.supportedLanguages[language];
    if (!langConfig) throw new Error(`Unsupported language: ${language}`);

    const uniqueId = uuidv4();
    const sourceFile = path.join(config.tempDir, `${uniqueId}${langConfig.extension}`);
    const executableName = `program_${uniqueId}${langConfig.executable}`;
    const executablePath = path.join(config.executablesDir, executableName);

    try {
      const decodedCode = he.decode(code);
      await fs.writeFile(sourceFile, decodedCode, 'utf8');

      // Compile
      const compileCommand = this.buildCompileCommand(langConfig, sourceFile, executablePath);
      console.log('Compile command:', compileCommand);
      const compileResult = await this.executeCommand(compileCommand, config.executionTimeout);

      if (compileResult.error) {
        await this.cleanupFile(sourceFile);
        throw new Error(compileResult.stderr || 'Compilation failed');
      }

      // Run executable
      const runResult = await this.executeCommand(executablePath, config.executionTimeout);

      await this.cleanupFile(sourceFile);

      return {
        success: true,
        output: runResult.stdout || runResult.stderr || '',
        error: runResult.error ? runResult.stderr : '',
        executableName,
        compilationTime: compileResult.executionTime,
        executionTime: runResult.executionTime
      };

    } catch (error) {
      await this.cleanupFile(sourceFile);
      await this.cleanupFile(executablePath);
      throw error;
    }
  }

  /**
   * Build compile command for C/C++
   */
  buildCompileCommand(langConfig, sourceFile, outputFile) {
    const flags = langConfig.compileFlags.join(' ');
    return `${langConfig.compiler} ${flags} "${sourceFile}" -o "${outputFile}"`;
  }

  /**
   * Execute any shell command
   */
  async executeCommand(command, timeout) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const childProcess = exec(command, {
        timeout,
        maxBuffer: config.maxOutputSize,
        killSignal: 'SIGTERM',
        windowsHide: false,
        encoding: 'utf8'
      }, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;

        if (error) {
          const isTimeout = error.killed || error.signal === 'SIGTERM';
          resolve({
            error: true,
            stdout: stdout.trim(),
            stderr: isTimeout ? `Execution timeout (${timeout}ms exceeded)` : stderr.trim() || error.message,
            executionTime
          });
        } else {
          resolve({
            error: false,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            executionTime
          });
        }
      });

      childProcess.on('error', err => {
        err.stdout = '';
        err.stderr = err.message;
        resolve({
          error: true,
          stdout: '',
          stderr: err.message,
          executionTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * Run existing executable by name
   */
  async runExecutable(executableName) {
    const executablePath = path.join(config.executablesDir, executableName);
    try {
      await fs.access(executablePath);
      const result = await this.executeCommand(executablePath, config.executionTimeout);
      return {
        success: !result.error,
        output: result.stdout || result.stderr || '',
        error: result.error ? result.stderr : '',
        executionTime: result.executionTime
      };
    } catch (error) {
      throw new Error(`Executable not found or cannot be executed: ${executableName}`);
    }
  }

  /**
   * List all compiled executables
   */
  async listExecutables() {
    try {
      const files = await fs.readdir(config.executablesDir);
      const executables = [];

      for (const file of files) {
        const filePath = path.join(config.executablesDir, file);
        const stats = await fs.stat(filePath);
        executables.push({
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }

      executables.sort((a, b) => b.created - a.created);
      return executables;
    } catch (error) {
      throw new Error('Failed to list executables');
    }
  }

  /**
   * Delete executable by name
   */
  async deleteExecutable(executableName) {
    const executablePath = path.join(config.executablesDir, executableName);
    try {
      await fs.unlink(executablePath);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete executable: ${executableName}`);
    }
  }

  /**
   * Get path to executable
   */
  async getExecutablePath(executableName) {
    const executablePath = path.join(config.executablesDir, executableName);
    try {
      await fs.access(executablePath);
      return executablePath;
    } catch (error) {
      throw new Error(`Executable not found: ${executableName}`);
    }
  }

  /**
   * Delete a file
   */
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to cleanup file: ${filePath}`);
    }
  }

  /**
   * Clean old files older than maxAgeMs
   */
  async cleanupOldFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(config.executablesDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(config.executablesDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.birthtimeMs > maxAgeMs) {
          await this.cleanupFile(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

module.exports = new CompilerService();
