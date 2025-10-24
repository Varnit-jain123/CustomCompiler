const path = require('path');
const os = require('os');
const config = require('./config');

// Detect Arduino installation path
const getArduinoPath = () => {
  const homeDir = os.homedir();
  
  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Local', 'Arduino15', 'packages');
  } else if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Arduino15', 'packages');
  } else {
    return path.join(homeDir, '.arduino15', 'packages');
  }
};

const arduinoPath = getArduinoPath();

module.exports = {
  // AVR Toolchain
  avr: {
    name: 'AVR Toolchain',
    basePath: path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7'),
    compiler: {
      gcc: path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7', 'bin', 'avr-gcc.exe'),
      gpp: path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7', 'bin', 'avr-g++.exe'),
      ar: path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7', 'bin', 'avr-ar.exe'),
      objcopy: path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7', 'bin', 'avr-objcopy.exe'),
      size: path.join(arduinoPath, 'arduino', 'tools', 'avr-gcc', '7.3.0-atmel3.6.1-arduino7', 'bin', 'avr-size.exe')
    },
    uploader: {
      avrdude: path.join(arduinoPath, 'arduino', 'tools', 'avrdude', '6.3.0-arduino17', 'bin', 'avrdude.exe'),
      configFile: path.join(arduinoPath, 'arduino', 'tools', 'avrdude', '6.3.0-arduino17', 'etc', 'avrdude.conf')
    },
    version: '7.3.0',
    arduinoCore: path.join(arduinoPath, 'arduino', 'hardware', 'avr', '1.8.6')
  },

  // ESP32 Toolchain
  esp32: {
    name: 'ESP32 Toolchain',
    basePath: path.join(arduinoPath, 'esp32', 'tools'),
    compiler: {
      gcc: 'xtensa-esp32-elf-gcc', // Will be found in PATH or specify full path
      gpp: 'xtensa-esp32-elf-g++',
      ar: 'xtensa-esp32-elf-ar',
      objcopy: 'xtensa-esp32-elf-objcopy',
      size: 'xtensa-esp32-elf-size'
    },
    uploader: {
      esptool: 'esptool.py', // Installed via pip, should be in PATH
      espota: 'espota.py'
    },
    version: '8.4.0',
    arduinoCore: path.join(arduinoPath, 'esp32', 'hardware', 'esp32', '2.0.14'),
    sdk: {
      path: path.join(arduinoPath, 'esp32', 'hardware', 'esp32', '2.0.14', 'tools', 'sdk'),
      version: '4.4'
    },
    bootloader: path.join(arduinoPath, 'esp32', 'hardware', 'esp32', '2.0.14', 'tools', 'sdk', 'esp32', 'bin', 'bootloader_dio_80m.bin'),
    partitions: path.join(arduinoPath, 'esp32', 'hardware', 'esp32', '2.0.14', 'tools', 'partitions', 'default.bin'),
    bootApp: path.join(arduinoPath, 'esp32', 'hardware', 'esp32', '2.0.14', 'tools', 'partitions', 'boot_app0.bin')
  },

  // STM32 Toolchain
  stm32: {
    name: 'STM32 Toolchain',
    basePath: 'C:\\Program Files (x86)\\GNU Arm Embedded Toolchain\\10 2021.10',
    compiler: {
      gcc: 'arm-none-eabi-gcc',
      gpp: 'arm-none-eabi-g++',
      ar: 'arm-none-eabi-ar',
      objcopy: 'arm-none-eabi-objcopy',
      size: 'arm-none-eabi-size'
    },
    uploader: {
      stm32flash: 'stm32flash',
      stlink: 'st-flash',
      openocd: 'openocd'
    },
    version: '10.3.1',
    arduinoCore: path.join(arduinoPath, 'STMicroelectronics', 'hardware', 'stm32', '2.6.0'),
    cmsis: path.join(arduinoPath, 'STMicroelectronics', 'hardware', 'stm32', '2.6.0', 'system', 'Drivers', 'CMSIS')
  },

  // Validation function
  validateToolchains: async function() {
    const { spawn } = require('child_process');
    const results = {};

    const testCommand = (command) => {
      return new Promise((resolve) => {
        const process = spawn(command, ['--version'], { shell: true });
        
        let found = false;
        process.on('error', () => {
          resolve(false);
        });
        
        process.stdout.on('data', () => {
          found = true;
        });
        
        process.on('close', () => {
          resolve(found);
        });

        setTimeout(() => {
          process.kill();
          resolve(false);
        }, 3000);
      });
    };

    // Test AVR
    const avrGccExists = await testCommand(this.avr.compiler.gcc);
    const avrdudeExists = await testCommand(this.avr.uploader.avrdude);
    results.avr = {
      installed: avrGccExists && avrdudeExists,
      gcc: avrGccExists,
      avrdude: avrdudeExists
    };

    // Test ESP32
    const esptoolExists = await testCommand('esptool.py');
    results.esp32 = {
      installed: esptoolExists,
      esptool: esptoolExists
    };

    // Test STM32
    const armGccExists = await testCommand('arm-none-eabi-gcc');
    results.stm32 = {
      installed: armGccExists,
      gcc: armGccExists
    };

    return results;
  },

  // Get toolchain configuration by architecture
  getToolchain: function(architecture) {
    return this[architecture];
  }
};