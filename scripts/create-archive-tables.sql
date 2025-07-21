-- إنشاء جداول أرشيف الوثائق ومعالجة البيانات

-- =================================================================
-- 1. جدول أرشيف الوثائق
-- =================================================================

CREATE TABLE IF NOT EXISTS document_archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- معرف طلب التحقق
    verification_request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
    
    -- معلومات الوثيقة
    document_type TEXT NOT NULL CHECK (document_type IN (
        'national_id_front',
        'national_id_back', 
        'driving_license_front',
        'driving_license_back',
        'vehicle_registration',
        'profile_photo',
        'additional'
    )),
    
    original_file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- البيانات الوصفية (JSON)
    metadata JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "uploadedAt": "2023-...",
    --   "processedAt": "2023-...",
    --   "ocrProcessed": true,
    --   "extractedText": "...",
    --   "extractedData": {...},
    --   "processingResults": {...},
    --   "imageQuality": {
    --     "resolution": "1920x1080",
    --     "clarity": 85,
    --     "brightness": 120,
    --     "contrast": 95
    --   },
    --   "securityInfo": {
    --     "encrypted": false,
    --     "accessLevel": "private",
    --     "retentionPeriod": 2555
    --   },
    --   "deleted": false,
    --   "deletedAt": null,
    --   "deletedBy": null,
    --   "deletionReason": null
    -- }
    
    -- سجل التدقيق (JSON)
    audit_trail JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "uploadedBy": "user-id",
    --   "processedBy": "system",
    --   "reviewedBy": ["user1", "user2"],
    --   "accessLog": [
    --     {
    --       "userId": "user-id",
    --       "action": "upload",
    --       "timestamp": "2023-...",
    --       "ipAddress": "192.168.1.1"
    --     }
    --   ]
    -- }
    
    -- معلومات التخزين (JSON)
    storage_info JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "bucketName": "driver_documents",
    --   "filePath": "verification/123/national_id_front.jpg",
    --   "backupStatus": "completed",
    --   "compressionRatio": 0.75,
    --   "checksumMD5": "abc123..."
    -- }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. جدول سجل المعالجة المفصل
-- =================================================================

CREATE TABLE IF NOT EXISTS processing_logs (
    id BIGSERIAL PRIMARY KEY,
    
    -- معرفات الربط
    verification_request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
    document_archive_id UUID REFERENCES document_archives(id) ON DELETE CASCADE,
    
    -- معلومات الخطوة
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN (
        'upload',
        'ocr', 
        'validation',
        'review',
        'approval',
        'quality_check',
        'face_matching',
        'data_extraction',
        'rule_application'
    )),
    status TEXT NOT NULL CHECK (status IN (
        'started',
        'in_progress', 
        'completed',
        'failed',
        'cancelled',
        'retry'
    )),
    
    -- تفاصيل المعالجة (JSON)
    processing_details JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "startTime": "2023-...",
    --   "endTime": "2023-...",
    --   "duration": 1500,
    --   "processor": "system",
    --   "processorVersion": "1.0.0",
    --   "apiProvider": "tesseract",
    --   "inputData": {...},
    --   "outputData": {...},
    --   "errorDetails": {
    --     "errorCode": "OCR_FAILED",
    --     "errorMessage": "...",
    --     "stackTrace": "...",
    --     "retryCount": 2
    --   }
    -- }
    
    -- مقاييس الأداء (JSON)
    performance_metrics JSONB DEFAULT '{}',
    -- structure: {
    --   "cpuUsage": 45.2,
    --   "memoryUsage": 512,
    --   "networkLatency": 150,
    --   "diskIO": 25.6,
    --   "confidence": 92.5,
    --   "accuracy": 88.0
    -- }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 3. جدول إحصائيات الأرشيف
-- =================================================================

CREATE TABLE IF NOT EXISTS archive_statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- إحصائيات الملفات
    total_documents INTEGER DEFAULT 0,
    total_storage_mb DECIMAL(10,2) DEFAULT 0,
    documents_by_type JSONB DEFAULT '{}',
    
    -- إحصائيات المعالجة
    processed_documents INTEGER DEFAULT 0,
    ocr_success_rate DECIMAL(5,2) DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    
    -- إحصائيات الجودة
    avg_image_quality DECIMAL(5,2) DEFAULT 0,
    low_quality_count INTEGER DEFAULT 0,
    high_quality_count INTEGER DEFAULT 0,
    
    -- إحصائيات الأخطاء
    upload_failures INTEGER DEFAULT 0,
    processing_failures INTEGER DEFAULT 0,
    storage_failures INTEGER DEFAULT 0,
    
    -- إحصائيات الوصول
    total_views INTEGER DEFAULT 0,
    total_downloads INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date)
);

-- =================================================================
-- 4. جدول النسخ الاحتياطية
-- =================================================================

CREATE TABLE IF NOT EXISTS document_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_archive_id UUID REFERENCES document_archives(id) ON DELETE CASCADE,
    
    -- معلومات النسخة الاحتياطية
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
    backup_location TEXT NOT NULL, -- S3, local, cloud, etc.
    backup_path TEXT NOT NULL,
    backup_size BIGINT NOT NULL,
    
    -- معلومات الضغط والتشفير
    compression_type TEXT, -- gzip, zip, etc.
    encryption_type TEXT, -- AES256, etc.
    checksum_original TEXT NOT NULL,
    checksum_backup TEXT NOT NULL,
    
    -- حالة النسخة الاحتياطية
    backup_status TEXT DEFAULT 'pending' CHECK (backup_status IN (
        'pending',
        'in_progress',
        'completed',
        'failed',
        'corrupted',
        'restored'
    )),
    
    -- معلومات الاستعادة
    restore_info JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 5. جدول إعدادات الاحتفاظ
-- =================================================================

CREATE TABLE IF NOT EXISTS retention_policies (
    id SERIAL PRIMARY KEY,
    policy_name TEXT NOT NULL UNIQUE,
    document_type TEXT,
    
    -- قواعد الاحتفاظ
    retention_period_days INTEGER NOT NULL, -- فترة الاحتفاظ بالأيام
    auto_delete_enabled BOOLEAN DEFAULT false,
    backup_required BOOLEAN DEFAULT true,
    
    -- إعدادات التنظيف
    cleanup_schedule TEXT, -- cron expression
    notification_before_days INTEGER DEFAULT 30,
    
    -- قواعد خاصة
    special_rules JSONB DEFAULT '{}',
    -- structure: {
    --   "vip_customers": {"retention_period": 3650},
    --   "legal_documents": {"never_delete": true},
    --   "test_data": {"retention_period": 30}
    -- }
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 6. الفهارس لتحسين الأداء
-- =================================================================

-- فهارس document_archives
CREATE INDEX IF NOT EXISTS idx_doc_archives_verification_id ON document_archives(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_doc_archives_document_type ON document_archives(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_archives_created_at ON document_archives(created_at);
CREATE INDEX IF NOT EXISTS idx_doc_archives_metadata_processed ON document_archives USING GIN((metadata->'ocrProcessed'));
CREATE INDEX IF NOT EXISTS idx_doc_archives_metadata_deleted ON document_archives USING GIN((metadata->'deleted'));

-- فهارس processing_logs  
CREATE INDEX IF NOT EXISTS idx_processing_logs_verification_id ON processing_logs(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_document_id ON processing_logs(document_archive_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_step_type ON processing_logs(step_type);
CREATE INDEX IF NOT EXISTS idx_processing_logs_status ON processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON processing_logs(created_at);

-- فهارس archive_statistics
CREATE INDEX IF NOT EXISTS idx_archive_statistics_date ON archive_statistics(date);

-- فهارس document_backups
CREATE INDEX IF NOT EXISTS idx_doc_backups_archive_id ON document_backups(document_archive_id);
CREATE INDEX IF NOT EXISTS idx_doc_backups_status ON document_backups(backup_status);
CREATE INDEX IF NOT EXISTS idx_doc_backups_created_at ON document_backups(created_at);

-- فهارس retention_policies
CREATE INDEX IF NOT EXISTS idx_retention_policies_document_type ON retention_policies(document_type);
CREATE INDEX IF NOT EXISTS idx_retention_policies_active ON retention_policies(is_active);

-- =================================================================
-- 7. دوال مساعدة
-- =================================================================

-- دالة تحديث الإحصائيات اليومية
CREATE OR REPLACE FUNCTION update_daily_archive_statistics()
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
BEGIN
    INSERT INTO archive_statistics (
        date,
        total_documents,
        total_storage_mb,
        processed_documents,
        avg_processing_time_ms
    )
    SELECT 
        today_date,
        COUNT(*),
        ROUND(SUM(file_size)::DECIMAL / 1024 / 1024, 2),
        COUNT(*) FILTER (WHERE metadata->>'ocrProcessed' = 'true'),
        COALESCE(AVG(EXTRACT(EPOCH FROM (
            (processing_details->>'endTime')::TIMESTAMP - 
            (processing_details->>'startTime')::TIMESTAMP
        )) * 1000)::INTEGER, 0)
    FROM document_archives da
    LEFT JOIN processing_logs pl ON da.id = pl.document_archive_id
    WHERE da.created_at::DATE = today_date
    ON CONFLICT (date) DO UPDATE SET
        total_documents = EXCLUDED.total_documents,
        total_storage_mb = EXCLUDED.total_storage_mb,
        processed_documents = EXCLUDED.processed_documents,
        avg_processing_time_ms = EXCLUDED.avg_processing_time_ms;
END;
$$ LANGUAGE plpgsql;

-- دالة تنظيف الملفات القديمة
CREATE OR REPLACE FUNCTION cleanup_expired_documents()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    policy RECORD;
BEGIN
    FOR policy IN 
        SELECT * FROM retention_policies 
        WHERE is_active = true AND auto_delete_enabled = true
    LOOP
        UPDATE document_archives 
        SET metadata = metadata || jsonb_build_object(
            'deleted', true,
            'deletedAt', NOW()::TEXT,
            'deletedBy', 'system',
            'deletionReason', 'retention_policy_' || policy.policy_name
        ),
        updated_at = NOW()
        WHERE 
            (policy.document_type IS NULL OR document_type = policy.document_type)
            AND created_at < (NOW() - INTERVAL '1 day' * policy.retention_period_days)
            AND (metadata->>'deleted')::BOOLEAN IS NOT TRUE;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 8. إدراج سياسات احتفاظ افتراضية
-- =================================================================

INSERT INTO retention_policies (
    policy_name,
    document_type,
    retention_period_days,
    auto_delete_enabled,
    backup_required,
    cleanup_schedule,
    notification_before_days
) VALUES 
(
    'default_verification_documents',
    NULL,
    2555, -- 7 سنوات
    false,
    true,
    '0 2 * * 0', -- كل أحد الساعة 2 صباحاً
    30
),
(
    'profile_photos',
    'profile_photo',
    1825, -- 5 سنوات
    false,
    true,
    '0 2 * * 0',
    30
),
(
    'test_documents',
    'additional',
    30, -- 30 يوم للملفات الاختبارية
    true,
    false,
    '0 3 * * *', -- يومياً الساعة 3 صباحاً
    7
);

COMMIT;
