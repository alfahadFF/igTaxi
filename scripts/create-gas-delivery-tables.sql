-- نظام توزيع الغاز بنفس منهجية التاكسي
-- يشمل البحث التدريجي عن أقرب الموزعين المتاحين

-- إنشاء جدول موزعي الغاز
CREATE TABLE gas_distributors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_name VARCHAR(100) NOT NULL, -- اسم المؤسسة/المحل
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    current_latitude DECIMAL(10, 8) NOT NULL,
    current_longitude DECIMAL(11, 8) NOT NULL,
    registered_address TEXT NOT NULL, -- العنوان المسجل
    coverage_radius INTEGER DEFAULT 10, -- نطاق التغطية بالكيلومتر
    is_available BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_online BOOLEAN DEFAULT false, -- متصل الآن
    
    -- معلومات الخدمة
    cylinder_12kg_price DECIMAL(10, 2), -- سعر اسطوانة 12 كيلو
    cylinder_25kg_price DECIMAL(10, 2), -- سعر اسطوانة 25 كيلو
    cylinder_small_price DECIMAL(10, 2), -- سعر اسطوانة صغيرة
    service_fee DECIMAL(10, 2) DEFAULT 0, -- رسوم الخدمة
    
    -- إحصائيات
    rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_orders INTEGER DEFAULT 0,
    total_earnings DECIMAL(12, 2) DEFAULT 0,
    
    -- أوقات العمل
    working_hours JSONB DEFAULT '{"start": "08:00", "end": "22:00"}',
    working_days TEXT[] DEFAULT ARRAY['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول طلبات الغاز
CREATE TABLE gas_delivery_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES gas_distributors(id) ON DELETE SET NULL,
    
    -- تفاصيل الطلب
    cylinder_type VARCHAR(20) NOT NULL CHECK (cylinder_type IN ('12kg', '25kg', 'small')),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price_per_cylinder DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- موقع التسليم
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_instructions TEXT,
    
    -- حالة الطلب
    status VARCHAR(20) DEFAULT 'searching' CHECK (status IN (
        'searching', 'accepted', 'en_route', 'arrived', 
        'delivering', 'completed', 'cancelled', 'no_distributors_found'
    )),
    
    -- البحث عن الموزعين
    search_radius INTEGER DEFAULT 5, -- نطاق البحث الحالي
    max_search_radius INTEGER DEFAULT 50, -- أقصى نطاق بحث
    distributors_notified UUID[] DEFAULT '{}', -- الموزعين الذين تم إشعارهم
    
    -- الأوقات
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- التقييم
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    distributor_rating INTEGER CHECK (distributor_rating >= 1 AND distributor_rating <= 5),
    distributor_feedback TEXT
);

-- إنشاء جدول تتبع مواقع موزعي الغاز
CREATE TABLE gas_distributor_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID REFERENCES gas_distributors(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    heading DECIMAL(5, 2), -- الاتجاه
    speed DECIMAL(5, 2), -- السرعة
    accuracy DECIMAL(8, 2), -- دقة الموقع بالمتر
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول إشعارات الطلبات للموزعين
CREATE TABLE gas_order_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES gas_delivery_orders(id) ON DELETE CASCADE,
    distributor_id UUID REFERENCES gas_distributors(id) ON DELETE CASCADE,
    distance_km DECIMAL(8, 2) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    seen_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    response VARCHAR(10) CHECK (response IN ('accept', 'reject', 'timeout'))
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX idx_gas_distributors_location ON gas_distributors (current_latitude, current_longitude);
CREATE INDEX idx_gas_distributors_available ON gas_distributors (is_available, is_verified, is_online);
CREATE INDEX idx_gas_delivery_orders_status ON gas_delivery_orders (status);
CREATE INDEX idx_gas_delivery_orders_customer ON gas_delivery_orders (customer_id);
CREATE INDEX idx_gas_delivery_orders_distributor ON gas_delivery_orders (distributor_id);
CREATE INDEX idx_gas_distributor_locations_time ON gas_distributor_locations (distributor_id, recorded_at DESC);
CREATE INDEX idx_gas_order_notifications_order ON gas_order_notifications (order_id);

-- دالة لتحديث موقع الموزع
CREATE OR REPLACE FUNCTION update_gas_distributor_location(
    distributor_uuid UUID,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    heading_val DECIMAL(5, 2) DEFAULT NULL,
    speed_val DECIMAL(5, 2) DEFAULT NULL,
    accuracy_val DECIMAL(8, 2) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- تحديث الموقع الحالي
    UPDATE gas_distributors 
    SET 
        current_latitude = lat,
        current_longitude = lng,
        updated_at = NOW()
    WHERE id = distributor_uuid;
    
    -- إضافة سجل في تتبع المواقع
    INSERT INTO gas_distributor_locations (
        distributor_id, latitude, longitude, heading, speed, accuracy
    ) VALUES (
        distributor_uuid, lat, lng, heading_val, speed_val, accuracy_val
    );
    
    -- حذف السجلات القديمة (الاحتفاظ بآخر 50 موقع)
    DELETE FROM gas_distributor_locations 
    WHERE distributor_id = distributor_uuid 
    AND id NOT IN (
        SELECT id FROM gas_distributor_locations 
        WHERE distributor_id = distributor_uuid 
        ORDER BY recorded_at DESC 
        LIMIT 50
    );
END;
$$ LANGUAGE plpgsql;

-- دالة للبحث عن موزعي الغاز في نطاق محدد
CREATE OR REPLACE FUNCTION find_available_gas_distributors(
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    cylinder_type_param VARCHAR(20),
    search_radius_km INTEGER DEFAULT 5,
    excluded_distributors UUID[] DEFAULT '{}',
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    distributor_id UUID,
    driver_id UUID,
    business_name VARCHAR(100),
    phone VARCHAR(20),
    distance_km DECIMAL(8, 2),
    price_per_cylinder DECIMAL(10, 2),
    rating DECIMAL(3, 2),
    total_orders INTEGER,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gd.id,
        gd.driver_id,
        gd.business_name,
        gd.phone,
        calculate_distance_km(gd.current_latitude, gd.current_longitude, delivery_lat, delivery_lng) as distance_km,
        CASE 
            WHEN cylinder_type_param = '12kg' THEN gd.cylinder_12kg_price
            WHEN cylinder_type_param = '25kg' THEN gd.cylinder_25kg_price
            WHEN cylinder_type_param = 'small' THEN gd.cylinder_small_price
            ELSE 0
        END as price_per_cylinder,
        gd.rating,
        gd.total_orders,
        gd.current_latitude,
        gd.current_longitude
    FROM gas_distributors gd
    WHERE 
        gd.is_available = true 
        AND gd.is_verified = true
        AND gd.is_online = true
        AND gd.current_latitude IS NOT NULL 
        AND gd.current_longitude IS NOT NULL
        AND gd.id != ALL(excluded_distributors)
        AND calculate_distance_km(gd.current_latitude, gd.current_longitude, delivery_lat, delivery_lng) <= search_radius_km
        AND (
            (cylinder_type_param = '12kg' AND gd.cylinder_12kg_price > 0) OR
            (cylinder_type_param = '25kg' AND gd.cylinder_25kg_price > 0) OR
            (cylinder_type_param = 'small' AND gd.cylinder_small_price > 0)
        )
    ORDER BY 
        calculate_distance_km(gd.current_latitude, gd.current_longitude, delivery_lat, delivery_lng) ASC,
        gd.rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- دالة لإرسال إشعارات للموزعين وزيادة نطاق البحث تدريجياً
CREATE OR REPLACE FUNCTION notify_gas_distributors_progressive(
    order_uuid UUID
)
RETURNS TABLE (
    notified_count INTEGER,
    search_radius INTEGER,
    message TEXT
) AS $$
DECLARE
    order_record gas_delivery_orders%ROWTYPE;
    available_distributors RECORD;
    notification_count INTEGER := 0;
    current_radius INTEGER;
BEGIN
    -- جلب تفاصيل الطلب
    SELECT * INTO order_record FROM gas_delivery_orders WHERE id = order_uuid;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 0, 'Order not found'::TEXT;
        RETURN;
    END IF;
    
    current_radius := order_record.search_radius;
    
    -- البحث عن موزعين متاحين في النطاق الحالي
    FOR available_distributors IN 
        SELECT * FROM find_available_gas_distributors(
            order_record.delivery_latitude,
            order_record.delivery_longitude,
            order_record.cylinder_type,
            current_radius,
            order_record.distributors_notified
        )
    LOOP
        -- إضافة إشعار
        INSERT INTO gas_order_notifications (
            order_id, distributor_id, distance_km
        ) VALUES (
            order_uuid, available_distributors.distributor_id, available_distributors.distance_km
        );
        
        notification_count := notification_count + 1;
    END LOOP;
    
    -- تحديث قائمة الموزعين المُشعرين
    UPDATE gas_delivery_orders 
    SET 
        distributors_notified = distributors_notified || 
            (SELECT ARRAY_AGG(distributor_id) FROM find_available_gas_distributors(
                order_record.delivery_latitude,
                order_record.delivery_longitude,
                order_record.cylinder_type,
                current_radius,
                order_record.distributors_notified
            )),
        search_radius = current_radius
    WHERE id = order_uuid;
    
    IF notification_count = 0 THEN
        -- لا يوجد موزعين في النطاق الحالي، زيادة النطاق
        current_radius := current_radius + 5;
        
        IF current_radius <= order_record.max_search_radius THEN
            -- تحديث نطاق البحث وإعادة المحاولة
            UPDATE gas_delivery_orders 
            SET search_radius = current_radius
            WHERE id = order_uuid;
            
            RETURN QUERY SELECT 0, current_radius, 'Expanding search radius to ' || current_radius || ' km'::TEXT;
        ELSE
            -- لا يوجد موزعين في كامل النطاق
            UPDATE gas_delivery_orders 
            SET status = 'no_distributors_found'
            WHERE id = order_uuid;
            
            RETURN QUERY SELECT 0, current_radius, 'No distributors found within maximum radius'::TEXT;
        END IF;
    ELSE
        RETURN QUERY SELECT notification_count, current_radius, 'Notified ' || notification_count || ' distributors'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء رقم طلب فريد
CREATE OR REPLACE FUNCTION generate_gas_order_number()
RETURNS VARCHAR(20) AS $$
DECLARE
    new_number VARCHAR(20);
    counter INTEGER := 0;
BEGIN
    LOOP
        new_number := 'GAS' || TO_CHAR(NOW(), 'YYYYMMDD') || 
                     LPAD((EXTRACT(EPOCH FROM NOW())::INTEGER % 10000)::TEXT, 4, '0');
        
        IF NOT EXISTS (SELECT 1 FROM gas_delivery_orders WHERE order_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Unable to generate unique gas order number';
        END IF;
        
        PERFORM pg_sleep(0.001);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- تفعيل RLS
ALTER TABLE gas_distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_distributor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_order_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للموزعين
CREATE POLICY "Users can view available distributors" ON gas_distributors
    FOR SELECT USING (is_verified = true AND is_available = true);

CREATE POLICY "Distributors can manage their info" ON gas_distributors
    FOR ALL USING (auth.uid() = driver_id);

-- سياسات الأمان للطلبات
CREATE POLICY "Users can view their orders" ON gas_delivery_orders
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() = (SELECT driver_id FROM gas_distributors WHERE id = distributor_id)
    );

CREATE POLICY "Users can create orders" ON gas_delivery_orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their orders" ON gas_delivery_orders
    FOR UPDATE USING (
        auth.uid() = customer_id OR 
        auth.uid() = (SELECT driver_id FROM gas_distributors WHERE id = distributor_id)
    );

-- سياسات الأمان للإشعارات
CREATE POLICY "Distributors can view their notifications" ON gas_order_notifications
    FOR SELECT USING (
        auth.uid() = (SELECT driver_id FROM gas_distributors WHERE id = distributor_id)
    );

CREATE POLICY "System can manage notifications" ON gas_order_notifications
    FOR ALL USING (true);

-- سياسات الأمان لتتبع المواقع
CREATE POLICY "Distributors can manage their locations" ON gas_distributor_locations
    FOR ALL USING (
        auth.uid() = (SELECT driver_id FROM gas_distributors WHERE id = distributor_id)
    );

COMMIT;
