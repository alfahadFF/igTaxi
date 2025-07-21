-- ===================================================================
-- إنشاء جداول نظام حجز المناسبات - الجداول والأعمدة فقط
-- ===================================================================

-- تمكين الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- إنشاء الجداول (بدون سياسات أو قيود مرجعية معقدة)
-- ===================================================================

-- جدول طلبات الحجز
CREATE TABLE IF NOT EXISTS event_booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
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
    request_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    
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
    request_id UUID NOT NULL,
    bid_id UUID NOT NULL,
    
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
-- إضافة القيود المرجعية (بعد إنشاء جميع الجداول)
-- ===================================================================

-- إضافة Foreign Keys للطلبات والعروض
DO $$
BEGIN
    -- ربط طلبات الحجز بجدول العروض
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_driver_bids_request_id_fkey'
    ) THEN
        ALTER TABLE event_driver_bids 
        ADD CONSTRAINT event_driver_bids_request_id_fkey 
        FOREIGN KEY (request_id) REFERENCES event_booking_requests(id) ON DELETE CASCADE;
    END IF;

    -- ربط المعاملات بالطلبات
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_transactions_request_id_fkey'
    ) THEN
        ALTER TABLE event_transactions 
        ADD CONSTRAINT event_transactions_request_id_fkey 
        FOREIGN KEY (request_id) REFERENCES event_booking_requests(id) ON DELETE CASCADE;
    END IF;

    -- ربط المعاملات بالعروض
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_transactions_bid_id_fkey'
    ) THEN
        ALTER TABLE event_transactions 
        ADD CONSTRAINT event_transactions_bid_id_fkey 
        FOREIGN KEY (bid_id) REFERENCES event_driver_bids(id) ON DELETE CASCADE;
    END IF;

    RAISE NOTICE 'تم إضافة القيود المرجعية الأساسية';
END
$$;

-- إضافة القيود المرجعية للجداول الخارجية (إذا كانت موجودة)
DO $$
BEGIN
    -- ربط مع جدول المصادقة
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'event_booking_requests_user_id_fkey'
        ) THEN
            ALTER TABLE event_booking_requests 
            ADD CONSTRAINT event_booking_requests_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'تم ربط طلبات الحجز بجدول المصادقة';
        END IF;
    ELSE
        RAISE NOTICE 'جدول auth.users غير موجود - سيتم تخطي الربط';
    END IF;

    -- ربط مع جدول الملفات الشخصية
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_profiles'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'event_driver_bids_driver_id_fkey'
        ) THEN
            ALTER TABLE event_driver_bids 
            ADD CONSTRAINT event_driver_bids_driver_id_fkey 
            FOREIGN KEY (driver_id) REFERENCES main_profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'تم ربط عروض السائقين بجدول الملفات الشخصية';
        END IF;
    ELSE
        RAISE NOTICE 'جدول main_profiles غير موجود - سيتم تخطي الربط';
    END IF;
END
$$;

-- ===================================================================
-- الفهارس لتحسين الأداء
-- ===================================================================

-- فهارس طلبات الحجز
CREATE INDEX IF NOT EXISTS idx_event_requests_user_id ON event_booking_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_event_type ON event_booking_requests(event_type);
CREATE INDEX IF NOT EXISTS idx_event_requests_expires_at ON event_booking_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_event_requests_created_at ON event_booking_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_event_requests_event_date ON event_booking_requests(event_date);

-- فهارس عروض السائقين
CREATE INDEX IF NOT EXISTS idx_event_bids_request_id ON event_driver_bids(request_id);
CREATE INDEX IF NOT EXISTS idx_event_bids_driver_id ON event_driver_bids(driver_id);
CREATE INDEX IF NOT EXISTS idx_event_bids_status ON event_driver_bids(status);
CREATE INDEX IF NOT EXISTS idx_event_bids_created_at ON event_driver_bids(created_at);
CREATE INDEX IF NOT EXISTS idx_event_bids_amount ON event_driver_bids(bid_amount);

-- فهارس المعاملات المالية
CREATE INDEX IF NOT EXISTS idx_event_transactions_request_id ON event_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_event_transactions_bid_id ON event_transactions(bid_id);
CREATE INDEX IF NOT EXISTS idx_event_transactions_payment_status ON event_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_event_transactions_created_at ON event_transactions(created_at);

-- ===================================================================
-- الوظائف المساعدة
-- ===================================================================

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
    
    IF NOT FOUND THEN
        RAISE NOTICE 'طلب غير موجود';
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_bids,
        ROUND(COALESCE(AVG(bid_amount), 0), 2) as average_bid,
        COALESCE(MIN(bid_amount), 0) as min_bid,
        COALESCE(MAX(bid_amount), 0) as max_bid,
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
        RETURN jsonb_build_object('success', false, 'error', 'حدث خطأ في النظام: ' || SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;

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
    -- التحقق من وجود الجداول المطلوبة
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_drivers'
    ) THEN
        RAISE NOTICE 'جدول event_drivers غير موجود';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_profiles'
    ) THEN
        RAISE NOTICE 'جدول main_profiles غير موجود';
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        ed.driver_id,
        COALESCE(mp.full_name, 'سائق') as driver_name,
        COALESCE(mp.rating, 0) as driver_rating,
        COALESCE(ed.vehicle_details, '{}'::jsonb) as vehicle_info,
        -- حساب المسافة (مبسط - يحتاج تحسين مع GPS حقيقي)
        ROUND(CAST(RANDOM() * radius_km AS DECIMAL), 1) as distance_km,
        COALESCE(ed.specializations, '{}'::jsonb) as specializations
    FROM event_drivers ed
    LEFT JOIN main_profiles mp ON ed.driver_id = mp.id
    WHERE ed.status = 'active'
    AND ed.event_types ? event_type_param
    ORDER BY COALESCE(mp.rating, 0) DESC, distance_km ASC
    LIMIT 50;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'خطأ في البحث عن السائقين: %', SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتنظيف البيانات المنتهية الصلاحية
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

-- إنشاء المشغلات
DROP TRIGGER IF EXISTS update_event_requests_updated_at ON event_booking_requests;
CREATE TRIGGER update_event_requests_updated_at 
    BEFORE UPDATE ON event_booking_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_bids_updated_at ON event_driver_bids;
CREATE TRIGGER update_event_bids_updated_at 
    BEFORE UPDATE ON event_driver_bids
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- تسجيل نجاح التنفيذ
-- ===================================================================

DO $$
DECLARE
    tables_count INTEGER;
    functions_count INTEGER;
    indexes_count INTEGER;
BEGIN
    -- عد الجداول المنشأة
    SELECT COUNT(*) INTO tables_count 
    FROM information_schema.tables 
    WHERE table_name IN ('event_booking_requests', 'event_driver_bids', 'event_transactions');
    
    -- عد الوظائف المنشأة
    SELECT COUNT(*) INTO functions_count 
    FROM information_schema.routines 
    WHERE routine_name IN ('get_request_stats', 'accept_driver_bid', 'find_nearby_event_drivers', 'cleanup_expired_data', 'get_system_stats');
    
    -- عد الفهارس المنشأة
    SELECT COUNT(*) INTO indexes_count 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_event%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء جداول نظام حجز المناسبات بنجاح!';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 إحصائيات النظام:';
    RAISE NOTICE '   📋 الجداول المنشأة: % جداول', tables_count;
    RAISE NOTICE '   🔧 الوظائف المنشأة: % وظائف', functions_count;
    RAISE NOTICE '   ⚡ الفهارس المنشأة: % فهرس', indexes_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 الجداول:';
    RAISE NOTICE '   - event_booking_requests: طلبات حجز المناسبات';
    RAISE NOTICE '   - event_driver_bids: عروض أسعار السائقين';
    RAISE NOTICE '   - event_transactions: المعاملات المالية';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 الوظائف:';
    RAISE NOTICE '   - get_request_stats: إحصائيات الطلب';
    RAISE NOTICE '   - accept_driver_bid: قبول عرض السائق';
    RAISE NOTICE '   - find_nearby_event_drivers: البحث عن السائقين';
    RAISE NOTICE '   - cleanup_expired_data: تنظيف البيانات المنتهية';
    RAISE NOTICE '   - get_system_stats: إحصائيات النظام';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية:';
    RAISE NOTICE '   👉 تشغيل EVENT_BOOKING_POLICIES.sql لإضافة سياسات الأمان';
    RAISE NOTICE '';
END
$$;
