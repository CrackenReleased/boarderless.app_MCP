@echo off
echo Starting Google Chrome in debugging mode on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\boarderless-mcp-profile" "https://boarderless.app/canvas"

