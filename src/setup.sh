#!/bin/bash
# setup.sh
# Boarderless MCP Setup Utility for macOS and Linux (Ubuntu)

# Text colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

# Ensure launch scripts are executable
chmod +x ./launch-chrome-debugging.sh 2>/dev/null || true

# Run the interactive Node-based configurator
node setup.js
