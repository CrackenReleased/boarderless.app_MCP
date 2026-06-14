#!/bin/bash
echo "Starting Google Chrome in debugging mode on port 9222..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/Library/Application Support/boarderless-mcp-profile" "https://boarderless.app/canvas"
else
  # Linux fallback
  google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.boarderless-mcp-profile" "https://boarderless.app/canvas"
fi
