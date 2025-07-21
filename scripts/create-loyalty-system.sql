-- نظام النقاط والولاء المتقدم لتطبيق IGTaxi
-- تاريخ الإنشاء: 2025-07-20

-- جدول النقاط الرئيسي
CREATE TABLE user_loyalty (
  profile_id UUID PRIMARY KEY REFERENCES main_profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('driver', 'customer')) NOT NULL,
  total_points INTEGER DEFAULT 0,
  available_points INTEGER DEFAULT 0, -- النقاط المتاحة للاستخدام
  used_points INTEGER DEFAULT 0, -- النقاط المستخدمة
  tier_level TEXT DEFAULT 'bronze' CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum', 'vip')),
  tier_progress INTEGER DEFAULT 0, -- التقدم نحو المستوى التالي
  referral_code TEXT UNIQUE, -- كود الدعوة الخاص
  invited_by UUID REFERENCES main_profiles(id), -- من دعاه
  total_referrals INTEGER DEFAULT 0, -- عدد من دعاهم
  successful_referrals INTEGER DEFAULT 0, -- عدد الدعوات الناجحة
  last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول سجل النقاط التفصيلي
CREATE TABLE loyalty_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- نوع العملية
  reason TEXT NOT NULL, -- سبب منح/خصم النقاط
  points_earned INTEGER DEFAULT 0, -- النقاط المكتسبة
  points_spent INTEGER DEFAULT 0, -- النقاط المستخدمة
  trip_id UUID REFERENCES trip_bookings(id), -- مرتبط برحلة (اختياري)
  referral_profile_id UUID REFERENCES main_profiles(id), -- مرتبط بدعوة (اختياري)
  rating_value INTEGER, -- التقييم المرتبط (اختياري)
  amount_paid DECIMAL(10,2), -- المبلغ المدفوع (اختياري)
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0, -- مضاعف المكافأة
  expires_at TIMESTAMP WITH TIME ZONE, -- تاريخ انتهاء النقاط (اختياري)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  metadata JSONB, -- بيانات إضافية
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول قواعد كسب النقاط
CREATE TABLE loyalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT UNIQUE NOT NULL,
  description TEXT,
  target_role TEXT CHECK (target_role IN ('driver', 'customer', 'both')) NOT NULL,
  action_trigger TEXT NOT NULL, -- ما يحفز المكافأة
  base_points INTEGER NOT NULL, -- النقاط الأساسية
  bonus_points INTEGER DEFAULT 0, -- نقاط إضافية
  multiplier DECIMAL(3,2) DEFAULT 1.0, -- مضاعف
  min_requirement INTEGER DEFAULT 1, -- الحد الأدنى للتفعيل
  max_per_day INTEGER, -- الحد الأقصى يومياً
  max_per_month INTEGER, -- الحد الأقصى شهرياً
  tier_restrictions TEXT[], -- قيود المستويات
  expiry_days INTEGER, -- مدة صلاحية النقاط
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول مستويات الولاء
CREATE TABLE loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT UNIQUE NOT NULL,
  tier_level INTEGER UNIQUE NOT NULL,
  min_points INTEGER NOT NULL, -- الحد الأدنى للوصول للمستوى
  tier_color TEXT, -- لون المستوى في التطبيق
  tier_icon TEXT, -- أيقونة المستوى
  benefits JSONB, -- مزايا المستوى
  point_multiplier DECIMAL(3,2) DEFAULT 1.0, -- مضاعف النقاط
  discount_percentage INTEGER DEFAULT 0, -- نسبة خصم
  priority_booking BOOLEAN DEFAULT false, -- أولوية في الحجز
  free_cancellation BOOLEAN DEFAULT false, -- إلغاء مجاني
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول مكافآت الاستبدال
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_name TEXT NOT NULL,
  description TEXT,
  reward_type TEXT CHECK (reward_type IN ('free_trip', 'discount', 'credit', 'upgrade', 'gift')) NOT NULL,
  cost_points INTEGER NOT NULL, -- تكلفة بالنقاط
  reward_value DECIMAL(10,2), -- قيمة المكافأة
  max_uses_per_user INTEGER DEFAULT 1, -- الحد الأقصى للاستخدام
  validity_days INTEGER DEFAULT 30, -- صلاحية المكافأة
  tier_requirements TEXT[], -- متطلبات المستوى
  role_restrictions TEXT CHECK (role_restrictions IN ('driver', 'customer', 'both')) DEFAULT 'both',
  is_active BOOLEAN DEFAULT true,
  stock_quantity INTEGER, -- الكمية المتاحة
  image_url TEXT, -- صورة المكافأة
  terms_conditions TEXT, -- الشروط والأحكام
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول استبدال المكافآت
CREATE TABLE loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES loyalty_rewards(id),
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'used', 'expired', 'cancelled')),
  redemption_code TEXT UNIQUE, -- كود الاستبدال
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  trip_id UUID REFERENCES trip_bookings(id), -- الرحلة المستخدمة فيها
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الدعوات والإحالات
CREATE TABLE referral_system (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE, -- من أرسل الدعوة
  referee_id UUID REFERENCES main_profiles(id) ON DELETE CASCADE, -- من تلقى الدعوة
  referral_code TEXT NOT NULL,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_trip_date TIMESTAMP WITH TIME ZONE, -- تاريخ أول رحلة
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  referrer_points INTEGER DEFAULT 0, -- نقاط المدعي
  referee_points INTEGER DEFAULT 0, -- نقاط المدعو
  bonus_tier TEXT, -- مستوى المكافأة
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- الفهارس لتحسين الأداء
CREATE INDEX idx_user_loyalty_profile_id ON user_loyalty(profile_id);
CREATE INDEX idx_user_loyalty_role ON user_loyalty(role);
CREATE INDEX idx_user_loyalty_tier_level ON user_loyalty(tier_level);
CREATE INDEX idx_user_loyalty_referral_code ON user_loyalty(referral_code);

CREATE INDEX idx_loyalty_logs_profile_id ON loyalty_logs(profile_id);
CREATE INDEX idx_loyalty_logs_action_type ON loyalty_logs(action_type);
CREATE INDEX idx_loyalty_logs_created_at ON loyalty_logs(created_at);
CREATE INDEX idx_loyalty_logs_trip_id ON loyalty_logs(trip_id);

CREATE INDEX idx_loyalty_redemptions_profile_id ON loyalty_redemptions(profile_id);
CREATE INDEX idx_loyalty_redemptions_status ON loyalty_redemptions(status);
CREATE INDEX idx_loyalty_redemptions_code ON loyalty_redemptions(redemption_code);

CREATE INDEX idx_referral_system_referrer_id ON referral_system(referrer_id);
CREATE INDEX idx_referral_system_referee_id ON referral_system(referee_id);
CREATE INDEX idx_referral_system_referral_code ON referral_system(referral_code);

-- إدراج المستويات الافتراضية
INSERT INTO loyalty_tiers (tier_name, tier_level, min_points, tier_color, tier_icon, benefits, point_multiplier, discount_percentage) VALUES
('برونزي', 1, 0, '#CD7F32', 'bronze-medal', '{"welcome_bonus": 50}', 1.0, 0),
('فضي', 2, 500, '#C0C0C0', 'silver-medal', '{"priority_support": true, "free_cancellation": 2}', 1.2, 5),
('ذهبي', 3, 1500, '#FFD700', 'gold-medal', '{"priority_booking": true, "free_cancellation": 5}', 1.5, 10),
('بلاتيني', 4, 3000, '#E5E4E2', 'platinum-medal', '{"premium_support": true, "upgrade_priority": true}', 2.0, 15),
('VIP', 5, 5000, '#9400D3', 'vip-crown', '{"personal_concierge": true, "unlimited_cancellation": true}', 2.5, 20);

-- إدراج قواعد كسب النقاط الافتراضية
INSERT INTO loyalty_rules (rule_name, description, target_role, action_trigger, base_points, bonus_points, expiry_days) VALUES
-- للعملاء
('first_trip_bonus', 'مكافأة أول رحلة ناجحة', 'customer', 'first_trip_completed', 50, 0, 365),
('trip_completion', 'نقاط لكل رحلة مكتملة', 'customer', 'trip_completed', 10, 0, 90),
('payment_points', 'نقاط عن كل دينار مدفوع', 'customer', 'payment_made', 10, 0, 90),
('referral_signup', 'دعوة صديق للتسجيل', 'customer', 'referral_signup', 100, 0, 180),
('app_share', 'مشاركة التطبيق', 'customer', 'app_shared', 25, 0, 30),
('high_rating_given', 'تقييم مرتفع للسائق', 'customer', 'rating_given', 15, 0, 60),

-- للسائقين
('driver_high_rating', 'تقييم 5 نجوم من راكب', 'driver', 'received_5_star_rating', 20, 0, 90),
('driver_milestone_10', 'إتمام 10 رحلات', 'driver', 'trips_milestone', 100, 0, 180),
('driver_no_delays', 'العمل 3 أيام بلا تأخير', 'driver', 'no_delays_streak', 50, 0, 60),
('driver_loyalty_week', 'العمل 7 أيام متتالية', 'driver', 'weekly_activity', 150, 0, 120),
('driver_customer_favorite', 'اختيار العميل للسائق', 'driver', 'customer_favorite', 30, 0, 90),
('driver_referral', 'دعوة سائق جديد', 'driver', 'driver_referral', 200, 0, 365);

-- إدراج المكافآت الافتراضية
INSERT INTO loyalty_rewards (reward_name, description, reward_type, cost_points, reward_value, validity_days, role_restrictions) VALUES
-- للعملاء
('رحلة مجانية - 5 دنانير', 'رحلة مجانية بقيمة 5 دنانير', 'free_trip', 500, 5.00, 30, 'customer'),
('رحلة مجانية - 10 دنانير', 'رحلة مجانية بقيمة 10 دنانير', 'free_trip', 1000, 10.00, 30, 'customer'),
('خصم 20%', 'خصم 20% على الرحلة القادمة', 'discount', 200, 20.00, 15, 'customer'),
('أولوية في الطلب', 'أولوية في الحجز القادم', 'upgrade', 100, 0, 7, 'customer'),

-- للسائقين
('رصيد 5 دنانير', 'إضافة 5 دنانير لرصيد السائق', 'credit', 500, 5.00, 60, 'driver'),
('رصيد 10 دنانير', 'إضافة 10 دنانير لرصيد السائق', 'credit', 1000, 10.00, 60, 'driver'),
('بطاقة وقود', 'بطاقة وقود بقيمة 15 دينار', 'gift', 1500, 15.00, 90, 'driver'),
('ترقية المستوى', 'ترقية فورية للمستوى التالي', 'upgrade', 2000, 0, 30, 'driver');

-- إنشاء الوظائف المساعدة
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, (random() * length(chars))::INTEGER + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- وظيفة إضافة النقاط
CREATE OR REPLACE FUNCTION add_loyalty_points(
    p_profile_id UUID,
    p_action_type TEXT,
    p_reason TEXT,
    p_points INTEGER,
    p_trip_id UUID DEFAULT NULL,
    p_rating_value INTEGER DEFAULT NULL,
    p_amount_paid DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    current_tier TEXT;
    new_total_points INTEGER;
    tier_multiplier DECIMAL;
BEGIN
    -- الحصول على دور المستخدم
    SELECT role, tier_level INTO user_role, current_tier
    FROM user_loyalty 
    WHERE profile_id = p_profile_id;
    
    -- الحصول على مضاعف المستوى
    SELECT point_multiplier INTO tier_multiplier
    FROM loyalty_tiers 
    WHERE tier_name = current_tier;
    
    IF tier_multiplier IS NULL THEN
        tier_multiplier := 1.0;
    END IF;
    
    -- حساب النقاط النهائية
    p_points := (p_points * tier_multiplier)::INTEGER;
    
    -- إضافة النقاط
    UPDATE user_loyalty 
    SET 
        total_points = total_points + p_points,
        available_points = available_points + p_points,
        tier_progress = tier_progress + p_points,
        updated_at = NOW()
    WHERE profile_id = p_profile_id;
    
    -- تسجيل العملية
    INSERT INTO loyalty_logs (
        profile_id, action_type, reason, points_earned, 
        trip_id, rating_value, amount_paid, 
        bonus_multiplier
    ) VALUES (
        p_profile_id, p_action_type, p_reason, p_points,
        p_trip_id, p_rating_value, p_amount_paid,
        tier_multiplier
    );
    
    -- التحقق من ترقية المستوى
    PERFORM check_tier_upgrade(p_profile_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- وظيفة التحقق من ترقية المستوى
CREATE OR REPLACE FUNCTION check_tier_upgrade(p_profile_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_points INTEGER;
    current_tier_level INTEGER;
    new_tier RECORD;
BEGIN
    -- الحصول على النقاط الحالية ومستوى المستخدم
    SELECT ul.total_points, lt.tier_level 
    INTO current_points, current_tier_level
    FROM user_loyalty ul
    JOIN loyalty_tiers lt ON ul.tier_level = lt.tier_name
    WHERE ul.profile_id = p_profile_id;
    
    -- البحث عن مستوى أعلى مناسب
    SELECT * INTO new_tier
    FROM loyalty_tiers 
    WHERE min_points <= current_points 
    AND tier_level > current_tier_level
    ORDER BY tier_level DESC
    LIMIT 1;
    
    -- إجراء الترقية إذا كان مناسباً
    IF new_tier.tier_name IS NOT NULL THEN
        UPDATE user_loyalty 
        SET 
            tier_level = new_tier.tier_name,
            tier_progress = 0,
            updated_at = NOW()
        WHERE profile_id = p_profile_id;
        
        -- تسجيل الترقية
        INSERT INTO loyalty_logs (
            profile_id, action_type, reason, points_earned
        ) VALUES (
            p_profile_id, 'tier_upgrade', 
            'ترقية إلى مستوى ' || new_tier.tier_name, 
            0
        );
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- تريجر إنشاء كود الدعوة عند إنشاء مستخدم جديد
CREATE OR REPLACE FUNCTION create_loyalty_profile()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- إنشاء كود دعوة فريد
    LOOP
        new_referral_code := generate_referral_code();
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM user_loyalty WHERE referral_code = new_referral_code
        );
    END LOOP;
    
    -- إنشاء ملف الولاء
    INSERT INTO user_loyalty (
        profile_id, 
        role, 
        referral_code,
        tier_level
    ) VALUES (
        NEW.id, 
        NEW.user_type, 
        new_referral_code,
        'برونزي'
    );
    
    -- مكافأة التسجيل
    PERFORM add_loyalty_points(
        NEW.id,
        'signup_bonus',
        'مكافأة التسجيل',
        50
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط التريجر بجدول الملفات الشخصية
CREATE TRIGGER trigger_create_loyalty_profile
    AFTER INSERT ON main_profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_loyalty_profile();

-- سياسات الأمان (RLS)
ALTER TABLE user_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_system ENABLE ROW LEVEL SECURITY;

-- سياسة للمستخدمين لرؤية نقاطهم فقط
CREATE POLICY "Users can view their own loyalty data" ON user_loyalty
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can view their own loyalty logs" ON loyalty_logs
    FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can view their own redemptions" ON loyalty_redemptions
    FOR SELECT USING (auth.uid() = profile_id);

-- سياسة للقراءة العامة للقواعد والمكافآت
CREATE POLICY "Anyone can view loyalty rules" ON loyalty_rules
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view loyalty tiers" ON loyalty_tiers
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view active rewards" ON loyalty_rewards
    FOR SELECT USING (is_active = true);

COMMENT ON TABLE user_loyalty IS 'جدول النقاط والولاء الرئيسي للمستخدمين';
COMMENT ON TABLE loyalty_logs IS 'سجل تفصيلي لجميع عمليات النقاط';
COMMENT ON TABLE loyalty_rules IS 'قواعد كسب النقاط وشروطها';
COMMENT ON TABLE loyalty_tiers IS 'مستويات الولاء ومزاياها';
COMMENT ON TABLE loyalty_rewards IS 'المكافآت المتاحة للاستبدال';
COMMENT ON TABLE loyalty_redemptions IS 'سجل عمليات استبدال المكافآت';
COMMENT ON TABLE referral_system IS 'نظام الدعوات والإحالات';
