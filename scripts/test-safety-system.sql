-- اختبار نظام الأمان والطوارئ
-- Safety and Emergency System Testing

-- تنظيف البيانات التجريبية (إذا وجدت)
DO $$
BEGIN
    DELETE FROM trip_location_history WHERE trip_share_id IN (
        SELECT id FROM trip_shares WHERE share_code LIKE 'TEST%'
    );
    DELETE FROM trip_share_recipients WHERE trip_share_id IN (
        SELECT id FROM trip_shares WHERE share_code LIKE 'TEST%'
    );
    DELETE FROM trip_shares WHERE share_code LIKE 'TEST%';
    DELETE FROM emergency_notifications WHERE incident_id IN (
        SELECT id FROM emergency_incidents WHERE description LIKE '%TEST%'
    );
    DELETE FROM emergency_incidents WHERE description LIKE '%TEST%';
    DELETE FROM medical_allergies WHERE card_id IN (
        SELECT id FROM medical_emergency_cards WHERE full_name LIKE '%Test%'
    );
    DELETE FROM current_medications WHERE card_id IN (
        SELECT id FROM medical_emergency_cards WHERE full_name LIKE '%Test%'
    );
    DELETE FROM medical_conditions WHERE card_id IN (
        SELECT id FROM medical_emergency_cards WHERE full_name LIKE '%Test%'
    );
    DELETE FROM medical_emergency_cards WHERE full_name LIKE '%Test%';
    DELETE FROM emergency_contacts WHERE name LIKE '%Test%';
    
    RAISE NOTICE 'تم تنظيف البيانات التجريبية';
END $$;

-- اختبار 1: التحقق من وجود الجداول
DO $$
DECLARE
    table_count INTEGER;
    required_tables TEXT[] := ARRAY[
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
        'trip_location_history'
    ];
    table_name TEXT;
BEGIN
    RAISE NOTICE 'اختبار 1: التحقق من وجود الجداول';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables 
        WHERE table_name = table_name;
        
        IF table_count = 0 THEN
            RAISE EXCEPTION 'الجدول مفقود: %', table_name;
        ELSE
            RAISE NOTICE '✓ الجدول موجود: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ جميع الجداول موجودة';
END $$;

-- اختبار 2: التحقق من الفهارس
DO $$
DECLARE
    index_count INTEGER;
    required_indexes TEXT[] := ARRAY[
        'idx_emergency_contacts_user_id',
        'idx_medical_cards_user_id',
        'idx_emergency_incidents_user_id',
        'idx_trip_shares_user_id'
    ];
    index_name TEXT;
BEGIN
    RAISE NOTICE 'اختبار 2: التحقق من الفهارس';
    
    FOREACH index_name IN ARRAY required_indexes
    LOOP
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE indexname = index_name;
        
        IF index_count = 0 THEN
            RAISE WARNING 'الفهرس مفقود: %', index_name;
        ELSE
            RAISE NOTICE '✓ الفهرس موجود: %', index_name;
        END IF;
    END LOOP;
END $$;

-- اختبار 3: التحقق من سياسات RLS
DO $$
DECLARE
    policy_count INTEGER;
    table_name TEXT;
    required_tables TEXT[] := ARRAY[
        'emergency_contacts',
        'medical_emergency_cards',
        'emergency_incidents',
        'safety_settings'
    ];
BEGIN
    RAISE NOTICE 'اختبار 3: التحقق من سياسات RLS';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE tablename = table_name;
        
        IF policy_count = 0 THEN
            RAISE WARNING 'لا توجد سياسات RLS للجدول: %', table_name;
        ELSE
            RAISE NOTICE '✓ سياسات RLS موجودة للجدول: % (% سياسة)', table_name, policy_count;
        END IF;
    END LOOP;
END $$;

-- اختبار 4: التحقق من الدوال
DO $$
DECLARE
    function_count INTEGER;
    required_functions TEXT[] := ARRAY[
        'get_primary_emergency_contacts',
        'create_emergency_incident_with_notifications',
        'get_medical_card_for_emergency',
        'create_trip_share_with_recipients',
        'cleanup_old_safety_data'
    ];
    function_name TEXT;
BEGIN
    RAISE NOTICE 'اختبار 4: التحقق من الدوال';
    
    FOREACH function_name IN ARRAY required_functions
    LOOP
        SELECT COUNT(*) INTO function_count
        FROM pg_proc 
        WHERE proname = function_name;
        
        IF function_count = 0 THEN
            RAISE WARNING 'الدالة مفقودة: %', function_name;
        ELSE
            RAISE NOTICE '✓ الدالة موجودة: %', function_name;
        END IF;
    END LOOP;
END $$;

-- اختبار 5: اختبار إنشاء بيانات تجريبية (محاكاة)
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_contact_id UUID;
    test_card_id UUID;
    test_incident_id UUID;
BEGIN
    RAISE NOTICE 'اختبار 5: محاكاة إنشاء البيانات';
    
    -- محاكاة إنشاء جهة اتصال طارئة
    INSERT INTO emergency_contacts (
        id, user_id, name, phone, relationship, is_primary
    ) VALUES (
        gen_random_uuid(), test_user_id, 'Test Contact', '+966501234567', 'family', true
    ) RETURNING id INTO test_contact_id;
    
    RAISE NOTICE '✓ تم إنشاء جهة اتصال تجريبية: %', test_contact_id;
    
    -- محاكاة إنشاء بطاقة طبية
    INSERT INTO medical_emergency_cards (
        id, user_id, full_name, date_of_birth, blood_type
    ) VALUES (
        gen_random_uuid(), test_user_id, 'Test User', '1990-01-01', 'O+'
    ) RETURNING id INTO test_card_id;
    
    RAISE NOTICE '✓ تم إنشاء بطاقة طبية تجريبية: %', test_card_id;
    
    -- محاكاة إنشاء حادثة طوارئ
    INSERT INTO emergency_incidents (
        id, user_id, incident_type, latitude, longitude, description
    ) VALUES (
        gen_random_uuid(), test_user_id, 'medical', 24.7136, 46.6753, 'TEST Emergency'
    ) RETURNING id INTO test_incident_id;
    
    RAISE NOTICE '✓ تم إنشاء حادثة طوارئ تجريبية: %', test_incident_id;
    
    -- تنظيف البيانات التجريبية
    DELETE FROM emergency_incidents WHERE id = test_incident_id;
    DELETE FROM medical_emergency_cards WHERE id = test_card_id;
    DELETE FROM emergency_contacts WHERE id = test_contact_id;
    
    RAISE NOTICE '✓ تم تنظيف البيانات التجريبية';
END $$;

-- اختبار 6: اختبار الأداء
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    RAISE NOTICE 'اختبار 6: اختبار الأداء';
    
    start_time := clock_timestamp();
    
    -- اختبار استعلام معقد
    PERFORM COUNT(*) FROM emergency_contacts ec
    JOIN medical_emergency_cards mec ON ec.user_id = mec.user_id
    WHERE ec.is_primary = true;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE '✓ وقت تنفيذ الاستعلام المعقد: %', duration;
    
    IF duration > INTERVAL '1 second' THEN
        RAISE WARNING 'الأداء بطيء - قد تحتاج لتحسين الفهارس';
    END IF;
END $$;

-- تقرير النتائج النهائي
DO $$
DECLARE
    total_tables INTEGER;
    total_indexes INTEGER;
    total_policies INTEGER;
    total_functions INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_name IN (
        'emergency_contacts', 'medical_emergency_cards', 'medical_conditions',
        'current_medications', 'medical_allergies', 'emergency_incidents',
        'emergency_notifications', 'safety_settings', 'trip_shares',
        'trip_share_recipients', 'trip_location_history'
    );
    
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_%emergency%' OR indexname LIKE 'idx_%safety%' OR indexname LIKE 'idx_%medical%';
    
    SELECT COUNT(*) INTO total_policies
    FROM pg_policies 
    WHERE tablename IN (
        'emergency_contacts', 'medical_emergency_cards', 'emergency_incidents', 'safety_settings'
    );
    
    SELECT COUNT(*) INTO total_functions
    FROM pg_proc 
    WHERE proname IN (
        'get_primary_emergency_contacts', 'create_emergency_incident_with_notifications',
        'get_medical_card_for_emergency', 'create_trip_share_with_recipients', 'cleanup_old_safety_data'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 تقرير الاختبار النهائي';
    RAISE NOTICE '============================';
    RAISE NOTICE 'الجداول المنشأة: %/11', total_tables;
    RAISE NOTICE 'الفهارس المتاحة: %', total_indexes;
    RAISE NOTICE 'سياسات الأمان: %', total_policies;
    RAISE NOTICE 'الدوال المتاحة: %/5', total_functions;
    RAISE NOTICE '';
    
    IF total_tables = 11 AND total_functions >= 5 THEN
        RAISE NOTICE '✅ نظام الأمان والطوارئ جاهز للعمل!';
    ELSE
        RAISE NOTICE '⚠️  نظام الأمان يحتاج لمراجعة - بعض المكونات مفقودة';
    END IF;
    
    RAISE NOTICE 'وقت الاختبار: %', now();
END $$;
