-- جدول محطات التنقية والفلترة
CREATE TABLE IF NOT EXISTS public.water_stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES public.main_profiles(id) ON DELETE CASCADE,
    station_name TEXT NOT NULL,
    description TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    
    -- الموقع
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- أنواع المنتجات
    products JSONB DEFAULT '[]', -- مصفوفة المنتجات مع الأسعار
    
    -- معلومات إضافية
    working_hours JSONB, -- ساعات العمل
    delivery_areas TEXT[], -- مناطق التوصيل
    minimum_order DECIMAL(10,2) DEFAULT 0, -- أقل طلب
    delivery_fee DECIMAL(10,2) DEFAULT 0, -- رسوم التوصيل
    
    -- الصور والشعار
    logo_url TEXT,
    images TEXT[], -- مصفوفة روابط الصور
    
    -- التقييم والإحصائيات
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- التواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول طلبات المياه
CREATE TABLE IF NOT EXISTS public.water_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.main_profiles(id) ON DELETE CASCADE,
    station_id UUID REFERENCES public.water_stations(id) ON DELETE CASCADE,
    
    -- تفاصيل الطلب
    items JSONB NOT NULL, -- المنتجات والكميات
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    
    -- عنوان التوصيل
    delivery_address TEXT NOT NULL,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_notes TEXT,
    
    -- الحالة والتوقيتات
    status TEXT DEFAULT 'pending', -- pending, accepted, preparing, delivering, completed, cancelled
    estimated_delivery_time INTEGER, -- بالدقائق
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    
    -- طريقة الدفع
    payment_method TEXT DEFAULT 'cash', -- cash, card, wallet
    payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
    
    -- التقييم
    customer_rating INTEGER,
    customer_review TEXT,
    
    -- التواريخ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- تفعيل Row Level Security
ALTER TABLE public.water_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_orders ENABLE ROW LEVEL SECURITY;

-- سياسات المحطات
CREATE POLICY "water_stations_select_policy" ON public.water_stations
    FOR SELECT USING (true);

CREATE POLICY "water_stations_insert_policy" ON public.water_stations
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "water_stations_update_policy" ON public.water_stations
    FOR UPDATE USING (auth.uid() = owner_id);

-- سياسات الطلبات
CREATE POLICY "water_orders_select_policy" ON public.water_orders
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        auth.uid() IN (SELECT owner_id FROM water_stations WHERE id = station_id)
    );

CREATE POLICY "water_orders_insert_policy" ON public.water_orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "water_orders_update_policy" ON public.water_orders
    FOR UPDATE USING (
        auth.uid() = customer_id OR 
        auth.uid() IN (SELECT owner_id FROM water_stations WHERE id = station_id)
    );

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_water_stations_location ON public.water_stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_water_stations_city_area ON public.water_stations(city, area);
CREATE INDEX IF NOT EXISTS idx_water_stations_active ON public.water_stations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_water_orders_status ON public.water_orders(status);
CREATE INDEX IF NOT EXISTS idx_water_orders_station ON public.water_orders(station_id);

-- دالة للبحث عن المحطات القريبة
CREATE OR REPLACE FUNCTION get_nearby_water_stations(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_km INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    station_name TEXT,
    description TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    area TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    products JSONB,
    working_hours JSONB,
    delivery_fee DECIMAL,
    minimum_order DECIMAL,
    logo_url TEXT,
    images TEXT[],
    rating DECIMAL,
    total_reviews INTEGER,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.id,
        ws.station_name,
        ws.description,
        ws.phone,
        ws.address,
        ws.city,
        ws.area,
        ws.latitude,
        ws.longitude,
        ws.products,
        ws.working_hours,
        ws.delivery_fee,
        ws.minimum_order,
        ws.logo_url,
        ws.images,
        ws.rating,
        ws.total_reviews,
        ROUND(
            (6371 * acos(
                cos(radians(user_lat)) * 
                cos(radians(ws.latitude)) * 
                cos(radians(ws.longitude) - radians(user_lng)) + 
                sin(radians(user_lat)) * 
                sin(radians(ws.latitude))
            ))::DECIMAL, 2
        ) as distance_km
    FROM public.water_stations ws
    WHERE ws.is_active = true
    AND (6371 * acos(
        cos(radians(user_lat)) * 
        cos(radians(ws.latitude)) * 
        cos(radians(ws.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(ws.latitude))
    )) <= radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- دالة إنشاء رقم طلب فريد
CREATE OR REPLACE FUNCTION generate_water_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'WO' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(counter::TEXT, 4, '0');
        
        IF NOT EXISTS (SELECT 1 FROM water_orders WHERE order_number = new_number) THEN
            RETURN new_number;
        END IF;
        
        counter := counter + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- trigger لإنشاء رقم الطلب تلقائياً
CREATE OR REPLACE FUNCTION set_water_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_water_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_water_order_number_trigger
    BEFORE INSERT ON public.water_orders
    FOR EACH ROW EXECUTE FUNCTION set_water_order_number();

-- trigger للتحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION handle_water_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_water_stations_updated_at
    BEFORE UPDATE ON public.water_stations
    FOR EACH ROW EXECUTE FUNCTION handle_water_updated_at();

CREATE TRIGGER handle_water_orders_updated_at
    BEFORE UPDATE ON public.water_orders
    FOR EACH ROW EXECUTE FUNCTION handle_water_updated_at();
