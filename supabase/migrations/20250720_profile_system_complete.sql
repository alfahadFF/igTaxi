-- تطبيق توسعة الملفات الشخصية (نسخة نظيفة)
-- يجب تشغيل هذا في واجهة Supabase SQL Editor

-- ==============================================
-- القسم 1: إنشاء الجداول الأساسية
-- ==============================================

-- إنشاء جدول الملفات الشخصية الأساسي
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    full_name VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(200),
    type VARCHAR(50) DEFAULT 'personal',
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء جدول أنواع الملفات الشخصية
CREATE TABLE IF NOT EXISTS profile_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- إدراج الأنواع المتاحة
INSERT INTO profile_types (type_name, description) VALUES
('personal', 'الملف الشخصي العادي'),
('driver', 'ملف سائق التاكسي'),
('transporter', 'ملف سائق النقل'),
('special_driver', 'ملف السائق المختص'),
('business_restaurant', 'ملف المطعم'),
('business_cafe', 'ملف المقهى'),
('business_retail', 'ملف المتجر التجاري'),
('business_fuel', 'ملف محطة الوقود'),
('business_parking', 'ملف موقف السيارات'),
('business_pharmacy', 'ملف الصيدلية')
ON CONFLICT (type_name) DO NOTHING;

-- ==============================================
-- القسم 2: إنشاء الجداول الفرعية
-- ==============================================

-- جدول الملفات الشخصية العادية
CREATE TABLE IF NOT EXISTS personal_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    avatar_url TEXT,
    blood_type VARCHAR(10),
    health_conditions TEXT[],
    health_notes TEXT,
    emergency_contacts JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول ملفات السائقين
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(50),
    license_plate VARCHAR(50),
    license_number VARCHAR(100),
    license_expiry DATE,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    available BOOLEAN DEFAULT false,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    total_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول ملفات الناقلين
CREATE TABLE IF NOT EXISTS transporter_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(100),
    vehicle_number VARCHAR(50),
    max_capacity INTEGER,
    manufacturing_year INTEGER,
    license_number VARCHAR(100),
    license_expiry DATE,
    is_active BOOLEAN DEFAULT true,
    services TEXT[],
    specializations TEXT[],
    insurance_number VARCHAR(100),
    insurance_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول ملفات السائقين المختصين
CREATE TABLE IF NOT EXISTS special_driver_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    specialization_type VARCHAR(100),
    professional_license VARCHAR(100),
    years_of_experience INTEGER DEFAULT 0,
    license_expiry DATE,
    certifications TEXT[],
    languages TEXT[],
    equipment TEXT[],
    is_active BOOLEAN DEFAULT true,
    available_for_work BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول ملفات الأعمال التجارية
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(50),
    commercial_register VARCHAR(100),
    tax_number VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(200),
    website VARCHAR(200),
    description TEXT,
    working_hours TEXT,
    services TEXT[],
    specialties TEXT[],
    payment_methods TEXT[],
    delivery_available BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    license_expiry DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- القسم 3: جداول السائقين المرتبطة
-- ==============================================

CREATE TABLE IF NOT EXISTS driver_ratings (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_complaints (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    complaint_type VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_loyalty_points (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    level VARCHAR(50) DEFAULT 'bronze',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_points_history (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    points_change INTEGER,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- القسم 4: إنشاء الدوال والتريغرز
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق التريغرز على جميع الجداول
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_profiles_updated_at 
    BEFORE UPDATE ON personal_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_profiles_updated_at 
    BEFORE UPDATE ON driver_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transporter_profiles_updated_at 
    BEFORE UPDATE ON transporter_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_driver_profiles_updated_at 
    BEFORE UPDATE ON special_driver_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at 
    BEFORE UPDATE ON business_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- القسم 5: إنشاء الفهارس للأداء
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_active ON driver_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(available);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_latitude, current_longitude);

CREATE INDEX IF NOT EXISTS idx_transporter_profiles_vehicle_type ON transporter_profiles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_is_active ON transporter_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_special_driver_profiles_specialization ON special_driver_profiles(specialization_type);
CREATE INDEX IF NOT EXISTS idx_special_driver_profiles_is_active ON special_driver_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_special_driver_profiles_available ON special_driver_profiles(available_for_work);

CREATE INDEX IF NOT EXISTS idx_business_profiles_business_type ON business_profiles(business_type);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_is_active ON business_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_rating ON driver_ratings(rating);

-- ==============================================
-- القسم 6: تفعيل Row Level Security
-- ==============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_points_history ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- القسم 7: إنشاء السياسات الأمنية
-- ==============================================

-- سياسات جدول profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- سياسات جدول profile_types (قراءة فقط)
DROP POLICY IF EXISTS "Authenticated users can view profile types" ON profile_types;
CREATE POLICY "Authenticated users can view profile types" ON profile_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- سياسات الجداول الفرعية (نفس النمط لجميع الجداول)
CREATE POLICY "Users can view own personal profile" ON personal_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own personal profile" ON personal_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own personal profile" ON personal_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own driver profile" ON driver_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own driver profile" ON driver_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own driver profile" ON driver_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own transporter profile" ON transporter_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own transporter profile" ON transporter_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own transporter profile" ON transporter_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own special driver profile" ON special_driver_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own special driver profile" ON special_driver_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own special driver profile" ON special_driver_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own business profile" ON business_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own business profile" ON business_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own business profile" ON business_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- سياسات جداول السائقين المرتبطة
CREATE POLICY "Users can view driver ratings" ON driver_ratings
    FOR SELECT USING (auth.uid() = driver_id OR auth.uid() = customer_id);
CREATE POLICY "Customers can insert driver ratings" ON driver_ratings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view complaints" ON driver_complaints
    FOR SELECT USING (auth.uid() = driver_id OR auth.uid() = customer_id);
CREATE POLICY "Users can insert complaints" ON driver_complaints
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can view own loyalty points" ON driver_loyalty_points
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own loyalty points" ON driver_loyalty_points
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own loyalty points" ON driver_loyalty_points
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own points history" ON driver_points_history
    FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "System can insert points history" ON driver_points_history
    FOR INSERT WITH CHECK (true);

-- ==============================================
-- القسم 8: إضافة القيود والتحقق
-- ==============================================

DO $$ 
BEGIN
    -- إضافة القيود فقط إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_capacity_positive') THEN
        ALTER TABLE transporter_profiles ADD CONSTRAINT check_max_capacity_positive 
            CHECK (max_capacity IS NULL OR max_capacity > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_manufacturing_year_valid') THEN
        ALTER TABLE transporter_profiles ADD CONSTRAINT check_manufacturing_year_valid 
            CHECK (manufacturing_year IS NULL OR (manufacturing_year >= 1900 AND manufacturing_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_years_experience_positive') THEN
        ALTER TABLE special_driver_profiles ADD CONSTRAINT check_years_experience_positive 
            CHECK (years_of_experience >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_business_type_valid') THEN
        ALTER TABLE business_profiles ADD CONSTRAINT check_business_type_valid 
            CHECK (business_type IN ('restaurant', 'cafe', 'retail', 'fuel', 'parking', 'pharmacy'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_profile_type_valid') THEN
        ALTER TABLE profiles ADD CONSTRAINT check_profile_type_valid 
            CHECK (type IN ('personal', 'driver', 'transporter', 'special_driver', 'business_restaurant', 'business_cafe', 'business_retail', 'business_fuel', 'business_parking', 'business_pharmacy'));
    END IF;
END $$;

-- ==============================================
-- القسم 9: إنشاء Views للاستعلامات
-- ==============================================

CREATE OR REPLACE VIEW user_profile_summary AS
SELECT 
    p.id,
    p.full_name,
    p.type,
    p.phone,
    p.email,
    p.verified,
    p.created_at,
    p.updated_at
FROM profiles p;

-- منح الصلاحيات للـ view
GRANT SELECT ON user_profile_summary TO authenticated;
ALTER VIEW user_profile_summary SET (security_invoker = true);

-- ==============================================
-- القسم 10: التعليقات والوصف
-- ==============================================

COMMENT ON TABLE profiles IS 'الجدول الرئيسي لجميع الملفات الشخصية';
COMMENT ON TABLE profile_types IS 'أنواع الملفات الشخصية المتاحة في النظام';
COMMENT ON TABLE personal_profiles IS 'ملفات شخصية للمستخدمين العاديين';
COMMENT ON TABLE driver_profiles IS 'ملفات شخصية لسائقي التاكسي';
COMMENT ON TABLE transporter_profiles IS 'ملفات شخصية لسائقي النقل والترحيل';
COMMENT ON TABLE special_driver_profiles IS 'ملفات شخصية للسائقين المختصين (طبي، كبار السن، إلخ)';
COMMENT ON TABLE business_profiles IS 'ملفات شخصية للأنشطة التجارية (مطاعم، مقاهي، إلخ)';

-- إنتهاء الملف
