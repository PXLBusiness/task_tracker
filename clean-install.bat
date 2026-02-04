@echo off
echo ========================================
echo Time Tracker - Clean Install
echo ========================================
echo.

echo Step 1: Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules
    echo [OK] Removed node_modules
) else (
    echo [OK] node_modules doesn't exist
)

echo.
echo Step 2: Removing package-lock.json...
if exist package-lock.json (
    del package-lock.json
    echo [OK] Removed package-lock.json
) else (
    echo [OK] package-lock.json doesn't exist
)

echo.
echo Step 3: Installing fresh dependencies...
call npm install

echo.
echo Step 4: Checking installation...
if exist node_modules\electron (
    echo [OK] Electron installed successfully
    echo.
    echo ========================================
    echo Installation complete!
    echo Run: npm start
    echo ========================================
) else (
    echo [ERROR] Installation failed
    echo Please check the errors above
)

echo.
pause
