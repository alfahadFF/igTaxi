-- =====================================================
-- النظام المبسط - بدون دفع إلكتروني معقد
-- =====================================================

-- 1. تحديث جدول الرحلات للدفع النقدي البسيط
ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS cash_collected BOOLEAN DEFAULT FALSE;

-- 2. جدول إيصالات بسيط
CREATE TABLE IF NOT EXISTS simple_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id),
    customer_id UUID REFERENCES main_profiles(id),
    driver_id UUID REFERENCES main_profiles(id),
    
    -- تفاصيل الإيصال
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    trip_fare DECIMAL(8,3) NOT NULL,
    tip_amount DECIMAL(8,3) DEFAULT 0,
    total_amount DECIMAL(8,3) NOT NULL,
    
    -- طريقة الدفع
    payment_method VARCHAR(20) DEFAULT 'cash', -- cash, card, digital_wallet
    payment_status VARCHAR(20) DEFAULT 'completed',
    
    -- العمولة
    commission_rate DECIMAL(4,3) DEFAULT 0.10,
    commission_amount DECIMAL(8,3),
    driver_earnings DECIMAL(8,3),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. دالة إنشاء إيصال بسيط
CREATE OR REPLACE FUNCTION create_simple_receipt(
    p_trip_id UUID,
    p_payment_method VARCHAR(20) DEFAULT 'cash',
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
    receipt_number := FORMAT('REC-%s-%s', 
        TO_CHAR(NOW(), 'YYYYMMDD'),
        SUBSTR(p_trip_id::TEXT, 1, 8)
    );
    
    -- إنشاء الإيصال
    INSERT INTO simple_receipts (
        trip_id, customer_id, driver_id, receipt_number,
        trip_fare, tip_amount, total_amount, payment_method,
        commission_rate, commission_amount, driver_earnings
    ) VALUES (
        p_trip_id, trip_info.customer_id, trip_info.driver_id, receipt_number,
        trip_info.total_customer_fare, p_tip_amount, total_amount, p_payment_method,
        trip_info.commission_rate, commission_amount, driver_earnings
    ) RETURNING id INTO receipt_id;
    
    -- تحديث حالة الرحلة
    UPDATE trips 
    SET payment_status = 'paid',
        payment_method = p_payment_method,
        cash_collected = (p_payment_method = 'cash'),
        updated_at = NOW()
    WHERE id = p_trip_id;
    
    result := jsonb_build_object(
        'success', true,
        'receipt_id', receipt_id,
        'receipt_number', receipt_number,
        'total_amount', total_amount,
        'commission_amount', commission_amount,
        'driver_earnings', driver_earnings,
        'payment_method', p_payment_method
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة التقرير المالي المبسط
CREATE OR REPLACE FUNCTION generate_simple_financial_report(
    p_start_date DATE,
    p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
    revenue_summary JSONB;
    driver_summary JSONB;
    result JSONB;
BEGIN
    -- ملخص الإيرادات
    SELECT jsonb_build_object(
        'total_trips', COUNT(*),
        'total_revenue', COALESCE(SUM(trip_fare), 0),
        'total_tips', COALESCE(SUM(tip_amount), 0),
        'total_commission', COALESCE(SUM(commission_amount), 0),
        'total_driver_earnings', COALESCE(SUM(driver_earnings), 0),
        'avg_trip_value', COALESCE(AVG(trip_fare), 0),
        'cash_payments', COUNT(CASE WHEN payment_method = 'cash' THEN 1 END),
        'card_payments', COUNT(CASE WHEN payment_method = 'card' THEN 1 END)
    ) INTO revenue_summary
    FROM simple_receipts
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
    
    -- ملخص السائقين
    SELECT jsonb_agg(
        jsonb_build_object(
            'driver_id', driver_id,
            'total_trips', COUNT(*),
            'total_earnings', SUM(driver_earnings),
            'avg_earnings_per_trip', AVG(driver_earnings),
            'total_tips', SUM(tip_amount)
        )
    ) INTO driver_summary
    FROM simple_receipts
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY driver_id
    ORDER BY SUM(driver_earnings) DESC
    LIMIT 10;
    
    result := jsonb_build_object(
        'report_period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'revenue_summary', revenue_summary,
        'top_drivers', driver_summary,
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. دالة حساب أرباح السائق
CREATE OR REPLACE FUNCTION calculate_driver_earnings(
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
    FROM simple_receipts
    WHERE driver_id = p_driver_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_period_days;
    
    RETURN earnings_data;
END;
$$ LANGUAGE plpgsql;

-- 6. إصلاح دالة الفحص
CREATE OR REPLACE FUNCTION check_system_simple() RETURNS JSONB AS $$
DECLARE
    missing_tables TEXT := '';
    table_count INTEGER;
    result JSONB;
BEGIN
    -- فحص الجداول الأساسية
    SELECT COUNT(*) INTO table_count FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    -- فحص جداول محددة
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advanced_pricing_config') THEN
        missing_tables := missing_tables || 'advanced_pricing_config, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simple_receipts') THEN
        missing_tables := missing_tables || 'simple_receipts, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
        missing_tables := missing_tables || 'support_tickets, ';
    END IF;
    
    result := jsonb_build_object(
        'total_tables', table_count,
        'missing_tables', CASE WHEN missing_tables = '' THEN 'none' ELSE missing_tables END,
        'system_status', CASE WHEN missing_tables = '' THEN 'ready' ELSE 'incomplete' END,
        'check_timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. مشاهدة التقارير المبسطة
CREATE OR REPLACE VIEW daily_simple_summary AS
SELECT 
    DATE(created_at) as report_date,
    COUNT(*) as total_receipts,
    SUM(trip_fare) as total_revenue,
    SUM(commission_amount) as platform_commission,
    SUM(driver_earnings) as driver_earnings,
    SUM(tip_amount) as total_tips,
    AVG(trip_fare) as avg_trip_value,
    COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_payments,
    COUNT(CASE WHEN payment_method = 'card' THEN 1 END) as card_payments
FROM simple_receipts
GROUP BY DATE(created_at)
ORDER BY report_date DESC;

-- 8. مشاهدة أداء السائقين
CREATE OR REPLACE VIEW driver_simple_performance AS
SELECT 
    sr.driver_id,
    mp.full_name as driver_name,
    mp.phone_number,
    COUNT(sr.id) as total_trips,
    SUM(sr.driver_earnings) as total_earnings,
    AVG(sr.driver_earnings) as avg_earnings_per_trip,
    SUM(sr.tip_amount) as total_tips,
    SUM(sr.commission_amount) as total_commission_paid,
    MAX(sr.created_at) as last_trip_date
FROM simple_receipts sr
LEFT JOIN main_profiles mp ON mp.id = sr.driver_id
WHERE mp.profile_type = 'driver'
GROUP BY sr.driver_id, mp.full_name, mp.phone_number
ORDER BY total_earnings DESC;

-- رسالة تأكيد
SELECT 'تم إنشاء النظام المبسط بدون دفع إلكتروني معقد بنجاح! 💰🧾' as status;
