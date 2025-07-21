-- نظام التاكسي المتقدم - النسخة المحدثة
-- تاريخ الإنشاء: 2025-07-20

-- أولاً: إضافة عمود الصورة الشخصية لجدول profiles إذا لم يكن موجوداً
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating') THEN
        ALTER TABLE profiles ADD COLUMN rating DECIMAL(3,2) DEFAULT 0;
    END IF;
END $$;

-- جدول طلبات التاكسي
CREATE TABLE IF NOT EXISTS taxi_requests (
    id BIGSERIAL PRIMARY KEY,
    request_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address VARCHAR(500) NOT NULL,
    destination_latitude DECIMAL(10, 8) NOT NULL,
    destination_longitude DECIMAL(11, 8) NOT NULL,
    destination_address VARCHAR(500) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL, -- economy, comfort, premium, xl, hybrid, electric
    fuel_type VARCHAR(20) DEFAULT 'gasoline', -- gasoline, hybrid, electric
    estimated_price DECIMAL(10, 2) NOT NULL,
    final_price DECIMAL(10, 2),
    estimated_distance DECIMAL(8, 2) NOT NULL, -- بالكيلومتر
    actual_distance DECIMAL(8, 2),
    estimated_duration INTEGER NOT NULL, -- بالدقائق
    actual_duration INTEGER,
    customer_notes TEXT,
    driver_notes TEXT,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'driver_notified', 'driver_assigned', 'driver_arrived', 'trip_started', 'trip_completed', 'cancelled', 'rejected')),
    cancellation_reason VARCHAR(200),
    cancelled_by VARCHAR(20), -- customer, driver, system
    payment_status VARCHAR(20) DEFAULT 'pending',
    rating_by_customer INTEGER CHECK (rating_by_customer >= 1 AND rating_by_customer <= 5),
    rating_by_driver INTEGER CHECK (rating_by_driver >= 1 AND rating_by_driver <= 5),
    customer_comment TEXT,
    driver_comment TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE,
    driver_arrived_at TIMESTAMP WITH TIME ZONE,
    trip_started_at TIMESTAMP WITH TIME ZONE,
    trip_completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول مواقع السائقين المباشرة
CREATE TABLE IF NOT EXISTS driver_locations (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2), -- اتجاه السيارة بالدرجات
    speed DECIMAL(5, 2), -- السرعة بالكيلومتر/ساعة
    accuracy DECIMAL(8, 2), -- دقة الموقع بالمتر
    is_online BOOLEAN DEFAULT false,
    is_available BOOLEAN DEFAULT false,
    current_request_id BIGINT REFERENCES taxi_requests(id) ON DELETE SET NULL,
    vehicle_type VARCHAR(50), -- نوع السيارة المتاحة
    fuel_type VARCHAR(20) DEFAULT 'gasoline',
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول إشعارات السائقين
CREATE TABLE IF NOT EXISTS driver_notifications (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    request_id BIGINT REFERENCES taxi_requests(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL, -- new_request, request_cancelled, etc
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- بيانات إضافية للإشعار
    is_read BOOLEAN DEFAULT false,
    is_responded BOOLEAN DEFAULT false,
    response_type VARCHAR(20), -- accept, reject
    response_time TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- انتهاء صلاحية الإشعار
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول مسارات الرحلات
CREATE TABLE IF NOT EXISTS trip_routes (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES taxi_requests(id) ON DELETE CASCADE,
    route_points JSONB NOT NULL, -- مجموعة النقاط [{lat, lng, timestamp}]
    total_distance DECIMAL(8, 2),
    total_duration INTEGER, -- بالدقائق
    average_speed DECIMAL(5, 2), -- السرعة المتوسطة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول مدفوعات التاكسي
CREATE TABLE IF NOT EXISTS taxi_payments (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES taxi_requests(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    driver_commission DECIMAL(10, 2), -- عمولة السائق
    app_commission DECIMAL(10, 2), -- عمولة التطبيق
    payment_method VARCHAR(30) DEFAULT 'cash', -- نقدي فقط
    payment_status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(255),
    payment_gateway_response JSONB,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تسعير ديناميكي
CREATE TABLE IF NOT EXISTS dynamic_pricing (
    id BIGSERIAL PRIMARY KEY,
    area_name VARCHAR(200) NOT NULL,
    area_bounds JSONB NOT NULL, -- حدود المنطقة الجغرافية
    vehicle_type VARCHAR(50) NOT NULL,
    base_multiplier DECIMAL(3, 2) DEFAULT 1.0, -- مضاعف السعر الأساسي
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.0, -- مضاعف الذروة
    demand_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, very_high
    weather_factor DECIMAL(3, 2) DEFAULT 1.0, -- تأثير الطقس
    event_factor DECIMAL(3, 2) DEFAULT 1.0, -- تأثير الأحداث
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تقييمات مفصلة
CREATE TABLE IF NOT EXISTS detailed_ratings (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES taxi_requests(id) ON DELETE CASCADE,
    rater_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rated_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rater_type VARCHAR(20) NOT NULL, -- customer, driver
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    driving_rating INTEGER CHECK (driving_rating >= 1 AND driving_rating <= 5),
    vehicle_rating INTEGER CHECK (vehicle_rating >= 1 AND vehicle_rating <= 5),
    comment TEXT,
    tags JSONB, -- علامات مثل ["friendly", "clean_car", "fast_driver"]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول رسائل الرحلة
CREATE TABLE IF NOT EXISTS trip_messages (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES taxi_requests(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- customer, driver
    message_text TEXT,
    message_type VARCHAR(20) DEFAULT 'text', -- text, location, audio, image
    attachment_url TEXT,
    location_data JSONB, -- {lat, lng, address}
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_taxi_requests_customer ON taxi_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_driver ON taxi_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_status ON taxi_requests(status);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_created ON taxi_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_location ON taxi_requests(pickup_latitude, pickup_longitude);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_available ON driver_locations(is_available, is_online);
CREATE INDEX IF NOT EXISTS idx_driver_locations_position ON driver_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_driver_locations_ping ON driver_locations(last_ping);

CREATE INDEX IF NOT EXISTS idx_driver_notifications_driver ON driver_notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_request ON driver_notifications(request_id);
CREATE INDEX IF NOT EXISTS idx_driver_notifications_unread ON driver_notifications(is_read, created_at);

CREATE INDEX IF NOT EXISTS idx_trip_routes_request ON trip_routes(request_id);
CREATE INDEX IF NOT EXISTS idx_taxi_payments_request ON taxi_payments(request_id);
CREATE INDEX IF NOT EXISTS idx_detailed_ratings_request ON detailed_ratings(request_id);
CREATE INDEX IF NOT EXISTS idx_trip_messages_request ON trip_messages(request_id);

-- دالة لتوليد رقم الطلب التلقائي
CREATE OR REPLACE FUNCTION generate_taxi_request_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TX-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(nextval('taxi_requests_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- دالة لتعيين رقم الطلب التلقائي
CREATE OR REPLACE FUNCTION set_taxi_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number = generate_taxi_request_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغل لتوليد رقم الطلب
DROP TRIGGER IF EXISTS taxi_request_number_trigger ON taxi_requests;
CREATE TRIGGER taxi_request_number_trigger
    BEFORE INSERT ON taxi_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_taxi_request_number();

-- دالة لتحديث تاريخ التعديل
CREATE OR REPLACE FUNCTION update_taxi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغلات لتحديث تاريخ التعديل
DROP TRIGGER IF EXISTS taxi_requests_updated_at_trigger ON taxi_requests;
CREATE TRIGGER taxi_requests_updated_at_trigger
    BEFORE UPDATE ON taxi_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_taxi_updated_at();

DROP TRIGGER IF EXISTS driver_locations_updated_at_trigger ON driver_locations;
CREATE TRIGGER driver_locations_updated_at_trigger
    BEFORE UPDATE ON driver_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_taxi_updated_at();

-- دالة لتحديث حالة السائق عند تعيين رحلة
CREATE OR REPLACE FUNCTION update_driver_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- عند تعيين سائق للرحلة
    IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id) THEN
        UPDATE driver_locations 
        SET is_available = false, current_request_id = NEW.id
        WHERE driver_id = NEW.driver_id;
    END IF;
    
    -- عند إنهاء الرحلة أو إلغائها
    IF OLD.driver_id IS NOT NULL AND NEW.status IN ('trip_completed', 'cancelled') THEN
        UPDATE driver_locations 
        SET is_available = true, current_request_id = NULL
        WHERE driver_id = OLD.driver_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغل لتحديث حالة السائق
DROP TRIGGER IF EXISTS driver_availability_trigger ON taxi_requests;
CREATE TRIGGER driver_availability_trigger
    AFTER UPDATE ON taxi_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_driver_availability();

-- دالة لحساب مسافة بين نقطتين (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10, 8),
    lon1 DECIMAL(11, 8),
    lat2 DECIMAL(10, 8),
    lon2 DECIMAL(11, 8)
)
RETURNS DECIMAL(8, 2) AS $$
DECLARE
    R DECIMAL := 6371; -- نصف قطر الأرض بالكيلومتر
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    
    a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    distance := R * c;
    
    RETURN ROUND(distance, 2);
END;
$$ LANGUAGE plpgsql;

-- دالة للبحث عن السائقين القريبين
CREATE OR REPLACE FUNCTION find_nearby_drivers(
    pickup_lat DECIMAL(10, 8),
    pickup_lon DECIMAL(11, 8),
    vehicle_type_filter VARCHAR(50) DEFAULT NULL,
    max_distance DECIMAL(8, 2) DEFAULT 10.0,
    max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
    driver_id UUID,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    distance DECIMAL(8, 2),
    vehicle_type VARCHAR(50),
    fuel_type VARCHAR(20),
    driver_name TEXT,
    driver_phone VARCHAR(20),
    driver_rating DECIMAL(3, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dl.driver_id,
        dl.latitude,
        dl.longitude,
        calculate_distance(pickup_lat, pickup_lon, dl.latitude, dl.longitude) as distance,
        dl.vehicle_type,
        dl.fuel_type,
        p.full_name as driver_name,
        p.phone as driver_phone,
        COALESCE(p.rating, 0) as driver_rating
    FROM driver_locations dl
    JOIN profiles p ON dl.driver_id = p.id
    WHERE dl.is_online = true 
      AND dl.is_available = true
      AND dl.last_ping > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
      AND (vehicle_type_filter IS NULL OR dl.vehicle_type = vehicle_type_filter)
      AND calculate_distance(pickup_lat, pickup_lon, dl.latitude, dl.longitude) <= max_distance
    ORDER BY distance ASC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- عرض شامل لطلبات التاكسي
CREATE OR REPLACE VIEW taxi_requests_detailed AS
SELECT 
    tr.*,
    c.full_name as customer_name,
    c.phone as customer_phone,
    c.avatar_url as customer_avatar,
    d.full_name as driver_name,
    d.phone as driver_phone,
    d.avatar_url as driver_avatar,
    dl.latitude as driver_current_lat,
    dl.longitude as driver_current_lng,
    dl.vehicle_type as driver_vehicle_type,
    tp.payment_status as payment_status_detail,
    tp.tip_amount,
    CASE 
        WHEN tr.status = 'pending' THEN 'في انتظار السائق'
        WHEN tr.status = 'driver_notified' THEN 'تم إشعار السائقين'
        WHEN tr.status = 'driver_assigned' THEN 'تم تعيين السائق'
        WHEN tr.status = 'driver_arrived' THEN 'وصل السائق'
        WHEN tr.status = 'trip_started' THEN 'بدأت الرحلة'
        WHEN tr.status = 'trip_completed' THEN 'انتهت الرحلة'
        WHEN tr.status = 'cancelled' THEN 'ملغاة'
        WHEN tr.status = 'rejected' THEN 'مرفوضة'
        ELSE tr.status
    END as status_arabic
FROM taxi_requests tr
LEFT JOIN profiles c ON tr.customer_id = c.id
LEFT JOIN profiles d ON tr.driver_id = d.id
LEFT JOIN driver_locations dl ON tr.driver_id = dl.driver_id
LEFT JOIN taxi_payments tp ON tr.id = tp.request_id;

-- سياسات الأمان (RLS)
ALTER TABLE taxi_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

-- سياسة طلبات التاكسي
CREATE POLICY "Users can view their own taxi requests" ON taxi_requests
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = driver_id
    );

CREATE POLICY "Users can create taxi requests" ON taxi_requests
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Drivers can update assigned requests" ON taxi_requests
    FOR UPDATE USING (
        auth.uid() = driver_id OR 
        auth.uid() = customer_id
    );

-- سياسة مواقع السائقين
CREATE POLICY "Drivers can manage their location" ON driver_locations
    FOR ALL USING (auth.uid() = driver_id);

CREATE POLICY "Anyone can view available drivers" ON driver_locations
    FOR SELECT USING (is_available = true AND is_online = true);

-- سياسة إشعارات السائقين
CREATE POLICY "Drivers can view their notifications" ON driver_notifications
    FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "System can create notifications" ON driver_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Drivers can update their notifications" ON driver_notifications
    FOR UPDATE USING (auth.uid() = driver_id);

-- سياسة مسارات الرحلات
CREATE POLICY "Users can view trip routes for their requests" ON trip_routes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM taxi_requests 
            WHERE id = trip_routes.request_id 
            AND (customer_id = auth.uid() OR driver_id = auth.uid())
        )
    );

-- سياسة المدفوعات
CREATE POLICY "Users can view their payments" ON taxi_payments
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = driver_id
    );

-- سياسة التقييمات
CREATE POLICY "Users can view ratings for their trips" ON detailed_ratings
    FOR SELECT USING (
        auth.uid() = rater_id OR 
        auth.uid() = rated_id
    );

CREATE POLICY "Users can create ratings for their trips" ON detailed_ratings
    FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- سياسة رسائل الرحلة
CREATE POLICY "Users can view messages for their trips" ON trip_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM taxi_requests 
            WHERE id = trip_messages.request_id 
            AND (customer_id = auth.uid() OR driver_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages for their trips" ON trip_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM taxi_requests 
            WHERE id = trip_messages.request_id 
            AND (customer_id = auth.uid() OR driver_id = auth.uid())
        )
    );

-- إدراج بيانات تجريبية للتسعير الديناميكي
INSERT INTO dynamic_pricing (
    area_name, area_bounds, vehicle_type, base_multiplier, surge_multiplier, demand_level
) VALUES 
(
    'وسط دبي',
    '{"type": "polygon", "coordinates": [[[55.2500, 25.2000], [55.3000, 25.2000], [55.3000, 25.2500], [55.2500, 25.2500], [55.2500, 25.2000]]]}',
    'economy', 1.0, 1.2, 'normal'
),
(
    'دبي مول',
    '{"type": "polygon", "coordinates": [[[55.2700, 25.1950], [55.2800, 25.1950], [55.2800, 25.2050], [55.2700, 25.2050], [55.2700, 25.1950]]]}',
    'economy', 1.2, 1.5, 'high'
),
(
    'مطار دبي',
    '{"type": "polygon", "coordinates": [[[55.3500, 25.2500], [55.3700, 25.2500], [55.3700, 25.2700], [55.3500, 25.2700], [55.3500, 25.2500]]]}',
    'economy', 1.3, 1.0, 'normal'
)
ON CONFLICT DO NOTHING;

-- تحديث تسلسل أرقام الطلبات
SELECT setval('taxi_requests_id_seq', 1000, false);

COMMENT ON TABLE taxi_requests IS 'جدول طلبات التاكسي';
COMMENT ON TABLE driver_locations IS 'جدول مواقع السائقين المباشرة';
COMMENT ON TABLE driver_notifications IS 'جدول إشعارات السائقين';
COMMENT ON TABLE trip_routes IS 'جدول مسارات الرحلات';
COMMENT ON TABLE taxi_payments IS 'جدول مدفوعات التاكسي';
COMMENT ON TABLE dynamic_pricing IS 'جدول التسعير الديناميكي';
COMMENT ON TABLE detailed_ratings IS 'جدول التقييمات المفصلة';
COMMENT ON TABLE trip_messages IS 'جدول رسائل الرحلة';
