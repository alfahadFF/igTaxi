-- اختبار نظام التسجيل الصوتي للطوارئ
-- هذا الملف لاختبار أن جميع الجداول والوظائف تعمل بشكل صحيح

-- 1. التحقق من وجود الجداول
SELECT 
    'emergency_audio_recordings' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_audio_recordings') 
         THEN '✅ موجود' 
         ELSE '❌ غير موجود' 
    END as status
UNION ALL
SELECT 
    'audio_recording_shares' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_recording_shares') 
         THEN '✅ موجود' 
         ELSE '❌ غير موجود' 
    END as status
UNION ALL
SELECT 
    'audio_processing_queue' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_processing_queue') 
         THEN '✅ موجود' 
         ELSE '❌ غير موجود' 
    END as status
UNION ALL
SELECT 
    'audio_recording_analytics' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audio_recording_analytics') 
         THEN '✅ موجود' 
         ELSE '❌ غير موجود' 
    END as status;

-- 2. التحقق من أنواع البيانات المخصصة
SELECT 
    typname as type_name,
    '✅ موجود' as status
FROM pg_type 
WHERE typname IN (
    'emergency_recording_type',
    'emergency_level', 
    'recording_status',
    'share_method_type',
    'share_status_type',
    'processing_type_enum',
    'processing_status_enum'
)
ORDER BY typname;

-- 3. التحقق من الوظائف المساعدة
SELECT 
    routine_name as function_name,
    '✅ موجودة' as status
FROM information_schema.routines
WHERE routine_name IN (
    'create_emergency_recording',
    'share_emergency_recording', 
    'get_user_recording_stats',
    'update_recording_timestamp'
)
ORDER BY routine_name;

-- 4. التحقق من الفهارس
SELECT 
    indexname as index_name,
    tablename as table_name,
    '✅ موجود' as status
FROM pg_indexes 
WHERE tablename IN (
    'emergency_audio_recordings',
    'audio_recording_shares', 
    'audio_processing_queue'
)
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 5. اختبار إنشاء تسجيل تجريبي (سيفشل إذا لم تكن مسجل دخول)
DO $$
BEGIN
    -- محاولة إنشاء تسجيل تجريبي
    RAISE NOTICE 'محاولة إنشاء تسجيل تجريبي...';
    
    -- التحقق من أن auth.uid() متاح
    IF auth.uid() IS NOT NULL THEN
        PERFORM create_emergency_recording(
            'test_recording_' || extract(epoch from now())::text,
            NULL,
            'manual',
            'test_file.m4a',
            '/test/path/test_file.m4a',
            30,
            NULL,
            NULL,
            'medium',
            '{"test": true}'::jsonb
        );
        RAISE NOTICE '✅ تم إنشاء تسجيل تجريبي بنجاح';
    ELSE
        RAISE NOTICE '⚠️ auth.uid() غير متاح - تخطي اختبار إنشاء التسجيل';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ خطأ في إنشاء التسجيل التجريبي: %', SQLERRM;
END
$$;

-- 6. عرض إحصائيات النظام
SELECT 
    'إجمالي التسجيلات' as metric,
    COUNT(*)::text as value
FROM emergency_audio_recordings
UNION ALL
SELECT 
    'إجمالي المشاركات' as metric,
    COUNT(*)::text as value  
FROM audio_recording_shares
UNION ALL
SELECT 
    'عمليات المعالجة' as metric,
    COUNT(*)::text as value
FROM audio_processing_queue
UNION ALL
SELECT 
    'سجلات الإحصائيات' as metric,
    COUNT(*)::text as value
FROM audio_recording_analytics;

-- 7. التحقق من RLS (Row Level Security)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✅ مفعل' ELSE '❌ غير مفعل' END as status
FROM pg_tables 
WHERE tablename IN (
    'emergency_audio_recordings',
    'audio_recording_shares',
    'audio_processing_queue', 
    'audio_recording_analytics'
)
ORDER BY tablename;

-- 8. عرض السياسات الأمنية
SELECT 
    schemaname,
    tablename, 
    policyname,
    '✅ موجودة' as status
FROM pg_policies
WHERE tablename IN (
    'emergency_audio_recordings',
    'audio_recording_shares',
    'audio_processing_queue',
    'audio_recording_analytics'  
)
ORDER BY tablename, policyname;

-- رسالة نهائية
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 اكتمل اختبار نظام التسجيل الصوتي!';
    RAISE NOTICE '📋 تحقق من النتائج أعلاه للتأكد من سلامة الإعداد';
    RAISE NOTICE '';
    RAISE NOTICE 'الخطوات التالية:';
    RAISE NOTICE '1. إنشاء bucket التخزين: emergency-audio';
    RAISE NOTICE '2. اختبار واجهة المستخدم';
    RAISE NOTICE '3. اختبار رفع وتنزيل الملفات';
    RAISE NOTICE '';
END
$$;
