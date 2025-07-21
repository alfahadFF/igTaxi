-- إنشاء نظام الملفات الشخصية - إصدار أساسي
-- يجب تشغيل هذا أولاً في Supabase SQL Editor

-- ==============================================
-- إنشاء الجداول الأساسية فقط
-- ==============================================

-- جدول الملفات الشخصية الرئيسي
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

-- جدول أنواع الملفات الشخصية
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

-- الجداول المرتبطة بالسائقين
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

-- إضافة الدوال والتريغرز
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- التريغرز
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_personal_profiles_updated_at ON personal_profiles;
CREATE TRIGGER update_personal_profiles_updated_at 
    BEFORE UPDATE ON personal_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_driver_profiles_updated_at ON driver_profiles;
CREATE TRIGGER update_driver_profiles_updated_at 
    BEFORE UPDATE ON driver_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transporter_profiles_updated_at ON transporter_profiles;
CREATE TRIGGER update_transporter_profiles_updated_at 
    BEFORE UPDATE ON transporter_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_special_driver_profiles_updated_at ON special_driver_profiles;
CREATE TRIGGER update_special_driver_profiles_updated_at 
    BEFORE UPDATE ON special_driver_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON business_profiles;
CREATE TRIGGER update_business_profiles_updated_at 
    BEFORE UPDATE ON business_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تفعيل Row Level Security
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

-- السياسات الأمنية الأساسية
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view profile types" ON profile_types;
CREATE POLICY "Authenticated users can view profile types" ON profile_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- نجح إنشاء الجداول الأساسية!
