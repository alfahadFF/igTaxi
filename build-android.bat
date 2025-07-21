@echo off
REM IGTaxi Android APK Build Script for Windows
echo 🚗 IGTaxi Android Build Script
echo ==============================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if Expo CLI is available
npx expo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📱 Installing Expo CLI...
    npm install -g @expo/cli
)

echo ✅ Expo CLI is ready

REM Clear cache
echo 🧹 Clearing cache...
npx expo r -c

REM Check for Android Studio (common installation paths)
if not exist "C:\Program Files\Android\Android Studio" (
    if not exist "%LOCALAPPDATA%\Android\Sdk" (
        echo ⚠️  Android SDK not found. Please install Android Studio first.
        echo    Download from: https://developer.android.com/studio
    )
)

echo.
echo Choose build type:
echo 1) Development build (for testing)
echo 2) Production APK (for distribution)
echo 3) Local development run
set /p choice=Enter your choice (1-3): 

if "%choice%"=="1" (
    echo 🔨 Building development APK...
    npx expo run:android --variant debug
) else if "%choice%"=="2" (
    echo 🔨 Building production APK...
    
    REM Check if EAS CLI is installed
    eas --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo 📱 Installing EAS CLI...
        npm install -g eas-cli
    )
    
    echo Please make sure you're logged in to Expo:
    eas login
    
    echo Building production APK with EAS...
    eas build --platform android --profile preview
) else if "%choice%"=="3" (
    echo 🔨 Running local development build...
    npx expo run:android
) else (
    echo ❌ Invalid choice. Please run the script again.
    pause
    exit /b 1
)

echo.
echo ✅ Build process completed!
echo.
echo 📋 Next steps:
echo    - If you built an APK, you can find it in the EAS dashboard
echo    - For local builds, the app should be installed on your connected device/emulator
echo    - Make sure to test all features before distributing
echo.
echo 🚗 Happy coding with IGTaxi!
pause
