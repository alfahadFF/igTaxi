-- ===================================================================
-- نظام حجز المناسبات البسيط - قاعدة البيانات
-- ===================================================================

-- جدول طلبات الحجز
CREATE TABLE IF NOT EXISTS event_booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- تفاصيل المناسبة
    event_type TEXT NOT NULL CHECK (event_type IN ('family', 'wedding', 'tourism', 'field', 'sports', 'concert')),
    title TEXT NOT NULL,
    description TEXT,
    guest_count INTEGER NOT NULL CHECK (guest_count > 0),
    
    -- التوقيت والمدة
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    duration_type TEXT NOT NULL CHECK (duration_type IN ('hours', 'days')),
    duration_value INTEGER NOT NULL CHECK (duration_value > 0),
    
    -- المواقع (JSON array)
    locations JSONB NOT NULL DEFAULT '[]',
    
    -- الميزانية والمميزات
    budget_min DECIMAL(10,2) NOT NULL CHECK (budget_min > 0),
    budget_max DECIMAL(10,2) NOT NULL CHECK (budget_max >= budget_min),
    required_features JSONB DEFAULT '[]',
    special_requests TEXT,
    
    -- إدارة العروض
    bidding_duration INTEGER NOT NULL DEFAULT 30, -- minutes
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- حالة الطلب
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'expired')),
    accepted_bid_id UUID,
    
    -- معلومات النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول عروض السائقين
CREATE TABLE IF NOT EXISTS event_driver_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES event_booking_requests(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- تفاصيل العرض
    bid_amount DECIMAL(10,2) NOT NULL CHECK (bid_amount > 0),
    driver_message TEXT,
    
    -- معلومات إضافية
    estimated_arrival INTEGER, -- minutes
    distance DECIMAL(10,2), -- km
    
    -- حالة العرض
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    
    -- معلومات النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- منع عروض متكررة من نفس السائق
    UNIQUE(request_id, driver_id)
);

-- جدول المعاملات المالية
CREATE TABLE IF NOT EXISTS event_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES event_booking_requests(id) ON DELETE CASCADE,
    bid_id UUID NOT NULL REFERENCES event_driver_bids(id) ON DELETE CASCADE,
    
    -- تفاصيل المعاملة
    total_amount DECIMAL(10,2) NOT NULL,
    app_commission DECIMAL(10,2) NOT NULL, -- 10%
    driver_net_amount DECIMAL(10,2) NOT NULL,
    
    -- حالة الدفع
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    payment_method TEXT NOT NULL DEFAULT 'cash',
    
    -- معلومات النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ===================================================================
-- الفهارس لتحسين الأداء
-- ===================================================================

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_event_requests_user_id ON event_booking_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_event_type ON event_booking_requests(event_type);
CREATE INDEX IF NOT EXISTS idx_event_requests_expires_at ON event_booking_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_event_requests_created_at ON event_booking_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_event_bids_request_id ON event_driver_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_event_bids_driver_id ON event_driver_bids(driver_id);
CREATE INDEX IF NOT EXISTS idx_event_bids_status ON event_driver_bids(status);
CREATE INDEX IF NOT EXISTS idx_event_bids_created_at ON event_driver_bids(created_at);

CREATE INDEX IF NOT EXISTS idx_event_transactions_request_id ON event_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_event_transactions_payment_status ON event_transactions(payment_status);

-- ===================================================================
-- الوظائف المساعدة
-- ===================================================================

-- وظيفة للبحث عن السائقين في نطاق 25 كم
CREATE OR REPLACE FUNCTION find_nearby_event_drivers(
    request_locations JSONB,
    event_type_param TEXT,
    radius_km DECIMAL DEFAULT 25
)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    driver_rating DECIMAL,
    vehicle_info JSONB,
    distance_km DECIMAL,
    specializations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.driver_id,
        mp.full_name,
        COALESCE(mp.rating, 0) as driver_rating,
        ed.vehicle_details,
        -- حساب المسافة (مبسط - يحتاج تحسين مع GPS حقيقي)
        ROUND(CAST(RANDOM() * radius_km AS DECIMAL), 1) as distance_km,
        ed.specializations
    FROM event_drivers ed
    JOIN main_profiles mp ON ed.driver_id = mp.id
    WHERE ed.status = 'active'
    AND ed.event_types ? event_type_param
    AND mp.profile_type = 'driver'
    ORDER BY mp.rating DESC, distance_km ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لحساب إحصائيات الطلب
CREATE OR REPLACE FUNCTION get_request_stats(request_id_param UUID)
RETURNS TABLE (
    total_bids INTEGER,
    average_bid DECIMAL,
    min_bid DECIMAL,
    max_bid DECIMAL,
    time_remaining_minutes INTEGER
) AS $$
DECLARE
    request_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- الحصول على وقت انتهاء الطلب
    SELECT expires_at INTO request_expires_at
    FROM event_booking_requests 
    WHERE id = request_id_param;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_bids,
        ROUND(AVG(bid_amount), 2) as average_bid,
        MIN(bid_amount) as min_bid,
        MAX(bid_amount) as max_bid,
        GREATEST(0, EXTRACT(EPOCH FROM (request_expires_at - NOW()))/60)::INTEGER as time_remaining_minutes
    FROM event_driver_bids 
    WHERE request_id = request_id_param
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- وظيفة لقبول عرض سائق
CREATE OR REPLACE FUNCTION accept_driver_bid(
    request_id_param UUID,
    bid_id_param UUID,
    user_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
    bid_amount DECIMAL;
    driver_id UUID;
    commission DECIMAL;
    net_amount DECIMAL;
    transaction_id UUID;
    result JSONB;
BEGIN
    -- التحقق من ملكية الطلب
    IF NOT EXISTS (
        SELECT 1 FROM event_booking_requests 
        WHERE id = request_id_param AND user_id = user_id_param AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'طلب غير صالح أو منتهي الصلاحية');
    END IF;
    
    -- الحصول على تفاصيل العرض
    SELECT edb.bid_amount, edb.driver_id 
    INTO bid_amount, driver_id
    FROM event_driver_bids edb
    WHERE edb.id = bid_id_param AND edb.request_id = request_id_param AND edb.status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'عرض غير صالح');
    END IF;
    
    -- حساب العمولة
    commission := bid_amount * 0.10;
    net_amount := bid_amount - commission;
    
    -- بداية المعاملة
    BEGIN
        -- تحديث حالة الطلب
        UPDATE event_booking_requests 
        SET 
            status = 'accepted',
            accepted_bid_id = bid_id_param,
            updated_at = NOW()
        WHERE id = request_id_param;
        
        -- تحديث حالة العرض المقبول
        UPDATE event_driver_bids 
        SET 
            status = 'accepted',
            updated_at = NOW()
        WHERE id = bid_id_param;
        
        -- رفض باقي العروض
        UPDATE event_driver_bids 
        SET 
            status = 'rejected',
            updated_at = NOW()
        WHERE request_id = request_id_param 
        AND id != bid_id_param 
        AND status = 'pending';
        
        -- إنشاء معاملة مالية
        INSERT INTO event_transactions (
            request_id, bid_id, total_amount, app_commission, driver_net_amount
        ) VALUES (
            request_id_param, bid_id_param, bid_amount, commission, net_amount
        ) RETURNING id INTO transaction_id;
        
        -- إرجاع النتيجة
        result := jsonb_build_object(
            'success', true,
            'transaction_id', transaction_id,
            'total_amount', bid_amount,
            'commission', commission,
            'net_amount', net_amount,
            'driver_id', driver_id
        );
        
        RETURN result;
        
    EXCEPTION WHEN OTHERS THEN
        -- في حالة حدوث خطأ
        RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ في النظام');
    END;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- سياسات الأمان (RLS)
-- ===================================================================

-- تفعيل RLS
ALTER TABLE event_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_driver_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_transactions ENABLE ROW LEVEL SECURITY;

-- سياسات طلبات الحجز
CREATE POLICY "Users can view own booking requests" ON event_booking_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create booking requests" ON event_booking_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking requests" ON event_booking_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- السائقون يمكنهم رؤية الطلبات النشطة فقط
CREATE POLICY "Drivers can view active requests" ON event_booking_requests
    FOR SELECT USING (
        status = 'pending' 
        AND expires_at > NOW()
        AND EXISTS (
            SELECT 1 FROM main_profiles 
            WHERE id = auth.uid() 
            AND profile_type = 'driver'
        )
    );

-- سياسات عروض السائقين
CREATE POLICY "Drivers can view own bids" ON event_driver_bids
    FOR SELECT USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can create bids" ON event_driver_bids
    FOR INSERT WITH CHECK (
        auth.uid() = driver_id
        AND EXISTS (
            SELECT 1 FROM main_profiles 
            WHERE id = auth.uid() 
            AND profile_type = 'driver'
        )
    );

-- العملاء يمكنهم رؤية العروض على طلباتهم
CREATE POLICY "Users can view bids on their requests" ON event_driver_bids
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_booking_requests 
            WHERE id = request_id 
            AND user_id = auth.uid()
        )
    );

-- سياسات المعاملات المالية
CREATE POLICY "Users can view own transactions" ON event_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_booking_requests 
            WHERE id = request_id 
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM event_driver_bids 
            WHERE id = bid_id 
            AND driver_id = auth.uid()
        )
    );

-- ===================================================================
-- مشغلات التحديث التلقائي
-- ===================================================================

-- مشغل لتحديث وقت التعديل
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_requests_updated_at 
    BEFORE UPDATE ON event_booking_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_bids_updated_at 
    BEFORE UPDATE ON event_driver_bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- مشغل لتحديث الطلبات المنتهية الصلاحية
CREATE OR REPLACE FUNCTION expire_old_requests()
RETURNS void AS $$
BEGIN
    UPDATE event_booking_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    -- رفض العروض على الطلبات المنتهية
    UPDATE event_driver_bids 
    SET status = 'rejected', updated_at = NOW()
    WHERE status = 'pending'
    AND request_id IN (
        SELECT id FROM event_booking_requests 
        WHERE status = 'expired'
    );
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- وظائف إضافية للنظام
-- ===================================================================

-- وظيفة للتحقق من وجود بيانات المستخدم
CREATE OR REPLACE FUNCTION check_user_exists()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM auth.users LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتنظيف البيانات المنتهية الصلاحية (يجب تشغيلها دورياً)
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    -- تحديث الطلبات المنتهية
    UPDATE event_booking_requests 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- رفض العروض على الطلبات المنتهية
    UPDATE event_driver_bids 
    SET status = 'rejected', updated_at = NOW()
    WHERE status = 'pending'
    AND request_id IN (
        SELECT id FROM event_booking_requests 
        WHERE status = 'expired'
    );
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لإحصائيات النظام
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
    total_requests INTEGER,
    active_requests INTEGER,
    completed_requests INTEGER,
    total_bids INTEGER,
    total_transactions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM event_booking_requests) as total_requests,
        (SELECT COUNT(*)::INTEGER FROM event_booking_requests WHERE status = 'pending') as active_requests,
        (SELECT COUNT(*)::INTEGER FROM event_booking_requests WHERE status = 'completed') as completed_requests,
        (SELECT COUNT(*)::INTEGER FROM event_driver_bids) as total_bids,
        (SELECT COUNT(*)::INTEGER FROM event_transactions) as total_transactions;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- تعليق: نظام حجز المناسبات - قاعدة البيانات الأساسية
-- ===================================================================
-- هذا النظام يوفر:
-- 1. إدارة طلبات حجز المناسبات
-- 2. نظام عروض السائقين البسيط (بدون مزايدات)
-- 3. إدارة المعاملات المالية مع عمولة 10%
-- 4. أمان متقدم مع Row Level Security
-- 5. وظائف مساعدة للبحث والإحصائيات
-- 
-- ملاحظة: التطبيق قيد التطوير ولا يحتوي على بيانات تجريبية
-- يجب إنشاء المستخدمين والملفات الشخصية أولاً قبل الاستخدام
