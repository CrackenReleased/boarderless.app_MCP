#!/bin/bash
# setup.sh
# Boarderless MCP Setup Utility for macOS and Linux (Ubuntu)

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}   Boarderless MCP Installer & Configurator   ${NC}"
echo -e "${CYAN}==========================================${NC}\n"

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}[!] Node.js was not found on your system.${NC}"
    echo "This tool requires Node.js (v18+) to run."
    
    # Check OS type to recommend package manager
    if [[ "$OSTYPE" == "darwin"* ]]; then
        read -p "Would you like to install Node.js via Homebrew? (y/n): " install_node
        if [[ $install_node =~ ^[Yy]$ ]]; then
            if ! command -v brew &> /dev/null; then
                echo -e "${YELLOW}Homebrew not found. Installing Homebrew first...${NC}"
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            echo -e "${GREEN}Installing Node.js...${NC}"
            brew install node
        else
            echo -e "${RED}[!] Setup cancelled. Please install Node.js manually.${NC}"
            exit 1
        fi
    else
        # Linux (Ubuntu/Debian) check
        read -p "Would you like to install Node.js via apt? (y/n): " install_node
        if [[ $install_node =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}Installing Node.js...${NC}"
            sudo apt-get update
            sudo apt-get install -y nodejs npm
        else
            echo -e "${RED}[!] Setup cancelled. Please install Node.js manually.${NC}"
            exit 1
        fi
    fi
fi

# 2. Install dependencies
echo -e "${CYAN}[*] Installing Node.js dependencies...${NC}"
npm install

# 3. Configure Claude Desktop and print Cursor info
echo -e "\n${CYAN}[*] Configuring developer clients...${NC}"
node setup.js

# Ensure launch scripts are executable
chmod +x ./launch-chrome-debugging.sh

# 4. Optional Launch
echo "------------------------------------------"
read -p "Would you like to launch Chrome in Remote Debugging mode now? (y/n): " launch_now
if [[ $launch_now =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Launching Google Chrome on port 9222...${NC}"
    ./launch-chrome-debugging.sh &
fi

echo -e "\n${GREEN}✓ Setup completed successfully! You can now use Boarderless with your AI clients.${NC}"
