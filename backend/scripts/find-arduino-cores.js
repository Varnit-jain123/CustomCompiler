const fs = require('fs');
const path = require('path');
const os = require('os');

function findArduinoCores() {
  const homeDir = os.homedir();
  let arduinoPath;
  
  if (process.platform === 'win32') {
    arduinoPath = path.join(homeDir, 'AppData', 'Local', 'Arduino15', 'packages');
  } else if (process.platform === 'darwin') {
    arduinoPath = path.join(homeDir, 'Library', 'Arduino15', 'packages');
  } else {
    arduinoPath = path.join(homeDir, '.arduino15', 'packages');
  }

  console.log('Looking for Arduino cores at:', arduinoPath);
  console.log('='.repeat(60));

  if (!fs.existsSync(arduinoPath)) {
    console.log('❌ Arduino15 directory not found!');
    console.log('Please install Arduino IDE and install at least one board package.');
    return;
  }

  // Check for AVR cores
  const avrCorePath = path.join(arduinoPath, 'arduino', 'hardware', 'avr');
  if (fs.existsSync(avrCorePath)) {
    const versions = fs.readdirSync(avrCorePath);
    console.log('✓ AVR Core found:');
    versions.forEach(v => {
      const corePath = path.join(avrCorePath, v, 'cores', 'arduino');
      if (fs.existsSync(corePath)) {
        console.log(`  Version: ${v}`);
        console.log(`  Path: ${corePath}`);
        
        // Check for Arduino.h
        const arduinoH = path.join(corePath, 'Arduino.h');
        if (fs.existsSync(arduinoH)) {
          console.log(`  ✓ Arduino.h found`);
        }
      }
    });
  } else {
    console.log('❌ AVR Core not found');
    console.log('Please install Arduino AVR Boards from Arduino IDE Board Manager');
  }

  console.log();

  // Check for toolchain
  const toolchainPath = path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc');
  if (fs.existsSync(toolchainPath)) {
    const versions = fs.readdirSync(toolchainPath);
    console.log('✓ AVR Toolchain found:');
    versions.forEach(v => {
      console.log(`  Version: ${v}`);
      const gccPath = path.join(toolchainPath, v, 'bin', 'avr-gcc.exe');
      if (fs.existsSync(gccPath)) {
        console.log(`  ✓ avr-gcc.exe found at: ${gccPath}`);
      }
    });
  } else {
    console.log('❌ AVR Toolchain not found');
  }

  console.log();
  console.log('='.repeat(60));
}

findArduinoCores();