const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

class CompilerService {
  async compile(code, language = 'c') {
    const langConfig = config.supportedLanguages[language];
    const uniqueId = uuidv4();
    const sourceFile = path.join(config.tempDir, `${uniqueId}${langConfig.extension}`);
    const executableName = `program_${uniqueId}${langConfig.executable}`;
    const executablePath = path.join(config.executablesDir, executableName);
    
    try {
      // Write source code to file
      await fs.writeFile(sourceFile, code, 'utf8');
      
      // Compile the code
      const compileCommand = this.buildCompileCommand(
        langConfig,
        sourceFile,
        executablePath
      );
      
      console.log('Compile command:', compileCommand);
      const compileResult = await this.executeCommand(compileCommand, config.executionTimeout);
      
      if (compileResult.error) {
        // Clean up on compilation error
        await this.cleanupFile(sourceFile);
        throw new Error(compileResult.stderr || 'Compilation failed');
      }
      
      // Execute the compiled program
      console.log('Executing:', executablePath);
      const runResult = await this.executeCommand(executablePath, config.executionTimeout);
      
      // Clean up source file
      await this.cleanupFile(sourceFile);
      
      // Return both stdout and stderr
      return {
        success: true,
        output: runResult.stdout || runResult.stderr || '',
        error: runResult.error ? runResult.stderr : '',
        executableName,
        compilationTime: compileResult.executionTime,
        executionTime: runResult.executionTime
      };
      
    } catch (error) {
      // Clean up on error
      await this.cleanupFile(sourceFile);
      await this.cleanupFile(executablePath);
      
      throw error;
    }
  }
  
  buildCompileCommand(langConfig, sourceFile, outputFile) {
    const flags = langConfig.compileFlags.join(' ');
    return `${langConfig.compiler} ${flags} "${sourceFile}" -o "${outputFile}"`;
  }
  
  async executeCommand(command, timeout) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      console.log(`Executing command: ${command}`);
      
      const childProcess = exec(command, {
        timeout,
        maxBuffer: config.maxOutputSize,
        killSignal: 'SIGTERM',
        windowsHide: false, // Show console window on Windows
        encoding: 'utf8'
      }, (error, stdout, stderr) => {
        const executionTime = Date.now() - startTime;
        
        console.log('--- Execution Result ---');
        console.log('Error:', error);
        console.log('Stdout:', stdout);
        console.log('Stderr:', stderr);
        console.log('Time:', executionTime + 'ms');
        console.log('----------------------');
        
        if (error) {
          if (error.killed || error.signal === 'SIGTERM') {
            resolve({
              error: true,
              stdout: stdout.trim(),
              stderr: `Execution timeout (${timeout}ms exceeded)`,
              executionTime
            });
          } else {
            resolve({
              error: true,
              stdout: stdout.trim(),
              stderr: stderr.trim() || error.message,
              executionTime
            });
          }
        } else {
          resolve({
            error: false,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            executionTime
          });
        }
      });
      
      // Handle process errors
      childProcess.on('error', (err) => {
        console.error('Process error:', err);
        resolve({
          error: true,
          stdout: '',
          stderr: err.message,
          executionTime: Date.now() - startTime
        });
      });
    });
  }
  
  async runExecutable(executableName) {
    const executablePath = path.join(config.executablesDir, executableName);
    
    try {
      // Check if executable exists
      await fs.access(executablePath);
      
      console.log('Running existing executable:', executablePath);
      
      // Run the executable
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
      
      // Sort by creation date (newest first)
      executables.sort((a, b) => b.created - a.created);
      
      return executables;
      
    } catch (error) {
      throw new Error('Failed to list executables');
    }
  }
  
  async deleteExecutable(executableName) {
    const executablePath = path.join(config.executablesDir, executableName);
    
    try {
      await fs.unlink(executablePath);
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete executable: ${executableName}`);
    }
  }
  
  async getExecutablePath(executableName) {
    const executablePath = path.join(config.executablesDir, executableName);
    
    try {
      await fs.access(executablePath);
      return executablePath;
    } catch (error) {
      throw new Error(`Executable not found: ${executableName}`);
    }
  }
  
  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore cleanup errors
      console.error(`Failed to cleanup file: ${filePath}`);
    }
  }
  
  async cleanupOldFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(config.executablesDir);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(config.executablesDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.birthtimeMs;
        
        if (age > maxAgeMs) {
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