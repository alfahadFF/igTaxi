-- ===================================================================
-- IGTaxi Complete Migration System
-- تاريخ الإنشاء: 2025-07-20
-- الوصف: ملف ترحيل شامل لجميع نماذج ومكونات تطبيق IGTaxi
-- ===================================================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===================================================================
-- 1. جداول الملفات الشخصية والمستخدمين
-- ===================================================================

-- جدول الملفات الشخصية الأساسية
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE,
    avatar_url TEXT,
    user_type TEXT NOT NULL CHECK (user_type IN ('personal', 'driver', 'business', 'transporter')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    location GEOGRAPHY(POINT, 4326),
    address TEXT,
    city TEXT DEFAULT 'دبي',
    country TEXT DEFAULT 'الإمارات العربية المتحدة',
    language TEXT DEFAULT 'ar',
    is_verified BOOLEAN DEFAULT false,
    verification_documents JSONB DEFAULT '[]'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الملفات الشخصية للأفراد
CREATE TABLE IF NOT EXISTS public.personal_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    nationality TEXT,
    emirates_id TEXT UNIQUE,
    passport_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_conditions TEXT[],
    allergies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ملفات السائقين
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    license_number TEXT UNIQUE NOT NULL,
    license_type TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    vehicle_registration TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_color TEXT,
    vehicle_type TEXT CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'luxury', 'electric', 'hybrid')),
    vehicle_capacity INTEGER DEFAULT 4,
    rta_permit TEXT UNIQUE,
    insurance_number TEXT,
    insurance_expiry DATE,
    background_check_status TEXT DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
    driving_experience_years INTEGER,
    languages_spoken TEXT[] DEFAULT ARRAY['ar', 'en'],
    specializations TEXT[],
    availability_status TEXT DEFAULT 'offline' CHECK (availability_status IN ('online', 'offline', 'busy', 'break')),
    current_location GEOGRAPHY(POINT, 4326),
    home_base_location GEOGRAPHY(POINT, 4326),
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_trips INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    commission_rate DECIMAL(5,2) DEFAULT 15.00,
    bank_account_details JSONB,
    working_hours JSONB DEFAULT '{"monday": {"start": "06:00", "end": "22:00"}, "tuesday": {"start": "06:00", "end": "22:00"}, "wednesday": {"start": "06:00", "end": "22:00"}, "thursday": {"start": "06:00", "end": "22:00"}, "friday": {"start": "06:00", "end": "22:00"}, "saturday": {"start": "06:00", "end": "22:00"}, "sunday": {"start": "08:00", "end": "20:00"}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ملفات الشركات
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('restaurant', 'pharmacy', 'grocery', 'electronics', 'clothing', 'services', 'fuel_station', 'parking', 'other')),
    trade_license TEXT UNIQUE NOT NULL,
    tax_registration TEXT,
    business_description TEXT,
    website TEXT,
    business_hours JSONB DEFAULT '{"monday": {"start": "09:00", "end": "22:00", "closed": false}, "tuesday": {"start": "09:00", "end": "22:00", "closed": false}, "wednesday": {"start": "09:00", "end": "22:00", "closed": false}, "thursday": {"start": "09:00", "end": "22:00", "closed": false}, "friday": {"start": "09:00", "end": "22:00", "closed": false}, "saturday": {"start": "09:00", "end": "22:00", "closed": false}, "sunday": {"start": "09:00", "end": "22:00", "closed": false}}'::jsonb,
    delivery_radius INTEGER DEFAULT 10,
    minimum_order_amount DECIMAL(8,2) DEFAULT 0.00,
    delivery_fee DECIMAL(6,2) DEFAULT 0.00,
    service_categories TEXT[],
    payment_methods TEXT[] DEFAULT ARRAY['cash', 'card'],
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_orders INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'premium', 'enterprise')),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 2. نظام التاكسي والرحلات
-- ===================================================================

-- جدول أنواع المركبات وأسعارها
CREATE TABLE IF NOT EXISTS public.vehicle_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    base_fare DECIMAL(8,2) NOT NULL,
    per_km_rate DECIMAL(8,2) NOT NULL,
    per_minute_rate DECIMAL(8,2) NOT NULL,
    minimum_fare DECIMAL(8,2) NOT NULL,
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    fuel_type TEXT CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid')) DEFAULT 'petrol',
    features TEXT[],
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج أنواع المركبات الافتراضية
INSERT INTO public.vehicle_types (name, name_ar, description, capacity, base_fare, per_km_rate, per_minute_rate, minimum_fare, fuel_type, features) VALUES
('Economy', 'اقتصادي', 'سيارة اقتصادية مريحة', 4, 5.00, 1.50, 0.25, 10.00, 'petrol', ARRAY['air_conditioning', 'music']),
('Comfort', 'مريح', 'سيارة مريحة متوسطة الحجم', 4, 7.00, 2.00, 0.30, 12.00, 'petrol', ARRAY['air_conditioning', 'music', 'phone_charger']),
('Premium', 'مميز', 'سيارة فاخرة مع خدمات إضافية', 4, 12.00, 3.00, 0.50, 20.00, 'petrol', ARRAY['leather_seats', 'wifi', 'premium_music', 'phone_charger', 'water']),
('SUV', 'دفع رباعي', 'سيارة دفع رباعي كبيرة', 6, 15.00, 3.50, 0.60, 25.00, 'petrol', ARRAY['large_space', 'air_conditioning', 'music']),
('Electric', 'كهربائي', 'سيارة كهربائية صديقة للبيئة', 4, 8.00, 2.20, 0.35, 15.00, 'electric', ARRAY['eco_friendly', 'silent', 'air_conditioning', 'music']),
('Luxury', 'فاخر', 'سيارة فاخرة من الطراز الأول', 4, 25.00, 5.00, 1.00, 40.00, 'petrol', ARRAY['luxury_interior', 'chauffeur', 'wifi', 'premium_music', 'refreshments'])
ON CONFLICT (name) DO NOTHING;

-- جدول الرحلات
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    vehicle_type_id UUID REFERENCES public.vehicle_types(id),
    pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_address TEXT NOT NULL,
    estimated_distance DECIMAL(8,2),
    actual_distance DECIMAL(8,2),
    estimated_duration INTEGER, -- بالدقائق
    actual_duration INTEGER,
    estimated_fare DECIMAL(8,2),
    final_fare DECIMAL(8,2),
    surge_multiplier DECIMAL(4,2) DEFAULT 1.00,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled', 'payment_pending')),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'wallet')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    special_requests TEXT,
    notes TEXT,
    trip_route JSONB,
    rating_passenger INTEGER CHECK (rating_passenger >= 1 AND rating_passenger <= 5),
    rating_driver INTEGER CHECK (rating_driver >= 1 AND rating_driver <= 5),
    passenger_feedback TEXT,
    driver_feedback TEXT,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES public.profiles(id),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول عروض السائقين
CREATE TABLE IF NOT EXISTS public.trip_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    estimated_arrival_time INTEGER NOT NULL, -- بالدقائق
    offered_fare DECIMAL(8,2),
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trip_id, driver_id)
);

-- ===================================================================
-- 3. نظام النقل والشحن
-- ===================================================================

-- جدول أنواع الشحن
CREATE TABLE IF NOT EXISTS public.cargo_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    max_weight DECIMAL(8,2), -- بالكيلوغرام
    max_volume DECIMAL(8,2), -- بالمتر المكعب
    base_rate DECIMAL(8,2) NOT NULL,
    per_km_rate DECIMAL(8,2) NOT NULL,
    handling_fee DECIMAL(8,2) DEFAULT 0.00,
    special_requirements TEXT[],
    vehicle_requirements TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج أنواع الشحن الافتراضية
INSERT INTO public.cargo_types (name, name_ar, max_weight, max_volume, base_rate, per_km_rate, handling_fee, special_requirements, vehicle_requirements) VALUES
('Small Package', 'طرد صغير', 5.0, 0.1, 15.00, 2.00, 5.00, ARRAY['fragile_handling'], ARRAY['car', 'motorcycle']),
('Medium Box', 'صندوق متوسط', 25.0, 0.5, 25.00, 3.00, 10.00, ARRAY[], ARRAY['car', 'van']),
('Large Item', 'قطعة كبيرة', 100.0, 2.0, 50.00, 5.00, 20.00, ARRAY['careful_handling'], ARRAY['van', 'truck']),
('Furniture', 'أثاث', 500.0, 10.0, 100.00, 8.00, 50.00, ARRAY['assembly_service', 'protection'], ARRAY['truck', 'specialized']),
('Electronics', 'إلكترونيات', 50.0, 1.0, 40.00, 4.00, 15.00, ARRAY['anti_static', 'temperature_control'], ARRAY['car', 'van']),
('Documents', 'مستندات', 1.0, 0.01, 10.00, 1.50, 0.00, ARRAY['confidential', 'waterproof'], ARRAY['car', 'motorcycle'])
ON CONFLICT (name) DO NOTHING;

-- جدول طلبات النقل
CREATE TABLE IF NOT EXISTS public.transport_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    transporter_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    cargo_type_id UUID REFERENCES public.cargo_types(id),
    pickup_location GEOGRAPHY(POINT, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT, 4326) NOT NULL,
    delivery_address TEXT NOT NULL,
    pickup_contact_name TEXT NOT NULL,
    pickup_contact_phone TEXT NOT NULL,
    delivery_contact_name TEXT NOT NULL,
    delivery_contact_phone TEXT NOT NULL,
    cargo_description TEXT NOT NULL,
    cargo_weight DECIMAL(8,2),
    cargo_dimensions TEXT, -- "length x width x height"
    special_instructions TEXT,
    estimated_value DECIMAL(10,2),
    insurance_required BOOLEAN DEFAULT false,
    fragile BOOLEAN DEFAULT false,
    urgent BOOLEAN DEFAULT false,
    preferred_pickup_time TIMESTAMP WITH TIME ZONE,
    preferred_delivery_time TIMESTAMP WITH TIME ZONE,
    estimated_distance DECIMAL(8,2),
    estimated_cost DECIMAL(8,2),
    final_cost DECIMAL(8,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    photos TEXT[],
    tracking_code TEXT UNIQUE,
    pickup_signature TEXT,
    delivery_signature TEXT,
    pickup_photo TEXT,
    delivery_photo TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    transporter_rating INTEGER CHECK (transporter_rating >= 1 AND transporter_rating <= 5),
    customer_feedback TEXT,
    transporter_feedback TEXT,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 4. نظام المطاعم وتوصيل الطعام
-- ===================================================================

-- جدول فئات الطعام
CREATE TABLE IF NOT EXISTS public.food_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج فئات الطعام الافتراضية
INSERT INTO public.food_categories (name, name_ar, icon, sort_order) VALUES
('Arabic', 'عربي', '🥙', 1),
('International', 'عالمي', '🍝', 2),
('Fast Food', 'وجبات سريعة', '🍔', 3),
('Seafood', 'مأكولات بحرية', '🦐', 4),
('Desserts', 'حلويات', '🍰', 5),
('Beverages', 'مشروبات', '🥤', 6),
('Healthy', 'صحي', '🥗', 7),
('Asian', 'آسيوي', '🍜', 8),
('Pizza', 'بيتزا', '🍕', 9),
('Coffee', 'قهوة', '☕', 10)
ON CONFLICT (name) DO NOTHING;

-- جدول عناصر القائمة
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.food_categories(id),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    price DECIMAL(8,2) NOT NULL,
    original_price DECIMAL(8,2),
    image_url TEXT,
    images TEXT[],
    ingredients TEXT[],
    allergens TEXT[],
    nutritional_info JSONB,
    preparation_time INTEGER, -- بالدقائق
    calories INTEGER,
    is_vegetarian BOOLEAN DEFAULT false,
    is_vegan BOOLEAN DEFAULT false,
    is_gluten_free BOOLEAN DEFAULT false,
    is_spicy BOOLEAN DEFAULT false,
    spice_level INTEGER CHECK (spice_level >= 0 AND spice_level <= 5),
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    variants JSONB, -- للحجم، الإضافات، إلخ
    customizations JSONB,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول طلبات الطعام
CREATE TABLE IF NOT EXISTS public.food_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    delivery_driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT, 4326),
    customer_phone TEXT NOT NULL,
    special_instructions TEXT,
    subtotal DECIMAL(8,2) NOT NULL,
    delivery_fee DECIMAL(8,2) DEFAULT 0.00,
    service_fee DECIMAL(8,2) DEFAULT 0.00,
    tax_amount DECIMAL(8,2) DEFAULT 0.00,
    discount_amount DECIMAL(8,2) DEFAULT 0.00,
    total_amount DECIMAL(8,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'wallet')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled')),
    estimated_preparation_time INTEGER,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    restaurant_rating INTEGER CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    customer_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول عناصر طلبات الطعام
CREATE TABLE IF NOT EXISTS public.food_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.food_orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(8,2) NOT NULL,
    total_price DECIMAL(8,2) NOT NULL,
    special_requests TEXT,
    customizations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 5. نظام الصيدليات
-- ===================================================================

-- جدول فئات الأدوية
CREATE TABLE IF NOT EXISTS public.medication_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    icon TEXT,
    requires_prescription BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج فئات الأدوية الافتراضية
INSERT INTO public.medication_categories (name, name_ar, icon, requires_prescription, sort_order) VALUES
('Pain Relief', 'مسكنات', '💊', false, 1),
('Cold & Flu', 'برد وإنفلونزا', '🤧', false, 2),
('Vitamins', 'فيتامينات', '🍊', false, 3),
('First Aid', 'إسعافات أولية', '🩹', false, 4),
('Prescription', 'أدوية بوصفة', '📋', true, 5),
('Baby Care', 'عناية بالأطفال', '👶', false, 6),
('Skincare', 'العناية بالبشرة', '🧴', false, 7),
('Dental Care', 'العناية بالأسنان', '🦷', false, 8),
('Women Health', 'صحة المرأة', '👩', false, 9),
('Diabetic Care', 'رعاية السكري', '🩺', false, 10)
ON CONFLICT (name) DO NOTHING;

-- جدول المنتجات الصيدلانية
CREATE TABLE IF NOT EXISTS public.pharmacy_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pharmacy_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.medication_categories(id),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    description_ar TEXT,
    brand TEXT,
    manufacturer TEXT,
    generic_name TEXT,
    dosage TEXT,
    form TEXT, -- tablet, syrup, cream, etc.
    price DECIMAL(8,2) NOT NULL,
    original_price DECIMAL(8,2),
    image_url TEXT,
    images TEXT[],
    barcode TEXT UNIQUE,
    sku TEXT UNIQUE,
    batch_number TEXT,
    expiry_date DATE,
    stock_quantity INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 5,
    requires_prescription BOOLEAN DEFAULT false,
    active_ingredients TEXT[],
    side_effects TEXT[],
    contraindications TEXT[],
    dosage_instructions TEXT,
    storage_conditions TEXT,
    age_restrictions TEXT,
    pregnancy_category TEXT,
    is_otc BOOLEAN DEFAULT true, -- Over The Counter
    is_refrigerated BOOLEAN DEFAULT false,
    is_controlled BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_orders INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول طلبات الصيدلية
CREATE TABLE IF NOT EXISTS public.pharmacy_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    pharmacy_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    delivery_driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    prescription_required BOOLEAN DEFAULT false,
    prescription_image TEXT,
    doctor_name TEXT,
    doctor_license TEXT,
    delivery_address TEXT NOT NULL,
    delivery_location GEOGRAPHY(POINT, 4326),
    customer_phone TEXT NOT NULL,
    patient_name TEXT,
    patient_age INTEGER,
    special_instructions TEXT,
    subtotal DECIMAL(8,2) NOT NULL,
    delivery_fee DECIMAL(8,2) DEFAULT 0.00,
    service_fee DECIMAL(8,2) DEFAULT 0.00,
    tax_amount DECIMAL(8,2) DEFAULT 0.00,
    discount_amount DECIMAL(8,2) DEFAULT 0.00,
    total_amount DECIMAL(8,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'insurance')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'prescription_review', 'confirmed', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled')),
    pharmacist_notes TEXT,
    estimated_preparation_time INTEGER,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    pharmacy_rating INTEGER CHECK (pharmacy_rating >= 1 AND pharmacy_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    customer_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول عناصر طلبات الصيدلية
CREATE TABLE IF NOT EXISTS public.pharmacy_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.pharmacy_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(8,2) NOT NULL,
    total_price DECIMAL(8,2) NOT NULL,
    dosage_instructions TEXT,
    pharmacist_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 6. نظام محطات الوقود
-- ===================================================================

-- جدول خدمات محطات الوقود
CREATE TABLE IF NOT EXISTS public.fuel_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('fuel_delivery', 'car_wash', 'oil_change', 'tire_service', 'battery_service', 'emergency_fuel')),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    price DECIMAL(8,2) NOT NULL,
    unit TEXT, -- liter, service, hour
    is_mobile BOOLEAN DEFAULT false, -- خدمة متنقلة
    estimated_time INTEGER, -- بالدقائق
    fuel_type TEXT CHECK (fuel_type IN ('special_95', 'super_98', 'diesel', 'premium')),
    minimum_quantity DECIMAL(8,2),
    maximum_quantity DECIMAL(8,2),
    is_available BOOLEAN DEFAULT true,
    operating_hours JSONB,
    service_area_radius INTEGER DEFAULT 20, -- بالكيلومتر
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول طلبات الوقود
CREATE TABLE IF NOT EXISTS public.fuel_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    station_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    service_driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    service_type TEXT NOT NULL,
    fuel_type TEXT,
    quantity DECIMAL(8,2),
    unit_price DECIMAL(8,2),
    service_location GEOGRAPHY(POINT, 4326) NOT NULL,
    service_address TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    vehicle_info JSONB, -- make, model, year, plate_number
    special_instructions TEXT,
    subtotal DECIMAL(8,2) NOT NULL,
    service_fee DECIMAL(8,2) DEFAULT 0.00,
    delivery_fee DECIMAL(8,2) DEFAULT 0.00,
    tax_amount DECIMAL(8,2) DEFAULT 0.00,
    total_amount DECIMAL(8,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'fuel_card')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled')),
    estimated_arrival_time TIMESTAMP WITH TIME ZONE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    service_started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    service_notes TEXT,
    before_photos TEXT[],
    after_photos TEXT[],
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    customer_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 7. نظام المواقف
-- ===================================================================

-- جدول المواقف ومساحات الإيقاف
CREATE TABLE IF NOT EXISTS public.parking_spaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    space_type TEXT CHECK (space_type IN ('covered', 'open', 'garage', 'valet', 'street')) NOT NULL,
    vehicle_types TEXT[] DEFAULT ARRAY['car'], -- car, motorcycle, truck, etc.
    total_spaces INTEGER NOT NULL,
    available_spaces INTEGER NOT NULL,
    hourly_rate DECIMAL(8,2) NOT NULL,
    daily_rate DECIMAL(8,2),
    monthly_rate DECIMAL(8,2),
    features TEXT[], -- security, ev_charging, car_wash, etc.
    operating_hours JSONB,
    is_reservable BOOLEAN DEFAULT true,
    advance_booking_days INTEGER DEFAULT 30,
    cancellation_policy TEXT,
    images TEXT[],
    contact_phone TEXT,
    special_instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول حجوزات المواقف
CREATE TABLE IF NOT EXISTS public.parking_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    parking_space_id UUID REFERENCES public.parking_spaces(id) ON DELETE CASCADE,
    booking_number TEXT UNIQUE NOT NULL,
    vehicle_info JSONB NOT NULL, -- make, model, color, plate_number
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours DECIMAL(4,2),
    hourly_rate DECIMAL(8,2) NOT NULL,
    total_amount DECIMAL(8,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'wallet')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
    special_requests TEXT,
    qr_code TEXT UNIQUE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    actual_duration DECIMAL(4,2),
    overstay_fee DECIMAL(8,2) DEFAULT 0.00,
    final_amount DECIMAL(8,2),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 8. نظام الفعاليات الخاصة
-- ===================================================================

-- جدول أنواع الفعاليات
CREATE TABLE IF NOT EXISTS public.event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    base_price DECIMAL(8,2) NOT NULL,
    hourly_rate DECIMAL(8,2),
    features TEXT[],
    requirements TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج أنواع الفعاليات الافتراضية
INSERT INTO public.event_types (name, name_ar, description, base_price, hourly_rate, features, requirements) VALUES
('Wedding', 'زفاف', 'خدمة نقل للأعراس والمناسبات الخاصة', 200.00, 50.00, ARRAY['decorated_car', 'red_carpet', 'photographer'], ARRAY['advance_booking', 'contract']),
('Corporate', 'فعاليات الشركات', 'نقل للفعاليات والمؤتمرات', 150.00, 40.00, ARRAY['group_transport', 'professional_drivers'], ARRAY['business_verification']),
('Airport Transfer', 'نقل المطار', 'خدمة نقل من وإلى المطار', 100.00, 30.00, ARRAY['flight_tracking', 'luggage_assistance'], ARRAY[]),
('City Tour', 'جولة في المدينة', 'جولات سياحية في دبي', 120.00, 35.00, ARRAY['tour_guide', 'multiple_stops'], ARRAY['tour_license']),
('Medical Transport', 'النقل الطبي', 'نقل للمواعيد الطبية', 80.00, 25.00, ARRAY['medical_assistance', 'wheelchair_accessible'], ARRAY['medical_certification']),
('Shopping Tour', 'جولة تسوق', 'جولات للتسوق في المولات', 90.00, 28.00, ARRAY['shopping_assistance', 'multiple_stops'], ARRAY[])
ON CONFLICT (name) DO NOTHING;

-- جدول طلبات الفعاليات
CREATE TABLE IF NOT EXISTS public.event_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES public.event_types(id),
    assigned_drivers UUID[], -- مصفوفة من معرفات السائقين
    event_name TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL,
    number_of_vehicles INTEGER DEFAULT 1,
    number_of_passengers INTEGER NOT NULL,
    pickup_locations JSONB NOT NULL, -- مصفوفة من المواقع
    event_location GEOGRAPHY(POINT, 4326),
    event_address TEXT,
    special_requirements TEXT,
    additional_services TEXT[],
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    emergency_contact TEXT,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    payment_method TEXT DEFAULT 'transfer' CHECK (payment_method IN ('cash', 'card', 'transfer', 'cheque')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'deposit_paid', 'completed', 'failed', 'refunded')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    contract_signed BOOLEAN DEFAULT false,
    contract_document TEXT,
    special_instructions TEXT,
    cancellation_policy TEXT,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    customer_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 9. نظام التقييمات والمراجعات
-- ===================================================================

-- جدول التقييمات العامة
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewed_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('taxi', 'food_delivery', 'pharmacy', 'transport', 'fuel', 'parking', 'event')),
    order_id UUID, -- يمكن أن يكون معرف أي نوع من الطلبات
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    tags TEXT[],
    is_anonymous BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    response TEXT, -- رد من المزود
    response_date TIMESTAMP WITH TIME ZONE,
    images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 10. نظام الإشعارات
-- ===================================================================

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    message TEXT NOT NULL,
    message_ar TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'promotion')),
    category TEXT CHECK (category IN ('trip', 'order', 'payment', 'system', 'promotion', 'reminder')),
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 11. نظام المدفوعات والفواتير
-- ===================================================================

-- جدول المعاملات المالية
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_type TEXT NOT NULL,
    order_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'AED',
    type TEXT NOT NULL CHECK (type IN ('payment', 'refund', 'commission', 'penalty', 'bonus')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'wallet', 'bank_transfer', 'apple_pay', 'google_pay')),
    payment_gateway TEXT,
    gateway_transaction_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- 12. الفهارس (Indexes) لتحسين الأداء
-- ===================================================================

-- فهارس الملفات الشخصية
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles USING GIST(location);

-- فهارس السائقين
CREATE INDEX IF NOT EXISTS idx_driver_profiles_profile_id ON public.driver_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_availability ON public.driver_profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON public.driver_profiles USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_rating ON public.driver_profiles(rating);

-- فهارس الرحلات
CREATE INDEX IF NOT EXISTS idx_trips_passenger_id ON public.trips(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON public.trips(created_at);
CREATE INDEX IF NOT EXISTS idx_trips_pickup_location ON public.trips USING GIST(pickup_location);
CREATE INDEX IF NOT EXISTS idx_trips_dropoff_location ON public.trips USING GIST(dropoff_location);

-- فهارس الطلبات
CREATE INDEX IF NOT EXISTS idx_food_orders_customer_id ON public.food_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_restaurant_id ON public.food_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_food_orders_status ON public.food_orders(status);
CREATE INDEX IF NOT EXISTS idx_food_orders_created_at ON public.food_orders(created_at);

-- فهارس التقييمات
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer_id ON public.ratings(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewed_id ON public.ratings(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_ratings_service_type ON public.ratings(service_type);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON public.ratings(rating);

-- فهارس المعاملات
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- ===================================================================
-- 13. قواعد الأمان (RLS Policies)
-- ===================================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للملفات الشخصية
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by all authenticated users" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- سياسات السائقين
CREATE POLICY "Drivers can view their own profile" ON public.driver_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = driver_profiles.profile_id 
            AND profiles.user_id = auth.uid()
        )
    );

-- سياسات الرحلات
CREATE POLICY "Users can view their own trips" ON public.trips
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = trips.passenger_id 
            AND profiles.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.driver_profiles 
            JOIN public.profiles ON profiles.id = driver_profiles.profile_id
            WHERE driver_profiles.id = trips.driver_id 
            AND profiles.user_id = auth.uid()
        )
    );

-- سياسات الطلبات
CREATE POLICY "Users can view their own food orders" ON public.food_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = food_orders.customer_id 
            AND profiles.user_id = auth.uid()
        )
    );

-- سياسات التقييمات
CREATE POLICY "Users can view and create ratings" ON public.ratings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = ratings.reviewer_id 
            AND profiles.user_id = auth.uid()
        )
    );

-- سياسات الإشعارات
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = notifications.user_id 
            AND profiles.user_id = auth.uid()
        )
    );

-- ===================================================================
-- 14. الدوال والمحفزات (Functions & Triggers)
-- ===================================================================

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة محفزات التحديث للجداول
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON public.business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_food_orders_updated_at BEFORE UPDATE ON public.food_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pharmacy_orders_updated_at BEFORE UPDATE ON public.pharmacy_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- دالة حساب المسافة بين نقطتين
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
BEGIN
    RETURN ST_Distance(
        ST_GeogFromText('POINT(' || lon1 || ' ' || lat1 || ')'),
        ST_GeogFromText('POINT(' || lon2 || ' ' || lat2 || ')')
    ) / 1000; -- تحويل إلى كيلومتر
END;
$$ LANGUAGE plpgsql;

-- دالة حساب سعر الرحلة
CREATE OR REPLACE FUNCTION calculate_trip_fare(
    vehicle_type_id UUID,
    distance_km DECIMAL,
    duration_minutes INTEGER,
    surge_multiplier DECIMAL DEFAULT 1.0
)
RETURNS DECIMAL AS $$
DECLARE
    vehicle_type RECORD;
    base_fare DECIMAL;
    distance_fare DECIMAL;
    time_fare DECIMAL;
    total_fare DECIMAL;
BEGIN
    SELECT * INTO vehicle_type FROM public.vehicle_types WHERE id = vehicle_type_id;
    
    IF vehicle_type IS NULL THEN
        RAISE EXCEPTION 'Vehicle type not found';
    END IF;
    
    base_fare := vehicle_type.base_fare;
    distance_fare := distance_km * vehicle_type.per_km_rate;
    time_fare := duration_minutes * vehicle_type.per_minute_rate;
    
    total_fare := (base_fare + distance_fare + time_fare) * surge_multiplier;
    
    -- التأكد من الحد الأدنى للسعر
    IF total_fare < vehicle_type.minimum_fare THEN
        total_fare := vehicle_type.minimum_fare;
    END IF;
    
    RETURN ROUND(total_fare, 2);
END;
$$ LANGUAGE plpgsql;

-- دالة تحديث تقييم السائق
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
DECLARE
    driver_profile_id UUID;
    new_rating DECIMAL;
BEGIN
    -- الحصول على معرف ملف السائق
    SELECT dp.id INTO driver_profile_id 
    FROM public.driver_profiles dp
    JOIN public.profiles p ON p.id = dp.profile_id
    WHERE p.id = NEW.reviewed_id;
    
    IF driver_profile_id IS NOT NULL THEN
        -- حساب التقييم الجديد
        SELECT AVG(rating) INTO new_rating
        FROM public.ratings
        WHERE reviewed_id = NEW.reviewed_id AND service_type = 'taxi';
        
        -- تحديث تقييم السائق
        UPDATE public.driver_profiles
        SET rating = COALESCE(new_rating, 5.0),
            updated_at = NOW()
        WHERE id = driver_profile_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- محفز تحديث تقييم السائق
CREATE TRIGGER update_driver_rating_trigger
    AFTER INSERT OR UPDATE ON public.ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_rating();

-- دالة إرسال إشعار
CREATE OR REPLACE FUNCTION send_notification(
    user_id UUID,
    title TEXT,
    message TEXT,
    notification_type TEXT DEFAULT 'info',
    category TEXT DEFAULT 'system',
    data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, title, title_ar, message, message_ar, type, category, data
    ) VALUES (
        user_id, title, title, message, message, notification_type, category, data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 15. البيانات الأولية (Seed Data)
-- ===================================================================

-- إنشاء ملف شخصي تجريبي للمشرف
INSERT INTO public.profiles (
    user_id, email, full_name, phone, user_type, status, 
    address, city, is_verified
) VALUES (
    gen_random_uuid(), 'admin@igtaxi.com', 'مدير النظام', '+971501234567', 
    'business', 'active', 'دبي، الإمارات العربية المتحدة', 'دبي', true
) ON CONFLICT (email) DO NOTHING;

-- رسالة إكمال
SELECT 'IGTaxi Complete Migration System has been successfully deployed!' as message;

-- عرض ملخص الجداول المنشأة
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN tablename LIKE '%profiles%' THEN 'User Management'
        WHEN tablename LIKE '%trip%' OR tablename LIKE '%vehicle%' THEN 'Taxi System'
        WHEN tablename LIKE '%transport%' OR tablename LIKE '%cargo%' THEN 'Transport System'
        WHEN tablename LIKE '%food%' OR tablename LIKE '%menu%' THEN 'Food Delivery'
        WHEN tablename LIKE '%pharmacy%' OR tablename LIKE '%medication%' THEN 'Pharmacy System'
        WHEN tablename LIKE '%fuel%' THEN 'Fuel Services'
        WHEN tablename LIKE '%parking%' THEN 'Parking System'
        WHEN tablename LIKE '%event%' THEN 'Special Events'
        WHEN tablename LIKE '%rating%' THEN 'Rating System'
        WHEN tablename LIKE '%notification%' THEN 'Notification System'
        WHEN tablename LIKE '%transaction%' THEN 'Payment System'
        ELSE 'Other'
    END as system_module
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY system_module, tablename;
