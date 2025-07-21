# تشغيل نظام النقل في قاعدة البيانات

## تم إصلاح الأخطاء التالية:

✅ **تم إصلاح المراجع للجداول:**
- `auth.users` → `main_profiles` 
- `profiles` → `main_profiles`

✅ **تم إصلاح RLS Policies:**
- إضافة تحويل النوع `::text` للمطابقة مع النظام الحالي
- `auth.uid() = user_id` → `auth.uid()::text = user_id::text`

✅ **تم إصلاح الـ Views:**
- `transport_requests_with_customer`
- `transport_offers_with_transporter` 
- `transport_trips_complete`

## الملفات المُحدثة:

1. **20250119_011_create_transport_system.sql** - قاعدة البيانات مُصححة
2. **utils/transport.ts** - دوال التعامل مع قاعدة البيانات
3. **types/supabase.ts** - تعريفات TypeScript محدثة
4. **README_TRANSPORT_SYSTEM.md** - التوثيق

## الآن يمكن تشغيل Migration بأمان:

```sql
-- في Supabase Dashboard أو CLI
\i 20250119_011_create_transport_system.sql
```

## التحقق من نجاح التنصيب:

```sql
-- عرض الجداول المُنشأة
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'transport%';

-- النتيجة المتوقعة:
-- transport_contracts
-- transport_offers  
-- transport_requests
-- transport_trips
-- transporter_profiles
```

## الجداول الجاهزة للاستخدام:

- ✅ **transport_requests** - طلبات النقل
- ✅ **transport_offers** - عروض الناقلين  
- ✅ **transport_trips** - رحلات النقل
- ✅ **transporter_profiles** - ملفات الناقلين
- ✅ **transport_contracts** - العقود

## العمولة ونظام المدفوعات:

- العمولة الافتراضية: **10%**
- يتم حسابها تلقائياً في جدول `transport_trips`
- دالة `calculate_commission()` متاحة لحسابات مخصصة
