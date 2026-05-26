# setup.ps1
# Boarderless MCP Setup Utility for Windows

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Boarderless MCP Installer & Configurator   " -ForegroundColor Cyan
Write-Host "==========================================`n"

# 1. Check for Node.js
$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "[!] Node.js was not found on your system." -ForegroundColor Yellow
    Write-Host "This tool requires Node.js (v18+) to run."
    $installNode = Read-Host "Would you like to install Node.js via winget? (Y/N)"
    if ($installNode -eq "Y" -or $installNode -eq "y") {
        Write-Host "Installing Node.js... Please approve any administrator prompts." -ForegroundColor Green
        winget install OpenJS.NodeJS
        Write-Host "Node.js installation completed. Please restart this terminal and run setup.ps1 again to finish." -ForegroundColor Green
        Exit
    } else {
        Write-Host "[!] Setup cancelled. Please install Node.js manually from https://nodejs.org/" -ForegroundColor Red
        Exit
    }
}

# 2. Install dependencies
Write-Host "[*] Installing Node.js dependencies..." -ForegroundColor Cyan
npm install

# 3. Configure Claude Desktop and print Cursor info
Write-Host "`n[*] Configuring developer clients..." -ForegroundColor Cyan
node setup.js

# 4. Optional Launch
Write-Host "------------------------------------------"
$launchNow = Read-Host "Would you like to launch Chrome in Remote Debugging mode now? (Y/N)"
if ($launchNow -eq "Y" -or $launchNow -eq "y") {
    Write-Host "Launching Google Chrome on port 9222..." -ForegroundColor Green
    Start-Process -FilePath ".\launch-chrome-debugging.bat"
}

Write-Host "`n✓ Setup completed successfully! You can now use Boarderless with your AI clients." -ForegroundColor Green
