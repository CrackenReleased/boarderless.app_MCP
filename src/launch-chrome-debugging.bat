@echo off
echo [Boarderless] Detecting Chromium-based browser...
set PROFILE=%LOCALAPPDATA%\boarderless-mcp-profile
set TARGET=https://boarderless.app/canvas
set ARGS=--remote-debugging-port=9222 --user-data-dir="%PROFILE%" "%TARGET%"

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %ARGS%
    goto :done
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" %ARGS%
    goto :done
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" %ARGS%
    goto :done
)
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" %ARGS%
    goto :done
)
if exist "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe" %ARGS%
    goto :done
)
if exist "%LOCALAPPDATA%\Programs\Opera\opera.exe" (
    start "" "%LOCALAPPDATA%\Programs\Opera\opera.exe" %ARGS%
    goto :done
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %ARGS%
    goto :done
)

echo [!] Could not find Chrome, Brave, Opera, or Edge. Please open your browser manually
echo     and visit: %TARGET%
pause
goto :eof

:done
echo [OK] Browser launched with remote debugging on port 9222.

