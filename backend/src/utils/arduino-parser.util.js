class ArduinoParserUtil {
  /**
   * Parse Arduino library.properties file
   */
  parseLibraryProperties(content) {
    const properties = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          properties[key.trim()] = valueParts.join('=').trim();
        }
      }
    }

    return properties;
  }

  /**
   * Parse Arduino board definition
   */
  parseBoardDefinition(content) {
    const boards = {};
    const lines = content.split('\n');
    let currentBoard = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^.]+)\.(.+)=(.+)$/);
        if (match) {
          const [, boardId, property, value] = match;
          
          if (!boards[boardId]) {
            boards[boardId] = {};
          }

          boards[boardId][property] = value;
        }
      }
    }

    return boards;
  }

  /**
   * Extract function signatures from code
   */
  extractFunctions(code) {
    const functions = [];
    const functionRegex = /^\s*([a-zA-Z_][\w\s\*&<>,]*?)\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*\{/gm;
    
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({
        returnType: match[1].trim(),
        name: match[2],
        parameters: match[3].trim(),
        line: code.substring(0, match.index).split('\n').length
      });
    }

    return functions;
  }

  /**
   * Extract includes from code
   */
  extractIncludes(code) {
    const includes = [];
    const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
    
    let match;
    while ((match = includeRegex.exec(code)) !== null) {
      includes.push({
        library: match[1],
        isSystemInclude: code[match.index + 8] === '<',
        line: code.substring(0, match.index).split('\n').length
      });
    }

    return includes;
  }

  /**
   * Check if code has setup() and loop()
   */
  validateArduinoStructure(code) {
    const hasSetup = /void\s+setup\s*\(\s*\)/m.test(code);
    const hasLoop = /void\s+loop\s*\(\s*\)/m.test(code);

    return {
      hasSetup,
      hasLoop,
      isValid: hasSetup && hasLoop,
      warnings: [
        !hasSetup && 'Missing setup() function',
        !hasLoop && 'Missing loop() function'
      ].filter(Boolean)
    };
  }
}

module.exports = new ArduinoParserUtil();