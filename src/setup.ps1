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

# Check for WebView2 Runtime (required by the Boarderless MCP GUI)
$webview2Key = "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$webview2Key2 = "HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
$webview2Installed = (Test-Path $webview2Key) -or (Test-Path $webview2Key2)
if (-not $webview2Installed) {
    Write-Host "" 
    Write-Host "[!] Microsoft WebView2 Runtime was not detected on your system." -ForegroundColor Yellow
    Write-Host "    The Boarderless MCP launcher requires WebView2 to display its interface."
    Write-Host "    Download it free from: https://developer.microsoft.com/microsoft-edge/webview2/" -ForegroundColor Cyan
    $openBrowser = Read-Host "Would you like to open that page now? (Y/N)"
    if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
        Start-Process "https://developer.microsoft.com/microsoft-edge/webview2/"
        Write-Host "Please install WebView2, then re-run this setup." -ForegroundColor Green
        Exit
    }
    Write-Host "[*] Continuing setup — the launcher window may appear blank without WebView2." -ForegroundColor Yellow
    Write-Host ""
}

# Run the interactive Node-based configurator
node "$PSScriptRoot\setup.js"

# Copy/Update the launcher in the root directory
$targetExe = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\src-tauri\target\release\app.exe"))
$destExe   = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\Boarderless MCP.exe"))

try {
    if (Test-Path $targetExe) {
        Copy-Item $targetExe $destExe -Force
        Write-Host "[✓] Boarderless MCP.exe updated in the root directory." -ForegroundColor Green
    } else {
        Write-Host "[!] Compiled binary app.exe not found. Run 'npm run tauri build' to compile the GUI client." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[!] Failed to copy Boarderless MCP.exe to root directory: $_" -ForegroundColor Yellow
}



