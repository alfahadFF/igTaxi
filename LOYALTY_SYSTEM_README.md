# 🎯 نظام النقاط والولاء - IGTaxi

![Loyalty System](https://img.shields.io/badge/Version-1.0.0-blue)
![Status](https://img.shields.io/badge/Status-Ready-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-✓-blue)
![React Native](https://img.shields.io/badge/React%20Native-✓-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-✓-blue)

نظام شامل ومتطور لنقاط الولاء مصمم خصيصاً لتطبيق IGTaxi. يتيح للسائقين والعملاء كسب النقاط واستبدالها بمكافآت قيمة، مع نظام مستويات متدرج وبرنامج إحالة متقدم.

## 📋 المحتويات

- [المميزات الرئيسية](#-المميزات-الرئيسية)
- [البنية التقنية](#️-البنية-التقنية)
- [التنصيب والإعداد](#-التنصيب-والإعداد)
- [الاستخدام](#-الاستخدام)
- [واجهات المستخدم](#️-واجهات-المستخدم)
- [API المرجعي](#-api-المرجعي)
- [الأمان](#-الأمان)
- [اختبار النظام](#-اختبار-النظام)
- [المساهمة](#-المساهمة)

## 🌟 المميزات الرئيسية

### 🎯 نظام نقاط متطور
- **كسب تلقائي للنقاط** عند إكمال الرحلات
- **مكافآت للتقييمات العالية** (4.5+ نجوم)
- **نقاط إضافية للمسافات الطويلة**
- **مكافآت الانضباط** لعدم التأخير

### 🏆 نظام المستويات والدرجات
- **5 مستويات**: Bronze, Silver, Gold, Platinum, VIP
- **مزايا متدرجة** لكل مستوى
- **ترقية تلقائية** عند الوصول للنقاط المطلوبة

### 🎁 مكافآت متنوعة
- **رصيد نقدي** للسائقين
- **رحلات مجانية** للعملاء
- **خصومات حصرية**
- **مزايا VIP**

### 🤝 نظام الإحالة
- **أكواد شخصية** لكل مستخدم
- **مكافآت مضاعفة** للإحالات الناجحة
- **تتبع دقيق** للإحالات

### 📊 تحليلات شاملة
- **تقارير مفصلة** للنقاط والنشاط
- **إحصائيات الأداء**
- **مؤشرات المشاركة**

## 🏗️ البنية التقنية

### قاعدة البيانات (PostgreSQL + Supabase)
```
📁 Database Schema
├── user_loyalty           # بيانات نقاط المستخدمين
├── loyalty_logs          # سجل النقاط والأنشطة
├── loyalty_rules         # قواعد كسب النقاط
├── loyalty_tiers         # مستويات الولاء
├── loyalty_rewards       # المكافآت المتاحة
├── loyalty_redemptions   # سجل استبدال المكافآت
└── referral_system       # نظام الإحالة
```

### طبقة الخدمات (TypeScript)
```
📁 Services Layer
├── loyalty-service.ts     # خدمة النقاط الرئيسية
├── loyalty-manager.ts     # مدير العمليات التلقائية
└── contexts/
    └── LoyaltyContext.tsx # Context للتكامل مع React
```

### واجهات المستخدم (React Native)
```
📁 UI Components
├── CustomerLoyaltyDashboard.tsx  # لوحة العملاء
├── DriverLoyaltyDashboard.tsx    # لوحة السائقين
├── PointsBadge.tsx               # عرض النقاط
└── TierBadge.tsx                 # عرض المستوى
```

## 🚀 التنصيب والإعداد

### 1. إعداد قاعدة البيانات

```sql
-- تشغيل ملف إنشاء النظام
\i scripts/create-loyalty-system.sql
```

### 2. تثبيت التبعيات

```bash
# تأكد من تثبيت Supabase
npm install @supabase/supabase-js

# تثبيت مكتبات React Native المطلوبة
npm install react-native-vector-icons
```

### 3. تكوين المتغيرات

```env
# .env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

### 4. التكامل مع التطبيق

```tsx
// App.tsx
import { LoyaltyProvider, initializeLoyaltySystem } from '@/contexts/LoyaltyContext';

export default function App() {
  useEffect(() => {
    initializeLoyaltySystem();
  }, []);

  return (
    <LoyaltyProvider>
      {/* بقية التطبيق */}
    </LoyaltyProvider>
  );
}
```

## 📱 الاستخدام

### كسب النقاط التلقائي

```tsx
import { useTripLoyalty } from '@/contexts/LoyaltyContext';

const TripComponent = () => {
  const { handleTripCompleted } = useTripLoyalty();

  const onTripComplete = async () => {
    await handleTripCompleted({
      tripId: 'trip-123',
      driverId: 'driver-456',
      customerId: 'customer-789',
      duration: 30,      // بالدقائق
      distance: 15,      // بالكيلومتر
      amount: 25,        // التكلفة
      driverRating: 4.8  // التقييم
    });
  };
};
```

### عرض النقاط

```tsx
import { useLoyalty, PointsBadge } from '@/contexts/LoyaltyContext';

const ProfileComponent = () => {
  const { userLoyalty } = useLoyalty();

  return (
    <View>
      <PointsBadge points={userLoyalty?.available_points || 0} />
      <Text>المستوى: {userLoyalty?.tier_level}</Text>
    </View>
  );
};
```

### استبدال المكافآت

```tsx
import LoyaltyService from '@/utils/loyalty-service';

const redeemReward = async (rewardId: string) => {
  try {
    const result = await LoyaltyService.redeemReward(userId, rewardId);
    if (result.success) {
      Alert.alert('تم الاستبدال!', `الكود: ${result.redemptionCode}`);
    }
  } catch (error) {
    Alert.alert('خطأ', 'حدث خطأ في الاستبدال');
  }
};
```

## 🖥️ واجهات المستخدم

### لوحة العملاء

```tsx
import { CustomerLoyaltyDashboard } from '@/components/loyalty/CustomerLoyaltyDashboard';

<CustomerLoyaltyDashboard 
  profileId={user.id}
  onRedeemSuccess={(code) => showNotification(code)}
/>
```

**المميزات:**
- 📊 نظرة عامة على النقاط والمستوى
- 🎁 استعراض واستبدال المكافآت
- 📱 مشاركة كود الإحالة
- 📈 سجل النشاطات

### لوحة السائقين

```tsx
import { DriverLoyaltyDashboard } from '@/components/loyalty/DriverLoyaltyDashboard';

<DriverLoyaltyDashboard 
  profileId={driver.id}
  onRedeemSuccess={(code) => showNotification(code)}
/>
```

**المميزات:**
- 🚗 أداء السائق الشهري
- 💰 استبدال رصيد نقدي
- 📊 إحصائيات مفصلة
- 💡 نصائح لكسب المزيد من النقاط

## 📚 API المرجعي

### LoyaltyService

#### addPoints()
```typescript
static async addPoints(
  profileId: string,
  actionType: string,
  reason: string,
  points: number,
  options?: {
    tripId?: string;
    ratingValue?: number;
    amountPaid?: number;
    referralProfileId?: string;
  }
): Promise<boolean>
```

#### getUserLoyalty()
```typescript
static async getUserLoyalty(profileId: string): Promise<UserLoyalty | null>
```

#### redeemReward()
```typescript
static async redeemReward(
  profileId: string, 
  rewardId: string
): Promise<{ success: boolean; redemptionCode?: string; error?: string }>
```

#### getAvailableRewards()
```typescript
static async getAvailableRewards(
  role?: 'driver' | 'customer'
): Promise<LoyaltyReward[]>
```

### LoyaltyManager

#### handleTripCompleted()
```typescript
async handleTripCompleted(
  profileId: string, 
  tripDetails: {
    duration: number;
    distance: number;
    amount: number;
    rating?: number;
  }
): Promise<void>
```

#### generateLoyaltyReport()
```typescript
async generateLoyaltyReport(
  profileId: string, 
  period?: 'week' | 'month' | 'year'
): Promise<LoyaltyReport | null>
```

## 🔒 الأمان

### Row Level Security (RLS)
- **حماية البيانات** على مستوى الصف
- **صلاحيات محدودة** لكل مستخدم
- **منع الوصول غير المصرح**

### منع الاحتيال
- **حدود يومية وشهرية** للنقاط
- **تدقيق شامل** للعمليات
- **مراقبة الأنماط المشبوهة**

### تشفير البيانات
- **تشفير كامل** في قاعدة البيانات
- **حماية أكواد الاستبدال**
- **تأمين المعاملات**

## 🧪 اختبار النظام

### اختبار الوحدة
```bash
# تشغيل اختبارات النظام
npm test loyalty-service.test.ts
npm test loyalty-manager.test.ts
```

### اختبار التكامل
```bash
# اختبار التكامل مع قاعدة البيانات
npm test integration/loyalty-integration.test.ts
```

### اختبار الأداء
```bash
# اختبار الأداء تحت الضغط
npm test performance/loyalty-performance.test.ts
```

## 📊 مراقبة الأداء

### مؤشرات الأداء الرئيسية (KPIs)
- **معدل المشاركة**: نسبة المستخدمين النشطين
- **معدل الاستبدال**: نسبة النقاط المستبدلة
- **نمو الإحالات**: عدد الإحالات الناجحة
- **ترقية المستويات**: معدل الترقية بين المستويات

### التحليلات المتقدمة
```typescript
import { useLoyaltyAnalytics } from '@/contexts/LoyaltyContext';

const { generateReport, getTierInfo } = useLoyaltyAnalytics();

// تقرير شهري
const monthlyReport = await generateReport('month');
console.log(`النقاط المكتسبة: ${monthlyReport.pointsEarned}`);

// معلومات المستوى
const tierInfo = await getTierInfo();
console.log(`التقدم نحو المستوى التالي: ${tierInfo.progress}%`);
```

## 🛠 التطوير والصيانة

### إضافة مكافآت جديدة
```sql
INSERT INTO loyalty_rewards (
  reward_name,
  description,
  cost_points,
  reward_type,
  reward_value,
  target_role,
  validity_days
) VALUES (
  'خصم 30%',
  'خصم 30% على الرحلة التالية',
  150,
  'discount',
  30,
  'customer',
  30
);
```

### تحديث قواعد النقاط
```sql
UPDATE loyalty_rules 
SET base_points = 15 
WHERE action_trigger = 'trip_completed' 
AND target_role = 'driver';
```

### إضافة مستوى جديد
```sql
INSERT INTO loyalty_tiers (
  tier_name,
  tier_level,
  min_points,
  tier_color,
  tier_icon,
  benefits
) VALUES (
  'diamond',
  6,
  10000,
  '#B9F2FF',
  'diamond',
  '{"discount": 30, "priority": true, "manager": true}'
);
```

## 🔄 التحديثات المستقبلية

### الإصدار 1.1 (مخطط)
- [ ] **نقاط منتهية الصلاحية** بعد سنة
- [ ] **مكافآت موسمية** للأعياد والمناسبات
- [ ] **تحديات يومية** مع نقاط إضافية
- [ ] **نظام العملة الافتراضية**

### الإصدار 1.2 (مخطط)
- [ ] **شراكات خارجية** مع متاجر ومطاعم
- [ ] **ذكاء اصطناعي** لتخصيص المكافآت
- [ ] **تطبيق جوال مخصص** للولاء
- [ ] **API عام** للشركاء

## 📞 الدعم والمساعدة

### للمطورين
- **التوثيق التقني**: [docs/technical/](./docs/technical/)
- **أمثلة البرمجة**: [examples/](./examples/)
- **API المرجعي**: [api-docs/](./api-docs/)

### للمستخدمين
- **دليل المستخدم**: [LOYALTY_SYSTEM_GUIDE.md](./docs/LOYALTY_SYSTEM_GUIDE.md)
- **الأسئلة الشائعة**: [FAQ.md](./docs/FAQ.md)
- **فيديوهات تعليمية**: متاحة في التطبيق

### التواصل
- **البريد الإلكتروني**: support@igtaxi.com
- **Discord**: [IGTaxi Community](https://discord.gg/igtaxi)
- **GitHub Issues**: [رفع مشكلة](https://github.com/igtaxi/loyalty-system/issues)

## 🤝 المساهمة

نرحب بمساهماتكم! يرجى قراءة [دليل المساهمة](CONTRIBUTING.md) قبل البدء.

### خطوات المساهمة
1. **Fork** المشروع
2. **إنشاء فرع** للميزة الجديدة (`git checkout -b feature/amazing-feature`)
3. **Commit** التغييرات (`git commit -m 'Add amazing feature'`)
4. **Push** للفرع (`git push origin feature/amazing-feature`)
5. **فتح Pull Request**

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 🙏 الشكر والتقدير

- **فريق IGTaxi** لدعم تطوير النظام
- **مجتمع React Native** للأدوات الرائعة
- **فريق Supabase** لقاعدة البيانات الممتازة

---

<div align="center">

**🚀 IGTaxi Loyalty System - نحو مستقبل أفضل للنقل 🚀**

[الموقع الرسمي](https://igtaxi.com) • [التطبيق](https://app.igtaxi.com) • [التوثيق](https://docs.igtaxi.com)

صنع بـ ❤️ من فريق IGTaxi

</div>
