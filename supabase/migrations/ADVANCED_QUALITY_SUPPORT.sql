-- =====================================================
-- نظام إدارة الجودة وخدمة العملاء المتقدم
-- =====================================================

-- 1. جدول تذاكر الدعم الفني المتقدم
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- معلومات المستخدم
    user_id UUID REFERENCES main_profiles(id),
    user_type VARCHAR(20), -- customer, driver, partner
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    
    -- تصنيف التذكرة
    category VARCHAR(50) NOT NULL, -- payment_issue, trip_problem, app_bug, account_issue, complaint, suggestion
    subcategory VARCHAR(50),
    priority_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent, critical
    severity_level VARCHAR(20) DEFAULT 'minor', -- minor, major, critical, blocking
    
    -- محتوى التذكرة
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    
    -- مراجع ذات صلة
    related_trip_id UUID REFERENCES trips(id),
    related_transaction_id INTEGER,
    related_driver_id UUID REFERENCES main_profiles(id),
    
    -- حالة التذكرة
    status VARCHAR(30) DEFAULT 'open', -- open, in_progress, pending_user, resolved, closed, reopened
    resolution_type VARCHAR(50), -- solved, workaround, duplicate, not_reproducible, wont_fix
    resolution_description TEXT,
    
    -- التعيين والمعالجة
    assigned_to UUID REFERENCES main_profiles(id),
    assigned_team VARCHAR(50), -- technical, billing, operations, quality
    escalation_level INTEGER DEFAULT 0,
    
    -- المرفقات والأدلة
    attachments JSONB DEFAULT '[]', -- array of file references
    screenshots JSONB DEFAULT '[]',
    device_info JSONB, -- device type, OS, app version
    error_logs TEXT,
    
    -- التوقيتات
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- مقاييس الأداء
    response_time_hours DECIMAL(8,2),
    resolution_time_hours DECIMAL(8,2),
    customer_satisfaction_rating INTEGER, -- 1-5 scale
    customer_feedback TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. جدول تفاعلات الدعم
CREATE TABLE IF NOT EXISTS support_interactions (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    
    -- معلومات التفاعل
    interaction_type VARCHAR(30) NOT NULL, -- reply, internal_note, status_change, assignment, escalation
    interaction_direction VARCHAR(20) NOT NULL, -- incoming, outgoing, internal
    
    -- المحتوى
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- text, html, markdown
    is_public BOOLEAN DEFAULT TRUE, -- visible to customer
    
    -- معلومات المرسل
    from_user_id UUID REFERENCES main_profiles(id),
    from_user_type VARCHAR(20), -- customer, support_agent, system
    from_email VARCHAR(100),
    from_name VARCHAR(100),
    
    -- معلومات المستقبل
    to_user_id UUID REFERENCES main_profiles(id),
    to_email VARCHAR(100),
    
    -- التتبع
    sent_via VARCHAR(30), -- web, email, sms, phone, app
    delivery_status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, read, failed
    
    -- المرفقات
    attachments JSONB DEFAULT '[]',
    
    -- معلومات إضافية
    time_spent_minutes INTEGER, -- time agent spent on this interaction
    automation_used BOOLEAN DEFAULT FALSE,
    template_used VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول مراقبة الجودة
CREATE TABLE IF NOT EXISTS quality_monitoring (
    id SERIAL PRIMARY KEY,
    
    -- نوع المراقبة
    monitoring_type VARCHAR(50) NOT NULL, -- trip_quality, driver_performance, customer_experience, system_performance
    monitoring_scope VARCHAR(30) NOT NULL, -- individual, batch, system_wide
    
    -- المراجع
    reference_type VARCHAR(30), -- trip, driver, customer, system
    reference_id VARCHAR(50),
    trip_id UUID REFERENCES trips(id),
    driver_id UUID REFERENCES main_profiles(id),
    customer_id UUID REFERENCES main_profiles(id),
    
    -- معايير الجودة
    quality_criteria JSONB NOT NULL, -- specific criteria being evaluated
    evaluation_method VARCHAR(30) NOT NULL, -- automatic, manual, hybrid
    
    -- النتائج
    overall_score DECIMAL(4,2), -- 0-100 scale
    pass_fail_status VARCHAR(10), -- pass, fail, warning
    detailed_scores JSONB, -- breakdown by criteria
    
    -- النتائج التفصيلية
    strengths JSONB DEFAULT '[]',
    weaknesses JSONB DEFAULT '[]',
    improvement_areas JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    -- الإجراءات المطلوبة
    action_required BOOLEAN DEFAULT FALSE,
    priority_level VARCHAR(20) DEFAULT 'medium',
    suggested_actions JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES main_profiles(id),
    
    -- معلومات التقييم
    evaluated_by UUID REFERENCES main_profiles(id),
    evaluation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evaluation_duration_minutes INTEGER,
    
    -- المتابعة
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول تحليل تجربة العملاء
CREATE TABLE IF NOT EXISTS customer_experience_analytics (
    id SERIAL PRIMARY KEY,
    
    -- معلومات العميل
    customer_id UUID REFERENCES main_profiles(id),
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    
    -- مقاييس الاستخدام
    total_trips INTEGER DEFAULT 0,
    completed_trips INTEGER DEFAULT 0,
    cancelled_trips INTEGER DEFAULT 0,
    trip_completion_rate DECIMAL(5,2),
    
    -- مقاييس الرضا
    average_rating DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    complaint_count INTEGER DEFAULT 0,
    compliment_count INTEGER DEFAULT 0,
    
    -- مقاييس الأداء
    average_wait_time_minutes DECIMAL(6,2),
    average_trip_duration_minutes DECIMAL(6,2),
    on_time_pickup_rate DECIMAL(5,2),
    route_efficiency_score DECIMAL(4,2),
    
    -- التحليل المالي
    total_spent DECIMAL(12,3),
    average_trip_cost DECIMAL(8,3),
    discount_usage_rate DECIMAL(5,2),
    payment_failure_rate DECIMAL(5,2),
    
    -- تحليل سلوكي
    peak_usage_hours INTEGER[], -- hours when customer is most active
    preferred_pickup_areas JSONB,
    preferred_dropoff_areas JSONB,
    loyalty_score DECIMAL(4,2), -- 0-100 scale
    churn_risk_score DECIMAL(4,2), -- 0-100 scale
    
    -- مقاييس التفاعل
    app_usage_frequency VARCHAR(20), -- daily, weekly, monthly, occasional
    support_interaction_count INTEGER DEFAULT 0,
    last_activity_date DATE,
    days_since_last_trip INTEGER,
    
    -- التصنيف
    customer_segment VARCHAR(30), -- vip, regular, new, at_risk, churned
    value_tier VARCHAR(20), -- high, medium, low
    engagement_level VARCHAR(20), -- highly_engaged, moderately_engaged, low_engagement
    
    -- التوصيات
    recommended_actions JSONB DEFAULT '[]',
    retention_strategies JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. دالة إنشاء تذكرة دعم ذكية
CREATE OR REPLACE FUNCTION create_support_ticket(
    p_user_id UUID,
    p_category VARCHAR(50),
    p_title VARCHAR(200),
    p_description TEXT,
    p_related_trip_id UUID DEFAULT NULL,
    p_device_info JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    ticket_id INTEGER;
    ticket_number VARCHAR(20);
    priority_level VARCHAR(20) := 'medium';
    assigned_team VARCHAR(50);
    auto_responses JSONB := '[]'::jsonb;
    result JSONB;
BEGIN
    -- إنشاء رقم تذكرة فريد
    ticket_number := FORMAT('TKT-%s-%s', 
        TO_CHAR(NOW(), 'YYYYMMDD'),
        LPAD(nextval('support_tickets_id_seq')::TEXT, 4, '0')
    );
    
    -- تحديد أولوية التذكرة بناءً على الفئة
    priority_level := CASE p_category
        WHEN 'payment_issue' THEN 'high'
        WHEN 'safety_concern' THEN 'urgent'
        WHEN 'account_locked' THEN 'high'
        WHEN 'trip_problem' THEN 'medium'
        WHEN 'app_bug' THEN 'low'
        ELSE 'medium'
    END;
    
    -- تحديد الفريق المسؤول
    assigned_team := CASE p_category
        WHEN 'payment_issue' THEN 'billing'
        WHEN 'trip_problem' THEN 'operations'
        WHEN 'app_bug' THEN 'technical'
        WHEN 'account_issue' THEN 'customer_service'
        ELSE 'general'
    END;
    
    -- إنشاء التذكرة
    INSERT INTO support_tickets (
        ticket_number, user_id, category, priority_level,
        title, description, related_trip_id, assigned_team,
        device_info
    ) VALUES (
        ticket_number, p_user_id, p_category, priority_level,
        p_title, p_description, p_related_trip_id, assigned_team,
        p_device_info
    ) RETURNING id INTO ticket_id;
    
    -- إضافة تفاعل أولي
    INSERT INTO support_interactions (
        ticket_id, interaction_type, interaction_direction,
        content, from_user_id, from_user_type
    ) VALUES (
        ticket_id, 'reply', 'incoming',
        p_description, p_user_id, 'customer'
    );
    
    -- تحديد الردود التلقائية المناسبة
    auto_responses := CASE p_category
        WHEN 'payment_issue' THEN jsonb_build_array(
            'نحن نحقق في مشكلة الدفع الخاصة بك',
            'سيتم حل المشكلة خلال 24 ساعة'
        )
        WHEN 'trip_problem' THEN jsonb_build_array(
            'شكراً لتواصلك معنا',
            'سنراجع تفاصيل الرحلة ونعود إليك قريباً'
        )
        ELSE jsonb_build_array(
            'تم استلام طلبك بنجاح',
            'سيتواصل معك فريق الدعم قريباً'
        )
    END;
    
    -- إضافة رد تلقائي
    INSERT INTO support_interactions (
        ticket_id, interaction_type, interaction_direction,
        content, from_user_type, automation_used
    ) VALUES (
        ticket_id, 'reply', 'outgoing',
        FORMAT('شكراً لتواصلك معنا. رقم تذكرتك هو: %s. %s',
            ticket_number, auto_responses->>0
        ),
        'system', TRUE
    );
    
    result := jsonb_build_object(
        'success', TRUE,
        'ticket_id', ticket_id,
        'ticket_number', ticket_number,
        'priority_level', priority_level,
        'assigned_team', assigned_team,
        'estimated_response_time', CASE priority_level
            WHEN 'urgent' THEN '1 ساعة'
            WHEN 'high' THEN '4 ساعات'
            WHEN 'medium' THEN '12 ساعة'
            ELSE '24 ساعة'
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. دالة تحليل جودة الرحلة
CREATE OR REPLACE FUNCTION analyze_trip_quality(p_trip_id UUID) RETURNS JSONB AS $$
DECLARE
    trip_info trips%ROWTYPE;
    quality_score DECIMAL(4,2) := 0;
    criteria_scores JSONB := '{}'::jsonb;
    strengths TEXT[] := '{}';
    weaknesses TEXT[] := '{}';
    recommendations TEXT[] := '{}';
    overall_grade VARCHAR(1);
    result JSONB;
BEGIN
    -- الحصول على معلومات الرحلة
    SELECT * INTO trip_info FROM trips WHERE id = p_trip_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'رحلة غير موجودة');
    END IF;
    
    -- تقييم معايير الجودة المختلفة
    
    -- 1. دقة الوقت (25 نقطة)
    DECLARE
        time_accuracy_score DECIMAL(4,2);
        estimated_duration INTEGER;
        actual_duration INTEGER;
        time_variance_percentage DECIMAL(5,2);
    BEGIN
        actual_duration := EXTRACT(EPOCH FROM (trip_info.dropoff_time - trip_info.pickup_time))/60;
        estimated_duration := trip_info.duration_minutes;
        
        IF estimated_duration > 0 THEN
            time_variance_percentage := ABS(actual_duration - estimated_duration)::DECIMAL / estimated_duration * 100;
            time_accuracy_score := GREATEST(0, 25 - time_variance_percentage);
        ELSE
            time_accuracy_score := 15; -- متوسط إذا لم يكن هناك تقدير
        END IF;
        
        criteria_scores := criteria_scores || jsonb_build_object('time_accuracy', time_accuracy_score);
        
        IF time_accuracy_score >= 20 THEN
            strengths := strengths || 'دقة عالية في التوقيتات';
        ELSIF time_accuracy_score < 10 THEN
            weaknesses := weaknesses || 'انحراف كبير في زمن الرحلة';
            recommendations := recommendations || 'تحسين تقدير أوقات الرحلات';
        END IF;
    END;
    
    -- 2. كفاءة المسار (25 نقطة)
    DECLARE
        route_efficiency_score DECIMAL(4,2);
        direct_distance DECIMAL(8,3);
        actual_distance DECIMAL(8,3);
        efficiency_ratio DECIMAL(4,2);
    BEGIN
        actual_distance := trip_info.distance_km;
        -- تقدير المسافة المباشرة (مبسط)
        direct_distance := actual_distance * 0.85; -- افتراض أن المسافة المباشرة 85% من المسافة الفعلية
        
        efficiency_ratio := direct_distance / actual_distance;
        route_efficiency_score := LEAST(25, efficiency_ratio * 30);
        
        criteria_scores := criteria_scores || jsonb_build_object('route_efficiency', route_efficiency_score);
        
        IF route_efficiency_score >= 20 THEN
            strengths := strengths || 'مسار فعال ومباشر';
        ELSIF route_efficiency_score < 15 THEN
            weaknesses := weaknesses || 'مسار غير مثالي';
            recommendations := recommendations || 'استخدام تطبيقات الملاحة المحدثة';
        END IF;
    END;
    
    -- 3. تقييم العميل (25 نقطة)
    DECLARE
        customer_rating_score DECIMAL(4,2);
    BEGIN
        IF trip_info.customer_rating IS NOT NULL THEN
            customer_rating_score := trip_info.customer_rating * 5; -- تحويل من 1-5 إلى 0-25
        ELSE
            customer_rating_score := 15; -- متوسط إذا لم يكن هناك تقييم
        END IF;
        
        criteria_scores := criteria_scores || jsonb_build_object('customer_rating', customer_rating_score);
        
        IF customer_rating_score >= 23 THEN -- 4.6+ stars
            strengths := strengths || 'رضا عالي من العميل';
        ELSIF customer_rating_score < 15 THEN -- less than 3 stars
            weaknesses := weaknesses || 'تقييم منخفض من العميل';
            recommendations := recommendations || 'تحسين جودة الخدمة وسلوك السائق';
        END IF;
    END;
    
    -- 4. الامتثال للسلامة (25 نقطة)
    DECLARE
        safety_score DECIMAL(4,2) := 25; -- افتراض أولي
    BEGIN
        -- فحص الشكاوى الأمنية
        IF EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE related_trip_id = p_trip_id 
            AND category = 'safety_concern'
        ) THEN
            safety_score := safety_score - 15;
            weaknesses := weaknesses || 'مخاوف أمنية مُبلغ عنها';
            recommendations := recommendations || 'مراجعة بروتوكولات السلامة';
        END IF;
        
        -- فحص الانتهاكات المرورية (إذا توفرت البيانات)
        -- يمكن إضافة المزيد من معايير السلامة هنا
        
        criteria_scores := criteria_scores || jsonb_build_object('safety_compliance', safety_score);
        
        IF safety_score = 25 THEN
            strengths := strengths || 'امتثال كامل لمعايير السلامة';
        END IF;
    END;
    
    -- حساب النتيجة الإجمالية
    quality_score := (
        (criteria_scores->>'time_accuracy')::DECIMAL +
        (criteria_scores->>'route_efficiency')::DECIMAL +
        (criteria_scores->>'customer_rating')::DECIMAL +
        (criteria_scores->>'safety_compliance')::DECIMAL
    );
    
    -- تحديد الدرجة
    overall_grade := CASE 
        WHEN quality_score >= 90 THEN 'A'
        WHEN quality_score >= 80 THEN 'B'
        WHEN quality_score >= 70 THEN 'C'
        WHEN quality_score >= 60 THEN 'D'
        ELSE 'F'
    END;
    
    -- حفظ نتائج المراقبة
    INSERT INTO quality_monitoring (
        monitoring_type, monitoring_scope, reference_type, reference_id,
        trip_id, driver_id, customer_id, quality_criteria,
        evaluation_method, overall_score, pass_fail_status,
        detailed_scores, strengths, weaknesses, improvement_areas,
        recommendations, action_required
    ) VALUES (
        'trip_quality', 'individual', 'trip', p_trip_id::TEXT,
        p_trip_id, trip_info.driver_id, trip_info.customer_id,
        jsonb_build_object(
            'time_accuracy_weight', 25,
            'route_efficiency_weight', 25,
            'customer_satisfaction_weight', 25,
            'safety_compliance_weight', 25
        ),
        'automatic', quality_score,
        CASE WHEN quality_score >= 70 THEN 'pass' ELSE 'fail' END,
        criteria_scores,
        array_to_json(strengths)::jsonb,
        array_to_json(weaknesses)::jsonb,
        array_to_json(recommendations)::jsonb,
        array_to_json(recommendations)::jsonb,
        quality_score < 70
    );
    
    result := jsonb_build_object(
        'trip_id', p_trip_id,
        'quality_score', quality_score,
        'overall_grade', overall_grade,
        'criteria_scores', criteria_scores,
        'strengths', array_to_json(strengths),
        'weaknesses', array_to_json(weaknesses),
        'recommendations', array_to_json(recommendations),
        'pass_status', quality_score >= 70,
        'analysis_timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. دالة تحليل تجربة العميل الشامل
CREATE OR REPLACE FUNCTION analyze_customer_experience(
    p_customer_id UUID,
    p_analysis_period_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    analysis_start_date DATE := CURRENT_DATE - INTERVAL '1 day' * p_analysis_period_days;
    analysis_end_date DATE := CURRENT_DATE;
    customer_stats RECORD;
    loyalty_score DECIMAL(4,2);
    churn_risk DECIMAL(4,2);
    customer_segment VARCHAR(30);
    recommendations JSONB := '[]'::jsonb;
    result JSONB;
BEGIN
    -- جمع الإحصائيات الأساسية
    SELECT 
        COUNT(*) as total_trips,
        COUNT(CASE WHEN trip_status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN trip_status = 'cancelled' THEN 1 END) as cancelled_trips,
        AVG(customer_rating) as avg_rating,
        COUNT(customer_rating) as rating_count,
        AVG(EXTRACT(EPOCH FROM (pickup_time - created_at))/60) as avg_wait_time,
        SUM(total_customer_fare) as total_spent,
        AVG(total_customer_fare) as avg_trip_cost,
        MAX(created_at) as last_trip_date
    INTO customer_stats
    FROM trips
    WHERE customer_id = p_customer_id
    AND created_at >= analysis_start_date;
    
    -- حساب نتيجة الولاء
    loyalty_score := LEAST(100,
        CASE 
            WHEN customer_stats.total_trips >= 50 THEN 40
            WHEN customer_stats.total_trips >= 20 THEN 30
            WHEN customer_stats.total_trips >= 10 THEN 20
            ELSE customer_stats.total_trips * 2
        END +
        CASE 
            WHEN customer_stats.avg_rating >= 4.5 THEN 30
            WHEN customer_stats.avg_rating >= 4.0 THEN 25
            WHEN customer_stats.avg_rating >= 3.5 THEN 20
            ELSE 10
        END +
        CASE 
            WHEN customer_stats.total_spent >= 500 THEN 30
            WHEN customer_stats.total_spent >= 200 THEN 20
            WHEN customer_stats.total_spent >= 100 THEN 15
            ELSE customer_stats.total_spent / 10
        END
    );
    
    -- حساب مخاطر فقدان العميل
    churn_risk := LEAST(100,
        CASE 
            WHEN customer_stats.last_trip_date < CURRENT_DATE - INTERVAL '14 days' THEN 40
            WHEN customer_stats.last_trip_date < CURRENT_DATE - INTERVAL '7 days' THEN 20
            ELSE 0
        END +
        CASE 
            WHEN customer_stats.avg_rating < 3.0 THEN 30
            WHEN customer_stats.avg_rating < 3.5 THEN 20
            WHEN customer_stats.avg_rating < 4.0 THEN 10
            ELSE 0
        END +
        CASE 
            WHEN customer_stats.cancelled_trips::DECIMAL / NULLIF(customer_stats.total_trips, 0) > 0.3 THEN 30
            WHEN customer_stats.cancelled_trips::DECIMAL / NULLIF(customer_stats.total_trips, 0) > 0.2 THEN 20
            ELSE 0
        END
    );
    
    -- تحديد قطاع العميل
    customer_segment := CASE 
        WHEN loyalty_score >= 80 AND customer_stats.total_spent >= 300 THEN 'vip'
        WHEN loyalty_score >= 60 THEN 'regular'
        WHEN customer_stats.total_trips <= 3 THEN 'new'
        WHEN churn_risk >= 60 THEN 'at_risk'
        WHEN customer_stats.last_trip_date < CURRENT_DATE - INTERVAL '30 days' THEN 'churned'
        ELSE 'casual'
    END;
    
    -- إنشاء التوصيات
    IF churn_risk >= 60 THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'retention',
            'action', 'إرسال عرض خصم خاص',
            'priority', 'high'
        );
    END IF;
    
    IF customer_stats.avg_rating < 3.5 THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'service_improvement',
            'action', 'تواصل شخصي لفهم المشاكل',
            'priority', 'high'
        );
    END IF;
    
    IF loyalty_score >= 80 THEN
        recommendations := recommendations || jsonb_build_object(
            'type', 'reward',
            'action', 'منح مكافآت ولاء',
            'priority', 'medium'
        );
    END IF;
    
    -- حفظ التحليل
    INSERT INTO customer_experience_analytics (
        customer_id, analysis_period_start, analysis_period_end,
        total_trips, completed_trips, cancelled_trips,
        trip_completion_rate, average_rating, rating_count,
        average_wait_time_minutes, total_spent, average_trip_cost,
        loyalty_score, churn_risk_score, customer_segment,
        last_activity_date, days_since_last_trip,
        recommended_actions
    ) VALUES (
        p_customer_id, analysis_start_date, analysis_end_date,
        customer_stats.total_trips, customer_stats.completed_trips, customer_stats.cancelled_trips,
        CASE WHEN customer_stats.total_trips > 0 
             THEN customer_stats.completed_trips::DECIMAL / customer_stats.total_trips * 100 
             ELSE 0 END,
        customer_stats.avg_rating, customer_stats.rating_count,
        customer_stats.avg_wait_time, customer_stats.total_spent, customer_stats.avg_trip_cost,
        loyalty_score, churn_risk, customer_segment,
        customer_stats.last_trip_date::DATE,
        CASE WHEN customer_stats.last_trip_date IS NOT NULL 
             THEN CURRENT_DATE - customer_stats.last_trip_date::DATE 
             ELSE NULL END,
        recommendations
    ) ON CONFLICT (customer_id, analysis_period_start, analysis_period_end) 
    DO UPDATE SET
        total_trips = EXCLUDED.total_trips,
        completed_trips = EXCLUDED.completed_trips,
        cancelled_trips = EXCLUDED.cancelled_trips,
        trip_completion_rate = EXCLUDED.trip_completion_rate,
        average_rating = EXCLUDED.average_rating,
        loyalty_score = EXCLUDED.loyalty_score,
        churn_risk_score = EXCLUDED.churn_risk_score,
        customer_segment = EXCLUDED.customer_segment,
        recommended_actions = EXCLUDED.recommended_actions,
        updated_at = NOW();
    
    result := jsonb_build_object(
        'customer_id', p_customer_id,
        'analysis_period', FORMAT('%s to %s', analysis_start_date, analysis_end_date),
        'trip_statistics', jsonb_build_object(
            'total_trips', customer_stats.total_trips,
            'completed_trips', customer_stats.completed_trips,
            'completion_rate', CASE WHEN customer_stats.total_trips > 0 
                                   THEN ROUND(customer_stats.completed_trips::DECIMAL / customer_stats.total_trips * 100, 2) 
                                   ELSE 0 END
        ),
        'satisfaction', jsonb_build_object(
            'average_rating', ROUND(customer_stats.avg_rating, 2),
            'rating_count', customer_stats.rating_count
        ),
        'financial', jsonb_build_object(
            'total_spent', customer_stats.total_spent,
            'average_trip_cost', ROUND(customer_stats.avg_trip_cost, 3)
        ),
        'loyalty_score', loyalty_score,
        'churn_risk_score', churn_risk,
        'customer_segment', customer_segment,
        'recommendations', recommendations,
        'last_activity', customer_stats.last_trip_date,
        'analysis_timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء مشاهدات لتقارير الجودة
CREATE OR REPLACE VIEW support_ticket_summary AS
SELECT 
    DATE(created_at) as ticket_date,
    category,
    priority_level,
    status,
    COUNT(*) as ticket_count,
    AVG(response_time_hours) as avg_response_time,
    AVG(resolution_time_hours) as avg_resolution_time,
    AVG(customer_satisfaction_rating) as avg_satisfaction
FROM support_tickets
GROUP BY DATE(created_at), category, priority_level, status
ORDER BY ticket_date DESC, category;

-- 9. مشاهدة إحصائيات الجودة
CREATE OR REPLACE VIEW quality_dashboard AS
SELECT 
    DATE(created_at) as quality_date,
    monitoring_type,
    COUNT(*) as total_evaluations,
    AVG(overall_score) as avg_quality_score,
    COUNT(CASE WHEN pass_fail_status = 'pass' THEN 1 END) as passed_count,
    COUNT(CASE WHEN pass_fail_status = 'fail' THEN 1 END) as failed_count,
    ROUND(COUNT(CASE WHEN pass_fail_status = 'pass' THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as pass_rate
FROM quality_monitoring
GROUP BY DATE(created_at), monitoring_type
ORDER BY quality_date DESC;

-- رسالة تأكيد
SELECT 'تم إنشاء نظام إدارة الجودة وخدمة العملاء المتقدم بنجاح! 🌟📞' as status;
