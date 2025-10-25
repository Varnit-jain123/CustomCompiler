const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Return platform-safe executable name (adds .exe on Windows)
 */
const exe = (name) => {
  if (process.platform === 'win32') return `${name}.exe`;
  return name;
};

// Get Arduino path (points to the packages directory inside Arduino15)
const getArduinoPath = () => {
  const homeDir = os.homedir();

  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Local', 'Arduino15');
  } else if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Arduino15');
  } else {
    return path.join(homeDir, '.arduino15');
  }
};

// Find latest version in a directory (numeric-aware)
const findLatestVersion = (basePath) => {
  try {
    if (!fs.existsSync(basePath)) return null;
    const entries = fs.readdirSync(basePath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    return entries[0];
  } catch (error) {
    return null;
  }
};

const arduinoBase = getArduinoPath(); // e.g. C:\Users\<user>\AppData\Local\Arduino15
const packagesPath = path.join(arduinoBase, 'packages');

const avrBasePath = path.join(packagesPath, 'arduino', 'hardware', 'avr');
const avrVersion = findLatestVersion(avrBasePath) || '1.8.6';

const avrToolchainBasePath = path.join(packagesPath, 'arduino', 'tools', 'avr-gcc');
const avrToolchainVersion = findLatestVersion(avrToolchainBasePath) || '7.3.0-atmel3.6.1-arduino7';

const avrdudeBasePath = path.join(packagesPath, 'arduino', 'tools', 'avrdude');
const avrdudeVersion = findLatestVersion(avrdudeBasePath) || '6.3.0-arduino17';

console.log('Toolchain paths detected:');
console.log('  Arduino Base:', arduinoBase);
console.log('  AVR Core version:', avrVersion);
console.log('  AVR GCC version:', avrToolchainVersion);
console.log('  AVRDUDE version:', avrdudeVersion);

module.exports = {
  // AVR Toolchain
  avr: {
    name: 'AVR Toolchain',
    basePath: path.join(packagesPath, 'arduino', 'tools', 'avr-gcc', avrToolchainVersion),
    compiler: {
      gcc: path.join(packagesPath, 'arduino', 'tools', 'avr-gcc', avrToolchainVersion, 'bin', exe('avr-gcc')),
      gpp: path.join(packagesPath, 'arduino', 'tools', 'avr-gcc', avrToolchainVersion, 'bin', exe('avr-g++')),
      ar: path.join(packagesPath, 'arduino', 'tools', 'avr-gcc', avrToolchainVersion, 'bin', exe('avr-ar')),
      objcopy: path.join(packagesPath, 'arduino', 'tools', 'avr-gcc', avrToolchainVersion, 'bin', exe('avr-objcopy')),
      size: path.join(packagesPath, 'arduino', 'tools', 'avr-gcc', avrToolchainVersion, 'bin', exe('avr-size'))
    },
    uploader: {
      avrdude: path.join(packagesPath, 'arduino', 'tools', 'avrdude', avrdudeVersion, 'bin', exe('avrdude')),
      configFile: path.join(packagesPath, 'arduino', 'tools', 'avrdude', avrdudeVersion, 'etc', 'avrdude.conf')
    },
    version: avrToolchainVersion,
    arduinoCore: path.join(packagesPath, 'arduino', 'hardware', 'avr', avrVersion),
    coreIncludes: [
      path.join(packagesPath, 'arduino', 'hardware', 'avr', avrVersion, 'cores', 'arduino'),
      path.join(packagesPath, 'arduino', 'hardware', 'avr', avrVersion, 'variants', 'standard')
    ]
  },

  // ESP32 Toolchain (optional - null if not installed)
  esp32: null,

  // STM32 Toolchain (optional - null if not installed)
  stm32: null,

  /**
   * Validate toolchains and return results
   * - works with absolute executable paths (like avr-gcc.exe)
   * - and also works when testing commands available on PATH (like esptool.py or arm-none-eabi-gcc)
   */
  validateToolchains: async function () {
    const { spawn } = require('child_process');
    const results = {};

    const testCommand = (cmdOrPath, args = ['--version'], timeoutMs = 5000) => {
      return new Promise((resolve) => {
        let resolved = false;
        const done = (val) => {
          if (!resolved) {
            resolved = true;
            resolve(val);
          }
        };

        try {
          // If an absolute path or path contains separators, check existence first
          const looksLikePath = path.isAbsolute(cmdOrPath) || cmdOrPath.includes(path.sep) || cmdOrPath.includes('/');
          if (looksLikePath && !fs.existsSync(cmdOrPath)) {
            console.log(`  File not found: ${cmdOrPath}`);
            done(false);
            return;
          }

          // Use shell on Windows to allow launching scripts on PATH; shell:true helps with commands like "esptool.py"
          const proc = spawn(cmdOrPath, args, {
            shell: true,
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
          });

          let sawOutput = false;

          proc.on('error', (err) => {
            // command not found or spawn failed
            //console.log(`  Error testing ${cmdOrPath}: ${err.message}`);
            done(false);
          });

          proc.stdout.on('data', () => { sawOutput = true; });
          proc.stderr.on('data', () => { sawOutput = true; });

          proc.on('close', (code) => {
            done(sawOutput || code === 0);
          });

          // safety timeout
          const to = setTimeout(() => {
            try { proc.kill(); } catch (e) {}
            done(false);
          }, timeoutMs);

          // clear timeout when resolved
          const checkResolve = setInterval(() => {
            if (resolved) {
              clearTimeout(to);
              clearInterval(checkResolve);
            }
          }, 50);
        } catch (error) {
          // something unexpected
          //console.log('  Exception testing command:', error.message);
          done(false);
        }
      });
    };

    // Test AVR toolchain binaries (full paths)
    console.log('Testing AVR toolchain...');
    const avrGccExists = await testCommand(this.avr.compiler.gcc);
    const avrdudeExists = await testCommand(this.avr.uploader.avrdude);

    // Check Arduino.h
    const arduinoHPath = path.join(this.avr.coreIncludes[0], 'Arduino.h');
    const arduinoHExists = fs.existsSync(arduinoHPath);

    results.avr = {
      installed: !!(avrGccExists && avrdudeExists && arduinoHExists),
      gcc: !!avrGccExists,
      avrdude: !!avrdudeExists,
      arduinoH: !!arduinoHExists,
      paths: {
        gcc: this.avr.compiler.gcc,
        avrdude: this.avr.uploader.avrdude,
        arduinoH: arduinoHPath,
        coreIncludes: this.avr.coreIncludes
      }
    };

    // Test ESP32 (if configured) — try esptool.py on PATH
    if (this.esp32) {
      console.log('Testing ESP32 toolchain...');
      const esptoolExists = await testCommand('esptool.py', ['--help']);
      results.esp32 = {
        installed: !!esptoolExists,
        esptool: !!esptoolExists
      };
    }

    // Test STM32 (if configured) — try arm-none-eabi-gcc on PATH (or absolute path if provided)
    if (this.stm32) {
      console.log('Testing STM32 toolchain...');
      // If you configured a full path to arm-none-eabi-gcc in this.stm32.compiler, test that, else test name on PATH
      const armCmd = this.stm32.compiler && this.stm32.compiler.gcc ? this.stm32.compiler.gcc : 'arm-none-eabi-gcc';
      const armGccExists = await testCommand(armCmd);
      results.stm32 = {
        installed: !!armGccExists,
        gcc: !!armGccExists
      };
    }

    return results;
  },

  // Convenience accessor
  getToolchain: function (architecture) {
    return this[architecture];
  }
};
