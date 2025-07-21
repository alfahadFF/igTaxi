-- إنشاء bucket للتسجيلات الصوتية الطارئة (مبسط)
-- هذا الإصدار يتجنب سياسات التخزين المعقدة

-- 1. إنشاء bucket التخزين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emergency-audio',
  'emergency-audio',
  false, -- خاص (ليس عام)
  10485760, -- 10MB حد أقصى للملف
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- 2. دالة مساعدة للحصول على مسار ملف التسجيل
CREATE OR REPLACE FUNCTION get_audio_file_path(user_id UUID, recording_id TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT user_id::text || '/' || recording_id || '.m4a';
$$;

-- 3. دالة مساعدة للحصول على رابط مؤقت للتسجيل المشارك
CREATE OR REPLACE FUNCTION get_shared_audio_url(recording_id TEXT, contact_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_path TEXT;
  is_authorized BOOLEAN := FALSE;
BEGIN
  -- التحقق من أن جهة الاتصال مخولة للوصول
  SELECT EXISTS (
    SELECT 1 FROM audio_recording_shares ars
    WHERE ars.recording_id = get_shared_audio_url.recording_id
    AND ars.contact_phone = get_shared_audio_url.contact_phone
    AND ars.share_status IN ('sent', 'delivered', 'opened')
  ) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RETURN NULL;
  END IF;
  
  -- الحصول على مسار الملف
  SELECT ear.file_path INTO file_path
  FROM emergency_audio_recordings ear
  WHERE ear.id = get_shared_audio_url.recording_id;
  
  IF file_path IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- إرجاع الرابط (في التطبيق الحقيقي سيكون signed URL)
  RETURN 'https://your-supabase-url.supabase.co/storage/v1/object/emergency-audio/' || file_path;
END;
$$;

-- 4. دالة للتنظيف التلقائي للتسجيلات القديمة (اختيارية)
CREATE OR REPLACE FUNCTION cleanup_old_audio_recordings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- حذف التسجيلات المحذوفة التي مر عليها أكثر من 30 يوم
  DELETE FROM emergency_audio_recordings
  WHERE status = 'deleted'
  AND deleted_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'تم تنظيف التسجيلات القديمة';
END;
$$;

-- 5. دالة للتحقق من حالة bucket التخزين
CREATE OR REPLACE FUNCTION check_audio_storage_status()
RETURNS TABLE (
    bucket_exists BOOLEAN,
    bucket_name TEXT,
    bucket_public BOOLEAN,
    bucket_file_size_limit BIGINT,
    total_recordings BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'emergency-audio') as bucket_exists,
        'emergency-audio'::TEXT as bucket_name,
        COALESCE((SELECT sb.public FROM storage.buckets sb WHERE sb.id = 'emergency-audio'), false) as bucket_public,
        COALESCE((SELECT sb.file_size_limit FROM storage.buckets sb WHERE sb.id = 'emergency-audio'), 0) as bucket_file_size_limit,
        COALESCE((SELECT COUNT(*) FROM emergency_audio_recordings), 0) as total_recordings;
END;
$$;

-- رسالة نجاح
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ تم إنشاء bucket التخزين بنجاح!';
    RAISE NOTICE '';
    RAISE NOTICE 'معلومات bucket:';
    RAISE NOTICE '• الاسم: emergency-audio';
    RAISE NOTICE '• نوع الوصول: خاص (Private)';
    RAISE NOTICE '• الحد الأقصى للملف: 10MB';
    RAISE NOTICE '• أنواع الملفات: audio/mpeg, audio/mp4, audio/m4a, audio/wav';
    RAISE NOTICE '';
    RAISE NOTICE 'الوظائف المتاحة:';
    RAISE NOTICE '• get_audio_file_path() - مسار الملف';
    RAISE NOTICE '• get_shared_audio_url() - رابط المشاركة';
    RAISE NOTICE '• cleanup_old_audio_recordings() - تنظيف التسجيلات القديمة';
    RAISE NOTICE '• check_audio_storage_status() - حالة التخزين';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ملاحظة مهمة:';
    RAISE NOTICE 'سياسات الأمان للتخزين يجب إعدادها من واجهة Supabase Dashboard';
    RAISE NOTICE 'أو باستخدام Service Role Key';
    RAISE NOTICE '';
END
$$;

-- اختبار bucket التخزين
SELECT * FROM check_audio_storage_status();

/*
ملاحظات مهمة لإعداد سياسات التخزين:

1. اذهب إلى Supabase Dashboard
2. Storage > Policies
3. أنشئ سياسات جديدة للبucket 'emergency-audio':

سياسة الرفع (INSERT):
```
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

سياسة العرض (SELECT):
```
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

سياسة التحديث (UPDATE):
```
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

سياسة الحذف (DELETE):
```
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

البنية المقترحة للملفات:
{user_id}/{recording_id}.m4a

مثال:
550e8400-e29b-41d4-a716-446655440000/emergency_20250720_001.m4a
*/
