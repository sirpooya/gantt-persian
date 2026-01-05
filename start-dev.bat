@echo off
REM Development server startup script for Windows

echo 🚀 Starting Gantt Chart Development Environment
echo.

echo 📦 Starting build in watch mode...
start "Build Watch" cmd /k "npm run build-dev"

timeout /t 3 /nobreak >nul

echo.
echo 🌐 Starting HTTP server on port 8000...
echo.
echo ✅ Development environment ready!
echo.
echo 📄 Test pages available at:
echo    • Built version:    http://localhost:8000/test.html
echo    • Direct source:    http://localhost:8000/test-direct.html
echo.
echo 💡 Tips:
echo    • Make changes in src/ directory
echo    • Watch mode will auto-rebuild
echo    • Refresh browser to see changes
echo.
echo Press Ctrl+C to stop the server
echo.

python -m http.server 8000

