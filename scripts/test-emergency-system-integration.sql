-- اختبار شامل لنظام أرقام الطوارئ والربط بقاعدة البيانات
-- هذا الملف يتحقق من جميع المكونات والوظائف

-- 1. اختبار جدول أرقام الطوارئ
SELECT '🔍 اختبار جدول أرقام الطوارئ' AS test_name;
SELECT 
    country_name AS "الدولة",
    country_code AS "الرمز", 
    police_number AS "الشرطة",
    ambulance_number AS "الإسعاف",
    fire_number AS "الإطفاء",
    is_active AS "نشط"
FROM app_emergency_settings 
ORDER BY is_active DESC, country_name;

-- 2. اختبار الدول النشطة
SELECT '📍 اختبار الدولة النشطة' AS test_name;
SELECT * FROM get_active_emergency_numbers();

-- 3. اختبار دوال الحصول على أرقام الطوارئ
SELECT '📞 اختبار دوال أرقام الطوارئ' AS test_name;
SELECT 
    'police' AS type,
    get_emergency_number_by_type('police') AS number
UNION ALL
SELECT 
    'ambulance' AS type,
    get_emergency_number_by_type('ambulance') AS number
UNION ALL
SELECT 
    'fire' AS type,
    get_emergency_number_by_type('fire') AS number
UNION ALL
SELECT 
    'general' AS type,
    get_emergency_number_by_type('general') AS number;

-- 4. اختبار view البيانات النشطة
SELECT '👀 اختبار view البيانات النشطة' AS test_name;
SELECT * FROM active_emergency_info;

-- 5. اختبار وجود جداول نظام الأمان
SELECT '🛡️ اختبار جداول نظام الأمان' AS test_name;
SELECT 
    schemaname AS "Schema",
    tablename AS "جدول",
    hasindexes AS "له فهارس",
    hasrules AS "له قواعد",
    hastriggers AS "له محفزات"
FROM pg_tables 
WHERE tablename IN (
    'emergency_contacts',
    'medical_emergency_cards',
    'medical_conditions',
    'current_medications',
    'medical_allergies',
    'emergency_incidents',
    'emergency_notifications',
    'safety_settings',
    'trip_shares',
    'trip_share_recipients',
    'trip_location_history',
    'app_emergency_settings'
)
ORDER BY tablename;

-- 6. اختبار RLS policies
SELECT '🔒 اختبار سياسات RLS' AS test_name;
SELECT 
    tablename AS "جدول",
    policyname AS "اسم السياسة",
    cmd AS "نوع العملية",
    permissive AS "مسموح"
FROM pg_policies 
WHERE tablename IN (
    'emergency_contacts',
    'medical_emergency_cards',
    'emergency_incidents',
    'safety_settings',
    'trip_shares',
    'app_emergency_settings'
)
ORDER BY tablename, policyname;

-- 7. اختبار الدوال المساعدة
SELECT '⚙️ اختبار الدوال المساعدة' AS test_name;
SELECT 
    proname AS "اسم الدالة",
    pronargs AS "عدد المعاملات",
    prorettype::regtype AS "نوع الإرجاع"
FROM pg_proc 
WHERE proname IN (
    'get_active_emergency_numbers',
    'get_emergency_number_by_type',
    'is_valid_emergency_number',
    'can_access_medical_card_emergency',
    'update_updated_at_column'
)
ORDER BY proname;

-- 8. اختبار التحقق من صحة أرقام الطوارئ
SELECT '✅ اختبار التحقق من صحة الأرقام' AS test_name;
SELECT 
    '999' AS number,
    is_valid_emergency_number('999') AS valid
UNION ALL
SELECT 
    '911' AS number,
    is_valid_emergency_number('911') AS valid
UNION ALL
SELECT 
    'abc' AS number,
    is_valid_emergency_number('abc') AS valid
UNION ALL
SELECT 
    '123456789012' AS number,
    is_valid_emergency_number('123456789012') AS valid;

-- 9. اختبار تغيير الدولة النشطة (محاكاة)
SELECT '🔄 محاكاة تغيير الدولة النشطة' AS test_name;

-- حفظ الحالة الحالية
CREATE TEMP TABLE temp_current_active AS 
SELECT country_code FROM app_emergency_settings WHERE is_active = true;

-- تجربة تفعيل دولة أخرى (الإمارات مثلاً)
UPDATE app_emergency_settings SET is_active = false WHERE is_active = true;
UPDATE app_emergency_settings SET is_active = true WHERE country_code = 'AE';

-- التحقق من التغيير
SELECT 
    country_name AS "الدولة الجديدة النشطة",
    country_code AS "الرمز",
    police_number AS "الشرطة",
    ambulance_number AS "الإسعاف"
FROM app_emergency_settings 
WHERE is_active = true;

-- إرجاع الحالة الأصلية
UPDATE app_emergency_settings SET is_active = false WHERE is_active = true;
UPDATE app_emergency_settings 
SET is_active = true 
WHERE country_code = (SELECT country_code FROM temp_current_active LIMIT 1);

-- 10. اختبار إدراج بيانات أمان (محاكاة)
SELECT '💾 اختبار إدراج بيانات الأمان' AS test_name;

-- محاولة إدراج جهة اتصال طارئة (سيفشل إذا لم يكن هناك مستخدم مسجل)
DO $$
BEGIN
    -- التحقق من وجود مستخدم مسجل
    IF auth.uid() IS NOT NULL THEN
        -- محاولة إدراج جهة اتصال طارئة
        INSERT INTO emergency_contacts (
            user_id, name, phone, relationship, is_primary
        ) VALUES (
            auth.uid(), 'اختبار', '+966501234567', 'family', true
        );
        RAISE NOTICE '✅ تم إدراج جهة اتصال طارئة بنجاح';
        
        -- حذف البيانات التجريبية
        DELETE FROM emergency_contacts 
        WHERE user_id = auth.uid() AND name = 'اختبار';
        RAISE NOTICE '🗑️ تم حذف البيانات التجريبية';
    ELSE
        RAISE NOTICE '⚠️ لا يوجد مستخدم مسجل لاختبار إدراج البيانات';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في اختبار إدراج البيانات: %', SQLERRM;
END $$;

-- 11. نتيجة الاختبار الشامل
SELECT '🎉 نتيجة الاختبار الشامل' AS test_name;
SELECT 
    'نظام أرقام الطوارئ' AS component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM app_emergency_settings WHERE is_active = true)
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END AS status
UNION ALL
SELECT 
    'دوال أرقام الطوارئ' AS component,
    CASE 
        WHEN get_emergency_number_by_type('police') IS NOT NULL
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END AS status
UNION ALL
SELECT 
    'جداول نظام الأمان' AS component,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE '%emergency%' OR tablename LIKE '%safety%' OR tablename LIKE '%medical%') >= 5
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END AS status
UNION ALL
SELECT 
    'سياسات RLS' AS component,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('app_emergency_settings', 'emergency_contacts')) >= 2
        THEN '✅ يعمل'
        ELSE '❌ لا يعمل'
    END AS status;
