-- اختبار سريع لصحة الـ SQL
-- يمكن تشغيل هذا الملف للتأكد من عمل النظام

-- 1. التحقق من وجود الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'badge_levels', 
  'achievements', 
  'user_achievements', 
  'user_badges', 
  'active_rewards', 
  'achievement_progress', 
  'activity_log'
);

-- 2. التحقق من البيانات الأساسية
SELECT COUNT(*) as badge_levels_count FROM badge_levels;
SELECT COUNT(*) as achievements_count FROM achievements;

-- 3. اختبار دالة تحديث الشارة (مع معرف وهمي)
-- SELECT update_user_badge('00000000-0000-0000-0000-000000000000'::UUID);

-- 4. عرض الإنجازات المتاحة
SELECT 
  achievement_key,
  title,
  category,
  target_role,
  condition_type,
  condition_value,
  reward_type
FROM achievements 
WHERE is_active = true
ORDER BY category, target_role;

-- 5. التحقق من الفهارس
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN (
  'user_achievements', 
  'user_badges', 
  'active_rewards', 
  'achievement_progress', 
  'activity_log'
)
ORDER BY tablename, indexname;

-- 6. التحقق من سياسات الأمان
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'user_achievements', 
  'user_badges', 
  'active_rewards', 
  'achievement_progress', 
  'activity_log'
)
ORDER BY tablename, policyname;

-- 7. تنظيف المكافآت المنتهية (اختبار)
SELECT cleanup_expired_rewards() as cleaned_count;
