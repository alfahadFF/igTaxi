-- =====================================================
-- إصلاح قاعدة البيانات - إنشاء Views للتوافق + الجداول المفقودة
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
    reservation_id UUID REFERENCES public.parking_reservations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'wallet')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول طلبات التسوق
CREATE TABLE IF NOT EXISTS public.shopping_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'wallet')),
    special_instructions TEXT,
    estimated_delivery_time INTEGER, -- في الدقائق
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول عناصر طلبات التسوق
CREATE TABLE IF NOT EXISTS public.shopping_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.shopping_orders(id) ON DELETE CASCADE,
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
    order_id UUID REFERENCES public.shopping_orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.taxi_drivers(id) ON DELETE SET NULL,
    pickup_latitude DECIMAL(10, 8) NOT NULL,
    pickup_longitude DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8) NOT NULL,
    delivery_longitude DECIMAL(11, 8) NOT NULL,
    delivery_address TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled')),
    delivery_fee DECIMAL(10, 2) NOT NULL,
    estimated_distance DECIMAL(8, 2),
    estimated_duration INTEGER, -- في الدقائق
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 5. جدول الوصفات الطبية
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- تأكيد نجاح العمليات
SELECT 'تم إنشاء Views والجداول المفقودة بنجاح - قاعدة البيانات مكتملة!' as result;

-- تحديث جدول أنواع السيارات لإضافة الأسعار
UPDATE public.vehicle_types 
SET base_fare = CASE 
    WHEN name = 'Economy Car' THEN 10.0
    WHEN name = 'Comfort Car' THEN 15.0
    WHEN name = 'Premium Car' THEN 25.0
    WHEN name = 'Van' THEN 20.0
    WHEN name = 'Electric Car' THEN 18.0
    WHEN name = 'Motorcycle' THEN 8.0
    ELSE 12.0
END
WHERE base_fare IS NULL;

-- إضافة فهارس للأداء (للجداول الموجودة)
CREATE INDEX IF NOT EXISTS idx_taxi_drivers_is_active ON public.taxi_drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_status ON public.taxi_requests(status);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_customer ON public.taxi_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_driver ON public.taxi_requests(driver_id);

-- إضافة RLS للجداول الموجودة (إذا لم تكن مُفعّلة)
-- تعليق مؤقت لتجنب تعارض السياسات الموجودة
-- ALTER TABLE public.taxi_drivers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.taxi_requests ENABLE ROW LEVEL SECURITY;

-- سياسات أمان مبسطة (اختيارية)
-- يمكن تطبيقها لاحقاً حسب الحاجة

/*
-- سياسات الأمان للسائقين
DROP POLICY IF EXISTS "Users can view their own driver profile" ON public.taxi_drivers;
CREATE POLICY "Users can view their own driver profile" ON public.taxi_drivers
    FOR SELECT USING (true); -- مؤقتاً للسماح بالوصول

DROP POLICY IF EXISTS "Users can update their own driver profile" ON public.taxi_drivers;
CREATE POLICY "Users can update their own driver profile" ON public.taxi_drivers
    FOR UPDATE USING (true); -- مؤقتاً للسماح بالتحديث

-- سياسات الأمان لطلبات الرحلات
DROP POLICY IF EXISTS "Users can view their own trip requests" ON public.taxi_requests;
CREATE POLICY "Users can view their own trip requests" ON public.taxi_requests
    FOR SELECT USING (true); -- مؤقتاً للسماح بالوصول

DROP POLICY IF EXISTS "Customers can create trip requests" ON public.taxi_requests;
CREATE POLICY "Customers can create trip requests" ON public.taxi_requests
    FOR INSERT WITH CHECK (true); -- مؤقتاً للسماح بالإدراج

DROP POLICY IF EXISTS "Drivers can update assigned trips" ON public.taxi_requests;
CREATE POLICY "Drivers can update assigned trips" ON public.taxi_requests
    FOR UPDATE USING (true); -- مؤقتاً للسماح بالتحديث
*/

-- دالة وtriggers للتحديث التلقائي (اختيارية)
/*
-- دالة لتحديث timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة triggers للجداول الموجودة (إذا لم تكن موجودة)
DROP TRIGGER IF EXISTS update_taxi_drivers_updated_at ON public.taxi_drivers;
CREATE TRIGGER update_taxi_drivers_updated_at 
    BEFORE UPDATE ON public.taxi_drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

-- تأكيد نجاح العمليات
SELECT 'تم إنشاء وإصلاح جميع الجداول بنجاح!' as result;
