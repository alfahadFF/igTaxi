-- ===================================================================
-- سياسات الأمان (RLS) لنظام حجز المناسبات
-- تطبق بعد إنشاء الجداول في EVENT_BOOKING_TABLES.sql
-- ===================================================================

-- ===================================================================
-- التحقق من وجود الجداول المطلوبة
-- ===================================================================

DO $$
BEGIN
    -- التحقق من وجود جدول طلبات الحجز
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_booking_requests'
    ) THEN
        RAISE EXCEPTION 'جدول event_booking_requests غير موجود. يجب تشغيل EVENT_BOOKING_TABLES.sql أولاً';
    END IF;

    -- التحقق من وجود جدول عروض السائقين
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_driver_bids'
    ) THEN
        RAISE EXCEPTION 'جدول event_driver_bids غير موجود. يجب تشغيل EVENT_BOOKING_TABLES.sql أولاً';
    END IF;

    -- التحقق من وجود جدول المعاملات
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'event_transactions'
    ) THEN
        RAISE EXCEPTION 'جدول event_transactions غير موجود. يجب تشغيل EVENT_BOOKING_TABLES.sql أولاً';
    END IF;

    RAISE NOTICE 'تم التحقق من وجود جميع الجداول المطلوبة ✅';
END
$$;

-- ===================================================================
-- تفعيل Row Level Security (RLS)
-- ===================================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE event_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_driver_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'تم تفعيل Row Level Security على جميع الجداول';
END
$$;

-- ===================================================================
-- سياسات طلبات الحجز (event_booking_requests)
-- ===================================================================

-- حذف السياسات الموجودة (إن وجدت)
DROP POLICY IF EXISTS "Users can view own booking requests" ON event_booking_requests;
DROP POLICY IF EXISTS "Users can create booking requests" ON event_booking_requests;
DROP POLICY IF EXISTS "Users can update own booking requests" ON event_booking_requests;
DROP POLICY IF EXISTS "Drivers can view active requests" ON event_booking_requests;

-- العملاء يمكنهم رؤية طلباتهم فقط
CREATE POLICY "Users can view own booking requests" ON event_booking_requests
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id
    );

-- العملاء يمكنهم إنشاء طلبات جديدة
CREATE POLICY "Users can create booking requests" ON event_booking_requests
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id
    );

-- العملاء يمكنهم تعديل طلباتهم (فقط عندما تكون في حالة pending)
CREATE POLICY "Users can update own booking requests" ON event_booking_requests
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id 
        AND status = 'pending'
    );

-- السائقون يمكنهم رؤية الطلبات النشطة فقط
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_profiles'
    ) THEN
        CREATE POLICY "Drivers can view active requests" ON event_booking_requests
            FOR SELECT USING (
                auth.uid() IS NOT NULL
                AND status = 'pending' 
                AND expires_at > NOW()
                AND EXISTS (
                    SELECT 1 FROM main_profiles 
                    WHERE id = auth.uid() 
                    AND profile_type = 'driver'
                )
            );
        RAISE NOTICE 'تم إنشاء سياسة رؤية الطلبات للسائقين مع جدول main_profiles';
    ELSE
        CREATE POLICY "Drivers can view active requests" ON event_booking_requests
            FOR SELECT USING (
                auth.uid() IS NOT NULL
                AND status = 'pending' 
                AND expires_at > NOW()
            );
        RAISE NOTICE 'تم إنشاء سياسة رؤية الطلبات للسائقين بدون جدول main_profiles';
    END IF;
END
$$;

-- ===================================================================
-- سياسات عروض السائقين (event_driver_bids)
-- ===================================================================

-- حذف السياسات الموجودة (إن وجدت)
DROP POLICY IF EXISTS "Drivers can view own bids" ON event_driver_bids;
DROP POLICY IF EXISTS "Drivers can create bids" ON event_driver_bids;
DROP POLICY IF EXISTS "Users can view bids on their requests" ON event_driver_bids;
DROP POLICY IF EXISTS "Drivers can update own bids" ON event_driver_bids;

-- السائقون يمكنهم رؤية عروضهم فقط
CREATE POLICY "Drivers can view own bids" ON event_driver_bids
    FOR SELECT USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = driver_id
    );

-- السائقون يمكنهم إنشاء عروض جديدة
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_profiles'
    ) THEN
        CREATE POLICY "Drivers can create bids" ON event_driver_bids
            FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL
                AND auth.uid() = driver_id
                AND EXISTS (
                    SELECT 1 FROM main_profiles 
                    WHERE id = auth.uid() 
                    AND profile_type = 'driver'
                )
                AND EXISTS (
                    SELECT 1 FROM event_booking_requests 
                    WHERE id = request_id 
                    AND status = 'pending' 
                    AND expires_at > NOW()
                )
            );
        RAISE NOTICE 'تم إنشاء سياسة إنشاء العروض للسائقين مع جدول main_profiles';
    ELSE
        CREATE POLICY "Drivers can create bids" ON event_driver_bids
            FOR INSERT WITH CHECK (
                auth.uid() IS NOT NULL
                AND auth.uid() = driver_id
                AND EXISTS (
                    SELECT 1 FROM event_booking_requests 
                    WHERE id = request_id 
                    AND status = 'pending' 
                    AND expires_at > NOW()
                )
            );
        RAISE NOTICE 'تم إنشاء سياسة إنشاء العروض للسائقين بدون جدول main_profiles';
    END IF;
END
$$;

-- السائقون يمكنهم تعديل عروضهم (فقط عندما تكون pending)
CREATE POLICY "Drivers can update own bids" ON event_driver_bids
    FOR UPDATE USING (
        auth.uid() IS NOT NULL 
        AND auth.uid() = driver_id 
        AND status = 'pending'
    );

-- العملاء يمكنهم رؤية العروض على طلباتهم فقط
CREATE POLICY "Users can view bids on their requests" ON event_driver_bids
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM event_booking_requests 
            WHERE id = request_id 
            AND user_id = auth.uid()
        )
    );

-- ===================================================================
-- سياسات المعاملات المالية (event_transactions)
-- ===================================================================

-- حذف السياسات الموجودة (إن وجدت)
DROP POLICY IF EXISTS "Users can view own transactions" ON event_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON event_transactions;

-- العملاء والسائقون يمكنهم رؤية معاملاتهم فقط
CREATE POLICY "Users can view own transactions" ON event_transactions
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (
            -- العميل يمكنه رؤية معاملات طلباته
            EXISTS (
                SELECT 1 FROM event_booking_requests 
                WHERE id = request_id 
                AND user_id = auth.uid()
            )
            OR
            -- السائق يمكنه رؤية معاملات عروضه
            EXISTS (
                SELECT 1 FROM event_driver_bids 
                WHERE id = bid_id 
                AND driver_id = auth.uid()
            )
        )
    );

-- سياسة للمديرين (إذا كان هناك جدول أدوار)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_profiles'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'main_profiles' 
        AND column_name = 'role'
    ) THEN
        CREATE POLICY "Admins can view all transactions" ON event_transactions
            FOR SELECT USING (
                auth.uid() IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM main_profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
            );
        RAISE NOTICE 'تم إنشاء سياسة رؤية المعاملات للمديرين';
    ELSE
        RAISE NOTICE 'لم يتم إنشاء سياسة المديرين - العمود role غير موجود في main_profiles';
    END IF;
END
$$;

-- ===================================================================
-- وظائف أمان إضافية
-- ===================================================================

-- وظيفة للتحقق من صلاحيات المستخدم
CREATE OR REPLACE FUNCTION check_user_permissions(user_id_param UUID, required_role TEXT DEFAULT 'user')
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- التحقق من وجود المستخدم
    IF user_id_param IS NULL OR auth.uid() != user_id_param THEN
        RETURN FALSE;
    END IF;
    
    -- إذا لم يكن هناك جدول أدوار، فجميع المستخدمين لديهم صلاحية user
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'main_profiles'
    ) THEN
        RETURN (required_role = 'user');
    END IF;
    
    -- الحصول على دور المستخدم
    SELECT COALESCE(role, 'user') INTO user_role
    FROM main_profiles 
    WHERE id = user_id_param;
    
    -- التحقق من الصلاحية
    CASE required_role
        WHEN 'admin' THEN
            RETURN (user_role = 'admin');
        WHEN 'driver' THEN
            RETURN (user_role IN ('driver', 'admin'));
        WHEN 'user' THEN
            RETURN (user_role IN ('user', 'driver', 'admin'));
        ELSE
            RETURN FALSE;
    END CASE;
    
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة للتحقق من صحة البيانات قبل الإدراج
CREATE OR REPLACE FUNCTION validate_booking_request()
RETURNS TRIGGER AS $$
BEGIN
    -- التحقق من المستخدم المصرح
    IF auth.uid() IS NULL OR auth.uid() != NEW.user_id THEN
        RAISE EXCEPTION 'غير مصرح بإنشاء طلب لمستخدم آخر';
    END IF;
    
    -- التحقق من التاريخ
    IF NEW.event_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'لا يمكن إنشاء طلب لتاريخ سابق';
    END IF;
    
    -- التحقق من وقت انتهاء المزايدة
    IF NEW.expires_at <= NOW() THEN
        RAISE EXCEPTION 'وقت انتهاء المزايدة يجب أن يكون في المستقبل';
    END IF;
    
    -- التحقق من الميزانية
    IF NEW.budget_min <= 0 OR NEW.budget_max < NEW.budget_min THEN
        RAISE EXCEPTION 'الميزانية غير صحيحة';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- وظيفة للتحقق من صحة العروض
CREATE OR REPLACE FUNCTION validate_driver_bid()
RETURNS TRIGGER AS $$
DECLARE
    request_status TEXT;
    request_expires TIMESTAMP WITH TIME ZONE;
BEGIN
    -- التحقق من المستخدم المصرح
    IF auth.uid() IS NULL OR auth.uid() != NEW.driver_id THEN
        RAISE EXCEPTION 'غير مصرح بإنشاء عرض لسائق آخر';
    END IF;
    
    -- التحقق من حالة الطلب
    SELECT status, expires_at INTO request_status, request_expires
    FROM event_booking_requests 
    WHERE id = NEW.request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'طلب غير موجود';
    END IF;
    
    IF request_status != 'pending' THEN
        RAISE EXCEPTION 'لا يمكن تقديم عرض على طلب غير نشط';
    END IF;
    
    IF request_expires <= NOW() THEN
        RAISE EXCEPTION 'انتهت فترة تقديم العروض';
    END IF;
    
    -- التحقق من المبلغ
    IF NEW.bid_amount <= 0 THEN
        RAISE EXCEPTION 'مبلغ العرض يجب أن يكون أكبر من الصفر';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- تطبيق المشغلات للتحقق من صحة البيانات
-- ===================================================================

-- مشغل للتحقق من طلبات الحجز
DROP TRIGGER IF EXISTS validate_booking_request_trigger ON event_booking_requests;
CREATE TRIGGER validate_booking_request_trigger
    BEFORE INSERT OR UPDATE ON event_booking_requests
    FOR EACH ROW EXECUTE FUNCTION validate_booking_request();

-- مشغل للتحقق من عروض السائقين
DROP TRIGGER IF EXISTS validate_driver_bid_trigger ON event_driver_bids;
CREATE TRIGGER validate_driver_bid_trigger
    BEFORE INSERT OR UPDATE ON event_driver_bids
    FOR EACH ROW EXECUTE FUNCTION validate_driver_bid();

-- ===================================================================
-- وظائف أمان لاستخدام العامة
-- ===================================================================

-- وظيفة آمنة لإنشاء طلب حجز
CREATE OR REPLACE FUNCTION create_booking_request(
    event_type_param TEXT,
    title_param TEXT,
    description_param TEXT,
    guest_count_param INTEGER,
    event_date_param DATE,
    event_time_param TIME,
    duration_type_param TEXT,
    duration_value_param INTEGER,
    locations_param JSONB,
    budget_min_param DECIMAL,
    budget_max_param DECIMAL,
    required_features_param JSONB DEFAULT '[]',
    special_requests_param TEXT DEFAULT NULL,
    bidding_duration_param INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
    expires_at TIMESTAMP WITH TIME ZONE;
    request_id UUID;
BEGIN
    -- الحصول على معرف المستخدم
    user_id := auth.uid();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;
    
    -- حساب وقت انتهاء المزايدة
    expires_at := NOW() + INTERVAL '1 minute' * bidding_duration_param;
    
    -- إنشاء الطلب
    INSERT INTO event_booking_requests (
        user_id, event_type, title, description, guest_count,
        event_date, event_time, duration_type, duration_value,
        locations, budget_min, budget_max, required_features,
        special_requests, bidding_duration, expires_at
    ) VALUES (
        user_id, event_type_param, title_param, description_param, guest_count_param,
        event_date_param, event_time_param, duration_type_param, duration_value_param,
        locations_param, budget_min_param, budget_max_param, required_features_param,
        special_requests_param, bidding_duration_param, expires_at
    ) RETURNING id INTO request_id;
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- وظيفة آمنة لتقديم عرض
CREATE OR REPLACE FUNCTION submit_driver_bid(
    request_id_param UUID,
    bid_amount_param DECIMAL,
    driver_message_param TEXT DEFAULT NULL,
    estimated_arrival_param INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    driver_id UUID;
    bid_id UUID;
BEGIN
    -- الحصول على معرف السائق
    driver_id := auth.uid();
    IF driver_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;
    
    -- إنشاء العرض
    INSERT INTO event_driver_bids (
        request_id, driver_id, bid_amount, driver_message, estimated_arrival
    ) VALUES (
        request_id_param, driver_id, bid_amount_param, driver_message_param, estimated_arrival_param
    ) RETURNING id INTO bid_id;
    
    RETURN bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- تسجيل نجاح التنفيذ
-- ===================================================================

DO $$
DECLARE
    policies_count INTEGER;
    functions_count INTEGER;
    triggers_count INTEGER;
BEGIN
    -- عد السياسات المنشأة
    SELECT COUNT(*) INTO policies_count 
    FROM pg_policies 
    WHERE tablename IN ('event_booking_requests', 'event_driver_bids', 'event_transactions');
    
    -- عد الوظائف الأمنية
    SELECT COUNT(*) INTO functions_count 
    FROM information_schema.routines 
    WHERE routine_name IN ('check_user_permissions', 'validate_booking_request', 'validate_driver_bid', 
                          'create_booking_request', 'submit_driver_bid');
    
    -- عد المشغلات
    SELECT COUNT(*) INTO triggers_count 
    FROM information_schema.triggers 
    WHERE trigger_name IN ('validate_booking_request_trigger', 'validate_driver_bid_trigger');
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 ═══════════════════════════════════════════════';
    RAISE NOTICE '✅ تم تطبيق سياسات الأمان بنجاح!';
    RAISE NOTICE '🔒 ═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 إحصائيات الأمان:';
    RAISE NOTICE '   🛡️  السياسات المطبقة: % سياسة', policies_count;
    RAISE NOTICE '   🔧 الوظائف الأمنية: % وظيفة', functions_count;
    RAISE NOTICE '   ⚡ المشغلات الأمنية: % مشغل', triggers_count;
    RAISE NOTICE '';
    RAISE NOTICE '🛡️  السياسات المطبقة:';
    RAISE NOTICE '   - العملاء: رؤية وإدارة طلباتهم فقط';
    RAISE NOTICE '   - السائقون: رؤية الطلبات النشطة وإدارة عروضهم';
    RAISE NOTICE '   - المعاملات: مقيدة حسب الملكية';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 الوظائف الأمنية:';
    RAISE NOTICE '   - create_booking_request: إنشاء طلب آمن';
    RAISE NOTICE '   - submit_driver_bid: تقديم عرض آمن';
    RAISE NOTICE '   - check_user_permissions: فحص الصلاحيات';
    RAISE NOTICE '';
    RAISE NOTICE '✅ النظام جاهز للاستخدام الآمن!';
    RAISE NOTICE '';
END
$$;
