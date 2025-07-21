#!/bin/bash

# IGTaxi Android APK Build Script
echo "🚗 IGTaxi Android Build Script"
echo "=============================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Expo CLI is installed globally
if ! command -v npx expo &> /dev/null; then
    echo "📱 Installing Expo CLI..."
    npm install -g @expo/cli
fi

echo "✅ Expo CLI is ready"

# Clear cache
echo "🧹 Clearing cache..."
npx expo r -c

# Check if Android Studio is installed
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if [ ! -d "/Applications/Android Studio.app" ]; then
        echo "⚠️  Android Studio not found. Please install Android Studio first."
        echo "   Download from: https://developer.android.com/studio"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    if [ ! -d "/c/Program Files/Android/Android Studio" ]; then
        echo "⚠️  Android Studio not found. Please install Android Studio first."
        echo "   Download from: https://developer.android.com/studio"
    fi
fi

# Ask user which build type they want
echo ""
echo "Choose build type:"
echo "1) Development build (for testing)"
echo "2) Production APK (for distribution)"
echo "3) Local development run"
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🔨 Building development APK..."
        npx expo run:android --variant debug
        ;;
    2)
        echo "🔨 Building production APK..."
        # Check if EAS CLI is installed
        if ! command -v eas &> /dev/null; then
            echo "📱 Installing EAS CLI..."
            npm install -g eas-cli
        fi
        
        echo "Please make sure you're logged in to Expo:"
        eas login
        
        echo "Building production APK with EAS..."
        eas build --platform android --profile preview
        ;;
    3)
        echo "🔨 Running local development build..."
        npx expo run:android
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Build process completed!"
echo ""
echo "📋 Next steps:"
echo "   - If you built an APK, you can find it in the EAS dashboard"
echo "   - For local builds, the app should be installed on your connected device/emulator"
echo "   - Make sure to test all features before distributing"
echo ""
echo "🚗 Happy coding with IGTaxi!"
