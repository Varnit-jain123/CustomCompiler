// const toolchainService = require('../services/embedded/toolchain.service');
// const uploaderService = require('../services/embedded/uploader.service');
// const boardsConfig = require('../config/boards.config');
// const logger = require('../utils/logger.util');
// const { v4: uuidv4 } = require('uuid');

// class EmbeddedController {
//   /**
//    * Compile Arduino code without uploading
//    */
//   async compile(req, res) {
//     const compilationId = uuidv4();
    
//     try {
//       const { code, boardId, options = {} } = req.body;

//       logger.info(`Starting compilation ${compilationId} for board ${boardId}`);

//       // Get board configuration
//       const board = boardsConfig.getBoard(boardId);
//       if (!board) {
//         return res.status(400).json({
//           success: false,
//           error: `Board '${boardId}' not found`
//         });
//       }

//       // Start compilation process
//       const result = await toolchainService.compile({
//         compilationId,
//         code,
//         board,
//         options: {
//           optimization: options.optimization || '-Os',
//           debugSymbols: options.debugSymbols || false,
//           warnings: options.warnings || 'all',
//           customFlags: options.customFlags || []
//         }
//       });

//       logger.info(`Compilation ${compilationId} completed successfully`);

//       res.json({
//         success: true,
//         compilationId,
//         result: {
//           firmwarePath: result.firmwarePath,
//           firmwareSize: result.firmwareSize,
//           memoryUsage: result.memoryUsage,
//           warnings: result.warnings,
//           buildTime: result.buildTime,
//           metadata: result.metadata
//         }
//       });

//     } catch (error) {
//       logger.error(`Compilation ${compilationId} failed:`, error);
      
//       res.status(400).json({
//         success: false,
//         compilationId,
//         error: error.message,
//         details: error.details || null
//       });
//     }
//   }

//   /**
//    * Compile and upload to board
//    */
//   async upload(req, res) {
//     const uploadId = uuidv4();
    
//     try {
//       const { code, boardId, port, options = {} } = req.body;

//       logger.info(`Starting upload ${uploadId} for board ${boardId} on port ${port}`);

//       // Get board configuration
//       const board = boardsConfig.getBoard(boardId);
//       if (!board) {
//         return res.status(400).json({
//           success: false,
//           error: `Board '${boardId}' not found`
//         });
//       }

//       // Compile first
//       const compilationResult = await toolchainService.compile({
//         compilationId: uploadId,
//         code,
//         board,
//         options: {
//           optimization: options.optimization || '-Os',
//           debugSymbols: options.debugSymbols || false,
//           warnings: options.warnings || 'all',
//           customFlags: options.customFlags || []
//         }
//       });

//       logger.info(`Upload ${uploadId}: Compilation completed, starting upload`);

//       // Upload to board
//       const uploadResult = await uploaderService.upload({
//         uploadId,
//         firmwarePath: compilationResult.firmwarePath,
//         board,
//         port,
//         options: {
//           verify: options.verify !== false,
//           verbose: options.verbose || false
//         }
//       });

//       logger.info(`Upload ${uploadId} completed successfully`);

//       res.json({
//         success: true,
//         uploadId,
//         result: {
//           compilation: {
//             firmwareSize: compilationResult.firmwareSize,
//             memoryUsage: compilationResult.memoryUsage,
//             warnings: compilationResult.warnings,
//             buildTime: compilationResult.buildTime
//           },
//           upload: {
//             duration: uploadResult.duration,
//             bytesWritten: uploadResult.bytesWritten,
//             verified: uploadResult.verified
//           }
//         }
//       });

//     } catch (error) {
//       logger.error(`Upload ${uploadId} failed:`, error);
      
//       res.status(400).json({
//         success: false,
//         uploadId,
//         error: error.message,
//         stage: error.stage || 'unknown',
//         details: error.details || null
//       });
//     }
//   }

//   /**
//    * Get list of supported boards
//    */
//   async getBoards(req, res) {
//     try {
//       const { architecture, manufacturer } = req.query;

//       let boards = boardsConfig.boards;

//       // Filter by architecture if specified
//       if (architecture) {
//         boards = boards.filter(b => b.architecture === architecture);
//       }

//       // Filter by manufacturer if specified
//       if (manufacturer) {
//         boards = boards.filter(b => b.manufacturer === manufacturer);
//       }

//       // Return simplified board info
//       const boardList = boards.map(board => ({
//         id: board.id,
//         name: board.name,
//         manufacturer: board.manufacturer,
//         family: board.family,
//         architecture: board.architecture,
//         specs: {
//           flash: board.specs.flash,
//           sram: board.specs.sram,
//           mcu: board.mcu
//         }
//       }));

//       res.json({
//         success: true,
//         count: boardList.length,
//         boards: boardList,
//         categories: boardsConfig.categories
//       });

//     } catch (error) {
//       logger.error('Failed to get boards:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to retrieve boards'
//       });
//     }
//   }

//   /**
//    * Get detailed board information
//    */
//   async getBoardDetails(req, res) {
//     try {
//       const { boardId } = req.params;

//       const board = boardsConfig.getBoard(boardId);
//       if (!board) {
//         return res.status(404).json({
//           success: false,
//           error: `Board '${boardId}' not found`
//         });
//       }

//       res.json({
//         success: true,
//         board: {
//           id: board.id,
//           name: board.name,
//           manufacturer: board.manufacturer,
//           family: board.family,
//           architecture: board.architecture,
//           mcu: board.mcu,
//           f_cpu: board.f_cpu,
//           uploadSpeed: board.uploadSpeed,
//           specs: board.specs,
//           pinout: board.pinout || null,
//           documentation: board.documentation || null
//         }
//       });

//     } catch (error) {
//       logger.error('Failed to get board details:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to retrieve board details'
//       });
//     }
//   }

//   /**
//    * Get compatible libraries for a board
//    */
//   async getBoardLibraries(req, res) {
//     try {
//       const { boardId } = req.params;

//       const board = boardsConfig.getBoard(boardId);
//       if (!board) {
//         return res.status(404).json({
//           success: false,
//           error: `Board '${boardId}' not found`
//         });
//       }

//       // Get architecture-specific libraries
//       const libraries = await toolchainService.getAvailableLibraries(board.architecture);

//       res.json({
//         success: true,
//         boardId,
//         count: libraries.length,
//         libraries
//       });

//     } catch (error) {
//       logger.error('Failed to get board libraries:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to retrieve libraries'
//       });
//     }
//   }

//   /**
//    * Get available code templates
//    */
//   async getTemplates(req, res) {
//     try {
//       const { boardId } = req.query;

//       const templates = [
//         {
//           id: 'blink',
//           name: 'Blink LED',
//           description: 'Basic LED blinking example',
//           category: 'basics',
//           difficulty: 'beginner',
//           supportedArchitectures: ['avr', 'esp32', 'stm32']
//         },
//         {
//           id: 'serial',
//           name: 'Serial Communication',
//           description: 'Send and receive data via serial port',
//           category: 'communication',
//           difficulty: 'beginner',
//           supportedArchitectures: ['avr', 'esp32', 'stm32']
//         },
//         {
//           id: 'analog_read',
//           name: 'Analog Input',
//           description: 'Read analog sensor values',
//           category: 'sensors',
//           difficulty: 'beginner',
//           supportedArchitectures: ['avr', 'esp32', 'stm32']
//         },
//         {
//           id: 'pwm',
//           name: 'PWM Control',
//           description: 'Control LED brightness or motor speed with PWM',
//           category: 'actuators',
//           difficulty: 'intermediate',
//           supportedArchitectures: ['avr', 'esp32', 'stm32']
//         },
//         {
//           id: 'wifi_scan',
//           name: 'WiFi Scanner',
//           description: 'Scan and list available WiFi networks',
//           category: 'networking',
//           difficulty: 'intermediate',
//           supportedArchitectures: ['esp32']
//         },
//         {
//           id: 'interrupt',
//           name: 'External Interrupt',
//           description: 'Handle button press with interrupts',
//           category: 'advanced',
//           difficulty: 'intermediate',
//           supportedArchitectures: ['avr', 'esp32', 'stm32']
//         }
//       ];

//       // Filter by board if specified
//       let filteredTemplates = templates;
//       if (boardId) {
//         const board = boardsConfig.getBoard(boardId);
//         if (board) {
//           filteredTemplates = templates.filter(t => 
//             t.supportedArchitectures.includes(board.architecture)
//           );
//         }
//       }

//       res.json({
//         success: true,
//         count: filteredTemplates.length,
//         templates: filteredTemplates
//       });

//     } catch (error) {
//       logger.error('Failed to get templates:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to retrieve templates'
//       });
//     }
//   }

//   /**
//    * Get specific template code
//    */
//   async getTemplate(req, res) {
//     try {
//       const { templateId } = req.params;
//       const { boardId } = req.query;

//       // Template code examples
//       const templates = {
//         blink: {
//           avr: `// Blink LED Example for Arduino
// void setup() {
//   pinMode(LED_BUILTIN, OUTPUT);
// }

// void loop() {
//   digitalWrite(LED_BUILTIN, HIGH);
//   delay(1000);
//   digitalWrite(LED_BUILTIN, LOW);
//   delay(1000);
// }`,
//           esp32: `// Blink LED Example for ESP32
// #define LED_PIN 2

// void setup() {
//   pinMode(LED_PIN, OUTPUT);
// }

// void loop() {
//   digitalWrite(LED_PIN, HIGH);
//   delay(1000);
//   digitalWrite(LED_PIN, LOW);
//   delay(1000);
// }`,
//           stm32: `// Blink LED Example for STM32
// #define LED_PIN PC13

// void setup() {
//   pinMode(LED_PIN, OUTPUT);
// }

// void loop() {
//   digitalWrite(LED_PIN, HIGH);
//   delay(1000);
//   digitalWrite(LED_PIN, LOW);
//   delay(1000);
// }`
//         },
//         serial: {
//           common: `// Serial Communication Example
// void setup() {
//   Serial.begin(9600);
//   Serial.println("Serial communication started!");
// }

// void loop() {
//   if (Serial.available() > 0) {
//     String data = Serial.readStringUntil('\\n');
//     Serial.print("Received: ");
//     Serial.println(data);
//   }
  
//   Serial.print("Uptime: ");
//   Serial.print(millis() / 1000);
//   Serial.println(" seconds");
//   delay(2000);
// }`
//         },
//         analog_read: {
//           common: `// Analog Input Example
// #define ANALOG_PIN A0

// void setup() {
//   Serial.begin(9600);
//   pinMode(ANALOG_PIN, INPUT);
// }

// void loop() {
//   int sensorValue = analogRead(ANALOG_PIN);
//   float voltage = sensorValue * (5.0 / 1023.0);
  
//   Serial.print("Sensor Value: ");
//   Serial.print(sensorValue);
//   Serial.print(" | Voltage: ");
//   Serial.print(voltage);
//   Serial.println("V");
  
//   delay(500);
// }`
//         },
//         pwm: {
//           common: `// PWM Control Example
// #define PWM_PIN 9

// void setup() {
//   pinMode(PWM_PIN, OUTPUT);
// }

// void loop() {
//   // Fade in
//   for (int brightness = 0; brightness <= 255; brightness++) {
//     analogWrite(PWM_PIN, brightness);
//     delay(10);
//   }
  
//   // Fade out
//   for (int brightness = 255; brightness >= 0; brightness--) {
//     analogWrite(PWM_PIN, brightness);
//     delay(10);
//   }
// }`
//         },
//         wifi_scan: {
//           esp32: `// WiFi Scanner for ESP32
// #include <WiFi.h>

// void setup() {
//   Serial.begin(115200);
//   WiFi.mode(WIFI_STA);
//   WiFi.disconnect();
//   delay(100);
//   Serial.println("WiFi Scanner Ready");
// }

// void loop() {
//   Serial.println("Scanning WiFi networks...");
//   int n = WiFi.scanNetworks();
  
//   if (n == 0) {
//     Serial.println("No networks found");
//   } else {
//     Serial.print(n);
//     Serial.println(" networks found:");
    
//     for (int i = 0; i < n; i++) {
//       Serial.print(i + 1);
//       Serial.print(": ");
//       Serial.print(WiFi.SSID(i));
//       Serial.print(" (");
//       Serial.print(WiFi.RSSI(i));
//       Serial.print(" dBm) ");
//       Serial.println(WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "Open" : "Encrypted");
//     }
//   }
  
//   delay(5000);
// }`
//         },
//         interrupt: {
//           common: `// External Interrupt Example
// #define BUTTON_PIN 2
// #define LED_PIN 13

// volatile bool ledState = LOW;

// void setup() {
//   pinMode(LED_PIN, OUTPUT);
//   pinMode(BUTTON_PIN, INPUT_PULLUP);
  
//   attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), buttonPressed, FALLING);
  
//   Serial.begin(9600);
//   Serial.println("Interrupt example ready");
// }

// void loop() {
//   digitalWrite(LED_PIN, ledState);
//   delay(100);
// }

// void buttonPressed() {
//   ledState = !ledState;
//   Serial.println("Button pressed!");
// }`
//         }
//       };

//       if (!templates[templateId]) {
//         return res.status(404).json({
//           success: false,
//           error: `Template '${templateId}' not found`
//         });
//       }

//       let code;
//       if (boardId) {
//         const board = boardsConfig.getBoard(boardId);
//         if (board) {
//           const architecture = board.architecture;
//           code = templates[templateId][architecture] || templates[templateId].common;
//         } else {
//           code = templates[templateId].common;
//         }
//       } else {
//         code = templates[templateId].common || templates[templateId].avr;
//       }

//       res.json({
//         success: true,
//         templateId,
//         code
//       });

//     } catch (error) {
//       logger.error('Failed to get template:', error);
//       res.status(500).json({
//         success: false,
//         error: 'Failed to retrieve template'
//       });
//     }
//   }
// }

// module.exports = new EmbeddedController();


const arduinoCLIService = require('../services/arduino-cli.service');
const boardsConfig = require('../config/boards.config');
const logger = require('../utils/logger.util');
const { v4: uuidv4 } = require('uuid');

class EmbeddedController {
  /**
   * Compile Arduino code without uploading (using Arduino CLI)
   */
  async compile(req, res) {
    const compilationId = uuidv4();

    try {
      const { code, boardId, options = {} } = req.body;

      logger.info(`Starting Arduino CLI compilation ${compilationId} for board ${boardId}`);

      // Get board configuration
      const board = boardsConfig.getBoard(boardId);
      if (!board) {
        return res.status(400).json({
          success: false,
          error: `Board '${boardId}' not found`
        });
      }

      // Compile using Arduino CLI
      const result = await arduinoCLIService.compile({
        compilationId,
        code,
        board,
        options
      });

      logger.info(`Compilation ${compilationId} completed successfully`);

      res.json({
        success: true,
        compilationId,
        result: {
          firmwarePath: result.firmwarePath,
          firmwareSize: result.firmwareSize,
          memoryUsage: result.memoryUsage,
          warnings: result.warnings,
          buildTime: result.buildTime,
          metadata: result.metadata
        }
      });

    } catch (error) {
      logger.error(`Compilation ${compilationId} failed:`, error);
      res.status(400).json({
        success: false,
        compilationId,
        error: error.message,
        details: error.details || null
      });
    }
  }

  /**
   * Compile and upload to board (using Arduino CLI)
   */
  async upload(req, res) {
    const uploadId = uuidv4();

    try {
      const { code, boardId, port, options = {} } = req.body;

      logger.info(`Starting Arduino CLI upload ${uploadId} for board ${boardId} on port ${port}`);

      // Get board configuration
      const board = boardsConfig.getBoard(boardId);
      if (!board) {
        return res.status(400).json({
          success: false,
          error: `Board '${boardId}' not found`
        });
      }

      // Compile first
      const compilationResult = await arduinoCLIService.compile({
        compilationId: uploadId,
        code,
        board,
        options
      });

      logger.info(`Upload ${uploadId}: Compilation completed, starting upload`);

      // Upload firmware
      const uploadResult = await arduinoCLIService.upload({
        uploadId,
        firmwarePath: compilationResult.firmwarePath,
        board,
        port,
        options
      });

      logger.info(`Upload ${uploadId} completed successfully`);

      res.json({
        success: true,
        uploadId,
        result: {
          compilation: {
            firmwareSize: compilationResult.firmwareSize,
            memoryUsage: compilationResult.memoryUsage,
            warnings: compilationResult.warnings,
            buildTime: compilationResult.buildTime
          },
          upload: {
            duration: uploadResult.duration,
            bytesWritten: uploadResult.bytesWritten,
            verified: uploadResult.verified
          }
        }
      });

    } catch (error) {
      logger.error(`Upload ${uploadId} failed:`, error);
      res.status(400).json({
        success: false,
        uploadId,
        error: error.message,
        stage: error.stage || 'unknown',
        details: error.details || null
      });
    }
  }

  /**
   * Get list of supported boards
   */
  async getBoards(req, res) {
    try {
      const { architecture, manufacturer } = req.query;
      let boards = boardsConfig.boards;

      if (architecture) boards = boards.filter(b => b.architecture === architecture);
      if (manufacturer) boards = boards.filter(b => b.manufacturer === manufacturer);

      const boardList = boards.map(board => ({
        id: board.id,
        name: board.name,
        manufacturer: board.manufacturer,
        family: board.family,
        architecture: board.architecture,
        specs: {
          flash: board.specs.flash,
          sram: board.specs.sram,
          mcu: board.mcu
        }
      }));

      res.json({
        success: true,
        count: boardList.length,
        boards: boardList,
        categories: boardsConfig.categories
      });

    } catch (error) {
      logger.error('Failed to get boards:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve boards'
      });
    }
  }

  /**
   * Get detailed board information
   */
  async getBoardDetails(req, res) {
    try {
      const { boardId } = req.params;
      const board = boardsConfig.getBoard(boardId);

      if (!board) {
        return res.status(404).json({
          success: false,
          error: `Board '${boardId}' not found`
        });
      }

      res.json({
        success: true,
        board: {
          id: board.id,
          name: board.name,
          manufacturer: board.manufacturer,
          family: board.family,
          architecture: board.architecture,
          mcu: board.mcu,
          f_cpu: board.f_cpu,
          uploadSpeed: board.uploadSpeed,
          specs: board.specs,
          pinout: board.pinout || null,
          documentation: board.documentation || null
        }
      });

    } catch (error) {
      logger.error('Failed to get board details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve board details'
      });
    }
  }

  /**
   * Get compatible libraries for a board
   */
  async getBoardLibraries(req, res) {
    try {
      const { boardId } = req.params;
      const board = boardsConfig.getBoard(boardId);

      if (!board) {
        return res.status(404).json({
          success: false,
          error: `Board '${boardId}' not found`
        });
      }

      const libraries = await arduinoCLIService.getAvailableLibraries(board.architecture);
      res.json({
        success: true,
        boardId,
        count: libraries.length,
        libraries
      });

    } catch (error) {
      logger.error('Failed to get board libraries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve libraries'
      });
    }
  }

  /**
   * Get available code templates
   */
  async getTemplates(req, res) {
    try {
      const { boardId } = req.query;
      const templates = [
        {
          id: 'blink',
          name: 'Blink LED',
          description: 'Basic LED blinking example',
          category: 'basics',
          difficulty: 'beginner',
          supportedArchitectures: ['avr', 'esp32', 'stm32']
        },
        {
          id: 'serial',
          name: 'Serial Communication',
          description: 'Send and receive data via serial port',
          category: 'communication',
          difficulty: 'beginner',
          supportedArchitectures: ['avr', 'esp32', 'stm32']
        },
        {
          id: 'analog_read',
          name: 'Analog Input',
          description: 'Read analog sensor values',
          category: 'sensors',
          difficulty: 'beginner',
          supportedArchitectures: ['avr', 'esp32', 'stm32']
        },
        {
          id: 'pwm',
          name: 'PWM Control',
          description: 'Control LED brightness or motor speed with PWM',
          category: 'actuators',
          difficulty: 'intermediate',
          supportedArchitectures: ['avr', 'esp32', 'stm32']
        },
        {
          id: 'wifi_scan',
          name: 'WiFi Scanner',
          description: 'Scan and list available WiFi networks',
          category: 'networking',
          difficulty: 'intermediate',
          supportedArchitectures: ['esp32']
        },
        {
          id: 'interrupt',
          name: 'External Interrupt',
          description: 'Handle button press with interrupts',
          category: 'advanced',
          difficulty: 'intermediate',
          supportedArchitectures: ['avr', 'esp32', 'stm32']
        }
      ];

      let filteredTemplates = templates;
      if (boardId) {
        const board = boardsConfig.getBoard(boardId);
        if (board) {
          filteredTemplates = templates.filter(t =>
            t.supportedArchitectures.includes(board.architecture)
          );
        }
      }

      res.json({
        success: true,
        count: filteredTemplates.length,
        templates: filteredTemplates
      });

    } catch (error) {
      logger.error('Failed to get templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve templates'
      });
    }
  }

  /**
   * Get specific template code
   */
  async getTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const { boardId } = req.query;

      const templates = {
        blink: {
          avr: `// Blink LED Example for Arduino
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`,
          esp32: `// Blink LED Example for ESP32
#define LED_PIN 2
void setup() {
  pinMode(LED_PIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}`,
          stm32: `// Blink LED Example for STM32
#define LED_PIN PC13
void setup() {
  pinMode(LED_PIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}`
        },
        serial: {
          common: `// Serial Communication Example
void setup() {
  Serial.begin(9600);
  Serial.println("Serial communication started!");
}
void loop() {
  if (Serial.available() > 0) {
    String data = Serial.readStringUntil('\\n');
    Serial.print("Received: ");
    Serial.println(data);
  }
  Serial.print("Uptime: ");
  Serial.print(millis() / 1000);
  Serial.println(" seconds");
  delay(2000);
}`
        },
        analog_read: {
          common: `// Analog Input Example
#define ANALOG_PIN A0
void setup() {
  Serial.begin(9600);
  pinMode(ANALOG_PIN, INPUT);
}
void loop() {
  int sensorValue = analogRead(ANALOG_PIN);
  float voltage = sensorValue * (5.0 / 1023.0);
  Serial.print("Sensor Value: ");
  Serial.print(sensorValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage);
  Serial.println("V");
  delay(500);
}`
        },
        pwm: {
          common: `// PWM Control Example
#define PWM_PIN 9
void setup() {
  pinMode(PWM_PIN, OUTPUT);
}
void loop() {
  for (int brightness = 0; brightness <= 255; brightness++) {
    analogWrite(PWM_PIN, brightness);
    delay(10);
  }
  for (int brightness = 255; brightness >= 0; brightness--) {
    analogWrite(PWM_PIN, brightness);
    delay(10);
  }
}`
        }
      };

      const board = boardId ? boardsConfig.getBoard(boardId) : null;
      const arch = board ? board.architecture : 'common';
      const template = templates[templateId]?.[arch] || templates[templateId]?.common;

      if (!template) {
        return res.status(404).json({
          success: false,
          error: `Template '${templateId}' not found`
        });
      }

      res.json({
        success: true,
        templateId,
        architecture: arch,
        code: template
      });

    } catch (error) {
      logger.error('Failed to get template code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve template code'
      });
    }
  }
}

module.exports = new EmbeddedController();
