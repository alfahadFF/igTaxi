-- =====================================================
-- إصلاح المحفزات والسياسات الموجودة
-- =====================================================

-- 1. حذف السياسات الموجودة لتجنب التعارض
DROP POLICY IF EXISTS "Users can view their own main profile" ON main_profiles;
DROP POLICY IF EXISTS "Users can update their own main profile" ON main_profiles;
DROP POLICY IF EXISTS "Users can view their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business profiles" ON business_profiles;
DROP POLICY IF EXISTS "Users can view their own driver profile" ON driver_profiles;
DROP POLICY IF EXISTS "Users can update their own driver profile" ON driver_profiles;
DROP POLICY IF EXISTS "Users can insert their own driver profile" ON driver_profiles;
DROP POLICY IF EXISTS "Users can view their own transporter profile" ON transporter_profiles;
DROP POLICY IF EXISTS "Users can update their own transporter profile" ON transporter_profiles;
DROP POLICY IF EXISTS "Users can insert their own transporter profile" ON transporter_profiles;

-- 2. إعادة إنشاء السياسات الأساسية
-- Main profiles policies
CREATE POLICY "Users can view their own main profile" ON main_profiles FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update their own main profile" ON main_profiles FOR UPDATE USING (auth.uid()::text = id::text);

-- Business profiles policies
CREATE POLICY "Users can view their own business profiles" ON business_profiles FOR SELECT USING (
    main_profile_id::text = auth.uid()::text
);
CREATE POLICY "Users can update their own business profiles" ON business_profiles FOR UPDATE USING (
    main_profile_id::text = auth.uid()::text
);
CREATE POLICY "Users can insert their own business profiles" ON business_profiles FOR INSERT WITH CHECK (
    main_profile_id::text = auth.uid()::text
);

-- Driver profiles policies
CREATE POLICY "Users can view their own driver profile" ON driver_profiles FOR SELECT USING (
    main_profile_id::text = auth.uid()::text
);
CREATE POLICY "Users can update their own driver profile" ON driver_profiles FOR UPDATE USING (
    main_profile_id::text = auth.uid()::text
);
CREATE POLICY "Users can insert their own driver profile" ON driver_profiles FOR INSERT WITH CHECK (
    main_profile_id::text = auth.uid()::text
);

-- Transporter profiles policies
CREATE POLICY "Users can view their own transporter profile" ON transporter_profiles FOR SELECT USING (
    main_profile_id::text = auth.uid()::text
);
CREATE POLICY "Users can update their own transporter profile" ON transporter_profiles FOR UPDATE USING (
    main_profile_id::text = auth.uid()::text
);
CREATE POLICY "Users can insert their own transporter profile" ON transporter_profiles FOR INSERT WITH CHECK (
    main_profile_id::text = auth.uid()::text
);

-- 3. حذف وإعادة إنشاء العروض لتجنب التعارض
DROP VIEW IF EXISTS business_profiles_complete CASCADE;
DROP VIEW IF EXISTS driver_profiles_complete CASCADE;
DROP VIEW IF EXISTS transporter_profiles_complete CASCADE;

-- Complete business profile view
CREATE VIEW business_profiles_complete AS
SELECT 
    bp.*,
    mp.phone as owner_phone,
    mp.email as owner_email,
    mp.full_name as owner_name,
    mp.is_verified as owner_verified
FROM business_profiles bp
JOIN main_profiles mp ON bp.main_profile_id = mp.id;

-- Complete driver profile view
CREATE VIEW driver_profiles_complete AS
SELECT 
    dp.*,
    mp.phone as driver_phone,
    mp.email as driver_email,
    mp.full_name as driver_name,
    mp.is_verified as driver_verified
FROM driver_profiles dp
JOIN main_profiles mp ON dp.main_profile_id = mp.id;

-- Complete transporter profile view
CREATE VIEW transporter_profiles_complete AS
SELECT 
    tp.*,
    mp.phone as owner_phone,
    mp.email as owner_email,
    mp.full_name as owner_name,
    mp.is_verified as owner_verified
FROM transporter_profiles tp
JOIN main_profiles mp ON tp.main_profile_id = mp.id;

-- 4. التأكد من وجود العمود national_id و license_number في driver_profiles
ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS national_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(20);

-- 5. رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE 'تم إصلاح جميع المحفزات والسياسات بنجاح';
END $$;
