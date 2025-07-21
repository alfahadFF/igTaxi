# 🚨 نظام الأمان والطوارئ - دليل التشغيل

## نظرة عامة

تم تطوير نظام شامل للأمان والطوارئ في تطبيق IGTaxi يهدف إلى حماية الركاب والسائقين في جميع المواقف الطارئة.

## 🎯 الميزات الرئيسية

### 1. إدارة جهات الاتصال الطارئة
- إضافة وإدارة جهات اتصال طارئة (حد أقصى 3 أساسية)
- تصنيف جهات الاتصال حسب العلاقة
- إشعارات تلقائية في حالات الطوارئ

### 2. البطاقة الطبية للطوارئ
- معلومات شخصية وطبية مفصلة
- قائمة الأدوية والحساسيات
- إمكانية الوصول للسائق في حالات الطوارئ فقط
- خصوصية كاملة مع تحكم المستخدم

### 3. نظام حوادث الطوارئ
- أنواع مختلفة من الطوارئ (طبية، أمنية، حوادث، ذعر)
- تتبع الموقع والوقت
- إشعارات فورية لجهات الاتصال
- تسجيل مفصل للحوادث

### 4. مشاركة الرحلات
- مشاركة موقع الرحلة مع الأصدقاء والعائلة
- كود مشاركة آمن مؤقت
- تتبع الموقع في الوقت الفعلي
- تنبيهات عند الوصول

### 5. إعدادات الأمان الشخصية
- تخصيص سلوك نظام الطوارئ
- إعدادات الإشعارات والصوت
- التحكم في مشاركة البيانات الطبية

## 🏗️ البنية التقنية

### قاعدة البيانات
```
📊 الجداول الرئيسية:
├── emergency_contacts (جهات الاتصال الطارئة)
├── medical_emergency_cards (البطاقات الطبية)
├── medical_conditions (الحالات الطبية)
├── current_medications (الأدوية الحالية)
├── medical_allergies (الحساسيات الطبية)
├── emergency_incidents (حوادث الطوارئ)
├── emergency_notifications (إشعارات الطوارئ)
├── safety_settings (إعدادات الأمان)
├── trip_shares (مشاركة الرحلات)
├── trip_share_recipients (مستقبلي مشاركة الرحلة)
└── trip_location_history (تاريخ مواقع الرحلة)
```

### الخدمات (Services)
```
🛠️ خدمات TypeScript:
├── emergency-contacts-service.ts
├── medical-card-service.ts
├── emergency-incident-service.ts
├── safety-settings-service.ts
└── index.ts (SafetyManager)
```

### المكونات (Components)
```
🧩 مكونات React Native:
├── SafetyContext.tsx (إدارة الحالة)
├── SOSButton.tsx (زر الطوارئ للراكب)
├── DriverEmergencyButton.tsx (زر الطوارئ للسائق)
├── MedicalCardManager.tsx (إدارة البطاقة الطبية)
├── EmergencyContactsManager.tsx (إدارة جهات الاتصال)
├── TripSharingControls.tsx (مشاركة الرحلة)
├── SafetySettings.tsx (إعدادات الأمان)
└── SafetyDemo.tsx (واجهة الاختبار)
```

## 🚀 التشغيل والنشر

### 1. نشر قاعدة البيانات
```sql
-- تشغيل ملفات SQL بالترتيب:
1. scripts/create-safety-tables.sql
2. scripts/create-safety-functions.sql
```

### 2. نشر باستخدام PowerShell
```powershell
# وضع الاختبار
.\deploy_safety_system.ps1 -SupabaseUrl "YOUR_URL" -SupabaseKey "YOUR_KEY" -TestMode

# نشر حقيقي
.\deploy_safety_system.ps1 -SupabaseUrl "YOUR_URL" -SupabaseKey "YOUR_KEY"
```

### 3. إعداد التطبيق
```typescript
// في _layout.tsx
import { SafetyProvider } from '@/contexts/SafetyContext';

export default function RootLayout() {
  return (
    <SafetyProvider>
      {/* باقي التطبيق */}
    </SafetyProvider>
  );
}
```

## 🔒 الأمان والخصوصية

### Row Level Security (RLS)
- جميع الجداول محمية بـ RLS
- كل مستخدم يرى بياناته فقط
- الوصول للبطاقة الطبية محدود بحالات الطوارئ النشطة

### تشفير البيانات
- البيانات الطبية الحساسة مشفرة
- مفاتيح الوصول مؤقتة ومحدودة
- تسجيل جميع محاولات الوصول

### أذونات الوصول
```sql
-- مثال على سياسة RLS
CREATE POLICY "Users can only access their own emergency contacts"
ON emergency_contacts FOR ALL USING (auth.uid() = user_id);
```

## 📱 الاستخدام في التطبيق

### استخدام SafetyContext
```typescript
import { useSafety } from '@/contexts/SafetyContext';

function MyComponent() {
  const { triggerSOS, createTripShare, emergencyContacts } = useSafety();
  
  const handleEmergency = async () => {
    await triggerSOS('medical', location, 'قلب');
  };
}
```

### استخدام الخدمات مباشرة
```typescript
import { emergencyContactsService, medicalCardService } from '@/utils/safety';

// إضافة جهة اتصال طارئة
const contact = await emergencyContactsService.addEmergencyContact({
  name: 'أحمد محمد',
  phone: '+966501234567',
  relationship: 'أخ',
  isPrimary: true
});

// جلب البطاقة الطبية
const medicalCard = await medicalCardService.getMedicalCard();
```

## 🧪 الاختبار

### واجهة الاختبار
- متوفرة في `app/services/safety-demo.tsx`
- اختبار جميع سيناريوهات الطوارئ
- محاكاة الحوادث والإشعارات

### اختبار الوحدة
```typescript
// مثال اختبار
describe('Emergency Contacts Service', () => {
  it('should add emergency contact', async () => {
    const contact = await emergencyContactsService.addEmergencyContact({
      name: 'Test Contact',
      phone: '+966501234567',
      relationship: 'friend',
      isPrimary: false
    });
    
    expect(contact.id).toBeDefined();
    expect(contact.name).toBe('Test Contact');
  });
});
```

## 📊 المراقبة والتحليل

### مؤشرات الأداء
- وقت استجابة نظام الطوارئ
- معدل نجاح الإشعارات
- استخدام الميزات المختلفة

### التقارير
```typescript
import { SafetyManager } from '@/utils/safety';

// جلب إحصائيات الأمان
const stats = await SafetyManager.getSafetyStatistics(userId);
```

## 🔧 الصيانة

### تنظيف البيانات
```sql
-- تشغيل دورياً لتنظيف البيانات القديمة
SELECT cleanup_old_safety_data();
```

### النسخ الاحتياطي
- نسخ احتياطي يومي لجداول الأمان
- الاحتفاظ بالنسخ لمدة 30 يوم
- اختبار استعادة البيانات شهرياً

## 🚨 إجراءات الطوارئ

### في حالة عطل النظام
1. تفعيل الوضع الآمن (Safe Mode)
2. توجيه المستخدمين للاتصال المباشر
3. تسجيل جميع الحوادث يدوياً
4. إشعار فريق الطوارئ فوراً

### استعادة الخدمة
1. التحقق من سلامة البيانات
2. اختبار جميع الوظائف الحرجة
3. إشعار المستخدمين بعودة الخدمة
4. مراجعة تقرير الحادث

## 📞 جهات الاتصال

### فريق التطوير
- **مطور النظام**: [البريد الإلكتروني]
- **مسؤول قاعدة البيانات**: [البريد الإلكتروني]
- **مدير المنتج**: [البريد الإلكتروني]

### الدعم الفني
- **خط الطوارئ**: +966-XXX-XXXX
- **البريد الإلكتروني**: emergency@igtaxi.com
- **ساعات العمل**: 24/7

---

**⚠️ تحذير هام**: هذا النظام يتعامل مع بيانات حساسة وحالات طوارئ حقيقية. يجب اختبار جميع الوظائف بدقة قبل النشر في الإنتاج.
