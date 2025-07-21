# دليل التشغيل السريع لنظام الطعام

## خطوات التفعيل

### 1. تطبيق قاعدة البيانات

```sql
-- تنفيذ الملفات بالترتيب التالي:

-- الخطوة 1: الجداول الأساسية
\i supabase/migrations/step1_basic_tables.sql

-- الخطوة 2: الفهارس والسياسات  
\i supabase/migrations/step2_indexes_policies.sql

-- الخطوة 3: نظام الطعام
\i supabase/migrations/step3_food_ordering_system.sql
```

### 2. إضافة المكونات للتطبيق

#### إضافة التبويب في التنقل الرئيسي
```typescript
// في app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';

// إضافة تبويب الطعام
<Tabs.Screen
  name="food"
  options={{
    title: 'الطعام',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons 
        name={focused ? 'restaurant' : 'restaurant-outline'} 
        color={color} 
        size={24} 
      />
    ),
  }}
/>
```

#### إنشاء صفحة الطعام الرئيسية
```typescript
// إنشاء app/(tabs)/food.tsx
import { View } from 'react-native';
import FoodOrderingSystem from '@/components/food/FoodOrderingSystem';

export default function FoodTab() {
  return (
    <View style={{ flex: 1 }}>
      <FoodOrderingSystem />
    </View>
  );
}
```

### 3. تهيئة البيانات الأولية

```sql
-- إضافة منشأة تجريبية
INSERT INTO business_profiles (id, business_name, business_type, phone, address, is_active) 
VALUES 
  ('test-business-id', 'مطعم الأصالة', 'restaurant', '0501234567', 'الرياض، المملكة العربية السعودية', true);

-- إضافة تصنيف قائمة تجريبي
INSERT INTO menu_categories (business_id, name, display_order) 
VALUES 
  ('test-business-id', 'الأطباق الرئيسية', 1);

-- إضافة صنف تجريبي
INSERT INTO menu_items (category_id, name, description, price, is_available) 
VALUES 
  ((SELECT id FROM menu_categories LIMIT 1), 'كبسة لحم', 'أرز بسمتي مع لحم مطبوخ بالبهارات', 45.00, true);
```

### 4. اختبار النظام

#### للعملاء
1. افتح تبويب "الطعام"
2. اختر "تصفح القوائم"
3. أضف أصناف للسلة
4. اكمل الطلب

#### للمنشآت
1. افتح تبويب "الطعام" 
2. اختر "إدارة القائمة"
3. أضف تصنيفات وأصناف
4. راقب الطلبات في "إدارة الطلبات"

#### للسائقين
1. افتح تبويب "الطعام"
2. اختر "طلبات التوصيل"
3. اقبل طلب توصيل
4. حدث حالة التوصيل

## مكونات النظام الجاهزة

### المكونات الرئيسية
- ✅ `FoodOrderingSystem.tsx` - النظام الرئيسي
- ✅ `BusinessMenu.tsx` - عرض القوائم
- ✅ `MenuManagement.tsx` - إدارة القوائم
- ✅ `OrderForm.tsx` - نموذج الطلب
- ✅ `BusinessOrdersManager.tsx` - إدارة طلبات المنشآت
- ✅ `CustomerOrderTracking.tsx` - تتبع طلبات العملاء
- ✅ `DriverDeliveryRequests.tsx` - طلبات التوصيل للسائقين

### قاعدة البيانات
- ✅ 11 جدول متخصص
- ✅ نظام أمان متكامل (RLS)
- ✅ فهارس محسنة للأداء
- ✅ triggers تلقائية

## استكشاف الأخطاء

### مشاكل شائعة وحلولها

#### خطأ في قاعدة البيانات
```bash
# التحقق من حالة الاتصال
supabase status

# إعادة تشغيل قاعدة البيانات المحلية
supabase db reset
```

#### خطأ في الاستيراد
```typescript
// تأكد من المسارات الصحيحة
import FoodOrderingSystem from '@/components/food/FoodOrderingSystem';
```

#### مشاكل الصلاحيات
```sql
-- التحقق من سياسات RLS
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## الدعم الفني

### للمطورين
- جميع الملفات موثقة
- أمثلة استخدام متوفرة
- معالجة شاملة للأخطاء

### سجل التغييرات
- v1.0.0: الإصدار الأولي الكامل
- قاعدة بيانات محسنة
- واجهات مستخدم متقدمة
- تكامل كامل مع النظام الموجود

---

**ملاحظة مهمة**: تأكد من تطبيق migration scripts بالترتيب الصحيح لتجنب أخطاء قاعدة البيانات.
