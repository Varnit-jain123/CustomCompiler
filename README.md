#  Online C Compiler

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **GCC Compiler** (gcc/g++)

### Installing GCC

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install build-essential
gcc --version
```

#### macOS
```bash
xcode-select --install
gcc --version
```

#### Windows
1. Install [MinGW-w64](https://www.mingw-w64.org/)
2. Or use Chocolatey: `choco install mingw`
3. Add to PATH: `C:\MinGW\bin`

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/online-c-compiler.git
cd online-c-compiler
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create `.env` file in backend directory:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
```

Create `.env` file in frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Running the Application

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Server will start on `http://localhost:5000`

### Start Frontend (Terminal 2)
```bash
cd frontend
npm start
```
App will open on `http://localhost:3000`

## 📁 Project Structure