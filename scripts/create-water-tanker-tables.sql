-- تفعيل امتداد PostGIS للمواقع الجغرافية
CREATE EXTENSION IF NOT EXISTS postgis;

-- إنشاء جدول صهاريج المياه
CREATE TABLE water_tankers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    tanker_capacity INTEGER NOT NULL CHECK (tanker_capacity > 0), -- بالليتر
    available_capacity INTEGER NOT NULL DEFAULT 0,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    is_available BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    price_per_liter DECIMAL(10, 2) NOT NULL CHECK (price_per_liter > 0),
    minimum_order INTEGER DEFAULT 500, -- أقل كمية طلب بالليتر
    service_areas TEXT[], -- المناطق التي يخدمها
    vehicle_info JSONB DEFAULT '{}', -- معلومات إضافية عن المركبة
    rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_trips INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول طلبات صهاريج المياه
CREATE TABLE water_tanker_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tanker_id UUID REFERENCES water_tankers(id) ON DELETE SET NULL,
    
    -- تفاصيل الطلب
    water_quantity INTEGER NOT NULL CHECK (water_quantity > 0), -- بالليتر
    price_per_liter DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- معلومات الموقع
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_address TEXT,
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    delivery_address TEXT NOT NULL,
    
    -- تفاصيل إضافية
    customer_notes TEXT,
    special_instructions TEXT,
    preferred_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- حالة الطلب
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'searching', 'accepted', 'en_route_pickup', 
        'arrived_pickup', 'loading', 'en_route_delivery', 
        'arrived_delivery', 'delivering', 'completed', 'cancelled'
    )),
    
    -- الأوقات
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    pickup_started_at TIMESTAMP WITH TIME ZONE,
    pickup_completed_at TIMESTAMP WITH TIME ZONE,
    delivery_started_at TIMESTAMP WITH TIME ZONE,
    delivery_completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- التقييم
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    driver_feedback TEXT
);

-- إنشاء جدول تتبع موقع صهاريج المياه
CREATE TABLE water_tanker_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanker_id UUID REFERENCES water_tankers(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2), -- الاتجاه
    speed DECIMAL(5, 2), -- السرعة
    accuracy DECIMAL(8, 2), -- دقة الموقع بالمتر
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX idx_water_tankers_location ON water_tankers USING GIST (
    ST_Point(current_longitude::double precision, current_latitude::double precision)
);
CREATE INDEX idx_water_tankers_available ON water_tankers (is_available, is_verified);
CREATE INDEX idx_water_tanker_orders_status ON water_tanker_orders (status);
CREATE INDEX idx_water_tanker_orders_customer ON water_tanker_orders (customer_id);
CREATE INDEX idx_water_tanker_orders_tanker ON water_tanker_orders (tanker_id);
CREATE INDEX idx_water_tanker_locations_tanker_time ON water_tanker_locations (tanker_id, recorded_at DESC);

-- دالة لتحديث موقع الصهريج
CREATE OR REPLACE FUNCTION update_tanker_location(
    tanker_uuid UUID,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    heading_val DECIMAL(5, 2) DEFAULT NULL,
    speed_val DECIMAL(5, 2) DEFAULT NULL,
    accuracy_val DECIMAL(8, 2) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- تحديث الموقع الحالي في جدول الصهاريج
    UPDATE water_tankers 
    SET 
        current_latitude = lat,
        current_longitude = lng,
        updated_at = NOW()
    WHERE id = tanker_uuid;
    
    -- إضافة سجل في جدول تتبع المواقع
    INSERT INTO water_tanker_locations (
        tanker_id, latitude, longitude, heading, speed, accuracy
    ) VALUES (
        tanker_uuid, lat, lng, heading_val, speed_val, accuracy_val
    );
    
    -- حذف السجلات القديمة (الاحتفاظ بآخر 100 موقع لكل صهريج)
    DELETE FROM water_tanker_locations 
    WHERE tanker_id = tanker_uuid 
    AND id NOT IN (
        SELECT id FROM water_tanker_locations 
        WHERE tanker_id = tanker_uuid 
        ORDER BY recorded_at DESC 
        LIMIT 100
    );
END;
$$ LANGUAGE plpgsql;

-- دالة للبحث عن أقرب صهريج متاح
CREATE OR REPLACE FUNCTION find_nearest_available_tankers(
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    required_quantity INTEGER,
    max_distance_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    tanker_id UUID,
    driver_id UUID,
    license_plate VARCHAR(20),
    tanker_capacity INTEGER,
    available_capacity INTEGER,
    price_per_liter DECIMAL(10, 2),
    minimum_order INTEGER,
    rating DECIMAL(3, 2),
    total_trips INTEGER,
    distance_km DECIMAL(8, 2),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wt.id,
        wt.driver_id,
        wt.license_plate,
        wt.tanker_capacity,
        wt.available_capacity,
        wt.price_per_liter,
        wt.minimum_order,
        wt.rating,
        wt.total_trips,
        ROUND(
            ST_Distance(
                ST_Point(wt.current_longitude::double precision, wt.current_latitude::double precision)::geography,
                ST_Point(delivery_lng::double precision, delivery_lat::double precision)::geography
            ) / 1000.0, 2
        ) as distance_km,
        wt.current_latitude,
        wt.current_longitude
    FROM water_tankers wt
    WHERE 
        wt.is_available = true 
        AND wt.is_verified = true
        AND wt.available_capacity >= required_quantity
        AND wt.current_latitude IS NOT NULL 
        AND wt.current_longitude IS NOT NULL
        AND ST_Distance(
            ST_Point(wt.current_longitude::double precision, wt.current_latitude::double precision)::geography,
            ST_Point(delivery_lng::double precision, delivery_lat::double precision)::geography
        ) / 1000.0 <= max_distance_km
    ORDER BY 
        ST_Distance(
            ST_Point(wt.current_longitude::double precision, wt.current_latitude::double precision)::geography,
            ST_Point(delivery_lng::double precision, delivery_lat::double precision)::geography
        ) ASC,
        wt.rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء رقم طلب فريد
CREATE OR REPLACE FUNCTION generate_tanker_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    counter INTEGER := 0;
BEGIN
    LOOP
        new_number := 'WTO' || TO_CHAR(NOW(), 'YYYYMMDD') || 
                     LPAD((EXTRACT(EPOCH FROM NOW())::INTEGER % 10000)::TEXT, 4, '0');
        
        -- التحقق من عدم وجود الرقم
        IF NOT EXISTS (SELECT 1 FROM water_tanker_orders WHERE order_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Unable to generate unique order number';
        END IF;
        
        -- انتظار ميلي ثانية قبل المحاولة التالية
        PERFORM pg_sleep(0.001);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تفعيل RLS
ALTER TABLE water_tankers ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_tanker_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_tanker_locations ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للصهاريج
CREATE POLICY "Users can view available tankers" ON water_tankers
    FOR SELECT USING (is_verified = true AND is_available = true);

CREATE POLICY "Drivers can manage their tankers" ON water_tankers
    FOR ALL USING (auth.uid() = driver_id);

-- سياسات الأمان للطلبات
CREATE POLICY "Users can view their orders" ON water_tanker_orders
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = (SELECT driver_id FROM water_tankers WHERE id = tanker_id)
    );

CREATE POLICY "Users can create orders" ON water_tanker_orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their orders" ON water_tanker_orders
    FOR UPDATE USING (
        auth.uid() = customer_id OR 
        auth.uid() = (SELECT driver_id FROM water_tankers WHERE id = tanker_id)
    );

-- سياسات الأمان لتتبع المواقع
CREATE POLICY "Drivers can manage their locations" ON water_tanker_locations
    FOR ALL USING (
        auth.uid() = (SELECT driver_id FROM water_tankers WHERE id = tanker_id)
    );

CREATE POLICY "Users can view locations during active orders" ON water_tanker_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM water_tanker_orders wto
            WHERE wto.tanker_id = water_tanker_locations.tanker_id
            AND wto.customer_id = auth.uid()
            AND wto.status IN ('accepted', 'en_route_pickup', 'loading', 'en_route_delivery', 'delivering')
        )
    );

-- إدراج بيانات تجريبية
INSERT INTO water_tankers (
    driver_id, license_plate, tanker_capacity, available_capacity, 
    current_latitude, current_longitude, price_per_liter, minimum_order,
    rating, total_trips, service_areas
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'WTR001',
    5000,
    5000,
    31.9515694,
    35.9239625,
    0.50,
    1000,
    4.8,
    156,
    ARRAY['عمان', 'الزرقاء', 'السلط']
),
(
    '00000000-0000-0000-0000-000000000002', 
    'WTR002',
    8000,
    6000,
    31.9461,
    35.9284,
    0.45,
    1500,
    4.6,
    203,
    ARRAY['عمان', 'مادبا']
),
(
    '00000000-0000-0000-0000-000000000003',
    'WTR003',
    10000,
    8500,
    31.9565,
    35.9457,
    0.48,
    2000,
    4.9,
    89,
    ARRAY['عمان', 'الكرك', 'معان']
);

COMMIT;
