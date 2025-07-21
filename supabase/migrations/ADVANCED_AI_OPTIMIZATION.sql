-- =====================================================
-- نظام التحكم الذكي والتحسين التلقائي
-- =====================================================

-- 1. جدول خوارزميات التحسين الذكي
CREATE TABLE IF NOT EXISTS ai_optimization_config (
    id SERIAL PRIMARY KEY,
    algorithm_name VARCHAR(100) NOT NULL UNIQUE,
    algorithm_type VARCHAR(50) NOT NULL, -- demand_prediction, dynamic_pricing, route_optimization
    
    -- معاملات الخوارزمية
    algorithm_parameters JSONB NOT NULL DEFAULT '{}',
    learning_rate DECIMAL(6,4) DEFAULT 0.01,
    confidence_threshold DECIMAL(4,3) DEFAULT 0.75,
    
    -- بيانات الأداء
    accuracy_score DECIMAL(5,4),
    last_training_date TIMESTAMP WITH TIME ZONE,
    training_data_size INTEGER,
    validation_score DECIMAL(5,4),
    
    -- حالة التشغيل
    is_active BOOLEAN DEFAULT TRUE,
    auto_retrain BOOLEAN DEFAULT TRUE,
    retrain_frequency_hours INTEGER DEFAULT 24,
    
    -- تتبع الاستخدام
    total_predictions INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول توقعات الطلب الذكية
CREATE TABLE IF NOT EXISTS demand_predictions (
    id SERIAL PRIMARY KEY,
    prediction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- المعلومات الجغرافية
    zone_id INTEGER REFERENCES pricing_zones(id),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    -- توقعات الطلب
    predicted_demand_level INTEGER, -- 1-10 scale
    confidence_score DECIMAL(4,3),
    predicted_wait_time_minutes INTEGER,
    recommended_driver_count INTEGER,
    
    -- العوامل المؤثرة
    influencing_factors JSONB, -- weather, events, traffic, historical_patterns
    
    -- التوقعات الزمنية
    prediction_for_time TIMESTAMP WITH TIME ZONE,
    prediction_horizon_minutes INTEGER, -- how far into the future
    
    -- معلومات الخوارزمية
    algorithm_used VARCHAR(100),
    model_version VARCHAR(20),
    
    -- التحقق من الدقة
    actual_demand_level INTEGER, -- filled after the fact
    prediction_accuracy DECIMAL(4,3),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول التسعير الديناميكي المتقدم
CREATE TABLE IF NOT EXISTS dynamic_pricing_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- surge_pricing, demand_based, competition_based
    
    -- شروط التفعيل
    activation_conditions JSONB NOT NULL,
    minimum_demand_level INTEGER DEFAULT 5,
    minimum_confidence DECIMAL(4,3) DEFAULT 0.7,
    
    -- معاملات التسعير
    base_multiplier DECIMAL(4,2) DEFAULT 1.0,
    max_multiplier DECIMAL(4,2) DEFAULT 3.0,
    min_multiplier DECIMAL(4,2) DEFAULT 0.8,
    
    -- سرعة التغيير
    price_change_speed DECIMAL(4,3) DEFAULT 0.1, -- how quickly to adjust prices
    smoothing_factor DECIMAL(4,3) DEFAULT 0.3,   -- price stability
    
    -- قيود زمنية
    active_hours INTEGER[] DEFAULT '{0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23}',
    active_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
    
    -- حدود جغرافية
    applicable_zones INTEGER[],
    zone_specific_rules JSONB DEFAULT '{}',
    
    -- معايير الأداء
    target_acceptance_rate DECIMAL(4,3) DEFAULT 0.85,
    target_wait_time_minutes INTEGER DEFAULT 5,
    target_utilization_rate DECIMAL(4,3) DEFAULT 0.75,
    
    is_active BOOLEAN DEFAULT TRUE,
    priority_order INTEGER DEFAULT 1,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول تحسين العمليات في الوقت الفعلي
CREATE TABLE IF NOT EXISTS real_time_optimization (
    id SERIAL PRIMARY KEY,
    optimization_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- نوع التحسين
    optimization_type VARCHAR(50) NOT NULL, -- pricing, allocation, routing
    trigger_event VARCHAR(100), -- high_demand, driver_shortage, traffic_jam
    
    -- البيانات الحالية
    current_metrics JSONB NOT NULL,
    target_metrics JSONB NOT NULL,
    
    -- الإجراءات المقترحة
    recommended_actions JSONB NOT NULL,
    action_priorities INTEGER[],
    expected_impact JSONB,
    
    -- تنفيذ الإجراءات
    actions_executed JSONB DEFAULT '[]',
    execution_status VARCHAR(20) DEFAULT 'pending', -- pending, executing, completed, failed
    
    -- قياس النتائج
    actual_impact JSONB,
    success_score DECIMAL(4,3),
    optimization_effectiveness DECIMAL(4,3),
    
    -- معلومات النظام
    system_load_cpu DECIMAL(5,2),
    system_load_memory DECIMAL(5,2),
    active_users_count INTEGER,
    active_drivers_count INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. دالة توقع الطلب باستخدام البيانات التاريخية
CREATE OR REPLACE FUNCTION predict_demand(
    p_zone_id INTEGER,
    p_prediction_time TIMESTAMP WITH TIME ZONE,
    p_horizon_minutes INTEGER DEFAULT 60
) RETURNS JSONB AS $$
DECLARE
    historical_data RECORD;
    weather_factor DECIMAL(3,2) := 1.0;
    time_factor DECIMAL(3,2) := 1.0;
    trend_factor DECIMAL(3,2) := 1.0;
    predicted_demand INTEGER;
    confidence DECIMAL(4,3);
    result JSONB;
BEGIN
    -- تحليل البيانات التاريخية لنفس الوقت والمنطقة
    SELECT 
        AVG(
            CASE 
                WHEN EXTRACT(DOW FROM t.created_at) = EXTRACT(DOW FROM p_prediction_time)
                AND EXTRACT(HOUR FROM t.created_at) = EXTRACT(HOUR FROM p_prediction_time)
                THEN 1 ELSE 0 END
        ) * 10 as avg_historical_demand,
        COUNT(*) as sample_size,
        STDDEV(
            CASE 
                WHEN EXTRACT(DOW FROM t.created_at) = EXTRACT(DOW FROM p_prediction_time)
                AND EXTRACT(HOUR FROM t.created_at) = EXTRACT(HOUR FROM p_prediction_time)
                THEN 1 ELSE 0 END
        ) as demand_variance
    INTO historical_data
    FROM trips t
    LEFT JOIN pricing_zones pz ON ST_Contains(pz.zone_polygon, ST_Point(t.pickup_longitude, t.pickup_latitude))
    WHERE (p_zone_id IS NULL OR pz.id = p_zone_id)
    AND t.created_at >= NOW() - INTERVAL '90 days';
    
    -- تعديل حسب الطقس
    SELECT 
        CASE 
            WHEN wc.condition_type = 'rain' THEN 1.3
            WHEN wc.condition_type = 'snow' THEN 1.5
            WHEN wc.condition_type = 'fog' THEN 1.2
            ELSE 1.0
        END INTO weather_factor
    FROM weather_conditions wc
    WHERE wc.recorded_at >= NOW() - INTERVAL '1 hour'
    ORDER BY wc.recorded_at DESC
    LIMIT 1;
    
    -- تعديل حسب الوقت (ساعات الذروة)
    time_factor := CASE 
        WHEN EXTRACT(HOUR FROM p_prediction_time) BETWEEN 7 AND 9 THEN 1.4  -- صباح
        WHEN EXTRACT(HOUR FROM p_prediction_time) BETWEEN 17 AND 19 THEN 1.5 -- مساء
        WHEN EXTRACT(HOUR FROM p_prediction_time) BETWEEN 22 AND 23 THEN 1.2 -- ليل
        ELSE 1.0
    END;
    
    -- حساب الاتجاه العام (الأسابيع الأخيرة)
    SELECT 
        CASE 
            WHEN COUNT(*) > LAG(COUNT(*)) OVER (ORDER BY week_number) THEN 1.1
            WHEN COUNT(*) < LAG(COUNT(*)) OVER (ORDER BY week_number) THEN 0.9
            ELSE 1.0
        END INTO trend_factor
    FROM (
        SELECT 
            EXTRACT(WEEK FROM created_at) as week_number,
            COUNT(*)
        FROM trips
        WHERE created_at >= NOW() - INTERVAL '4 weeks'
        GROUP BY EXTRACT(WEEK FROM created_at)
        ORDER BY week_number DESC
        LIMIT 1
    ) weekly_data;
    
    -- حساب التوقع النهائي
    predicted_demand := GREATEST(1, LEAST(10, 
        ROUND(COALESCE(historical_data.avg_historical_demand, 5) * 
              weather_factor * time_factor * trend_factor)::INTEGER
    ));
    
    -- حساب مستوى الثقة
    confidence := GREATEST(0.1, LEAST(1.0,
        CASE 
            WHEN historical_data.sample_size > 100 THEN 0.9
            WHEN historical_data.sample_size > 50 THEN 0.8
            WHEN historical_data.sample_size > 20 THEN 0.7
            ELSE 0.6
        END * 
        CASE 
            WHEN COALESCE(historical_data.demand_variance, 1) < 0.3 THEN 1.0
            WHEN COALESCE(historical_data.demand_variance, 1) < 0.5 THEN 0.9
            ELSE 0.8
        END
    ));
    
    -- حفظ التوقع
    INSERT INTO demand_predictions (
        prediction_timestamp, zone_id, predicted_demand_level,
        confidence_score, prediction_for_time, prediction_horizon_minutes,
        influencing_factors, algorithm_used
    ) VALUES (
        NOW(), p_zone_id, predicted_demand,
        confidence, p_prediction_time, p_horizon_minutes,
        jsonb_build_object(
            'weather_factor', weather_factor,
            'time_factor', time_factor,
            'trend_factor', trend_factor,
            'historical_samples', historical_data.sample_size
        ),
        'statistical_model_v1'
    );
    
    result := jsonb_build_object(
        'predicted_demand', predicted_demand,
        'confidence_score', confidence,
        'recommended_wait_time', CASE 
            WHEN predicted_demand >= 8 THEN 2
            WHEN predicted_demand >= 6 THEN 3
            WHEN predicted_demand >= 4 THEN 5
            ELSE 8
        END,
        'factors', jsonb_build_object(
            'weather', weather_factor,
            'time_of_day', time_factor,
            'trend', trend_factor
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. دالة التسعير الديناميكي الذكي
CREATE OR REPLACE FUNCTION calculate_dynamic_pricing(
    p_zone_id INTEGER,
    p_vehicle_type VARCHAR(50) DEFAULT 'regular'
) RETURNS JSONB AS $$
DECLARE
    demand_info JSONB;
    base_multiplier DECIMAL(4,2) := 1.0;
    final_multiplier DECIMAL(4,2);
    active_rules RECORD;
    driver_count INTEGER;
    trip_requests INTEGER;
    avg_wait_time DECIMAL(5,2);
    supply_demand_ratio DECIMAL(5,3);
    pricing_decision JSONB;
BEGIN
    -- الحصول على توقع الطلب الحالي
    SELECT predict_demand(p_zone_id, NOW(), 30) INTO demand_info;
    
    -- حساب عدد السائقين المتاحين في المنطقة
    SELECT COUNT(*) INTO driver_count
    FROM main_profiles mp
    WHERE mp.profile_type = 'driver'
    AND mp.is_active = TRUE
    AND EXISTS (
        SELECT 1 FROM trips t
        WHERE t.driver_id = mp.id
        AND t.trip_status = 'available'
        AND ST_DWithin(
            ST_Point(t.pickup_longitude, t.pickup_latitude),
            (SELECT ST_Centroid(zone_polygon) FROM pricing_zones WHERE id = p_zone_id),
            5000 -- 5km radius
        )
    );
    
    -- حساب عدد طلبات الرحلات المعلقة
    SELECT COUNT(*) INTO trip_requests
    FROM trips
    WHERE trip_status = 'requested'
    AND created_at >= NOW() - INTERVAL '30 minutes'
    AND EXISTS (
        SELECT 1 FROM pricing_zones pz
        WHERE pz.id = p_zone_id
        AND ST_Contains(pz.zone_polygon, ST_Point(pickup_longitude, pickup_latitude))
    );
    
    -- حساب نسبة العرض والطلب
    supply_demand_ratio := CASE 
        WHEN trip_requests = 0 THEN 999
        ELSE driver_count::DECIMAL / trip_requests::DECIMAL
    END;
    
    -- تطبيق قواعد التسعير الديناميكي
    FOR active_rules IN 
        SELECT * FROM dynamic_pricing_rules 
        WHERE is_active = TRUE 
        AND (applicable_zones IS NULL OR p_zone_id = ANY(applicable_zones))
        AND EXTRACT(HOUR FROM NOW())::INTEGER = ANY(active_hours)
        AND EXTRACT(DOW FROM NOW())::INTEGER = ANY(active_days)
        ORDER BY priority_order
    LOOP
        -- تحقق من شروط التفعيل
        IF (demand_info->>'predicted_demand')::INTEGER >= active_rules.minimum_demand_level
           AND (demand_info->>'confidence_score')::DECIMAL >= active_rules.minimum_confidence THEN
            
            -- حساب المضاعف حسب نوع القاعدة
            CASE active_rules.rule_type
                WHEN 'surge_pricing' THEN
                    final_multiplier := GREATEST(active_rules.min_multiplier,
                        LEAST(active_rules.max_multiplier,
                            active_rules.base_multiplier * (1 + (10 - supply_demand_ratio) * 0.1)
                        )
                    );
                    
                WHEN 'demand_based' THEN
                    final_multiplier := GREATEST(active_rules.min_multiplier,
                        LEAST(active_rules.max_multiplier,
                            active_rules.base_multiplier * 
                            ((demand_info->>'predicted_demand')::INTEGER / 5.0)
                        )
                    );
                    
                WHEN 'competition_based' THEN
                    -- تحليل الأسعار المنافسة (مبسط)
                    final_multiplier := GREATEST(active_rules.min_multiplier,
                        LEAST(active_rules.max_multiplier,
                            active_rules.base_multiplier * 1.1
                        )
                    );
            END CASE;
            
            -- تطبيق التنعيم لتجنب التغيرات المفاجئة
            final_multiplier := base_multiplier + 
                (final_multiplier - base_multiplier) * active_rules.smoothing_factor;
            
            base_multiplier := final_multiplier;
        END IF;
    END LOOP;
    
    -- تسجيل قرار التسعير
    INSERT INTO real_time_optimization (
        optimization_type, trigger_event, current_metrics,
        target_metrics, recommended_actions
    ) VALUES (
        'pricing', 'dynamic_adjustment',
        jsonb_build_object(
            'zone_id', p_zone_id,
            'driver_count', driver_count,
            'trip_requests', trip_requests,
            'supply_demand_ratio', supply_demand_ratio,
            'predicted_demand', demand_info->>'predicted_demand'
        ),
        jsonb_build_object(
            'target_wait_time', 5,
            'target_acceptance_rate', 0.85
        ),
        jsonb_build_object(
            'surge_multiplier', final_multiplier,
            'reasoning', 'dynamic_pricing_algorithm'
        )
    );
    
    pricing_decision := jsonb_build_object(
        'surge_multiplier', COALESCE(final_multiplier, 1.0),
        'demand_level', demand_info->>'predicted_demand',
        'confidence', demand_info->>'confidence_score',
        'supply_demand_ratio', supply_demand_ratio,
        'estimated_wait_time', demand_info->>'recommended_wait_time',
        'active_drivers', driver_count,
        'pending_requests', trip_requests,
        'timestamp', NOW()
    );
    
    RETURN pricing_decision;
END;
$$ LANGUAGE plpgsql;

-- 7. دالة تحسين توزيع السائقين
CREATE OR REPLACE FUNCTION optimize_driver_allocation() RETURNS JSONB AS $$
DECLARE
    zone_record pricing_zones%ROWTYPE;
    allocation_plan JSONB := '[]'::jsonb;
    total_relocations INTEGER := 0;
    optimization_result JSONB;
BEGIN
    -- تحليل كل منطقة
    FOR zone_record IN SELECT * FROM pricing_zones WHERE is_active = TRUE LOOP
        DECLARE
            zone_demand JSONB;
            available_drivers INTEGER;
            needed_drivers INTEGER;
            surplus_drivers INTEGER;
        BEGIN
            -- توقع الطلب للمنطقة
            SELECT predict_demand(zone_record.id, NOW() + INTERVAL '30 minutes', 60) 
            INTO zone_demand;
            
            -- حساب السائقين المتاحين
            SELECT COUNT(*) INTO available_drivers
            FROM main_profiles mp
            WHERE mp.profile_type = 'driver'
            AND mp.is_active = TRUE
            AND ST_Contains(zone_record.zone_polygon, 
                ST_Point(
                    (mp.additional_info->>'current_longitude')::DECIMAL,
                    (mp.additional_info->>'current_latitude')::DECIMAL
                )
            );
            
            -- حساب السائقين المطلوبين
            needed_drivers := GREATEST(1, (zone_demand->>'predicted_demand')::INTEGER * 2);
            
            -- تحديد الحاجة
            IF available_drivers < needed_drivers THEN
                -- نقص في السائقين
                allocation_plan := allocation_plan || jsonb_build_object(
                    'zone_id', zone_record.id,
                    'zone_name', zone_record.zone_name,
                    'action', 'attract_drivers',
                    'current_drivers', available_drivers,
                    'needed_drivers', needed_drivers,
                    'shortage', needed_drivers - available_drivers,
                    'incentive_multiplier', 1.2 + (needed_drivers - available_drivers) * 0.1
                );
                
            ELSIF available_drivers > needed_drivers * 1.5 THEN
                -- فائض في السائقين
                surplus_drivers := available_drivers - needed_drivers;
                allocation_plan := allocation_plan || jsonb_build_object(
                    'zone_id', zone_record.id,
                    'zone_name', zone_record.zone_name,
                    'action', 'relocate_drivers',
                    'current_drivers', available_drivers,
                    'needed_drivers', needed_drivers,
                    'surplus', surplus_drivers,
                    'relocate_count', surplus_drivers / 2
                );
                
                total_relocations := total_relocations + (surplus_drivers / 2);
            END IF;
        END;
    END LOOP;
    
    -- تسجيل خطة التحسين
    INSERT INTO real_time_optimization (
        optimization_type, trigger_event, current_metrics,
        recommended_actions, execution_status
    ) VALUES (
        'allocation', 'driver_distribution_optimization',
        jsonb_build_object(
            'total_zones_analyzed', (SELECT COUNT(*) FROM pricing_zones WHERE is_active = TRUE),
            'timestamp', NOW()
        ),
        allocation_plan,
        'completed'
    );
    
    optimization_result := jsonb_build_object(
        'total_relocations_needed', total_relocations,
        'zones_analyzed', jsonb_array_length(allocation_plan),
        'allocation_plan', allocation_plan,
        'optimization_timestamp', NOW()
    );
    
    RETURN optimization_result;
END;
$$ LANGUAGE plpgsql;

-- 8. دالة التحسين التلقائي الشامل
CREATE OR REPLACE FUNCTION run_automatic_optimization() RETURNS JSONB AS $$
DECLARE
    pricing_optimizations JSONB;
    allocation_optimizations JSONB;
    system_health JSONB;
    overall_result JSONB;
    zones_to_optimize INTEGER[];
BEGIN
    -- تحديد المناطق التي تحتاج تحسين
    SELECT ARRAY_AGG(pz.id) INTO zones_to_optimize
    FROM pricing_zones pz
    WHERE pz.is_active = TRUE
    AND (
        -- مناطق بطلب عالي
        EXISTS (
            SELECT 1 FROM demand_predictions dp
            WHERE dp.zone_id = pz.id
            AND dp.predicted_demand_level >= 7
            AND dp.prediction_timestamp >= NOW() - INTERVAL '1 hour'
        )
        OR
        -- مناطق بانتظار طويل
        (
            SELECT AVG(EXTRACT(EPOCH FROM (t.pickup_time - t.created_at))/60)
            FROM trips t
            WHERE ST_Contains(pz.zone_polygon, ST_Point(t.pickup_longitude, t.pickup_latitude))
            AND t.created_at >= NOW() - INTERVAL '2 hours'
            AND t.trip_status = 'completed'
        ) > 8
    );
    
    -- تحسين التسعير للمناطق المحددة
    SELECT jsonb_agg(
        jsonb_build_object(
            'zone_id', zone_id,
            'pricing_decision', calculate_dynamic_pricing(zone_id)
        )
    ) INTO pricing_optimizations
    FROM UNNEST(zones_to_optimize) AS zone_id;
    
    -- تحسين توزيع السائقين
    SELECT optimize_driver_allocation() INTO allocation_optimizations;
    
    -- فحص صحة النظام
    system_health := jsonb_build_object(
        'active_drivers', (
            SELECT COUNT(*) FROM main_profiles 
            WHERE profile_type = 'driver' AND is_active = TRUE
        ),
        'pending_trips', (
            SELECT COUNT(*) FROM trips 
            WHERE trip_status IN ('requested', 'accepted') 
            AND created_at >= NOW() - INTERVAL '1 hour'
        ),
        'avg_system_response_time', (
            SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
            FROM trips
            WHERE created_at >= NOW() - INTERVAL '1 hour'
            AND trip_status != 'requested'
        ),
        'optimization_timestamp', NOW()
    );
    
    -- النتيجة الشاملة
    overall_result := jsonb_build_object(
        'optimization_type', 'comprehensive_auto_optimization',
        'zones_optimized', COALESCE(array_length(zones_to_optimize, 1), 0),
        'pricing_optimizations', pricing_optimizations,
        'allocation_optimizations', allocation_optimizations,
        'system_health', system_health,
        'recommendations', jsonb_build_array(
            CASE 
                WHEN (system_health->>'pending_trips')::INTEGER > 20 
                THEN 'زيادة حوافز السائقين في المناطق عالية الطلب'
                ELSE 'النظام يعمل بكفاءة مناسبة'
            END,
            CASE 
                WHEN (system_health->>'avg_system_response_time')::DECIMAL > 300 
                THEN 'تحسين أداء النظام مطلوب'
                ELSE 'وقت الاستجابة ضمن الحدود المقبولة'
            END
        ),
        'success', TRUE,
        'timestamp', NOW()
    );
    
    -- تسجيل عملية التحسين الشاملة
    INSERT INTO real_time_optimization (
        optimization_type, trigger_event, current_metrics,
        target_metrics, recommended_actions, execution_status,
        actual_impact, success_score
    ) VALUES (
        'comprehensive', 'scheduled_auto_optimization',
        system_health,
        jsonb_build_object(
            'target_avg_wait_time', 5,
            'target_driver_utilization', 0.75,
            'target_response_time', 180
        ),
        overall_result,
        'completed',
        overall_result,
        0.85
    );
    
    RETURN overall_result;
END;
$$ LANGUAGE plpgsql;

-- 9. إدراج إعدادات الذكاء الاصطناعي الافتراضية
INSERT INTO ai_optimization_config (
    algorithm_name, algorithm_type, algorithm_parameters, learning_rate, confidence_threshold
) VALUES 
(
    'demand_predictor_v1', 'demand_prediction',
    '{"method": "statistical", "historical_window_days": 90, "weather_weight": 0.3, "time_weight": 0.4, "trend_weight": 0.3}',
    0.01, 0.70
),
(
    'dynamic_pricer_v1', 'dynamic_pricing',
    '{"surge_sensitivity": 0.8, "smoothing_enabled": true, "max_adjustment_per_minute": 0.1}',
    0.005, 0.75
),
(
    'allocation_optimizer_v1', 'route_optimization',
    '{"rebalancing_threshold": 1.5, "incentive_multiplier_max": 2.0, "prediction_horizon_minutes": 60}',
    0.02, 0.80
)
ON CONFLICT (algorithm_name) DO NOTHING;

-- 10. إدراج قواعد التسعير الديناميكي الافتراضية
INSERT INTO dynamic_pricing_rules (
    rule_name, rule_type, activation_conditions, minimum_demand_level,
    base_multiplier, max_multiplier, min_multiplier, price_change_speed
) VALUES 
(
    'قاعدة ذروة الصباح', 'surge_pricing',
    '{"time_range": [7, 9], "min_requests": 5}', 6,
    1.0, 2.0, 0.9, 0.15
),
(
    'قاعدة ذروة المساء', 'surge_pricing',
    '{"time_range": [17, 19], "min_requests": 8}', 7,
    1.0, 2.5, 0.9, 0.20
),
(
    'قاعدة الطلب المرتفع', 'demand_based',
    '{"demand_threshold": 8, "confidence_min": 0.75}', 8,
    1.0, 1.8, 1.0, 0.10
)
ON CONFLICT DO NOTHING;

-- 11. إنشاء مهام تلقائية للتحسين
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- تشغيل التحسين التلقائي كل 15 دقيقة
SELECT cron.schedule('auto-optimization', '*/15 * * * *', 'SELECT run_automatic_optimization();');

-- تحديث توقعات الطلب كل 30 دقيقة
SELECT cron.schedule('demand-prediction', '*/30 * * * *', 
    'SELECT predict_demand(pz.id, NOW() + INTERVAL ''1 hour'', 60) FROM pricing_zones pz WHERE is_active = TRUE;'
);

-- رسالة تأكيد
SELECT 'تم إنشاء نظام التحكم الذكي والتحسين التلقائي بنجاح! 🤖🧠' as status;
