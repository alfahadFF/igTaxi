-- فحص شامل لارتباط المكونات والنماذج مع الجداول
-- هذا الملف يتحقق من جميع الجداول والخدمات والمكونات

-- 1. فحص جميع الجداول الموجودة
SELECT '🔍 الجداول الموجودة في قاعدة البيانات:' AS check_type;
SELECT 
    tablename AS "اسم الجدول",
    schemaname AS "المخطط",
    tableowner AS "المالك"
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename LIKE '%emergency%' 
    OR tablename LIKE '%medical%' 
    OR tablename LIKE '%safety%' 
    OR tablename LIKE '%trip%'
    OR tablename = 'app_emergency_settings'
)
ORDER BY tablename;

-- 2. فحص الأعمدة لكل جدول مهم
SELECT '📋 فحص أعمدة الجداول:' AS check_type;

-- جدول أرقام الطوارئ
SELECT 'app_emergency_settings' AS table_name, 
       column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'app_emergency_settings'
ORDER BY ordinal_position;

-- جدول جهات الاتصال الطارئة
SELECT 'emergency_contacts' AS table_name,
       column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'emergency_contacts'
ORDER BY ordinal_position;

-- جدول البطاقات الطبية
SELECT 'medical_emergency_cards' AS table_name,
       column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'medical_emergency_cards'
ORDER BY ordinal_position;

-- جدول إعدادات الأمان
SELECT 'safety_settings' AS table_name,
       column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'safety_settings'
ORDER BY ordinal_position;

-- جدول حوادث الطوارئ
SELECT 'emergency_incidents' AS table_name,
       column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'emergency_incidents'
ORDER BY ordinal_position;

-- 3. فحص الدوال المتاحة
SELECT '⚙️ الدوال المتاحة:' AS check_type;
SELECT 
    proname AS "اسم الدالة",
    pg_get_function_arguments(oid) AS "المعاملات",
    pg_get_function_result(oid) AS "نوع الإرجاع"
FROM pg_proc 
WHERE proname IN (
    'get_active_emergency_numbers',
    'get_emergency_number_by_type',
    'is_valid_emergency_number',
    'can_access_medical_card_emergency',
    'update_updated_at_column'
)
ORDER BY proname;

-- 4. فحص سياسات RLS
SELECT '🔒 سياسات الأمان (RLS):' AS check_type;
SELECT 
    tablename AS "الجدول",
    policyname AS "اسم السياسة",
    cmd AS "نوع العملية",
    permissive AS "مسموح",
    qual AS "الشرط"
FROM pg_policies 
WHERE tablename IN (
    'app_emergency_settings',
    'emergency_contacts',
    'medical_emergency_cards',
    'safety_settings',
    'emergency_incidents',
    'trip_shares'
)
ORDER BY tablename, policyname;

-- 5. اختبار البيانات الموجودة
SELECT '📊 البيانات الموجودة:' AS check_type;

-- عدد الدول في أرقام الطوارئ
SELECT 'أرقام الطوارئ' AS data_type, COUNT(*) AS count
FROM app_emergency_settings;

-- الدولة النشطة
SELECT 'الدولة النشطة' AS data_type, country_name, country_code
FROM app_emergency_settings 
WHERE is_active = true;

-- عدد جهات الاتصال الطارئة
SELECT 'جهات الاتصال الطارئة' AS data_type, COUNT(*) AS count
FROM emergency_contacts
WHERE is_active = true;

-- عدد البطاقات الطبية
SELECT 'البطاقات الطبية' AS data_type, COUNT(*) AS count
FROM medical_emergency_cards
WHERE is_visible = true;

-- عدد حوادث الطوارئ
SELECT 'حوادث الطوارئ' AS data_type, COUNT(*) AS count
FROM emergency_incidents
WHERE status = 'active';

-- 6. فحص العلاقات بين الجداول
SELECT '🔗 العلاقات بين الجداول:' AS check_type;
SELECT 
    tc.table_name AS "الجدول الابن",
    kcu.column_name AS "العمود المرجع",
    ccu.table_name AS "الجدول الأب",
    ccu.column_name AS "العمود المرجع إليه"
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN (
    'emergency_contacts',
    'medical_emergency_cards',
    'emergency_incidents',
    'trip_shares',
    'safety_settings'
)
ORDER BY tc.table_name;

-- 7. اختبار وظائف النماذج المهمة
SELECT '🧪 اختبار وظائف النماذج:' AS check_type;

-- اختبار الحصول على أرقام الطوارئ
SELECT 'اختبار get_active_emergency_numbers()' AS test_name;
SELECT * FROM get_active_emergency_numbers();

-- اختبار الحصول على رقم طوارئ محدد
SELECT 'اختبار get_emergency_number_by_type()' AS test_name;
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
    get_emergency_number_by_type('fire') AS number;

-- اختبار التحقق من صحة الأرقام
SELECT 'اختبار is_valid_emergency_number()' AS test_name;
SELECT 
    '999' AS test_number,
    is_valid_emergency_number('999') AS is_valid
UNION ALL
SELECT 
    'ABC' AS test_number,
    is_valid_emergency_number('ABC') AS is_valid;

-- 8. فحص المحفزات (Triggers)
SELECT '⚡ المحفزات المتاحة:' AS check_type;
SELECT 
    trigger_name AS "اسم المحفز",
    event_object_table AS "الجدول",
    action_timing AS "التوقيت",
    event_manipulation AS "نوع العملية"
FROM information_schema.triggers
WHERE event_object_table IN (
    'app_emergency_settings',
    'emergency_contacts',
    'medical_emergency_cards',
    'safety_settings',
    'emergency_incidents'
)
ORDER BY event_object_table, trigger_name;

-- 9. فحص الفهارس
SELECT '📖 الفهارس المتاحة:' AS check_type;
SELECT 
    schemaname AS "المخطط",
    tablename AS "الجدول",
    indexname AS "اسم الفهرس",
    indexdef AS "تعريف الفهرس"
FROM pg_indexes
WHERE tablename IN (
    'app_emergency_settings',
    'emergency_contacts',
    'medical_emergency_cards',
    'safety_settings',
    'emergency_incidents'
)
ORDER BY tablename, indexname;

-- 10. تقرير شامل عن صحة النظام
SELECT '📈 تقرير صحة النظام:' AS check_type;

-- إحصائيات شاملة
WITH table_stats AS (
    SELECT 
        'app_emergency_settings' AS table_name,
        (SELECT COUNT(*) FROM app_emergency_settings) AS total_records,
        (SELECT COUNT(*) FROM app_emergency_settings WHERE is_active = true) AS active_records
    UNION ALL
    SELECT 
        'emergency_contacts' AS table_name,
        (SELECT COUNT(*) FROM emergency_contacts) AS total_records,
        (SELECT COUNT(*) FROM emergency_contacts WHERE is_active = true) AS active_records
    UNION ALL
    SELECT 
        'medical_emergency_cards' AS table_name,
        (SELECT COUNT(*) FROM medical_emergency_cards) AS total_records,
        (SELECT COUNT(*) FROM medical_emergency_cards WHERE is_visible = true) AS active_records
    UNION ALL
    SELECT 
        'safety_settings' AS table_name,
        (SELECT COUNT(*) FROM safety_settings) AS total_records,
        (SELECT COUNT(*) FROM safety_settings WHERE emergency_services_auto_call = true) AS active_records
    UNION ALL
    SELECT 
        'emergency_incidents' AS table_name,
        (SELECT COUNT(*) FROM emergency_incidents) AS total_records,
        (SELECT COUNT(*) FROM emergency_incidents WHERE status = 'active') AS active_records
)
SELECT 
    table_name AS "الجدول",
    total_records AS "إجمالي السجلات",
    active_records AS "السجلات النشطة",
    CASE 
        WHEN total_records > 0 THEN '✅ يحتوي على بيانات'
        ELSE '⚠️ فارغ'
    END AS "الحالة"
FROM table_stats;

-- النتيجة النهائية
SELECT '🎯 نتيجة الفحص:' AS final_result;
SELECT 
    CASE 
        WHEN (
            EXISTS (SELECT 1 FROM app_emergency_settings WHERE is_active = true) AND
            EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_emergency_numbers') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_emergency_cards')
        )
        THEN '✅ جميع المكونات مربوطة بشكل صحيح'
        ELSE '❌ هناك مشاكل في الربط'
    END AS "حالة الربط",
    
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_name IN ('app_emergency_settings', 'emergency_contacts', 'medical_emergency_cards', 'safety_settings', 'emergency_incidents')
    ) AS "عدد الجداول المطلوبة",
    
    (SELECT COUNT(*) FROM pg_proc 
     WHERE proname IN ('get_active_emergency_numbers', 'get_emergency_number_by_type', 'is_valid_emergency_number')
    ) AS "عدد الدوال المتاحة";
