-- فحص سريع ومبسط لحالة نظام الأمان
-- هذا ملف آمن بدون متغيرات ملتبسة

-- 1. فحص الجداول الأساسية
SELECT 
    'app_emergency_settings' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_emergency_settings' AND table_schema = 'public') 
         THEN '✅ موجود' ELSE '❌ غير موجود' END as status
UNION ALL
SELECT 
    'emergency_contacts',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts' AND table_schema = 'public') 
         THEN '✅ موجود' ELSE '❌ غير موجود' END
UNION ALL
SELECT 
    'medical_emergency_cards',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_emergency_cards' AND table_schema = 'public') 
         THEN '✅ موجود' ELSE '❌ غير موجود' END
UNION ALL
SELECT 
    'safety_settings',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safety_settings' AND table_schema = 'public') 
         THEN '✅ موجود' ELSE '❌ غير موجود' END
UNION ALL
SELECT 
    'emergency_incidents',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_incidents' AND table_schema = 'public') 
         THEN '✅ موجود' ELSE '❌ غير موجود' END;

-- 2. فحص الدوال المساعدة
SELECT 
    'get_active_emergency_numbers' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_emergency_numbers') 
         THEN '✅ موجودة' ELSE '❌ غير موجودة' END as status
UNION ALL
SELECT 
    'get_emergency_number_by_type',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_emergency_number_by_type') 
         THEN '✅ موجودة' ELSE '❌ غير موجودة' END
UNION ALL
SELECT 
    'is_valid_emergency_number',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_valid_emergency_number') 
         THEN '✅ موجودة' ELSE '❌ غير موجودة' END
UNION ALL
SELECT 
    'can_access_medical_card_emergency',
    CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'can_access_medical_card_emergency') 
         THEN '✅ موجودة' ELSE '❌ غير موجودة' END;

-- 3. عرض أرقام الطوارئ المتاحة (إذا كان الجدول موجود)
SELECT 
    country_name AS "الدولة",
    country_code AS "الرمز",
    police_number AS "الشرطة", 
    ambulance_number AS "الإسعاف",
    fire_number AS "الإطفاء",
    is_active AS "نشط"
FROM app_emergency_settings 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_emergency_settings' AND table_schema = 'public')
ORDER BY is_active DESC, country_name;

-- 4. إحصائيات بسيطة
SELECT 
    'إجمالي الدول' as metric,
    COUNT(*)::text as value
FROM app_emergency_settings
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_emergency_settings' AND table_schema = 'public')
UNION ALL
SELECT 
    'الدول النشطة',
    COUNT(*)::text
FROM app_emergency_settings
WHERE is_active = true
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_emergency_settings' AND table_schema = 'public')
UNION ALL
SELECT 
    'جهات الاتصال الطارئة',
    COUNT(*)::text
FROM emergency_contacts
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts' AND table_schema = 'public')
UNION ALL
SELECT 
    'البطاقات الطبية',
    COUNT(*)::text
FROM medical_emergency_cards
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_emergency_cards' AND table_schema = 'public')
UNION ALL
SELECT 
    'حوادث الطوارئ',
    COUNT(*)::text
FROM emergency_incidents
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_incidents' AND table_schema = 'public');

-- 5. فحص سياسات RLS
SELECT 
    tablename AS "الجدول",
    COUNT(*) AS "عدد السياسات"
FROM pg_policies 
WHERE tablename IN (
    'app_emergency_settings',
    'emergency_contacts', 
    'medical_emergency_cards',
    'safety_settings',
    'emergency_incidents'
)
GROUP BY tablename
ORDER BY tablename;

-- 6. تقرير الحالة العامة
SELECT 
    '🎯 تقرير الحالة العامة' as report_title,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name IN ('app_emergency_settings', 'emergency_contacts', 'medical_emergency_cards', 'safety_settings', 'emergency_incidents')) >= 5
             AND (SELECT COUNT(*) FROM pg_proc 
                  WHERE proname IN ('get_active_emergency_numbers', 'get_emergency_number_by_type', 'is_valid_emergency_number')) >= 3
             AND EXISTS (SELECT 1 FROM app_emergency_settings WHERE is_active = true)
        THEN '✅ ممتاز - جميع المكونات تعمل بشكل صحيح'
        WHEN (SELECT COUNT(*) FROM information_schema.tables 
              WHERE table_schema = 'public'
              AND table_name IN ('app_emergency_settings', 'emergency_contacts', 'medical_emergency_cards')) >= 3
        THEN '⚠️ جيد - معظم المكونات تعمل'
        ELSE '❌ يحتاج إصلاح - مكونات مفقودة'
    END as system_status;
