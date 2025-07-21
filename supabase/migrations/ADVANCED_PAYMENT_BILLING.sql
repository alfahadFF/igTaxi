-- =====================================================
-- نظام الإيصالات والحسابات المبسط - نقدي فقط
-- =====================================================

-- 1. تحديث جدول الرحلات للدفع النقدي
ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cash_collected BOOLEAN DEFAULT FALSE;

-- 2. جدول الإيصالات النقدية البسيط
CREATE TABLE IF NOT EXISTS cash_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id),
    customer_id UUID REFERENCES main_profiles(id),
    driver_id UUID REFERENCES main_profiles(id),
    
    -- تفاصيل الإيصال
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    trip_fare DECIMAL(8,3) NOT NULL,
    tip_amount DECIMAL(8,3) DEFAULT 0,
    total_amount DECIMAL(8,3) NOT NULL,
    
    -- العمولة
    commission_rate DECIMAL(4,3) DEFAULT 0.10,
    commission_amount DECIMAL(8,3),
    driver_earnings DECIMAL(8,3),
    
    -- معلومات الدفع
    payment_status VARCHAR(20) DEFAULT 'completed',
    cash_received BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. دالة إنشاء إيصال نقدي
CREATE OR REPLACE FUNCTION create_cash_receipt(
    p_trip_id UUID,
    p_tip_amount DECIMAL(8,3) DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
    trip_info trips%ROWTYPE;
    receipt_id UUID;
    receipt_number VARCHAR(50);
    commission_amount DECIMAL(8,3);
    driver_earnings DECIMAL(8,3);
    total_amount DECIMAL(8,3);
    result JSONB;
BEGIN
    -- الحصول على معلومات الرحلة
    SELECT * INTO trip_info FROM trips WHERE id = p_trip_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'رحلة غير موجودة');
    END IF;
    
    -- التحقق من حالة الرحلة
    IF trip_info.trip_status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'الرحلة لم تكتمل بعد');
    END IF;
    
    -- حساب المبالغ
    total_amount := trip_info.total_customer_fare + p_tip_amount;
    commission_amount := trip_info.total_customer_fare * trip_info.commission_rate;
    driver_earnings := trip_info.total_customer_fare - commission_amount + p_tip_amount;
    
    -- إنشاء رقم إيصال
    receipt_number := FORMAT('CASH-%s-%s', 
        TO_CHAR(NOW(), 'YYYYMMDD'),
        SUBSTR(p_trip_id::TEXT, 1, 8)
    );
    
    -- إنشاء الإيصال
    INSERT INTO cash_receipts (
        trip_id, customer_id, driver_id, receipt_number,
        trip_fare, tip_amount, total_amount,
        commission_rate, commission_amount, driver_earnings
    ) VALUES (
        p_trip_id, trip_info.customer_id, trip_info.driver_id, receipt_number,
        trip_info.total_customer_fare, p_tip_amount, total_amount,
        trip_info.commission_rate, commission_amount, driver_earnings
    ) RETURNING id INTO receipt_id;
    
    -- تحديث حالة الرحلة
    UPDATE trips 
    SET payment_status = 'paid',
        payment_method = 'cash',
        cash_collected = TRUE,
        updated_at = NOW()
    WHERE id = p_trip_id;
    
    result := jsonb_build_object(
        'success', true,
        'receipt_id', receipt_id,
        'receipt_number', receipt_number,
        'total_amount', total_amount,
        'commission_amount', commission_amount,
        'driver_earnings', driver_earnings,
        'payment_method', 'cash'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة التقرير المالي المبسط
CREATE OR REPLACE FUNCTION generate_cash_financial_report(
    p_start_date DATE,
    p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
    revenue_summary JSONB;
    driver_summary JSONB;
    result JSONB;
BEGIN
    -- ملخص الإيرادات النقدية
    SELECT jsonb_build_object(
        'total_trips', COUNT(*),
        'total_revenue', COALESCE(SUM(trip_fare), 0),
        'total_tips', COALESCE(SUM(tip_amount), 0),
        'total_commission', COALESCE(SUM(commission_amount), 0),
        'total_driver_earnings', COALESCE(SUM(driver_earnings), 0),
        'avg_trip_value', COALESCE(AVG(trip_fare), 0),
        'avg_tip', COALESCE(AVG(tip_amount), 0)
    ) INTO revenue_summary
    FROM cash_receipts
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
    
    -- ملخص أداء السائقين
    SELECT jsonb_agg(
        jsonb_build_object(
            'driver_id', cr.driver_id,
            'driver_name', mp.full_name,
            'total_trips', COUNT(*),
            'total_earnings', SUM(cr.driver_earnings),
            'avg_earnings_per_trip', AVG(cr.driver_earnings),
            'total_tips', SUM(cr.tip_amount),
            'commission_paid', SUM(cr.commission_amount)
        )
    ) INTO driver_summary
    FROM cash_receipts cr
    LEFT JOIN main_profiles mp ON mp.id = cr.driver_id
    WHERE DATE(cr.created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY cr.driver_id, mp.full_name
    ORDER BY SUM(cr.driver_earnings) DESC
    LIMIT 20;
    
    result := jsonb_build_object(
        'report_period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date,
            'days_count', p_end_date - p_start_date + 1
        ),
        'revenue_summary', revenue_summary,
        'net_platform_profit', (revenue_summary->>'total_commission')::DECIMAL,
        'top_drivers', driver_summary,
        'payment_method', 'cash_only',
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة حساب أرباح السائق
CREATE OR REPLACE FUNCTION calculate_driver_cash_earnings(
    p_driver_id UUID,
    p_period_days INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
    earnings_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'driver_id', p_driver_id,
        'period_days', p_period_days,
        'total_trips', COUNT(*),
        'total_earnings', COALESCE(SUM(driver_earnings), 0),
        'total_tips', COALESCE(SUM(tip_amount), 0),
        'avg_earnings_per_trip', COALESCE(AVG(driver_earnings), 0),
        'commission_paid', COALESCE(SUM(commission_amount), 0),
        'gross_revenue', COALESCE(SUM(trip_fare), 0),
        'calculation_date', NOW()
    ) INTO earnings_data
    FROM cash_receipts
    WHERE driver_id = p_driver_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_period_days;
    
    RETURN earnings_data;
END;
$$ LANGUAGE plpgsql;

-- 6. مشاهدات للتقارير المبسطة
CREATE OR REPLACE VIEW daily_cash_summary AS
SELECT 
    DATE(created_at) as report_date,
    COUNT(*) as total_receipts,
    SUM(trip_fare) as total_revenue,
    SUM(commission_amount) as platform_commission,
    SUM(driver_earnings) as driver_earnings,
    SUM(tip_amount) as total_tips,
    AVG(trip_fare) as avg_trip_value
FROM cash_receipts
GROUP BY DATE(created_at)
ORDER BY report_date DESC;

-- 7. مشاهدة أداء السائقين
CREATE OR REPLACE VIEW driver_cash_performance AS
SELECT 
    cr.driver_id,
    mp.full_name as driver_name,
    mp.phone as phone_number,
    COUNT(cr.id) as total_trips,
    SUM(cr.driver_earnings) as total_earnings,
    AVG(cr.driver_earnings) as avg_earnings_per_trip,
    SUM(cr.tip_amount) as total_tips,
    SUM(cr.commission_amount) as total_commission_paid,
    MAX(cr.created_at) as last_trip_date
FROM cash_receipts cr
LEFT JOIN main_profiles mp ON mp.id = cr.driver_id
WHERE mp.profile_type = 'driver'
GROUP BY cr.driver_id, mp.full_name, mp.phone
ORDER BY total_earnings DESC;

-- رسالة تأكيد
SELECT 'تم إنشاء نظام الإيصالات النقدية المبسط بنجاح! 💰📃' as status;
