-- نشر جدول إعدادات أرقام الطوارئ وربطها بنظام الأمان الكامل
-- هذا الملف يدمج أرقام الطوارئ مع النظام الحالي

-- أولاً: إنشاء جدول إعدادات أرقام الطوارئ
DO $$
BEGIN
    -- التحقق من وجود الجدول
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'app_emergency_settings') THEN
        CREATE TABLE app_emergency_settings (
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
        
        -- إنشاء الفهارس
        CREATE INDEX idx_app_emergency_settings_active ON app_emergency_settings(is_active);
        CREATE INDEX idx_app_emergency_settings_country ON app_emergency_settings(country_code);
        CREATE UNIQUE INDEX idx_app_emergency_settings_unique_active 
        ON app_emergency_settings(is_active) WHERE is_active = true;
        
        -- إضافة قيد فريد على country_code
        ALTER TABLE app_emergency_settings 
        ADD CONSTRAINT unique_country_code UNIQUE (country_code);
        
        RAISE NOTICE 'تم إنشاء جدول app_emergency_settings بنجاح';
    ELSE
        RAISE NOTICE 'جدول app_emergency_settings موجود بالفعل';
    END IF;
END $$;

-- تفعيل RLS
ALTER TABLE app_emergency_settings ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
DO $$
BEGIN
    -- سماح للجميع بالقراءة
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_emergency_settings' 
        AND policyname = 'Public read access to emergency settings'
    ) THEN
        CREATE POLICY "Public read access to emergency settings" ON app_emergency_settings
            FOR SELECT USING (true);
        RAISE NOTICE 'تم إنشاء سياسة القراءة العامة';
    END IF;
    
    -- سماح للمطورين والمدراء بالكتابة (مؤقتاً للتطوير)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_emergency_settings' 
        AND policyname = 'Admin write access to emergency settings'
    ) THEN
        CREATE POLICY "Admin write access to emergency settings" ON app_emergency_settings
            FOR ALL USING (
                auth.uid() IS NOT NULL -- أي مستخدم مسجل يمكنه التعديل (للتطوير فقط)
            );
        RAISE NOTICE 'تم إنشاء سياسة الكتابة للمطورين';
    END IF;
END $$;

-- إدراج البيانات الأساسية
INSERT INTO app_emergency_settings (
    country_code, country_name, police_number, ambulance_number, fire_number, general_emergency_number, is_active
) VALUES 
    ('SA', 'المملكة العربية السعودية', '999', '997', '998', '911', true),
    ('AE', 'دولة الإمارات العربية المتحدة', '999', '998', '997', '911', false),
    ('EG', 'جمهورية مصر العربية', '122', '123', '180', '122', false),
    ('JO', 'المملكة الأردنية الهاشمية', '911', '911', '911', '911', false),
    ('KW', 'دولة الكويت', '112', '112', '112', '112', false),
    ('QA', 'دولة قطر', '999', '999', '999', '999', false),
    ('BH', 'مملكة البحرين', '999', '999', '999', '999', false),
    ('OM', 'سلطنة عمان', '9999', '9999', '9999', '9999', false),
    ('LB', 'الجمهورية اللبنانية', '112', '140', '175', '112', false),
    ('IQ', 'جمهورية العراق', '104', '115', '115', '104', false)
ON CONFLICT (country_code) DO UPDATE SET
    country_name = EXCLUDED.country_name,
    police_number = EXCLUDED.police_number,
    ambulance_number = EXCLUDED.ambulance_number,
    fire_number = EXCLUDED.fire_number,
    general_emergency_number = EXCLUDED.general_emergency_number,
    updated_at = CURRENT_TIMESTAMP;

-- إضافة trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_app_emergency_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_emergency_settings_updated_at ON app_emergency_settings;
CREATE TRIGGER trigger_update_app_emergency_settings_updated_at
    BEFORE UPDATE ON app_emergency_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_emergency_settings_updated_at();

-- إضافة دالة مساعدة للحصول على أرقام الطوارئ النشطة
CREATE OR REPLACE FUNCTION get_active_emergency_numbers()
RETURNS TABLE (
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    police_number VARCHAR(10),
    ambulance_number VARCHAR(10),
    fire_number VARCHAR(10),
    general_emergency_number VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aes.country_code,
        aes.country_name,
        aes.police_number,
        aes.ambulance_number,
        aes.fire_number,
        aes.general_emergency_number
    FROM app_emergency_settings aes
    WHERE aes.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة دالة للحصول على رقم طوارئ محدد
CREATE OR REPLACE FUNCTION get_emergency_number_by_type(emergency_type TEXT)
RETURNS VARCHAR(10) AS $$
DECLARE
    result VARCHAR(10);
BEGIN
    SELECT 
        CASE 
            WHEN emergency_type = 'police' THEN police_number
            WHEN emergency_type = 'ambulance' THEN ambulance_number
            WHEN emergency_type = 'fire' THEN fire_number
            WHEN emergency_type = 'general' THEN COALESCE(general_emergency_number, police_number)
            ELSE COALESCE(general_emergency_number, police_number)
        END
    INTO result
    FROM app_emergency_settings
    WHERE is_active = true
    LIMIT 1;
    
    -- إذا لم توجد نتيجة، إرجاع قيمة افتراضية
    RETURN COALESCE(result, '911');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث جدول safety_settings لإضافة مرجع لأرقام الطوارئ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'safety_settings' 
        AND column_name = 'custom_emergency_number'
    ) THEN
        ALTER TABLE safety_settings 
        ADD COLUMN custom_emergency_number VARCHAR(20);
        
        RAISE NOTICE 'تم إضافة عمود custom_emergency_number';
    END IF;
END $$;

-- إضافة دالة للتحقق من صحة رقم الطوارئ
CREATE OR REPLACE FUNCTION is_valid_emergency_number(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- التحقق من أن الرقم يحتوي على أرقام فقط ويتراوح بين 3-10 أرقام
    RETURN phone_number ~ '^[0-9]{3,10}$';
END;
$$ LANGUAGE plpgsql;

-- إنشاء view لعرض تفاصيل أرقام الطوارئ بسهولة
CREATE OR REPLACE VIEW active_emergency_info AS
SELECT 
    aes.country_name AS "الدولة",
    aes.country_code AS "رمز الدولة",
    aes.police_number AS "الشرطة",
    aes.ambulance_number AS "الإسعاف", 
    aes.fire_number AS "الإطفاء",
    aes.general_emergency_number AS "طوارئ عام",
    aes.created_at AS "تاريخ الإنشاء",
    aes.updated_at AS "تاريخ التحديث"
FROM app_emergency_settings aes
WHERE aes.is_active = true;

-- منح الصلاحيات للـ view
GRANT SELECT ON active_emergency_info TO authenticated;

-- إضافة تعليق للجدول
COMMENT ON TABLE app_emergency_settings IS 'جدول إعدادات أرقام الطوارئ للتطبيق - يحتوي على أرقام الطوارئ المختلفة لكل دولة';
COMMENT ON COLUMN app_emergency_settings.country_code IS 'رمز الدولة (مثل SA, AE, EG)';
COMMENT ON COLUMN app_emergency_settings.is_active IS 'هل هذه الدولة مفعلة حالياً في التطبيق';
COMMENT ON COLUMN app_emergency_settings.police_number IS 'رقم الشرطة';
COMMENT ON COLUMN app_emergency_settings.ambulance_number IS 'رقم الإسعاف';
COMMENT ON COLUMN app_emergency_settings.fire_number IS 'رقم الإطفاء';
COMMENT ON COLUMN app_emergency_settings.general_emergency_number IS 'رقم الطوارئ العام (اختياري)';

-- النتيجة النهائية
DO $$
DECLARE
    active_country RECORD;
BEGIN
    SELECT * INTO active_country FROM get_active_emergency_numbers();
    
    IF FOUND THEN
        RAISE NOTICE '🎉 تم تفعيل نظام أرقام الطوارئ بنجاح!';
        RAISE NOTICE '📍 الدولة النشطة: % (%)', active_country.country_name, active_country.country_code;
        RAISE NOTICE '🚔 الشرطة: %', active_country.police_number;
        RAISE NOTICE '🚑 الإسعاف: %', active_country.ambulance_number;
        RAISE NOTICE '🚒 الإطفاء: %', active_country.fire_number;
        RAISE NOTICE '📞 طوارئ عام: %', COALESCE(active_country.general_emergency_number, 'غير محدد');
    ELSE
        RAISE NOTICE '⚠️ لم يتم العثور على أرقام طوارئ نشطة';
    END IF;
END $$;
