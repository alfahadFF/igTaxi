# نظام العملة الديناميكي - Dynamic Currency System

## نظرة عامة

تم تطوير نظام العملة الديناميكي لتطبيق IGTaxi لضمان عرض الأسعار بالعملة المحلية الصحيحة حسب الموقع الجغرافي للمستخدم. يدعم النظام أكثر من 23 عملة مختلفة في المنطقة العربية وعدد من الدول الأخرى.

## المميزات الرئيسية

### ✅ تحديد العملة التلقائي
- يحدد النظام العملة تلقائياً بناءً على الموقع الجغرافي للمستخدم
- يستخدم خدمة BigDataCloud للحصول على معلومات الدولة من الإحداثيات
- يعرض العملة الافتراضية (دينار أردني) في حالة عدم توفر الموقع

### ✅ دعم متعدد اللغات
- أسماء العملات متوفرة بالعربية والإنجليزية
- رموز العملات معروضة بالشكل الصحيح حسب كل دولة
- دعم الكتابة من اليمين إلى اليسار (RTL)

### ✅ العملات المدعومة

#### دول الخليج العربي
- 🇸🇦 **السعودية**: ريال سعودي (ر.س - SAR)
- 🇦🇪 **الإمارات**: درهم إماراتي (د.إ - AED)
- 🇰🇼 **الكويت**: دينار كويتي (د.ك - KWD)
- 🇶🇦 **قطر**: ريال قطري (ر.ق - QAR)
- 🇧🇭 **البحرين**: دينار بحريني (د.ب - BHD)
- 🇴🇲 **عمان**: ريال عماني (ر.ع - OMR)

#### بلاد الشام
- 🇯🇴 **الأردن**: دينار أردني (د.أ - JOD) - **العملة الافتراضية**
- 🇸🇾 **سوريا**: ليرة سورية (ل.س - SYP)
- 🇱🇧 **لبنان**: ليرة لبنانية (ل.ل - LBP)
- 🇵🇸 **فلسطين**: شيكل (₪ - ILS)

#### شمال أفريقيا
- 🇪🇬 **مصر**: جنيه مصري (ج.م - EGP)
- 🇱🇾 **ليبيا**: دينار ليبي (د.ل - LYD)
- 🇹🇳 **تونس**: دينار تونسي (د.ت - TND)
- 🇩🇿 **الجزائر**: دينار جزائري (د.ج - DZD)
- 🇲🇦 **المغرب**: درهم مغربي (د.م - MAD)
- 🇸🇩 **السودان**: جنيه سوداني (ج.س - SDG)

#### دول أخرى
- 🇮🇶 **العراق**: دينار عراقي (د.ع - IQD)
- 🇹🇷 **تركيا**: ليرة تركية (₺ - TRY)
- 🇮🇷 **إيران**: ريال إيراني (﷼ - IRR)
- 🇪🇺 **أوروبا**: يورو (€ - EUR)
- 🇬🇧 **بريطانيا**: جنيه إسترليني (£ - GBP)
- 🇺🇸 **أمريكا**: دولار أمريكي ($ - USD)
- 🇨🇦 **كندا**: دولار كندي (C$ - CAD)

## الملفات والمكونات

### 📁 utils/currency.ts
```typescript
// الملف الرئيسي لنظام العملة
- getCurrencyByLocation() // تحديد العملة من الموقع
- getCurrencyByCountry() // تحديد العملة من كود الدولة
- formatCurrency() // تنسيق المبلغ مع العملة
- formatPriceRange() // تنسيق نطاق الأسعار
- getAllCurrencies() // الحصول على جميع العملات
```

### 📁 utils/currency-translations.ts
```typescript
// ترجمات العملات والدول
- getCurrencyName() // اسم العملة بلغة محددة
- getCountryName() // اسم الدولة بلغة محددة
- CURRENCY_TRANSLATIONS // قاعدة بيانات الترجمات
```

### 📱 المكونات المحدثة

#### 1. event-booking-form.tsx
- حقول إدخال الميزانية مع رمز العملة
- معلومات توضيحية عن تحديد العملة
- واجهة مستخدم محسنة للعملة

#### 2. event-offers.tsx
- عرض عروض الأسعار بالعملة الصحيحة
- حساب العمولة بالعملة المحلية
- معلومات التأكيد والدفع

#### 3. driver-event-requests.tsx
- عرض الميزانية المتوقعة بالعملة المحلية
- إدخال السعر المطلوب بالعملة الصحيحة
- معلومات العمولة والأرباح

## كيفية الاستخدام

### 1. تحديد العملة التلقائي
```typescript
import { getCurrencyByLocation, DEFAULT_CURRENCY } from '@/utils/currency';

// في useEffect
const detectCurrency = async () => {
  try {
    const location = await Location.getCurrentPositionAsync({});
    const currency = await getCurrencyByLocation(
      location.coords.latitude,
      location.coords.longitude
    );
    setCurrentCurrency(currency);
  } catch (error) {
    setCurrentCurrency(DEFAULT_CURRENCY);
  }
};
```

### 2. عرض الأسعار
```typescript
import { formatCurrency, formatPriceRange } from '@/utils/currency';

// سعر واحد
const priceText = formatCurrency(250, currentCurrency); // "250 د.أ"

// نطاق أسعار
const rangeText = formatPriceRange(200, 300, currentCurrency); // "200 - 300 د.أ"
```

### 3. واجهة المستخدم
```tsx
// عرض رمز العملة في الحقل
<View style={styles.inputContainer}>
  <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
  <TextInput
    style={[styles.input, styles.inputWithCurrency]}
    placeholder="أدخل المبلغ"
    keyboardType="numeric"
  />
</View>
```

## الأنماط CSS

```typescript
// أنماط العملة
currencySymbol: {
  position: 'absolute',
  left: 12,
  fontSize: 16,
  fontFamily: 'Poppins-SemiBold',
  color: '#F5B800',
  zIndex: 1,
},
inputWithCurrency: {
  paddingLeft: 40, // مساحة لرمز العملة
},
currencyInfo: {
  marginTop: 12,
  padding: 12,
  backgroundColor: 'rgba(245, 184, 0, 0.05)',
  borderRadius: 8,
  borderLeftWidth: 4,
  borderLeftColor: '#F5B800',
}
```

## الخدمات الخارجية

### BigDataCloud Reverse Geocoding API
```
GET https://api.bigdatacloud.net/data/reverse-geocode-client
Parameters:
- latitude: خط العرض
- longitude: خط الطول
- localityLanguage: en

Response:
{
  "countryCode": "JO",
  "countryName": "Jordan",
  ...
}
```

## معالجة الأخطاء

1. **فشل في الحصول على الموقع**: استخدام العملة الافتراضية (دينار أردني)
2. **فشل في خدمة التحديد الجغرافي**: استخدام العملة الافتراضية
3. **عملة غير مدعومة**: استخدام العملة الافتراضية

## التطوير المستقبلي

### المميزات المخطط لها
- [ ] تحويل العملات باستخدام أسعار الصرف الحية
- [ ] حفظ تفضيلات العملة للمستخدم
- [ ] دعم المزيد من العملات العالمية
- [ ] إعدادات اختيار العملة يدوياً
- [ ] تاريخ تقلبات أسعار العملات

### التحسينات المطلوبة
- [ ] تحسين سرعة تحديد العملة
- [ ] إضافة خيار تجاوز تحديد الموقع
- [ ] تحسين واجهة المستخدم للعملات
- [ ] إضافة اختبارات وحدة للنظام

## الأمان والخصوصية

- ✅ **لا يتم حفظ بيانات الموقع**: يتم استخدام الموقع فقط لتحديد العملة
- ✅ **طلب الأذونات**: يطلب النظام إذن الوصول للموقع من المستخدم
- ✅ **العمل بدون موقع**: النظام يعمل حتى لو رفض المستخدم مشاركة الموقع
- ✅ **خدمة آمنة**: استخدام BigDataCloud للتحديد الجغرافي (خدمة موثوقة)

## الدعم الفني

للمساعدة أو الإبلاغ عن مشاكل في نظام العملة:
1. تحقق من أن أذونات الموقع مفعلة
2. تأكد من الاتصال بالإنترنت
3. راجع console.log للأخطاء
4. تحقق من أن الدولة مدعومة في قائمة العملات

---

**آخر تحديث**: يوليو 2025  
**الإصدار**: 1.0.0  
**المطور**: IGTaxi Development Team
