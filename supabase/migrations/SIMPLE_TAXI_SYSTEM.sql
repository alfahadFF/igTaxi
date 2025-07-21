-- =====================================================
-- تطبيق سريع لنظام التاكسي - للنسخ في Supabase Dashboard
-- =====================================================

-- تحقق من حالة الجداول الموجودة
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('main_profiles', 'driver_profiles', 'taxi_drivers', 'trips');

-- إذا كانت الجداول غير موجودة، قم بتشغيل الأكواد التالية بالترتيب:

-- =========================
-- الخطوة 1: الجداول الأساسية
-- =========================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- جدول الملفات الشخصية الرئيسية
CREATE TABLE IF NOT EXISTS main_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    profile_type VARCHAR(50) NOT NULL CHECK (profile_type IN ('personal', 'driver', 'business_owner', 'transporter')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ملفات السائقين
CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    driver_license_number VARCHAR(50) UNIQUE NOT NULL,
    driver_license_url TEXT NOT NULL,
    driver_license_expiry DATE NOT NULL,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(50),
    vehicle_plate_number VARCHAR(20) UNIQUE,
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
    is_available BOOLEAN DEFAULT FALSE,
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    total_rides INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================
-- الخطوة 2: جدول سائقي التاكسي
-- =========================

CREATE TABLE IF NOT EXISTS taxi_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    fuel_type VARCHAR(20) DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
    taxi_license_number VARCHAR(50) UNIQUE,
    meter_serial_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    can_accept_rides BOOLEAN DEFAULT FALSE,
    total_taxi_rides INTEGER DEFAULT 0,
    taxi_rating DECIMAL(3, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_profile_id)
);

-- =========================
-- الخطوة 3: جدول الرحلات
-- =========================

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES main_profiles(id),
    driver_id UUID REFERENCES main_profiles(id),
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    distance_km DECIMAL(8, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
    
    -- معلومات التسعير
    fuel_type VARCHAR(20) DEFAULT 'petrol',
    base_fare DECIMAL(8,3) DEFAULT 0.35,
    distance_fare DECIMAL(8,3) DEFAULT 0,
    waiting_charges DECIMAL(8,3) DEFAULT 0,
    surge_multiplier DECIMAL(4,2) DEFAULT 1.0,
    surge_amount DECIMAL(8,3) DEFAULT 0,
    minimum_fare_applied BOOLEAN DEFAULT FALSE,
    subtotal DECIMAL(8,3) DEFAULT 0,
    total_customer_fare DECIMAL(8,3) DEFAULT 0,
    driver_earnings DECIMAL(8,3) DEFAULT 0,
    app_commission DECIMAL(8,3) DEFAULT 0,
    commission_rate DECIMAL(4,3) DEFAULT 0.10,
    waiting_time_minutes INTEGER DEFAULT 0,
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================
-- الخطوة 4: إعدادات التسعير
-- =========================

CREATE TABLE IF NOT EXISTS pricing_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(50) UNIQUE NOT NULL,
    base_fare DECIMAL(8,3) NOT NULL DEFAULT 0.35,
    minimum_fare DECIMAL(8,3) NOT NULL DEFAULT 0.90,
    waiting_rate_per_minute DECIMAL(8,3) NOT NULL DEFAULT 0.03,
    app_commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    fuel_rates JSONB NOT NULL DEFAULT '{
        "petrol": 0.17,
        "diesel": 0.16,
        "hybrid": 0.15,
        "electric": 0.14
    }',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج الإعدادات الافتراضية
INSERT INTO pricing_config (config_name, base_fare, minimum_fare, waiting_rate_per_minute, app_commission_rate, fuel_rates)
VALUES ('default', 0.35, 0.90, 0.03, 0.10, '{
    "petrol": 0.17,
    "diesel": 0.16,
    "hybrid": 0.15,
    "electric": 0.14
}')
ON CONFLICT (config_name) DO UPDATE SET
    base_fare = EXCLUDED.base_fare,
    minimum_fare = EXCLUDED.minimum_fare,
    waiting_rate_per_minute = EXCLUDED.waiting_rate_per_minute,
    app_commission_rate = EXCLUDED.app_commission_rate,
    fuel_rates = EXCLUDED.fuel_rates,
    updated_at = NOW();

-- =========================
-- الخطوة 5: جداول الأرباح
-- =========================

CREATE TABLE IF NOT EXISTS driver_daily_earnings (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    earning_date DATE NOT NULL,
    total_trips INTEGER DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,3) DEFAULT 0,
    driver_earnings DECIMAL(10,3) DEFAULT 0,
    app_commission DECIMAL(10,3) DEFAULT 0,
    average_fare DECIMAL(8,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, earning_date)
);

-- =========================
-- الخطوة 6: دالة حساب التكلفة
-- =========================

CREATE OR REPLACE FUNCTION calculate_trip_fare(
    p_distance_km DECIMAL,
    p_fuel_type VARCHAR(20),
    p_waiting_time_minutes INTEGER DEFAULT 0,
    p_surge_multiplier DECIMAL DEFAULT 1.0
) RETURNS TABLE (
    base_fare DECIMAL(8,3),
    distance_fare DECIMAL(8,3),
    waiting_charges DECIMAL(8,3),
    surge_amount DECIMAL(8,3),
    subtotal DECIMAL(8,3),
    minimum_fare_applied BOOLEAN,
    total_fare DECIMAL(8,3),
    driver_earnings DECIMAL(8,3),
    app_commission DECIMAL(8,3)
) AS $$
DECLARE
    config_row pricing_config%ROWTYPE;
    v_base_fare DECIMAL(8,3);
    v_distance_fare DECIMAL(8,3);
    v_waiting_charges DECIMAL(8,3);
    v_subtotal_before_min DECIMAL(8,3);
    v_subtotal DECIMAL(8,3);
    v_surge_amount DECIMAL(8,3);
    v_total_fare DECIMAL(8,3);
    v_minimum_applied BOOLEAN;
    v_driver_earnings DECIMAL(8,3);
    v_app_commission DECIMAL(8,3);
    v_fuel_rate DECIMAL(8,3);
BEGIN
    -- الحصول على إعدادات التسعير النشطة
    SELECT * INTO config_row 
    FROM pricing_config 
    WHERE is_active = TRUE 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- استخراج سعر الوقود من JSON
    v_fuel_rate := (config_row.fuel_rates ->> p_fuel_type)::DECIMAL(8,3);
    
    -- حساب رسوم البداية
    v_base_fare := config_row.base_fare;
    
    -- حساب تكلفة المسافة
    v_distance_fare := p_distance_km * v_fuel_rate;
    
    -- حساب رسوم الانتظار
    v_waiting_charges := p_waiting_time_minutes * config_row.waiting_rate_per_minute;
    
    -- المجموع قبل الحد الأدنى
    v_subtotal_before_min := v_base_fare + v_distance_fare + v_waiting_charges;
    
    -- تطبيق الحد الأدنى
    v_minimum_applied := v_subtotal_before_min < config_row.minimum_fare;
    v_subtotal := GREATEST(v_subtotal_before_min, config_row.minimum_fare);
    
    -- حساب مضاعف الازدحام
    v_surge_amount := (v_subtotal * p_surge_multiplier) - v_subtotal;
    
    -- إجمالي التكلفة
    v_total_fare := v_subtotal + v_surge_amount;
    
    -- تقسيم الإيرادات
    v_app_commission := v_total_fare * config_row.app_commission_rate;
    v_driver_earnings := v_total_fare - v_app_commission;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT 
        v_base_fare,
        v_distance_fare,
        v_waiting_charges,
        v_surge_amount,
        v_subtotal,
        v_minimum_applied,
        v_total_fare,
        v_driver_earnings,
        v_app_commission;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- الخطوة 7: الفهارس
-- =========================

CREATE INDEX IF NOT EXISTS idx_main_profiles_phone ON main_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_main_id ON driver_profiles(main_profile_id);
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_profile ON taxi_drivers(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_fuel_type ON taxi_drivers(fuel_type);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_driver_daily_earnings_driver_date ON driver_daily_earnings(driver_id, earning_date);

-- =========================
-- الخطوة 8: اختبار النظام
-- =========================

-- اختبار دالة حساب التكلفة
SELECT * FROM calculate_trip_fare(10.5, 'petrol', 5, 1.2);

-- عرض الجداول المنشأة
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- رسالة تأكيد
SELECT 'تم إنشاء نظام التاكسي بنجاح! 🚕' as status;
