class ErrorMapper {
  /**
   * Map compiler error to user-friendly message
   */
  mapCompilerError(error, sourceMap = null) {
    if (!error) {
      return null;
    }

    const mapped = {
      file: error.file,
      line: error.line,
      column: error.column,
      type: error.type,
      message: error.message,
      suggestion: this.getSuggestion(error.message)
    };

    // Map line number back to original source
    if (sourceMap && error.line) {
      const originalLine = sourceMap[error.line - 1];
      if (originalLine >= 0) {
        mapped.originalLine = originalLine + 1;
      }
    }

    return mapped;
  }

  /**
   * Get suggestion for common errors
   */
  getSuggestion(message) {
    const suggestions = {
      'expected ;': 'Add a semicolon at the end of the statement',
      'undeclared identifier': 'Make sure the variable or function is declared before use',
      'expected }': 'Check for matching curly braces',
      'expected )': 'Check for matching parentheses',
      'expected ]': 'Check for matching square brackets',
      'was not declared in this scope': 'Verify the variable/function name spelling and declaration',
      'does not name a type': 'Include the required header file or check type spelling',
      'invalid conversion': 'Check data type compatibility',
      'cannot convert': 'Verify the data types match or add explicit type casting',
      'no matching function': 'Check function parameters and their types'
    };

    for (const [pattern, suggestion] of Object.entries(suggestions)) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        return suggestion;
      }
    }

    return null;
  }

  /**
   * Map upload error
   */
  mapUploadError(error) {
    const errorMap = {
      'not in sync': 'Board not responding. Try pressing the reset button and uploading again.',
      'programmer is not responding': 'Cannot communicate with board. Check USB connection and drivers.',
      'timeout': 'Upload timeout. Check board connection and try again.',
      'permission denied': 'Permission denied. On Linux, add your user to the dialout group.',
      'device not found': 'Board not found. Check USB connection.',
      'verification error': 'Upload verification failed. Try uploading again.',
      'wrong chip': 'Board type mismatch. Verify the selected board matches your hardware.'
    };

    const lowerError = error.toLowerCase();
    
    for (const [pattern, message] of Object.entries(errorMap)) {
      if (lowerError.includes(pattern)) {
        return message;
      }
    }

    return error;
  }
}

module.exports = new ErrorMapper();