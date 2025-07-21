-- =====================================================
-- دوال حساب التسعير المتقدم
-- =====================================================

-- 1. دالة تحديد المنطقة الجغرافية
CREATE OR REPLACE FUNCTION get_zone_by_coordinates(
    p_lat DECIMAL(10, 8),
    p_lng DECIMAL(11, 8)
) RETURNS INTEGER AS $$
DECLARE
    zone_id INTEGER;
BEGIN
    -- البحث عن المنطقة التي تحتوي على النقطة
    -- هذا مثال مبسط - في الواقع نحتاج خوارزمية Point-in-Polygon
    SELECT id INTO zone_id
    FROM pricing_zones
    WHERE ST_Contains(
        ST_GeomFromGeoJSON(zone_boundaries::text),
        ST_Point(p_lng, p_lat)
    )
    AND is_active = TRUE
    LIMIT 1;
    
    -- إذا لم نجد منطقة محددة، نرجع المنطقة الافتراضية
    IF zone_id IS NULL THEN
        SELECT id INTO zone_id
        FROM pricing_zones
        WHERE zone_code = 'DEFAULT'
        LIMIT 1;
    END IF;
    
    RETURN COALESCE(zone_id, 1);
END;
$$ LANGUAGE plpgsql;

-- 2. دالة حساب مضاعف الوقت
CREATE OR REPLACE FUNCTION get_time_multiplier(
    p_trip_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    trip_hour INTEGER;
    trip_dow INTEGER; -- day of week
    multiplier DECIMAL(4,2) := 1.0;
    config_row advanced_pricing_config%ROWTYPE;
    time_settings JSONB;
BEGIN
    -- الحصول على إعدادات التسعير
    SELECT * INTO config_row
    FROM advanced_pricing_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN 1.0;
    END IF;
    
    trip_hour := EXTRACT(HOUR FROM p_trip_time);
    trip_dow := EXTRACT(DOW FROM p_trip_time);
    time_settings := config_row.time_based_pricing;
    
    -- فحص أوقات الذروة الصباحية
    IF trip_hour >= 7 AND trip_hour <= 9 THEN
        multiplier := GREATEST(multiplier, (time_settings->'peak_morning'->>'multiplier')::DECIMAL(4,2));
    END IF;
    
    -- فحص أوقات الذروة المسائية
    IF trip_hour >= 17 AND trip_hour <= 19 THEN
        multiplier := GREATEST(multiplier, (time_settings->'peak_evening'->>'multiplier')::DECIMAL(4,2));
    END IF;
    
    -- فحص الأوقات الليلية
    IF trip_hour >= 22 OR trip_hour <= 6 THEN
        multiplier := GREATEST(multiplier, (time_settings->'night'->>'multiplier')::DECIMAL(4,2));
    END IF;
    
    -- فحص عطلة نهاية الأسبوع
    IF trip_dow = 0 OR trip_dow = 6 THEN
        multiplier := multiplier * (time_settings->'weekend'->>'multiplier')::DECIMAL(4,2);
    END IF;
    
    RETURN multiplier;
END;
$$ LANGUAGE plpgsql;

-- 3. دالة حساب خصم الولاء
CREATE OR REPLACE FUNCTION get_loyalty_discount(
    p_customer_id UUID,
    p_trip_amount DECIMAL(8,3)
) RETURNS DECIMAL(8,3) AS $$
DECLARE
    loyalty_info customer_loyalty%ROWTYPE;
    discount_rate DECIMAL(4,3) := 0;
    max_discount DECIMAL(8,3);
BEGIN
    -- الحصول على معلومات الولاء
    SELECT * INTO loyalty_info
    FROM customer_loyalty
    WHERE customer_id = p_customer_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- تحديد نسبة الخصم حسب مستوى الولاء
    CASE loyalty_info.loyalty_level
        WHEN 'bronze' THEN discount_rate := 0.02; max_discount := 0.50;
        WHEN 'silver' THEN discount_rate := 0.05; max_discount := 1.00;
        WHEN 'gold' THEN discount_rate := 0.08; max_discount := 2.00;
        WHEN 'platinum' THEN discount_rate := 0.12; max_discount := 3.00;
        ELSE discount_rate := 0;
    END CASE;
    
    -- حساب الخصم مع تطبيق الحد الأقصى
    RETURN LEAST(p_trip_amount * discount_rate, max_discount);
END;
$$ LANGUAGE plpgsql;

-- 4. دالة التحقق من صحة الكوبون
CREATE OR REPLACE FUNCTION validate_coupon(
    p_coupon_code VARCHAR(20),
    p_customer_id UUID,
    p_trip_amount DECIMAL(8,3),
    p_pickup_zone_id INTEGER
) RETURNS JSONB AS $$
DECLARE
    coupon_info discount_coupons%ROWTYPE;
    customer_usage_count INTEGER;
    result JSONB := '{"valid": false, "discount": 0, "message": ""}';
BEGIN
    -- البحث عن الكوبون
    SELECT * INTO coupon_info
    FROM discount_coupons
    WHERE coupon_code = p_coupon_code
    AND is_active = TRUE
    AND valid_from <= NOW()
    AND (valid_until IS NULL OR valid_until >= NOW());
    
    IF NOT FOUND THEN
        result := jsonb_set(result, '{message}', '"كود الخصم غير صالح أو منتهي الصلاحية"');
        RETURN result;
    END IF;
    
    -- فحص عدد الاستخدامات الإجمالية
    IF coupon_info.max_uses_total IS NOT NULL 
       AND coupon_info.current_uses >= coupon_info.max_uses_total THEN
        result := jsonb_set(result, '{message}', '"تم استنفاد عدد مرات استخدام هذا الكوبون"');
        RETURN result;
    END IF;
    
    -- فحص عدد استخدامات العميل
    SELECT COUNT(*) INTO customer_usage_count
    FROM coupon_usage_log
    WHERE coupon_id = coupon_info.id AND customer_id = p_customer_id;
    
    IF coupon_info.max_uses_per_customer IS NOT NULL 
       AND customer_usage_count >= coupon_info.max_uses_per_customer THEN
        result := jsonb_set(result, '{message}', '"لقد استنفدت عدد مرات استخدام هذا الكوبون"');
        RETURN result;
    END IF;
    
    -- فحص الحد الأدنى لقيمة الرحلة
    IF coupon_info.min_trip_amount IS NOT NULL 
       AND p_trip_amount < coupon_info.min_trip_amount THEN
        result := jsonb_set(result, '{message}', '"قيمة الرحلة أقل من الحد الأدنى المطلوب"');
        RETURN result;
    END IF;
    
    -- حساب قيمة الخصم
    DECLARE
        discount_amount DECIMAL(8,3);
    BEGIN
        IF coupon_info.coupon_type = 'percentage' THEN
            discount_amount := p_trip_amount * (coupon_info.discount_value / 100);
            IF coupon_info.max_discount_amount IS NOT NULL THEN
                discount_amount := LEAST(discount_amount, coupon_info.max_discount_amount);
            END IF;
        ELSIF coupon_info.coupon_type = 'fixed_amount' THEN
            discount_amount := coupon_info.discount_value;
        ELSE
            discount_amount := 0;
        END IF;
        
        result := jsonb_build_object(
            'valid', true,
            'discount', discount_amount,
            'message', 'تم تطبيق الخصم بنجاح',
            'coupon_id', coupon_info.id
        );
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة حساب التسعير المتقدم الشاملة
CREATE OR REPLACE FUNCTION calculate_advanced_trip_fare(
    p_distance_km DECIMAL,
    p_fuel_type VARCHAR(20) DEFAULT 'petrol',
    p_waiting_time_minutes INTEGER DEFAULT 0,
    p_pickup_lat DECIMAL(10, 8) DEFAULT NULL,
    p_pickup_lng DECIMAL(11, 8) DEFAULT NULL,
    p_dropoff_lat DECIMAL(10, 8) DEFAULT NULL,
    p_dropoff_lng DECIMAL(11, 8) DEFAULT NULL,
    p_vehicle_size VARCHAR(20) DEFAULT 'sedan',
    p_traffic_level INTEGER DEFAULT 1,
    p_weather_conditions VARCHAR(50) DEFAULT 'clear',
    p_customer_id UUID DEFAULT NULL,
    p_coupon_code VARCHAR(20) DEFAULT NULL,
    p_trip_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) RETURNS TABLE (
    base_fare DECIMAL(8,3),
    distance_fare DECIMAL(8,3),
    waiting_charges DECIMAL(8,3),
    time_multiplier DECIMAL(4,2),
    zone_multiplier DECIMAL(4,2),
    weather_multiplier DECIMAL(4,2),
    traffic_multiplier DECIMAL(4,2),
    vehicle_size_multiplier DECIMAL(4,2),
    subtotal_before_adjustments DECIMAL(8,3),
    surge_amount DECIMAL(8,3),
    distance_discount DECIMAL(8,3),
    loyalty_discount DECIMAL(8,3),
    coupon_discount DECIMAL(8,3),
    minimum_fare_applied BOOLEAN,
    total_fare DECIMAL(8,3),
    driver_earnings DECIMAL(8,3),
    app_commission DECIMAL(8,3),
    fare_breakdown JSONB
) AS $$
DECLARE
    config_row advanced_pricing_config%ROWTYPE;
    
    -- متغيرات الحساب
    v_base_fare DECIMAL(8,3) := 0.35;
    v_distance_fare DECIMAL(8,3);
    v_waiting_charges DECIMAL(8,3);
    v_fuel_rate DECIMAL(8,3) := 0.17;
    
    -- المضاعفات
    v_time_multiplier DECIMAL(4,2) := 1.0;
    v_zone_multiplier DECIMAL(4,2) := 1.0;
    v_weather_multiplier DECIMAL(4,2) := 1.0;
    v_traffic_multiplier DECIMAL(4,2) := 1.0;
    v_vehicle_multiplier DECIMAL(4,2) := 1.0;
    
    -- المبالغ
    v_subtotal_before DECIMAL(8,3);
    v_surge_amount DECIMAL(8,3) := 0;
    v_distance_discount DECIMAL(8,3) := 0;
    v_loyalty_discount DECIMAL(8,3) := 0;
    v_coupon_discount DECIMAL(8,3) := 0;
    v_total_fare DECIMAL(8,3);
    v_minimum_applied BOOLEAN := FALSE;
    v_driver_earnings DECIMAL(8,3);
    v_app_commission DECIMAL(8,3);
    
    -- معلومات المناطق
    pickup_zone_id INTEGER;
    dropoff_zone_id INTEGER;
    
    -- معلومات الكوبون
    coupon_validation JSONB;
    
    -- تفصيل شامل
    v_breakdown JSONB;
BEGIN
    -- الحصول على إعدادات التسعير
    SELECT * INTO config_row
    FROM advanced_pricing_config
    WHERE is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- تعيين القيم الافتراضية إذا لم نجد إعدادات
    IF FOUND THEN
        v_base_fare := config_row.base_fare;
        v_fuel_rate := (config_row.fuel_rates ->> p_fuel_type)::DECIMAL(8,3);
    END IF;
    
    -- تحديد المناطق الجغرافية
    IF p_pickup_lat IS NOT NULL AND p_pickup_lng IS NOT NULL THEN
        pickup_zone_id := get_zone_by_coordinates(p_pickup_lat, p_pickup_lng);
    END IF;
    
    IF p_dropoff_lat IS NOT NULL AND p_dropoff_lng IS NOT NULL THEN
        dropoff_zone_id := get_zone_by_coordinates(p_dropoff_lat, p_dropoff_lng);
    END IF;
    
    -- حساب الرسوم الأساسية
    v_distance_fare := p_distance_km * v_fuel_rate;
    v_waiting_charges := p_waiting_time_minutes * 0.03;
    
    -- حساب المضاعفات
    v_time_multiplier := get_time_multiplier(p_trip_time);
    
    -- مضاعف المنطقة (متوسط منطقتي الانطلاق والوصول)
    IF pickup_zone_id IS NOT NULL THEN
        SELECT COALESCE(base_multiplier, 1.0) INTO v_zone_multiplier
        FROM pricing_zones WHERE id = pickup_zone_id;
    END IF;
    
    -- مضاعف الطقس
    CASE p_weather_conditions
        WHEN 'rain' THEN v_weather_multiplier := 1.2;
        WHEN 'storm' THEN v_weather_multiplier := 1.5;
        WHEN 'fog' THEN v_weather_multiplier := 1.3;
        WHEN 'extreme_heat' THEN v_weather_multiplier := 1.1;
        ELSE v_weather_multiplier := 1.0;
    END CASE;
    
    -- مضاعف المرور
    v_traffic_multiplier := 1.0 + (p_traffic_level - 1) * 0.1;
    
    -- مضاعف حجم المركبة
    CASE p_vehicle_size
        WHEN 'compact' THEN v_vehicle_multiplier := 1.0;
        WHEN 'sedan' THEN v_vehicle_multiplier := 1.1;
        WHEN 'suv' THEN v_vehicle_multiplier := 1.3;
        WHEN 'van' THEN v_vehicle_multiplier := 1.5;
        WHEN 'luxury' THEN v_vehicle_multiplier := 2.0;
        ELSE v_vehicle_multiplier := 1.1;
    END CASE;
    
    -- حساب المجموع قبل التعديلات
    v_subtotal_before := (v_base_fare + v_distance_fare + v_waiting_charges) 
                        * v_time_multiplier 
                        * v_zone_multiplier 
                        * v_weather_multiplier 
                        * v_traffic_multiplier 
                        * v_vehicle_multiplier;
    
    -- خصم المسافات الطويلة
    IF p_distance_km >= 100 THEN
        v_distance_discount := v_subtotal_before * 0.15;
    ELSIF p_distance_km >= 50 THEN
        v_distance_discount := v_subtotal_before * 0.10;
    ELSIF p_distance_km >= 20 THEN
        v_distance_discount := v_subtotal_before * 0.05;
    END IF;
    
    -- خصم الولاء
    IF p_customer_id IS NOT NULL THEN
        v_loyalty_discount := get_loyalty_discount(p_customer_id, v_subtotal_before);
    END IF;
    
    -- التحقق من الكوبون
    IF p_coupon_code IS NOT NULL AND p_customer_id IS NOT NULL THEN
        coupon_validation := validate_coupon(p_coupon_code, p_customer_id, v_subtotal_before, pickup_zone_id);
        IF (coupon_validation->>'valid')::BOOLEAN THEN
            v_coupon_discount := (coupon_validation->>'discount')::DECIMAL(8,3);
        END IF;
    END IF;
    
    -- حساب المجموع النهائي
    v_total_fare := v_subtotal_before - v_distance_discount - v_loyalty_discount - v_coupon_discount;
    
    -- تطبيق الحد الأدنى
    IF v_total_fare < 0.90 THEN
        v_total_fare := 0.90;
        v_minimum_applied := TRUE;
    END IF;
    
    -- تقسيم الأرباح
    v_app_commission := v_total_fare * 0.10;
    v_driver_earnings := v_total_fare - v_app_commission;
    
    -- إنشاء تفصيل شامل
    v_breakdown := jsonb_build_object(
        'calculation_details', jsonb_build_object(
            'base_calculation', jsonb_build_object(
                'base_fare', v_base_fare,
                'distance_km', p_distance_km,
                'fuel_rate', v_fuel_rate,
                'distance_fare', v_distance_fare,
                'waiting_minutes', p_waiting_time_minutes,
                'waiting_charges', v_waiting_charges
            ),
            'multipliers', jsonb_build_object(
                'time_multiplier', v_time_multiplier,
                'zone_multiplier', v_zone_multiplier,
                'weather_multiplier', v_weather_multiplier,
                'traffic_multiplier', v_traffic_multiplier,
                'vehicle_size_multiplier', v_vehicle_multiplier
            ),
            'discounts', jsonb_build_object(
                'distance_discount', v_distance_discount,
                'loyalty_discount', v_loyalty_discount,
                'coupon_discount', v_coupon_discount
            )
        ),
        'trip_conditions', jsonb_build_object(
            'fuel_type', p_fuel_type,
            'vehicle_size', p_vehicle_size,
            'weather_conditions', p_weather_conditions,
            'traffic_level', p_traffic_level,
            'pickup_zone_id', pickup_zone_id,
            'dropoff_zone_id', dropoff_zone_id
        )
    );
    
    -- إرجاع النتائج
    RETURN QUERY SELECT 
        v_base_fare,
        v_distance_fare,
        v_waiting_charges,
        v_time_multiplier,
        v_zone_multiplier,
        v_weather_multiplier,
        v_traffic_multiplier,
        v_vehicle_multiplier,
        v_subtotal_before,
        v_surge_amount,
        v_distance_discount,
        v_loyalty_discount,
        v_coupon_discount,
        v_minimum_applied,
        v_total_fare,
        v_driver_earnings,
        v_app_commission,
        v_breakdown;
END;
$$ LANGUAGE plpgsql;

-- 6. دالة تحديث إحصائيات الولاء
CREATE OR REPLACE FUNCTION update_customer_loyalty(
    p_customer_id UUID,
    p_trip_amount DECIMAL(8,3)
) RETURNS VOID AS $$
DECLARE
    current_stats customer_loyalty%ROWTYPE;
    new_level VARCHAR(20);
BEGIN
    -- الحصول على الإحصائيات الحالية أو إنشاءها
    SELECT * INTO current_stats
    FROM customer_loyalty
    WHERE customer_id = p_customer_id;
    
    IF NOT FOUND THEN
        INSERT INTO customer_loyalty (customer_id, total_trips, total_spent, first_trip_date, last_trip_date)
        VALUES (p_customer_id, 1, p_trip_amount, CURRENT_DATE, CURRENT_DATE);
        RETURN;
    END IF;
    
    -- تحديث الإحصائيات
    UPDATE customer_loyalty SET
        total_trips = total_trips + 1,
        total_spent = total_spent + p_trip_amount,
        last_trip_date = CURRENT_DATE,
        loyalty_points = loyalty_points + FLOOR(p_trip_amount * 10), -- 10 نقاط لكل دينار
        updated_at = NOW()
    WHERE customer_id = p_customer_id;
    
    -- تحديد المستوى الجديد
    SELECT total_trips INTO current_stats.total_trips
    FROM customer_loyalty
    WHERE customer_id = p_customer_id;
    
    IF current_stats.total_trips >= 200 THEN
        new_level := 'platinum';
    ELSIF current_stats.total_trips >= 100 THEN
        new_level := 'gold';
    ELSIF current_stats.total_trips >= 50 THEN
        new_level := 'silver';
    ELSE
        new_level := 'bronze';
    END IF;
    
    -- تحديث المستوى إذا تغير
    UPDATE customer_loyalty SET
        loyalty_level = new_level
    WHERE customer_id = p_customer_id
    AND loyalty_level != new_level;
END;
$$ LANGUAGE plpgsql;

-- 7. رسالة تأكيد
SELECT 'تم إنشاء دوال التسعير المتقدم بنجاح! 🎯' as status;
