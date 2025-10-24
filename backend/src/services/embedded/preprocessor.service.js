const fs = require('fs').promises;
const path = require('path');
const logger = require('../../utils/logger.util');

class PreprocessorService {
  /**
   * Convert Arduino .ino file to valid C++ (.cpp)
   */
  async preprocessIno(inoContent, options = {}) {
    try {
      logger.info('Starting .ino preprocessing');

      // Extract includes
      const includes = this.extractIncludes(inoContent);
      
      // Extract function prototypes
      const functions = this.extractFunctions(inoContent);
      
      // Generate forward declarations
      const forwardDeclarations = this.generateForwardDeclarations(functions);
      
      // Check for required functions
      this.validateArduinoStructure(inoContent);
      
      // Build final C++ code
      const cppCode = this.buildCppCode({
        includes,
        forwardDeclarations,
        originalCode: inoContent
      });

      // Generate source map for error translation
      const sourceMap = this.generateSourceMap(inoContent, cppCode);

      logger.info('Preprocessing completed successfully');

      return {
        code: cppCode,
        sourceMap,
        metadata: {
          includeCount: includes.length,
          functionCount: functions.length,
          hasSetup: functions.some(f => f.name === 'setup'),
          hasLoop: functions.some(f => f.name === 'loop')
        }
      };

    } catch (error) {
      logger.error('Preprocessing failed:', error);
      throw new Error(`Preprocessing error: ${error.message}`);
    }
  }

  /**
   * Extract #include directives
   */
  extractIncludes(code) {
    const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
    const includes = [];
    let match;

    while ((match = includeRegex.exec(code)) !== null) {
      includes.push(match[0]);
    }

    return includes;
  }

  /**
   * Extract function definitions
   */
  extractFunctions(code) {
    // Remove comments first
    const codeWithoutComments = this.removeComments(code);
    
    // Function pattern: return_type function_name(parameters) {
    const functionRegex = /^([a-zA-Z_][\w\s\*&<>,]*?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/gm;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(codeWithoutComments)) !== null) {
      const returnType = match[1].trim();
      const functionName = match[2];
      const parameters = match[3].trim();

      // Skip setup() and loop() - they don't need prototypes
      if (functionName !== 'setup' && functionName !== 'loop') {
        functions.push({
          returnType,
          name: functionName,
          parameters
        });
      }
    }

    return functions;
  }

  /**
   * Generate forward declarations
   */
  generateForwardDeclarations(functions) {
    return functions.map(func => {
      return `${func.returnType} ${func.name}(${func.parameters});`;
    }).join('\n');
  }

  /**
   * Validate Arduino structure
   */
  validateArduinoStructure(code) {
    const hasSetup = /void\s+setup\s*\(/.test(code);
    const hasLoop = /void\s+loop\s*\(/.test(code);

    if (!hasSetup) {
      logger.warn('No setup() function found');
    }

    if (!hasLoop) {
      logger.warn('No loop() function found');
    }

    return { hasSetup, hasLoop };
  }

  /**
   * Build final C++ code
   */
  buildCppCode({ includes, forwardDeclarations, originalCode }) {
    const parts = [];

    // Add Arduino.h if not already included
    if (!includes.some(inc => inc.includes('Arduino.h'))) {
      parts.push('#include <Arduino.h>');
    }

    // Add user includes
    parts.push(includes.join('\n'));

    // Add blank line
    if (includes.length > 0) {
      parts.push('');
    }

    // Add forward declarations
    if (forwardDeclarations) {
      parts.push(forwardDeclarations);
      parts.push('');
    }

    // Add original code
    parts.push(originalCode);

    return parts.join('\n');
  }

  /**
   * Generate source map for error translation
   */
  generateSourceMap(originalCode, generatedCode) {
    const originalLines = originalCode.split('\n');
    const generatedLines = generatedCode.split('\n');
    
    const map = [];
    let originalLineIndex = 0;
    let generatedLineIndex = 0;

    // Track where original code starts in generated code
    for (let i = 0; i < generatedLines.length; i++) {
      const line = generatedLines[i];
      
      // Check if this line exists in original code
      if (originalLineIndex < originalLines.length) {
        if (line.trim() === originalLines[originalLineIndex].trim()) {
          map[i] = originalLineIndex;
          originalLineIndex++;
        } else {
          // Generated line (include or forward declaration)
          map[i] = -1;
        }
      }
    }

    return map;
  }

  /**
   * Remove comments from code
   */
  removeComments(code) {
    // Remove single-line comments
    code = code.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    
    return code;
  }

  /**
   * Map compiled error line number back to original .ino line
   */
  mapErrorLine(compiledLine, sourceMap) {
    if (sourceMap[compiledLine] !== undefined && sourceMap[compiledLine] >= 0) {
      return sourceMap[compiledLine] + 1; // +1 for 1-based line numbers
    }
    return null;
  }
}

module.exports = new PreprocessorService();