-- جداول نظام الأمان والطوارئ
-- Emergency and Safety System Tables

-- جدول جهات الاتصال الطارئة
-- Emergency Contacts Table
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

-- جدول البطاقات الصحية الطارئة
-- Medical Emergency Cards Table
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

-- جدول الحالات الصحية
-- Medical Conditions Table
CREATE TABLE medical_conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES medical_emergency_cards(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول الأدوية الحالية
-- Current Medications Table
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

-- جدول الحساسية
-- Allergies Table
CREATE TABLE medical_allergies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES medical_emergency_cards(id) ON DELETE CASCADE NOT NULL,
    allergen VARCHAR(200) NOT NULL,
    severity VARCHAR(20) DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
    reaction TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- جدول حوادث الطوارئ
-- Emergency Incidents Table
CREATE TABLE emergency_incidents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL, -- إذا كان مرتبط برحلة
    incident_type VARCHAR(20) NOT NULL CHECK (incident_type IN ('medical', 'security', 'accident', 'panic', 'sos')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
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

-- جدول إشعارات الطوارئ المرسلة
-- Emergency Notifications Sent Table
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
-- Safety Settings Table
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
-- Trip Sharing Table
CREATE TABLE trip_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
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

-- جدول المشاركون في الرحلة
-- Trip Share Recipients Table
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
-- Trip Location History Table
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

-- الفهارس لتحسين الأداء
-- Indexes for Performance

-- فهارس جهات الاتصال الطارئة
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_is_primary ON emergency_contacts(user_id, is_primary) WHERE is_primary = TRUE;

-- فهارس البطاقات الصحية
CREATE INDEX idx_medical_cards_user_id ON medical_emergency_cards(user_id);
CREATE INDEX idx_medical_conditions_card_id ON medical_conditions(card_id);
CREATE INDEX idx_current_medications_card_id ON current_medications(card_id);
CREATE INDEX idx_medical_allergies_card_id ON medical_allergies(card_id);

-- فهارس حوادث الطوارئ
CREATE INDEX idx_emergency_incidents_user_id ON emergency_incidents(user_id);
CREATE INDEX idx_emergency_incidents_status ON emergency_incidents(status);
CREATE INDEX idx_emergency_incidents_created_at ON emergency_incidents(created_at DESC);
CREATE INDEX idx_emergency_incidents_location ON emergency_incidents(latitude, longitude);

-- فهارس الإشعارات
CREATE INDEX idx_emergency_notifications_incident_id ON emergency_notifications(incident_id);
CREATE INDEX idx_emergency_notifications_contact_id ON emergency_notifications(contact_id);

-- فهارس إعدادات الأمان
CREATE INDEX idx_safety_settings_user_id ON safety_settings(user_id);

-- فهارس مشاركة الرحلات
CREATE INDEX idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX idx_trip_shares_user_id ON trip_shares(user_id);
CREATE INDEX idx_trip_shares_share_code ON trip_shares(share_code);
CREATE INDEX idx_trip_shares_is_active ON trip_shares(is_active);
CREATE INDEX idx_trip_location_history_trip_share_id ON trip_location_history(trip_share_id);
CREATE INDEX idx_trip_location_history_recorded_at ON trip_location_history(recorded_at DESC);

-- الوظائف المساعدة
-- Helper Functions

-- وظيفة تحديث التوقيت المحدث
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق الوظيفة على الجداول المطلوبة
CREATE TRIGGER update_emergency_contacts_updated_at BEFORE UPDATE ON emergency_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_cards_updated_at BEFORE UPDATE ON medical_emergency_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_safety_settings_updated_at BEFORE UPDATE ON safety_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- إعداد Row Level Security (RLS)
-- Row Level Security Setup

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

-- سياسات الأمان للمستخدمين
-- Security Policies for Users

-- جهات الاتصال الطارئة - المستخدم يرى بياناته فقط
CREATE POLICY "Users can view their own emergency contacts" ON emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own emergency contacts" ON emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own emergency contacts" ON emergency_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own emergency contacts" ON emergency_contacts FOR DELETE USING (auth.uid() = user_id);

-- البطاقات الصحية الطارئة - المستخدم يرى بطاقته فقط
CREATE POLICY "Users can view their own medical card" ON medical_emergency_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own medical card" ON medical_emergency_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own medical card" ON medical_emergency_cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own medical card" ON medical_emergency_cards FOR DELETE USING (auth.uid() = user_id);

-- السماح للسائقين برؤية البطاقة الصحية عند الطوارئ فقط
CREATE POLICY "Drivers can view passenger medical card during emergency" ON medical_emergency_cards FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM trips t 
        WHERE t.driver_id = auth.uid() 
        AND t.customer_id = medical_emergency_cards.user_id 
        AND t.status IN ('in_progress', 'emergency')
    )
    OR 
    EXISTS (
        SELECT 1 FROM emergency_incidents ei 
        WHERE ei.user_id = medical_emergency_cards.user_id 
        AND ei.status = 'active'
        AND ei.created_at > now() - interval '2 hours'
    )
);

-- حوادث الطوارئ
CREATE POLICY "Users can view their own incidents" ON emergency_incidents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own incidents" ON emergency_incidents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own incidents" ON emergency_incidents FOR UPDATE USING (auth.uid() = user_id);

-- إعدادات الأمان
CREATE POLICY "Users can view their own safety settings" ON safety_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own safety settings" ON safety_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own safety settings" ON safety_settings FOR UPDATE USING (auth.uid() = user_id);

-- مشاركة الرحلات
CREATE POLICY "Users can view their own trip shares" ON trip_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trip shares" ON trip_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trip shares" ON trip_shares FOR UPDATE USING (auth.uid() = user_id);

-- إدراج البيانات الافتراضية
-- Insert Default Data

-- إعدادات أمان افتراضية لجميع المستخدمين الجدد
CREATE OR REPLACE FUNCTION create_default_safety_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO safety_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق الوظيفة عند إنشاء مستخدم جديد
CREATE TRIGGER on_auth_user_created_safety_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_safety_settings();

-- تعليقات الجداول
-- Table Comments
COMMENT ON TABLE emergency_contacts IS 'جهات الاتصال الطارئة للمستخدمين';
COMMENT ON TABLE medical_emergency_cards IS 'البطاقات الصحية الطارئة';
COMMENT ON TABLE medical_conditions IS 'الحالات الصحية المرتبطة بالبطاقات الصحية';
COMMENT ON TABLE current_medications IS 'الأدوية الحالية للمستخدمين';
COMMENT ON TABLE medical_allergies IS 'قائمة الحساسية للمستخدمين';
COMMENT ON TABLE emergency_incidents IS 'سجل حوادث الطوارئ';
COMMENT ON TABLE emergency_notifications IS 'سجل الإشعارات المرسلة في حالات الطوارئ';
COMMENT ON TABLE safety_settings IS 'إعدادات الأمان لكل مستخدم';
COMMENT ON TABLE trip_shares IS 'مشاركة الرحلات مع جهات الاتصال';
COMMENT ON TABLE trip_share_recipients IS 'المستلمون لمشاركة الرحلات';
COMMENT ON TABLE trip_location_history IS 'سجل المواقع للرحلات المشاركة';
