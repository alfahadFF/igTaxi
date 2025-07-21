-- نظام الأمان والطوارئ الكامل - إصدار محدث ومُصحح
-- Complete Safety and Emergency System - Updated and Fixed Version

-- ==============================================
-- الجزء الأول: إنشاء الجداول الأساسية
-- Part 1: Create Basic Tables
-- ==============================================

-- حذف الجداول إذا كانت موجودة (للبداية النظيفة)
DROP TABLE IF EXISTS trip_location_history CASCADE;
DROP TABLE IF EXISTS trip_share_recipients CASCADE;
DROP TABLE IF EXISTS trip_shares CASCADE;
DROP TABLE IF EXISTS emergency_notifications CASCADE;
DROP TABLE IF EXISTS emergency_incidents CASCADE;
DROP TABLE IF EXISTS medical_allergies CASCADE;
DROP TABLE IF EXISTS current_medications CASCADE;
DROP TABLE IF EXISTS medical_conditions CASCADE;
DROP TABLE IF EXISTS medical_emergency_cards CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS safety_settings CASCADE;

-- حذف الأنواع المخصصة إذا كانت موجودة
DROP TYPE IF EXISTS incident_type_enum CASCADE;
DROP TYPE IF EXISTS priority_enum CASCADE;
DROP TYPE IF EXISTS severity_enum CASCADE;

-- إنشاء الأنواع المخصصة
CREATE TYPE incident_type_enum AS ENUM ('medical', 'security', 'accident', 'panic', 'sos');
CREATE TYPE priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE severity_enum AS ENUM ('mild', 'moderate', 'severe', 'life_threatening');

-- جدول جهات الاتصال الطارئة
CREATE TABLE emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('family', 'friend', 'colleague', 'medical', 'other')),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول البطاقات الطبية الطارئة
CREATE TABLE medical_emergency_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    blood_type VARCHAR(10),
    national_id VARCHAR(50),
    preferred_hospital VARCHAR(200),
    insurance_provider VARCHAR(100),
    insurance_number VARCHAR(50),
    special_instructions TEXT,
    language VARCHAR(10) DEFAULT 'ar',
    is_visible BOOLEAN DEFAULT FALSE, -- مخفية افتراضياً، تظهر في الطوارئ فقط
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id) -- بطاقة واحدة لكل مستخدم
);

-- جدول الحالات الطبية
CREATE TABLE medical_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES medical_emergency_cards(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    severity severity_enum DEFAULT 'moderate',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول الأدوية الحالية
CREATE TABLE current_medications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES medical_emergency_cards(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    purpose VARCHAR(200),
    side_effects TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول الحساسيات
CREATE TABLE medical_allergies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES medical_emergency_cards(id) ON DELETE CASCADE NOT NULL,
    allergen VARCHAR(200) NOT NULL,
    severity severity_enum DEFAULT 'moderate',
    reaction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول حوادث الطوارئ
CREATE TABLE emergency_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID, -- مرجع اختياري للرحلة (قد لا يكون موجود جدول trips)
    incident_type incident_type_enum NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
    priority priority_enum DEFAULT 'medium',
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    description TEXT,
    notes TEXT,
    audio_recording_path TEXT,
    auto_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول إشعارات الطوارئ
CREATE TABLE emergency_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES emergency_incidents(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES emergency_contacts(id) ON DELETE CASCADE NOT NULL,
    notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('sms', 'call', 'push', 'email')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    message_content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول إعدادات الأمان
CREATE TABLE safety_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sos_button_enabled BOOLEAN DEFAULT TRUE,
    auto_dial_after_sos BOOLEAN DEFAULT TRUE,
    sos_countdown_seconds INTEGER DEFAULT 10 CHECK (sos_countdown_seconds >= 0 AND sos_countdown_seconds <= 60),
    police_hotline VARCHAR(20) DEFAULT '999',
    location_sharing_enabled BOOLEAN DEFAULT TRUE,
    audio_recording_enabled BOOLEAN DEFAULT FALSE,
    trip_sharing_enabled BOOLEAN DEFAULT FALSE,
    auto_share_trips BOOLEAN DEFAULT FALSE,
    share_location BOOLEAN DEFAULT TRUE,
    share_eta BOOLEAN DEFAULT TRUE,
    share_driver_info BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id) -- إعدادات واحدة لكل مستخدم
);

-- جدول مشاركة الرحلات
CREATE TABLE trip_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID, -- مرجع اختياري للرحلة
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    share_code VARCHAR(50) UNIQUE NOT NULL,
    share_url TEXT NOT NULL,
    passenger_name VARCHAR(100),
    destination TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_latitude DECIMAL(10, 8),
    start_longitude DECIMAL(11, 8),
    start_address TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول المشاركين في الرحلة
CREATE TABLE trip_share_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_share_id UUID REFERENCES trip_shares(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES emergency_contacts(id) ON DELETE CASCADE NOT NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول سجل المواقع للرحلات المشاركة
CREATE TABLE trip_location_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_share_id UUID REFERENCES trip_shares(id) ON DELETE CASCADE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    speed DECIMAL(8, 2),
    heading DECIMAL(8, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================
-- الجزء الثاني: إنشاء الفهارس
-- Part 2: Create Indexes
-- ==============================================

-- فهارس جهات الاتصال الطارئة
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_is_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = TRUE;

-- فهارس البطاقات الطبية
CREATE INDEX idx_medical_cards_user_id ON medical_emergency_cards(user_id);
CREATE INDEX idx_medical_cards_visible ON medical_emergency_cards(user_id, is_visible) WHERE is_visible = true;
CREATE INDEX idx_medical_conditions_card_id ON medical_conditions(card_id);
CREATE INDEX idx_current_medications_card_id ON current_medications(card_id);
CREATE INDEX idx_medical_allergies_card_id ON medical_allergies(card_id);

-- فهارس حوادث الطوارئ
CREATE INDEX idx_emergency_incidents_user_id ON emergency_incidents(user_id);
CREATE INDEX idx_emergency_incidents_status ON emergency_incidents(status);
CREATE INDEX idx_emergency_incidents_created_at ON emergency_incidents(created_at DESC);
CREATE INDEX idx_emergency_incidents_location ON emergency_incidents(latitude, longitude);
CREATE INDEX idx_emergency_incidents_active ON emergency_incidents(user_id, status, created_at) WHERE status = 'active';

-- فهارس الإشعارات
CREATE INDEX idx_emergency_notifications_incident_id ON emergency_notifications(incident_id);
CREATE INDEX idx_emergency_notifications_contact_id ON emergency_notifications(contact_id);

-- فهارس إعدادات الأمان
CREATE INDEX idx_safety_settings_user_id ON safety_settings(user_id);

-- فهارس مشاركة الرحلات
CREATE INDEX idx_trip_shares_user_id ON trip_shares(user_id);
CREATE INDEX idx_trip_shares_share_code ON trip_shares(share_code);
CREATE INDEX idx_trip_shares_is_active ON trip_shares(is_active);
CREATE INDEX idx_trip_location_history_trip_share_id ON trip_location_history(trip_share_id);
CREATE INDEX idx_trip_location_history_recorded_at ON trip_location_history(recorded_at DESC);

-- ==============================================
-- الجزء الثالث: إنشاء الوظائف المساعدة
-- Part 3: Create Helper Functions
-- ==============================================

-- وظيفة تحديث التوقيت المحدث
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق الوظيفة على الجداول المطلوبة
CREATE TRIGGER update_emergency_contacts_updated_at 
    BEFORE UPDATE ON emergency_contacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_cards_updated_at 
    BEFORE UPDATE ON medical_emergency_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_settings_updated_at 
    BEFORE UPDATE ON safety_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- دالة للتحقق من إمكانية الوصول للبطاقة الطبية في حالات الطوارئ
CREATE OR REPLACE FUNCTION can_access_medical_card_emergency(
    card_user_id UUID,
    accessing_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    -- التحقق من وجود حالة طوارئ نشطة
    IF EXISTS (
        SELECT 1 FROM emergency_incidents ei 
        WHERE ei.user_id = card_user_id 
        AND ei.status = 'active'
        AND ei.created_at > now() - interval '2 hours'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- التحقق من وجود رحلة نشطة (إذا كان جدول trips موجود مع الأعمدة الصحيحة)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'trips'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'driver_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name IN ('customer_id', 'passenger_id')
    ) THEN
        -- محاولة مع customer_id أولاً
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' 
            AND column_name = 'customer_id'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM trips t 
                WHERE t.driver_id = accessing_user_id 
                AND t.customer_id = card_user_id 
                AND t.status IN ('in_progress', 'emergency')
            ) THEN
                RETURN TRUE;
            END IF;
        END IF;
        
        -- محاولة مع passenger_id كبديل
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' 
            AND column_name = 'passenger_id'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM trips t 
                WHERE t.driver_id = accessing_user_id 
                AND t.passenger_id = card_user_id 
                AND t.status IN ('in_progress', 'emergency')
            ) THEN
                RETURN TRUE;
            END IF;
        END IF;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- الجزء الرابع: تفعيل Row Level Security
-- Part 4: Enable Row Level Security
-- ==============================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_emergency_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_share_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_location_history ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- الجزء الخامس: إنشاء سياسات الأمان
-- Part 5: Create Security Policies
-- ==============================================

-- سياسات جهات الاتصال الطارئة
CREATE POLICY "Users can view their own emergency contacts" ON emergency_contacts 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency contacts" ON emergency_contacts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts" ON emergency_contacts 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts" ON emergency_contacts 
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات البطاقات الطبية
CREATE POLICY "Users can view their own medical card" ON medical_emergency_cards 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical card" ON medical_emergency_cards 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical card" ON medical_emergency_cards 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medical card" ON medical_emergency_cards 
    FOR DELETE USING (auth.uid() = user_id);

-- سياسة خاصة للسائقين لرؤية البطاقة الطبية في حالات الطوارئ
CREATE POLICY "Emergency access to medical cards" ON medical_emergency_cards 
    FOR SELECT USING (
        -- المستخدم يرى بطاقته الخاصة
        auth.uid() = user_id
        OR
        -- الوصول في حالات الطوارئ (باستخدام الدالة المساعدة)
        (
            is_visible = true 
            AND can_access_medical_card_emergency(user_id, auth.uid())
        )
    );

-- سياسات البيانات الطبية التابعة (تتبع البطاقة الطبية)
CREATE POLICY "Medical conditions emergency access" ON medical_conditions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM medical_emergency_cards mec 
            WHERE mec.id = medical_conditions.card_id 
            AND (
                mec.user_id = auth.uid()
                OR 
                (
                    mec.is_visible = true 
                    AND can_access_medical_card_emergency(mec.user_id, auth.uid())
                )
            )
        )
    );

-- نفس السياسة للأدوية
CREATE POLICY "Medications emergency access" ON current_medications 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM medical_emergency_cards mec 
            WHERE mec.id = current_medications.card_id 
            AND (
                mec.user_id = auth.uid()
                OR 
                (
                    mec.is_visible = true 
                    AND can_access_medical_card_emergency(mec.user_id, auth.uid())
                )
            )
        )
    );

-- نفس السياسة للحساسيات
CREATE POLICY "Allergies emergency access" ON medical_allergies 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM medical_emergency_cards mec 
            WHERE mec.id = medical_allergies.card_id 
            AND (
                mec.user_id = auth.uid()
                OR 
                (
                    mec.is_visible = true 
                    AND can_access_medical_card_emergency(mec.user_id, auth.uid())
                )
            )
        )
    );

-- سياسات INSERT/UPDATE/DELETE للبيانات الطبية
CREATE POLICY "Users can manage their own medical conditions" ON medical_conditions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM medical_emergency_cards mec 
            WHERE mec.id = medical_conditions.card_id 
            AND mec.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own medications" ON current_medications 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM medical_emergency_cards mec 
            WHERE mec.id = current_medications.card_id 
            AND mec.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own allergies" ON medical_allergies 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM medical_emergency_cards mec 
            WHERE mec.id = medical_allergies.card_id 
            AND mec.user_id = auth.uid()
        )
    );

-- سياسات حوادث الطوارئ
CREATE POLICY "Users can manage their own incidents" ON emergency_incidents 
    FOR ALL USING (auth.uid() = user_id);

-- سياسات إعدادات الأمان
CREATE POLICY "Users can manage their own safety settings" ON safety_settings 
    FOR ALL USING (auth.uid() = user_id);

-- سياسات مشاركة الرحلات
CREATE POLICY "Users can manage their own trip shares" ON trip_shares 
    FOR ALL USING (auth.uid() = user_id);

-- سياسات مستقبلي مشاركة الرحلة
CREATE POLICY "Trip share recipients access" ON trip_share_recipients 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_shares ts 
            WHERE ts.id = trip_share_recipients.trip_share_id 
            AND ts.user_id = auth.uid()
        )
    );

-- سياسات سجل المواقع
CREATE POLICY "Trip location history access" ON trip_location_history 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_shares ts 
            WHERE ts.id = trip_location_history.trip_share_id 
            AND ts.user_id = auth.uid()
        )
    );

-- ==============================================
-- الجزء السادس: التعليقات والإكمال
-- Part 6: Comments and Completion
-- ==============================================

-- تعليقات الجداول
COMMENT ON TABLE emergency_contacts IS 'جهات الاتصال الطارئة للمستخدمين';
COMMENT ON TABLE medical_emergency_cards IS 'البطاقات الطبية الطارئة';
COMMENT ON TABLE medical_conditions IS 'الحالات الطبية المرتبطة بالبطاقات الطبية';
COMMENT ON TABLE current_medications IS 'الأدوية الحالية للمستخدمين';
COMMENT ON TABLE medical_allergies IS 'قائمة الحساسيات للمستخدمين';
COMMENT ON TABLE emergency_incidents IS 'سجل حوادث الطوارئ';
COMMENT ON TABLE emergency_notifications IS 'سجل الإشعارات المرسلة في حالات الطوارئ';
COMMENT ON TABLE safety_settings IS 'إعدادات الأمان لكل مستخدم';
COMMENT ON TABLE trip_shares IS 'مشاركة الرحلات مع جهات الاتصال';
COMMENT ON TABLE trip_share_recipients IS 'المستلمون لمشاركة الرحلات';
COMMENT ON TABLE trip_location_history IS 'سجل المواقع للرحلات المشاركة';

-- تعليقات الدوال
COMMENT ON FUNCTION can_access_medical_card_emergency IS 'دالة للتحقق من إمكانية الوصول للبطاقة الطبية في حالات الطوارئ';

-- رسالة النجاح
DO $$
BEGIN
    RAISE NOTICE '🎉 تم إنشاء نظام الأمان والطوارئ بنجاح!';
    RAISE NOTICE '✅ الجداول: 11 جدول تم إنشاؤها';
    RAISE NOTICE '✅ الفهارس: تم إنشاء جميع الفهارس المطلوبة';
    RAISE NOTICE '✅ سياسات الأمان: RLS مفعل على جميع الجداول';
    RAISE NOTICE '✅ الدوال المساعدة: تم إنشاؤها بنجاح';
    RAISE NOTICE '✅ النظام محمي ضد أخطاء جدول trips';
    RAISE NOTICE '✅ النظام جاهز للاستخدام';
    RAISE NOTICE '';
    RAISE NOTICE 'الجداول المنشأة:';
    RAISE NOTICE '- emergency_contacts';
    RAISE NOTICE '- medical_emergency_cards';
    RAISE NOTICE '- medical_conditions';
    RAISE NOTICE '- current_medications';
    RAISE NOTICE '- medical_allergies';
    RAISE NOTICE '- emergency_incidents';
    RAISE NOTICE '- emergency_notifications';
    RAISE NOTICE '- safety_settings';
    RAISE NOTICE '- trip_shares';
    RAISE NOTICE '- trip_share_recipients';
    RAISE NOTICE '- trip_location_history';
    RAISE NOTICE '';
    RAISE NOTICE 'الدوال المساعدة:';
    RAISE NOTICE '- can_access_medical_card_emergency()';
    RAISE NOTICE '- update_updated_at_column()';
END $$;
