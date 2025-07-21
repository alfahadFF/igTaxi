-- =====================================================
-- TRANSPORT SYSTEM TABLES
-- =====================================================

-- جدول طلبات النقل
CREATE TABLE IF NOT EXISTS transport_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- تفاصيل الحمولة
    cargo_type VARCHAR(50) NOT NULL CHECK (cargo_type IN (
        'furniture', 'electronics', 'food', 'construction', 
        'clothing', 'documents', 'fragile', 'other'
    )),
    weight DECIMAL(10,2) NOT NULL,
    weight_unit VARCHAR(10) NOT NULL CHECK (weight_unit IN ('kg', 'ton')),
    dimensions JSONB, -- {length, width, height}
    special_instructions TEXT,
    
    -- مواقع الاستلام والتسليم
    pickup_locations JSONB NOT NULL, -- مصفوفة من {address, coordinates, type: 'pickup'}
    delivery_locations JSONB NOT NULL, -- مصفوفة من {address, coordinates, type: 'delivery'}
    
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
    request_id UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    transporter_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- تفاصيل العرض
    offered_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'JOD',
    estimated_pickup_time TIMESTAMP WITH TIME ZONE,
    estimated_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- معلومات المركبة
    vehicle_info JSONB NOT NULL, -- {make, model, year, type, capacity, license_plate}
    
    -- رسالة من الناقل
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
    request_id UUID NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES transport_offers(id) ON DELETE CASCADE,
    transporter_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
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
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- النسبة المئوية للعمولة
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
    photos JSONB, -- مصفوفة من الصور أثناء الرحلة
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- جدول ملفات الناقلين الشخصية
CREATE TABLE IF NOT EXISTS transporter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE UNIQUE,
    
    -- معلومات شخصية
    company_name VARCHAR(200),
    license_number VARCHAR(50) UNIQUE,
    commercial_registration VARCHAR(50),
    
    -- معلومات الاتصال
    business_phone VARCHAR(20),
    business_email VARCHAR(100),
    business_address TEXT,
    
    -- معلومات المركبات
    vehicles JSONB NOT NULL DEFAULT '[]', -- مصفوفة من المركبات
    
    -- منطقة الخدمة
    service_areas JSONB NOT NULL DEFAULT '[]', -- المحافظات/المناطق التي يخدمها
    service_radius INTEGER DEFAULT 50, -- نصف قطر الخدمة بالكيلومتر
    
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
    documents JSONB DEFAULT '{}', -- {license_copy, registration_copy, insurance_copy}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول العقود (للعقود طويلة المدى)
CREATE TABLE IF NOT EXISTS transport_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    transporter_id UUID REFERENCES main_profiles(id) ON DELETE SET NULL,
    
    -- نوع العقد
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
    contract_details JSONB NOT NULL, -- تفاصيل مخصصة حسب نوع العقد
    service_locations JSONB NOT NULL, -- مواقع الخدمة
    service_schedule JSONB, -- جدول الخدمة
    
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
-- INDEXES للأداء
-- =====================================================

-- فهارس طلبات النقل
CREATE INDEX IF NOT EXISTS idx_transport_requests_user_id ON transport_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_requests_status ON transport_requests(status);
CREATE INDEX IF NOT EXISTS idx_transport_requests_cargo_type ON transport_requests(cargo_type);
CREATE INDEX IF NOT EXISTS idx_transport_requests_created_at ON transport_requests(created_at);

-- فهارس عروض الناقلين
CREATE INDEX IF NOT EXISTS idx_transport_offers_request_id ON transport_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_transport_offers_transporter_id ON transport_offers(transporter_id);
CREATE INDEX IF NOT EXISTS idx_transport_offers_status ON transport_offers(status);

-- فهارس رحلات النقل
CREATE INDEX IF NOT EXISTS idx_transport_trips_customer_id ON transport_trips(customer_id);
CREATE INDEX IF NOT EXISTS idx_transport_trips_transporter_id ON transport_trips(transporter_id);
CREATE INDEX IF NOT EXISTS idx_transport_trips_status ON transport_trips(status);

-- فهارس ملفات الناقلين
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_user_id ON transporter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_verification_status ON transporter_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_is_available ON transporter_profiles(is_available);

-- =====================================================
-- TRIGGERS لتحديث updated_at
-- =====================================================

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة triggers
CREATE TRIGGER update_transport_requests_updated_at BEFORE UPDATE ON transport_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_offers_updated_at BEFORE UPDATE ON transport_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_trips_updated_at BEFORE UPDATE ON transport_trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transporter_profiles_updated_at BEFORE UPDATE ON transporter_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_contracts_updated_at BEFORE UPDATE ON transport_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES (DISABLED FOR NOW)
-- =====================================================

-- تفعيل RLS
ALTER TABLE transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_contracts ENABLE ROW LEVEL SECURITY;

-- سياسات مؤقتة للسماح بكل شيء (سيتم تحديثها لاحقاً)
CREATE POLICY "Allow all for transport_requests" ON transport_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transport_offers" ON transport_offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transport_trips" ON transport_trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transporter_profiles" ON transporter_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transport_contracts" ON transport_contracts FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- FUNCTIONS مساعدة
-- =====================================================

-- دالة لحساب العمولة
CREATE OR REPLACE FUNCTION calculate_commission(trip_price DECIMAL, commission_rate DECIMAL DEFAULT 10.00)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(trip_price * commission_rate / 100, 2);
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث تقييم الناقل
CREATE OR REPLACE FUNCTION update_transporter_rating(transporter_user_id UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_reviews INTEGER;
BEGIN
    SELECT 
        ROUND(AVG(customer_rating), 2),
        COUNT(customer_rating)
    INTO avg_rating, total_reviews
    FROM transport_trips 
    WHERE transporter_id = transporter_user_id 
    AND customer_rating IS NOT NULL;
    
    UPDATE transporter_profiles 
    SET 
        average_rating = COALESCE(avg_rating, 0),
        total_reviews = COALESCE(total_reviews, 0),
        updated_at = NOW()
    WHERE user_id = transporter_user_id;
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث عدد الرحلات المكتملة
CREATE OR REPLACE FUNCTION update_completed_trips_count(transporter_user_id UUID)
RETURNS VOID AS $$
DECLARE
    trips_count INTEGER;
BEGIN
    SELECT COUNT(*) 
    INTO trips_count
    FROM transport_trips 
    WHERE transporter_id = transporter_user_id 
    AND status = 'completed';
    
    UPDATE transporter_profiles 
    SET 
        completed_trips = trips_count,
        updated_at = NOW()
    WHERE user_id = transporter_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS للاستعلامات السريعة
-- =====================================================

-- عرض طلبات النقل مع تفاصيل العميل
CREATE OR REPLACE VIEW transport_requests_with_customer AS
SELECT 
    tr.*,
    p.full_name as customer_name,
    p.phone as customer_phone,
    p.email as customer_email
FROM transport_requests tr
LEFT JOIN main_profiles p ON tr.user_id = p.id;

-- عرض العروض مع تفاصيل الناقل
CREATE OR REPLACE VIEW transport_offers_with_transporter AS
SELECT 
    to_.*,
    tp.company_name,
    tp.average_rating,
    tp.total_reviews,
    tp.completed_trips,
    p.full_name as transporter_name,
    p.phone as transporter_phone
FROM transport_offers to_
LEFT JOIN transporter_profiles tp ON to_.transporter_id = tp.user_id
LEFT JOIN main_profiles p ON to_.transporter_id = p.id;

-- عرض الرحلات الكاملة
CREATE OR REPLACE VIEW transport_trips_complete AS
SELECT 
    tt.*,
    cp.full_name as customer_name,
    cp.phone as customer_phone,
    tp.company_name as transporter_company,
    tpr.full_name as transporter_name,
    tpr.phone as transporter_phone
FROM transport_trips tt
LEFT JOIN main_profiles cp ON tt.customer_id = cp.id
LEFT JOIN main_profiles tpr ON tt.transporter_id = tpr.id
LEFT JOIN transporter_profiles tp ON tt.transporter_id = tp.user_id;
