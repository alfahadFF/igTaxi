-- =====================================================
-- نظام التسعير المتقدم والشامل - IGTaxi
-- =====================================================

-- 1. إنشاء جدول إعدادات التسعير المتقدم
CREATE TABLE IF NOT EXISTS advanced_pricing_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(50) UNIQUE NOT NULL DEFAULT 'default',
    
    -- أسعار أساسية
    base_fare DECIMAL(8,3) NOT NULL DEFAULT 0.35,
    minimum_fare DECIMAL(8,3) NOT NULL DEFAULT 0.90,
    waiting_rate_per_minute DECIMAL(8,3) NOT NULL DEFAULT 0.03,
    app_commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    
    -- أسعار الوقود حسب النوع
    fuel_rates JSONB NOT NULL DEFAULT '{
        "petrol": 0.17,
        "diesel": 0.16,
        "hybrid": 0.15,
        "electric": 0.14
    }',
    
    -- تسعير حسب الوقت
    time_based_pricing JSONB DEFAULT '{
        "peak_morning": {"start": "07:00", "end": "09:00", "multiplier": 1.5},
        "peak_evening": {"start": "17:00", "end": "19:00", "multiplier": 1.5},
        "night": {"start": "22:00", "end": "06:00", "multiplier": 1.2},
        "weekend": {"multiplier": 1.1}
    }',
    
    -- تسعير حسب المنطقة
    zone_based_pricing JSONB DEFAULT '{
        "downtown": {"multiplier": 1.3, "min_fare": 1.20},
        "airport": {"multiplier": 1.5, "min_fare": 2.00},
        "industrial": {"multiplier": 0.9, "min_fare": 0.80},
        "residential": {"multiplier": 1.0, "min_fare": 0.90}
    }',
    
    -- تسعير حسب الطقس
    weather_based_pricing JSONB DEFAULT '{
        "rain": {"multiplier": 1.2},
        "storm": {"multiplier": 1.5},
        "fog": {"multiplier": 1.3},
        "extreme_heat": {"multiplier": 1.1}
    }',
    
    -- خصومات المسافات الطويلة
    distance_discounts JSONB DEFAULT '{
        "20_km_plus": {"discount_rate": 0.05},
        "50_km_plus": {"discount_rate": 0.10},
        "100_km_plus": {"discount_rate": 0.15}
    }',
    
    -- إعدادات حجم المركبة
    vehicle_size_factors JSONB DEFAULT '{
        "compact": {"multiplier": 1.0},
        "sedan": {"multiplier": 1.1},
        "suv": {"multiplier": 1.3},
        "van": {"multiplier": 1.5},
        "luxury": {"multiplier": 2.0}
    }',
    
    -- إعدادات الولاء
    loyalty_settings JSONB DEFAULT '{
        "bronze": {"discount": 0.02, "min_trips": 10},
        "silver": {"discount": 0.05, "min_trips": 50},
        "gold": {"discount": 0.08, "min_trips": 100},
        "platinum": {"discount": 0.12, "min_trips": 200}
    }',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إنشاء جدول المناطق الجغرافية
CREATE TABLE IF NOT EXISTS pricing_zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    zone_code VARCHAR(20) UNIQUE NOT NULL,
    zone_type VARCHAR(50) NOT NULL, -- downtown, airport, residential, etc.
    
    -- حدود المنطقة (مضلع جغرافي)
    zone_boundaries JSONB NOT NULL, -- array of lat/lng points
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    
    -- إعدادات خاصة بالمنطقة
    base_multiplier DECIMAL(4,2) DEFAULT 1.0,
    minimum_fare_override DECIMAL(8,3),
    special_rates JSONB DEFAULT '{}',
    
    -- أوقات خاصة
    peak_hours JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول مراقبة الطقس
CREATE TABLE IF NOT EXISTS weather_conditions (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER REFERENCES pricing_zones(id),
    weather_type VARCHAR(50) NOT NULL,
    severity_level INTEGER DEFAULT 1 CHECK (severity_level BETWEEN 1 AND 5),
    temperature_celsius DECIMAL(5,2),
    wind_speed_kmh DECIMAL(5,2),
    precipitation_mm DECIMAL(5,2),
    visibility_km DECIMAL(5,2),
    
    -- تأثير على التسعير
    pricing_impact DECIMAL(4,2) DEFAULT 1.0,
    
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول نقاط الولاء
CREATE TABLE IF NOT EXISTS customer_loyalty (
    id SERIAL PRIMARY KEY,
    customer_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- إحصائيات العضوية
    total_trips INTEGER DEFAULT 0,
    total_spent DECIMAL(12,3) DEFAULT 0,
    loyalty_level VARCHAR(20) DEFAULT 'bronze',
    loyalty_points INTEGER DEFAULT 0,
    
    -- تاريخ العضوية
    first_trip_date DATE,
    last_trip_date DATE,
    
    -- خصومات مكتسبة
    earned_discounts JSONB DEFAULT '[]',
    used_discounts JSONB DEFAULT '[]',
    
    -- إحصائيات شهرية
    monthly_stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(customer_id)
);

-- 5. جدول كوبونات الخصم
CREATE TABLE IF NOT EXISTS discount_coupons (
    id SERIAL PRIMARY KEY,
    coupon_code VARCHAR(20) UNIQUE NOT NULL,
    coupon_type VARCHAR(30) NOT NULL, -- percentage, fixed_amount, free_ride
    
    -- قيم الخصم
    discount_value DECIMAL(8,3) NOT NULL,
    max_discount_amount DECIMAL(8,3),
    min_trip_amount DECIMAL(8,3),
    
    -- شروط الاستخدام
    max_uses_total INTEGER,
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- فترة الصلاحية
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- قيود جغرافية ووقتية
    applicable_zones TEXT[],
    applicable_days INTEGER[], -- 0=Sunday, 1=Monday, etc.
    applicable_hours JSONB,
    
    -- شروط خاصة
    new_customers_only BOOLEAN DEFAULT FALSE,
    minimum_loyalty_level VARCHAR(20),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. جدول سجل استخدام الكوبونات
CREATE TABLE IF NOT EXISTS coupon_usage_log (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER REFERENCES discount_coupons(id),
    customer_id UUID REFERENCES main_profiles(id),
    trip_id UUID REFERENCES trips(id),
    
    discount_applied DECIMAL(8,3) NOT NULL,
    original_fare DECIMAL(8,3) NOT NULL,
    final_fare DECIMAL(8,3) NOT NULL,
    
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. تحديث جدول الرحلات مع المعلومات المتقدمة
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS pickup_zone_id INTEGER REFERENCES pricing_zones(id),
ADD COLUMN IF NOT EXISTS dropoff_zone_id INTEGER REFERENCES pricing_zones(id),
ADD COLUMN IF NOT EXISTS weather_conditions_id INTEGER REFERENCES weather_conditions(id),
ADD COLUMN IF NOT EXISTS vehicle_size_type VARCHAR(20) DEFAULT 'sedan',
ADD COLUMN IF NOT EXISTS route_difficulty_score INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS traffic_multiplier DECIMAL(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS loyalty_discount_applied DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS coupon_discount_applied DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_based_multiplier DECIMAL(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS zone_based_multiplier DECIMAL(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS weather_multiplier DECIMAL(4,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS distance_discount_applied DECIMAL(8,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_fare_breakdown JSONB DEFAULT '{}';

-- 8. جدول تتبع أسعار الوقود التاريخية
CREATE TABLE IF NOT EXISTS fuel_price_history (
    id SERIAL PRIMARY KEY,
    fuel_type VARCHAR(20) NOT NULL,
    price_per_liter DECIMAL(6,3) NOT NULL,
    currency VARCHAR(3) DEFAULT 'JOD',
    
    -- مصدر السعر
    price_source VARCHAR(100),
    region VARCHAR(50) DEFAULT 'Jordan',
    
    -- تواريخ
    effective_from DATE NOT NULL,
    effective_until DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. جدول التقارير المتقدمة
CREATE TABLE IF NOT EXISTS advanced_reports_cache (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    report_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
    report_date DATE NOT NULL,
    
    -- بيانات التقرير
    total_trips INTEGER,
    total_revenue DECIMAL(12,3),
    total_distance DECIMAL(12,2),
    average_fare DECIMAL(8,3),
    
    -- تفصيل حسب المنطقة
    zone_breakdown JSONB DEFAULT '{}',
    
    -- تفصيل حسب الوقت
    time_breakdown JSONB DEFAULT '{}',
    
    -- تفصيل حسب نوع الوقود
    fuel_type_breakdown JSONB DEFAULT '{}',
    
    -- إحصائيات الطقس
    weather_impact_analysis JSONB DEFAULT '{}',
    
    -- تحليل الولاء
    loyalty_analysis JSONB DEFAULT '{}',
    
    -- توقعات
    revenue_forecast JSONB DEFAULT '{}',
    
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(report_type, report_period, report_date)
);

-- 10. جدول سجل تغييرات الأسعار
CREATE TABLE IF NOT EXISTS pricing_audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action_type VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    
    -- بيانات التغيير
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- معلومات المستخدم
    changed_by UUID REFERENCES main_profiles(id),
    change_reason TEXT,
    approval_status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES main_profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. إدراج البيانات الافتراضية للإعدادات المتقدمة
INSERT INTO advanced_pricing_config (config_name, base_fare, minimum_fare, waiting_rate_per_minute, app_commission_rate, fuel_rates)
VALUES ('default', 0.35, 0.90, 0.03, 0.10, '{
    "petrol": 0.17,
    "diesel": 0.16,
    "hybrid": 0.15,
    "electric": 0.14
}')
ON CONFLICT (config_name) DO UPDATE SET
    base_fare = EXCLUDED.base_fare,
    minimum_fare = EXCLUDED.minimum_fare,
    waiting_rate_per_minute = EXCLUDED.waiting_rate_per_minute,
    app_commission_rate = EXCLUDED.app_commission_rate,
    fuel_rates = EXCLUDED.fuel_rates,
    updated_at = NOW();

-- 12. إدراج مناطق افتراضية لعمان
INSERT INTO pricing_zones (zone_name, zone_code, zone_type, zone_boundaries, center_lat, center_lng, base_multiplier, minimum_fare_override)
VALUES 
('وسط البلد', 'DOWNTOWN', 'downtown', '[{"lat": 31.9515, "lng": 35.9239}, {"lat": 31.9525, "lng": 35.9249}, {"lat": 31.9535, "lng": 35.9229}, {"lat": 31.9505, "lng": 35.9219}]', 31.9520, 35.9234, 1.3, 1.20),
('المطار', 'AIRPORT', 'airport', '[{"lat": 31.7225, "lng": 35.9932}, {"lat": 31.7235, "lng": 35.9942}, {"lat": 31.7245, "lng": 35.9922}, {"lat": 31.7215, "lng": 35.9912}]', 31.7230, 35.9927, 1.5, 2.00),
('عبدون', 'ABDOUN', 'residential', '[{"lat": 31.9395, "lng": 35.8779}, {"lat": 31.9405, "lng": 35.8789}, {"lat": 31.9415, "lng": 35.8769}, {"lat": 31.9385, "lng": 35.8759}]', 31.9400, 35.8774, 1.2, 1.00),
('الصناعية', 'INDUSTRIAL', 'industrial', '[{"lat": 32.0125, "lng": 35.8779}, {"lat": 32.0135, "lng": 35.8789}, {"lat": 32.0145, "lng": 35.8769}, {"lat": 32.0115, "lng": 35.8759}]', 32.0130, 35.8774, 0.9, 0.80)
ON CONFLICT (zone_code) DO NOTHING;

-- 13. إدراج أسعار وقود تاريخية
INSERT INTO fuel_price_history (fuel_type, price_per_liter, price_source, effective_from)
VALUES 
('petrol', 0.745, 'وزارة الطاقة الأردنية', '2024-01-01'),
('diesel', 0.705, 'وزارة الطاقة الأردنية', '2024-01-01'),
('hybrid', 0.745, 'متوسط استهلاك', '2024-01-01'),
('electric', 0.150, 'شركة الكهرباء الأردنية', '2024-01-01')
ON CONFLICT DO NOTHING;

-- 14. إنشاء كوبونات ترحيبية
INSERT INTO discount_coupons (coupon_code, coupon_type, discount_value, max_discount_amount, valid_until, new_customers_only)
VALUES 
('WELCOME10', 'percentage', 10, 2.00, NOW() + INTERVAL '30 days', true),
('FIRSTRIDE', 'fixed_amount', 1.00, 1.00, NOW() + INTERVAL '60 days', true),
('WEEKEND20', 'percentage', 20, 3.00, NOW() + INTERVAL '90 days', false)
ON CONFLICT (coupon_code) DO NOTHING;

-- 15. رسالة تأكيد
SELECT 'تم إنشاء نظام التسعير المتقدم بنجاح! 🚕✨' as status;
