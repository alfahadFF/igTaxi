-- =====================================================
-- جداول سائقي المناسبات الخاصة
-- =====================================================

-- 1. جدول سائقي المناسبات الخاصة
CREATE TABLE IF NOT EXISTS event_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- معلومات السائق
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    experience_years INTEGER DEFAULT 0,
    
    -- معلومات المركبة
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    vehicle_year INTEGER,
    vehicle_color VARCHAR(30),
    plate_number VARCHAR(20),
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('sedan', 'suv', 'van', 'bus', 'luxury')),
    seating_capacity INTEGER,
    
    -- أنواع المناسبات المدعومة
    event_types TEXT[] NOT NULL, -- ['family', 'wedding', 'tourism', 'field', 'sports', 'concert']
    specializations JSONB DEFAULT '{}', -- تخصصات لكل نوع مناسبة
    
    -- التسعير
    hourly_rate DECIMAL(8,3) NOT NULL,
    daily_rate DECIMAL(8,3),
    minimum_hours INTEGER DEFAULT 1,
    
    -- مناطق الخدمة والمميزات
    service_areas TEXT[] NOT NULL,
    features JSONB DEFAULT '{}', -- air_conditioning, wifi, sound_system, etc.
    
    -- حالة السائق
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    is_available BOOLEAN DEFAULT TRUE,
    
    -- معلومات إضافية
    profile_photo_url VARCHAR(500),
    vehicle_photos JSONB DEFAULT '[]', -- array of photo URLs
    documents JSONB DEFAULT '{}', -- license, id_card, etc.
    
    -- تقييمات وإحصائيات
    rating DECIMAL(3,2) DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول حجوزات المناسبات
CREATE TABLE IF NOT EXISTS event_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- أطراف الحجز
    customer_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    event_driver_id UUID REFERENCES event_drivers(id) ON DELETE CASCADE,
    
    -- تفاصيل المناسبة
    event_type VARCHAR(50) NOT NULL,
    event_title VARCHAR(200),
    event_description TEXT,
    
    -- التوقيت والمدة
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration_hours INTEGER,
    
    -- المواقع
    pickup_location JSONB NOT NULL, -- {address, latitude, longitude}
    destinations JSONB DEFAULT '[]', -- array of destinations for multi-stop events
    dropoff_location JSONB, -- final destination
    
    -- تفاصيل الحجز
    guest_count INTEGER,
    special_requests TEXT,
    required_features JSONB DEFAULT '[]', -- specific features requested
    
    -- التسعير والدفع
    base_cost DECIMAL(10,3) NOT NULL,
    additional_fees DECIMAL(10,3) DEFAULT 0,
    discount DECIMAL(10,3) DEFAULT 0,
    total_cost DECIMAL(10,3) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    
    -- حالة الحجز
    booking_status VARCHAR(30) DEFAULT 'pending' CHECK (
        booking_status IN ('pending', 'confirmed', 'driver_assigned', 'in_progress', 'completed', 'cancelled')
    ),
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES main_profiles(id),
    
    -- تفاصيل الرحلة
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    actual_duration_minutes INTEGER,
    route_data JSONB, -- actual route taken
    
    -- تقييمات
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    driver_feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول تفاصيل التخصصات لكل نوع مناسبة
CREATE TABLE IF NOT EXISTS event_specialization_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_driver_id UUID REFERENCES event_drivers(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    
    -- تفاصيل المناسبات العائلية
    family_max_capacity INTEGER,
    family_has_child_seats BOOLEAN DEFAULT FALSE,
    family_friendly BOOLEAN DEFAULT TRUE,
    
    -- تفاصيل الأعراس
    wedding_luxury_level VARCHAR(20) CHECK (wedding_luxury_level IN ('standard', 'premium', 'luxury')),
    wedding_has_decoration BOOLEAN DEFAULT FALSE,
    wedding_includes_photography BOOLEAN DEFAULT FALSE,
    wedding_dress_formal BOOLEAN DEFAULT FALSE,
    
    -- تفاصيل السياحة
    tourism_areas TEXT[],
    tourism_provides_tour_guide BOOLEAN DEFAULT FALSE,
    tourism_multi_language TEXT[] DEFAULT ARRAY['ar'],
    tourism_has_ac BOOLEAN DEFAULT TRUE,
    
    -- تفاصيل الرحلات الميدانية
    field_group_capacity INTEGER,
    field_has_educational_equipment BOOLEAN DEFAULT FALSE,
    field_school_certified BOOLEAN DEFAULT FALSE,
    
    -- تفاصيل الفعاليات الرياضية
    sports_team_capacity INTEGER,
    sports_has_equipment_space BOOLEAN DEFAULT FALSE,
    sports_follows_teams TEXT[] DEFAULT '{}',
    
    -- تفاصيل الحفلات
    concert_late_night_service BOOLEAN DEFAULT FALSE,
    concert_sound_system BOOLEAN DEFAULT FALSE,
    concert_party_friendly BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول جدولة توفر السائقين
CREATE TABLE IF NOT EXISTS event_driver_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_driver_id UUID REFERENCES event_drivers(id) ON DELETE CASCADE,
    
    -- التوفر حسب اليوم
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- التوفر في تواريخ محددة
    specific_date DATE,
    is_available BOOLEAN DEFAULT TRUE,
    
    -- ملاحظات
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جدول تقييمات السائقين
CREATE TABLE IF NOT EXISTS event_driver_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_booking_id UUID REFERENCES event_bookings(id) ON DELETE CASCADE,
    event_driver_id UUID REFERENCES event_drivers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- التقييم
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    
    -- جوانب التقييم المفصلة
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    vehicle_condition_rating INTEGER CHECK (vehicle_condition_rating >= 1 AND vehicle_condition_rating <= 5),
    driver_behavior_rating INTEGER CHECK (driver_behavior_rating >= 1 AND driver_behavior_rating <= 5),
    overall_experience_rating INTEGER CHECK (overall_experience_rating >= 1 AND overall_experience_rating <= 5),
    
    -- معلومات إضافية
    would_recommend BOOLEAN DEFAULT TRUE,
    event_type VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_event_drivers_event_types ON event_drivers USING GIN (event_types);
CREATE INDEX IF NOT EXISTS idx_event_drivers_service_areas ON event_drivers USING GIN (service_areas);
CREATE INDEX IF NOT EXISTS idx_event_drivers_status ON event_drivers(status);
CREATE INDEX IF NOT EXISTS idx_event_drivers_rating ON event_drivers(rating DESC);

CREATE INDEX IF NOT EXISTS idx_event_bookings_event_type ON event_bookings(event_type);
CREATE INDEX IF NOT EXISTS idx_event_bookings_event_date ON event_bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_event_bookings_status ON event_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_event_bookings_customer ON event_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_event_bookings_driver ON event_bookings(event_driver_id);

CREATE INDEX IF NOT EXISTS idx_event_specialization_event_type ON event_specialization_details(event_type);
CREATE INDEX IF NOT EXISTS idx_event_availability_driver ON event_driver_availability(event_driver_id);
CREATE INDEX IF NOT EXISTS idx_event_availability_date ON event_driver_availability(specific_date);

-- تفعيل RLS (Row Level Security)
ALTER TABLE event_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_specialization_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_driver_reviews ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان

-- سياسات event_drivers
CREATE POLICY "Event drivers can view their own profile" ON event_drivers 
    FOR ALL USING (driver_id = auth.uid());

CREATE POLICY "Customers can view approved event drivers" ON event_drivers 
    FOR SELECT USING (status = 'approved');

-- سياسات event_bookings
CREATE POLICY "Users can view their own event bookings" ON event_bookings 
    FOR ALL USING (
        customer_id = auth.uid() OR 
        event_driver_id IN (SELECT id FROM event_drivers WHERE driver_id = auth.uid())
    );

-- سياسات event_specialization_details
CREATE POLICY "Event drivers can manage their specializations" ON event_specialization_details 
    FOR ALL USING (
        event_driver_id IN (SELECT id FROM event_drivers WHERE driver_id = auth.uid())
    );

CREATE POLICY "Public can view approved driver specializations" ON event_specialization_details 
    FOR SELECT USING (
        event_driver_id IN (SELECT id FROM event_drivers WHERE status = 'approved')
    );

-- سياسات event_driver_availability
CREATE POLICY "Event drivers can manage their availability" ON event_driver_availability 
    FOR ALL USING (
        event_driver_id IN (SELECT id FROM event_drivers WHERE driver_id = auth.uid())
    );

CREATE POLICY "Public can view approved driver availability" ON event_driver_availability 
    FOR SELECT USING (
        event_driver_id IN (SELECT id FROM event_drivers WHERE status = 'approved')
    );

-- سياسات event_driver_reviews
CREATE POLICY "Users can view event driver reviews" ON event_driver_reviews 
    FOR SELECT USING (TRUE);

CREATE POLICY "Customers can create reviews for their bookings" ON event_driver_reviews 
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON event_driver_reviews 
    FOR UPDATE USING (customer_id = auth.uid());

-- دوال مساعدة

-- 1. دالة البحث عن سائقي المناسبات
CREATE OR REPLACE FUNCTION search_event_drivers(
    p_event_type VARCHAR(50),
    p_event_date DATE,
    p_guest_count INTEGER DEFAULT NULL,
    p_service_area VARCHAR(100) DEFAULT NULL,
    p_max_hourly_rate DECIMAL(8,3) DEFAULT NULL
) RETURNS TABLE (
    driver_id UUID,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    vehicle_type VARCHAR(20),
    seating_capacity INTEGER,
    hourly_rate DECIMAL(8,3),
    rating DECIMAL(3,2),
    total_bookings INTEGER,
    service_areas TEXT[],
    features JSONB,
    specializations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.full_name,
        ed.phone,
        ed.vehicle_type,
        ed.seating_capacity,
        ed.hourly_rate,
        ed.rating,
        ed.total_bookings,
        ed.service_areas,
        ed.features,
        ed.specializations
    FROM event_drivers ed
    WHERE 
        ed.status = 'approved'
        AND ed.is_available = TRUE
        AND p_event_type = ANY(ed.event_types)
        AND (p_guest_count IS NULL OR ed.seating_capacity >= p_guest_count)
        AND (p_service_area IS NULL OR p_service_area = ANY(ed.service_areas))
        AND (p_max_hourly_rate IS NULL OR ed.hourly_rate <= p_max_hourly_rate)
        -- التحقق من عدم وجود حجز في نفس التاريخ
        AND NOT EXISTS (
            SELECT 1 FROM event_bookings eb
            WHERE eb.event_driver_id = ed.id
            AND eb.event_date = p_event_date
            AND eb.booking_status IN ('confirmed', 'driver_assigned', 'in_progress')
        )
    ORDER BY ed.rating DESC, ed.hourly_rate ASC;
END;
$$ LANGUAGE plpgsql;

-- 2. دالة حساب التقييم الإجمالي
CREATE OR REPLACE FUNCTION update_event_driver_rating(p_event_driver_id UUID) 
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_reviews INTEGER;
BEGIN
    SELECT 
        AVG(rating)::DECIMAL(3,2),
        COUNT(*)
    INTO avg_rating, total_reviews
    FROM event_driver_reviews
    WHERE event_driver_id = p_event_driver_id;
    
    UPDATE event_drivers
    SET 
        rating = COALESCE(avg_rating, 0),
        updated_at = NOW()
    WHERE id = p_event_driver_id;
END;
$$ LANGUAGE plpgsql;

-- 3. دالة إنشاء رقم حجز فريد
CREATE OR REPLACE FUNCTION generate_event_booking_number() 
RETURNS VARCHAR(20) AS $$
DECLARE
    booking_number VARCHAR(20);
BEGIN
    booking_number := FORMAT('EVT-%s-%s', 
        TO_CHAR(NOW(), 'YYYYMMDD'),
        LPAD(nextval('event_bookings_id_seq')::TEXT, 4, '0')
    );
    RETURN booking_number;
END;
$$ LANGUAGE plpgsql;

-- تفعيل تحديث التقييم تلقائياً عند إضافة مراجعة جديدة
CREATE OR REPLACE FUNCTION trigger_update_event_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_event_driver_rating(NEW.event_driver_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_driver_rating_trigger
    AFTER INSERT OR UPDATE ON event_driver_reviews
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_event_driver_rating();

-- رسالة تأكيد
SELECT 'تم إنشاء جداول سائقي المناسبات الخاصة بنجاح! 🎉🚗' as status;
