const { spawn } = require('child_process');
const logger = require('../../../utils/logger.util');

class BaseArchitecture {
  constructor(name) {
    this.name = name;
  }

  /**
   * Validate board configuration
   * Must be implemented by child classes
   */
  validateBoard(boardConfig) {
    throw new Error('validateBoard() must be implemented');
  }

  /**
   * Get compiler command
   * Must be implemented by child classes
   */
  getCompilerCommand(sourceFile, outputFile, boardConfig) {
    throw new Error('getCompilerCommand() must be implemented');
  }

  /**
   * Get linker command
   * Must be implemented by child classes
   */
  getLinkerCommand(objectFiles, outputElf, boardConfig) {
    throw new Error('getLinkerCommand() must be implemented');
  }

  /**
   * Generate firmware file (.hex, .bin)
   * Must be implemented by child classes
   */
  async generateFirmware(elfFile, boardConfig) {
    throw new Error('generateFirmware() must be implemented');
  }

  /**
   * Get upload command
   * Must be implemented by child classes
   */
  getUploadCommand(firmwareFile, port, boardConfig) {
    throw new Error('getUploadCommand() must be implemented');
  }

  /**
   * Parse compiler output
   * Can be overridden by child classes
   */
  parseCompilerOutput(stdout, stderr) {
    const warnings = [];
    const errors = [];
    const lines = (stdout + '\n' + stderr).split('\n');

    for (const line of lines) {
      if (line.includes('warning:')) {
        warnings.push(this.parseCompilerMessage(line, 'warning'));
      } else if (line.includes('error:')) {
        errors.push(this.parseCompilerMessage(line, 'error'));
      }
    }

    return { warnings, errors };
  }

  /**
   * Parse individual compiler message
   */
  parseCompilerMessage(line, type) {
    const pattern = /^(.+?):(\d+):(\d+):\s*(warning|error):\s*(.+)$/;
    const match = line.match(pattern);

    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        type: match[4],
        message: match[5]
      };
    }

    return {
      type,
      message: line,
      raw: true
    };
  }

  /**
   * Parse upload output
   * Can be overridden by child classes
   */
  parseUploadOutput(stdout, stderr) {
    return {
      output: stdout + stderr,
      success: !stderr.toLowerCase().includes('error')
    };
  }

  /**
   * Execute command and stream output
   */
  async executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      logger.info(`Executing: ${command} ${args.join(' ')}`);

      // Rename local variable to avoid shadowing global `process`
      const childProcess = spawn(command, args, {
        cwd: options.cwd,
        env: options.env || process.env
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        if (options.onStdout) options.onStdout(output);
      });

      childProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        if (options.onStderr) options.onStderr(output);
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject({
            code,
            stdout,
            stderr,
            error: `Process exited with code ${code}`
          });
        }
      });

      childProcess.on('error', (error) => {
        reject({
          error: error.message,
          stdout,
          stderr
        });
      });

      if (options.timeout) {
        setTimeout(() => {
          childProcess.kill('SIGTERM');
          reject({
            error: 'Process timeout',
            timeout: true,
            stdout,
            stderr
          });
        }, options.timeout);
      }
    });
  }

  /**
   * Replace placeholders in command arguments
   */
  replacePlaceholders(args, replacements) {
    return args.map(arg => {
      let replaced = arg;
      for (const [key, value] of Object.entries(replacements)) {
        replaced = replaced.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      return replaced;
    });
  }
}

module.exports = BaseArchitecture;
