-- =====================================================
-- TRANSPORT SYSTEM - إنشاء مبسط وآمن
-- =====================================================

-- التأكد من وجود جدول main_profiles أولاً
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'main_profiles') THEN
        -- إنشاء جدول main_profiles مبسط إذا لم يكن موجوداً
        CREATE TABLE main_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(255),
            full_name VARCHAR(255),
            profile_type VARCHAR(50) NOT NULL DEFAULT 'personal',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created main_profiles table';
    ELSE
        RAISE NOTICE 'main_profiles table already exists';
    END IF;
END $$;

-- =====================================================
-- جداول النقل
-- =====================================================

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
    user_id UUID NOT NULL UNIQUE,
    
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
-- إضافة Foreign Keys بعد إنشاء كل الجداول
-- =====================================================

DO $$
BEGIN
    -- التحقق من وجود الجداول والأعمدة قبل إضافة Foreign Keys
    
    -- فحص جدول main_profiles وعمود id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'main_profiles table and id column exist';
        
        -- إضافة Foreign Key لجدول transport_requests
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_requests' AND column_name = 'user_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_requests_user_id_fkey' 
            AND table_name = 'transport_requests'
        ) THEN
            ALTER TABLE transport_requests 
            ADD CONSTRAINT transport_requests_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_requests.user_id';
        END IF;

        -- إضافة Foreign Keys لجدول transport_offers
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_offers' AND column_name = 'request_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_offers_request_id_fkey' 
            AND table_name = 'transport_offers'
        ) THEN
            ALTER TABLE transport_offers 
            ADD CONSTRAINT transport_offers_request_id_fkey 
            FOREIGN KEY (request_id) REFERENCES transport_requests(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_offers.request_id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_offers' AND column_name = 'transporter_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_offers_transporter_id_fkey' 
            AND table_name = 'transport_offers'
        ) THEN
            ALTER TABLE transport_offers 
            ADD CONSTRAINT transport_offers_transporter_id_fkey 
            FOREIGN KEY (transporter_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_offers.transporter_id';
        END IF;

        -- إضافة Foreign Keys لجدول transport_trips
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_trips' AND column_name = 'request_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_trips_request_id_fkey' 
            AND table_name = 'transport_trips'
        ) THEN
            ALTER TABLE transport_trips 
            ADD CONSTRAINT transport_trips_request_id_fkey 
            FOREIGN KEY (request_id) REFERENCES transport_requests(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_trips.request_id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_trips' AND column_name = 'offer_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_trips_offer_id_fkey' 
            AND table_name = 'transport_trips'
        ) THEN
            ALTER TABLE transport_trips 
            ADD CONSTRAINT transport_trips_offer_id_fkey 
            FOREIGN KEY (offer_id) REFERENCES transport_offers(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_trips.offer_id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_trips' AND column_name = 'transporter_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_trips_transporter_id_fkey' 
            AND table_name = 'transport_trips'
        ) THEN
            ALTER TABLE transport_trips 
            ADD CONSTRAINT transport_trips_transporter_id_fkey 
            FOREIGN KEY (transporter_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_trips.transporter_id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_trips' AND column_name = 'customer_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_trips_customer_id_fkey' 
            AND table_name = 'transport_trips'
        ) THEN
            ALTER TABLE transport_trips 
            ADD CONSTRAINT transport_trips_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_trips.customer_id';
        END IF;

        -- إضافة Foreign Key لجدول transporter_profiles
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transporter_profiles' AND column_name = 'user_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transporter_profiles_user_id_fkey' 
            AND table_name = 'transporter_profiles'
        ) THEN
            ALTER TABLE transporter_profiles 
            ADD CONSTRAINT transporter_profiles_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transporter_profiles.user_id';
        END IF;

        -- إضافة Foreign Keys لجدول transport_contracts
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_contracts' AND column_name = 'customer_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_contracts_customer_id_fkey' 
            AND table_name = 'transport_contracts'
        ) THEN
            ALTER TABLE transport_contracts 
            ADD CONSTRAINT transport_contracts_customer_id_fkey 
            FOREIGN KEY (customer_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added foreign key for transport_contracts.customer_id';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transport_contracts' AND column_name = 'transporter_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transport_contracts_transporter_id_fkey' 
            AND table_name = 'transport_contracts'
        ) THEN
            ALTER TABLE transport_contracts 
            ADD CONSTRAINT transport_contracts_transporter_id_fkey 
            FOREIGN KEY (transporter_id) REFERENCES main_profiles(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added foreign key for transport_contracts.transporter_id';
        END IF;

        RAISE NOTICE '✅ All foreign keys checked and added successfully!';
    ELSE
        RAISE NOTICE '❌ main_profiles table or id column does not exist - skipping foreign keys';
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error adding foreign keys: %', SQLERRM;
        RAISE NOTICE 'Continuing without foreign keys - tables created successfully';
END $$;

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

CREATE INDEX IF NOT EXISTS idx_transporter_profiles_user_id ON transporter_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_verification_status ON transporter_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_transporter_profiles_is_available ON transporter_profiles(is_available);

-- =====================================================
-- الدوال والتريجرز
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
DROP TRIGGER IF EXISTS update_transport_requests_updated_at ON transport_requests;
CREATE TRIGGER update_transport_requests_updated_at 
    BEFORE UPDATE ON transport_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transport_offers_updated_at ON transport_offers;
CREATE TRIGGER update_transport_offers_updated_at 
    BEFORE UPDATE ON transport_offers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transport_trips_updated_at ON transport_trips;
CREATE TRIGGER update_transport_trips_updated_at 
    BEFORE UPDATE ON transport_trips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transporter_profiles_updated_at ON transporter_profiles;
CREATE TRIGGER update_transporter_profiles_updated_at 
    BEFORE UPDATE ON transporter_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transport_contracts_updated_at ON transport_contracts;
CREATE TRIGGER update_transport_contracts_updated_at 
    BEFORE UPDATE ON transport_contracts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- دالة لحساب العمولة
CREATE OR REPLACE FUNCTION calculate_commission(trip_price DECIMAL, commission_rate DECIMAL DEFAULT 10.00)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(trip_price * commission_rate / 100, 2);
END;
$$ LANGUAGE plpgsql;

-- إشعار نهاية التشغيل
DO $$
BEGIN
    RAISE NOTICE '✅ تم إنشاء نظام النقل بنجاح!';
    RAISE NOTICE 'الجداول المُنشأة:';
    RAISE NOTICE '- transport_requests (طلبات النقل)';
    RAISE NOTICE '- transport_offers (عروض الناقلين)';
    RAISE NOTICE '- transport_trips (رحلات النقل)';
    RAISE NOTICE '- transporter_profiles (ملفات الناقلين)';
    RAISE NOTICE '- transport_contracts (عقود النقل)';
END $$;
