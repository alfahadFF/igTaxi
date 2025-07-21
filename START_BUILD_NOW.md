# 📱 البناء الفوري لـ IGTaxi APK

## 🚀 الطريقة الموصى بها - EAS Build

### الخطوة 1: إعداد EAS
```powershell
# في PowerShell/Command Prompt
npm install -g eas-cli
eas login
```

### الخطوة 2: بناء APK
```powershell
cd "c:\Users\Al Fahad\Downloads\IGTaxi\‏‏‏‏project - نسخة (2)"
eas build --platform android --profile preview
```

## 🔧 الطريقة البديلة - Expo Build (مُهملة لكن تعمل)

```powershell
cd "c:\Users\Al Fahad\Downloads\IGTaxi\‏‏‏‏project - نسخة (2)"
npx expo build:android --type apk
```

## ⚡ الطريقة المحلية - Android Studio

### المتطلبات:
- Android Studio مثبت
- Android SDK configured
- ANDROID_HOME في environment variables

### الأوامر:
```powershell
cd "c:\Users\Al Fahad\Downloads\IGTaxi\‏‏‏‏project - نسخة (2)"
npx expo run:android --variant release
```

## 🔴 إذا واجهت مشاكل

### مسح الكاش:
```powershell
npx expo r -c
rmdir /s node_modules
npm install
```

### إعادة إعداد Metro:
```powershell
npx expo install --fix
```

## 📋 الحالة الحالية

✅ المشروع جاهز للبناء
✅ ملفات التكوين صحيحة  
✅ Dependencies مثبتة
⚠️ مطلوب: تسجيل دخول Expo أو Android Studio

## 🎯 الأمر المباشر للبناء الآن:

```powershell
# إذا كان لديك حساب Expo
eas login
eas build --platform android --profile preview

# أو إذا كان Android Studio مثبت
npx expo run:android --variant release

# أو الطريقة التقليدية
npx expo build:android --type apk
```

---
**بمجرد تشغيل أحد هذه الأوامر، ستحصل على APK جاهز للتحميل!** 📲
