#!/bin/bash
# Development server setup script

echo "=== Calendar Web App Development Setup ==="
echo ""

# Check if environment variables are set
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_API_KEY" ]; then
    echo "⚠️  Environment variables not set!"
    echo ""
    echo "Please set your Google API credentials:"
    echo "  export GOOGLE_CLIENT_ID='your-client-id-here'"
    echo "  export GOOGLE_API_KEY='your-api-key-here'"
    echo ""
    echo "Or create a .env file with:"
    echo "  GOOGLE_CLIENT_ID=your-client-id-here"
    echo "  GOOGLE_API_KEY=your-api-key-here"
    echo ""
    
    # Check for .env file
    if [ -f ".env" ]; then
        echo "📁 Found .env file, loading..."
        export $(cat .env | xargs)
    else
        echo "❌ No .env file found and environment variables not set"
        echo ""
        echo "To get your Google API credentials:"
        echo "1. Go to https://console.cloud.google.com/"
        echo "2. Create a new project or select existing"
        echo "3. Enable Google Calendar API"
        echo "4. Create OAuth 2.0 Client ID credentials"
        echo "5. Create an API Key"
        exit 1
    fi
fi

echo "✅ Environment variables configured"
echo "   CLIENT_ID: ${GOOGLE_CLIENT_ID:0:20}..."
echo "   API_KEY: ${GOOGLE_API_KEY:0:20}..."
echo ""

# Start the development server
echo "🚀 Starting development server..."
cd calendar-web
python3 server.py 8000