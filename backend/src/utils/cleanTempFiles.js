const fs = require('fs');
const path = require('path');

function cleanTempFiles(tempDir) {
  if (!fs.existsSync(tempDir)) return;

  const files = fs.readdirSync(tempDir);
  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete ${filePath}:`, err);
    }
  });
  console.log(`Cleaned temp files in ${tempDir}`);
}

module.exports = cleanTempFiles;
