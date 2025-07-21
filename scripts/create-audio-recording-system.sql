-- إنشاء جداول نظام التسجيل الصوتي للطوارئ
-- هذا الملف ينشئ جداول خاصة لحفظ التسجيلات الصوتية مع البيانات الوصفية

-- أولاً: إنشاء أنواع البيانات المخصصة (ENUMs)

-- 1. أنواع التسجيل
DO $$ BEGIN
    CREATE TYPE emergency_recording_type AS ENUM (
        'manual',     -- تسجيل يدوي من المستخدم
        'auto',       -- تسجيل تلقائي عند تفعيل الطوارئ
        'sos',        -- تسجيل SOS خاص
        'incident',   -- تسجيل مرتبط بحادث
        'evidence'    -- تسجيل كدليل
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. مستويات الطوارئ
DO $$ BEGIN
    CREATE TYPE emergency_level AS ENUM (
        'low',        -- طوارئ بسيطة
        'medium',     -- طوارئ متوسطة
        'high',       -- طوارئ عالية
        'critical'    -- طوارئ حرجة
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. حالات التسجيل
DO $$ BEGIN
    CREATE TYPE recording_status AS ENUM (
        'active',     -- نشط ومتاح
        'processing', -- قيد المعالجة
        'archived',   -- مؤرشف
        'deleted',    -- محذوف (soft delete)
        'corrupted'   -- تالف
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. أنواع طرق المشاركة
DO $$ BEGIN
    CREATE TYPE share_method_type AS ENUM (
        'whatsapp',   -- واتساب
        'sms',        -- رسائل نصية
        'email',      -- بريد إلكتروني
        'telegram',   -- تليجرام
        'direct'      -- مشاركة مباشرة
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. حالات المشاركة
DO $$ BEGIN
    CREATE TYPE share_status_type AS ENUM (
        'pending',    -- في الانتظار
        'sent',       -- تم الإرسال
        'delivered',  -- تم التسليم
        'opened',     -- تم فتحه
        'failed'      -- فشل في الإرسال
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 6. أنواع معالجة التسجيلات
DO $$ BEGIN
    CREATE TYPE processing_type_enum AS ENUM (
        'transcription',  -- تحويل إلى نص
        'noise_reduction', -- تقليل الضوضاء
        'compression',    -- ضغط الملف
        'encryption',     -- تشفير
        'backup'          -- نسخ احتياطي
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. حالات المعالجة
DO $$ BEGIN
    CREATE TYPE processing_status_enum AS ENUM (
        'queued',     -- في الطابور
        'processing', -- قيد المعالجة
        'completed',  -- مكتملة
        'failed',     -- فشلت
        'cancelled'   -- ملغاة
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ثانياً: إنشاء الجداول

-- 1. جدول التسجيلات الصوتية الرئيسي
CREATE TABLE IF NOT EXISTS emergency_audio_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معلومات التسجيل الأساسية
    recording_id VARCHAR(100) UNIQUE NOT NULL, -- معرف فريد للتسجيل
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    
    -- تفاصيل التسجيل
    recording_type emergency_recording_type NOT NULL DEFAULT 'manual',
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- مسار الملف في التخزين
    file_size BIGINT, -- حجم الملف بالبايت
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- معلومات الجودة والتقنية
    audio_format VARCHAR(10) DEFAULT 'm4a', -- نوع الملف الصوتي
    sample_rate INTEGER DEFAULT 44100,
    bit_rate INTEGER DEFAULT 128000,
    channels INTEGER DEFAULT 2,
    
    -- معلومات الموقع وقت التسجيل
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    location_address TEXT,
    location_accuracy DECIMAL(10, 2),
    
    -- معلومات الطوارئ
    emergency_level emergency_level DEFAULT 'medium',
    incident_id UUID REFERENCES emergency_incidents(id) ON DELETE SET NULL,
    
    -- معلومات المشاركة
    is_shared BOOLEAN DEFAULT false,
    shared_with_contacts TEXT[], -- قائمة معرفات جهات الاتصال
    shared_at TIMESTAMP WITH TIME ZONE,
    
    -- حالة التسجيل
    status recording_status DEFAULT 'active',
    is_evidence BOOLEAN DEFAULT false, -- هل هو دليل مهم؟
    is_encrypted BOOLEAN DEFAULT true,
    
    -- بيانات وصفية إضافية
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- فهارس للبحث السريع
    CONSTRAINT valid_location CHECK (
        (location_latitude IS NULL AND location_longitude IS NULL) OR
        (location_latitude IS NOT NULL AND location_longitude IS NOT NULL)
    )
);

-- 2. جدول مشاركة التسجيلات
CREATE TABLE IF NOT EXISTS audio_recording_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    recording_id UUID REFERENCES emergency_audio_recordings(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- معلومات المشاركة
    contact_id UUID REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    
    -- طريقة المشاركة
    share_method share_method_type DEFAULT 'whatsapp',
    share_status share_status_type DEFAULT 'pending',
    
    -- رسالة المشاركة
    share_message TEXT,
    share_link TEXT, -- رابط للاستماع (إن وجد)
    
    -- معلومات التسليم
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول معالجة التسجيلات
CREATE TABLE IF NOT EXISTS audio_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    recording_id UUID REFERENCES emergency_audio_recordings(id) ON DELETE CASCADE,
    
    -- نوع المعالجة
    processing_type processing_type_enum NOT NULL,
    priority INTEGER DEFAULT 5, -- 1 = عالي، 10 = منخفض
    
    -- حالة المعالجة
    status processing_status_enum DEFAULT 'queued',
    progress_percentage INTEGER DEFAULT 0,
    
    -- معلومات المعالجة
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- معلومات النتيجة
    output_path TEXT,
    output_metadata JSONB DEFAULT '{}',
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول إحصائيات التسجيلات
CREATE TABLE IF NOT EXISTS audio_recording_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    recording_id UUID REFERENCES emergency_audio_recordings(id) ON DELETE CASCADE,
    
    -- إحصائيات الاستماع
    play_count INTEGER DEFAULT 0,
    total_listen_duration INTEGER DEFAULT 0, -- بالثواني
    last_played_at TIMESTAMP WITH TIME ZONE,
    
    -- إحصائيات المشاركة
    share_count INTEGER DEFAULT 0,
    unique_listeners INTEGER DEFAULT 0,
    
    -- معلومات الجودة
    audio_quality_score DECIMAL(3, 2), -- من 0.00 إلى 5.00
    transcription_accuracy DECIMAL(5, 2), -- نسبة دقة التحويل للنص
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. إنشاء الفهارس للأداء
CREATE INDEX IF NOT EXISTS idx_emergency_audio_recordings_user_id ON emergency_audio_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_audio_recordings_trip_id ON emergency_audio_recordings(trip_id);
CREATE INDEX IF NOT EXISTS idx_emergency_audio_recordings_recording_type ON emergency_audio_recordings(recording_type);
CREATE INDEX IF NOT EXISTS idx_emergency_audio_recordings_created_at ON emergency_audio_recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_audio_recordings_location ON emergency_audio_recordings(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_emergency_audio_recordings_status ON emergency_audio_recordings(status);

CREATE INDEX IF NOT EXISTS idx_audio_recording_shares_recording_id ON audio_recording_shares(recording_id);
CREATE INDEX IF NOT EXISTS idx_audio_recording_shares_contact_id ON audio_recording_shares(contact_id);
CREATE INDEX IF NOT EXISTS idx_audio_recording_shares_status ON audio_recording_shares(share_status);

CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_status ON audio_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_audio_processing_queue_priority ON audio_processing_queue(priority);

-- 6. تفعيل RLS (Row Level Security)
ALTER TABLE emergency_audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recording_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_recording_analytics ENABLE ROW LEVEL SECURITY;

-- 7. سياسات الأمان للتسجيلات
CREATE POLICY "المستخدمون يمكنهم رؤية تسجيلاتهم فقط" ON emergency_audio_recordings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم إنشاء تسجيلاتهم" ON emergency_audio_recordings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم تحديث تسجيلاتهم" ON emergency_audio_recordings
    FOR UPDATE USING (auth.uid() = user_id);

-- سياسة خاصة للوصول في حالات الطوارئ
CREATE POLICY "الوصول للتسجيلات في الطوارئ" ON emergency_audio_recordings
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (emergency_level = 'critical' AND status = 'active')
    );

-- 8. سياسات أمان المشاركة
CREATE POLICY "مشاركة التسجيلات الخاصة" ON audio_recording_shares
    FOR ALL USING (
        auth.uid() = shared_by OR 
        auth.uid() IN (
            SELECT user_id FROM emergency_audio_recordings 
            WHERE id = audio_recording_shares.recording_id
        )
    );

-- 9. دوال مساعدة للتسجيلات الصوتية

-- دالة إنشاء تسجيل جديد
CREATE OR REPLACE FUNCTION create_emergency_recording(
    p_recording_id VARCHAR(100),
    p_trip_id UUID DEFAULT NULL,
    p_recording_type emergency_recording_type DEFAULT 'manual',
    p_file_name VARCHAR(255) DEFAULT NULL,
    p_file_path TEXT DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT 0,
    p_location_lat DECIMAL(10, 8) DEFAULT NULL,
    p_location_lng DECIMAL(11, 8) DEFAULT NULL,
    p_emergency_level emergency_level DEFAULT 'medium',
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    recording_uuid UUID;
BEGIN
    INSERT INTO emergency_audio_recordings (
        recording_id, user_id, trip_id, recording_type, file_name, file_path,
        duration_seconds, location_latitude, location_longitude, 
        emergency_level, metadata
    ) VALUES (
        p_recording_id, auth.uid(), p_trip_id, p_recording_type, p_file_name, p_file_path,
        p_duration_seconds, p_location_lat, p_location_lng,
        p_emergency_level, p_metadata
    ) RETURNING id INTO recording_uuid;
    
    RETURN recording_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة مشاركة التسجيل
CREATE OR REPLACE FUNCTION share_emergency_recording(
    p_recording_id UUID,
    p_contact_id UUID,
    p_share_method share_method_type DEFAULT 'whatsapp',
    p_share_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    share_uuid UUID;
    contact_info RECORD;
BEGIN
    -- الحصول على معلومات جهة الاتصال
    SELECT name, phone INTO contact_info
    FROM emergency_contacts 
    WHERE id = p_contact_id AND user_id = auth.uid();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'جهة الاتصال غير موجودة';
    END IF;
    
    -- إنشاء سجل المشاركة
    INSERT INTO audio_recording_shares (
        recording_id, shared_by, contact_id, contact_name, contact_phone,
        share_method, share_message
    ) VALUES (
        p_recording_id, auth.uid(), p_contact_id, contact_info.name, contact_info.phone,
        p_share_method, p_share_message
    ) RETURNING id INTO share_uuid;
    
    -- تحديث حالة التسجيل كمشارك
    UPDATE emergency_audio_recordings 
    SET is_shared = true, shared_at = NOW(),
        shared_with_contacts = array_append(shared_with_contacts, p_contact_id::TEXT)
    WHERE id = p_recording_id AND user_id = auth.uid();
    
    RETURN share_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة الحصول على إحصائيات التسجيلات
CREATE OR REPLACE FUNCTION get_user_recording_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_recordings BIGINT,
    total_duration INTEGER,
    recordings_by_type JSONB,
    recent_recordings BIGINT,
    shared_recordings BIGINT
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_recordings,
        COALESCE(SUM(duration_seconds), 0)::INTEGER as total_duration,
        jsonb_object_agg(recording_type, type_count) as recordings_by_type,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)::BIGINT as recent_recordings,
        COUNT(CASE WHEN is_shared THEN 1 END)::BIGINT as shared_recordings
    FROM (
        SELECT 
            recording_type,
            duration_seconds,
            created_at,
            is_shared,
            COUNT(*) OVER (PARTITION BY recording_type) as type_count
        FROM emergency_audio_recordings
        WHERE user_id = target_user_id AND status = 'active'
    ) t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. المحفزات التلقائية
CREATE OR REPLACE FUNCTION update_recording_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recording_update_timestamp
    BEFORE UPDATE ON emergency_audio_recordings
    FOR EACH ROW EXECUTE FUNCTION update_recording_timestamp();

CREATE TRIGGER shares_update_timestamp
    BEFORE UPDATE ON audio_recording_shares
    FOR EACH ROW EXECUTE FUNCTION update_recording_timestamp();

-- 11. إدراج بيانات تجريبية (اختياري)
INSERT INTO emergency_audio_recordings (
    recording_id, user_id, recording_type, file_name, file_path,
    duration_seconds, emergency_level, metadata
) VALUES 
(
    'test_recording_001',
    auth.uid(),
    'manual',
    'test_emergency_recording.m4a',
    '/audio/emergency/test_emergency_recording.m4a',
    45,
    'medium',
    '{"quality": "high", "device": "mobile", "app_version": "1.0.0"}'
)
ON CONFLICT (recording_id) DO NOTHING;

-- تعليق نهائي
COMMENT ON TABLE emergency_audio_recordings IS 'جدول التسجيلات الصوتية للطوارئ مع جميع البيانات الوصفية والأمان';
COMMENT ON TABLE audio_recording_shares IS 'جدول مشاركة التسجيلات الصوتية مع جهات الاتصال';
COMMENT ON TABLE audio_processing_queue IS 'طابور معالجة التسجيلات الصوتية';
COMMENT ON TABLE audio_recording_analytics IS 'إحصائيات وتحليلات التسجيلات الصوتية';
