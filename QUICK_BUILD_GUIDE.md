# 🚀 دليل بناء APK للأندرويد - IGTaxi

## ⚡ البناء السريع

### الطريقة الأولى: Expo Build (موصى بها)

```bash
# 1. تثبيت Expo CLI إذا لم يكن مثبت
npm install -g @expo/cli

# 2. بناء APK للاختبار
npx expo build:android --type apk

# 3. أو بناء AAB للنشر
npx expo build:android --type app-bundle
```

### الطريقة الثانية: EAS Build

```bash
# 1. تثبيت EAS CLI
npm install -g eas-cli

# 2. تسجيل الدخول (مطلوب حساب Expo)
eas login

# 3. بناء APK
eas build --platform android --profile preview

# 4. بناء للإنتاج
eas build --platform android --profile production
```

### الطريقة الثالثة: البناء المحلي (يتطلب Android Studio)

```bash
# 1. التأكد من إعداد Android SDK
npx expo install --fix

# 2. بناء وتشغيل على الأندرويد
npx expo run:android

# 3. بناء Release APK
npx expo run:android --variant release
```

## 🔧 إعداد مطلوب قبل البناء

### 1. Google Maps API Key
عدل `app.json` وأضف مفتاح Google Maps:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyC..." // ضع مفتاحك هنا
        }
      }
    }
  }
}
```

### 2. إنشاء حساب Expo (للطريقة الأولى والثانية)
- اذهب إلى: https://expo.dev
- أنشئ حساب مجاني
- استخدم `eas login` أو `expo login`

### 3. إعداد Android SDK (للطريقة الثالثة)
- تثبيت Android Studio
- تحميل Android SDK
- إعداد ANDROID_HOME environment variable

## 📱 الحصول على APK

### مع Expo Build:
```bash
# بعد البناء، ستحصل على رابط لتحميل APK
npx expo build:android --type apk
# انتظر البناء ثم احصل على الرابط من https://expo.dev
```

### مع EAS Build:
```bash
# بعد البناء الناجح
eas build --platform android --profile preview
# ستجد الرابط في EAS dashboard
```

### البناء المحلي:
```bash
# APK سيكون في مجلد
# android/app/build/outputs/apk/release/
npx expo run:android --variant release
```

## 🔍 استكشاف الأخطاء

### مشكلة: "Expo CLI not found"
```bash
npm install -g @expo/cli
```

### مشكلة: "Android SDK not found"
```bash
# تأكد من تثبيت Android Studio
# وإعداد ANDROID_HOME
```

### مشكلة: "Build failed"
```bash
# تنظيف الكاش
npx expo r -c
rm -rf node_modules
npm install
```

## 🎯 التوصية

**للمبتدئين:** استخدم الطريقة الأولى (Expo Build)
**للمطورين المتقدمين:** استخدم EAS Build
**للإنتاج:** استخدم EAS Build مع profile production

---

## 🚀 أوامر سريعة

```bash
# الأمر الواحد للبناء السريع
npx expo build:android --type apk

# مع تنظيف الكاش
npx expo r -c && npx expo build:android --type apk
```
