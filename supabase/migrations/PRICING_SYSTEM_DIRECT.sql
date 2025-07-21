-- =====================================================
-- تطبيق نظام التسعير مباشرة - نسخة مبسطة
-- =====================================================

-- 1. إنشاء جدول إعدادات التسعير
CREATE TABLE IF NOT EXISTS pricing_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
    base_fare DECIMAL(8,3) NOT NULL DEFAULT 0.35,
    minimum_fare DECIMAL(8,3) NOT NULL DEFAULT 0.90,
    waiting_rate_per_minute DECIMAL(8,3) NOT NULL DEFAULT 0.03,
    app_commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    fuel_rates JSONB NOT NULL DEFAULT '{"petrol": 0.17, "diesel": 0.16, "hybrid": 0.15, "electric": 0.14}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إدراج الإعدادات الافتراضية
INSERT INTO pricing_config (config_name, base_fare, minimum_fare, waiting_rate_per_minute, app_commission_rate, fuel_rates)
VALUES ('default', 0.35, 0.90, 0.03, 0.10, '{"petrol": 0.17, "diesel": 0.16, "hybrid": 0.15, "electric": 0.14}')
ON CONFLICT (config_name) DO UPDATE SET
    base_fare = EXCLUDED.base_fare,
    minimum_fare = EXCLUDED.minimum_fare,
    waiting_rate_per_minute = EXCLUDED.waiting_rate_per_minute,
    app_commission_rate = EXCLUDED.app_commission_rate,
    fuel_rates = EXCLUDED.fuel_rates,
    updated_at = NOW();

-- 3. إضافة أعمدة التسعير لجدول الرحلات
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'petrol',
ADD COLUMN IF NOT EXISTS base_fare DECIMAL(8,3) DEFAULT 0.35,
ADD COLUMN IF NOT EXISTS distance_fare DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS waiting_charges DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS surge_multiplier DECIMAL(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS surge_amount DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_fare_applied BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_customer_fare DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS driver_earnings DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS app_commission DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(4,3) DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS waiting_time_minutes INTEGER DEFAULT 0;

-- 4. إضافة عمود نوع الوقود لجدول taxi_drivers
ALTER TABLE taxi_drivers 
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'petrol' 
CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric'));

-- 5. إنشاء جدول الأرباح اليومية
CREATE TABLE IF NOT EXISTS driver_daily_earnings (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    earning_date DATE NOT NULL,
    total_trips INTEGER DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,3) DEFAULT 0,
    driver_earnings DECIMAL(10,3) DEFAULT 0,
    app_commission DECIMAL(10,3) DEFAULT 0,
    average_fare DECIMAL(8,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, earning_date)
);

-- 6. دالة حساب التكلفة
CREATE OR REPLACE FUNCTION calculate_trip_fare(
    p_distance_km DECIMAL,
    p_fuel_type VARCHAR(20) DEFAULT 'petrol',
    p_waiting_time_minutes INTEGER DEFAULT 0,
    p_surge_multiplier DECIMAL DEFAULT 1.0
) RETURNS TABLE (
    base_fare DECIMAL(8,3),
    distance_fare DECIMAL(8,3),
    waiting_charges DECIMAL(8,3),
    surge_amount DECIMAL(8,3),
    subtotal DECIMAL(8,3),
    minimum_fare_applied BOOLEAN,
    total_fare DECIMAL(8,3),
    driver_earnings DECIMAL(8,3),
    app_commission DECIMAL(8,3)
) AS $$
DECLARE
    config_row pricing_config%ROWTYPE;
    v_base_fare DECIMAL(8,3) := 0.35;
    v_distance_fare DECIMAL(8,3);
    v_waiting_charges DECIMAL(8,3);
    v_subtotal_before_min DECIMAL(8,3);
    v_subtotal DECIMAL(8,3);
    v_surge_amount DECIMAL(8,3);
    v_total_fare DECIMAL(8,3);
    v_minimum_applied BOOLEAN;
    v_driver_earnings DECIMAL(8,3);
    v_app_commission DECIMAL(8,3);
    v_fuel_rate DECIMAL(8,3) := 0.17;
BEGIN
    -- محاولة الحصول على إعدادات التسعير النشطة
    BEGIN
        SELECT * INTO config_row 
        FROM pricing_config 
        WHERE is_active = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF FOUND THEN
            v_base_fare := config_row.base_fare;
            v_fuel_rate := (config_row.fuel_rates ->> p_fuel_type)::DECIMAL(8,3);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- استخدام القيم الافتراضية إذا فشل الوصول للجدول
        v_base_fare := 0.35;
        CASE p_fuel_type
            WHEN 'petrol' THEN v_fuel_rate := 0.17;
            WHEN 'diesel' THEN v_fuel_rate := 0.16;
            WHEN 'hybrid' THEN v_fuel_rate := 0.15;
            WHEN 'electric' THEN v_fuel_rate := 0.14;
            ELSE v_fuel_rate := 0.17;
        END CASE;
    END;
    
    -- حساب تكلفة المسافة
    v_distance_fare := p_distance_km * v_fuel_rate;
    
    -- حساب رسوم الانتظار
    v_waiting_charges := p_waiting_time_minutes * 0.03;
    
    -- المجموع قبل الحد الأدنى
    v_subtotal_before_min := v_base_fare + v_distance_fare + v_waiting_charges;
    
    -- تطبيق الحد الأدنى
    v_minimum_applied := v_subtotal_before_min < 0.90;
    v_subtotal := GREATEST(v_subtotal_before_min, 0.90);
    
    -- حساب مضاعف الازدحام
    v_surge_amount := (v_subtotal * p_surge_multiplier) - v_subtotal;
    
    -- إجمالي التكلفة
    v_total_fare := v_subtotal + v_surge_amount;
    
    -- تقسيم الإيرادات (10% تطبيق، 90% سائق)
    v_app_commission := v_total_fare * 0.10;
    v_driver_earnings := v_total_fare - v_app_commission;
    
    -- إرجاع النتائج
    RETURN QUERY SELECT 
        v_base_fare,
        v_distance_fare,
        v_waiting_charges,
        v_surge_amount,
        v_subtotal,
        v_minimum_applied,
        v_total_fare,
        v_driver_earnings,
        v_app_commission;
END;
$$ LANGUAGE plpgsql;

-- 7. اختبار النظام
SELECT 'تم إنشاء نظام التسعير بنجاح! 🚕' as status;

-- اختبار دالة حساب التكلفة
SELECT * FROM calculate_trip_fare(10.5, 'petrol', 5, 1.2);
