#!/bin/bash

# Linux Server Control Panel - Run Script
# This script helps run the application easily

echo "Linux Server Control Panel - Starting..."

# Check if React build exists
if [ -d "build" ]; then
    echo "Production build found. Starting Flask server (serves both API and React)..."
    python3 app.py
else
    echo "No production build found."
    echo ""
    echo "To run in development mode:"
    echo "  Terminal 1: python3 app.py"
    echo "  Terminal 2: npm start"
    echo ""
    echo "To build for production:"
    echo "  1. npm run build"
    echo "  2. python3 app.py"
    echo ""
    read -p "Do you want to build React app now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Building React app..."
        npm run build
        echo "Build complete! Starting server..."
        python3 app.py
    else
        echo "Starting Flask API only (React dev server must be started separately)..."
        python3 app.py
    fi
fi

