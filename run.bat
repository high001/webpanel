@echo off
REM Linux Server Control Panel - Run Script for Windows
REM This script helps run the application easily

echo Linux Server Control Panel - Starting...

REM Check if React build exists
if exist "build" (
    echo Production build found. Starting Flask server (serves both API and React)...
    python app.py
) else (
    echo No production build found.
    echo.
    echo To run in development mode:
    echo   Terminal 1: python app.py
    echo   Terminal 2: npm start
    echo.
    echo To build for production:
    echo   1. npm run build
    echo   2. python app.py
    echo.
    set /p BUILD="Do you want to build React app now? (y/n): "
    if /i "%BUILD%"=="y" (
        echo Building React app...
        call npm run build
        echo Build complete! Starting server...
        python app.py
    ) else (
        echo Starting Flask API only (React dev server must be started separately)...
        python app.py
    )
)

