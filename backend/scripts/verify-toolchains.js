const toolchainsConfig = require('../src/config/toolchains.config');
const logger = require('../src/utils/logger.util');

async function verifyToolchains() {
  console.log('='.repeat(60));
  console.log('Verifying Toolchain Installation');
  console.log('='.repeat(60));
  console.log();

  const results = await toolchainsConfig.validateToolchains();

  // AVR Toolchain
  if (results.avr) {
    console.log('AVR Toolchain:');
    console.log('  GCC:', results.avr.gcc ? '✓ Found' : '✗ Not Found');
    console.log('  AVRDUDE:', results.avr.avrdude ? '✓ Found' : '✗ Not Found');
    console.log('  Arduino.h:', results.avr.arduinoH ? '✓ Found' : '✗ Not Found');
    
    if (results.avr.paths) {
      console.log('  Paths:');
      console.log('    GCC:', results.avr.paths.gcc);
      console.log('    AVRDUDE:', results.avr.paths.avrdude);
      console.log('    Arduino.h:', results.avr.paths.arduinoH);
    }
    
    console.log('  Status:', results.avr.installed ? '✓ READY' : '✗ NOT READY');
  } else {
    console.log('AVR Toolchain: ✗ Not configured');
  }
  console.log();

  // ESP32 Toolchain
  if (results.esp32) {
    console.log('ESP32 Toolchain:');
    console.log('  esptool:', results.esp32.esptool ? '✓ Found' : '✗ Not Found');
    console.log('  Status:', results.esp32.installed ? '✓ READY' : '✗ NOT READY');
    console.log();
  } else {
    console.log('ESP32 Toolchain: (Not configured - Optional)');
    console.log();
  }

  // STM32 Toolchain
  if (results.stm32) {
    console.log('STM32 Toolchain:');
    console.log('  GCC:', results.stm32.gcc ? '✓ Found' : '✗ Not Found');
    console.log('  Status:', results.stm32.installed ? '✓ READY' : '✗ NOT READY');
    console.log();
  } else {
    console.log('STM32 Toolchain: (Not configured - Optional)');
    console.log();
  }

  console.log('='.repeat(60));
  
  const avrReady = results.avr && results.avr.installed;
  
  if (avrReady) {
    console.log('✓ AVR toolchain is ready! You can compile Arduino code.');
  } else {
    console.log('✗ AVR toolchain has issues. See details above.');
    console.log();
    console.log('Common fixes:');
    console.log('1. Ensure Arduino IDE is installed');
    console.log('2. Install Arduino AVR Boards via Arduino IDE Board Manager');
    console.log('3. Restart this terminal/command prompt');
    console.log('4. Check paths in src/config/toolchains.config.js');
  }
  
  console.log('='.repeat(60));

  process.exit(avrReady ? 0 : 1);
}

verifyToolchains().catch(error => {
  console.error('Error verifying toolchains:', error.message);
  console.error(error.stack);
  process.exit(1);
});