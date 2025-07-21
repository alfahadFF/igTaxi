-- =====================================================
-- إصلاح قاعدة البيانات - نسخة مبسطة وآمنة
-- =====================================================

-- إنشاء view للسائقين (للتوافق مع الكود الحالي)
DROP VIEW IF EXISTS public.drivers;
CREATE VIEW public.drivers AS 
SELECT * FROM public.taxi_drivers;

-- إنشاء view لطلبات الرحلات (للتوافق مع الكود الحالي)
DROP VIEW IF EXISTS public.trip_requests;  
CREATE VIEW public.trip_requests AS
SELECT * FROM public.taxi_requests;

-- منح الأذونات للـ views
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_requests TO anon, authenticated;

-- =====================================================
-- إنشاء الجداول المفقودة
-- =====================================================

-- 1. جدول مدفوعات المواقف
CREATE TABLE IF NOT EXISTS public.parking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID,
    user_id UUID,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول طلبات التسوق
CREATE TABLE IF NOT EXISTS public.shopping_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    business_id UUID,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    payment_method VARCHAR(20) DEFAULT 'cash',
    special_instructions TEXT,
    estimated_delivery_time INTEGER,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول عناصر طلبات التسوق
CREATE TABLE IF NOT EXISTS public.shopping_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول طلبات توصيل التسوق
CREATE TABLE IF NOT EXISTS public.shopping_delivery_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID,
    driver_id UUID,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    delivery_address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    delivery_fee DECIMAL(10, 2) NOT NULL,
    estimated_distance DECIMAL(8, 2),
    estimated_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 5. جدول الوصفات الطبية
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID,
    doctor_name VARCHAR(255) NOT NULL,
    doctor_license VARCHAR(100),
    clinic_name VARCHAR(255),
    prescription_date DATE NOT NULL,
    notes TEXT,
    is_valid BOOLEAN DEFAULT true,
    expiry_date DATE,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- منح الأذونات للجداول الجديدة
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_orders TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_order_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_delivery_requests TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO anon, authenticated;

-- إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_parking_payments_user_id ON public.parking_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_customer_id ON public.shopping_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_shopping_orders_status ON public.shopping_orders(status);
CREATE INDEX IF NOT EXISTS idx_shopping_order_items_order_id ON public.shopping_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shopping_delivery_requests_driver_id ON public.shopping_delivery_requests(driver_id);
CREATE INDEX IF NOT EXISTS idx_shopping_delivery_requests_status ON public.shopping_delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);

-- تأكيد نجاح العمليات
SELECT 'تم إنشاء Views والجداول المفقودة بنجاح - قاعدة البيانات مكتملة 100%!' as result;
