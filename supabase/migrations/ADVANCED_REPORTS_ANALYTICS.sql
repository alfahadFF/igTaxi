-- =====================================================
-- نظام التقارير والتحليلات المتقدم
-- =====================================================

-- 1. دالة توليد تقرير الإيرادات اليومية
CREATE OR REPLACE FUNCTION generate_daily_revenue_report(
    p_report_date DATE DEFAULT CURRENT_DATE
) RETURNS JSONB AS $$
DECLARE
    total_trips_count INTEGER;
    total_revenue_amount DECIMAL(12,3);
    total_distance_km DECIMAL(12,2);
    avg_fare DECIMAL(8,3);
    zone_stats JSONB;
    time_stats JSONB;
    fuel_stats JSONB;
    weather_impact JSONB;
    result JSONB;
BEGIN
    -- الإحصائيات الأساسية
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_customer_fare), 0),
        COALESCE(SUM(distance_km), 0),
        COALESCE(AVG(total_customer_fare), 0)
    INTO total_trips_count, total_revenue_amount, total_distance_km, avg_fare
    FROM trips
    WHERE DATE(created_at) = p_report_date
    AND trip_status = 'completed';
    
    -- إحصائيات المناطق
    SELECT jsonb_object_agg(
        COALESCE(pz.zone_name, 'غير محدد'),
        jsonb_build_object(
            'trips', COUNT(*),
            'revenue', COALESCE(SUM(t.total_customer_fare), 0),
            'avg_fare', COALESCE(AVG(t.total_customer_fare), 0)
        )
    ) INTO zone_stats
    FROM trips t
    LEFT JOIN pricing_zones pz ON t.pickup_zone_id = pz.id
    WHERE DATE(t.created_at) = p_report_date
    AND t.trip_status = 'completed'
    GROUP BY pz.zone_name;
    
    -- إحصائيات الأوقات (بالساعات)
    SELECT jsonb_object_agg(
        EXTRACT(HOUR FROM created_at)::TEXT,
        jsonb_build_object(
            'trips', COUNT(*),
            'revenue', COALESCE(SUM(total_customer_fare), 0)
        )
    ) INTO time_stats
    FROM trips
    WHERE DATE(created_at) = p_report_date
    AND trip_status = 'completed'
    GROUP BY EXTRACT(HOUR FROM created_at);
    
    -- إحصائيات أنواع الوقود
    SELECT jsonb_object_agg(
        fuel_type,
        jsonb_build_object(
            'trips', COUNT(*),
            'revenue', COALESCE(SUM(total_customer_fare), 0),
            'avg_distance', COALESCE(AVG(distance_km), 0)
        )
    ) INTO fuel_stats
    FROM trips
    WHERE DATE(created_at) = p_report_date
    AND trip_status = 'completed'
    GROUP BY fuel_type;
    
    -- تأثير الطقس
    SELECT jsonb_object_agg(
        COALESCE(wc.weather_type, 'واضح'),
        jsonb_build_object(
            'trips', COUNT(*),
            'avg_multiplier', COALESCE(AVG(t.weather_multiplier), 1.0),
            'revenue_impact', COALESCE(SUM(t.total_customer_fare * (t.weather_multiplier - 1)), 0)
        )
    ) INTO weather_impact
    FROM trips t
    LEFT JOIN weather_conditions wc ON t.weather_conditions_id = wc.id
    WHERE DATE(t.created_at) = p_report_date
    AND t.trip_status = 'completed'
    GROUP BY wc.weather_type;
    
    -- تجميع التقرير النهائي
    result := jsonb_build_object(
        'report_date', p_report_date,
        'summary', jsonb_build_object(
            'total_trips', total_trips_count,
            'total_revenue', total_revenue_amount,
            'total_distance_km', total_distance_km,
            'average_fare', avg_fare,
            'revenue_per_km', CASE WHEN total_distance_km > 0 THEN total_revenue_amount / total_distance_km ELSE 0 END
        ),
        'breakdown', jsonb_build_object(
            'by_zone', COALESCE(zone_stats, '{}'::jsonb),
            'by_hour', COALESCE(time_stats, '{}'::jsonb),
            'by_fuel_type', COALESCE(fuel_stats, '{}'::jsonb),
            'weather_impact', COALESCE(weather_impact, '{}'::jsonb)
        ),
        'generated_at', NOW()
    );
    
    -- حفظ التقرير في cache
    INSERT INTO advanced_reports_cache (
        report_type, report_period, report_date,
        total_trips, total_revenue, total_distance, average_fare,
        zone_breakdown, time_breakdown, fuel_type_breakdown, weather_impact_analysis
    ) VALUES (
        'daily_revenue', 'daily', p_report_date,
        total_trips_count, total_revenue_amount, total_distance_km, avg_fare,
        COALESCE(zone_stats, '{}'::jsonb),
        COALESCE(time_stats, '{}'::jsonb),
        COALESCE(fuel_stats, '{}'::jsonb),
        COALESCE(weather_impact, '{}'::jsonb)
    ) ON CONFLICT (report_type, report_period, report_date) 
    DO UPDATE SET
        total_trips = EXCLUDED.total_trips,
        total_revenue = EXCLUDED.total_revenue,
        total_distance = EXCLUDED.total_distance,
        average_fare = EXCLUDED.average_fare,
        zone_breakdown = EXCLUDED.zone_breakdown,
        time_breakdown = EXCLUDED.time_breakdown,
        fuel_type_breakdown = EXCLUDED.fuel_type_breakdown,
        weather_impact_analysis = EXCLUDED.weather_impact_analysis,
        generated_at = NOW();
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. دالة تحليل أداء السائقين
CREATE OR REPLACE FUNCTION analyze_driver_performance(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    driver_phone TEXT,
    total_trips INTEGER,
    total_earnings DECIMAL(12,3),
    avg_trip_fare DECIMAL(8,3),
    total_distance DECIMAL(12,2),
    avg_rating DECIMAL(3,2),
    efficiency_score DECIMAL(5,2),
    loyalty_impact DECIMAL(8,3),
    peak_hours_percentage DECIMAL(5,2),
    preferred_zones TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mp.id as driver_id,
        mp.full_name as driver_name,
        mp.phone as driver_phone,
        COUNT(t.id)::INTEGER as total_trips,
        COALESCE(SUM(t.driver_earnings), 0) as total_earnings,
        COALESCE(AVG(t.total_customer_fare), 0) as avg_trip_fare,
        COALESCE(SUM(t.distance_km), 0) as total_distance,
        COALESCE(AVG(dp.average_rating), 0) as avg_rating,
        
        -- نقاط الكفاءة (based on trips per day, earnings per km, etc.)
        CASE 
            WHEN SUM(t.distance_km) > 0 THEN 
                (COUNT(t.id)::DECIMAL / EXTRACT(days FROM p_end_date - p_start_date)) * 10 +
                (SUM(t.driver_earnings) / SUM(t.distance_km)) * 100
            ELSE 0 
        END as efficiency_score,
        
        -- تأثير الولاء (إجمالي خصومات الولاء المطبقة)
        COALESCE(SUM(t.loyalty_discount_applied), 0) as loyalty_impact,
        
        -- نسبة رحلات أوقات الذروة
        (COUNT(CASE WHEN t.time_based_multiplier > 1.1 THEN 1 END)::DECIMAL / NULLIF(COUNT(t.id), 0) * 100) as peak_hours_percentage,
        
        -- المناطق المفضلة (أكثر 3 مناطق)
        ARRAY(
            SELECT pz.zone_name 
            FROM trips t2 
            JOIN pricing_zones pz ON t2.pickup_zone_id = pz.id
            WHERE t2.driver_id = mp.id 
            AND DATE(t2.created_at) BETWEEN p_start_date AND p_end_date
            GROUP BY pz.zone_name 
            ORDER BY COUNT(*) DESC 
            LIMIT 3
        ) as preferred_zones
        
    FROM main_profiles mp
    JOIN driver_profiles dp ON mp.id = dp.main_profile_id
    LEFT JOIN trips t ON mp.id = t.driver_id 
        AND DATE(t.created_at) BETWEEN p_start_date AND p_end_date
        AND t.trip_status = 'completed'
    WHERE mp.profile_type = 'driver'
    GROUP BY mp.id, mp.full_name, mp.phone, dp.average_rating
    ORDER BY total_earnings DESC;
END;
$$ LANGUAGE plpgsql;

-- 3. دالة توقع الإيرادات
CREATE OR REPLACE FUNCTION forecast_revenue(
    p_days_ahead INTEGER DEFAULT 7
) RETURNS TABLE (
    forecast_date DATE,
    predicted_trips INTEGER,
    predicted_revenue DECIMAL(12,3),
    confidence_level DECIMAL(5,2),
    factors JSONB
) AS $$
DECLARE
    historical_data RECORD;
    seasonal_factor DECIMAL(4,2);
    trend_factor DECIMAL(4,2);
    weather_factor DECIMAL(4,2);
    day_of_week INTEGER;
    forecast_day DATE;
BEGIN
    FOR i IN 1..p_days_ahead LOOP
        forecast_day := CURRENT_DATE + i;
        day_of_week := EXTRACT(DOW FROM forecast_day);
        
        -- حساب متوسط الرحلات والإيرادات لنفس يوم الأسبوع في الشهر الماضي
        SELECT 
            AVG(trip_count)::INTEGER as avg_trips,
            AVG(revenue)::DECIMAL(12,3) as avg_revenue
        INTO historical_data
        FROM (
            SELECT 
                DATE(created_at) as trip_date,
                COUNT(*) as trip_count,
                SUM(total_customer_fare) as revenue
            FROM trips
            WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
            AND DATE(created_at) < CURRENT_DATE
            AND EXTRACT(DOW FROM created_at) = day_of_week
            AND trip_status = 'completed'
            GROUP BY DATE(created_at)
        ) daily_stats;
        
        -- عوامل التعديل
        seasonal_factor := 1.0; -- يمكن تطويرها لاحقاً
        trend_factor := 1.05; -- افتراض نمو 5%
        weather_factor := 1.0; -- يمكن ربطها بتوقعات الطقس
        
        -- إذا كان عطلة نهاية أسبوع
        IF day_of_week IN (0, 6) THEN
            seasonal_factor := seasonal_factor * 0.8;
        END IF;
        
        RETURN QUERY SELECT
            forecast_day,
            COALESCE((historical_data.avg_trips * seasonal_factor * trend_factor)::INTEGER, 0),
            COALESCE(historical_data.avg_revenue * seasonal_factor * trend_factor * weather_factor, 0),
            CASE 
                WHEN historical_data.avg_trips > 10 THEN 85.0
                WHEN historical_data.avg_trips > 5 THEN 70.0
                ELSE 50.0
            END as confidence_level,
            jsonb_build_object(
                'seasonal_factor', seasonal_factor,
                'trend_factor', trend_factor,
                'weather_factor', weather_factor,
                'day_of_week', day_of_week,
                'historical_trips', COALESCE(historical_data.avg_trips, 0),
                'historical_revenue', COALESCE(historical_data.avg_revenue, 0)
            );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة تحليل تأثير العروض والخصومات
CREATE OR REPLACE FUNCTION analyze_promotions_impact(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    coupon_code TEXT,
    usage_count INTEGER,
    total_discount_given DECIMAL(12,3),
    revenue_generated DECIMAL(12,3),
    new_customers_acquired INTEGER,
    roi_percentage DECIMAL(8,2),
    avg_trip_value DECIMAL(8,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.coupon_code::TEXT,
        COUNT(cul.id)::INTEGER as usage_count,
        COALESCE(SUM(cul.discount_applied), 0) as total_discount_given,
        COALESCE(SUM(cul.final_fare), 0) as revenue_generated,
        COUNT(DISTINCT CASE 
            WHEN cl.first_trip_date >= p_start_date THEN cul.customer_id 
        END)::INTEGER as new_customers_acquired,
        
        -- حساب العائد على الاستثمار
        CASE 
            WHEN SUM(cul.discount_applied) > 0 THEN
                ((SUM(cul.final_fare) - SUM(cul.discount_applied)) / SUM(cul.discount_applied)) * 100
            ELSE 0
        END as roi_percentage,
        
        COALESCE(AVG(cul.final_fare), 0) as avg_trip_value
        
    FROM discount_coupons dc
    LEFT JOIN coupon_usage_log cul ON dc.id = cul.coupon_id
        AND DATE(cul.used_at) BETWEEN p_start_date AND p_end_date
    LEFT JOIN customer_loyalty cl ON cul.customer_id = cl.customer_id
    WHERE dc.created_at <= p_end_date
    GROUP BY dc.coupon_code
    ORDER BY revenue_generated DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة تحليل كفاءة استهلاك الوقود
CREATE OR REPLACE FUNCTION analyze_fuel_efficiency(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    fuel_type TEXT,
    total_trips INTEGER,
    total_distance DECIMAL(12,2),
    total_fuel_cost DECIMAL(12,3),
    avg_consumption_per_km DECIMAL(8,4),
    cost_per_trip DECIMAL(8,3),
    environmental_score DECIMAL(5,2),
    savings_vs_petrol DECIMAL(8,3)
) AS $$
DECLARE
    petrol_avg_cost DECIMAL(8,3);
BEGIN
    -- حساب متوسط تكلفة البنزين للمقارنة
    SELECT AVG(distance_fare / distance_km) INTO petrol_avg_cost
    FROM trips
    WHERE fuel_type = 'petrol'
    AND distance_km > 0
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date;
    
    RETURN QUERY
    SELECT 
        t.fuel_type::TEXT,
        COUNT(*)::INTEGER as total_trips,
        COALESCE(SUM(t.distance_km), 0) as total_distance,
        COALESCE(SUM(t.distance_fare), 0) as total_fuel_cost,
        
        -- متوسط الاستهلاك لكل كيلومتر
        CASE 
            WHEN SUM(t.distance_km) > 0 THEN 
                SUM(t.distance_fare) / SUM(t.distance_km)
            ELSE 0 
        END as avg_consumption_per_km,
        
        COALESCE(AVG(t.distance_fare), 0) as cost_per_trip,
        
        -- نقاط بيئية (كهربائي = 100، هجين = 80، ديزل = 60، بنزين = 40)
        CASE t.fuel_type
            WHEN 'electric' THEN 100.0
            WHEN 'hybrid' THEN 80.0
            WHEN 'diesel' THEN 60.0
            WHEN 'petrol' THEN 40.0
            ELSE 50.0
        END as environmental_score,
        
        -- التوفير مقارنة بالبنزين
        COALESCE(
            (petrol_avg_cost - (SUM(t.distance_fare) / NULLIF(SUM(t.distance_km), 0))) * SUM(t.distance_km), 
            0
        ) as savings_vs_petrol
        
    FROM trips t
    WHERE DATE(t.created_at) BETWEEN p_start_date AND p_end_date
    AND t.trip_status = 'completed'
    AND t.distance_km > 0
    GROUP BY t.fuel_type
    ORDER BY environmental_score DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. دالة تحديث تسعير الوقود التلقائي
CREATE OR REPLACE FUNCTION update_fuel_pricing_auto() RETURNS VOID AS $$
DECLARE
    latest_prices RECORD;
    config_id INTEGER;
BEGIN
    -- الحصول على أحدث أسعار الوقود
    FOR latest_prices IN 
        SELECT DISTINCT ON (fuel_type) 
            fuel_type, 
            price_per_liter,
            effective_from
        FROM fuel_price_history
        WHERE effective_from <= CURRENT_DATE
        ORDER BY fuel_type, effective_from DESC
    LOOP
        -- تحديث إعدادات التسعير بناءً على أسعار الوقود الجديدة
        -- معادلة: سعر التطبيق = (سعر اللتر / متوسط الاستهلاك) * مضاعف الربح
        -- افتراض: 8 كم/لتر، مضاعف ربح 1.8
        
        UPDATE advanced_pricing_config SET
            fuel_rates = jsonb_set(
                fuel_rates,
                ARRAY[latest_prices.fuel_type],
                to_jsonb(ROUND((latest_prices.price_per_liter / 8.0 * 1.8)::NUMERIC, 3))
            ),
            updated_at = NOW()
        WHERE is_active = TRUE;
        
        -- تسجيل التغيير في سجل المراجعة
        INSERT INTO pricing_audit_log (
            table_name, record_id, action_type, 
            new_values, change_reason, changed_by
        ) VALUES (
            'advanced_pricing_config', 
            (SELECT id FROM advanced_pricing_config WHERE is_active = TRUE LIMIT 1),
            'UPDATE',
            jsonb_build_object('fuel_rates', jsonb_build_object(latest_prices.fuel_type, ROUND((latest_prices.price_per_liter / 8.0 * 1.8)::NUMERIC, 3))),
            'تحديث تلقائي لأسعار الوقود بناءً على السوق',
            NULL
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. دالة تنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS VOID AS $$
BEGIN
    -- حذف سجل الطقس الأقدم من 90 يوماً
    DELETE FROM weather_conditions 
    WHERE valid_until < CURRENT_DATE - INTERVAL '90 days';
    
    -- أرشفة التقارير الأقدم من سنة
    DELETE FROM advanced_reports_cache 
    WHERE generated_at < CURRENT_DATE - INTERVAL '1 year';
    
    -- تنظيف سجل استخدام الكوبونات الأقدم من سنتين
    DELETE FROM coupon_usage_log 
    WHERE used_at < CURRENT_DATE - INTERVAL '2 years';
    
    -- حذف الكوبونات المنتهية الصلاحية القديمة
    DELETE FROM discount_coupons 
    WHERE valid_until < CURRENT_DATE - INTERVAL '6 months'
    AND is_active = FALSE;
    
    RAISE NOTICE 'تم تنظيف البيانات القديمة بنجاح';
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء مهام مجدولة (يحتاج تفعيل من مدير النظام)
-- Schedule daily report generation
-- SELECT cron.schedule('daily-reports', '0 1 * * *', 'SELECT generate_daily_revenue_report();');

-- Schedule weekly fuel price updates
-- SELECT cron.schedule('fuel-price-update', '0 2 * * 1', 'SELECT update_fuel_pricing_auto();');

-- Schedule monthly data cleanup
-- SELECT cron.schedule('monthly-cleanup', '0 3 1 * *', 'SELECT cleanup_old_data();');

-- 9. رسالة تأكيد
SELECT 'تم إنشاء نظام التقارير والتحليلات المتقدم بنجاح! 📊' as status;
