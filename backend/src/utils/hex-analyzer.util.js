const fs = require('fs').promises;

class HexAnalyzerUtil {
  /**
   * Parse Intel HEX file
   */
  async parseHexFile(hexFilePath) {
    const content = await fs.readFile(hexFilePath, 'utf-8');
    const lines = content.split('\n');
    const records = [];
    let totalBytes = 0;
    let minAddress = Infinity;
    let maxAddress = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(':')) {
        const record = this.parseHexRecord(trimmed);
        if (record) {
          records.push(record);
          
          if (record.type === 0) { // Data record
            totalBytes += record.byteCount;
            minAddress = Math.min(minAddress, record.address);
            maxAddress = Math.max(maxAddress, record.address + record.byteCount);
          }
        }
      }
    }

    return {
      records,
      totalBytes,
      addressRange: {
        min: minAddress,
        max: maxAddress,
        span: maxAddress - minAddress
      }
    };
  }

  /**
   * Parse single HEX record
   */
  parseHexRecord(line) {
    if (!line.startsWith(':')) {
      return null;
    }

    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);
    const data = line.substring(9, 9 + byteCount * 2);
    const checksum = parseInt(line.substring(9 + byteCount * 2, 11 + byteCount * 2), 16);

    return {
      byteCount,
      address,
      type: recordType,
      data,
      checksum
    };
  }

  /**
   * Analyze BIN file
   */
  async analyzeBinFile(binFilePath) {
    const stats = await fs.stat(binFilePath);
    const content = await fs.readFile(binFilePath);

    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      md5: this.calculateMD5(content),
      entropy: this.calculateEntropy(content)
    };
  }

  /**
   * Calculate MD5 hash
   */
  calculateMD5(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Calculate entropy (measure of randomness)
   */
  calculateEntropy(buffer) {
    const frequencies = new Array(256).fill(0);
    
    for (let i = 0; i < buffer.length; i++) {
      frequencies[buffer[i]]++;
    }

    let entropy = 0;
    for (const freq of frequencies) {
      if (freq > 0) {
        const p = freq / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }
}

module.exports = new HexAnalyzerUtil();