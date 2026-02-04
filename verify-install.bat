@echo off
echo Checking Time Tracker files...
echo.

echo Checking preload.js for uuid dependency...
findstr /C:"uuid" preload.js >nul
if %errorlevel%==0 (
    echo [ERROR] preload.js contains 'uuid' - YOU HAVE THE OLD VERSION
    echo Please delete this folder and extract the latest zip file again.
) else (
    echo [OK] preload.js does not contain uuid dependency
)

echo.
echo Checking renderer.js for generateUUID function...
findstr /C:"generateUUID" renderer.js >nul
if %errorlevel%==0 (
    echo [OK] renderer.js has generateUUID function
) else (
    echo [ERROR] renderer.js missing generateUUID - OLD VERSION
)

echo.
echo Checking if node_modules exists...
if exist node_modules (
    echo [OK] node_modules folder exists
) else (
    echo [ERROR] node_modules missing - run: npm install
)

echo.
echo Checking if Electron is installed...
if exist node_modules\electron (
    echo [OK] Electron is installed
) else (
    echo [ERROR] Electron not installed - run: npm install
)

echo.
echo ===================================
echo If you see any [ERROR] messages above:
echo 1. DELETE this entire folder
echo 2. Extract time-tracker-phase1-final.zip to a NEW folder
echo 3. Run: npm install
echo 4. Run: npm start
echo ===================================
pause
