-- إنشاء bucket للتسجيلات الصوتية الطارئة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emergency-audio',
  'emergency-audio',
  false, -- خاص (ليس عام)
  10485760, -- 10MB حد أقصى للملف
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;

-- سياسة الأمان للتحميل - المستخدمون يمكنهم رفع تسجيلاتهم الخاصة فقط
CREATE POLICY "Users can upload their own audio recordings" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'emergency-audio' 
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- سياسة الأمان للعرض - المستخدمون يمكنهم رؤية تسجيلاتهم الخاصة فقط
CREATE POLICY "Users can view their own audio recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'emergency-audio' 
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- سياسة الأمان للتحديث - المستخدمون يمكنهم تحديث تسجيلاتهم الخاصة فقط
CREATE POLICY "Users can update their own audio recordings" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'emergency-audio' 
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- سياسة الأمان للحذف - المستخدمون يمكنهم حذف تسجيلاتهم الخاصة فقط
CREATE POLICY "Users can delete their own audio recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'emergency-audio' 
  AND (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- سياسة خاصة للوصول المشارك - جهات الاتصال الطارئة يمكنها الوصول للتسجيلات المشاركة معها
CREATE POLICY "Emergency contacts can access shared recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'emergency-audio' 
  AND EXISTS (
    SELECT 1 FROM audio_recording_shares ars
    JOIN emergency_audio_recordings ear ON ars.recording_id = ear.id
    WHERE ear.file_path LIKE '%' || name || '%'
    AND ars.contact_phone = (
      SELECT phone FROM emergency_contacts 
      WHERE user_id = auth.uid() 
      LIMIT 1
    )
    AND ars.share_status IN ('sent', 'delivered', 'opened')
  )
);

-- إنشاء مجلد فرعي للمستخدم الحالي (مثال)
-- هذا سيتم تنفيذه من التطبيق عند أول تسجيل
-- البنية: emergency-audio/{user_id}/{recording_id}.m4a

-- فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_user 
ON storage.objects (bucket_id, ((string_to_array(name, '/'))[1]));

-- دالة مساعدة للحصول على مسار ملف التسجيل
CREATE OR REPLACE FUNCTION get_audio_file_path(user_id UUID, recording_id TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT user_id::text || '/' || recording_id || '.m4a';
$$;

-- دالة مساعدة للحصول على رابط مؤقت للتسجيل المشارك
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

-- دالة للتنظيف التلقائي للتسجيلات القديمة (اختيارية)
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
  
  -- تنظيف ملفات التخزين المتطابقة (يحتاج تنفيذ إضافي)
  -- هذا مثال فقط - يحتاج ربط مع Supabase Storage API
END;
$$;

-- إعداد تشغيل التنظيف التلقائي (اختياري)
-- يمكن تشغيله عبر cron job أو Edge Functions
-- ملاحظة: يحتاج تمكين pg_cron extension أولاً
DO $$
BEGIN
    -- التحقق من وجود امتداد pg_cron
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cleanup-old-audio-recordings',
            '0 2 * * 0', -- كل أحد في الساعة 2 صباحاً
            'SELECT cleanup_old_audio_recordings();'
        );
        RAISE NOTICE 'تم جدولة التنظيف التلقائي للتسجيلات القديمة';
    ELSE
        RAISE NOTICE 'امتداد pg_cron غير متاح - تخطي جدولة التنظيف التلقائي';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'تعذر إعداد التنظيف التلقائي: %', SQLERRM;
END
$$;

-- تعليقات ومراجع مهمة:
/*
هيكل التخزين المقترح:
emergency-audio/
├── {user_id_1}/
│   ├── emergency_20241201_001.m4a
│   ├── emergency_20241201_002.m4a
│   └── ...
├── {user_id_2}/
│   ├── emergency_20241201_003.m4a
│   └── ...
└── ...

مميزات الإعداد:
1. التخزين منظم حسب المستخدم
2. سياسات أمان صارمة
3. إمكانية المشاركة المحكومة
4. تنظيف تلقائي للملفات القديمة
5. فهرسة لتحسين الأداء

التكامل مع التطبيق:
- استخدم emergencyAudioService.uploadRecording() للرفع
- استخدم emergencyAudioService.downloadRecording() للتنزيل
- الملفات محمية ويمكن الوصول إليها فقط من خلال التطبيق
*/
