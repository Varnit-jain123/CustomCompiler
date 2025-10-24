const path = require('path');
const config = require('./config');

module.exports = {
  // AVR Toolchain
  avr: {
    name: 'AVR Toolchain',
    basePath: path.join(config.paths.toolchains, 'avr'),
    compiler: {
      gcc: 'avr-gcc',
      gpp: 'avr-g++',
      ar: 'avr-ar',
      objcopy: 'avr-objcopy',
      size: 'avr-size'
    },
    uploader: {
      avrdude: 'avrdude',
      configFile: path.join(config.paths.toolchains, 'avr/etc/avrdude.conf')
    },
    version: '7.3.0',
    arduinoCore: path.join(config.paths.arduinoCores, 'arduino')
  },

  // ESP32 Toolchain
  esp32: {
    name: 'ESP32 Toolchain',
    basePath: path.join(config.paths.toolchains, 'esp32'),
    compiler: {
      gcc: 'xtensa-esp32-elf-gcc',
      gpp: 'xtensa-esp32-elf-g++',
      ar: 'xtensa-esp32-elf-ar',
      objcopy: 'xtensa-esp32-elf-objcopy',
      size: 'xtensa-esp32-elf-size'
    },
    uploader: {
      esptool: 'esptool.py',
      espota: 'espota.py'
    },
    version: '8.4.0',
    arduinoCore: path.join(config.paths.arduinoCores, 'esp32'),
    sdk: {
      path: path.join(config.paths.toolchains, 'esp32/esp-idf'),
      version: '4.4'
    },
    bootloader: path.join(config.paths.toolchains, 'esp32/tools/sdk/bin/bootloader_dio_80m.bin'),
    partitions: path.join(config.paths.toolchains, 'esp32/tools/partitions/default.bin'),
    bootApp: path.join(config.paths.toolchains, 'esp32/tools/partitions/boot_app0.bin')
  },

  // STM32 Toolchain
  stm32: {
    name: 'STM32 Toolchain',
    basePath: path.join(config.paths.toolchains, 'stm32'),
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
    arduinoCore: path.join(config.paths.arduinoCores, 'stm32'),
    cmsis: path.join(config.paths.toolchains, 'stm32/CMSIS')
  },

  // Get toolchain configuration by architecture
  getToolchain: function(architecture) {
    return this[architecture];
  },

  // Validate all toolchains are installed
  validateToolchains: function() {
    const { execSync } = require('child_process');
    const results = {};

    for (const [arch, toolchain] of Object.entries(this)) {
      if (typeof toolchain === 'object' && toolchain.compiler) {
        try {
          execSync(`${toolchain.compiler.gcc} --version`, { stdio: 'ignore' });
          results[arch] = { installed: true, version: toolchain.version };
        } catch (error) {
          results[arch] = { installed: false, error: 'Compiler not found' };
        }
      }
    }

    return results;
  }
};