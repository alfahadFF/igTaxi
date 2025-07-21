-- إضافة جدول إعدادات أرقام الطوارئ للتطبيق
CREATE TABLE IF NOT EXISTS app_emergency_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    police_number VARCHAR(10) NOT NULL,
    ambulance_number VARCHAR(10) NOT NULL,
    fire_number VARCHAR(10) NOT NULL,
    general_emergency_number VARCHAR(10),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- فهرسة للبحث السريع
CREATE INDEX IF NOT EXISTS idx_app_emergency_settings_active ON app_emergency_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_app_emergency_settings_country ON app_emergency_settings(country_code);

-- تأكد من وجود إعداد واحد فقط مفعل
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_emergency_settings_unique_active 
ON app_emergency_settings(is_active) WHERE is_active = true;

-- RLS سياسات الأمان
ALTER TABLE app_emergency_settings ENABLE ROW LEVEL SECURITY;

-- سماح للجميع بالقراءة
CREATE POLICY "Public read access to emergency settings" ON app_emergency_settings
    FOR SELECT USING (true);

-- السماح للمدراء فقط بالكتابة (يحتاج إلى جدول صلاحيات منفصل)
-- مؤقتاً نسمح للمطورين
CREATE POLICY "Admin write access to emergency settings" ON app_emergency_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM main_profiles 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

-- إدراج بيانات افتراضية للسعودية
INSERT INTO app_emergency_settings (
    country_code, 
    country_name,
    police_number, 
    ambulance_number, 
    fire_number, 
    general_emergency_number,
    is_active
) VALUES (
    'SA',
    'المملكة العربية السعودية',
    '999',
    '997', 
    '998',
    '911',
    true
) ON CONFLICT DO NOTHING;

-- إدراج بيانات للدول الأخرى (غير مفعلة)
INSERT INTO app_emergency_settings (
    country_code, country_name, police_number, ambulance_number, fire_number, general_emergency_number, is_active
) VALUES 
    ('AE', 'دولة الإمارات العربية المتحدة', '999', '998', '997', '911', false),
    ('EG', 'جمهورية مصر العربية', '122', '123', '180', '122', false),
    ('JO', 'المملكة الأردنية الهاشمية', '911', '911', '911', '911', false),
    ('KW', 'دولة الكويت', '112', '112', '112', '112', false),
    ('QA', 'دولة قطر', '999', '999', '999', '999', false),
    ('BH', 'مملكة البحرين', '999', '999', '999', '999', false),
    ('OM', 'سلطنة عمان', '9999', '9999', '9999', '9999', false),
    ('LB', 'الجمهورية اللبنانية', '112', '140', '175', '112', false),
    ('IQ', 'جمهورية العراق', '104', '115', '115', '104', false)
ON CONFLICT DO NOTHING;

-- إضافة trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_app_emergency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_emergency_settings_updated_at
    BEFORE UPDATE ON app_emergency_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_emergency_settings_updated_at();
