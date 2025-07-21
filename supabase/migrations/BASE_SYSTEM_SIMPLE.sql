-- ===================================================================
-- إنشاء الجداول الأساسية - نسخة مبسطة بدون RLS
-- ===================================================================

-- تمكين الإضافات الأساسية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- محاولة تمكين PostGIS (اختياري)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "postgis";
    RAISE NOTICE '✅ تم تمكين PostGIS بنجاح';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ PostGIS غير متاح - سيتم استخدام الإحداثيات العادية';
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
    location_lat DECIMAL(10, 8), -- خط العرض
    location_lng DECIMAL(11, 8), -- خط الطول
    location_text TEXT,          -- وصف نصي للموقع
    
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
-- إدراج البيانات الأساسية
-- ===================================================================

-- إدراج أنواع المناسبات الأساسية
INSERT INTO event_types_config (type_key, name_ar, name_en, description_ar, description_en, icon_name) 
VALUES 
    ('family', 'مناسبات عائلية', 'Family Events', 'رحلات وزيارات عائلية', 'Family trips and visits', 'family'),
    ('wedding', 'حفلات زفاف', 'Wedding Events', 'نقل العرائس والضيوف', 'Bride and guest transportation', 'wedding'),
    ('tourism', 'سياحة ورحلات', 'Tourism & Trips', 'جولات سياحية ورحلات', 'Tourist tours and trips', 'tourism'),
    ('field', 'رحلات برية', 'Field Trips', 'رحلات للمناطق الطبيعية', 'Nature and outdoor trips', 'field'),
    ('sports', 'مناسبات رياضية', 'Sports Events', 'نقل للمباريات والفعاليات', 'Sports matches and events', 'sports'),
    ('concert', 'حفلات ومؤتمرات', 'Concerts & Conferences', 'فعاليات ثقافية ومهنية', 'Cultural and professional events', 'concert')
ON CONFLICT (type_key) DO NOTHING;

-- ===================================================================
-- الفهارس لتحسين الأداء
-- ===================================================================

-- فهارس للملفات الشخصية
CREATE INDEX IF NOT EXISTS idx_main_profiles_profile_type ON main_profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_main_profiles_status ON main_profiles(status);
CREATE INDEX IF NOT EXISTS idx_main_profiles_city ON main_profiles(city);
CREATE INDEX IF NOT EXISTS idx_main_profiles_phone ON main_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_main_profiles_created_at ON main_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_main_profiles_location ON main_profiles(location_lat, location_lng);

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

-- وظيفة لحساب المسافة بين نقطتين
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lng1 DECIMAL, 
    lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    -- حساب المسافة بالكيلومتر باستخدام معادلة Haversine
    RETURN ROUND(
        6371 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) * 
            cos(radians(lng2) - radians(lng1)) + 
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
    lng DECIMAL DEFAULT NULL,
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
    IF NOT EXISTS (
        SELECT 1 FROM event_types_config 
        WHERE type_key = event_type_param 
        AND status = 'active' 
        AND is_active = true
    ) THEN
        RAISE NOTICE 'نوع المناسبة % غير متاح حالياً', event_type_param;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        ed.driver_id,
        mp.full_name as driver_name,
        COALESCE(mp.rating, 0) as rating,
        ed.vehicle_details as vehicle_info,
        CASE 
            WHEN lat IS NOT NULL AND lng IS NOT NULL 
            AND mp.location_lat IS NOT NULL AND mp.location_lng IS NOT NULL THEN
                calculate_distance(lat, lng, mp.location_lat, mp.location_lng)
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
BEGIN
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
-- تسجيل نجاح التنفيذ
-- ===================================================================

DO $$
DECLARE
    postgis_status TEXT;
    tables_count INTEGER;
BEGIN
    -- فحص حالة PostGIS
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        postgis_status := '✅ متاح';
    ELSE
        postgis_status := '⚠️ غير متاح';
    END IF;
    
    -- عد الجداول المنشأة
    SELECT COUNT(*) INTO tables_count 
    FROM information_schema.tables 
    WHERE table_name IN ('main_profiles', 'event_drivers', 'event_types_config', 'ratings');
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════';
    RAISE NOTICE '✅ تم إنشاء نظام قاعدة البيانات بنجاح!';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 إحصائيات النظام:';
    RAISE NOTICE '   📋 الجداول المنشأة: % جداول', tables_count;
    RAISE NOTICE '   🗺️ PostGIS: %', postgis_status;
    RAISE NOTICE '   🔒 RLS: معطل للتطوير';
    RAISE NOTICE '';
    RAISE NOTICE '📋 الجداول:';
    RAISE NOTICE '   - main_profiles: الملفات الشخصية الرئيسية';
    RAISE NOTICE '   - event_drivers: سائقي المناسبات الخاصة';  
    RAISE NOTICE '   - event_types_config: إعدادات أنواع المناسبات';
    RAISE NOTICE '   - ratings: نظام التقييمات';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 المكونات:';
    RAISE NOTICE '   ⚡ فهارس محسّنة للأداء';
    RAISE NOTICE '   🔄 مشغلات تلقائية';
    RAISE NOTICE '   📊 وظائف مساعدة';
    RAISE NOTICE '';
    RAISE NOTICE '💡 تم إزالة RLS لتجنب مشاكل التطوير';
    RAISE NOTICE '   يمكن إضافة الأمان لاحقاً عند الحاجة';
    RAISE NOTICE '';
    RAISE NOTICE '📝 الخطوة التالية:';
    RAISE NOTICE '   👉 تشغيل EVENT_BOOKING_SYSTEM_SAFE.sql';
    RAISE NOTICE '';
END
$$;
