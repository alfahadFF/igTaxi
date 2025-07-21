-- =====================================================
-- إنشاء جدول سائقي التاكسي وإصلاح نظام التسعير
-- =====================================================

-- 1. إنشاء جدول taxi_drivers المبني على driver_profiles
CREATE TABLE IF NOT EXISTS taxi_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_profile_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
    
    -- معلومات نوع الوقود (الإضافة الجديدة لنظام التسعير)
    fuel_type VARCHAR(20) DEFAULT 'petrol' 
    CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
    
    -- معلومات إضافية خاصة بسائقي التاكسي
    taxi_license_number VARCHAR(50) UNIQUE,
    taxi_license_expiry DATE,
    meter_serial_number VARCHAR(50),
    
    -- معلومات السيارة (مكررة من driver_profiles للوضوح)
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(50),
    vehicle_plate_number VARCHAR(20),
    
    -- معلومات التشغيل
    is_active BOOLEAN DEFAULT TRUE,
    can_accept_rides BOOLEAN DEFAULT FALSE,
    preferred_areas TEXT[], -- مناطق التشغيل المفضلة
    
    -- إحصائيات الأداء
    total_taxi_rides INTEGER DEFAULT 0,
    taxi_rating DECIMAL(3, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- فهرس فريد لضمان سائق واحد لكل driver_profile
    UNIQUE(driver_profile_id)
);

-- 2. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_profile ON taxi_drivers(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_fuel_type ON taxi_drivers(fuel_type);
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_active ON taxi_drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_accept_rides ON taxi_drivers(can_accept_rides);

-- 3. إنشاء دالة لمزامنة بيانات السيارة من driver_profiles
CREATE OR REPLACE FUNCTION sync_taxi_driver_vehicle_info()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث معلومات السيارة في taxi_drivers عند تحديث driver_profiles
    UPDATE taxi_drivers 
    SET 
        vehicle_make = NEW.vehicle_make,
        vehicle_model = NEW.vehicle_model,
        vehicle_year = NEW.vehicle_year,
        vehicle_color = NEW.vehicle_color,
        vehicle_plate_number = NEW.vehicle_plate_number,
        updated_at = NOW()
    WHERE driver_profile_id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. إنشاء مُحفِز لمزامنة البيانات (حذف المحفز القديم أولاً)
DROP TRIGGER IF EXISTS sync_taxi_vehicle_info_trigger ON driver_profiles;

CREATE TRIGGER sync_taxi_vehicle_info_trigger
    AFTER UPDATE OF vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate_number 
    ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_taxi_driver_vehicle_info();

-- 5. إضافة بيانات افتراضية للسائقين الموجودين
INSERT INTO taxi_drivers (driver_profile_id, fuel_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate_number)
SELECT 
    dp.id,
    'petrol' as fuel_type,
    dp.vehicle_make,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.vehicle_color,
    dp.vehicle_plate_number
FROM driver_profiles dp
WHERE dp.id NOT IN (SELECT driver_profile_id FROM taxi_drivers WHERE driver_profile_id IS NOT NULL)
ON CONFLICT (driver_profile_id) DO NOTHING;

-- 6. إنشاء عرض شامل لسائقي التاكسي
CREATE OR REPLACE VIEW taxi_drivers_full_info AS
SELECT 
    td.id as taxi_driver_id,
    td.driver_profile_id,
    mp.id as main_profile_id,
    mp.phone,
    mp.full_name,
    mp.email,
    mp.avatar_url,
    
    -- معلومات السائق
    dp.driver_license_number,
    dp.driver_license_expiry,
    dp.approval_status,
    dp.is_available,
    dp.current_location_lat,
    dp.current_location_lng,
    dp.last_location_update,
    dp.total_rides,
    dp.average_rating,
    dp.total_earnings,
    
    -- معلومات التاكسي
    td.fuel_type,
    td.taxi_license_number,
    td.taxi_license_expiry,
    td.meter_serial_number,
    td.vehicle_make,
    td.vehicle_model,
    td.vehicle_year,
    td.vehicle_color,
    td.vehicle_plate_number,
    td.is_active as taxi_active,
    td.can_accept_rides,
    td.preferred_areas,
    td.total_taxi_rides,
    td.taxi_rating,
    
    td.created_at as taxi_registration_date,
    td.updated_at as last_taxi_update
    
FROM taxi_drivers td
JOIN driver_profiles dp ON td.driver_profile_id = dp.id
JOIN main_profiles mp ON dp.main_profile_id = mp.id;

-- 7. إضافة سياسات الأمان
ALTER TABLE taxi_drivers ENABLE ROW LEVEL SECURITY;

-- السائقون يمكنهم رؤية وتعديل بياناتهم فقط
CREATE POLICY taxi_drivers_own_data ON taxi_drivers
    FOR ALL USING (
        driver_profile_id IN (
            SELECT dp.id 
            FROM driver_profiles dp 
            WHERE dp.main_profile_id = auth.uid()
        )
    );

-- المديرون يمكنهم رؤية جميع البيانات
CREATE POLICY admin_all_taxi_drivers ON taxi_drivers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM main_profiles 
            WHERE id = auth.uid() 
            AND profile_type = 'admin'
        )
    );

-- 8. إضافة التعليقات
COMMENT ON TABLE taxi_drivers IS 'جدول سائقي التاكسي مع معلومات نوع الوقود والتراخيص';
COMMENT ON COLUMN taxi_drivers.fuel_type IS 'نوع وقود السيارة: بنزين، ديزل، هجين، كهربائي';
COMMENT ON COLUMN taxi_drivers.taxi_license_number IS 'رقم رخصة التاكسي';
COMMENT ON COLUMN taxi_drivers.meter_serial_number IS 'رقم العداد المعتمد';
COMMENT ON COLUMN taxi_drivers.preferred_areas IS 'المناطق المفضلة للعمل';
