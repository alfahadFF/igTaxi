# 📱 دليل بناء APK شامل لـ IGTaxi

## 🚨 المشكلة الحالية: بيئة التطوير غير مكتملة

### ❌ ما هو مفقود:
- Android SDK غير مثبت
- Java Development Kit (JDK) غير مثبت
- Android Studio غير مثبت

## 🛠️ الحلول المتاحة:

### الحل الأول: EAS Build (موصى بها - لا يتطلب Android Studio)

#### 1. إنشاء حساب Expo مجاني:
- اذهب إلى: https://expo.dev
- سجل حساب جديد

#### 2. تسجيل الدخول:
```cmd
cd "c:\Users\Al Fahad\Downloads\IGTaxi\‏‏‏‏project - نسخة (2)"
eas login
```

#### 3. بناء APK:
```cmd
eas build --platform android --profile preview
```

#### 4. تحميل APK:
- ستحصل على رابط لتحميل APK من https://expo.dev

---

### الحل الثاني: إعداد بيئة التطوير المحلية

#### 1. تحميل وتثبيت Java JDK 11:
- اذهب إلى: https://www.oracle.com/java/technologies/javase-jdk11-downloads.html
- حمل وثبت JDK 11

#### 2. تحميل وتثبيت Android Studio:
- اذهب إلى: https://developer.android.com/studio
- حمل وثبت Android Studio
- افتح Android Studio وثبت Android SDK

#### 3. إعداد Environment Variables:
```cmd
# إضافة إلى PATH:
ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-11
```

#### 4. بناء APK محلياً:
```cmd
cd "c:\Users\Al Fahad\Downloads\IGTaxi\‏‏‏‏project - نسخة (2)"
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

---

### الحل الثالث: بناء سحابي بديل

#### 1. GitHub Actions (مجاني):
- رفع المشروع إلى GitHub
- استخدام GitHub Actions للبناء

#### 2. AppCenter (Microsoft):
- رفع المشروع إلى App Center
- بناء تلقائي

---

## 🎯 التوصية الفورية:

**استخدم الحل الأول (EAS Build)** لأنه:
- ✅ لا يتطلب تثبيت أي برامج إضافية
- ✅ سريع ومباشر
- ✅ مجاني للاستخدام الشخصي
- ✅ ينتج APK جاهز للتوزيع

## 📋 الخطوات المطلوبة الآن:

1. **إنشاء حساب Expo** (5 دقائق)
2. **تسجيل الدخول** (`eas login`)
3. **بناء APK** (`eas build --platform android --profile preview`)
4. **تحميل APK** من الرابط المرسل

**الوقت المتوقع: 15-20 دقيقة** ⏱️

---

## 🔗 روابط مفيدة:

- [Expo Account Signup](https://expo.dev/signup)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android Studio Download](https://developer.android.com/studio)
- [Java JDK Download](https://www.oracle.com/java/technologies/javase-jdk11-downloads.html)

---

**المشروع جاهز للبناء! كل ما تحتاجه هو اختيار الحل المناسب لك.** 🚀
