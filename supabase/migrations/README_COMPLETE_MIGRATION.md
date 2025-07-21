# دليل ملفات الترحيل لتطبيق IGTaxi

## نظرة عامة
هذا الدليل يوضح ترتيب وتشغيل ملفات الترحيل (migrations) لقاعدة بيانات تطبيق IGTaxi.

## الملف الرئيسي الشامل
**`20250720_complete_igtaxi_system.sql`** - ملف ترحيل شامل يحتوي على جميع النماذج والمكونات

## الأنظمة المغطاة

### 1. إدارة المستخدمين والملفات الشخصية
- `profiles` - الملفات الشخصية الأساسية
- `personal_profiles` - ملفات الأفراد الشخصية
- `driver_profiles` - ملفات السائقين مع تفاصيل المركبات
- `business_profiles` - ملفات الشركات والأعمال

### 2. نظام التاكسي والرحلات
- `vehicle_types` - أنواع المركبات والأسعار
- `trips` - رحلات التاكسي
- `trip_offers` - عروض السائقين للرحلات

### 3. نظام النقل والشحن
- `cargo_types` - أنواع الشحن والأسعار
- `transport_requests` - طلبات النقل

### 4. نظام المطاعم وتوصيل الطعام
- `food_categories` - فئات الطعام
- `menu_items` - عناصر القائمة
- `food_orders` - طلبات الطعام
- `food_order_items` - عناصر طلبات الطعام

### 5. نظام الصيدليات
- `medication_categories` - فئات الأدوية
- `pharmacy_products` - المنتجات الصيدلانية
- `pharmacy_orders` - طلبات الصيدلية
- `pharmacy_order_items` - عناصر طلبات الصيدلية

### 6. نظام محطات الوقود
- `fuel_services` - خدمات محطات الوقود
- `fuel_orders` - طلبات الوقود والخدمات

### 7. نظام المواقف
- `parking_spaces` - مساحات الإيقاف
- `parking_bookings` - حجوزات المواقف

### 8. نظام الفعاليات الخاصة
- `event_types` - أنواع الفعاليات
- `event_bookings` - حجوزات الفعاليات

### 9. نظام التقييمات والمراجعات
- `ratings` - التقييمات العامة لجميع الخدمات

### 10. نظام الإشعارات
- `notifications` - إشعارات المستخدمين

### 11. نظام المدفوعات
- `transactions` - المعاملات المالية

## المميزات التقنية

### الفهارس (Indexes)
- فهارس جغرافية لتحسين استعلامات الموقع
- فهارس على الحقول المستخدمة بكثرة
- فهارس على المفاتيح الخارجية

### أمان البيانات (RLS)
- سياسات أمان على مستوى الصفوف
- حماية البيانات الشخصية
- تحكم في الوصول حسب نوع المستخدم

### الدوال والمحفزات
- `update_updated_at_column()` - تحديث تاريخ التعديل تلقائياً
- `calculate_distance()` - حساب المسافة بين نقطتين
- `calculate_trip_fare()` - حساب سعر الرحلة
- `update_driver_rating()` - تحديث تقييم السائق
- `send_notification()` - إرسال الإشعارات

## كيفية التشغيل

### الطريقة الأولى: تشغيل الملف الشامل
```sql
-- تشغيل الملف الشامل في Supabase SQL Editor
\i 20250720_complete_igtaxi_system.sql
```

### الطريقة الثانية: باستخدام Supabase CLI
```bash
# رفع الترحيل إلى قاعدة البيانات
supabase db push

# أو تشغيل ملف محدد
supabase db reset --include-all
```

### الطريقة الثالثة: من لوحة التحكم
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى الملف والصقه
4. اضغط Run

## التحقق من نجاح التثبيت

```sql
-- عرض جميع الجداول المنشأة
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN tablename LIKE '%profiles%' THEN 'User Management'
        WHEN tablename LIKE '%trip%' OR tablename LIKE '%vehicle%' THEN 'Taxi System'
        WHEN tablename LIKE '%transport%' OR tablename LIKE '%cargo%' THEN 'Transport System'
        WHEN tablename LIKE '%food%' OR tablename LIKE '%menu%' THEN 'Food Delivery'
        WHEN tablename LIKE '%pharmacy%' OR tablename LIKE '%medication%' THEN 'Pharmacy System'
        WHEN tablename LIKE '%fuel%' THEN 'Fuel Services'
        WHEN tablename LIKE '%parking%' THEN 'Parking System'
        WHEN tablename LIKE '%event%' THEN 'Special Events'
        WHEN tablename LIKE '%rating%' THEN 'Rating System'
        WHEN tablename LIKE '%notification%' THEN 'Notification System'
        WHEN tablename LIKE '%transaction%' THEN 'Payment System'
        ELSE 'Other'
    END as system_module
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY system_module, tablename;

-- التحقق من البيانات الأولية
SELECT COUNT(*) as vehicle_types_count FROM public.vehicle_types;
SELECT COUNT(*) as food_categories_count FROM public.food_categories;
SELECT COUNT(*) as event_types_count FROM public.event_types;
```

## البيانات الأولية المُدرجة

### أنواع المركبات (6 أنواع)
- اقتصادي، مريح، مميز، دفع رباعي، كهربائي، فاخر

### فئات الطعام (10 فئات)
- عربي، عالمي، وجبات سريعة، مأكولات بحرية، حلويات، مشروبات، صحي، آسيوي، بيتزا، قهوة

### فئات الأدوية (10 فئات)
- مسكنات، برد وإنفلونزا، فيتامينات، إسعافات أولية، أدوية بوصفة، عناية بالأطفال، العناية بالبشرة، العناية بالأسنان، صحة المرأة، رعاية السكري

### أنواع الشحن (6 أنواع)
- طرد صغير، صندوق متوسط، قطعة كبيرة، أثاث، إلكترونيات، مستندات

### أنواع الفعاليات (6 أنواع)
- زفاف، فعاليات الشركات، نقل المطار، جولة في المدينة، النقل الطبي، جولة تسوق

## الصيانة والتحديثات

### إضافة بيانات جديدة
```sql
-- مثال: إضافة نوع مركبة جديد
INSERT INTO public.vehicle_types (name, name_ar, description, capacity, base_fare, per_km_rate, per_minute_rate, minimum_fare, fuel_type) 
VALUES ('Motorcycle', 'دراجة نارية', 'دراجة نارية سريعة للطرود الصغيرة', 1, 3.00, 1.00, 0.15, 5.00, 'petrol');
```

### تحديث الأسعار
```sql
-- مثال: تحديث أسعار المركبات
UPDATE public.vehicle_types 
SET base_fare = base_fare * 1.1, per_km_rate = per_km_rate * 1.1 
WHERE fuel_type = 'petrol';
```

## المتطلبات التقنية

### امتدادات PostgreSQL المطلوبة
- `uuid-ossp` - لتوليد المعرفات الفريدة
- `postgis` - للمعالجة الجغرافية
- `pg_trgm` - لتحسين البحث النصي

### صلاحيات قاعدة البيانات
- صلاحيات إنشاء الجداول والفهارس
- صلاحيات إنشاء الدوال والمحفزات
- صلاحيات تفعيل RLS

## الدعم والصيانة

لأي استفسارات أو مشاكل:
1. تحقق من سجلات الأخطاء في Supabase
2. تأكد من وجود جميع الامتدادات المطلوبة
3. تحقق من صلاحيات المستخدم
4. راجع سياسات RLS إذا كانت هناك مشاكل في الوصول

---

**تاريخ آخر تحديث:** 2025-07-20  
**الإصدار:** 1.0.0  
**المؤلف:** فريق تطوير IGTaxi
