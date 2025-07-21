-- نظام الإنجازات والمكافآت الذكية - IGTaxi
-- بدون نقاط قابلة للتحويل المالي، فقط إنجازات ومكافآت محدودة زمنياً

-- ===================================
-- 1. جدول مستويات الشارات (معنوية فقط)
-- ===================================
CREATE TABLE IF NOT EXISTS badge_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level_name VARCHAR(50) NOT NULL,
  level_order INTEGER NOT NULL,
  min_trips INTEGER NOT NULL,
  max_trips INTEGER,
  badge_icon VARCHAR(50) NOT NULL,
  badge_color VARCHAR(20) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  benefits JSONB DEFAULT '{}', -- مزايا معنوية فقط (ترتيب أعلى، أولوية عرض)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج المستويات المعنوية
INSERT INTO badge_levels (level_name, level_order, min_trips, max_trips, badge_icon, badge_color, display_name, benefits) VALUES
('bronze', 1, 0, 29, '⭐️', '#CD7F32', 'برونزي', '{"search_priority": 1, "profile_boost": false}'),
('silver', 2, 30, 79, '⭐️⭐️', '#C0C0C0', 'فضي', '{"search_priority": 2, "profile_boost": true}'),
('gold', 3, 80, 149, '⭐️⭐️⭐️', '#FFD700', 'ذهبي', '{"search_priority": 3, "profile_boost": true}'),
('professional', 4, 150, NULL, '👑', '#9B59B6', 'محترف', '{"search_priority": 4, "profile_boost": true, "priority_support": true}');

-- ===================================
-- 2. جدول الإنجازات المتاحة
-- ===================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'driving', 'referral', 'rating', 'consistency'
  target_role VARCHAR(20) DEFAULT 'both', -- 'driver', 'customer', 'both'
  
  -- شروط الإنجاز
  condition_type VARCHAR(50) NOT NULL, -- 'trip_count', 'rating_average', 'streak_days', 'referral_count'
  condition_value INTEGER NOT NULL,
  condition_period VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'all_time'
  
  -- المكافأة
  reward_type VARCHAR(50) NOT NULL, -- 'badge', 'temporary_upgrade', 'discount_voucher', 'free_trip'
  reward_value JSONB NOT NULL,
  reward_duration_hours INTEGER, -- صلاحية المكافأة بالساعات
  
  -- حدود الإنجاز
  max_claims_per_user INTEGER DEFAULT 1,
  cooldown_days INTEGER DEFAULT 0, -- فترة الانتظار قبل إعادة الحصول
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج الإنجازات
INSERT INTO achievements (
  achievement_key, title, description, icon, category, target_role,
  condition_type, condition_value, condition_period,
  reward_type, reward_value, reward_duration_hours,
  max_claims_per_user, cooldown_days
) VALUES
-- سائق موثوق
('trusted_driver', 'سائق موثوق 🎖️', '10 رحلات بتقييم 4.8+', '🎖️', 'rating', 'driver',
 'high_rating_trips', 10, 'all_time',
 'badge_plus_support', '{"badge": "trusted_driver", "priority_support": true}', 168,
 1, 30),

-- محترف الأسبوع
('weekly_professional', 'محترف الأسبوع 🏅', '30+ رحلة في الأسبوع', '🏅', 'driving', 'driver',
 'trip_count', 30, 'weekly',
 'commission_discount', '{"discount_percent": 10}', 72,
 4, 7), -- يمكن الحصول عليها 4 مرات مع انتظار أسبوع

-- دعوة فعالة
('effective_referral', 'دعوة فعالة 🚀', 'دعوة سائق يكمل 10 رحلات', '🚀', 'referral', 'driver',
 'successful_referrals', 1, 'all_time',
 'free_trip_voucher', '{"trips_count": 1, "max_distance": 20}', 72,
 10, 0), -- يمكن تكرارها

-- ملتزم
('punctual_week', 'ملتزم 🧱', '7 أيام بدون تأخير', '🧱', 'consistency', 'driver',
 'no_delay_streak', 7, 'daily',
 'temporary_upgrade', '{"upgrade_level": 1, "benefits": ["priority_requests", "profile_boost"]}', 168,
 999, 0), -- يمكن تكرارها

-- عميل مميز
('loyal_customer', 'عميل مميز ⭐', '20 رحلة بتقييم 4.5+', '⭐', 'rating', 'customer',
 'trip_count', 20, 'all_time',
 'discount_voucher', '{"discount_percent": 15, "max_amount": 10}', 72,
 1, 60),

-- مشارك نشط
('active_reviewer', 'مشارك نشط 📝', 'كتابة 15 تقييم مفصل', '📝', 'rating', 'customer',
 'review_count', 15, 'all_time',
 'upgrade_voucher', '{"upgrade_type": "vehicle_class", "trips_count": 3}', 120,
 1, 90);

-- ===================================
-- 3. جدول إنجازات المستخدمين
-- ===================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress_value INTEGER DEFAULT 0, -- للإنجازات التدريجية
  is_completed BOOLEAN DEFAULT false,
  
  -- المكافأة
  reward_claimed BOOLEAN DEFAULT false,
  reward_expires_at TIMESTAMP WITH TIME ZONE,
  reward_used BOOLEAN DEFAULT false,
  reward_used_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 4. جدول الشارات النشطة للمستخدمين
-- ===================================
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  badge_level_id UUID NOT NULL REFERENCES badge_levels(id),
  
  current_trips INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true,
  
  -- إحصائيات
  total_rating_sum DECIMAL(3,2) DEFAULT 0,
  total_ratings_count INTEGER DEFAULT 0,
  total_successful_referrals INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  
  UNIQUE(profile_id), -- مستخدم واحد له شارة واحدة نشطة فقط
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 5. جدول المكافآت النشطة
-- ===================================
CREATE TABLE IF NOT EXISTS active_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  user_achievement_id UUID NOT NULL REFERENCES user_achievements(id),
  
  reward_type VARCHAR(50) NOT NULL,
  reward_details JSONB NOT NULL,
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  usage_details JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 6. جدول تتبع التقدم (للإنجازات التدريجية)
-- ===================================
CREATE TABLE IF NOT EXISTS achievement_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES achievements(id),
  
  current_value INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reset_date DATE, -- للإنجازات اليومية/الأسبوعية/الشهرية
  
  metadata JSONB DEFAULT '{}', -- معلومات إضافية حسب نوع الإنجاز
  
  UNIQUE(profile_id, achievement_id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- 7. سجل الأنشطة (للتتبع والتحليل)
-- ===================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL,
  
  activity_type VARCHAR(50) NOT NULL, -- 'trip_completed', 'rating_given', 'referral_joined'
  activity_details JSONB NOT NULL,
  
  trip_id UUID, -- إذا كان مرتبط برحلة
  rating_value DECIMAL(2,1), -- إذا كان تقييم
  related_profile_id UUID, -- للإحالات أو التقييمات
  
  processed_for_achievements BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- إنشاء الفهارس للأداء
-- ===================================
CREATE INDEX IF NOT EXISTS idx_user_achievements_profile ON user_achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(is_completed, achieved_at);
CREATE INDEX IF NOT EXISTS idx_user_badges_profile ON user_badges(profile_id, is_current);
CREATE INDEX IF NOT EXISTS idx_active_rewards_profile ON active_rewards(profile_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_active_rewards_expires ON active_rewards(expires_at) WHERE NOT is_used;
CREATE INDEX IF NOT EXISTS idx_achievement_progress_profile ON achievement_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_profile ON activity_log(profile_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_processing ON activity_log(processed_for_achievements, created_at);

-- فهرس لمنع التكرار اليومي للإنجازات (إن أردت ذلك)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_daily_limit ON user_achievements(profile_id, achievement_id, (DATE(achieved_at))) 
-- WHERE is_completed = true;

-- ===================================
-- دوال معالجة الإنجازات
-- ===================================

-- دالة تحديث شارة المستخدم
CREATE OR REPLACE FUNCTION update_user_badge(user_profile_id UUID)
RETURNS void AS $$
DECLARE
    trip_count INTEGER;
    new_badge_level record;
BEGIN
    -- احصل على عدد الرحلات من سجل الأنشطة
    SELECT COUNT(*) INTO trip_count
    FROM activity_log 
    WHERE profile_id = user_profile_id 
    AND activity_type = 'trip_completed';
    
    -- احصل على المستوى المناسب
    SELECT * INTO new_badge_level
    FROM badge_levels
    WHERE min_trips <= trip_count 
    AND (max_trips IS NULL OR trip_count <= max_trips)
    ORDER BY level_order DESC
    LIMIT 1;
    
    IF new_badge_level.id IS NOT NULL THEN
        -- تحديث أو إنشاء شارة المستخدم
        INSERT INTO user_badges (profile_id, badge_level_id, current_trips)
        VALUES (user_profile_id, new_badge_level.id, trip_count)
        ON CONFLICT (profile_id) 
        DO UPDATE SET 
            badge_level_id = new_badge_level.id,
            current_trips = trip_count,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- دالة معالجة إنجاز جديد
CREATE OR REPLACE FUNCTION process_achievement(
    user_profile_id UUID,
    achievement_key_param VARCHAR(100),
    activity_data JSONB DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
    achievement_record record;
    progress_record record;
    current_progress INTEGER := 0;
    achievement_completed BOOLEAN := false;
    existing_claims INTEGER := 0;
    new_achievement_id UUID;
BEGIN
    -- احصل على بيانات الإنجاز
    SELECT * INTO achievement_record
    FROM achievements 
    WHERE achievement_key = achievement_key_param 
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- تحقق من عدد المرات المكتسبة سابقاً
    SELECT COUNT(*) INTO existing_claims
    FROM user_achievements
    WHERE profile_id = user_profile_id 
    AND achievement_id = achievement_record.id
    AND is_completed = true;
    
    -- تحقق من إمكانية الحصول على الإنجاز مرة أخرى
    IF existing_claims >= achievement_record.max_claims_per_user THEN
        RETURN false;
    END IF;
    
    -- احصل على التقدم الحالي
    SELECT * INTO progress_record
    FROM achievement_progress
    WHERE profile_id = user_profile_id 
    AND achievement_id = achievement_record.id;
    
    -- احسب التقدم الحالي حسب نوع الإنجاز
    CASE achievement_record.condition_type
        WHEN 'trip_count' THEN
            IF achievement_record.condition_period = 'weekly' THEN
                SELECT COUNT(*) INTO current_progress
                FROM activity_log
                WHERE profile_id = user_profile_id
                AND activity_type = 'trip_completed'
                AND created_at >= date_trunc('week', NOW());
            ELSE
                SELECT COUNT(*) INTO current_progress
                FROM activity_log
                WHERE profile_id = user_profile_id
                AND activity_type = 'trip_completed';
            END IF;
            
        WHEN 'high_rating_trips' THEN
            SELECT COUNT(*) INTO current_progress
            FROM activity_log
            WHERE profile_id = user_profile_id
            AND activity_type = 'trip_completed'
            AND (activity_details->>'rating')::DECIMAL >= 4.8;
            
        WHEN 'no_delay_streak' THEN
            -- حساب أيام الانضباط المتتالية (تحتاج تنفيذ مخصص)
            current_progress := COALESCE((activity_data->>'streak_days')::INTEGER, 0);
            
        WHEN 'successful_referrals' THEN
            SELECT COUNT(*) INTO current_progress
            FROM activity_log
            WHERE profile_id = user_profile_id
            AND activity_type = 'referral_completed';
    END CASE;
    
    -- تحديث التقدم
    INSERT INTO achievement_progress (profile_id, achievement_id, current_value)
    VALUES (user_profile_id, achievement_record.id, current_progress)
    ON CONFLICT (profile_id, achievement_id)
    DO UPDATE SET 
        current_value = current_progress,
        updated_at = NOW();
    
    -- تحقق من اكتمال الإنجاز
    IF current_progress >= achievement_record.condition_value THEN
        achievement_completed := true;
        
        -- تسجيل الإنجاز
        INSERT INTO user_achievements (
            profile_id, 
            achievement_id, 
            progress_value, 
            is_completed,
            reward_expires_at
        ) VALUES (
            user_profile_id,
            achievement_record.id,
            current_progress,
            true,
            CASE 
                WHEN achievement_record.reward_duration_hours IS NOT NULL 
                THEN NOW() + INTERVAL '1 hour' * achievement_record.reward_duration_hours
                ELSE NULL
            END
        ) RETURNING id INTO new_achievement_id;
        
        -- إنشاء المكافأة النشطة إذا كانت محدودة المدة
        IF achievement_record.reward_duration_hours IS NOT NULL THEN
            INSERT INTO active_rewards (
                profile_id,
                user_achievement_id,
                reward_type,
                reward_details,
                expires_at
            ) VALUES (
                user_profile_id,
                new_achievement_id,
                achievement_record.reward_type,
                achievement_record.reward_value,
                NOW() + INTERVAL '1 hour' * achievement_record.reward_duration_hours
            );
        END IF;
    END IF;
    
    RETURN achievement_completed;
END;
$$ LANGUAGE plpgsql;

-- دالة تسجيل نشاط وتشغيل معالجة الإنجازات
CREATE OR REPLACE FUNCTION log_activity_and_process_achievements(
    user_profile_id UUID,
    activity_type_param VARCHAR(50),
    activity_details_param JSONB DEFAULT '{}',
    trip_id_param UUID DEFAULT NULL,
    rating_value_param DECIMAL DEFAULT NULL,
    related_profile_id_param UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    activity_id UUID;
BEGIN
    -- تسجيل النشاط
    INSERT INTO activity_log (
        profile_id,
        activity_type,
        activity_details,
        trip_id,
        rating_value,
        related_profile_id
    ) VALUES (
        user_profile_id,
        activity_type_param,
        activity_details_param,
        trip_id_param,
        rating_value_param,
        related_profile_id_param
    ) RETURNING id INTO activity_id;
    
    -- تحديث الشارة
    PERFORM update_user_badge(user_profile_id);
    
    -- معالجة الإنجازات حسب نوع النشاط
    CASE activity_type_param
        WHEN 'trip_completed' THEN
            PERFORM process_achievement(user_profile_id, 'weekly_professional');
            IF rating_value_param >= 4.8 THEN
                PERFORM process_achievement(user_profile_id, 'trusted_driver');
            END IF;
            
        WHEN 'referral_completed' THEN
            PERFORM process_achievement(user_profile_id, 'effective_referral');
            
        WHEN 'no_delay_streak' THEN
            PERFORM process_achievement(user_profile_id, 'punctual_week', activity_details_param);
    END CASE;
    
    -- تحديث العلامة
    UPDATE activity_log 
    SET processed_for_achievements = true 
    WHERE id = activity_id;
END;
$$ LANGUAGE plpgsql;

-- دالة استخدام المكافأة
CREATE OR REPLACE FUNCTION use_reward(
    user_profile_id UUID,
    reward_id UUID,
    usage_details_param JSONB DEFAULT '{}'
)
RETURNS boolean AS $$
DECLARE
    reward_record record;
BEGIN
    -- احصل على بيانات المكافأة
    SELECT * INTO reward_record
    FROM active_rewards
    WHERE id = reward_id
    AND profile_id = user_profile_id
    AND NOT is_used
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- تسجيل الاستخدام
    UPDATE active_rewards
    SET 
        is_used = true,
        used_at = NOW(),
        usage_details = usage_details_param
    WHERE id = reward_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- دالة تنظيف المكافآت المنتهية الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_rewards()
RETURNS integer AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_rewards
    WHERE expires_at < NOW() AND NOT is_used;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- Row Level Security (RLS)
-- ===================================
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للقراءة
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can view their own badges" ON user_badges
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can view their own rewards" ON active_rewards
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can view their own progress" ON achievement_progress
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can view their own activity" ON activity_log
    FOR SELECT USING (profile_id = auth.uid());

-- سياسات الكتابة (محدودة للنظام)
CREATE POLICY "System can insert achievements" ON user_achievements
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update achievements" ON user_achievements
    FOR UPDATE USING (true);

CREATE POLICY "System can insert badges" ON user_badges
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update badges" ON user_badges
    FOR UPDATE USING (true);

CREATE POLICY "System can insert rewards" ON active_rewards
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update rewards" ON active_rewards
    FOR UPDATE USING (true);

CREATE POLICY "System can insert progress" ON achievement_progress
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update progress" ON achievement_progress
    FOR UPDATE USING (true);

CREATE POLICY "System can insert activity" ON activity_log
    FOR INSERT WITH CHECK (true);

-- ===================================
-- معلومات النظام
-- ===================================
COMMENT ON TABLE achievements IS 'نظام الإنجازات الذكية - بدون نقاط قابلة للتحويل المالي';
COMMENT ON TABLE active_rewards IS 'المكافآت النشطة محدودة الوقت';
COMMENT ON TABLE user_badges IS 'الشارات المعنوية للمستخدمين';

-- ===================================
-- بيانات اختبار (اختيارية)
-- ===================================

-- تنظيف دوري للمكافآت المنتهية (يجب تشغيله يومياً عبر cron job)
-- SELECT cleanup_expired_rewards();

-- نهاية الملف
