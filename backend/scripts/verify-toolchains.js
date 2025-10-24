const toolchainsConfig = require('../src/config/toolchains.config');
const logger = require('../src/utils/logger.util');

async function verifyToolchains() {
  console.log('='.repeat(60));
  console.log('Verifying Toolchain Installation');
  console.log('='.repeat(60));
  console.log();

  const results = await toolchainsConfig.validateToolchains();

  console.log('AVR Toolchain:');
  console.log('  GCC:', results.avr.gcc ? '✓ Found' : '✗ Not Found');
  console.log('  AVRDUDE:', results.avr.avrdude ? '✓ Found' : '✗ Not Found');
  console.log('  Status:', results.avr.installed ? '✓ READY' : '✗ NOT READY');
  console.log();

  console.log('ESP32 Toolchain:');
  console.log('  esptool:', results.esp32.esptool ? '✓ Found' : '✗ Not Found');
  console.log('  Status:', results.esp32.installed ? '✓ READY' : '✗ NOT READY');
  console.log();

  console.log('STM32 Toolchain:');
  console.log('  GCC:', results.stm32.gcc ? '✓ Found' : '✗ Not Found');
  console.log('  Status:', results.stm32.installed ? '✓ READY' : '✗ NOT READY');
  console.log();

  console.log('='.repeat(60));
  
  const allReady = results.avr.installed && results.esp32.installed && results.stm32.installed;
  
  if (allReady) {
    console.log('✓ All toolchains are ready!');
  } else {
    console.log('✗ Some toolchains are missing. Please install them.');
    console.log();
    console.log('Installation instructions:');
    console.log('1. Install Arduino IDE from: https://www.arduino.cc/en/software');
    console.log('2. Open Arduino IDE and install:');
    console.log('   - AVR boards (Tools → Board → Boards Manager → Arduino AVR Boards)');
    console.log('   - ESP32 boards (Add ESP32 URL to preferences, then install from Boards Manager)');
    console.log('3. Install Python: https://www.python.org/downloads/');
    console.log('4. Run: pip install esptool');
    console.log('5. Install ARM toolchain: https://developer.arm.com/downloads/-/gnu-rm');
  }
  
  console.log('='.repeat(60));

  process.exit(allReady ? 0 : 1);
}

verifyToolchains().catch(error => {
  console.error('Error verifying toolchains:', error);
  process.exit(1);
});