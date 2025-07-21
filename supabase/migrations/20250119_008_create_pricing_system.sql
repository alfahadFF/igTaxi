-- =====================================================
-- تحديث قاعدة البيانات لنظام التسعير والإيرادات
-- =====================================================

-- 1. إضافة عمود نوع الوقود لجدول سائقي التاكسي
ALTER TABLE taxi_drivers 
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'petrol' 
CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric'));

-- 2. تحديث جدول الرحلات لتشمل تفاصيل التسعير
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
ADD COLUMN IF NOT EXISTS waiting_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_speed_kmh DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fare_breakdown JSONB DEFAULT '{}';

-- 3. إنشاء جدول إعدادات التسعير
CREATE TABLE IF NOT EXISTS pricing_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(50) UNIQUE NOT NULL,
    base_fare DECIMAL(8,3) NOT NULL DEFAULT 0.35,
    minimum_fare DECIMAL(8,3) NOT NULL DEFAULT 0.90,
    waiting_rate_per_minute DECIMAL(8,3) NOT NULL DEFAULT 0.03,
    app_commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    fuel_rates JSONB NOT NULL DEFAULT '{
        "petrol": 0.17,
        "diesel": 0.16,
        "hybrid": 0.15,
        "electric": 0.14
    }',
    surge_settings JSONB DEFAULT '{
        "max_multiplier": 2.5,
        "peak_hours": [7, 8, 9, 17, 18, 19],
        "demand_multipliers": {
            "low": 1.0,
            "normal": 1.2,
            "high": 1.5,
            "peak": 2.0
        }
    }',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج إعدادات التسعير الافتراضية
INSERT INTO pricing_config (config_name, base_fare, minimum_fare, waiting_rate_per_minute, app_commission_rate, fuel_rates)
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

-- 4. إنشاء جدول الإيرادات اليومية للسائقين
CREATE TABLE IF NOT EXISTS driver_daily_earnings (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    earning_date DATE NOT NULL,
    total_trips INTEGER DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(10,3) DEFAULT 0, -- إجمالي ما دفعه العملاء
    driver_earnings DECIMAL(10,3) DEFAULT 0, -- أرباح السائق (90%)
    app_commission DECIMAL(10,3) DEFAULT 0, -- عمولة التطبيق (10%)
    fuel_cost_estimated DECIMAL(8,3) DEFAULT 0, -- تكلفة الوقود المقدرة
    net_driver_profit DECIMAL(10,3) DEFAULT 0, -- صافي ربح السائق بعد خصم الوقود
    average_fare DECIMAL(8,3) DEFAULT 0,
    average_trip_distance DECIMAL(8,2) DEFAULT 0,
    peak_hours_trips INTEGER DEFAULT 0,
    waiting_time_total_minutes INTEGER DEFAULT 0,
    surge_revenue DECIMAL(8,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, earning_date)
);

-- 5. إنشاء جدول الإيرادات الشهرية للسائقين
CREATE TABLE IF NOT EXISTS driver_monthly_earnings (
    id SERIAL PRIMARY KEY,
    driver_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    total_trips INTEGER DEFAULT 0,
    total_distance_km DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(12,3) DEFAULT 0,
    driver_earnings DECIMAL(12,3) DEFAULT 0,
    app_commission DECIMAL(12,3) DEFAULT 0,
    fuel_cost_estimated DECIMAL(10,3) DEFAULT 0,
    net_driver_profit DECIMAL(12,3) DEFAULT 0,
    average_daily_trips DECIMAL(8,2) DEFAULT 0,
    best_day_earnings DECIMAL(10,3) DEFAULT 0,
    best_day_date DATE,
    working_days INTEGER DEFAULT 0,
    peak_hours_trips INTEGER DEFAULT 0,
    surge_revenue DECIMAL(10,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, year, month)
);

-- 6. إنشاء جدول إيرادات التطبيق الإجمالية
CREATE TABLE IF NOT EXISTS app_total_earnings (
    id SERIAL PRIMARY KEY,
    earning_date DATE UNIQUE NOT NULL,
    total_trips INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,3) DEFAULT 0, -- إجمالي الإيرادات من جميع الرحلات
    total_commission DECIMAL(12,3) DEFAULT 0, -- إجمالي عمولة التطبيق
    total_driver_earnings DECIMAL(12,3) DEFAULT 0, -- إجمالي أرباح السائقين
    average_commission_rate DECIMAL(4,3) DEFAULT 0.10,
    active_drivers INTEGER DEFAULT 0,
    surge_revenue DECIMAL(10,3) DEFAULT 0,
    fuel_type_breakdown JSONB DEFAULT '{}', -- تفصيل حسب نوع الوقود
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. دالة حساب التكلفة (PostgreSQL Function)
CREATE OR REPLACE FUNCTION calculate_trip_fare(
    p_distance_km DECIMAL,
    p_fuel_type VARCHAR(20),
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
    v_base_fare DECIMAL(8,3);
    v_distance_fare DECIMAL(8,3);
    v_waiting_charges DECIMAL(8,3);
    v_subtotal_before_min DECIMAL(8,3);
    v_subtotal DECIMAL(8,3);
    v_surge_amount DECIMAL(8,3);
    v_total_fare DECIMAL(8,3);
    v_minimum_applied BOOLEAN;
    v_driver_earnings DECIMAL(8,3);
    v_app_commission DECIMAL(8,3);
    v_fuel_rate DECIMAL(8,3);
BEGIN
    -- الحصول على إعدادات التسعير النشطة
    SELECT * INTO config_row 
    FROM pricing_config 
    WHERE is_active = TRUE 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- استخراج سعر الوقود من JSON
    v_fuel_rate := (config_row.fuel_rates ->> p_fuel_type)::DECIMAL(8,3);
    
    -- حساب رسوم البداية
    v_base_fare := config_row.base_fare;
    
    -- حساب تكلفة المسافة
    v_distance_fare := p_distance_km * v_fuel_rate;
    
    -- حساب رسوم الانتظار
    v_waiting_charges := p_waiting_time_minutes * config_row.waiting_rate_per_minute;
    
    -- المجموع قبل الحد الأدنى
    v_subtotal_before_min := v_base_fare + v_distance_fare + v_waiting_charges;
    
    -- تطبيق الحد الأدنى
    v_minimum_applied := v_subtotal_before_min < config_row.minimum_fare;
    v_subtotal := GREATEST(v_subtotal_before_min, config_row.minimum_fare);
    
    -- حساب مضاعف الازدحام
    v_surge_amount := (v_subtotal * p_surge_multiplier) - v_subtotal;
    
    -- إجمالي التكلفة
    v_total_fare := v_subtotal + v_surge_amount;
    
    -- تقسيم الإيرادات
    v_app_commission := v_total_fare * config_row.app_commission_rate;
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

-- 8. دالة تحديث الإيرادات اليومية
CREATE OR REPLACE FUNCTION update_driver_daily_earnings()
RETURNS TRIGGER AS $$
DECLARE
    earnings_record driver_daily_earnings%ROWTYPE;
    trip_date DATE;
BEGIN
    -- استخراج تاريخ الرحلة
    trip_date := DATE(NEW.completed_at);
    
    -- البحث عن سجل الإيرادات اليومية أو إنشاؤه
    SELECT * INTO earnings_record
    FROM driver_daily_earnings
    WHERE driver_id = NEW.driver_id AND earning_date = trip_date;
    
    IF NOT FOUND THEN
        -- إنشاء سجل جديد
        INSERT INTO driver_daily_earnings (driver_id, earning_date)
        VALUES (NEW.driver_id, trip_date);
        
        SELECT * INTO earnings_record
        FROM driver_daily_earnings
        WHERE driver_id = NEW.driver_id AND earning_date = trip_date;
    END IF;
    
    -- تحديث الإحصائيات
    UPDATE driver_daily_earnings SET
        total_trips = total_trips + 1,
        total_distance_km = total_distance_km + COALESCE(NEW.distance_km, 0),
        total_revenue = total_revenue + COALESCE(NEW.total_customer_fare, 0),
        driver_earnings = driver_earnings + COALESCE(NEW.driver_earnings, 0),
        app_commission = app_commission + COALESCE(NEW.app_commission, 0),
        waiting_time_total_minutes = waiting_time_total_minutes + COALESCE(NEW.waiting_time_minutes, 0),
        surge_revenue = surge_revenue + COALESCE(NEW.surge_amount, 0),
        updated_at = NOW()
    WHERE driver_id = NEW.driver_id AND earning_date = trip_date;
    
    -- تحديث المتوسطات
    UPDATE driver_daily_earnings SET
        average_fare = CASE WHEN total_trips > 0 THEN total_revenue / total_trips ELSE 0 END,
        average_trip_distance = CASE WHEN total_trips > 0 THEN total_distance_km / total_trips ELSE 0 END,
        -- تقدير تكلفة الوقود (افتراض 8 كم/لتر و 0.5 دينار/لتر)
        fuel_cost_estimated = total_distance_km * 0.0625, -- 0.5/8 = 0.0625
        net_driver_profit = driver_earnings - (total_distance_km * 0.0625)
    WHERE driver_id = NEW.driver_id AND earning_date = trip_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مُحفِز لتحديث الإيرادات اليومية (حذف المحفز القديم أولاً)
DROP TRIGGER IF EXISTS update_daily_earnings_trigger ON trips;

CREATE TRIGGER update_daily_earnings_trigger
    AFTER UPDATE OF status ON trips
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION update_driver_daily_earnings();

-- 9. دالة تحديث الإيرادات الشهرية
CREATE OR REPLACE FUNCTION update_monthly_earnings()
RETURNS TRIGGER AS $$
DECLARE
    target_year INTEGER;
    target_month INTEGER;
BEGIN
    target_year := EXTRACT(YEAR FROM NEW.earning_date);
    target_month := EXTRACT(MONTH FROM NEW.earning_date);
    
    -- تحديث أو إنشاء سجل الإيرادات الشهرية
    INSERT INTO driver_monthly_earnings (
        driver_id, year, month, total_trips, total_distance_km,
        total_revenue, driver_earnings, app_commission, fuel_cost_estimated,
        net_driver_profit, working_days, surge_revenue
    ) VALUES (
        NEW.driver_id, target_year, target_month, NEW.total_trips, NEW.total_distance_km,
        NEW.total_revenue, NEW.driver_earnings, NEW.app_commission, NEW.fuel_cost_estimated,
        NEW.net_driver_profit, 1, NEW.surge_revenue
    )
    ON CONFLICT (driver_id, year, month) DO UPDATE SET
        total_trips = driver_monthly_earnings.total_trips + NEW.total_trips - COALESCE(OLD.total_trips, 0),
        total_distance_km = driver_monthly_earnings.total_distance_km + NEW.total_distance_km - COALESCE(OLD.total_distance_km, 0),
        total_revenue = driver_monthly_earnings.total_revenue + NEW.total_revenue - COALESCE(OLD.total_revenue, 0),
        driver_earnings = driver_monthly_earnings.driver_earnings + NEW.driver_earnings - COALESCE(OLD.driver_earnings, 0),
        app_commission = driver_monthly_earnings.app_commission + NEW.app_commission - COALESCE(OLD.app_commission, 0),
        fuel_cost_estimated = driver_monthly_earnings.fuel_cost_estimated + NEW.fuel_cost_estimated - COALESCE(OLD.fuel_cost_estimated, 0),
        net_driver_profit = driver_monthly_earnings.net_driver_profit + NEW.net_driver_profit - COALESCE(OLD.net_driver_profit, 0),
        surge_revenue = driver_monthly_earnings.surge_revenue + NEW.surge_revenue - COALESCE(OLD.surge_revenue, 0),
        working_days = (
            SELECT COUNT(DISTINCT earning_date)
            FROM driver_daily_earnings
            WHERE driver_id = NEW.driver_id 
            AND EXTRACT(YEAR FROM earning_date) = target_year
            AND EXTRACT(MONTH FROM earning_date) = target_month
        ),
        updated_at = NOW();
    
    -- تحديث أفضل يوم في الشهر
    UPDATE driver_monthly_earnings SET
        best_day_earnings = (
            SELECT MAX(driver_earnings)
            FROM driver_daily_earnings
            WHERE driver_id = NEW.driver_id 
            AND EXTRACT(YEAR FROM earning_date) = target_year
            AND EXTRACT(MONTH FROM earning_date) = target_month
        ),
        best_day_date = (
            SELECT earning_date
            FROM driver_daily_earnings
            WHERE driver_id = NEW.driver_id 
            AND EXTRACT(YEAR FROM earning_date) = target_year
            AND EXTRACT(MONTH FROM earning_date) = target_month
            ORDER BY driver_earnings DESC
            LIMIT 1
        ),
        average_daily_trips = CASE WHEN working_days > 0 THEN total_trips::DECIMAL / working_days ELSE 0 END
    WHERE driver_id = NEW.driver_id AND year = target_year AND month = target_month;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مُحفِز لتحديث الإيرادات الشهرية (حذف المحفز القديم أولاً)
DROP TRIGGER IF EXISTS update_monthly_earnings_trigger ON driver_daily_earnings;

CREATE TRIGGER update_monthly_earnings_trigger
    AFTER INSERT OR UPDATE ON driver_daily_earnings
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_earnings();

-- 10. إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_trips_driver_completed_date 
ON trips (driver_id, completed_at) WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_trips_fuel_type ON trips (fuel_type);

CREATE INDEX IF NOT EXISTS idx_driver_daily_earnings_date 
ON driver_daily_earnings (earning_date);

CREATE INDEX IF NOT EXISTS idx_driver_daily_earnings_driver_date 
ON driver_daily_earnings (driver_id, earning_date);

CREATE INDEX IF NOT EXISTS idx_driver_monthly_earnings_year_month 
ON driver_monthly_earnings (year, month);

CREATE INDEX IF NOT EXISTS idx_pricing_config_active 
ON pricing_config (is_active) WHERE is_active = TRUE;

-- 11. إنشاء عرض للإحصائيات السريعة
CREATE OR REPLACE VIEW driver_earnings_summary AS
SELECT 
    de.driver_id,
    mp.phone as phone_number,
    mp.full_name,
    de.earning_date,
    de.total_trips,
    de.total_distance_km,
    de.total_revenue,
    de.driver_earnings,
    de.app_commission,
    de.net_driver_profit,
    de.average_fare,
    de.average_trip_distance,
    td.fuel_type,
    td.vehicle_model,
    td.vehicle_year
FROM driver_daily_earnings de
JOIN main_profiles mp ON de.driver_id = mp.id
JOIN driver_profiles dp ON mp.id = dp.main_profile_id
JOIN taxi_drivers td ON dp.id = td.driver_profile_id
ORDER BY de.earning_date DESC, de.driver_earnings DESC;

-- 12. دالة للحصول على إحصائيات السائق
CREATE OR REPLACE FUNCTION get_driver_stats(
    p_driver_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
    total_trips_count INTEGER,
    total_distance DECIMAL(10,2),
    total_earnings DECIMAL(10,3),
    total_commission DECIMAL(10,3),
    average_trip_fare DECIMAL(8,3),
    average_trip_distance DECIMAL(8,2),
    best_day_earnings DECIMAL(10,3),
    best_day_date DATE,
    total_working_days INTEGER
) AS $$
BEGIN
    -- تعيين التواريخ الافتراضية إذا لم يتم تمريرها
    IF p_start_date IS NULL THEN
        p_start_date := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;
    
    RETURN QUERY
    SELECT 
        SUM(de.total_trips)::INTEGER,
        SUM(de.total_distance_km),
        SUM(de.driver_earnings),
        SUM(de.app_commission),
        AVG(de.average_fare),
        AVG(de.average_trip_distance),
        MAX(de.driver_earnings),
        (SELECT earning_date FROM driver_daily_earnings 
         WHERE driver_id = p_driver_id 
         AND earning_date BETWEEN p_start_date AND p_end_date
         ORDER BY driver_earnings DESC LIMIT 1),
        COUNT(*)::INTEGER
    FROM driver_daily_earnings de
    WHERE de.driver_id = p_driver_id
    AND de.earning_date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- 13. تحديث نوع الوقود الافتراضي للسائقين الموجودين
UPDATE taxi_drivers 
SET fuel_type = 'petrol' 
WHERE fuel_type IS NULL;

-- تعليق على الجداول والأعمدة
COMMENT ON TABLE pricing_config IS 'جدول إعدادات التسعير القابلة للتخصيص';
COMMENT ON TABLE driver_daily_earnings IS 'إيرادات السائقين اليومية مع تفصيل العمولات';
COMMENT ON TABLE driver_monthly_earnings IS 'ملخص الإيرادات الشهرية للسائقين';
COMMENT ON TABLE app_total_earnings IS 'إجمالي إيرادات التطبيق اليومية';

COMMENT ON COLUMN trips.fuel_type IS 'نوع وقود المركبة المستخدمة في الرحلة';
COMMENT ON COLUMN trips.total_customer_fare IS 'المبلغ الإجمالي الذي دفعه العميل';
COMMENT ON COLUMN trips.driver_earnings IS 'نصيب السائق (90% من الإجمالي)';
COMMENT ON COLUMN trips.app_commission IS 'عمولة التطبيق (10% من الإجمالي)';
COMMENT ON COLUMN trips.surge_multiplier IS 'مضاعف أسعار الذروة';
COMMENT ON COLUMN trips.waiting_time_minutes IS 'وقت الانتظار في الزحمة بالدقائق';

-- إنشاء سياسات الأمان (RLS)
ALTER TABLE driver_daily_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_monthly_earnings ENABLE ROW LEVEL SECURITY;

-- السائقون يمكنهم رؤية إيراداتهم فقط
CREATE POLICY driver_own_daily_earnings ON driver_daily_earnings
    FOR SELECT USING (driver_id = auth.uid());

CREATE POLICY driver_own_monthly_earnings ON driver_monthly_earnings
    FOR SELECT USING (driver_id = auth.uid());

-- المديرون يمكنهم رؤية جميع الإيرادات
CREATE POLICY admin_all_earnings ON driver_daily_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM main_profiles 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );

CREATE POLICY admin_all_monthly_earnings ON driver_monthly_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM main_profiles 
            WHERE id = auth.uid() 
            AND user_type = 'admin'
        )
    );
