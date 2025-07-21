-- ===================================================================
-- إنشاء الجداول الأساسية المطلوبة لنظام تطبيق سيارات الأجرة
-- ===================================================================

-- تمكين الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- تمكين PostGIS مع معالجة الأخطاء
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "postgis";
    RAISE NOTICE 'تم تمكين PostGIS بنجاح';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'تعذر تمكين PostGIS: %. سيتم استخدام TEXT للمواقع بدلاً من POINT', SQLERRM;
END
$$;

-- ===================================================================
-- جدول الملفات الشخصية الرئيسي
-- ===================================================================

CREATE TABLE IF NOT EXISTS main_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معلومات شخصية أساسية
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female')),
    
    -- نوع الملف الشخصي
    profile_type TEXT NOT NULL CHECK (profile_type IN ('customer', 'driver', 'transporter', 'business')),
    
    -- معلومات الموقع
    city TEXT,
    address TEXT,
    location TEXT, -- سيتم تحويله لـ POINT إذا كان PostGIS متاح
    
    -- معلومات النظام
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    
    -- تقييمات ومعلومات إضافية
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_ratings INTEGER DEFAULT 0,
    language_preference TEXT DEFAULT 'ar' CHECK (language_preference IN ('ar', 'en')),
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE
);

-- ربط مع نظام المصادقة إذا كان متوفر
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        -- إضافة عمود user_id إذا لم يكن موجود
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'main_profiles' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE main_profiles 
            ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            
            -- إنشاء فهرس فريد
            CREATE UNIQUE INDEX IF NOT EXISTS idx_main_profiles_user_id ON main_profiles(user_id);
        END IF;
    ELSE
        RAISE NOTICE 'جدول auth.users غير موجود - سيتم تخطي ربط المصادقة';
    END IF;
END
$$;

-- تحويل عمود الموقع إلى POINT إذا كان PostGIS متاح
DO $$
BEGIN
    -- التحقق من وجود الجدول أولاً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'main_profiles'
    ) THEN
        RAISE NOTICE 'جدول main_profiles غير موجود - تم تخطي تحويل نوع البيانات';
        RETURN;
    END IF;

    -- التحقق من وجود PostGIS والعمود
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
    AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' AND column_name = 'location'
    ) THEN
        -- تحويل عمود location إلى POINT
        ALTER TABLE main_profiles ALTER COLUMN location TYPE POINT USING NULL;
        RAISE NOTICE 'تم تحويل عمود الموقع إلى نوع POINT';
    ELSE
        IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
            RAISE NOTICE 'PostGIS غير متاح - سيبقى عمود الموقع كـ TEXT';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'main_profiles' AND column_name = 'location'
        ) THEN
            RAISE NOTICE 'عمود الموقع غير موجود في الجدول';
        END IF;
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'خطأ في تحويل نوع البيانات: %', SQLERRM;
END
$$;

-- ===================================================================
-- جدول سائقي المناسبات الخاصة
-- ===================================================================

CREATE TABLE IF NOT EXISTS event_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- معلومات التخصص
    event_types JSONB NOT NULL DEFAULT '[]', -- ['family', 'wedding', 'tourism', 'field', 'sports', 'concert']
    specializations JSONB DEFAULT '[]',
    
    -- معلومات المركبة
    vehicle_details JSONB NOT NULL DEFAULT '{}',
    vehicle_capacity INTEGER NOT NULL CHECK (vehicle_capacity > 0),
    vehicle_features JSONB DEFAULT '[]',
    
    -- معلومات التشغيل
    operating_areas JSONB DEFAULT '[]', -- Cities/regions where driver operates
    pricing_model JSONB DEFAULT '{}',   -- Pricing structure for different event types
    
    -- حالة السائق
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
    
    -- وثائق ومعلومات إضافية
    documents JSONB DEFAULT '{}',
    experience_years INTEGER DEFAULT 0,
    languages JSONB DEFAULT '["ar"]',
    
    -- معلومات مالية
    commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- منع التسجيل المتكرر
    UNIQUE(driver_id)
);

-- ===================================================================
-- جدول أنواع المناسبات وإعداداتها
-- ===================================================================

CREATE TABLE IF NOT EXISTS event_types_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_key TEXT UNIQUE NOT NULL,
    
    -- معلومات أساسية
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    icon_name TEXT,
    
    -- إعدادات التسعير
    base_price_min DECIMAL(10,2) DEFAULT 0,
    base_price_max DECIMAL(10,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    
    -- إعدادات النظام
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    is_active BOOLEAN DEFAULT true,
    requires_special_license BOOLEAN DEFAULT false,
    min_advance_booking_hours INTEGER DEFAULT 24,
    max_advance_booking_days INTEGER DEFAULT 30,
    
    -- معلومات إضافية
    required_vehicle_features JSONB DEFAULT '[]',
    allowed_duration_types JSONB DEFAULT '["hours", "days"]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج أنواع المناسبات الأساسية
DO $$
BEGIN
    -- التحقق من وجود الجدول والعمود
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_types_config'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_types_config' AND column_name = 'status'
    ) THEN
        INSERT INTO event_types_config (type_key, name_ar, name_en, description_ar, description_en, icon_name) 
        VALUES 
            ('family', 'مناسبات عائلية', 'Family Events', 'رحلات وزيارات عائلية', 'Family trips and visits', 'family'),
            ('wedding', 'حفلات زفاف', 'Wedding Events', 'نقل العرائس والضيوف', 'Bride and guest transportation', 'wedding'),
            ('tourism', 'سياحة ورحلات', 'Tourism & Trips', 'جولات سياحية ورحلات', 'Tourist tours and trips', 'tourism'),
            ('field', 'رحلات برية', 'Field Trips', 'رحلات للمناطق الطبيعية', 'Nature and outdoor trips', 'field'),
            ('sports', 'مناسبات رياضية', 'Sports Events', 'نقل للمباريات والفعاليات', 'Sports matches and events', 'sports'),
            ('concert', 'حفلات ومؤتمرات', 'Concerts & Conferences', 'فعاليات ثقافية ومهنية', 'Cultural and professional events', 'concert')
        ON CONFLICT (type_key) DO NOTHING;
        
        RAISE NOTICE 'تم إدراج أنواع المناسبات الأساسية';
    ELSE
        RAISE NOTICE 'تعذر إدراج أنواع المناسبات - الجدول أو العمود غير موجود';
    END IF;
END
$$;

-- ===================================================================
-- جدول التقييمات
-- ===================================================================

CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- أطراف التقييم
    rater_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    rated_id UUID NOT NULL REFERENCES main_profiles(id) ON DELETE CASCADE,
    
    -- معلومات التقييم
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    service_type TEXT CHECK (service_type IN ('taxi', 'event', 'transport', 'business')),
    
    -- معلومات إضافية
    trip_id UUID, -- ربط بالرحلة إذا كان متوفر
    event_request_id UUID, -- ربط بطلب المناسبة
    
    -- حالة التقييم
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged')),
    
    -- تواريخ النظام
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- منع التقييم المتكرر لنفس الخدمة
    UNIQUE(rater_id, rated_id, trip_id, event_request_id)
);

-- ===================================================================
-- الفهارس لتحسين الأداء
-- ===================================================================

-- فهارس للملفات الشخصية
CREATE INDEX IF NOT EXISTS idx_main_profiles_profile_type ON main_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_main_profiles_status ON main_profiles(status);
CREATE INDEX IF NOT EXISTS idx_main_profiles_city ON main_profiles(city);
CREATE INDEX IF NOT EXISTS idx_main_profiles_phone ON main_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_main_profiles_created_at ON main_profiles(created_at);

-- فهارس مكانية للموقع (إذا كان PostGIS متاح)
DO $$
BEGIN
    -- التحقق من وجود العمود أولاً
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' AND column_name = 'location'
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
            CREATE INDEX IF NOT EXISTS idx_main_profiles_location ON main_profiles USING GIST(location);
            RAISE NOTICE 'تم إنشاء فهرس مكاني للمواقع';
        ELSE
            CREATE INDEX IF NOT EXISTS idx_main_profiles_location ON main_profiles(location);
            RAISE NOTICE 'تم إنشاء فهرس نصي للمواقع';
        END IF;
    ELSE
        RAISE NOTICE 'تم تخطي إنشاء فهرس الموقع - العمود غير موجود';
    END IF;
END
$$;

-- فهارس لسائقي المناسبات
CREATE INDEX IF NOT EXISTS idx_event_drivers_driver_id ON event_drivers(driver_id);
CREATE INDEX IF NOT EXISTS idx_event_drivers_status ON event_drivers(status);
CREATE INDEX IF NOT EXISTS idx_event_drivers_availability ON event_drivers(availability_status);
CREATE INDEX IF NOT EXISTS idx_event_drivers_event_types ON event_drivers USING GIN(event_types);

-- فهارس للتقييمات
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_service_type ON ratings(service_type);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- فهارس لإعدادات أنواع المناسبات
CREATE INDEX IF NOT EXISTS idx_event_types_config_status ON event_types_config(status);
CREATE INDEX IF NOT EXISTS idx_event_types_config_is_active ON event_types_config(is_active);
CREATE INDEX IF NOT EXISTS idx_event_types_config_type_key ON event_types_config(type_key);

-- ===================================================================
-- الوظائف المساعدة
-- ===================================================================

-- وظيفة لحساب المسافة بين نقطتين (مبسطة)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- حساب المسافة بالكيلومتر باستخدام معادلة Haversine المبسطة
    RETURN ROUND(
        6371 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) * 
            cos(radians(lon2) - radians(lon1)) + 
            sin(radians(lat1)) * sin(radians(lat2))
        ), 
        2
    );
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لتحديث التقييم الإجمالي للملف الشخصي
CREATE OR REPLACE FUNCTION update_profile_rating(profile_id_param UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL;
    total_count INTEGER;
BEGIN
    -- حساب المتوسط والعدد الإجمالي
    SELECT 
        COALESCE(AVG(rating), 0), 
        COUNT(*)
    INTO avg_rating, total_count
    FROM ratings 
    WHERE rated_id = profile_id_param 
    AND status = 'active';
    
    -- تحديث الملف الشخصي
    UPDATE main_profiles 
    SET 
        rating = ROUND(avg_rating, 2),
        total_ratings = total_count,
        updated_at = NOW()
    WHERE id = profile_id_param;
END;
$$ LANGUAGE plpgsql;

-- وظيفة للبحث عن السائقين حسب المنطقة ونوع المناسبة
CREATE OR REPLACE FUNCTION search_event_drivers(
    event_type_param TEXT,
    city_param TEXT DEFAULT NULL,
    lat DECIMAL DEFAULT NULL,
    lon DECIMAL DEFAULT NULL,
    radius_km DECIMAL DEFAULT 25
)
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    rating DECIMAL,
    vehicle_info JSONB,
    distance_km DECIMAL,
    phone TEXT,
    specializations JSONB
) AS $$
BEGIN
    -- التحقق من أن نوع المناسبة نشط
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_types_config'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM event_types_config 
            WHERE type_key = event_type_param 
            AND status = 'active' 
            AND is_active = true
        ) THEN
            RAISE NOTICE 'نوع المناسبة % غير متاح حالياً', event_type_param;
            RETURN;
        END IF;
    ELSE
        RAISE NOTICE 'جدول إعدادات المناسبات غير موجود';
    END IF;

    RETURN QUERY
    SELECT 
        ed.driver_id,
        mp.full_name as driver_name,
        COALESCE(mp.rating, 0) as rating,
        ed.vehicle_details as vehicle_info,
        CASE 
            WHEN lat IS NOT NULL AND lon IS NOT NULL AND mp.location IS NOT NULL THEN
                CASE 
                    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') 
                    AND EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'main_profiles' 
                        AND column_name = 'location' 
                        AND data_type = 'USER-DEFINED'
                    ) THEN
                        calculate_distance(lat, lon, ST_X(mp.location), ST_Y(mp.location))
                    ELSE 0
                END
            ELSE 0
        END as distance_km,
        mp.phone,
        ed.specializations
    FROM event_drivers ed
    JOIN main_profiles mp ON ed.driver_id = mp.id
    WHERE ed.status = 'active'
    AND ed.availability_status = 'available'
    AND mp.status = 'active'
    AND ed.event_types ? event_type_param
    AND (city_param IS NULL OR mp.city = city_param)
    ORDER BY mp.rating DESC, distance_km ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- وظيفة لإدارة حالة أنواع المناسبات
CREATE OR REPLACE FUNCTION manage_event_type_status(
    type_key_param TEXT,
    new_status TEXT,
    new_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- التحقق من وجود الجدول
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_types_config'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'جدول إعدادات المناسبات غير موجود');
    END IF;
    
    -- التحقق من صحة الحالة
    IF new_status NOT IN ('active', 'inactive', 'maintenance') THEN
        RETURN jsonb_build_object('success', false, 'error', 'حالة غير صالحة');
    END IF;
    
    -- تحديث الحالة
    UPDATE event_types_config 
    SET 
        status = new_status,
        is_active = COALESCE(new_is_active, is_active),
        updated_at = NOW()
    WHERE type_key = type_key_param;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'نوع المناسبة غير موجود');
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'type_key', type_key_param,
        'status', new_status,
        'is_active', COALESCE(new_is_active, true)
    );
END;
$$ LANGUAGE plpgsql;

-- وظيفة للحصول على أنواع المناسبات النشطة
CREATE OR REPLACE FUNCTION get_active_event_types()
RETURNS TABLE (
    type_key TEXT,
    name_ar TEXT,
    name_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    icon_name TEXT,
    base_price_min DECIMAL,
    base_price_max DECIMAL,
    min_advance_booking_hours INTEGER
) AS $$
BEGIN
    -- التحقق من وجود الجدول
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_types_config'
    ) THEN
        RAISE NOTICE 'جدول إعدادات المناسبات غير موجود';
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        etc.type_key,
        etc.name_ar,
        etc.name_en,
        etc.description_ar,
        etc.description_en,
        etc.icon_name,
        etc.base_price_min,
        etc.base_price_max,
        etc.min_advance_booking_hours
    FROM event_types_config etc
    WHERE etc.status = 'active' 
    AND etc.is_active = true
    ORDER BY etc.name_ar;
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

-- تطبيق المشغل على الجداول
DROP TRIGGER IF EXISTS update_main_profiles_updated_at ON main_profiles;
CREATE TRIGGER update_main_profiles_updated_at 
    BEFORE UPDATE ON main_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_drivers_updated_at ON event_drivers;
CREATE TRIGGER update_event_drivers_updated_at 
    BEFORE UPDATE ON event_drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_types_updated_at ON event_types_config;
CREATE TRIGGER update_event_types_updated_at 
    BEFORE UPDATE ON event_types_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- مشغل لتحديث التقييم عند إضافة تقييم جديد
CREATE OR REPLACE FUNCTION trigger_update_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث التقييم للملف الشخصي المُقيَّم
    PERFORM update_profile_rating(COALESCE(NEW.rated_id, OLD.rated_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ratings_update_profile_rating ON ratings;
CREATE TRIGGER ratings_update_profile_rating
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW EXECUTE FUNCTION trigger_update_rating();

-- ===================================================================
-- سياسات الأمان (RLS)
-- ===================================================================

-- تفعيل RLS على الجداول
ALTER TABLE main_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- تفعيل RLS لجدول إعدادات المناسبات بعد التأكد من إنشاؤه
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'event_types_config'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_types_config' AND column_name = 'status'
    ) THEN
        ALTER TABLE event_types_config ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'تم تفعيل RLS لجدول إعدادات المناسبات';
    ELSE
        RAISE NOTICE 'تم تخطي تفعيل RLS لجدول إعدادات المناسبات - الجدول أو العمود غير موجود';
    END IF;
END
$$;

-- سياسات أساسية (ستحتاج تخصيص حسب نظام المصادقة)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        -- الملفات الشخصية
        DROP POLICY IF EXISTS "Users can view own profile" ON main_profiles;
        CREATE POLICY "Users can view own profile" ON main_profiles
            FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update own profile" ON main_profiles;
        CREATE POLICY "Users can update own profile" ON main_profiles
            FOR UPDATE USING (auth.uid() = user_id);

        -- سائقي المناسبات
        DROP POLICY IF EXISTS "Drivers can manage own event profile" ON event_drivers;
        CREATE POLICY "Drivers can manage own event profile" ON event_drivers
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM main_profiles 
                    WHERE id = driver_id AND user_id = auth.uid()
                )
            );

        -- التقييمات
        DROP POLICY IF EXISTS "Users can view ratings" ON ratings;
        CREATE POLICY "Users can view ratings" ON ratings
            FOR SELECT USING (
                EXISTS (SELECT 1 FROM main_profiles WHERE id = rated_id)
            );

        DROP POLICY IF EXISTS "Users can create ratings" ON ratings;
        CREATE POLICY "Users can create ratings" ON ratings
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM main_profiles 
                    WHERE id = rater_id AND user_id = auth.uid()
                )
            );

        -- إعدادات أنواع المناسبات (قراءة عامة)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'event_types_config'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_types_config' AND column_name = 'status'
        ) THEN
            DROP POLICY IF EXISTS "Anyone can view active event types" ON event_types_config;
            CREATE POLICY "Anyone can view active event types" ON event_types_config
                FOR SELECT USING (status = 'active' AND is_active = true);
            RAISE NOTICE 'تم إنشاء سياسة RLS لأنواع المناسبات';
        ELSE
            RAISE NOTICE 'تم تخطي سياسة أنواع المناسبات - الجدول أو العمود غير موجود';
        END IF;
    ELSE
        RAISE NOTICE 'تم تخطي إنشاء سياسات RLS - جدول auth.users غير موجود';
        
        -- إنشاء سياسة أساسية لأنواع المناسبات (بدون مصادقة)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'event_types_config'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'event_types_config' AND column_name = 'status'
        ) THEN
            DROP POLICY IF EXISTS "Public can view active event types" ON event_types_config;
            CREATE POLICY "Public can view active event types" ON event_types_config
                FOR SELECT USING (status = 'active' AND is_active = true);
            RAISE NOTICE 'تم إنشاء سياسة عامة لأنواع المناسبات';
        ELSE
            RAISE NOTICE 'تم تخطي السياسة العامة - جدول إعدادات المناسبات غير مكتمل';
        END IF;
    END IF;
END
$$;

-- ===================================================================
-- تسجيل نجاح التنفيذ
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ تم إنشاء الجداول الأساسية بنجاح';
    RAISE NOTICE '📋 الجداول المنشأة:';
    RAISE NOTICE '   - main_profiles: الملفات الشخصية الرئيسية';
    RAISE NOTICE '   - event_drivers: سائقي المناسبات الخاصة';  
    RAISE NOTICE '   - event_types_config: إعدادات أنواع المناسبات';
    RAISE NOTICE '   - ratings: نظام التقييمات';
    RAISE NOTICE '🔧 الوظائف: البحث، التقييم، حساب المسافة';
    RAISE NOTICE '⚡ الفهارس: منشأة لتحسين الأداء';
    RAISE NOTICE '🔒 سياسات الأمان: جاهزة للتفعيل مع نظام المصادقة';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية: تشغيل EVENT_BOOKING_SYSTEM_SAFE.sql';
END
$$;
