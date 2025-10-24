module.exports = {
  boards: [
    // ========== Arduino AVR Boards ==========
    {
      id: 'arduino_uno',
      name: 'Arduino Uno',
      manufacturer: 'Arduino',
      family: 'AVR',
      architecture: 'avr',
      mcu: 'atmega328p',
      f_cpu: '16000000L',
      uploadSpeed: 115200,
      specs: {
        flash: 32768,
        sram: 2048,
        eeprom: 1024,
        digitalPins: 14,
        analogPins: 6,
        pwmPins: [3, 5, 6, 9, 10, 11]
      },
      compiler: {
        toolchain: 'avr',
        executable: 'avr-gcc',
        flags: [
          '-c',
          '-g',
          '-Os',
          '-w',
          '-std=gnu++11',
          '-fpermissive',
          '-fno-exceptions',
          '-ffunction-sections',
          '-fdata-sections',
          '-fno-threadsafe-statics',
          '-Wno-error=narrowing',
          '-MMD',
          '-flto'
        ],
        defines: [
          '-DF_CPU=16000000L',
          '-DARDUINO=10819',
          '-DARDUINO_AVR_UNO',
          '-DARDUINO_ARCH_AVR'
        ],
        includes: [
          '{arduino.cores}/arduino',
          '{arduino.variants}/standard'
        ]
      },
      linker: {
        flags: [
          '-w',
          '-Os',
          '-g',
          '-flto',
          '-fuse-linker-plugin',
          '-Wl,--gc-sections',
          '-mmcu=atmega328p'
        ],
        libs: ['-lm']
      },
      uploader: {
        tool: 'avrdude',
        protocol: 'arduino',
        flags: [
          '-C{avrdude.config}',
          '-v',
          '-patmega328p',
          '-carduino',
          '-P{serial.port}',
          '-b115200',
          '-D',
          '-Uflash:w:{firmware.hex}:i'
        ]
      },
      vid_pid: [
        { vid: '0x2341', pid: '0x0043' },
        { vid: '0x2341', pid: '0x0001' },
        { vid: '0x2A03', pid: '0x0043' }
      ]
    },

    {
      id: 'arduino_mega',
      name: 'Arduino Mega 2560',
      manufacturer: 'Arduino',
      family: 'AVR',
      architecture: 'avr',
      mcu: 'atmega2560',
      f_cpu: '16000000L',
      uploadSpeed: 115200,
      specs: {
        flash: 262144,
        sram: 8192,
        eeprom: 4096,
        digitalPins: 54,
        analogPins: 16,
        pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
      },
      compiler: {
        toolchain: 'avr',
        executable: 'avr-gcc',
        flags: [
          '-c',
          '-g',
          '-Os',
          '-w',
          '-std=gnu++11',
          '-fpermissive',
          '-fno-exceptions',
          '-ffunction-sections',
          '-fdata-sections',
          '-fno-threadsafe-statics',
          '-Wno-error=narrowing',
          '-MMD',
          '-flto'
        ],
        defines: [
          '-DF_CPU=16000000L',
          '-DARDUINO=10819',
          '-DARDUINO_AVR_MEGA2560',
          '-DARDUINO_ARCH_AVR'
        ],
        includes: [
          '{arduino.cores}/arduino',
          '{arduino.variants}/mega'
        ]
      },
      linker: {
        flags: [
          '-w',
          '-Os',
          '-g',
          '-flto',
          '-fuse-linker-plugin',
          '-Wl,--gc-sections',
          '-mmcu=atmega2560'
        ],
        libs: ['-lm']
      },
      uploader: {
        tool: 'avrdude',
        protocol: 'wiring',
        flags: [
          '-C{avrdude.config}',
          '-v',
          '-patmega2560',
          '-cwiring',
          '-P{serial.port}',
          '-b115200',
          '-D',
          '-Uflash:w:{firmware.hex}:i'
        ]
      },
      vid_pid: [
        { vid: '0x2341', pid: '0x0010' },
        { vid: '0x2341', pid: '0x0042' },
        { vid: '0x2A03', pid: '0x0010' }
      ]
    },

    // ========== ESP32 Boards ==========
    {
      id: 'esp32_devkit_v1',
      name: 'ESP32 Dev Module',
      manufacturer: 'Espressif',
      family: 'ESP32',
      architecture: 'esp32',
      mcu: 'esp32',
      f_cpu: '240000000L',
      uploadSpeed: 921600,
      specs: {
        flash: 4194304,
        sram: 520192,
        psram: 0,
        cores: 2,
        wifi: true,
        bluetooth: true
      },
      compiler: {
        toolchain: 'esp32',
        executable: 'xtensa-esp32-elf-gcc',
        flags: [
          '-std=gnu++11',
          '-Os',
          '-g3',
          '-Wpointer-arith',
          '-fexceptions',
          '-fstack-protector',
          '-ffunction-sections',
          '-fdata-sections',
          '-fstrict-volatile-bitfields',
          '-mlongcalls',
          '-nostdlib',
          '-w',
          '-Wno-error=unused-function',
          '-Wno-error=unused-variable',
          '-Wno-error=deprecated-declarations',
          '-Wno-unused-parameter',
          '-Wno-sign-compare',
          '-fno-rtti',
          '-c',
          '-MMD',
          '-DF_CPU=240000000L',
          '-DARDUINO_ARCH_ESP32',
          '-DESP32'
        ],
        defines: [
          '-DF_CPU=240000000L',
          '-DARDUINO=10819',
          '-DARDUINO_ESP32_DEV',
          '-DARDUINO_ARCH_ESP32',
          '-DESP32',
          '-DCORE_DEBUG_LEVEL=0'
        ],
        includes: [
          '{arduino.cores}/esp32',
          '{arduino.variants}/esp32'
        ]
      },
      linker: {
        flags: [
          '-nostdlib',
          '-Wl,-static',
          '-Wl,--gc-sections',
          '-Wl,-EL',
          '-T{linker.script}',
          '-u',
          'call_user_start_cpu0'
        ],
        libs: [
          '-lgcc',
          '-lstdc++',
          '-lapp_update',
          '-lbootloader_support',
          '-ldriver',
          '-lesp32',
          '-lespnow',
          '-lfreertos',
          '-lm',
          '-lnewlib',
          '-lsoc',
          '-lwifi_provisioning',
          '-lwpa_supplicant'
        ],
        script: 'esp32.rom.ld'
      },
      uploader: {
        tool: 'esptool',
        protocol: 'esptool',
        flags: [
          '--chip', 'esp32',
          '--port', '{serial.port}',
          '--baud', '921600',
          '--before', 'default_reset',
          '--after', 'hard_reset',
          'write_flash',
          '-z',
          '--flash_mode', 'dio',
          '--flash_freq', '80m',
          '--flash_size', 'detect',
          '0x1000', '{bootloader.bin}',
          '0x8000', '{partitions.bin}',
          '0xe000', '{boot_app0.bin}',
          '0x10000', '{firmware.bin}'
        ]
      },
      partitions: {
        bootloader: '0x1000',
        partitionTable: '0x8000',
        bootApp: '0xe000',
        app: '0x10000'
      },
      vid_pid: [
        { vid: '0x10C4', pid: '0xEA60' }, // CP210x
        { vid: '0x1A86', pid: '0x7523' }  // CH340
      ]
    },

    // ========== STM32 Boards ==========
    {
      id: 'stm32_bluepill',
      name: 'STM32 Blue Pill (STM32F103C8)',
      manufacturer: 'STMicroelectronics',
      family: 'STM32',
      architecture: 'stm32',
      mcu: 'STM32F103C8',
      f_cpu: '72000000L',
      uploadSpeed: 115200,
      specs: {
        flash: 65536,
        sram: 20480,
        core: 'Cortex-M3',
        digitalPins: 37,
        analogPins: 10,
        pwmPins: 15
      },
      compiler: {
        toolchain: 'stm32',
        executable: 'arm-none-eabi-gcc',
        flags: [
          '-c',
          '-g',
          '-Os',
          '-w',
          '-std=gnu++14',
          '-ffunction-sections',
          '-fdata-sections',
          '-nostdlib',
          '-fno-threadsafe-statics',
          '--param', 'max-inline-insns-single=500',
          '-fno-rtti',
          '-fno-exceptions',
          '-MMD',
          '-mcpu=cortex-m3',
          '-mthumb'
        ],
        defines: [
          '-DF_CPU=72000000L',
          '-DARDUINO=10819',
          '-DARDUINO_BLUEPILL_F103C8',
          '-DARDUINO_ARCH_STM32',
          '-DSTM32F1xx',
          '-DSTM32F103xB',
          '-DBOARD_NAME="BLUEPILL_F103C8"'
        ],
        includes: [
          '{arduino.cores}/arduino',
          '{arduino.variants}/PILL_F103XX'
        ]
      },
      linker: {
        flags: [
          '-Os',
          '-Wl,--gc-sections',
          '-mcpu=cortex-m3',
          '-mthumb',
          '--specs=nano.specs',
          '-T{linker.script}'
        ],
        libs: [
          '-lc',
          '-lm',
          '-lgcc',
          '-lstdc++'
        ],
        script: 'ld/jtag.ld'
      },
      uploader: {
        tool: 'stm32flash',
        protocol: 'serial',
        flags: [
          '-g', '0x8000000',
          '-b', '115200',
          '-w', '{firmware.bin}',
          '-v',
          '-R',
          '{serial.port}'
        ]
      },
      vid_pid: [
        { vid: '0x0483', pid: '0x5740' }
      ]
    }
  ],

  // Board categories for UI grouping
  categories: {
    'Arduino AVR': ['arduino_uno', 'arduino_mega', 'arduino_nano'],
    'ESP32': ['esp32_devkit_v1', 'esp32_s2', 'esp32_c3'],
    'STM32': ['stm32_bluepill', 'stm32_nucleo_f103rb']
  },

  // Get board by ID
  getBoard: function(boardId) {
    return this.boards.find(board => board.id === boardId);
  },

  // Get boards by architecture
  getBoardsByArchitecture: function(architecture) {
    return this.boards.filter(board => board.architecture === architecture);
  },

  // Get all supported architectures
  getArchitectures: function() {
    return [...new Set(this.boards.map(board => board.architecture))];
  }
};