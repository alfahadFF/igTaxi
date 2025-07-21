-- إضافة الأعمدة الجديدة لجدول driver_profiles
ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS national_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS license_number VARCHAR(20);
