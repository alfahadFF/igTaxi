# دليل ترتيب تشغيل ملفات قاعدة البيانات

## الترتيب الصحيح لتشغيل ملفات الهجرة:

### 1. الملفات الأساسية (بالترتيب):
```bash
# 1. النظام الأساسي للملفات الشخصية
20250119_002_create_main_profiles_system.sql

# 2. إصلاح السياسات والمحفزات الموجودة
20250119_010_fix_existing_policies.sql

# 3. إنشاء جدول taxi_drivers
20250119_009_fix_taxi_drivers_table.sql

# 4. نظام التسعير (يتطلب وجود taxi_drivers)
20250119_008_create_pricing_system.sql

# 5. باقي الجداول (حسب الحاجة)
20250119_001_create_businesses.sql
20250119_003_create_restaurant_tables.sql
20250119_004_create_fuel_station_tables.sql
20250119_005_create_parking_tables.sql
20250119_006_create_shopping_pharmacy_tables.sql
20250119_007_create_common_system_tables.sql
```

### 2. الملفات القديمة (للمرجع فقط):
```bash
create_personal_profiles.sql
add_driver_fields.sql
create_ratings_tables.sql
```

## تشغيل الملفات باستخدام Supabase CLI:

```bash
# تشغيل جميع الملفات بالترتيب
supabase db reset

# أو تشغيل ملف واحد
supabase db push --dry-run
supabase db push
```

## تشغيل الملفات باستخدام SQL مباشرة:

```sql
-- 1. النظام الأساسي
\i supabase/migrations/20250119_002_create_main_profiles_system.sql

-- 2. إصلاح المشاكل
\i supabase/migrations/20250119_010_fix_existing_policies.sql

-- 3. جدول التاكسي
\i supabase/migrations/20250119_009_fix_taxi_drivers_table.sql

-- 4. نظام التسعير
\i supabase/migrations/20250119_008_create_pricing_system.sql
```

## الجداول الأساسية المطلوبة لنظام التاكسي:

1. **main_profiles** - الملفات الشخصية الأساسية
2. **driver_profiles** - ملفات السائقين
3. **taxi_drivers** - بيانات سائقي التاكسي (مع نوع الوقود)
4. **trips** - جدول الرحلات
5. **pricing_config** - إعدادات التسعير
6. **driver_daily_earnings** - الأرباح اليومية
7. **driver_monthly_earnings** - الأرباح الشهرية

## المشاكل الشائعة وحلولها:

### خطأ "trigger already exists":
```sql
DROP TRIGGER IF EXISTS trigger_name ON table_name;
-- ثم إنشاء المحفز الجديد
```

### خطأ "relation does not exist":
- تأكد من تشغيل الملفات بالترتيب الصحيح
- تحقق من وجود الجداول المرجعية

### خطأ "policy already exists":
```sql
DROP POLICY IF EXISTS policy_name ON table_name;
-- ثم إنشاء السياسة الجديدة
```

## فحص حالة قاعدة البيانات:

```sql
-- فحص الجداول الموجودة
\dt

-- فحص المحفزات
SELECT * FROM information_schema.triggers;

-- فحص السياسات
SELECT * FROM pg_policies;

-- فحص الفهارس
\di
```
