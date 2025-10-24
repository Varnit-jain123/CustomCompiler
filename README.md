# Arduino-like Embedded Development Platform

A full-featured web-based platform for compiling and uploading Arduino code to various embedded boards (Arduino Uno, ESP32, STM32, etc.).

## Features

- 🎨 Monaco Editor with syntax highlighting for Arduino/C++
- 🔧 Support for multiple board architectures (AVR, ESP32, STM32)
- ⚡ Real-time compilation and upload progress
- 📟 Built-in Serial Monitor
- 🔒 Secure sandboxed compilation environment
- 📦 Firmware storage and management
- 🎯 Template system for quick start

## Architecture

### Backend
- Node.js + Express
- WebSocket for real-time communication
- Modular architecture service pattern (AVR, ESP32, STM32)
- Docker-based sandboxing for secure compilation
- Serial port management via `serialport` library

### Frontend
- React 18
- Monaco Editor for code editing
- WebSocket integration for live updates
- Responsive UI with dark theme

## Prerequisites

### Backend Requirements
- Node.js >= 18.0.0
- AVR toolchain (`avr-gcc`, `avrdude`)
- ESP32 toolchain (`xtensa-esp32-elf-gcc`, `esptool.py`)
- STM32 toolchain (`arm-none-eabi-gcc`, `stm32flash`)
- Docker (optional, for sandboxing)

### Frontend Requirements
- Node.js >= 18.0.0
- npm or yarn

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd online-c-compiler
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Install Toolchains

#### Ubuntu/Debian:
```bash
# AVR toolchain
sudo apt-get install gcc-avr avr-libc avrdude

# ESP32 toolchain
pip3 install esptool

# STM32 toolchain
sudo apt-get install gcc-arm-none-eabi stm32flash
```

#### macOS:
```bash
# AVR toolchain
brew tap osx-cross/avr
brew install avr-gcc avrdude

# ESP32 toolchain
pip3 install esptool

# STM32 toolchain
brew install --cask gcc-arm-embedded
```

### 5. Setup Arduino Cores

Download and extract Arduino cores:
```bash
# Create directories
mkdir -p backend/arduino-cores/{arduino,esp32,stm32}

# Download Arduino AVR core
# (Extract to backend/arduino-cores/arduino)

# Download ESP32 core
# (Extract to backend/arduino-cores/esp32)

# Download STM32 core
# (Extract to backend/arduino-cores/stm32)
```

### 6. Configure Environment

Create `.env` files:

**Backend `.env`:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
```

**Frontend `.env`:**
```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- WebSocket: ws://localhost:5000/ws

### Production Mode with Docker
```bash
cd docker
docker-compose up -d
```

## Usage

1. **Select Board**: Choose your target board from the dropdown (e.g., Arduino Uno, ESP32)
2. **Select Port**: Choose the serial port your board is connected to
3. **Write Code**: Use the Monaco editor to write your Arduino code
4. **Verify**: Click "Verify" to compile without uploading
5. **Upload**: Click "Upload" to compile and flash to your board
6. **Monitor**: Click "Serial Monitor" to view serial output from your board

## Project Structure
```
online-c-compiler/
├── backend/
│   ├── src/
│   │   ├── routes/           # API route definitions
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   │   └── embedded/     # Embedded-specific services
│   │   │       └── architectures/  # Board architecture implementations
│   │   ├── middleware/       # Express middleware
│   │   ├── utils/            # Utility functions
│   │   ├── config/           # Configuration files
│   │   └── websockets/       # WebSocket handlers
│   ├── toolchains/           # Compiler toolchains
│   ├── arduino-cores/        # Arduino core libraries
│   ├── libraries/            # Arduino libraries
│   ├── temp/                 # Temporary compilation files
│   └── executables/          # Compiled firmware storage
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API and WebSocket services
│   │   └── styles/           # CSS styles
│   └── public/               # Static assets
└── docker/                   # Docker configuration
```

## API Endpoints

### Boards
- `GET /api/embedded/boards` - List all supported boards
- `GET /api/embedded/boards/:boardId` - Get board details
- `GET /api/embedded/boards/:boardId/libraries` - Get board libraries

### Compilation
- `POST /api/embedded/compile` - Compile code (verify only)
- `POST /api/embedded/upload` - Compile and upload to board

### Devices
- `GET /api/devices` - List connected serial devices
- `GET /api/devices/:port/info` - Get device information
- `POST /api/devices/refresh` - Refresh device list

### Serial
- `POST /api/serial/connect` - Connect to serial port
- `POST /api/serial/disconnect` - Disconnect from serial port
- `POST /api/serial/send` - Send data to serial port
- `GET /api/serial/status/:port` - Get connection status

### WebSocket Events
- `ws://server/ws/compile` - Compilation progress updates
- `ws://server/ws/serial?port=<port>` - Serial data streaming

## Security

- Input validation and sanitization
- Rate limiting on API endpoints
- Docker-based compilation sandboxing
- Resource limits (CPU, memory, time)
- Path traversal prevention
- Serial port access control

## Troubleshooting

### Port Permission Issues (Linux)
```bash
sudo usermod -a -G dialout $USER
# Logout and login again
```

### Upload Fails
- Check board is connected and port is correct
- Try pressing reset button before uploading
- Verify board type matches selected board
- Check USB cable (data cable, not charge-only)

### Compilation Errors
- Verify toolchain is installed correctly
- Check Arduino cores are in correct directories
- Review error messages in terminal output

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: <repository-url>/issues
- Documentation: <repository-url>/wiki

## Acknowledgments

- Arduino Project
- Espressif ESP32
- STMicroelectronics STM32
- Monaco Editor
- Node.js SerialPort