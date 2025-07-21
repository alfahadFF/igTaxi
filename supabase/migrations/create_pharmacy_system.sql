-- نظام الصيدليات
-- تاريخ الإنشاء: 2025-07-20

-- جدول الصيدليات
CREATE TABLE IF NOT EXISTS pharmacies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(500) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url TEXT,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255),
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    license_number VARCHAR(100),
    operating_hours JSONB DEFAULT '{"start": "08:00", "end": "22:00"}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_24_hours BOOLEAN DEFAULT false,
    accepts_insurance BOOLEAN DEFAULT false,
    delivery_available BOOLEAN DEFAULT true,
    delivery_fee DECIMAL(10, 2) DEFAULT 10.00,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول طلبات الوصفات
CREATE TABLE IF NOT EXISTS prescription_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    pharmacy_id BIGINT REFERENCES pharmacies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    prescription_image_url TEXT NOT NULL,
    customer_notes TEXT,
    delivery_address VARCHAR(500) NOT NULL,
    delivery_phone VARCHAR(20),
    patient_name VARCHAR(255),
    patient_age INTEGER,
    patient_gender VARCHAR(10),
    urgent_order BOOLEAN DEFAULT false,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'quoted', 'approved', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled', 'rejected')),
    pharmacist_notes TEXT,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    estimated_preparation_time INTEGER, -- بالدقائق
    quoted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    prepared_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول عناصر الوصفة (الأدوية المطلوبة والمتوفرة)
CREATE TABLE IF NOT EXISTS prescription_items (
    id BIGSERIAL PRIMARY KEY,
    prescription_order_id BIGINT REFERENCES prescription_orders(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'قطعة',
    is_available BOOLEAN DEFAULT false,
    price_per_unit DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) DEFAULT 0,
    alternative_medication VARCHAR(255),
    alternative_price DECIMAL(10, 2),
    pharmacist_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول البدائل المقترحة
CREATE TABLE IF NOT EXISTS medication_alternatives (
    id BIGSERIAL PRIMARY KEY,
    prescription_item_id BIGINT REFERENCES prescription_items(id) ON DELETE CASCADE,
    alternative_name VARCHAR(255) NOT NULL,
    alternative_dosage VARCHAR(100),
    price_per_unit DECIMAL(10, 2) NOT NULL,
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'limited', 'out_of_stock')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول توصيل الصيدليات
CREATE TABLE IF NOT EXISTS pharmacy_delivery_requests (
    id BIGSERIAL PRIMARY KEY,
    prescription_order_id BIGINT REFERENCES prescription_orders(id) ON DELETE CASCADE,
    pharmacy_id BIGINT REFERENCES pharmacies(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    pickup_address VARCHAR(500) NOT NULL,
    delivery_address VARCHAR(500) NOT NULL,
    delivery_contact_phone VARCHAR(20),
    distance_km DECIMAL(8, 2),
    estimated_time INTEGER, -- بالدقائق
    delivery_fee DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'delivered', 'cancelled')),
    assigned_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    driver_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول مدفوعات الصيدليات
CREATE TABLE IF NOT EXISTS pharmacy_payments (
    id BIGSERIAL PRIMARY KEY,
    prescription_order_id BIGINT REFERENCES prescription_orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(255),
    payment_gateway_response JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول تقييمات الصيدليات
CREATE TABLE IF NOT EXISTS pharmacy_reviews (
    id BIGSERIAL PRIMARY KEY,
    pharmacy_id BIGINT REFERENCES pharmacies(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    prescription_order_id BIGINT REFERENCES prescription_orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- جدول رسائل التواصل بين العميل والصيدلي
CREATE TABLE IF NOT EXISTS prescription_messages (
    id BIGSERIAL PRIMARY KEY,
    prescription_order_id BIGINT REFERENCES prescription_orders(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'pharmacist')),
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice')),
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pharmacies_location ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_pharmacies_active ON pharmacies(is_active);
CREATE INDEX IF NOT EXISTS idx_pharmacies_owner ON pharmacies(owner_id);
CREATE INDEX IF NOT EXISTS idx_prescription_orders_pharmacy ON prescription_orders(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_prescription_orders_customer ON prescription_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescription_orders_status ON prescription_orders(status);
CREATE INDEX IF NOT EXISTS idx_prescription_items_order ON prescription_items(prescription_order_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_delivery_driver ON pharmacy_delivery_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_delivery_status ON pharmacy_delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_prescription_messages_order ON prescription_messages(prescription_order_id);

-- دالة لتوليد رقم الطلب التلقائي
CREATE OR REPLACE FUNCTION generate_prescription_order_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'RX-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(nextval('prescription_orders_id_seq')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث رقم الطلب التلقائي
CREATE OR REPLACE FUNCTION set_prescription_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number = generate_prescription_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغل لتوليد رقم الطلب
DROP TRIGGER IF EXISTS prescription_order_number_trigger ON prescription_orders;
CREATE TRIGGER prescription_order_number_trigger
    BEFORE INSERT ON prescription_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_prescription_order_number();

-- دالة لتحديث تاريخ التعديل
CREATE OR REPLACE FUNCTION update_pharmacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغلات لتحديث تاريخ التعديل
DROP TRIGGER IF EXISTS pharmacies_updated_at_trigger ON pharmacies;
CREATE TRIGGER pharmacies_updated_at_trigger
    BEFORE UPDATE ON pharmacies
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_updated_at();

DROP TRIGGER IF EXISTS prescription_orders_updated_at_trigger ON prescription_orders;
CREATE TRIGGER prescription_orders_updated_at_trigger
    BEFORE UPDATE ON prescription_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_updated_at();

DROP TRIGGER IF EXISTS pharmacy_delivery_updated_at_trigger ON pharmacy_delivery_requests;
CREATE TRIGGER pharmacy_delivery_updated_at_trigger
    BEFORE UPDATE ON pharmacy_delivery_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_updated_at();

-- دالة لحساب المجموع الإجمالي للطلب
CREATE OR REPLACE FUNCTION calculate_prescription_total()
RETURNS TRIGGER AS $$
DECLARE
    total_items_amount DECIMAL(10, 2);
    delivery_fee_amount DECIMAL(10, 2);
BEGIN
    -- حساب مجموع عناصر الطلب
    SELECT COALESCE(SUM(total_price), 0) INTO total_items_amount
    FROM prescription_items
    WHERE prescription_order_id = NEW.prescription_order_id;
    
    -- الحصول على رسوم التوصيل
    SELECT COALESCE(delivery_fee, 0) INTO delivery_fee_amount
    FROM prescription_orders
    WHERE id = NEW.prescription_order_id;
    
    -- تحديث المجموع الإجمالي
    UPDATE prescription_orders
    SET total_amount = total_items_amount + delivery_fee_amount
    WHERE id = NEW.prescription_order_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغل لحساب المجموع عند تغيير العناصر
DROP TRIGGER IF EXISTS prescription_items_total_trigger ON prescription_items;
CREATE TRIGGER prescription_items_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON prescription_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_prescription_total();

-- دالة لتحديث تقييم الصيدلية
CREATE OR REPLACE FUNCTION update_pharmacy_rating()
RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    -- حساب المتوسط الجديد
    SELECT 
        ROUND(AVG(rating), 2),
        COUNT(*)
    INTO avg_rating, review_count
    FROM pharmacy_reviews
    WHERE pharmacy_id = NEW.pharmacy_id;
    
    -- تحديث تقييم الصيدلية
    UPDATE pharmacies
    SET 
        rating = COALESCE(avg_rating, 0),
        total_reviews = review_count
    WHERE id = NEW.pharmacy_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- مشغل لتحديث التقييم
DROP TRIGGER IF EXISTS pharmacy_rating_trigger ON pharmacy_reviews;
CREATE TRIGGER pharmacy_rating_trigger
    AFTER INSERT OR UPDATE ON pharmacy_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_rating();

-- عرض شامل للصيدليات مع التقييمات
CREATE OR REPLACE VIEW pharmacies_with_details AS
SELECT 
    p.*,
    pr.full_name as owner_name,
    pr.phone as owner_phone
FROM pharmacies p
LEFT JOIN profiles pr ON p.owner_id = pr.id
WHERE p.is_active = true;

-- عرض شامل للطلبات مع تفاصيل الصيدلية والعميل
CREATE OR REPLACE VIEW prescription_orders_detailed AS
SELECT 
    po.*,
    p.name as pharmacy_name,
    p.location as pharmacy_location,
    p.contact_phone as pharmacy_phone,
    c.full_name as customer_name,
    c.phone as customer_phone,
    pp.status as payment_status,
    pp.paid_at as payment_date,
    COUNT(pi.id) as total_items,
    COUNT(CASE WHEN pi.is_available = true THEN 1 END) as available_items
FROM prescription_orders po
LEFT JOIN pharmacies p ON po.pharmacy_id = p.id
LEFT JOIN profiles c ON po.customer_id = c.id
LEFT JOIN pharmacy_payments pp ON po.id = pp.prescription_order_id
LEFT JOIN prescription_items pi ON po.id = pi.prescription_order_id
GROUP BY po.id, p.name, p.location, p.contact_phone, c.full_name, c.phone, pp.status, pp.paid_at;

-- سياسات الأمان (RLS)
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_messages ENABLE ROW LEVEL SECURITY;

-- سياسة قراءة الصيدليات (جميع المستخدمين يمكنهم القراءة)
CREATE POLICY "Anyone can view active pharmacies" ON pharmacies
    FOR SELECT USING (is_active = true);

-- سياسة إدارة الصيدليات (أصحاب الصيدليات فقط)
CREATE POLICY "Pharmacy owners can manage their pharmacies" ON pharmacies
    FOR ALL USING (auth.uid() = owner_id);

-- سياسة طلبات الوصفات
CREATE POLICY "Users can view their own prescription orders" ON prescription_orders
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        EXISTS (SELECT 1 FROM pharmacies WHERE id = prescription_orders.pharmacy_id AND owner_id = auth.uid())
    );

CREATE POLICY "Users can create prescription orders" ON prescription_orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Pharmacy owners can update orders for their pharmacy" ON prescription_orders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM pharmacies WHERE id = prescription_orders.pharmacy_id AND owner_id = auth.uid())
        OR auth.uid() = customer_id
    );

-- سياسة عناصر الوصفة
CREATE POLICY "Users can view prescription items for their orders" ON prescription_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prescription_orders 
            WHERE id = prescription_items.prescription_order_id 
            AND (customer_id = auth.uid() OR pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Pharmacy owners can manage prescription items" ON prescription_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prescription_orders po
            JOIN pharmacies p ON po.pharmacy_id = p.id
            WHERE po.id = prescription_items.prescription_order_id 
            AND p.owner_id = auth.uid()
        )
    );

-- سياسة البدائل
CREATE POLICY "Users can view alternatives for accessible prescription items" ON medication_alternatives
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prescription_items pi
            JOIN prescription_orders po ON pi.prescription_order_id = po.id
            WHERE pi.id = medication_alternatives.prescription_item_id
            AND (po.customer_id = auth.uid() OR po.pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Pharmacy owners can manage alternatives" ON medication_alternatives
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prescription_items pi
            JOIN prescription_orders po ON pi.prescription_order_id = po.id
            JOIN pharmacies p ON po.pharmacy_id = p.id
            WHERE pi.id = medication_alternatives.prescription_item_id
            AND p.owner_id = auth.uid()
        )
    );

-- سياسة طلبات التوصيل
CREATE POLICY "Drivers can view delivery requests" ON pharmacy_delivery_requests
    FOR SELECT USING (true); -- السائقون يمكنهم رؤية جميع الطلبات المتاحة

CREATE POLICY "Pharmacy owners can manage delivery requests" ON pharmacy_delivery_requests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM pharmacies WHERE id = pharmacy_delivery_requests.pharmacy_id AND owner_id = auth.uid())
        OR auth.uid() = driver_id
    );

-- سياسة المدفوعات
CREATE POLICY "Users can view their own payments" ON pharmacy_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prescription_orders 
            WHERE id = pharmacy_payments.prescription_order_id 
            AND customer_id = auth.uid()
        )
    );

-- سياسة التقييمات
CREATE POLICY "Users can view all reviews" ON pharmacy_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for their orders" ON pharmacy_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id AND
        EXISTS (
            SELECT 1 FROM prescription_orders 
            WHERE id = pharmacy_reviews.prescription_order_id 
            AND customer_id = auth.uid()
            AND status = 'delivered'
        )
    );

-- سياسة الرسائل
CREATE POLICY "Users can view messages for their orders" ON prescription_messages
    FOR SELECT USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM prescription_orders 
            WHERE id = prescription_messages.prescription_order_id 
            AND (customer_id = auth.uid() OR pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can send messages for their orders" ON prescription_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM prescription_orders 
            WHERE id = prescription_messages.prescription_order_id 
            AND (customer_id = auth.uid() OR pharmacy_id IN (
                SELECT id FROM pharmacies WHERE owner_id = auth.uid()
            ))
        )
    );

-- إدراج بيانات تجريبية للصيدليات
INSERT INTO pharmacies (
    name, description, location, latitude, longitude, 
    contact_phone, contact_email, license_number,
    is_24_hours, accepts_insurance, delivery_fee, min_order_amount,
    image_url
) VALUES 
(
    'صيدلية النهدي',
    'صيدلية متكاملة تقدم جميع أنواع الأدوية والمنتجات الصحية',
    'شارع الشيخ زايد، دبي',
    25.2048, 55.2708,
    '+971501234567', 'info@nahdi.com', 'PH-2024-001',
    false, true, 15.00, 50.00,
    'https://images.pexels.com/photos/305568/pexels-photo-305568.jpeg'
),
(
    'صيدلية الدواء',
    'صيدلية حديثة مع خدمة 24 ساعة',
    'شارع الوصل، دبي',
    25.2298, 55.2844,
    '+971502345678', 'contact@aldawaa.com', 'PH-2024-002',
    true, true, 12.00, 30.00,
    'https://images.pexels.com/photos/356054/pexels-photo-356054.jpeg'
),
(
    'صيدلية الصحة',
    'صيدلية متخصصة في الأدوية المزمنة',
    'منطقة الخليج التجاري، دبي',
    25.1972, 55.2744,
    '+971503456789', 'orders@alsaha.com', 'PH-2024-003',
    false, false, 10.00, 25.00,
    'https://images.pexels.com/photos/263337/pexels-photo-263337.jpeg'
);

-- تحديث تسلسل أرقام الطلبات
SELECT setval('prescription_orders_id_seq', 1000, false);

COMMENT ON TABLE pharmacies IS 'جدول الصيدليات المسجلة في التطبيق';
COMMENT ON TABLE prescription_orders IS 'جدول طلبات الوصفات الطبية';
COMMENT ON TABLE prescription_items IS 'جدول عناصر الوصفة (الأدوية)';
COMMENT ON TABLE medication_alternatives IS 'جدول البدائل المقترحة للأدوية';
COMMENT ON TABLE pharmacy_delivery_requests IS 'جدول طلبات توصيل الصيدليات';
COMMENT ON TABLE pharmacy_payments IS 'جدول مدفوعات طلبات الصيدليات';
COMMENT ON TABLE pharmacy_reviews IS 'جدول تقييمات الصيدليات';
COMMENT ON TABLE prescription_messages IS 'جدول رسائل التواصل بين العميل والصيدلي';
