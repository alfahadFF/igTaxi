-- =====================================================
-- Main Profiles System - Hierarchical Structure
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Main Profiles Table (Phone-based Registration)
-- =====================================================

CREATE TABLE IF NOT EXISTS main_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL, -- Primary identifier for registration
    email VARCHAR(255),
    password_hash VARCHAR(255), -- For secure authentication
    full_name VARCHAR(255),
    profile_type VARCHAR(50) NOT NULL CHECK (profile_type IN (
        'personal', 
        'driver', 
        'business_owner', 
        'transporter'
    )),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6), -- For phone verification
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    language_preference VARCHAR(10) DEFAULT 'ar', -- 'ar' or 'en'
    notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "push": true}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================

-- Primary search indexes
CREATE INDEX IF NOT EXISTS idx_main_profiles_phone ON main_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_main_profiles_email ON main_profiles(email);
CREATE INDEX IF NOT EXISTS idx_main_profiles_type ON main_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_main_profiles_active ON main_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_main_profiles_verified ON main_profiles(is_verified);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_main_profiles_type_active ON main_profiles(profile_type, is_active);
CREATE INDEX IF NOT EXISTS idx_main_profiles_phone_verified ON main_profiles(phone, is_verified);

-- =====================================================
-- 3. Profile Sub-Tables (Business Profiles)
-- =====================================================

CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN (
        'restaurant',
        'cafe', 
        'fuel_station',
        'shopping_center',
        'pharmacy',
        'parking_lot'
    )),
    business_name VARCHAR(255) NOT NULL,
    business_email VARCHAR(255),
    business_phone VARCHAR(20),
    description TEXT,
    registration_status VARCHAR(50) DEFAULT 'pending' CHECK (registration_status IN (
        'pending', 
        'approved', 
        'rejected', 
        'suspended'
    )),
    
    -- Location information
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Jordan',
    
    -- Business verification
    business_license_url TEXT,
    tax_registration_url TEXT,
    additional_documents JSONB DEFAULT '[]',
    
    -- Operating information
    working_hours JSONB NOT NULL DEFAULT '{"is24Hours": false, "opening": "08:00", "closing": "22:00"}',
    is_operational BOOLEAN DEFAULT FALSE,
    approval_date TIMESTAMP WITH TIME ZONE,
    approved_by UUID, -- Reference to admin who approved
    
    -- SEO and discoverability
    slug VARCHAR(255) UNIQUE, -- For SEO-friendly URLs
    tags TEXT[], -- Array of tags for search
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Business Profiles Indexes
-- =====================================================

-- Primary relationships
CREATE INDEX IF NOT EXISTS idx_business_profiles_main_id ON business_profiles(main_profile_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_type ON business_profiles(business_type);
CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(registration_status);

-- Location-based searches
CREATE INDEX IF NOT EXISTS idx_business_profiles_location ON business_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);

-- Operational queries
CREATE INDEX IF NOT EXISTS idx_business_profiles_operational ON business_profiles(is_operational);
CREATE INDEX IF NOT EXISTS idx_business_profiles_type_operational ON business_profiles(business_type, is_operational);

-- SEO and search
CREATE INDEX IF NOT EXISTS idx_business_profiles_slug ON business_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_business_profiles_tags ON business_profiles USING GIN(tags);

-- Full-text search for business names and descriptions
CREATE INDEX IF NOT EXISTS idx_business_profiles_search ON business_profiles USING GIN(
    to_tsvector('arabic', COALESCE(business_name, '') || ' ' || COALESCE(description, ''))
);

-- =====================================================
-- 5. Driver Profiles (for ride services)
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- Driver identification
    driver_license_number VARCHAR(50) UNIQUE NOT NULL,
    driver_license_url TEXT NOT NULL,
    driver_license_expiry DATE NOT NULL,
    
    -- Vehicle information
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(50),
    vehicle_plate_number VARCHAR(20) UNIQUE,
    vehicle_registration_url TEXT,
    vehicle_insurance_url TEXT,
    vehicle_insurance_expiry DATE,
    
    -- Driver status
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 
        'approved', 
        'rejected', 
        'suspended'
    )),
    is_available BOOLEAN DEFAULT FALSE,
    current_location_lat DECIMAL(10, 8),
    current_location_lng DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    total_rides INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Approval information
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. Driver Profiles Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_driver_profiles_main_id ON driver_profiles(main_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license ON driver_profiles(driver_license_number);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_plate ON driver_profiles(vehicle_plate_number);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_status ON driver_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_location ON driver_profiles(current_location_lat, current_location_lng);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_rating ON driver_profiles(average_rating);

-- =====================================================
-- 7. Transporter Profiles (for logistics)
-- =====================================================

CREATE TABLE IF NOT EXISTS transporter_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_profile_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- Company information
    company_name VARCHAR(255) NOT NULL,
    company_registration_number VARCHAR(50) UNIQUE,
    company_license_url TEXT,
    tax_certificate_url TEXT,
    
    -- Fleet information
    fleet_size INTEGER DEFAULT 1,
    vehicle_types TEXT[] DEFAULT '{}', -- Array of vehicle types
    coverage_areas TEXT[] DEFAULT '{}', -- Cities/areas covered
    
    -- Operational details
    max_weight_capacity DECIMAL(8, 2), -- in kg
    specializations TEXT[] DEFAULT '{}', -- fragile, refrigerated, etc.
    
    -- Business status
    approval_status VARCHAR(50) DEFAULT 'pending' CHECK (approval_status IN (
        'pending', 
        'approved', 
        'rejected', 
        'suspended'
    )),
    is_operational BOOLEAN DEFAULT FALSE,
    
    -- Performance metrics
    total_deliveries INTEGER DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_revenue DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Approval information
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Transporter Profiles Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_transporter_profiles_main_id ON transporter_profiles(main_profile_id);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_company ON transporter_profiles(company_registration_number);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_status ON transporter_profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_operational ON transporter_profiles(is_operational);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_fleet_size ON transporter_profiles(fleet_size);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_vehicle_types ON transporter_profiles USING GIN(vehicle_types);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_coverage ON transporter_profiles USING GIN(coverage_areas);

-- =====================================================
-- 9. Update Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables (drop if exists first to avoid conflicts)
DROP TRIGGER IF EXISTS update_main_profiles_updated_at ON main_profiles;
DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON business_profiles;
DROP TRIGGER IF EXISTS update_driver_profiles_updated_at ON driver_profiles;
DROP TRIGGER IF EXISTS update_transporter_profiles_updated_at ON transporter_profiles;

CREATE TRIGGER update_main_profiles_updated_at BEFORE UPDATE ON main_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_profiles_updated_at BEFORE UPDATE ON business_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_profiles_updated_at BEFORE UPDATE ON driver_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transporter_profiles_updated_at BEFORE UPDATE ON transporter_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE main_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporter_profiles ENABLE ROW LEVEL SECURITY;

-- حذف السياسات الموجودة أولاً لتجنب التعارض
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

-- =====================================================
-- 11. Sample Data Functions (for testing)
-- =====================================================

-- Function to create a complete user profile
CREATE OR REPLACE FUNCTION create_user_profile(
    p_phone VARCHAR(20),
    p_email VARCHAR(255) DEFAULT NULL,
    p_full_name VARCHAR(255) DEFAULT NULL,
    p_profile_type VARCHAR(50) DEFAULT 'personal'
)
RETURNS UUID AS $$
DECLARE
    new_profile_id UUID;
BEGIN
    INSERT INTO main_profiles (phone, email, full_name, profile_type, is_verified)
    VALUES (p_phone, p_email, p_full_name, p_profile_type, true)
    RETURNING id INTO new_profile_id;
    
    RETURN new_profile_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. Views for Easy Querying
-- =====================================================

-- حذف العروض الموجودة أولاً لتجنب التعارض
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

-- =====================================================
-- END OF MAIN PROFILES SYSTEM MIGRATION
-- =====================================================
