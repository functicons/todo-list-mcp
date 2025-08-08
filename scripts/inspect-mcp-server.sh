#!/bin/bash

# inspect-mcp-server.sh
#
# This script launches the MCP Inspector to debug and inspect the todo-list-mcp server.
# The inspector provides a web-based interface to test tools and examine server capabilities.

set -e

echo "=================================================="
echo "Todo List MCP - Server Inspector"
echo "=================================================="
echo ""

# Default server path
SERVER_PATH="$(dirname "$0")/../dist/src/index.js"
SERVER_PATH="$(realpath "$SERVER_PATH")"

# Check if custom path is provided as argument
if [ $# -gt 0 ]; then
    SERVER_PATH="$1"
fi

echo "🔍 MCP Server Inspector"
echo "======================"
echo "Server path: $SERVER_PATH"
echo ""

# Check if server file exists
if [ ! -f "$SERVER_PATH" ]; then
    echo "❌ Server file not found: $SERVER_PATH"
    echo ""
    echo "Usage: $0 [server-path]"
    echo "Example: $0 /path/to/dist/src/index.js"
    echo ""
    echo "Make sure to:"
    echo "1. Build the project first: npm run build"
    echo "2. Check the server path is correct"
    echo "3. Ensure the file exists and is executable"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found"
    echo "npx comes with Node.js (version 5.2+). Please update Node.js."
    exit 1
fi

echo "⚙️  Environment Configuration"
echo "============================"

# Show current environment variables
echo "Current environment:"
echo "  TODO_DATA_STORE: ${TODO_DATA_STORE:-json (default)}"
echo "  TODO_DATA_PATH: ${TODO_DATA_PATH:-~/.todo-list-mcp (default)}"
echo ""

# Offer to set environment variables
echo "📝 Storage Configuration"
echo "======================="
echo "You can configure storage before inspection:"
echo ""
echo "JSON Storage (default):"
echo "  export TODO_DATA_STORE=json"
echo ""
echo "SQLite Storage:"
echo "  export TODO_DATA_STORE=sqlite"
echo ""
echo "Custom data path:"
echo "  export TODO_DATA_PATH=/path/to/your/data"
echo ""

read -p "Press Enter to continue with current settings, or Ctrl+C to exit and configure... "
echo ""

echo "🚀 Launching MCP Inspector"
echo "========================="
echo ""
echo "The MCP Inspector will:"
echo "  ✓ Start a web server (usually on http://localhost:3000)"
echo "  ✓ Launch your default browser"
echo "  ✓ Connect to the todo-list-mcp server"
echo "  ✓ Show available tools and allow testing"
echo ""
echo "In the inspector you can:"
echo "  • View all available MCP tools"
echo "  • Test tool parameters and responses"
echo "  • Debug server communication"
echo "  • Inspect tool schemas and validation"
echo ""
echo "Starting inspector..."
echo ""

# Launch the MCP inspector
exec npx @modelcontextprotocol/inspector node "$SERVER_PATH"