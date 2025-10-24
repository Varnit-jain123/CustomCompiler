# Arduino Toolchain Setup Script for Windows

Write-Host ("=" * 60)
Write-Host "Arduino Toolchain Setup"
Write-Host ("=" * 60)
Write-Host ""

# Check if Arduino IDE is installed
$arduinoPath = "$env:LOCALAPPDATA\Arduino15"

if (Test-Path $arduinoPath) 
{
    Write-Host "✓ Arduino IDE installation found at: $arduinoPath"
} else 
{
    Write-Host "✗ Arduino IDE not found"
    Write-Host "Please install Arduino IDE from: https://www.arduino.cc/en/software"
    Write-Host ""
    $response = Read-Host "Open download page? (y/n)"
    if ($response -eq "y") {
        Start-Process "https://www.arduino.cc/en/software"
    }
    exit 1
} 

# Check Python
Write-Host ""
Write-Host "Checking Python installation..."
$pythonInstalled = Get-Command python -ErrorAction SilentlyContinue

if ($pythonInstalled) 
{
    $pythonVersion = $(python --version)
    Write-Host "✓ Python found: $pythonVersion"

    # Check esptool
    $esptoolInstalled = Get-Command esptool.py -ErrorAction SilentlyContinue

    if ($esptoolInstalled) 
    {
        Write-Host "✓ esptool.py is installed"
    } else 
    {
        Write-Host "✗ esptool.py not found"
        Write-Host "Installing esptool.py..."
        python -m pip install esptool
    }
} else 
{
    Write-Host "✗ Python not found"
    Write-Host "Please install Python from: https://www.python.org/downloads/"
    Write-Host "Make sure to check 'Add Python to PATH' during installation"
    $response = Read-Host "Open download page? (y/n)"
    if ($response -eq "y") 
    {
        Start-Process "https://www.python.org/downloads/"
    }
}

# Check ARM toolchain
Write-Host ""
Write-Host "Checking ARM toolchain..."
$armGccInstalled = Get-Command arm-none-eabi-gcc -ErrorAction SilentlyContinue

if ($armGccInstalled) 
{
    $armVersion = $(arm-none-eabi-gcc --version | Select-Object -First 1)
    Write-Host "✓ ARM toolchain found: $armVersion"
} else 
{
    Write-Host "✗ ARM toolchain not found"
    Write-Host "Please install from: https://developer.arm.com/downloads/-/gnu-rm"
    $response = Read-Host "Open download page? (y/n)"
    if ($response -eq "y") 
    {
        Start-Process "https://developer.arm.com/downloads/-/gnu-rm"
    }
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host "Setup check complete"
Write-Host "Run 'npm run verify-toolchains' to verify all toolchains"
Write-Host ("=" * 60)
