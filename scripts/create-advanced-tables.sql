-- جداول الأنظمة المتقدمة الجديدة للتحقق

-- =================================================================
-- 1. جدول قوالب الإشعارات
-- =================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('email', 'push', 'sms', 'in_app')),
    trigger_event TEXT NOT NULL CHECK (trigger_event IN (
        'verification_complete',
        'manual_review_needed', 
        'document_rejected',
        'approval_granted',
        'additional_documents_required',
        'quality_check_failed',
        'admin_alert',
        'urgent_review',
        'fraud_detected'
    )),
    
    -- محتوى القالب
    subject TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_button_text TEXT,
    action_button_url TEXT,
    
    -- إعدادات الإرسال
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    retry_count INTEGER DEFAULT 3,
    delay_minutes INTEGER DEFAULT 0,
    
    -- المستقبلون
    send_to_driver BOOLEAN DEFAULT true,
    send_to_reviewer BOOLEAN DEFAULT false,
    send_to_admin BOOLEAN DEFAULT false,
    
    -- متغيرات القالب
    variables TEXT[] DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. جدول طابور الإشعارات
-- =================================================================

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_request_id TEXT NOT NULL,
    template_id UUID REFERENCES notification_templates(id) ON DELETE CASCADE,
    
    recipient_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('driver', 'reviewer', 'admin')),
    
    -- محتوى الإشعار
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'push', 'sms', 'in_app')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    subject TEXT,
    action_url TEXT,
    
    -- متغيرات مملوءة
    variables JSONB DEFAULT '{}',
    
    -- حالة الإرسال
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    -- جدولة الإرسال
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 3. جدول الإشعارات داخل التطبيق
-- =================================================================

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    verification_request_id TEXT,
    
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- حالة القراءة
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 4. جدول أجهزة المستخدمين (للـ Push Notifications)
-- =================================================================

CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    
    device_type TEXT NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    device_token TEXT,
    push_token TEXT,
    
    -- معلومات الجهاز
    device_info JSONB DEFAULT '{}',
    app_version TEXT,
    os_version TEXT,
    
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, device_token)
);

-- =================================================================
-- 5. جدول نتائج التنبؤات
-- =================================================================

CREATE TABLE IF NOT EXISTS prediction_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_request_id TEXT NOT NULL,
    
    -- نتائج التنبؤ
    predicted_decision TEXT NOT NULL CHECK (predicted_decision IN ('auto_approve', 'auto_reject', 'manual_review')),
    confidence DECIMAL(5,4) NOT NULL, -- 0.0000 - 1.0000
    
    -- تحليل مفصل
    history_score DECIMAL(5,4),
    quality_score DECIMAL(5,4),
    ocr_score DECIMAL(5,4),
    consistency_score DECIMAL(5,4),
    behavior_score DECIMAL(5,4),
    
    -- العوامل المؤثرة
    positive_factors TEXT[] DEFAULT '{}',
    negative_factors TEXT[] DEFAULT '{}',
    risk_factors TEXT[] DEFAULT '{}',
    
    -- توصيات
    recommended_action TEXT,
    recommended_priority TEXT,
    estimated_review_time INTEGER, -- بالثواني
    suggested_reviewer TEXT,
    additional_checks TEXT[] DEFAULT '{}',
    
    -- النتيجة الفعلية (للتعلم)
    actual_decision TEXT CHECK (actual_decision IN ('approved', 'rejected', 'escalated')),
    review_time INTEGER, -- الوقت الفعلي للمراجعة
    prediction_accuracy INTEGER, -- 0 أو 1
    
    -- معلومات النموذج
    model_version TEXT DEFAULT '1.0.0',
    processing_time INTEGER, -- بالميللي ثانية
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 6. جدول تاريخ التحقق
-- =================================================================

CREATE TABLE IF NOT EXISTS verification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id TEXT NOT NULL,
    verification_request_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    
    -- نتائج سابقة
    previous_decision TEXT NOT NULL CHECK (previous_decision IN ('approved', 'rejected', 'manual_review')),
    confidence DECIMAL(5,4) NOT NULL,
    processing_time INTEGER, -- بالثواني
    
    -- خصائص الوثيقة
    image_quality JSONB DEFAULT '{}',
    -- structure: {"clarity": 85, "brightness": 120, "contrast": 95, "resolution": "1920x1080"}
    
    -- نتائج OCR
    ocr_accuracy DECIMAL(5,4),
    extracted_fields_count INTEGER,
    valid_fields_count INTEGER,
    
    -- معلومات المراجع
    reviewer_id TEXT,
    review_time INTEGER, -- وقت المراجعة بالثواني
    review_notes TEXT,
    
    -- بيانات إضافية
    metadata JSONB DEFAULT '{}',
    -- structure: {
    --   "deviceInfo": {...},
    --   "uploadTime": "2023-...",
    --   "fileSize": 1024000,
    --   "retryCount": 1
    -- }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 7. جدول سجلات التحقق
-- =================================================================

CREATE TABLE IF NOT EXISTS validation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    
    is_valid BOOLEAN NOT NULL,
    trust_score DECIMAL(5,2) NOT NULL, -- 0.00 - 100.00
    blockers_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    
    -- تفاصيل التحقق
    security_scan JSONB DEFAULT '{}',
    quality_assessment JSONB DEFAULT '{}',
    fraud_detection JSONB DEFAULT '{}',
    compliance_check JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 8. جدول الأحداث الأمنية
-- =================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    gate_id TEXT,
    reason TEXT NOT NULL,
    document_type TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- تفاصيل الحدث
    event_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- معالجة الحدث
    resolved BOOLEAN DEFAULT false,
    resolved_by TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 9. جداول نظام المراجعة متعدد المستويات
-- =================================================================

-- جدول مستويات المراجعة
CREATE TABLE IF NOT EXISTS review_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    order_number INTEGER NOT NULL,
    
    -- شروط التفعيل
    triggers JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "documentTypes": ["national_id", "driving_license"],
    --   "riskLevels": ["medium", "high"],
    --   "aiConfidence": {"min": 30, "max": 85},
    --   "userCategories": ["regular", "new"]
    -- }
    
    -- معايير المراجعة
    criteria JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "requiredApprovals": 1,
    --   "timeoutMinutes": 30,
    --   "escalationThreshold": 85,
    --   "allowSkip": false
    -- }
    
    -- المراجعون المؤهلون
    reviewers JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "roles": ["reviewer", "senior_reviewer"],
    --   "specializations": ["document_verification"],
    --   "minimumExperience": 6,
    --   "requiredCertifications": ["basic_verification"]
    -- }
    
    -- إعدادات الإصعاد
    escalation JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "autoEscalateAfter": 30,
    --   "escalateOnFailure": true,
    --   "notifyOnTimeout": true,
    --   "requireReason": true
    -- }
    
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول سير عمل المراجعة
CREATE TABLE IF NOT EXISTS review_workflows (
    id TEXT PRIMARY KEY,
    verification_request_id TEXT NOT NULL,
    driver_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    
    -- الحالة العامة
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    current_stage INTEGER DEFAULT 1,
    total_stages INTEGER NOT NULL,
    
    -- إعدادات التدفق
    workflow_config JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "levels": [...],
    --   "allowParallel": false,
    --   "requireConsensus": false,
    --   "majorityThreshold": 60
    -- }
    
    -- التوقيتات
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estimated_completion TIMESTAMP WITH TIME ZONE,
    actual_completion TIMESTAMP WITH TIME ZONE,
    total_time INTEGER, -- بالثواني
    
    -- النتائج النهائية
    final_decision TEXT CHECK (final_decision IN ('approved', 'rejected', 'requires_resubmission')),
    final_confidence DECIMAL(5,4),
    consensus_score DECIMAL(5,4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول مراحل المراجعة
CREATE TABLE IF NOT EXISTS review_stages (
    id TEXT PRIMARY KEY,
    verification_request_id TEXT NOT NULL,
    level_id TEXT REFERENCES review_levels(id),
    order_number INTEGER NOT NULL,
    
    -- حالة المرحلة
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'escalated', 'failed')),
    
    -- معلومات المراجع
    assigned_to TEXT,
    reviewer_id TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- نتائج المراجعة
    decision TEXT CHECK (decision IN ('approve', 'reject', 'escalate', 'request_more_info')),
    confidence DECIMAL(5,4),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- بيانات إضافية
    metadata JSONB DEFAULT '{}',
    -- structure: {
    --   "autoAssigned": true,
    --   "priority": "normal",
    --   "estimatedTime": 1800,
    --   "actualTime": 1200,
    --   "retryCount": 0
    -- }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 10. جداول تحليل المخالفات
-- =================================================================

-- جدول قواعد المخالفات
CREATE TABLE IF NOT EXISTS violation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('data_consistency', 'document_authenticity', 'format_compliance', 'security_check')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- شروط التطبيق
    applicable_documents TEXT[] NOT NULL,
    required_fields TEXT[] NOT NULL,
    
    -- معايير الفحص
    criteria JSONB NOT NULL,
    -- structure: {
    --   "type": "regex",
    --   "pattern": "^[1-2][0-9]{9}$",
    --   "expectedFormat": "date",
    --   "validRange": {"min": 18, "max": 80},
    --   "referenceField": "name",
    --   "similarityThreshold": 0.8,
    --   "customFunction": "checkDocumentExpiry"
    -- }
    
    -- رسائل الخطأ
    error_message_ar TEXT NOT NULL,
    error_message_en TEXT NOT NULL,
    
    -- الإجراءات المطلوبة
    block_submission BOOLEAN DEFAULT false,
    require_review BOOLEAN DEFAULT false,
    escalate_to_admin BOOLEAN DEFAULT false,
    log_security_event BOOLEAN DEFAULT false,
    
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تقارير تحليل المخالفات
CREATE TABLE IF NOT EXISTS violation_analysis_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_request_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    
    -- ملخص التحليل
    summary JSONB NOT NULL,
    -- structure: {
    --   "totalRulesChecked": 15,
    --   "violationsFound": 3,
    --   "criticalIssues": 1,
    --   "warningsCount": 2,
    --   "overallScore": 75,
    --   "riskLevel": "medium"
    -- }
    
    -- المخالفات المكتشفة
    violations JSONB NOT NULL DEFAULT '[]',
    -- array of violation objects
    
    -- التحليل المتقدم
    patterns JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "suspiciousPatterns": ["..."],
    --   "dataInconsistencies": ["..."],
    --   "formatAnomalies": ["..."],
    --   "securityConcerns": ["..."]
    -- }
    
    -- التوصيات النهائية
    final_recommendations JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "action": "manual_review",
    --   "reasons": ["..."],
    --   "nextSteps": ["..."],
    --   "estimatedReviewTime": 900
    -- }
    
    -- بيانات إضافية
    metadata JSONB NOT NULL DEFAULT '{}',
    -- structure: {
    --   "analysisTime": 1500,
    --   "rulesVersion": "1.0.0",
    --   "aiConfidence": 85,
    --   "processingDetails": {...}
    -- }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 11. فهارس لتحسين الأداء
-- =================================================================

-- فهارس الإشعارات
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created ON in_app_notifications(created_at);

-- فهارس التنبؤات
CREATE INDEX IF NOT EXISTS idx_prediction_results_request ON prediction_results(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_decision ON prediction_results(predicted_decision);
CREATE INDEX IF NOT EXISTS idx_prediction_results_confidence ON prediction_results(confidence);
CREATE INDEX IF NOT EXISTS idx_prediction_results_accuracy ON prediction_results(prediction_accuracy);

-- فهارس التاريخ
CREATE INDEX IF NOT EXISTS idx_verification_history_driver ON verification_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_document ON verification_history(document_type);
CREATE INDEX IF NOT EXISTS idx_verification_history_decision ON verification_history(previous_decision);
CREATE INDEX IF NOT EXISTS idx_verification_history_created ON verification_history(created_at);

-- فهارس التحقق
CREATE INDEX IF NOT EXISTS idx_validation_logs_driver ON validation_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_validation_logs_valid ON validation_logs(is_valid);
CREATE INDEX IF NOT EXISTS idx_validation_logs_score ON validation_logs(trust_score);
CREATE INDEX IF NOT EXISTS idx_validation_logs_created ON validation_logs(created_at);

-- فهارس الأمان
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

-- فهارس المراجعة
CREATE INDEX IF NOT EXISTS idx_review_workflows_status ON review_workflows(status);
CREATE INDEX IF NOT EXISTS idx_review_workflows_driver ON review_workflows(driver_id);
CREATE INDEX IF NOT EXISTS idx_review_workflows_document ON review_workflows(document_type);
CREATE INDEX IF NOT EXISTS idx_review_workflows_started ON review_workflows(started_at);

CREATE INDEX IF NOT EXISTS idx_review_stages_request ON review_stages(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_review_stages_status ON review_stages(status);
CREATE INDEX IF NOT EXISTS idx_review_stages_reviewer ON review_stages(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_stages_level ON review_stages(level_id);
CREATE INDEX IF NOT EXISTS idx_review_stages_started ON review_stages(started_at);

-- فهارس المخالفات
CREATE INDEX IF NOT EXISTS idx_violation_reports_request ON violation_analysis_reports(verification_request_id);
CREATE INDEX IF NOT EXISTS idx_violation_reports_document ON violation_analysis_reports(document_type);
CREATE INDEX IF NOT EXISTS idx_violation_reports_created ON violation_analysis_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_violation_reports_summary ON violation_analysis_reports USING GIN(summary);

-- =================================================================
-- 12. دوال مساعدة
-- =================================================================

-- دالة تحديث أولوية الإشعارات
CREATE OR REPLACE FUNCTION update_notification_priority()
RETURNS TRIGGER AS $$
BEGIN
    -- رفع أولوية الإشعارات العاجلة
    IF NEW.priority = 'urgent' THEN
        NEW.scheduled_for = NOW();
    ELSIF NEW.priority = 'high' AND NEW.scheduled_for > NOW() + INTERVAL '5 minutes' THEN
        NEW.scheduled_for = NOW() + INTERVAL '2 minutes';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط الدالة بجدول الإشعارات
CREATE TRIGGER trigger_update_notification_priority
    BEFORE INSERT OR UPDATE ON notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_priority();

-- دالة تحديث عبء العمل للمراجعين
CREATE OR REPLACE FUNCTION increment_reviewer_workload(reviewer_id TEXT, increment INTEGER)
RETURNS VOID AS $$
BEGIN
    INSERT INTO profiles (id, current_workload)
    VALUES (reviewer_id, increment)
    ON CONFLICT (id)
    DO UPDATE SET current_workload = COALESCE(profiles.current_workload, 0) + increment;
END;
$$ LANGUAGE plpgsql;

-- دالة حساب معدل دقة التنبؤات
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy()
RETURNS TABLE(
    total_predictions BIGINT,
    correct_predictions BIGINT,
    accuracy_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_predictions,
        SUM(prediction_accuracy) as correct_predictions,
        CASE 
            WHEN COUNT(*) > 0 THEN ROUND((SUM(prediction_accuracy)::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0.00
        END as accuracy_rate
    FROM prediction_results 
    WHERE actual_decision IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 13. إدراج البيانات الأساسية
-- =================================================================

-- إدراج قوالب الإشعارات الأساسية
INSERT INTO notification_templates (
    name, type, trigger_event, title, body, priority, send_to_driver, variables
) VALUES 
(
    'verification_approved',
    'push',
    'approval_granted',
    '✅ تمت الموافقة على وثائقك',
    'مبروك {{driverName}}! تم قبول وثائق التحقق الخاصة بك بنجاح.',
    'high',
    true,
    ARRAY['driverName', 'confidence']
),
(
    'verification_rejected',
    'push',
    'document_rejected',
    '❌ تم رفض وثائقك',
    'عذراً {{driverName}}, تم رفض وثائق التحقق. السبب: {{mainIssue}}',
    'high',
    true,
    ARRAY['driverName', 'mainIssue', 'actionRequired']
),
(
    'manual_review_needed',
    'in_app',
    'manual_review_needed',
    '👥 مطلوب مراجعة يدوية',
    'طلب تحقق جديد {{requestId}} يحتاج مراجعة {{documentTypes}}',
    'normal',
    false,
    ARRAY['requestId', 'documentTypes', 'urgencyLevel', 'estimatedTime']
) ON CONFLICT (name) DO NOTHING;

-- إدراج مستويات المراجعة الأساسية
INSERT INTO review_levels (
    id, name, description, order_number, triggers, criteria, reviewers, escalation
) VALUES 
(
    'ai_auto',
    'المراجعة الآلية',
    'فحص تلقائي باستخدام الذكاء الاصطناعي',
    1,
    '{"documentTypes": ["all"], "riskLevels": ["low", "medium"], "aiConfidence": {"min": 0, "max": 100}, "userCategories": ["all"]}',
    '{"requiredApprovals": 1, "timeoutMinutes": 5, "escalationThreshold": 70, "allowSkip": false}',
    '{"roles": ["ai_system"], "specializations": ["all"], "minimumExperience": 0, "requiredCertifications": []}',
    '{"autoEscalateAfter": 5, "escalateOnFailure": true, "notifyOnTimeout": false, "requireReason": false}'
),
(
    'human_basic',
    'المراجعة البشرية الأساسية',
    'مراجعة بواسطة مراجع بشري مؤهل',
    2,
    '{"documentTypes": ["national_id", "driving_license"], "riskLevels": ["medium", "high"], "aiConfidence": {"min": 30, "max": 85}, "userCategories": ["regular", "new"]}',
    '{"requiredApprovals": 1, "timeoutMinutes": 30, "escalationThreshold": 85, "allowSkip": false}',
    '{"roles": ["reviewer", "senior_reviewer"], "specializations": ["document_verification"], "minimumExperience": 6, "requiredCertifications": ["basic_verification"]}',
    '{"autoEscalateAfter": 30, "escalateOnFailure": true, "notifyOnTimeout": true, "requireReason": true}'
) ON CONFLICT (id) DO NOTHING;

-- إدراج قواعد المخالفات الأساسية
INSERT INTO violation_rules (
    id, name, category, severity, applicable_documents, required_fields,
    criteria, error_message_ar, error_message_en,
    block_submission, require_review, escalate_to_admin, log_security_event
) VALUES 
(
    'national_id_format',
    'تنسيق رقم الهوية الوطنية',
    'format_compliance',
    'high',
    ARRAY['national_id'],
    ARRAY['nationalId'],
    '{"type": "regex", "pattern": "^[1-2][0-9]{9}$"}',
    'تنسيق رقم الهوية الوطنية غير صحيح',
    'Invalid national ID format',
    true, true, false, true
),
(
    'document_expiry',
    'انتهاء صلاحية الوثيقة',
    'format_compliance',
    'critical',
    ARRAY['national_id', 'driving_license'],
    ARRAY['expiryDate'],
    '{"type": "custom", "customFunction": "checkDocumentExpiry"}',
    'الوثيقة منتهية الصلاحية',
    'Document has expired',
    true, false, false, false
) ON CONFLICT (id) DO NOTHING;

COMMIT;
