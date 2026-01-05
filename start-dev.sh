#!/bin/bash

# Development server startup script for Gantt Chart

echo "🚀 Starting Gantt Chart Development Environment"
echo ""

# Check if port 8000 is available
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8000 is already in use!"
    echo "   Please stop the process using port 8000 or modify this script to use a different port."
    exit 1
fi

echo "📦 Starting build in watch mode..."
npm run build-dev &
BUILD_PID=$!

# Wait a moment for initial build
sleep 2

echo ""
echo "🌐 Starting HTTP server on port 8000..."
echo ""
echo "✅ Development environment ready!"
echo ""
echo "📄 Test pages available at:"
echo "   • Built version:    http://localhost:8000/test.html"
echo "   • Direct source:    http://localhost:8000/test-direct.html"
echo ""
echo "💡 Tips:"
echo "   • Make changes in src/ directory"
echo "   • Watch mode will auto-rebuild"
echo "   • Refresh browser to see changes"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start HTTP server
python3 -m http.server 8000

# Cleanup on exit
kill $BUILD_PID 2>/dev/null

