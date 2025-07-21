# نظام الإنجازات الذكية 🏆
## Smart Achievements System

نظام إنجازات متطور مصمم خصيصاً لتطبيق IGTaxi، يوفر تجربة تحفيزية للمستخدمين بدون مخاطر مالية.

## 🎯 الهدف الأساسي

تم تطوير هذا النظام كبديل آمن لنظام النقاط التقليدي، حيث:
- **لا توجد نقاط قابلة للتحويل إلى أموال**
- **جميع المكافآت محدودة المدة**
- **لا توجد التزامات مالية دائمة**
- **تركيز على التحفيز والمشاركة فقط**

## 🏗️ هيكل النظام

### 1. قاعدة البيانات
```sql
-- الجداول الأساسية:
- badge_levels: مستويات الشارات
- achievements: الإنجازات المتاحة
- user_achievements: إنجازات المستخدمين
- user_badges: شارات المستخدمين
- active_rewards: المكافآت النشطة
- achievement_progress: تقدم الإنجازات
- activity_log: سجل النشاطات
```

### 2. الخدمات (Services)
- `SmartAchievementsService`: الخدمة الرئيسية
- `useAchievements`: React Hook لإدارة البيانات
- `useActivityLogger`: Hook لتسجيل النشاطات

### 3. المكونات (Components)
- `SmartAchievementsDashboard`: لوحة التحكم الكاملة
- `HomeAchievementSection`: قسم الصفحة الرئيسية
- `AchievementWidget`: عنصر واجهة مختصر
- `AchievementManager`: إدارة النظام
- `ActivityTracker`: متتبع النشاطات

## 🚀 التنصيب والإعداد

### 1. إعداد قاعدة البيانات
```bash
# تشغيل ملف SQL لإنشاء الجداول
psql -h your-db-host -d your-database -f create-smart-achievements-system.sql
```

### 2. تهيئة المشروع
```tsx
// في App.tsx أو المكون الرئيسي
import { AchievementTrackerProvider } from '@/components/achievements';

export default function App() {
  return (
    <AchievementTrackerProvider profileId={currentUser.id}>
      <YourAppContent />
    </AchievementTrackerProvider>
  );
}
```

### 3. استخدام المكونات
```tsx
// في الصفحة الرئيسية
import { HomeAchievementSection } from '@/components/achievements';

<HomeAchievementSection 
  profileId={user.id}
  userRole="customer"
  onNavigateToFull={() => navigation.navigate('Achievements')}
/>

// في صفحة الإنجازات
import { SmartAchievementsDashboard } from '@/components/achievements';

<SmartAchievementsDashboard 
  profileId={user.id}
  userRole="customer"
/>
```

## 📊 أنواع الإنجازات

### 1. إنجازات القيادة (للسائقين)
- **المبتدئ**: إكمال 5 رحلات
- **المحترف**: إكمال 50 رحلة
- **الخبير**: إكمال 200 رحلة
- **الماهر**: الحصول على تقييم 4.8+
- **الملتزم**: عدم التأخير لـ 10 رحلات متتالية

### 2. إنجازات الركاب (للعملاء)
- **المستكشف**: إكمال 10 رحلات
- **المسافر**: إكمال 50 رحلة
- **المداوم**: استخدام التطبيق 30 يوم
- **المقيم**: إعطاء 20 تقييم
- **الداعي**: إحالة 5 أصدقاء

### 3. إنجازات مشتركة
- **النشط**: استخدام التطبيق 7 أيام متتالية
- **الاجتماعي**: إحالة أول صديق
- **المفيد**: إعطاء تقييمات مفيدة

## 🎁 أنواع المكافآت

### 1. مكافآت مؤقتة (محدودة المدة)
- **خصم 10%**: صالح لمدة 7 أيام
- **رحلة مجانية**: صالحة لمدة 3 أيام
- **أولوية في الطلبات**: صالحة لمدة 24 ساعة
- **ترقية للدرجة المميزة**: صالحة لرحلة واحدة

### 2. مزايا مؤقتة
- **عدم دفع رسوم الإلغاء**: لمدة 5 أيام
- **خدمة عملاء مميزة**: لمدة شهر واحد
- **إشعارات مبكرة للعروض**: لمدة أسبوعين

## 🔒 الأمان والخصوصية

### الضمانات المالية
- ✅ لا توجد نقاط قابلة للتحويل نقدي
- ✅ جميع المكافآت لها تاريخ انتهاء
- ✅ لا توجد خصومات دائمة
- ✅ لا توجد التزامات مالية طويلة المدى

### حماية البيانات
- 🔐 تشفير جميع البيانات الحساسة
- 🔐 Row Level Security (RLS) في Supabase
- 🔐 صلاحيات محدودة لكل مستخدم
- 🔐 سجل مراجعة شامل للأنشطة

## 🛠️ استخدام المطورين

### تسجيل النشاطات
```tsx
import { AchievementTracker } from '@/components/achievements';

// بعد إكمال رحلة
AchievementTracker.trackTripCompleted({
  tripId: '123',
  duration: 15,
  rating: 5,
  fare: 25.50,
  driverDelay: 0
});

// بعد إعطاء تقييم
AchievementTracker.trackRatingGiven({
  tripId: '123',
  rating: 5,
  feedback: 'رحلة ممتازة'
});

// عند انضمام إحالة
AchievementTracker.trackReferralJoined({
  referralCode: 'REF123',
  referredUserId: 'user456'
});
```

### استخدام البيانات
```tsx
import { useAchievements } from '@/components/achievements';

const MyComponent = () => {
  const {
    userBadge,
    achievements,
    activeRewards,
    stats,
    loading,
    logActivity,
    useReward
  } = useAchievements({
    profileId: currentUser.id,
    userRole: 'customer',
    autoRefresh: true
  });

  const handleUseReward = async (rewardId: string) => {
    const result = await useReward(rewardId, {
      usedInTrip: 'trip123'
    });
    
    if (result.success) {
      alert('تم استخدام المكافأة بنجاح!');
    }
  };

  return (
    <View>
      {/* عرض البيانات */}
    </View>
  );
};
```

## 📈 المراقبة والتحليل

### الإحصائيات المتاحة
- عدد المستخدمين النشطين
- معدل إنجاز المهام
- استخدام المكافآت
- تفاعل المستخدمين

### أدوات المراقبة
```tsx
import { AchievementManager } from '@/components/achievements';

// للمدراء فقط
<AchievementManager 
  onClose={() => setShowManager(false)}
  isAdmin={currentUser.role === 'admin'}
/>
```

## 🔧 إعدادات النظام

### تخصيص المكافآت
يمكن تعديل أنواع ومدة المكافآت من خلال جدول `achievements`:

```sql
UPDATE achievements 
SET reward_duration_hours = 48 
WHERE achievement_key = 'first_trip_completion';
```

### إضافة إنجازات جديدة
```sql
INSERT INTO achievements (
  achievement_key,
  title,
  description,
  icon,
  category,
  target_role,
  condition_type,
  condition_value,
  reward_type,
  reward_value,
  reward_duration_hours
) VALUES (
  'speed_demon',
  'الشعلة السريعة',
  'أكمل 5 رحلات في أقل من ساعة واحدة',
  '⚡',
  'driving',
  'driver',
  'trips_in_timeframe',
  5,
  'priority',
  '{"priority_level": "high", "duration_hours": 24}',
  24
);
```

## 🚨 استكشاف الأخطاء

### مشاكل شائعة والحلول

1. **عدم تسجيل النشاطات**
   ```tsx
   // تأكد من تهيئة المتتبع
   useEffect(() => {
     AchievementTracker.initialize(profileId, logActivity);
   }, []);
   ```

2. **عدم ظهور المكافآت**
   ```sql
   -- فحص انتهاء صلاحية المكافآت
   SELECT * FROM active_rewards 
   WHERE profile_id = 'user_id' 
   AND expires_at > NOW();
   ```

3. **مشاكل الأداء**
   ```tsx
   // استخدم autoRefresh بحذر
   const { ... } = useAchievements({
     profileId,
     userRole,
     autoRefresh: false, // أو قم بزيادة refreshInterval
     refreshInterval: 300000 // 5 minutes
   });
   ```

## 📱 التوافق

- ✅ React Native 0.70+
- ✅ Expo SDK 48+
- ✅ TypeScript 4.9+
- ✅ Supabase 2.0+
- ✅ iOS 12+
- ✅ Android API 21+

## 🤝 المساهمة

لإضافة ميزات جديدة أو إصلاح الأخطاء:

1. قم بإنشاء فرع جديد
2. اكتب الاختبارات المناسبة
3. تأكد من عدم وجود مخاطر مالية
4. اتبع معايير الكود الموجودة
5. أرسل Pull Request

## 📄 الترخيص

هذا النظام مطور خصيصاً لتطبيق IGTaxi ومحمي بحقوق الطبع والنشر.

---

**تذكير مهم**: هذا النظام مصمم لتجنب المخاطر المالية. جميع المكافآت محدودة المدة ولا يمكن تحويلها إلى أموال حقيقية. 💰🚫
