-- إنشاء جداول نظام التحقق من السائقين

-- =================================================================
-- 1. جدول طلبات التحقق الرئيسي
-- =================================================================

CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- معلومات الطلب
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('taxi_driver', 'transporter', 'event_driver')),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',           -- في انتظار المعالجة
        'processing',        -- قيد المعالجة
        'verified',          -- تم التحقق بنجاح
        'rejected',          -- مرفوض
        'manual_review',     -- يحتاج مراجعة يدوية
        'resubmission'       -- يحتاج إعادة تقديم
    )),
    
    -- روابط الصور المرفوعة
    national_id_front_url TEXT,
    national_id_back_url TEXT,
    driving_license_front_url TEXT,
    driving_license_back_url TEXT,
    vehicle_registration_url TEXT,
    profile_photo_url TEXT,
    additional_documents JSONB DEFAULT '[]',
    
    -- البيانات المدخلة من السائق
    submitted_data JSONB NOT NULL DEFAULT '{}', -- {name, id_number, birth_date, license_number, etc.}
    
    -- البيانات المستخرجة من OCR
    extracted_data JSONB DEFAULT '{}',
    
    -- نتائج التحقق والمقارنة
    verification_results JSONB DEFAULT '{}',
    
    -- درجات الثقة
    ocr_confidence_score DECIMAL(5,2) DEFAULT 0,
    face_match_confidence DECIMAL(5,2) DEFAULT 0,
    overall_confidence DECIMAL(5,2) DEFAULT 0,
    
    -- معلومات القرار
    auto_decision TEXT CHECK (auto_decision IN ('approve', 'reject', 'manual_review')),
    rejection_reasons TEXT[],
    manual_review_notes TEXT,
    
    -- معلومات المراجع
    reviewed_by UUID REFERENCES profiles(id),
    reviewer_decision TEXT CHECK (reviewer_decision IN ('approve', 'reject', 'request_resubmission')),
    reviewer_notes TEXT,
    
    -- تواريخ مهمة
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- انتهاء صلاحية التحقق
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. جدول قواعد التحقق
-- =================================================================

CREATE TABLE IF NOT EXISTS verification_rules (
    id SERIAL PRIMARY KEY,
    rule_type TEXT NOT NULL, -- 'name_match', 'date_validation', 'license_category', etc.
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    
    -- معايير القاعدة
    rule_criteria JSONB NOT NULL, -- شروط تطبيق القاعدة
    min_confidence_threshold DECIMAL(5,2) DEFAULT 80.0,
    
    -- إعدادات القاعدة
    is_active BOOLEAN DEFAULT true,
    is_critical BOOLEAN DEFAULT false, -- هل فشل هذه القاعدة يؤدي للرفض
    applies_to TEXT[] DEFAULT ARRAY['taxi_driver', 'transporter', 'event_driver'],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 3. جدول سجل معالجة التحقق
-- =================================================================

CREATE TABLE IF NOT EXISTS verification_processing_logs (
    id BIGSERIAL PRIMARY KEY,
    verification_request_id UUID REFERENCES verification_requests(id) ON DELETE CASCADE,
    
    -- تفاصيل الخطوة
    step_name TEXT NOT NULL, -- 'ocr_extraction', 'face_matching', 'data_validation', etc.
    step_status TEXT NOT NULL CHECK (step_status IN ('started', 'completed', 'failed', 'skipped')),
    
    -- النتائج
    step_results JSONB DEFAULT '{}',
    confidence_score DECIMAL(5,2),
    processing_time_ms INTEGER,
    
    -- الأخطاء
    error_code TEXT,
    error_message TEXT,
    error_details JSONB,
    
    -- معلومات التقنية
    processor_version TEXT,
    api_used TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 4. جدول إعدادات OCR والذكاء الاصطناعي
-- =================================================================

CREATE TABLE IF NOT EXISTS ai_processing_config (
    id SERIAL PRIMARY KEY,
    config_type TEXT NOT NULL, -- 'ocr_settings', 'face_matching', 'image_processing'
    config_name TEXT NOT NULL,
    
    -- إعدادات التقنية
    provider TEXT, -- 'tesseract', 'google_vision', 'aws_textract'
    api_endpoint TEXT,
    api_key_name TEXT, -- اسم متغير البيئة للمفتاح
    
    -- معايير الجودة
    min_image_width INTEGER DEFAULT 800,
    min_image_height INTEGER DEFAULT 600,
    max_file_size_mb INTEGER DEFAULT 10,
    supported_formats TEXT[] DEFAULT ARRAY['jpg', 'jpeg', 'png', 'pdf'],
    
    -- إعدادات المعالجة
    processing_settings JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(config_type, config_name)
);

-- =================================================================
-- 5. جدول إعدادات الدول (مرونة للدول العربية المختلفة)
-- =================================================================

CREATE TABLE IF NOT EXISTS country_verification_config (
    country_code CHAR(2) PRIMARY KEY,
    country_name_ar TEXT NOT NULL,
    country_name_en TEXT,
    
    -- اللغات المدعومة في الوثائق
    supported_languages TEXT[] DEFAULT ARRAY['ar'],
    
    -- أنماط التحقق من البيانات
    national_id_pattern TEXT,
    driving_license_pattern TEXT,
    vehicle_plate_pattern TEXT,
    
    -- إعدادات OCR
    ocr_languages TEXT[] DEFAULT ARRAY['ara'],
    
    -- متطلبات كل نوع سائق (JSON مرن)
    driver_requirements JSONB NOT NULL DEFAULT '{}',
    
    -- إعدادات خاصة بالدولة
    special_settings JSONB DEFAULT '{}',
    
    -- معلومات إضافية
    currency_code CHAR(3),
    timezone TEXT,
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 6. جدول قوالب الوثائق
-- =================================================================

CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    template_name TEXT NOT NULL,
    document_type TEXT NOT NULL, -- 'national_id', 'driving_license', 'vehicle_registration'
    country_code TEXT NOT NULL, -- 'AE', 'SA', 'JO', etc.
    
    -- مناطق استخراج البيانات
    data_regions JSONB NOT NULL, -- مواقع النصوص في الوثيقة
    validation_patterns JSONB NOT NULL, -- أنماط التحقق من البيانات
    
    -- معلومات القالب
    template_image_url TEXT,
    description TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(template_name, country_code)
);

-- =================================================================
-- 7. جدول إحصائيات الأداء
-- =================================================================

CREATE TABLE IF NOT EXISTS verification_statistics (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- إحصائيات الطلبات
    total_requests INTEGER DEFAULT 0,
    auto_approved INTEGER DEFAULT 0,
    auto_rejected INTEGER DEFAULT 0,
    manual_reviews INTEGER DEFAULT 0,
    
    -- إحصائيات الدقة
    avg_ocr_confidence DECIMAL(5,2),
    avg_face_confidence DECIMAL(5,2),
    avg_processing_time_ms INTEGER,
    
    -- إحصائيات الأخطاء
    ocr_failures INTEGER DEFAULT 0,
    face_matching_failures INTEGER DEFAULT 0,
    api_errors INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(date)
);

-- =================================================================
-- 8. الفهارس لتحسين الأداء
-- =================================================================

-- فهارس verification_requests
CREATE INDEX IF NOT EXISTS idx_verification_requests_driver_id ON verification_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_type ON verification_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_verification_requests_submitted_at ON verification_requests(submitted_at);

-- فهارس verification_processing_logs
CREATE INDEX IF NOT EXISTS idx_processing_logs_request_id ON verification_processing_logs(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_step_name ON verification_processing_logs(step_name);
CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON verification_processing_logs(created_at);

-- فهارس verification_statistics
CREATE INDEX IF NOT EXISTS idx_verification_statistics_date ON verification_statistics(date);

-- فهارس country_verification_config
CREATE INDEX IF NOT EXISTS idx_country_config_active ON country_verification_config(is_active);
CREATE INDEX IF NOT EXISTS idx_country_config_languages ON country_verification_config USING GIN(supported_languages);

-- =================================================================
-- 9. إدراج بيانات افتراضية
-- =================================================================

-- قواعد التحقق الأساسية (مرنة حسب الدولة)
INSERT INTO verification_rules (rule_type, rule_name, rule_description, rule_criteria, min_confidence_threshold, is_critical) VALUES
('name_match', 'اسم متطابق', 'التحقق من تطابق الاسم في الهوية والرخصة', '{"similarity_threshold": 0.85, "language_flexible": true}', 85.0, true),
('date_validation', 'تاريخ صحيح', 'التحقق من صحة تاريخ الميلاد وانتهاء الوثائق', '{"max_age": 70, "min_age": 18, "date_format_flexible": true}', 90.0, true),
('license_category', 'فئة الرخصة', 'التحقق من فئة الرخصة المناسبة لنوع السائق (حسب الدولة)', '{"country_specific": true}', 95.0, true),
('document_quality', 'جودة الوثيقة', 'التحقق من وضوح الوثيقة وقابليتها للقراءة', '{"min_resolution": 300, "min_contrast": 0.5}', 70.0, false),
('face_similarity', 'تطابق الوجه', 'مقارنة الوجه في الصور المختلفة (اختياري)', '{"similarity_threshold": 0.75, "optional": true}', 75.0, false),
('id_pattern_validation', 'نمط رقم الهوية', 'التحقق من صحة نمط رقم الهوية حسب الدولة', '{"country_specific": true}', 95.0, true),
('transport_license_check', 'ترخيص النقل', 'التحقق من ترخيص النقل إذا كان مطلوبا في الدولة', '{"country_dependent": true, "driver_type_specific": true}', 90.0, false);

-- إعدادات OCR المرنة للغات
INSERT INTO ai_processing_config (config_type, config_name, provider, processing_settings) VALUES
('ocr_settings', 'tesseract_arabic_only', 'tesseract', '{"lang": "ara", "psm": 6, "preserve_interword_spaces": 1}'),
('ocr_settings', 'tesseract_arabic_english', 'tesseract', '{"lang": "ara+eng", "psm": 6, "preserve_interword_spaces": 1}'),
('ocr_settings', 'tesseract_english_only', 'tesseract', '{"lang": "eng", "psm": 6, "preserve_interword_spaces": 1}'),
('face_matching', 'face_api_optional', 'face-api', '{"detection_threshold": 0.5, "recognition_threshold": 0.6, "enabled": false}'),
('image_processing', 'enhancement_multilang', 'canvas', '{"auto_contrast": true, "noise_reduction": true, "rotation_correction": true, "language_detection": true}');

-- إعدادات الدول (أمثلة)
INSERT INTO country_verification_config (
    country_code, 
    country_name_ar, 
    country_name_en,
    supported_languages,
    national_id_pattern,
    driving_license_pattern,
    vehicle_plate_pattern,
    ocr_languages,
    driver_requirements
) VALUES 
(
    'AE',
    'الإمارات العربية المتحدة',
    'United Arab Emirates',
    ARRAY['ar', 'en'],
    '^784-[0-9]{4}-[0-9]{7}-[0-9]$',
    '^[0-9]{6,8}$',
    '^[A-Z]{1,3}[0-9]{1,5}$',
    ARRAY['ara', 'eng'],
    '{
        "taxi_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["3", "4", "5", "6"],
            "additional_docs": [],
            "transport_license_required": false
        },
        "transporter": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["2", "3", "4", "5", "6"],
            "additional_docs": ["vehicle_registration"],
            "transport_license_required": false
        },
        "event_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["3", "4", "5", "6"],
            "additional_docs": [],
            "transport_license_required": false
        }
    }'
),
(
    'SA',
    'المملكة العربية السعودية',
    'Kingdom of Saudi Arabia',
    ARRAY['ar'],
    '^[12][0-9]{9}$',
    '^[0-9]{10}$',
    '^[ا-ي]{3}[0-9]{3,4}$',
    ARRAY['ara'],
    '{
        "taxi_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["خاص"],
            "additional_docs": [],
            "transport_license_required": false
        },
        "transporter": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["خاص", "عام صغير", "عام كبير"],
            "additional_docs": ["vehicle_registration"],
            "transport_license_required": true
        },
        "event_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["خاص"],
            "additional_docs": [],
            "transport_license_required": false
        }
    }'
),
(
    'JO',
    'المملكة الأردنية الهاشمية',
    'Hashemite Kingdom of Jordan',
    ARRAY['ar'],
    '^[0-9]{10}$',
    '^[0-9]{7,9}$',
    '^[0-9]{1,5}-[0-9]{1,3}$',
    ARRAY['ara'],
    '{
        "taxi_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["3"],
            "additional_docs": [],
            "transport_license_required": false
        },
        "transporter": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["3", "4", "5"],
            "additional_docs": ["vehicle_registration"],
            "transport_license_required": false
        },
        "event_driver": {
            "required_docs": ["national_id", "driving_license"],
            "license_categories": ["3"],
            "additional_docs": [],
            "transport_license_required": false
        }
    }'
);

COMMIT;
