# setup.ps1
# Boarderless MCP Setup Utility for Windows

# Check for Node.js
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

# Run the interactive Node-based configurator
node setup.js
