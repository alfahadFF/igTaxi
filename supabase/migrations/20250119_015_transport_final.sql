-- =====================================================
-- TRANSPORT SYSTEM - نسخة نهائية مبسطة
-- =====================================================

-- التأكد من وجود امتداد UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- إنشاء جدول main_profiles إذا لم يكن موجوداً (لكن سيتم تجاهله إذا كان موجوداً)
CREATE TABLE IF NOT EXISTS main_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    profile_type VARCHAR(50) NOT NULL DEFAULT 'personal',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول طلبات النقل
CREATE TABLE IF NOT EXISTS transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- تفاصيل الحمولة
    cargo_type VARCHAR(50) NOT NULL CHECK (cargo_type IN (
        'furniture', 'electronics', 'food', 'construction', 
        'clothing', 'documents', 'fragile', 'other'
    )),
    weight DECIMAL(10,2) NOT NULL,
    weight_unit VARCHAR(10) NOT NULL CHECK (weight_unit IN ('kg', 'ton')),
    dimensions JSONB,
    special_instructions TEXT,
    
    -- مواقع الاستلام والتسليم
    pickup_locations JSONB NOT NULL,
    delivery_locations JSONB NOT NULL,
    
    -- تفاصيل التوقيت
    preferred_pickup_time TIMESTAMP WITH TIME ZONE,
    required_delivery_time TIMESTAMP WITH TIME ZONE,
    flexible_timing BOOLEAN DEFAULT true,
    
    -- الميزانية
    budget_min DECIMAL(10,2) NOT NULL,
    budget_max DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'JOD',
    
    -- معلومات الاتصال
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    
    -- حالة الطلب
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'offers_received', 'assigned', 'in_progress', 
        'completed', 'cancelled'
    )),
    
    -- معلومات إضافية
    insurance_required BOOLEAN DEFAULT false,
    loading_assistance_required BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول عروض الناقلين
CREATE TABLE IF NOT EXISTS transport_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    transporter_id UUID NOT NULL,
    
    -- تفاصيل العرض
    offered_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'JOD',
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- معلومات المركبة
    vehicle_info JSONB NOT NULL,
    message TEXT,
    
    -- تفاصيل إضافية
    insurance_included BOOLEAN DEFAULT false,
    loading_assistance_included BOOLEAN DEFAULT false,
    
    -- حالة العرض
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'rejected', 'expired'
    )),
    
    -- معلومات القبول
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تتبع رحلات النقل
CREATE TABLE IF NOT EXISTS transport_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    offer_id UUID NOT NULL,
    transporter_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    
    -- تفاصيل الرحلة
    pickup_time TIMESTAMP WITH TIME ZONE,
    delivery_time TIMESTAMP WITH TIME ZONE,
    actual_pickup_location JSONB,
    actual_delivery_location JSONB,
    
    -- تتبع الحالة
    status VARCHAR(20) NOT NULL DEFAULT 'assigned' CHECK (status IN (
        'assigned', 'en_route_pickup', 'pickup_arrived', 'cargo_loaded',
        'en_route_delivery', 'delivery_arrived', 'cargo_delivered', 
        'completed', 'cancelled'
    )),
    
    -- معلومات مالية
    final_price DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    commission_amount DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'refunded'
    )),
    
    -- تقييمات
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_review TEXT,
    transporter_rating INTEGER CHECK (transporter_rating >= 1 AND transporter_rating <= 5),
    transporter_review TEXT,
    
    -- معلومات إضافية
    notes TEXT,
    photos JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- جدول ملفات الناقلين الشخصية
CREATE TABLE IF NOT EXISTS transporter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    main_profile_id UUID NOT NULL UNIQUE, -- الاسم الصحيح
    
    -- معلومات شخصية
    company_name VARCHAR(200),
    license_number VARCHAR(50) UNIQUE,
    commercial_registration VARCHAR(50),
    
    -- معلومات الاتصال
    business_phone VARCHAR(20),
    business_email VARCHAR(100),
    business_address TEXT,
    
    -- معلومات المركبات
    vehicles JSONB NOT NULL DEFAULT '[]',
    
    -- منطقة الخدمة
    service_areas JSONB NOT NULL DEFAULT '[]',
    service_radius INTEGER DEFAULT 50,
    
    -- معلومات الخبرة
    years_of_experience INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    
    -- التقييمات
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    
    -- الحالة
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN (
        'pending', 'verified', 'rejected', 'suspended'
    )),
    is_active BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    
    -- المستندات
    documents JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول العقود
CREATE TABLE IF NOT EXISTS transport_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    transporter_id UUID,
    
    -- نوع العقد (6 أنواع بما في ذلك عقود العمال)
    contract_type VARCHAR(50) NOT NULL CHECK (contract_type IN (
        'corporate', 'school', 'hotel', 'employee', 'personal', 'workers'
    )),
    
    -- مدة العقد
    duration_type VARCHAR(20) NOT NULL CHECK (duration_type IN (
        'daily', 'weekly', 'monthly', 'yearly', 'semester', 'project-based'
    )),
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- تفاصيل العقد
    contract_details JSONB NOT NULL,
    service_locations JSONB NOT NULL,
    service_schedule JSONB,
    
    -- المعلومات المالية
    monthly_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    payment_terms VARCHAR(50),
    
    -- الحالة
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_approval', 'active', 'suspended', 'expired', 'cancelled'
    )),
    
    -- الموافقات
    customer_signature_date TIMESTAMP WITH TIME ZONE,
    transporter_signature_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- الفهارس
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transport_requests_user_id ON transport_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_status ON transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_requests_cargo_type ON transport_requests(cargo_type);
CREATE INDEX IF NOT EXISTS idx_transport_requests_created_at ON transport_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_transport_offers_request_id ON transport_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_transport_offers_transporter_id ON transport_offers(transporter_id);
CREATE INDEX IF NOT EXISTS idx_transport_offers_status ON transport_offers(status);

CREATE INDEX IF NOT EXISTS idx_transport_trips_customer_id ON transport_trips(customer_id);
CREATE INDEX IF NOT EXISTS idx_transport_trips_transporter_id ON transport_trips(transporter_id);
CREATE INDEX IF NOT EXISTS idx_transport_trips_status ON transport_trips(status);

CREATE INDEX IF NOT EXISTS idx_transporter_profiles_main_profile_id ON transporter_profiles(main_profile_id);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_approval_status ON transporter_profiles(approval_status);

-- =====================================================
-- دالة لحساب العمولة (بسيطة)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_commission(trip_price DECIMAL, commission_rate DECIMAL DEFAULT 10.00)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(trip_price * commission_rate / 100, 2);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- رسائل النجاح
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'نظام النقل جاهز!';
    RAISE NOTICE 'الجداول المُنشأة:';
    RAISE NOTICE 'transport_requests - طلبات النقل';
    RAISE NOTICE 'transport_offers - عروض الناقلين';
    RAISE NOTICE 'transport_trips - رحلات النقل';
    RAISE NOTICE 'transporter_profiles - ملفات الناقلين';
    RAISE NOTICE 'transport_contracts - العقود (6 أنواع)';
    RAISE NOTICE '---';
    RAISE NOTICE 'الميزات:';
    RAISE NOTICE 'عمولة 10%% على كل رحلة';
    RAISE NOTICE '8 أنواع حمولة';
    RAISE NOTICE '6 أنواع عقود';
    RAISE NOTICE 'نظام تقييمات';
    RAISE NOTICE 'تتبع الحالة';
    RAISE NOTICE '---';
    RAISE NOTICE 'النظام جاهز للاستخدام!';
END $$;
