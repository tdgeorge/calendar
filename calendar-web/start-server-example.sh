#!/bin/bash

# Google Calendar Web App Server Startup Script
# This script sets the required environment variables and starts the server
# 
# INSTRUCTIONS:
# 1. Copy this file to 'start-server.sh'
# 2. Replace the placeholder credentials below with your actual Google credentials
# 3. Run: chmod +x start-server.sh
# 4. Run: ./start-server.sh [port]

# Set your Google OAuth2 credentials here
export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export GOOGLE_API_KEY="AIzaSyBxxxxxxxxxxxxxxxxxxxxx"

# Optional: Set custom port (default is 8000)
PORT=${1:-8000}

echo "======================================"
echo "  Google Calendar Web App Server"
echo "======================================"
echo "Port: $PORT"
echo "Client ID: ${GOOGLE_CLIENT_ID:0:20}..."
echo "API Key: ${GOOGLE_API_KEY:0:10}..."
echo "======================================"
echo ""

# Check if credentials are set
if [[ "$GOOGLE_CLIENT_ID" == "your-client-id.apps.googleusercontent.com" ]]; then
    echo "❌ ERROR: Please set your actual GOOGLE_CLIENT_ID in this script"
    echo "   Get your Client ID from: https://console.cloud.google.com/apis/credentials"
    exit 1
fi

if [[ "$GOOGLE_API_KEY" == "AIzaSyBxxxxxxxxxxxxxxxxxxxxx" ]]; then
    echo "❌ ERROR: Please set your actual GOOGLE_API_KEY in this script"
    echo "   Get your API Key from: https://console.cloud.google.com/apis/credentials"
    exit 1
fi

# Start the server
echo "🚀 Starting server on port $PORT..."
echo "📱 Open: http://localhost:$PORT"
echo "🛑 Press Ctrl+C to stop"
echo ""

python3 server.py "$PORT"