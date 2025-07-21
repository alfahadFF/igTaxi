# IGTaxi - تطبيق تاكسي ذكي 🚗

تطبيق تاكسي شامل مبني بـ React Native و Expo يوفر خدمات متنوعة للنقل والتوصيل.

## ✨ المميزات

### 🚖 خدمات النقل
- طلب تاكسي فوري
- حجز رحلات مجدولة
- تتبع الرحلة في الوقت الفعلي
- تقييم السائقين

### 🏪 خدمات إضافية
- توصيل الطعام
- توصيل الغاز
- توصيل المياه
- خدمات الصيدلية
- التسوق والتوصيل

### 💰 النظام المالي
- محفظة رقمية
- نقاط الولاء
- عروض وخصومات
- تحويل الأموال

### 🛡️ الأمان والسلامة
- تتبع GPS دقيق
- زر الطوارئ
- تسجيل الرحلات
- تحقق الهوية

## 🛠️ التقنيات المستخدمة

- **Frontend**: React Native + Expo
- **Navigation**: Expo Router
- **Maps**: React Native Maps
- **Backend**: Supabase
- **State Management**: React Context
- **Styling**: StyleSheet + Theme System
- **Internationalization**: react-i18next

## 📱 بناء التطبيق للأندرويد

### المتطلبات الأساسية
- Node.js 18+
- Android Studio
- Java Development Kit (JDK) 11+

### التثبيت السريع
```bash
# استنساخ المشروع
git clone <repository-url>
cd igtaxi-app

# تثبيت المكتبات
npm install

# تشغيل التطبيق
npm start
```

### بناء APK

#### الطريقة الأولى: استخدام الـ Script
```bash
# على Windows
./build-android.bat

# على Linux/macOS
./build-android.sh
```

#### الطريقة الثانية: الأوامر المباشرة
```bash
# للتطوير
npx expo run:android

# للإنتاج (يتطلب EAS CLI)
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## 📂 هيكل المشروع

```
├── app/                    # شاشات التطبيق
│   ├── (tabs)/            # التبويبات الرئيسية
│   ├── auth/              # شاشات المصادقة
│   ├── trips/             # إدارة الرحلات
│   └── services/          # الخدمات المختلفة
├── components/            # المكونات القابلة لإعادة الاستخدام
├── constants/             # الثوابت والإعدادات
├── contexts/              # Context providers
├── hooks/                 # Custom hooks
├── utils/                 # المساعدات والأدوات
└── assets/               # الصور والملفات
```

## 🔧 الإعداد والتكوين

### 1. إعداد قاعدة البيانات (Supabase)
- قم بإنشاء مشروع جديد في Supabase
- استخدم الملفات في مجلد `supabase/` لإعداد الجداول
- أضف مفاتيح API في ملف البيئة

### 2. إعداد الخرائط (Google Maps)
- احصل على Google Maps API Key
- أضف المفتاح في `app.json` تحت `android.config.googleMaps.apiKey`

### 3. إعداد الإشعارات
```bash
npx expo install expo-notifications
```

## 🚀 التشغيل والاختبار

### تشغيل التطبيق
```bash
# تشغيل في وضع التطوير
npm start

# تشغيل على الأندرويد
npm run android

# تشغيل مع تنظيف الكاش
npx expo r -c
```

### الاختبار على الأجهزة
```bash
# على المحاكي
npx expo run:android

# على جهاز حقيقي
npx expo run:android --device
```

## 📋 المهام المكتملة

✅ إزالة منطق الويب والملفات غير الضرورية  
✅ تحديث إعدادات Metro للأندرويد فقط  
✅ إصلاح imports للخرائط  
✅ إعداد ملفات البناء (EAS)  
✅ إنشاء scripts البناء  
✅ تحديث التكوينات  

## 🔄 الخطوات التالية

1. **اختبار التطبيق**: تأكد من عمل جميع الميزات
2. **إضافة Google Maps API Key**: للخرائط والموقع
3. **إعداد Supabase**: قاعدة البيانات والمصادقة
4. **بناء APK**: استخدم EAS أو البناء المحلي
5. **الاختبار الشامل**: على أجهزة مختلفة
6. **النشر**: Google Play Store أو التوزيع المباشر

## 🆘 حل المشاكل

### مشكلة react-native-maps
```bash
# تأكد من وجود Google Maps API key
# تحقق من الصلاحيات في AndroidManifest.xml
```

### مشكلة البناء
```bash
# تنظيف الكاش وإعادة التثبيت
npx expo r -c
rm -rf node_modules
npm install
```

### مشكلة الصلاحيات
```bash
# تأكد من إضافة الصلاحيات في app.json
# تحقق من plugins الخاصة بالموقع والكاميرا
```

## 📞 الدعم والمساعدة

للحصول على المساعدة:
1. راجع ملف `ANDROID_BUILD_GUIDE.md` للتفاصيل
2. تحقق من المشاكل الشائعة في قسم "حل المشاكل"
3. استخدم Expo Documentation: https://docs.expo.dev/

---

**تم تحسين المشروع للأندرويد فقط وإزالة جميع الملفات والكود المتعلق بالويب** ✨

بناءً تطبيق ناجح! 🚗💨
