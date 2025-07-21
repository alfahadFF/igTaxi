-- اختبار سريع لنظام الأمان
-- Quick Safety System Test

-- اختبار 1: التحقق من وجود الجداول
SELECT 
    'الجداول الموجودة' as test_name,
    COUNT(*) as result,
    '11 متوقع' as expected
FROM information_schema.tables 
WHERE table_name IN (
    'emergency_contacts', 'medical_emergency_cards', 'medical_conditions',
    'current_medications', 'medical_allergies', 'emergency_incidents',
    'emergency_notifications', 'safety_settings', 'trip_shares',
    'trip_share_recipients', 'trip_location_history'
);

-- اختبار 2: التحقق من تفعيل RLS
SELECT 
    'جداول RLS مفعلة' as test_name,
    COUNT(*) as result,
    '11 متوقع' as expected
FROM pg_tables 
WHERE tablename IN (
    'emergency_contacts', 'medical_emergency_cards', 'medical_conditions',
    'current_medications', 'medical_allergies', 'emergency_incidents',
    'emergency_notifications', 'safety_settings', 'trip_shares',
    'trip_share_recipients', 'trip_location_history'
) AND rowsecurity = true;

-- اختبار 3: التحقق من السياسات
SELECT 
    'سياسات الأمان' as test_name,
    COUNT(*) as result,
    'متعددة متوقعة' as expected
FROM pg_policies 
WHERE tablename IN (
    'emergency_contacts', 'medical_emergency_cards', 'medical_conditions',
    'current_medications', 'medical_allergies', 'emergency_incidents',
    'safety_settings', 'trip_shares'
);

-- اختبار 4: التحقق من الفهارس
SELECT 
    'الفهارس المنشأة' as test_name,
    COUNT(*) as result,
    'متعددة متوقعة' as expected
FROM pg_indexes 
WHERE indexname LIKE 'idx_%emergency%' 
   OR indexname LIKE 'idx_%medical%' 
   OR indexname LIKE 'idx_%safety%'
   OR indexname LIKE 'idx_%trip_%';

-- اختبار 5: التحقق من الأنواع المخصصة
SELECT 
    'الأنواع المخصصة' as test_name,
    COUNT(*) as result,
    '3 متوقع' as expected
FROM pg_type 
WHERE typname IN ('incident_type_enum', 'priority_enum', 'severity_enum');

-- عرض تفاصيل الجداول
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = table_name 
            AND rowsecurity = true
        ) THEN '✅ RLS مفعل'
        ELSE '❌ RLS معطل'
    END as rls_status,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE tablename = table_name
    ) as policies_count
FROM information_schema.tables 
WHERE table_name IN (
    'emergency_contacts', 'medical_emergency_cards', 'medical_conditions',
    'current_medications', 'medical_allergies', 'emergency_incidents',
    'emergency_notifications', 'safety_settings', 'trip_shares',
    'trip_share_recipients', 'trip_location_history'
)
ORDER BY table_name;
