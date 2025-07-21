-- =====================================================
-- نظام الأمان والمراقبة المتقدم
-- =====================================================

-- 1. جدول صلاحيات المستخدمين
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL,
    permission_level VARCHAR(20) NOT NULL, -- read, write, admin, super_admin
    resource_type VARCHAR(50), -- pricing, reports, users, system
    specific_resource_id INTEGER,
    granted_by UUID REFERENCES main_profiles(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, permission_type, resource_type, specific_resource_id)
);

-- 2. جدول سجل الأنشطة الأمنية
CREATE TABLE IF NOT EXISTS security_activity_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES main_profiles(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- تفاصيل الطلب
    endpoint_accessed VARCHAR(200),
    request_method VARCHAR(10),
    request_data JSONB,
    response_status INTEGER,
    
    -- معلومات الأمان
    risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
    anomaly_detected BOOLEAN DEFAULT FALSE,
    geo_location JSONB, -- country, city, lat, lng
    
    -- نتائج التحقق
    authentication_method VARCHAR(50),
    mfa_used BOOLEAN DEFAULT FALSE,
    permission_checked BOOLEAN DEFAULT FALSE,
    access_granted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول تنبيهات الأمان
CREATE TABLE IF NOT EXISTS security_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity_level VARCHAR(20) NOT NULL, -- info, warning, error, critical
    alert_title VARCHAR(200) NOT NULL,
    alert_description TEXT,
    
    -- معلومات الحدث
    triggered_by_user_id UUID REFERENCES main_profiles(id),
    related_activity_log_id INTEGER REFERENCES security_activity_log(id),
    trigger_conditions JSONB,
    
    -- حالة التنبيه
    status VARCHAR(20) DEFAULT 'new', -- new, investigating, resolved, false_positive
    assigned_to UUID REFERENCES main_profiles(id),
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- إجراءات تلقائية
    auto_actions_taken JSONB DEFAULT '[]',
    manual_action_required BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول قيود الأسعار التنظيمية
CREATE TABLE IF NOT EXISTS pricing_regulations (
    id SERIAL PRIMARY KEY,
    regulation_name VARCHAR(100) NOT NULL,
    regulation_type VARCHAR(50) NOT NULL, -- max_surge, min_fare, max_commission
    
    -- قيود الأسعار
    max_base_fare DECIMAL(8,3),
    min_base_fare DECIMAL(8,3),
    max_surge_multiplier DECIMAL(4,2),
    max_commission_rate DECIMAL(4,3),
    min_driver_share DECIMAL(4,3),
    
    -- قيود زمنية
    time_restrictions JSONB, -- specific hours when restrictions apply
    
    -- قيود جغرافية
    applicable_zones INTEGER[],
    
    -- قيود الخصومات
    max_discount_percentage DECIMAL(5,2),
    min_final_fare DECIMAL(8,3),
    
    -- فترة الصلاحية
    effective_from DATE NOT NULL,
    effective_until DATE,
    
    -- سلطة الإصدار
    issued_by VARCHAR(100),
    regulation_reference VARCHAR(100),
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جدول حدود التشغيل الآمن
CREATE TABLE IF NOT EXISTS operational_limits (
    id SERIAL PRIMARY KEY,
    limit_type VARCHAR(50) NOT NULL,
    limit_category VARCHAR(30) NOT NULL, -- daily, hourly, per_transaction
    
    -- حدود الكمية
    max_trips_per_driver_daily INTEGER,
    max_revenue_per_driver_daily DECIMAL(12,3),
    max_discount_per_customer_daily DECIMAL(8,3),
    max_surge_duration_minutes INTEGER,
    
    -- حدود النسب
    max_surge_multiplier_auto DECIMAL(4,2),
    max_commission_rate_auto DECIMAL(4,3),
    min_driver_earnings_percentage DECIMAL(4,3),
    
    -- حدود أمنية
    max_failed_attempts_per_hour INTEGER,
    max_concurrent_sessions INTEGER,
    max_api_calls_per_minute INTEGER,
    
    -- إعدادات التنبيه
    alert_threshold_percentage DECIMAL(5,2) DEFAULT 80.0,
    auto_disable_at_percentage DECIMAL(5,2) DEFAULT 95.0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. دالة التحقق من الصلاحيات
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission_type VARCHAR(50),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    permission_exists BOOLEAN := FALSE;
    user_profile main_profiles%ROWTYPE;
BEGIN
    -- الحصول على معلومات المستخدم
    SELECT * INTO user_profile
    FROM main_profiles
    WHERE id = p_user_id AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- فحص الصلاحيات المحددة
    SELECT EXISTS(
        SELECT 1 FROM user_permissions
        WHERE user_id = p_user_id
        AND permission_type = p_permission_type
        AND (p_resource_type IS NULL OR resource_type = p_resource_type)
        AND (p_resource_id IS NULL OR specific_resource_id = p_resource_id)
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO permission_exists;
    
    -- تسجيل فحص الصلاحية
    INSERT INTO security_activity_log (
        user_id, activity_type, activity_description,
        permission_checked, access_granted
    ) VALUES (
        p_user_id, 'permission_check', 
        FORMAT('فحص صلاحية: %s على %s', p_permission_type, COALESCE(p_resource_type, 'النظام')),
        TRUE, permission_exists
    );
    
    RETURN permission_exists;
END;
$$ LANGUAGE plpgsql;

-- 7. دالة مراقبة الأسعار غير العادية
CREATE OR REPLACE FUNCTION monitor_pricing_anomalies() RETURNS VOID AS $$
DECLARE
    trip_record trips%ROWTYPE;
    alert_created BOOLEAN := FALSE;
    normal_range_min DECIMAL(8,3);
    normal_range_max DECIMAL(8,3);
    regulation_record pricing_regulations%ROWTYPE;
BEGIN
    -- فحص الرحلات في آخر ساعة
    FOR trip_record IN 
        SELECT * FROM trips 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND trip_status = 'completed'
    LOOP
        -- حساب النطاق الطبيعي للأسعار (متوسط آخر 30 يوم ± 50%)
        SELECT 
            AVG(total_customer_fare) * 0.5,
            AVG(total_customer_fare) * 1.5
        INTO normal_range_min, normal_range_max
        FROM trips
        WHERE distance_km BETWEEN trip_record.distance_km * 0.8 AND trip_record.distance_km * 1.2
        AND fuel_type = trip_record.fuel_type
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND trip_status = 'completed';
        
        -- فحص إذا كان السعر خارج النطاق الطبيعي
        IF trip_record.total_customer_fare > normal_range_max * 2 THEN
            INSERT INTO security_alerts (
                alert_type, severity_level, alert_title, alert_description,
                triggered_by_user_id, trigger_conditions
            ) VALUES (
                'pricing_anomaly', 'warning',
                'سعر مرتفع بشكل غير عادي',
                FORMAT('رحلة برقم %s بسعر %s دينار، أعلى من المتوقع بنسبة %s%%',
                    trip_record.id, trip_record.total_customer_fare,
                    ROUND(((trip_record.total_customer_fare / normal_range_max) - 1) * 100, 2)
                ),
                trip_record.driver_id,
                jsonb_build_object(
                    'trip_id', trip_record.id,
                    'actual_fare', trip_record.total_customer_fare,
                    'expected_max', normal_range_max,
                    'deviation_percentage', ((trip_record.total_customer_fare / normal_range_max) - 1) * 100
                )
            );
            alert_created := TRUE;
        END IF;
        
        -- فحص مخالفة القوانين التنظيمية
        FOR regulation_record IN 
            SELECT * FROM pricing_regulations 
            WHERE is_active = TRUE
            AND effective_from <= CURRENT_DATE
            AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
        LOOP
            -- فحص مضاعف الذروة
            IF regulation_record.max_surge_multiplier IS NOT NULL 
               AND trip_record.surge_multiplier > regulation_record.max_surge_multiplier THEN
                INSERT INTO security_alerts (
                    alert_type, severity_level, alert_title, alert_description,
                    triggered_by_user_id, trigger_conditions
                ) VALUES (
                    'regulation_violation', 'error',
                    'مخالفة نظام مضاعف الذروة',
                    FORMAT('رحلة برقم %s تستخدم مضاعف ذروة %s، أعلى من الحد المسموح %s',
                        trip_record.id, trip_record.surge_multiplier, regulation_record.max_surge_multiplier
                    ),
                    trip_record.driver_id,
                    jsonb_build_object(
                        'regulation_name', regulation_record.regulation_name,
                        'actual_multiplier', trip_record.surge_multiplier,
                        'max_allowed', regulation_record.max_surge_multiplier
                    )
                );
                alert_created := TRUE;
            END IF;
            
            -- فحص معدل العمولة
            IF regulation_record.max_commission_rate IS NOT NULL 
               AND trip_record.commission_rate > regulation_record.max_commission_rate THEN
                INSERT INTO security_alerts (
                    alert_type, severity_level, alert_title, alert_description,
                    triggered_by_user_id, trigger_conditions
                ) VALUES (
                    'regulation_violation', 'error',
                    'مخالفة نظام العمولة',
                    FORMAT('رحلة برقم %s تطبق عمولة %s%%، أعلى من الحد المسموح %s%%',
                        trip_record.id, trip_record.commission_rate * 100, regulation_record.max_commission_rate * 100
                    ),
                    trip_record.driver_id,
                    jsonb_build_object(
                        'regulation_name', regulation_record.regulation_name,
                        'actual_commission', trip_record.commission_rate,
                        'max_allowed', regulation_record.max_commission_rate
                    )
                );
                alert_created := TRUE;
            END IF;
        END LOOP;
    END LOOP;
    
    IF alert_created THEN
        RAISE NOTICE 'تم إنشاء تنبيهات أمنية جديدة - يرجى مراجعة جدول security_alerts';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. دالة تتبع الأنشطة المشبوهة
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_ip_address INET DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    recent_activities INTEGER;
    suspicious_patterns JSONB := '[]'::jsonb;
    risk_score INTEGER := 0;
    result JSONB;
BEGIN
    -- فحص تكرار الأنشطة في آخر ساعة
    SELECT COUNT(*) INTO recent_activities
    FROM security_activity_log
    WHERE user_id = p_user_id
    AND activity_type = p_activity_type
    AND created_at >= NOW() - INTERVAL '1 hour';
    
    -- نمط 1: محاولات متكررة
    IF recent_activities > 10 THEN
        suspicious_patterns := suspicious_patterns || jsonb_build_object(
            'pattern', 'high_frequency_attempts',
            'description', 'محاولات متكررة في فترة قصيرة',
            'count', recent_activities,
            'risk_increase', 30
        );
        risk_score := risk_score + 30;
    END IF;
    
    -- نمط 2: تغيير IP مفاجئ
    IF p_ip_address IS NOT NULL THEN
        IF EXISTS(
            SELECT 1 FROM security_activity_log
            WHERE user_id = p_user_id
            AND ip_address != p_ip_address
            AND created_at >= NOW() - INTERVAL '24 hours'
            LIMIT 1
        ) THEN
            suspicious_patterns := suspicious_patterns || jsonb_build_object(
                'pattern', 'ip_address_change',
                'description', 'تغيير في عنوان IP',
                'new_ip', p_ip_address::text,
                'risk_increase', 20
            );
            risk_score := risk_score + 20;
        END IF;
    END IF;
    
    -- نمط 3: أنشطة في أوقات غير عادية
    IF EXTRACT(HOUR FROM NOW()) BETWEEN 2 AND 5 THEN
        suspicious_patterns := suspicious_patterns || jsonb_build_object(
            'pattern', 'unusual_hours',
            'description', 'نشاط في ساعات غير عادية',
            'hour', EXTRACT(HOUR FROM NOW()),
            'risk_increase', 15
        );
        risk_score := risk_score + 15;
    END IF;
    
    -- إنشاء تنبيه إذا كان مستوى الخطر عالي
    IF risk_score >= 50 THEN
        INSERT INTO security_alerts (
            alert_type, severity_level, alert_title, alert_description,
            triggered_by_user_id, trigger_conditions, manual_action_required
        ) VALUES (
            'suspicious_activity', 
            CASE WHEN risk_score >= 80 THEN 'critical' 
                 WHEN risk_score >= 60 THEN 'error' 
                 ELSE 'warning' END,
            'نشاط مشبوه تم اكتشافه',
            FORMAT('تم اكتشاف أنماط مشبوهة للمستخدم %s بمعدل خطر %s', p_user_id, risk_score),
            p_user_id,
            jsonb_build_object(
                'risk_score', risk_score,
                'patterns_detected', suspicious_patterns,
                'activity_type', p_activity_type,
                'ip_address', p_ip_address
            ),
            risk_score >= 70
        );
    END IF;
    
    result := jsonb_build_object(
        'risk_score', risk_score,
        'patterns_detected', suspicious_patterns,
        'action_required', risk_score >= 70
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. دالة النسخ الاحتياطي للإعدادات الحساسة
CREATE OR REPLACE FUNCTION backup_critical_settings() RETURNS VOID AS $$
DECLARE
    backup_data JSONB;
BEGIN
    -- إنشاء نسخة احتياطية من الإعدادات الحساسة
    SELECT jsonb_build_object(
        'pricing_config', (SELECT jsonb_agg(to_jsonb(t)) FROM advanced_pricing_config t WHERE is_active = TRUE),
        'pricing_zones', (SELECT jsonb_agg(to_jsonb(t)) FROM pricing_zones t WHERE is_active = TRUE),
        'regulations', (SELECT jsonb_agg(to_jsonb(t)) FROM pricing_regulations t WHERE is_active = TRUE),
        'operational_limits', (SELECT jsonb_agg(to_jsonb(t)) FROM operational_limits t WHERE is_active = TRUE),
        'backup_timestamp', NOW()
    ) INTO backup_data;
    
    -- حفظ النسخة الاحتياطية
    INSERT INTO pricing_audit_log (
        table_name, record_id, action_type,
        new_values, change_reason, changed_by
    ) VALUES (
        'system_backup', 0, 'BACKUP',
        backup_data,
        'نسخة احتياطية تلقائية للإعدادات الحساسة',
        NULL
    );
    
    RAISE NOTICE 'تم إنشاء نسخة احتياطية للإعدادات الحساسة';
END;
$$ LANGUAGE plpgsql;

-- 10. إدراج القوانين التنظيمية الافتراضية للأردن
INSERT INTO pricing_regulations (
    regulation_name, regulation_type, max_surge_multiplier, max_commission_rate,
    min_driver_share, effective_from, issued_by, regulation_reference
) VALUES 
(
    'قانون النقل الأردني - الحد الأقصى للذروة', 'max_surge',
    2.0, NULL, 0.80, CURRENT_DATE,
    'هيئة تنظيم النقل البري', 'المادة 15 - قانون النقل 2023'
),
(
    'قانون النقل الأردني - حد العمولة', 'max_commission',
    NULL, 0.15, 0.85, CURRENT_DATE,
    'هيئة تنظيم النقل البري', 'المادة 18 - قانون النقل 2023'
)
ON CONFLICT DO NOTHING;

-- 11. إدراج الحدود التشغيلية الآمنة
INSERT INTO operational_limits (
    limit_type, limit_category, max_trips_per_driver_daily,
    max_revenue_per_driver_daily, max_surge_duration_minutes,
    max_surge_multiplier_auto, alert_threshold_percentage
) VALUES 
(
    'driver_daily_limits', 'daily',
    50, 500.0, 120, 1.8, 80.0
),
(
    'system_safety_limits', 'hourly',
    NULL, NULL, 60, 1.5, 90.0
)
ON CONFLICT DO NOTHING;

-- 12. إنشاء صلاحيات افتراضية للمديرين
CREATE OR REPLACE FUNCTION create_admin_permissions(p_admin_user_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_permissions (user_id, permission_type, permission_level, resource_type)
    VALUES 
    (p_admin_user_id, 'pricing_management', 'admin', 'pricing'),
    (p_admin_user_id, 'reports_access', 'admin', 'reports'),
    (p_admin_user_id, 'user_management', 'admin', 'users'),
    (p_admin_user_id, 'security_monitoring', 'admin', 'security'),
    (p_admin_user_id, 'system_configuration', 'admin', 'system')
    ON CONFLICT (user_id, permission_type, resource_type, specific_resource_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 13. تفعيل Row Level Security على الجداول الحساسة
ALTER TABLE pricing_regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- سياسة الوصول للقوانين التنظيمية
CREATE POLICY admin_only_regulations ON pricing_regulations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()
            AND up.permission_type = 'pricing_management'
            AND up.permission_level IN ('admin', 'super_admin')
            AND up.is_active = TRUE
        )
    );

-- 14. رسالة تأكيد
SELECT 'تم إنشاء نظام الأمان والمراقبة المتقدم بنجاح! 🔒' as status;
