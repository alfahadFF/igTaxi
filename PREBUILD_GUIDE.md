# 🚀 بناء APK باستخدام Expo Prebuild

## الطريقة البديلة - إنشاء مشروع أندرويد محلي

### الخطوة 1: Prebuild
```bash
cd "c:\Users\Al Fahad\Downloads\IGTaxi\‏‏‏‏project - نسخة (2)"
npx expo prebuild --platform android
```

### الخطوة 2: بناء APK محلياً
```bash
cd android
./gradlew assembleRelease
```

### الخطوة 3: العثور على APK
```
APK سيكون في: android/app/build/outputs/apk/release/app-release.apk
```

## أو استخدام Expo Development Build

### الخطوة 1: إنشاء Development Build
```bash
npx expo install expo-dev-client
eas build --profile development --platform android
```

### الخطوة 2: بناء Production
```bash
eas build --profile production --platform android
```

## متطلبات النظام:
- Node.js 18+
- Android Studio أو Android SDK
- Java 11+

## إعداد Android SDK:
1. تحميل Android Studio
2. تثبيت Android SDK (API 34)
3. إعداد ANDROID_HOME environment variable
4. إضافة platform-tools إلى PATH

## Environment Variables:
```bash
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools
```
