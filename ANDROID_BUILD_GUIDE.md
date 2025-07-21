# دليل بناء تطبيق IGTaxi للأندرويد

## 1. إعداد البيئة

### متطلبات النظام:
- Node.js 18+ 
- Android Studio
- Java Development Kit (JDK) 11+
- Expo CLI

### تثبيت المتطلبات:
```bash
npm install -g @expo/cli
npm install -g eas-cli
```

## 2. إعداد Expo Application Services (EAS)

```bash
# تسجيل الدخول إلى Expo
eas login

# إعداد EAS Build
eas build:configure
```

## 3. بناء APK محلياً

### خيار 1: بناء Development APK
```bash
npx expo run:android
```

### خيار 2: بناء Production APK باستخدام EAS
```bash
eas build --platform android --profile production
```

### خيار 3: بناء APK محلي (بدون EAS)
```bash
npx expo build:android
```

## 4. إعداد التوقيع للتطبيق

إنشاء keystore:
```bash
keytool -genkeypair -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

## 5. ملفات التكوين

### app.json - التكوين الأساسي:
```json
{
  "expo": {
    "name": "IGTaxi",
    "slug": "igtaxi-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "igtaxi",
    "userInterfaceStyle": "automatic",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.igtaxi.app",
      "versionCode": 1
    }
  }
}
```

### eas.json - إعدادات EAS Build:
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

## 6. أوامر البناء

### بناء للاختبار (APK):
```bash
eas build --platform android --profile preview
```

### بناء للإنتاج (AAB):
```bash
eas build --platform android --profile production
```

### بناء محلي:
```bash
npx expo run:android --variant release
```

## 7. اختبار التطبيق

### على المحاكي:
```bash
npx expo run:android
```

### على جهاز حقيقي:
```bash
npx expo run:android --device
```

## 8. حل المشاكل الشائعة

### مشكلة react-native-maps:
- تأكد من إضافة Google Maps API key
- تحقق من permissions في AndroidManifest.xml

### مشكلة البناء:
```bash
# تنظيف cache
npx expo r -c
rm -rf node_modules
npm install
```

### مشكلة الصلاحيات:
- تأكد من إضافة صلاحيات الموقع
- تحقق من إعدادات Android في app.json

## 9. نشر التطبيق

### Google Play Store:
1. إنشاء حساب مطور
2. رفع AAB file
3. إضافة الوصف والصور
4. إرسال للمراجعة

### توزيع مباشر:
- استخدم APK file للتوزيع المباشر
- يمكن إرسال الرابط للمستخدمين

## الأوامر السريعة:

```bash
# تشغيل التطبيق في وضع التطوير
npm start

# بناء APK للاختبار
eas build --platform android --profile preview

# بناء APK محلياً
npx expo run:android --variant release

# تنظيف المشروع
npx expo r -c
```
