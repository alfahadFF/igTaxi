-- نظام حجز المواقف
-- تاريخ الإنشاء: 2025-07-20

-- جدول المواقف
CREATE TABLE IF NOT EXISTS parking_lots (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    total_spots INTEGER NOT NULL DEFAULT 0,
    available_spots INTEGER NOT NULL DEFAULT 0,
    price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_per_day DECIMAL(10, 2),
    price_per_month DECIMAL(10, 2),
    image_url TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    operating_hours JSONB DEFAULT '{"start": "00:00", "end": "23:59"}'::jsonb,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_covered BOOLEAN DEFAULT false,
    has_security BOOLEAN DEFAULT false,
    has_valet BOOLEAN DEFAULT false,
    has_ev_charging BOOLEAN DEFAULT false,
    has_car_wash BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول حجوزات المواقف
CREATE TABLE IF NOT EXISTS parking_reservations (
    id BIGSERIAL PRIMARY KEY,
    reservation_number VARCHAR(50) UNIQUE NOT NULL,
    parking_lot_id BIGINT REFERENCES parking_lots(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_plate_number VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'car',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_type VARCHAR(20) NOT NULL CHECK (duration_type IN ('hourly', 'daily', 'monthly')),
    duration_hours INTEGER NOT NULL,
    hourly_rate DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    parking_fee DECIMAL(10, 2) NOT NULL,
    service_fee DECIMAL(10, 2) DEFAULT 0, -- لا توجد نسبة للتطبيق
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired')),
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    special_requests TEXT,
    qr_code_data TEXT, -- بيانات QR كود للدخول
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول مدفوعات المواقف
CREATE TABLE IF NOT EXISTS parking_payments (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT REFERENCES parking_reservations(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    payment_gateway_response JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تقييمات المواقف
CREATE TABLE IF NOT EXISTS parking_reviews (
    id BIGSERIAL PRIMARY KEY,
    parking_lot_id BIGINT REFERENCES parking_lots(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reservation_id BIGINT REFERENCES parking_reservations(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تتبع توفر المواقف (للتحديث الآني)
CREATE TABLE IF NOT EXISTS parking_availability_log (
    id BIGSERIAL PRIMARY KEY,
    parking_lot_id BIGINT REFERENCES parking_lots(id) ON DELETE CASCADE,
    available_spots INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(50) -- 'reservation', 'check_in', 'check_out', 'cancellation'
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_parking_lots_location ON parking_lots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_parking_lots_active ON parking_lots(is_active);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_customer ON parking_reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_parking_lot ON parking_reservations(parking_lot_id);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_status ON parking_reservations(status);
CREATE INDEX IF NOT EXISTS idx_parking_reservations_times ON parking_reservations(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_parking_reviews_parking_lot ON parking_reviews(parking_lot_id);

-- دالة لتوليد رقم الحجز التلقائي
CREATE OR REPLACE FUNCTION generate_parking_reservation_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'PKG-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(nextval('parking_reservations_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث رقم الحجز التلقائي
CREATE OR REPLACE FUNCTION set_parking_reservation_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reservation_number IS NULL OR NEW.reservation_number = '' THEN
        NEW.reservation_number = generate_parking_reservation_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغل لتوليد رقم الحجز
DROP TRIGGER IF EXISTS parking_reservation_number_trigger ON parking_reservations;
CREATE TRIGGER parking_reservation_number_trigger
    BEFORE INSERT ON parking_reservations
    FOR EACH ROW
    EXECUTE FUNCTION set_parking_reservation_number();

-- دالة لتحديث تاريخ التعديل
CREATE OR REPLACE FUNCTION update_parking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغلات لتحديث تاريخ التعديل
DROP TRIGGER IF EXISTS parking_lots_updated_at_trigger ON parking_lots;
CREATE TRIGGER parking_lots_updated_at_trigger
    BEFORE UPDATE ON parking_lots
    FOR EACH ROW
    EXECUTE FUNCTION update_parking_updated_at();

DROP TRIGGER IF EXISTS parking_reservations_updated_at_trigger ON parking_reservations;
CREATE TRIGGER parking_reservations_updated_at_trigger
    BEFORE UPDATE ON parking_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_parking_updated_at();

-- دالة لتحديث المواقف المتاحة عند الحجز
CREATE OR REPLACE FUNCTION update_parking_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        -- تقليل المواقف المتاحة عند التأكيد
        UPDATE parking_lots 
        SET available_spots = GREATEST(available_spots - 1, 0)
        WHERE id = NEW.parking_lot_id;
        
        -- تسجيل في سجل التوفر
        INSERT INTO parking_availability_log (parking_lot_id, available_spots, action)
        SELECT NEW.parking_lot_id, available_spots, 'reservation'
        FROM parking_lots WHERE id = NEW.parking_lot_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- عند تغيير حالة الحجز
        IF OLD.status != NEW.status THEN
            IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
                -- تأكيد الحجز
                UPDATE parking_lots 
                SET available_spots = GREATEST(available_spots - 1, 0)
                WHERE id = NEW.parking_lot_id;
                
                INSERT INTO parking_availability_log (parking_lot_id, available_spots, action)
                SELECT NEW.parking_lot_id, available_spots, 'reservation'
                FROM parking_lots WHERE id = NEW.parking_lot_id;
                
            ELSIF NEW.status IN ('cancelled', 'expired') AND OLD.status IN ('confirmed', 'active') THEN
                -- إلغاء أو انتهاء الحجز
                UPDATE parking_lots 
                SET available_spots = LEAST(available_spots + 1, total_spots)
                WHERE id = NEW.parking_lot_id;
                
                INSERT INTO parking_availability_log (parking_lot_id, available_spots, action)
                SELECT NEW.parking_lot_id, available_spots, 'cancellation'
                FROM parking_lots WHERE id = NEW.parking_lot_id;
                
            ELSIF NEW.status = 'completed' AND OLD.status = 'active' THEN
                -- إنهاء الحجز
                UPDATE parking_lots 
                SET available_spots = LEAST(available_spots + 1, total_spots)
                WHERE id = NEW.parking_lot_id;
                
                INSERT INTO parking_availability_log (parking_lot_id, available_spots, action)
                SELECT NEW.parking_lot_id, available_spots, 'check_out'
                FROM parking_lots WHERE id = NEW.parking_lot_id;
            END IF;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- مشغل لتحديث توفر المواقف
DROP TRIGGER IF EXISTS parking_availability_trigger ON parking_reservations;
CREATE TRIGGER parking_availability_trigger
    AFTER INSERT OR UPDATE ON parking_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_parking_availability();

-- دالة للحصول على متوسط التقييم
CREATE OR REPLACE FUNCTION get_parking_lot_rating(lot_id BIGINT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    avg_rating DECIMAL(3,2);
BEGIN
    SELECT ROUND(AVG(rating), 2) INTO avg_rating
    FROM parking_reviews
    WHERE parking_lot_id = lot_id;
    
    RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;

-- عرض شامل للمواقف مع التقييمات
CREATE OR REPLACE VIEW parking_lots_with_ratings AS
SELECT 
    pl.*,
    get_parking_lot_rating(pl.id) as average_rating,
    (SELECT COUNT(*) FROM parking_reviews WHERE parking_lot_id = pl.id) as total_reviews
FROM parking_lots pl
WHERE pl.is_active = true;

-- عرض شامل للحجوزات مع تفاصيل المواقف والعملاء
CREATE OR REPLACE VIEW parking_reservations_detailed AS
SELECT 
    pr.*,
    pl.name as parking_lot_name,
    pl.location as parking_lot_location,
    pl.contact_phone as parking_lot_phone,
    p.full_name as customer_name,
    p.phone as customer_phone,
    pp.status as payment_status,
    pp.paid_at as payment_date
FROM parking_reservations pr
LEFT JOIN parking_lots pl ON pr.parking_lot_id = pl.id
LEFT JOIN profiles p ON pr.customer_id = p.id
LEFT JOIN parking_payments pp ON pr.id = pp.reservation_id;

-- سياسات الأمان (RLS)
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_reviews ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة المواقف (جميع المستخدمين يمكنهم القراءة)
CREATE POLICY "Anyone can view active parking lots" ON parking_lots
    FOR SELECT USING (is_active = true);

-- سياسة إدارة المواقف (أصحاب المواقف فقط)
CREATE POLICY "Parking lot owners can manage their lots" ON parking_lots
    FOR ALL USING (auth.uid()::text = contact_email OR auth.role() = 'parking_admin');

-- سياسة حجوزات المواقف (العملاء يمكنهم رؤية حجوزاتهم فقط)
CREATE POLICY "Users can view their own reservations" ON parking_reservations
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own reservations" ON parking_reservations
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own reservations" ON parking_reservations
    FOR UPDATE USING (auth.uid() = customer_id);

-- سياسة المدفوعات (العملاء يمكنهم رؤية مدفوعاتهم فقط)
CREATE POLICY "Users can view their own payments" ON parking_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parking_reservations 
            WHERE id = parking_payments.reservation_id 
            AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Users can create payments for their reservations" ON parking_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM parking_reservations 
            WHERE id = parking_payments.reservation_id 
            AND customer_id = auth.uid()
        )
    );

-- سياسة التقييمات
CREATE POLICY "Users can view all reviews" ON parking_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their reservations" ON parking_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id AND
        EXISTS (
            SELECT 1 FROM parking_reservations 
            WHERE id = parking_reviews.reservation_id 
            AND customer_id = auth.uid()
            AND status = 'completed'
        )
    );

CREATE POLICY "Users can update their own reviews" ON parking_reviews
    FOR UPDATE USING (auth.uid() = customer_id);

-- إدراج بيانات تجريبية للمواقف
INSERT INTO parking_lots (
    name, description, location, latitude, longitude, 
    total_spots, available_spots, price_per_hour, price_per_day, price_per_month,
    image_url, features, contact_phone, contact_email,
    is_covered, has_security, has_valet, has_ev_charging, has_car_wash
) VALUES 
(
    'موقف مركز المدينة',
    'موقف مغطى في وسط المدينة مع خدمة أمان على مدار 24 ساعة',
    'وسط المدينة، دبي',
    25.2048, 55.2708,
    200, 45, 10.00, 200.00, 5000.00,
    'https://images.pexels.com/photos/1004403/pexels-photo-1004403.jpeg',
    '["مغطى", "أمان", "خدمة صف السيارات"]'::jsonb,
    '+971501234567', 'info@citycenterparking.com',
    true, true, true, false, false
),
(
    'موقف مجمع التسوق',
    'موقف واسع مع محطات شحن للسيارات الكهربائية',
    'منطقة التسوق، دبي',
    25.2298, 55.2844,
    500, 120, 8.00, 150.00, 3500.00,
    'https://images.pexels.com/photos/1756957/pexels-photo-1756957.jpeg',
    '["مغطى", "أمان", "شحن السيارات الكهربائية"]'::jsonb,
    '+971502345678', 'parking@mallcomplex.com',
    true, true, false, true, false
),
(
    'موقف مركز الأعمال',
    'موقف مخصص لرجال الأعمال مع خدمة غسيل السيارات',
    'الخليج التجاري، دبي',
    25.1972, 55.2744,
    150, 75, 12.00, 250.00, 6000.00,
    'https://images.pexels.com/photos/2996106/pexels-photo-2996106.jpeg',
    '["مغطى", "أمان", "غسيل السيارات"]'::jsonb,
    '+971503456789', 'contact@businesshubparking.com',
    true, true, false, false, true
),
(
    'موقف مطار دبي الدولي',
    'موقف مطار بخدمات متكاملة للمسافرين',
    'مطار دبي الدولي',
    25.2532, 55.3657,
    1000, 300, 15.00, 300.00, 7500.00,
    'https://images.pexels.com/photos/2113566/pexels-photo-2113566.jpeg',
    '["مغطى", "أمان", "خدمة صف السيارات", "شحن السيارات الكهربائية"]'::jsonb,
    '+971504567890', 'parking@dubaiairport.com',
    true, true, true, true, false
);

-- تحديث تسلسل أرقام الحجوزات
SELECT setval('parking_reservations_id_seq', 1000, false);

COMMENT ON TABLE parking_lots IS 'جدول المواقف المتاحة للحجز';
COMMENT ON TABLE parking_reservations IS 'جدول حجوزات المواقف';
COMMENT ON TABLE parking_payments IS 'جدول مدفوعات حجز المواقف';
COMMENT ON TABLE parking_reviews IS 'جدول تقييمات المواقف';
COMMENT ON TABLE parking_availability_log IS 'سجل تتبع توفر المواقف';
