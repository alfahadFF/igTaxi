-- إضافة الفهارس والسياسات المتقدمة
-- يجب تشغيل هذا بعد step1_basic_tables.sql

-- ==============================================
-- إنشاء الفهارس للأداء
-- ==============================================

-- التحقق من وجود الجداول والأعمدة قبل إنشاء الفهارس
DO $$
BEGIN
    -- فهارس جدول profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_type ON profiles(type);
        CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);
        CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
    END IF;

    -- فهارس جدول driver_profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_profiles' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_active ON driver_profiles(is_active);
        CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(available);
        CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_latitude, current_longitude);
    END IF;

    -- فهارس جدول transporter_profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporter_profiles' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_transporter_profiles_vehicle_type ON transporter_profiles(vehicle_type);
        CREATE INDEX IF NOT EXISTS idx_transporter_profiles_is_active ON transporter_profiles(is_active);
    END IF;

    -- فهارس جدول special_driver_profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'special_driver_profiles' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_special_driver_profiles_specialization ON special_driver_profiles(specialization_type);
        CREATE INDEX IF NOT EXISTS idx_special_driver_profiles_is_active ON special_driver_profiles(is_active);
        CREATE INDEX IF NOT EXISTS idx_special_driver_profiles_available ON special_driver_profiles(available_for_work);
    END IF;

    -- فهارس جدول business_profiles
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_profiles' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_business_profiles_business_type ON business_profiles(business_type);
        CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
        CREATE INDEX IF NOT EXISTS idx_business_profiles_is_active ON business_profiles(is_active);
    END IF;

    -- فهارس الجداول المرتبطة
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_ratings') THEN
        CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings(driver_id);
        CREATE INDEX IF NOT EXISTS idx_driver_ratings_rating ON driver_ratings(rating);
    END IF;
END $$;

-- ==============================================
-- السياسات المتقدمة
-- ==============================================

-- سياسات الجداول الفرعية
DROP POLICY IF EXISTS "Users can view own personal profile" ON personal_profiles;
CREATE POLICY "Users can view own personal profile" ON personal_profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own personal profile" ON personal_profiles;
CREATE POLICY "Users can update own personal profile" ON personal_profiles
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own personal profile" ON personal_profiles;
CREATE POLICY "Users can insert own personal profile" ON personal_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own driver profile" ON driver_profiles;
CREATE POLICY "Users can view own driver profile" ON driver_profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own driver profile" ON driver_profiles;
CREATE POLICY "Users can update own driver profile" ON driver_profiles
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own driver profile" ON driver_profiles;
CREATE POLICY "Users can insert own driver profile" ON driver_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own transporter profile" ON transporter_profiles;
CREATE POLICY "Users can view own transporter profile" ON transporter_profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own transporter profile" ON transporter_profiles;
CREATE POLICY "Users can update own transporter profile" ON transporter_profiles
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own transporter profile" ON transporter_profiles;
CREATE POLICY "Users can insert own transporter profile" ON transporter_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own special driver profile" ON special_driver_profiles;
CREATE POLICY "Users can view own special driver profile" ON special_driver_profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own special driver profile" ON special_driver_profiles;
CREATE POLICY "Users can update own special driver profile" ON special_driver_profiles
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own special driver profile" ON special_driver_profiles;
CREATE POLICY "Users can insert own special driver profile" ON special_driver_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own business profile" ON business_profiles;
CREATE POLICY "Users can view own business profile" ON business_profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own business profile" ON business_profiles;
CREATE POLICY "Users can update own business profile" ON business_profiles
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own business profile" ON business_profiles;
CREATE POLICY "Users can insert own business profile" ON business_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- سياسات جداول السائقين المرتبطة
DROP POLICY IF EXISTS "Users can view driver ratings" ON driver_ratings;
CREATE POLICY "Users can view driver ratings" ON driver_ratings
    FOR SELECT USING (auth.uid() = driver_id OR auth.uid() = customer_id);
DROP POLICY IF EXISTS "Customers can insert driver ratings" ON driver_ratings;
CREATE POLICY "Customers can insert driver ratings" ON driver_ratings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can view complaints" ON driver_complaints;
CREATE POLICY "Users can view complaints" ON driver_complaints
    FOR SELECT USING (auth.uid() = driver_id OR auth.uid() = customer_id);
DROP POLICY IF EXISTS "Users can insert complaints" ON driver_complaints;
CREATE POLICY "Users can insert complaints" ON driver_complaints
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Users can view own loyalty points" ON driver_loyalty_points;
CREATE POLICY "Users can view own loyalty points" ON driver_loyalty_points
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own loyalty points" ON driver_loyalty_points;
CREATE POLICY "Users can update own loyalty points" ON driver_loyalty_points
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own loyalty points" ON driver_loyalty_points;
CREATE POLICY "Users can insert own loyalty points" ON driver_loyalty_points
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own points history" ON driver_points_history;
CREATE POLICY "Users can view own points history" ON driver_points_history
    FOR SELECT USING (auth.uid() = driver_id);
DROP POLICY IF EXISTS "System can insert points history" ON driver_points_history;
CREATE POLICY "System can insert points history" ON driver_points_history
    FOR INSERT WITH CHECK (true);

-- ==============================================
-- إضافة القيود والتحقق
-- ==============================================

DO $$ 
BEGIN
    -- إضافة القيود فقط إذا لم تكن موجودة والأعمدة موجودة
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_max_capacity_positive') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporter_profiles' AND column_name = 'max_capacity') THEN
        ALTER TABLE transporter_profiles ADD CONSTRAINT check_max_capacity_positive 
            CHECK (max_capacity IS NULL OR max_capacity > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_manufacturing_year_valid') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporter_profiles' AND column_name = 'manufacturing_year') THEN
        ALTER TABLE transporter_profiles ADD CONSTRAINT check_manufacturing_year_valid 
            CHECK (manufacturing_year IS NULL OR (manufacturing_year >= 1900 AND manufacturing_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_years_experience_positive') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'special_driver_profiles' AND column_name = 'years_of_experience') THEN
        ALTER TABLE special_driver_profiles ADD CONSTRAINT check_years_experience_positive 
            CHECK (years_of_experience >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_business_type_valid') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_profiles' AND column_name = 'business_type') THEN
        ALTER TABLE business_profiles ADD CONSTRAINT check_business_type_valid 
            CHECK (business_type IN ('restaurant', 'cafe', 'retail', 'fuel', 'parking', 'pharmacy'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_profile_type_valid') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'type') THEN
        ALTER TABLE profiles ADD CONSTRAINT check_profile_type_valid 
            CHECK (type IN ('personal', 'driver', 'transporter', 'special_driver', 'business_restaurant', 'business_cafe', 'business_retail', 'business_fuel', 'business_parking', 'business_pharmacy'));
    END IF;
END $$;

-- إنشاء View
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

GRANT SELECT ON user_profile_summary TO authenticated;
ALTER VIEW user_profile_summary SET (security_invoker = true);

-- تم الانتهاء من النظام!
