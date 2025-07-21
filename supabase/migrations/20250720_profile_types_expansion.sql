-- إضافة أنواع ملفات شخصية جديدة وفق تصنيفات التطبيق

-- 1. جدول أنواع الملفات الشخصية
CREATE TABLE profile_types (
  id VARCHAR(32) PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- إدراج أنواع الملفات المختلفة
INSERT INTO profile_types (id, name_en, name_ar, description_en, description_ar) VALUES
('personal', 'Personal Account', 'حساب شخصي', 'Individual user account', 'حساب مستخدم فردي'),
('driver', 'Driver', 'سائق', 'Professional driver account', 'حساب سائق محترف'),
('transporter', 'Transporter', 'ناقل', 'Transport service provider', 'مقدم خدمات النقل'),
('special_driver', 'Special Events Driver', 'سائق مناسبات', 'Driver for special events', 'سائق للمناسبات الخاصة'),
('business_restaurant', 'Restaurant Business', 'منشأة مطعم', 'Restaurant business account', 'حساب منشأة مطعم'),
('business_cafe', 'Cafe Business', 'منشأة مقهى', 'Cafe business account', 'حساب منشأة مقهى'),
('business_retail', 'Retail Business', 'منشأة تجارية', 'Retail business account', 'حساب منشأة تجارية'),
('business_fuel', 'Fuel Station', 'محطة وقود', 'Fuel station business', 'منشأة محطة وقود'),
('business_parking', 'Parking Business', 'منشأة مواقف', 'Parking service business', 'منشأة خدمات المواقف'),
('business_pharmacy', 'Pharmacy', 'صيدلية', 'Pharmacy business account', 'حساب منشأة صيدلية');

-- 2. جدول ملفات الناقلين
CREATE TABLE transporter_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50) NOT NULL, -- van, truck, etc.
  vehicle_make VARCHAR(100),
  vehicle_model VARCHAR(100),
  vehicle_year INTEGER,
  vehicle_color VARCHAR(50),
  plate_number VARCHAR(20),
  vehicle_length_meters DECIMAL(5,2),
  cargo_capacity_kg INTEGER,
  is_enclosed BOOLEAN DEFAULT false,
  fuel_type VARCHAR(20),
  profile_photo_url TEXT,
  driving_license_url TEXT,
  vehicle_registration_url TEXT,
  insurance_url TEXT,
  commercial_license_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. جدول ملفات سائقي المناسبات
CREATE TABLE special_driver_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization TEXT[], -- wedding, tourism, corporate, etc.
  vehicle_types TEXT[], -- luxury_sedan, suv, bus, etc.
  languages TEXT[],
  experience_years INTEGER,
  hourly_rate DECIMAL(10,2),
  daily_rate DECIMAL(10,2),
  profile_photo_url TEXT,
  vehicle_photos TEXT[],
  driving_license_url TEXT,
  insurance_url TEXT,
  certifications TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. جدول ملفات المنشآت التجارية (مطاعم، مقاهي، متاجر)
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_type VARCHAR(50) NOT NULL, -- restaurant, cafe, retail, fuel, parking, pharmacy
  business_name VARCHAR(200) NOT NULL,
  business_license VARCHAR(100),
  business_address TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  opening_time TIME,
  closing_time TIME,
  is_24_hours BOOLEAN DEFAULT false,
  description TEXT,
  categories TEXT[], -- food categories, product types, etc.
  services TEXT[], -- delivery, pickup, etc.
  facilities TEXT[], -- parking, wifi, etc.
  contact_email VARCHAR(255),
  website_url TEXT,
  business_photos TEXT[],
  license_documents TEXT[],
  current_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,
  average_price_range VARCHAR(20), -- budget, moderate, expensive
  capacity INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. فهارس للأداء
CREATE INDEX idx_transporter_profiles_vehicle_type ON transporter_profiles(vehicle_type);
CREATE INDEX idx_special_driver_profiles_specialization ON special_driver_profiles USING GIN(specialization);
CREATE INDEX idx_business_profiles_type ON business_profiles(business_type);
CREATE INDEX idx_business_profiles_location ON business_profiles(location_lat, location_lng);
CREATE INDEX idx_business_profiles_categories ON business_profiles USING GIN(categories);

-- 6. تريغرات للتحديث التلقائي
CREATE TRIGGER update_transporter_profiles_updated_at
BEFORE UPDATE ON transporter_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_special_driver_profiles_updated_at
BEFORE UPDATE ON special_driver_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON business_profiles
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
