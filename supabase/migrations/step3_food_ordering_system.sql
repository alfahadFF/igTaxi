-- إضافة نظام قوائم الطعام والطلبات للمنشآت
-- يجب تشغيل هذا بعد step2_indexes_policies.sql

-- ==============================================
-- جداول قوائم الطعام والمشروبات
-- ==============================================

-- جدول فئات القوائم (مقبلات، أطباق رئيسية، مشروبات، إلخ)
CREATE TABLE IF NOT EXISTS menu_categories (
    id SERIAL PRIMARY KEY,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول عناصر القائمة
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    preparation_time INTEGER DEFAULT 15, -- بالدقائق
    is_available BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    ingredients TEXT[],
    allergens TEXT[],
    nutritional_info JSONB,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول خيارات التخصيص للعناصر (حجم، إضافات، إلخ)
CREATE TABLE IF NOT EXISTS menu_item_options (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    type VARCHAR(50) DEFAULT 'single', -- single, multiple
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول قيم خيارات التخصيص
CREATE TABLE IF NOT EXISTS menu_item_option_values (
    id SERIAL PRIMARY KEY,
    option_id INTEGER REFERENCES menu_item_options(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    value_ar VARCHAR(100),
    additional_price DECIMAL(10, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- جداول نظام الطلبات
-- ==============================================

-- جدول الطلبات الرئيسي
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- تفاصيل الطلب
    order_type VARCHAR(50) DEFAULT 'menu', -- menu, custom_text
    custom_order_text TEXT, -- للطلبات النصية
    special_instructions TEXT,
    
    -- العناوين
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    
    -- الأسعار
    subtotal DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- حالة الطلب
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, ready, picked_up, delivered, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_method VARCHAR(50),
    
    -- أوقات مهمة
    estimated_preparation_time INTEGER, -- بالدقائق
    estimated_delivery_time TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    prepared_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول عناصر الطلب (للطلبات من القائمة)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
    
    -- تفاصيل العنصر وقت الطلب
    item_name VARCHAR(200) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    special_instructions TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول خيارات عناصر الطلب المختارة
CREATE TABLE IF NOT EXISTS order_item_selected_options (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER REFERENCES order_items(id) ON DELETE CASCADE,
    option_name VARCHAR(100) NOT NULL,
    option_value VARCHAR(100) NOT NULL,
    additional_price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تتبع حالة الطلبات
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تقييمات الطلبات
CREATE TABLE IF NOT EXISTS order_ratings (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_rating INTEGER CHECK (business_rating >= 1 AND business_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    food_quality_rating INTEGER CHECK (food_quality_rating >= 1 AND food_quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    business_comment TEXT,
    driver_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- جداول إدارة التوصيل
-- ==============================================

-- جدول طلبات التوصيل المتاحة للسائقين
CREATE TABLE IF NOT EXISTS delivery_requests (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- تفاصيل التوصيل
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    
    estimated_distance DECIMAL(8, 2), -- بالكيلومتر
    estimated_duration INTEGER, -- بالدقائق
    delivery_fee DECIMAL(10, 2) NOT NULL,
    
    -- حالة الطلب
    status VARCHAR(50) DEFAULT 'available', -- available, assigned, completed, cancelled
    assigned_driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول استجابات السائقين لطلبات التوصيل
CREATE TABLE IF NOT EXISTS driver_delivery_responses (
    id SERIAL PRIMARY KEY,
    delivery_request_id INTEGER REFERENCES delivery_requests(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    response VARCHAR(50) NOT NULL, -- accepted, declined
    response_time TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(delivery_request_id, driver_id)
);

-- ==============================================
-- إنشاء الفهارس
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_menu_categories_business_id ON menu_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_active ON menu_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_menu_items_business_id ON menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_popular ON menu_items(is_popular);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_business_id ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_business_id ON delivery_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_location ON delivery_requests(pickup_latitude, pickup_longitude);

-- ==============================================
-- إنشاء التريغرز
-- ==============================================

-- تريغر تحديث updated_at
CREATE TRIGGER update_menu_categories_updated_at 
    BEFORE UPDATE ON menu_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at 
    BEFORE UPDATE ON menu_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_requests_updated_at 
    BEFORE UPDATE ON delivery_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تريغر إنشاء رقم الطلب التلقائي
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- تريغر إضافة تتبع حالة الطلب
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, notes)
        VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION track_order_status_change();

-- ==============================================
-- تفعيل Row Level Security
-- ==============================================

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_selected_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_delivery_responses ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- إنشاء السياسات الأمنية
-- ==============================================

-- سياسات قوائم الطعام
CREATE POLICY "Business owners can manage their menu categories" ON menu_categories
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Everyone can view active menu categories" ON menu_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Business owners can manage their menu items" ON menu_items
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Everyone can view available menu items" ON menu_items
    FOR SELECT USING (is_available = true);

-- سياسات الطلبات
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = business_id OR auth.uid() = driver_id);

CREATE POLICY "Customers can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Business and drivers can update order status" ON orders
    FOR UPDATE USING (auth.uid() = business_id OR auth.uid() = driver_id);

-- سياسات طلبات التوصيل
CREATE POLICY "Drivers can view available delivery requests" ON delivery_requests
    FOR SELECT USING (status = 'available' OR assigned_driver_id = auth.uid());

CREATE POLICY "Businesses can create delivery requests" ON delivery_requests
    FOR INSERT WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Drivers can respond to delivery requests" ON driver_delivery_responses
    FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- ==============================================
-- إنشاء Views مفيدة
-- ==============================================

-- عرض القوائم مع العناصر
CREATE OR REPLACE VIEW business_menu_view AS
SELECT 
    mc.business_id,
    mc.id as category_id,
    mc.name as category_name,
    mc.display_order as category_order,
    mi.id as item_id,
    mi.name as item_name,
    mi.description,
    mi.price,
    mi.image_url,
    mi.preparation_time,
    mi.is_available,
    mi.is_popular,
    mi.display_order as item_order
FROM menu_categories mc
LEFT JOIN menu_items mi ON mc.id = mi.category_id
WHERE mc.is_active = true
ORDER BY mc.display_order, mi.display_order;

-- عرض الطلبات مع التفاصيل
CREATE OR REPLACE VIEW order_details_view AS
SELECT 
    o.id,
    o.order_number,
    o.customer_id,
    o.business_id,
    o.driver_id,
    o.order_type,
    o.status,
    o.total_amount,
    o.delivery_address,
    o.created_at,
    o.estimated_delivery_time,
    bp.business_name,
    cp.full_name as customer_name,
    dp.full_name as driver_name
FROM orders o
LEFT JOIN business_profiles bp ON o.business_id = bp.id
LEFT JOIN profiles cp ON o.customer_id = cp.id
LEFT JOIN profiles dp ON o.driver_id = dp.id;

-- منح الصلاحيات للـ views
GRANT SELECT ON business_menu_view TO authenticated;
GRANT SELECT ON order_details_view TO authenticated;

-- ==============================================
-- إضافة القيود
-- ==============================================

DO $$
BEGIN
    -- قيود التحقق من صحة البيانات
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_order_status_valid') THEN
        ALTER TABLE orders ADD CONSTRAINT check_order_status_valid 
            CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_payment_status_valid') THEN
        ALTER TABLE orders ADD CONSTRAINT check_payment_status_valid 
            CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_order_type_valid') THEN
        ALTER TABLE orders ADD CONSTRAINT check_order_type_valid 
            CHECK (order_type IN ('menu', 'custom_text'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_positive_amounts') THEN
        ALTER TABLE orders ADD CONSTRAINT check_positive_amounts 
            CHECK (total_amount >= 0 AND subtotal >= 0 AND delivery_fee >= 0);
    END IF;
END $$;

-- ==============================================
-- نظام العروض التجارية والتسوق
-- ==============================================

-- جدول فئات العروض التجارية
CREATE TABLE IF NOT EXISTS offer_categories (
    id SERIAL PRIMARY KEY,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    icon_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول العروض والمنتجات التجارية
CREATE TABLE IF NOT EXISTS business_offers (
    id SERIAL PRIMARY KEY,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES offer_categories(id) ON DELETE SET NULL,
    
    -- تفاصيل العرض
    title VARCHAR(200) NOT NULL,
    title_ar VARCHAR(200),
    description TEXT,
    description_ar TEXT,
    
    -- معلومات السعر
    original_price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2) NOT NULL,
    discount_percentage INTEGER DEFAULT 0,
    
    -- تفاصيل إضافية
    image_urls TEXT[],
    tags TEXT[],
    
    -- حالة العرض
    stock_quantity INTEGER DEFAULT NULL, -- NULL = غير محدود
    min_order_quantity INTEGER DEFAULT 1,
    max_order_quantity INTEGER DEFAULT NULL,
    
    -- صلاحية العرض
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ,
    
    -- ترتيب العرض
    display_order INTEGER DEFAULT 0,
    
    -- معلومات إضافية
    brand VARCHAR(100),
    model VARCHAR(100),
    specifications JSONB,
    warranty_info TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبات التسوق
CREATE TABLE IF NOT EXISTS shopping_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- نوع الطلب
    order_type VARCHAR(50) DEFAULT 'offers', -- offers, custom_text
    custom_order_text TEXT, -- للطلبات النصية المخصصة
    special_instructions TEXT,
    
    -- عنوان التوصيل
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_phone VARCHAR(20),
    
    -- تفاصيل الأسعار
    subtotal DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    service_fee DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- حالة الطلب
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, ready, shipped, delivered, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
    payment_method VARCHAR(50),
    
    -- أوقات مهمة
    estimated_processing_time INTEGER, -- بالساعات
    estimated_delivery_time TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول عناصر طلبات التسوق
CREATE TABLE IF NOT EXISTS shopping_order_items (
    id SERIAL PRIMARY KEY,
    shopping_order_id INTEGER REFERENCES shopping_orders(id) ON DELETE CASCADE,
    offer_id INTEGER REFERENCES business_offers(id) ON DELETE SET NULL,
    
    -- تفاصيل العنصر وقت الطلب
    item_title VARCHAR(200) NOT NULL,
    item_description TEXT,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    item_specifications JSONB,
    special_requests TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول طلبات التوصيل للتسوق
CREATE TABLE IF NOT EXISTS shopping_delivery_requests (
    id SERIAL PRIMARY KEY,
    shopping_order_id INTEGER UNIQUE REFERENCES shopping_orders(id) ON DELETE CASCADE,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- تفاصيل الاستلام
    pickup_address TEXT NOT NULL,
    pickup_latitude DECIMAL(10, 8),
    pickup_longitude DECIMAL(11, 8),
    pickup_contact_phone VARCHAR(20),
    
    -- تفاصيل التوصيل
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_contact_phone VARCHAR(20),
    
    -- معلومات المسافة والوقت
    distance_km DECIMAL(8, 2),
    estimated_time INTEGER, -- بالدقائق
    delivery_fee DECIMAL(10, 2) NOT NULL,
    
    -- حالة التوصيل
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, picked_up, delivered, cancelled
    special_delivery_instructions TEXT,
    
    -- أوقات التوصيل
    accepted_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تتبع حالة طلبات التسوق
CREATE TABLE IF NOT EXISTS shopping_order_status_history (
    id SERIAL PRIMARY KEY,
    shopping_order_id INTEGER REFERENCES shopping_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول تقييمات طلبات التسوق
CREATE TABLE IF NOT EXISTS shopping_order_ratings (
    id SERIAL PRIMARY KEY,
    shopping_order_id INTEGER REFERENCES shopping_orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_rating INTEGER CHECK (business_rating >= 1 AND business_rating <= 5),
    driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
    product_quality_rating INTEGER CHECK (product_quality_rating >= 1 AND product_quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    business_comment TEXT,
    driver_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول قسائم الخصم للعروض
CREATE TABLE IF NOT EXISTS offer_coupons (
    id SERIAL PRIMARY KEY,
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- نوع الخصم
    discount_type VARCHAR(20) DEFAULT 'percentage', -- percentage, fixed_amount
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount_amount DECIMAL(10, 2),
    
    -- شروط الاستخدام
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_usage_count INTEGER DEFAULT NULL, -- NULL = غير محدود
    current_usage_count INTEGER DEFAULT 0,
    usage_per_customer INTEGER DEFAULT 1,
    
    -- صلاحية القسيمة
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- جدول استخدام قسائم الخصم
CREATE TABLE IF NOT EXISTS coupon_usage_history (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER REFERENCES offer_coupons(id) ON DELETE CASCADE,
    shopping_order_id INTEGER REFERENCES shopping_orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- إنشاء فهارس للعروض التجارية
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_offer_categories_business_id ON offer_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_categories_active ON offer_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_business_offers_business_id ON business_offers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_offers_category_id ON business_offers(category_id);
CREATE INDEX IF NOT EXISTS idx_business_offers_available ON business_offers(is_available);
CREATE INDEX IF NOT EXISTS idx_business_offers_featured ON business_offers(is_featured);
CREATE INDEX IF NOT EXISTS idx_business_offers_valid_period ON business_offers(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_shopping_orders_customer_id ON shopping_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_business_id ON shopping_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_status ON shopping_orders(status);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_created_at ON shopping_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_number ON shopping_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_shopping_delivery_requests_status ON shopping_delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_shopping_delivery_requests_driver_id ON shopping_delivery_requests(driver_id);

CREATE INDEX IF NOT EXISTS idx_offer_coupons_code ON offer_coupons(code);
CREATE INDEX IF NOT EXISTS idx_offer_coupons_business_id ON offer_coupons(business_id);
CREATE INDEX IF NOT EXISTS idx_offer_coupons_active ON offer_coupons(is_active);

-- ==============================================
-- إنشاء تريغرز للعروض التجارية
-- ==============================================

-- تريغر تحديث updated_at
CREATE TRIGGER update_offer_categories_updated_at 
    BEFORE UPDATE ON offer_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_offers_updated_at 
    BEFORE UPDATE ON business_offers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_orders_updated_at 
    BEFORE UPDATE ON shopping_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_delivery_requests_updated_at 
    BEFORE UPDATE ON shopping_delivery_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offer_coupons_updated_at 
    BEFORE UPDATE ON offer_coupons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- تريغر إنشاء رقم طلب التسوق التلقائي
CREATE OR REPLACE FUNCTION generate_shopping_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'SHOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.id::text, 6, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_shopping_order_number_trigger
    BEFORE INSERT ON shopping_orders
    FOR EACH ROW EXECUTE FUNCTION generate_shopping_order_number();

-- تريغر تتبع حالة طلبات التسوق
CREATE OR REPLACE FUNCTION track_shopping_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO shopping_order_status_history (shopping_order_id, status, notes)
        VALUES (NEW.id, NEW.status, 'Status changed to ' || NEW.status);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER track_shopping_order_status_change_trigger
    AFTER UPDATE ON shopping_orders
    FOR EACH ROW EXECUTE FUNCTION track_shopping_order_status_change();

-- تريغر تحديث المخزون عند الطلب
CREATE OR REPLACE FUNCTION update_offer_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- تقليل المخزون عند إضافة عنصر للطلب
    IF TG_OP = 'INSERT' THEN
        UPDATE business_offers 
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.offer_id AND stock_quantity IS NOT NULL;
        RETURN NEW;
    END IF;
    
    -- إعادة المخزون عند حذف عنصر من الطلب
    IF TG_OP = 'DELETE' THEN
        UPDATE business_offers 
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.offer_id AND stock_quantity IS NOT NULL;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_offer_stock_trigger
    AFTER INSERT OR DELETE ON shopping_order_items
    FOR EACH ROW EXECUTE FUNCTION update_offer_stock();

-- ==============================================
-- تفعيل Row Level Security للعروض
-- ==============================================

ALTER TABLE offer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_delivery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_order_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage_history ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- إنشاء السياسات الأمنية للعروض
-- ==============================================

-- سياسات فئات العروض
CREATE POLICY "Business owners can manage their offer categories" ON offer_categories
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Everyone can view active offer categories" ON offer_categories
    FOR SELECT USING (is_active = true);

-- سياسات العروض التجارية
CREATE POLICY "Business owners can manage their offers" ON business_offers
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Everyone can view available offers" ON business_offers
    FOR SELECT USING (is_available = true AND (valid_until IS NULL OR valid_until > now()));

-- سياسات طلبات التسوق
CREATE POLICY "Users can view their own shopping orders" ON shopping_orders
    FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = business_id);

CREATE POLICY "Customers can create shopping orders" ON shopping_orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Business owners can update their orders" ON shopping_orders
    FOR UPDATE USING (auth.uid() = business_id);

-- سياسات عناصر طلبات التسوق
CREATE POLICY "Order participants can view order items" ON shopping_order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shopping_orders so 
            WHERE so.id = shopping_order_id 
            AND (so.customer_id = auth.uid() OR so.business_id = auth.uid())
        )
    );

-- سياسات طلبات التوصيل
CREATE POLICY "Drivers can view available shopping delivery requests" ON shopping_delivery_requests
    FOR SELECT USING (status = 'pending' OR driver_id = auth.uid());

CREATE POLICY "Business owners can create delivery requests" ON shopping_delivery_requests
    FOR INSERT WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Drivers can update delivery status" ON shopping_delivery_requests
    FOR UPDATE USING (auth.uid() = driver_id);

-- سياسات قسائم الخصم
CREATE POLICY "Business owners can manage their coupons" ON offer_coupons
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Everyone can view active coupons" ON offer_coupons
    FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- ==============================================
-- إنشاء Views للعروض التجارية
-- ==============================================

-- عرض العروض مع الفئات
CREATE OR REPLACE VIEW business_offers_view AS
SELECT 
    bo.id,
    bo.business_id,
    bo.category_id,
    bo.title,
    bo.description,
    bo.original_price,
    bo.sale_price,
    bo.discount_percentage,
    bo.image_urls,
    bo.stock_quantity,
    bo.is_available,
    bo.is_featured,
    bo.valid_from,
    bo.valid_until,
    bo.specifications,
    oc.name as category_name,
    bp.business_name,
    bp.business_type
FROM business_offers bo
LEFT JOIN offer_categories oc ON bo.category_id = oc.id
LEFT JOIN business_profiles bp ON bo.business_id = bp.id
WHERE bo.is_available = true 
AND (bo.valid_until IS NULL OR bo.valid_until > now());

-- عرض طلبات التسوق مع التفاصيل
CREATE OR REPLACE VIEW shopping_order_details_view AS
SELECT 
    so.id,
    so.order_number,
    so.customer_id,
    so.business_id,
    so.order_type,
    so.status,
    so.total_amount,
    so.delivery_address,
    so.created_at,
    so.estimated_delivery_time,
    bp.business_name,
    cp.full_name as customer_name,
    cp.phone as customer_phone
FROM shopping_orders so
LEFT JOIN business_profiles bp ON so.business_id = bp.id
LEFT JOIN profiles cp ON so.customer_id = cp.id;

-- منح الصلاحيات للـ views
GRANT SELECT ON business_offers_view TO authenticated;
GRANT SELECT ON shopping_order_details_view TO authenticated;

-- ==============================================
-- إضافة القيود للعروض التجارية
-- ==============================================

DO $$
BEGIN
    -- قيود التحقق من صحة البيانات
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_shopping_order_status_valid') THEN
        ALTER TABLE shopping_orders ADD CONSTRAINT check_shopping_order_status_valid 
            CHECK (status IN ('pending', 'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_shopping_order_type_valid') THEN
        ALTER TABLE shopping_orders ADD CONSTRAINT check_shopping_order_type_valid 
            CHECK (order_type IN ('offers', 'custom_text'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_shopping_positive_amounts') THEN
        ALTER TABLE shopping_orders ADD CONSTRAINT check_shopping_positive_amounts 
            CHECK (total_amount >= 0 AND subtotal >= 0 AND delivery_fee >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_delivery_request_status_valid') THEN
        ALTER TABLE shopping_delivery_requests ADD CONSTRAINT check_delivery_request_status_valid 
            CHECK (status IN ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_discount_type_valid') THEN
        ALTER TABLE offer_coupons ADD CONSTRAINT check_discount_type_valid 
            CHECK (discount_type IN ('percentage', 'fixed_amount'));
    END IF;
END $$;

-- تم الانتهاء من نظام قوائم الطعام والطلبات ونظام العروض التجارية!
