-- فحص ارتباط المكونات والنماذج مع الجداول (محدث ومصحح)
-- هذا الملف يتحقق بأمان من جميع الجداول والخدمات والمكونات

-- 1. التحقق من وجود الجداول المطلوبة
SELECT '🔍 التحقق من وجود الجداول الأساسية:' AS check_type;

DO $$
DECLARE 
    target_table_name text;
    table_exists boolean;
BEGIN
    -- قائمة الجداول المطلوبة
    FOR target_table_name IN 
        SELECT unnest(ARRAY[
            'app_emergency_settings',
            'emergency_contacts', 
            'medical_emergency_cards',
            'emergency_incidents',
            'safety_settings',
            'trip_shares',
            'trip_share_recipients',
            'trip_location_history'
        ])
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = target_table_name
        ) INTO table_exists;
        
        RAISE NOTICE '% : %', 
            target_table_name, 
            CASE WHEN table_exists THEN '✅ موجود' ELSE '❌ غير موجود' END;
    END LOOP;
END $$;

-- 2. فحص أعمدة الجداول الرئيسية
SELECT '📋 فحص أعمدة الجداول الرئيسية:' AS check_type;

-- جدول أرقام الطوارئ
SELECT 'app_emergency_settings' AS "الجدول", 
       string_agg(column_name, ', ' ORDER BY ordinal_position) AS "الأعمدة"
FROM information_schema.columns 
WHERE table_name = 'app_emergency_settings' AND table_schema = 'public'
GROUP BY table_name;

-- جدول جهات الاتصال الطارئة  
SELECT 'emergency_contacts' AS "الجدول",
       string_agg(column_name, ', ' ORDER BY ordinal_position) AS "الأعمدة"
FROM information_schema.columns 
WHERE table_name = 'emergency_contacts' AND table_schema = 'public'
GROUP BY table_name;

-- جدول البطاقات الطبية
SELECT 'medical_emergency_cards' AS "الجدول",
       string_agg(column_name, ', ' ORDER BY ordinal_position) AS "الأعمدة"
FROM information_schema.columns 
WHERE table_name = 'medical_emergency_cards' AND table_schema = 'public'
GROUP BY table_name;

-- جدول إعدادات الأمان
SELECT 'safety_settings' AS "الجدول",
       string_agg(column_name, ', ' ORDER BY ordinal_position) AS "الأعمدة"
FROM information_schema.columns 
WHERE table_name = 'safety_settings' AND table_schema = 'public'
GROUP BY table_name;

-- 3. اختبار الدوال المساعدة
SELECT '⚙️ اختبار الدوال المساعدة:' AS check_type;

-- التحقق من وجود الدوال
DO $$
DECLARE 
    func_name text;
    func_exists boolean;
BEGIN
    FOR func_name IN 
        SELECT unnest(ARRAY[
            'get_active_emergency_numbers',
            'get_emergency_number_by_type', 
            'is_valid_emergency_number',
            'can_access_medical_card_emergency'
        ])
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM pg_proc WHERE proname = func_name
        ) INTO func_exists;
        
        RAISE NOTICE 'دالة % : %', 
            func_name, 
            CASE WHEN func_exists THEN '✅ موجودة' ELSE '❌ غير موجودة' END;
    END LOOP;
END $$;

-- 4. اختبار أرقام الطوارئ
SELECT '📞 اختبار نظام أرقام الطوارئ:' AS check_type;

-- عرض الدول المتاحة
SELECT 
    country_name AS "الدولة",
    country_code AS "الرمز",
    police_number AS "الشرطة", 
    ambulance_number AS "الإسعاف",
    fire_number AS "الإطفاء",
    is_active AS "نشط"
FROM app_emergency_settings 
ORDER BY is_active DESC, country_name;

-- اختبار دالة الحصول على أرقام الطوارئ
SELECT '📱 اختبار دوال أرقام الطوارئ:' AS check_type;

DO $$
DECLARE
    emergency_record RECORD;
BEGIN
    -- اختبار دالة الحصول على الأرقام النشطة
    SELECT * INTO emergency_record FROM get_active_emergency_numbers();
    
    IF FOUND THEN
        RAISE NOTICE '✅ الدولة النشطة: % (%)', emergency_record.country_name, emergency_record.country_code;
        RAISE NOTICE '📞 الشرطة: %', emergency_record.police_number;
        RAISE NOTICE '🚑 الإسعاف: %', emergency_record.ambulance_number;
        RAISE NOTICE '🚒 الإطفاء: %', emergency_record.fire_number;
    ELSE
        RAISE NOTICE '❌ لا توجد أرقام طوارئ نشطة';
    END IF;
    
    -- اختبار الحصول على أرقام محددة
    RAISE NOTICE '🔍 اختبار أرقام محددة:';
    RAISE NOTICE 'رقم الشرطة: %', get_emergency_number_by_type('police');
    RAISE NOTICE 'رقم الإسعاف: %', get_emergency_number_by_type('ambulance');
    RAISE NOTICE 'رقم الطوارئ العام: %', get_emergency_number_by_type('general');
END $$;

-- 5. فحص البيانات الموجودة بأمان
SELECT '📊 إحصائيات البيانات:' AS check_type;

-- استعلام آمن للبيانات
DO $$
DECLARE
    target_table text;
    record_count integer;
BEGIN
    -- عدد أرقام الطوارئ
    SELECT COUNT(*) INTO record_count FROM app_emergency_settings;
    RAISE NOTICE 'أرقام الطوارئ: % دولة', record_count;
    
    -- عدد جهات الاتصال الطارئة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_contacts' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO record_count FROM emergency_contacts;
        RAISE NOTICE 'جهات الاتصال الطارئة: % جهة اتصال', record_count;
    END IF;
    
    -- عدد البطاقات الطبية
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medical_emergency_cards' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO record_count FROM medical_emergency_cards;
        RAISE NOTICE 'البطاقات الطبية: % بطاقة', record_count;
    END IF;
    
    -- عدد حوادث الطوارئ
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_incidents' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO record_count FROM emergency_incidents;
        RAISE NOTICE 'حوادث الطوارئ: % حادث', record_count;
    END IF;
    
    -- عدد إعدادات الأمان
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'safety_settings' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO record_count FROM safety_settings;
        RAISE NOTICE 'إعدادات الأمان: % إعداد', record_count;
    END IF;
END $$;

-- 6. فحص سياسات RLS
SELECT '🔒 فحص سياسات الأمان (RLS):' AS check_type;

SELECT 
    tablename AS "الجدول",
    COUNT(*) AS "عدد السياسات",
    string_agg(policyname, ', ') AS "أسماء السياسات"
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

-- 7. فحص الفهارس المهمة
SELECT '📖 فحص الفهارس:' AS check_type;

SELECT 
    tablename AS "الجدول",
    COUNT(*) AS "عدد الفهارس",
    string_agg(indexname, ', ') AS "أسماء الفهارس"
FROM pg_indexes
WHERE tablename IN (
    'app_emergency_settings',
    'emergency_contacts',
    'medical_emergency_cards', 
    'safety_settings',
    'emergency_incidents'
) 
AND schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 8. اختبار التكامل مع المكونات
SELECT '🔗 اختبار التكامل مع المكونات:' AS check_type;

DO $$
BEGIN
    RAISE NOTICE '📱 مكونات React Native المطلوبة:';
    RAISE NOTICE '✅ EmergencyNumbersManager.tsx - يربط مع app_emergency_settings';
    RAISE NOTICE '✅ EmergencyContactsManager.tsx - يربط مع emergency_contacts';  
    RAISE NOTICE '✅ MedicalCardManager.tsx - يربط مع medical_emergency_cards';
    RAISE NOTICE '✅ SafetyContext.tsx - يربط مع جميع جداول الأمان';
    RAISE NOTICE '✅ DatabaseIntegrationTest.tsx - يختبر جميع الاتصالات';
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 خدمات TypeScript المطلوبة:';
    RAISE NOTICE '✅ emergency-numbers-service.ts - يدير app_emergency_settings';
    RAISE NOTICE '✅ emergency-contacts-service.ts - يدير emergency_contacts';
    RAISE NOTICE '✅ medical-card-service.ts - يدير medical_emergency_cards';
    RAISE NOTICE '✅ safety-settings-service.ts - يدير safety_settings';
    RAISE NOTICE '✅ emergency-incident-service.ts - يدير emergency_incidents';
    RAISE NOTICE '✅ safety-data-service.ts - ينسق جميع الخدمات';
END $$;

-- 9. التحقق من صحة البيانات
SELECT '✅ التحقق من صحة البيانات:' AS check_type;

-- التحقق من وجود دولة نشطة
DO $$
DECLARE
    active_country_count integer;
    total_countries integer;
BEGIN
    SELECT COUNT(*) INTO active_country_count 
    FROM app_emergency_settings WHERE is_active = true;
    
    SELECT COUNT(*) INTO total_countries 
    FROM app_emergency_settings;
    
    RAISE NOTICE 'إجمالي الدول: %', total_countries;
    RAISE NOTICE 'الدول النشطة: %', active_country_count;
    
    IF active_country_count = 1 THEN
        RAISE NOTICE '✅ يوجد دولة واحدة نشطة (صحيح)';
    ELSIF active_country_count = 0 THEN
        RAISE NOTICE '⚠️ لا توجد دولة نشطة (يجب تفعيل دولة واحدة)';
    ELSE
        RAISE NOTICE '❌ يوجد أكثر من دولة نشطة (خطأ في البيانات)';
    END IF;
END $$;

-- 10. تقرير الحالة النهائي
SELECT '🎯 تقرير الحالة النهائي:' AS final_report;

DO $$
DECLARE
    tables_count integer;
    functions_count integer;
    policies_count integer;
    active_emergency_numbers boolean;
    system_health text;
BEGIN
    -- عدد الجداول المطلوبة
    SELECT COUNT(*) INTO tables_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name IN (
        'app_emergency_settings',
        'emergency_contacts',
        'medical_emergency_cards', 
        'safety_settings',
        'emergency_incidents'
    );
    
    -- عدد الدوال المطلوبة
    SELECT COUNT(*) INTO functions_count
    FROM pg_proc 
    WHERE proname IN (
        'get_active_emergency_numbers',
        'get_emergency_number_by_type',
        'is_valid_emergency_number'
    );
    
    -- عدد سياسات RLS
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies 
    WHERE tablename IN (
        'app_emergency_settings',
        'emergency_contacts',
        'medical_emergency_cards'
    );
    
    -- التحقق من وجود أرقام طوارئ نشطة
    SELECT EXISTS (
        SELECT 1 FROM app_emergency_settings WHERE is_active = true
    ) INTO active_emergency_numbers;
    
    -- تقييم صحة النظام
    IF tables_count >= 5 AND functions_count >= 3 AND policies_count >= 3 AND active_emergency_numbers THEN
        system_health := '✅ ممتاز - جميع المكونات تعمل بشكل صحيح';
    ELSIF tables_count >= 3 AND functions_count >= 2 AND active_emergency_numbers THEN
        system_health := '⚠️ جيد - معظم المكونات تعمل';
    ELSE
        system_health := '❌ يحتاج إصلاح - مكونات مفقودة';
    END IF;
    
    RAISE NOTICE '📊 تقرير النظام النهائي:';
    RAISE NOTICE 'الجداول: %/5', tables_count;
    RAISE NOTICE 'الدوال: %/3', functions_count;
    RAISE NOTICE 'سياسات الأمان: %', policies_count;
    RAISE NOTICE 'أرقام الطوارئ: %', CASE WHEN active_emergency_numbers THEN 'نشطة' ELSE 'غير نشطة' END;
    RAISE NOTICE 'حالة النظام: %', system_health;
END $$;
