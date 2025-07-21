# نظام شحن الرصيد - IGTaxi Recharge System

## نظرة عامة

تم تطوير نظام شحن رصيد متكامل لتطبيق IGTaxi يدعم شحن الرصيد عبر بطاقات الشحن مع إمكانية مسح QR Code. النظام يدعم اللغتين العربية والإنجليزية ويتضمن آليات أمان متقدمة.

## الميزات الرئيسية

### 1. واجهة شحن البطاقات
- **إدخال الكود يدوياً**: حقل لإدخال كود البطاقة مع التحقق الفوري
- **مسح QR Code**: استخدام كاميرا الهاتف لمسح رمز QR
- **عرض القيمة**: إظهار قيمة البطاقة عند التحقق من صحة الكود
- **تأكيد الشحن**: زر آمن لتأكيد عملية الشحن
- **معالجة الأخطاء**: رسائل خطأ واضحة للحالات المختلفة

### 2. إدارة المحفظة
- **عرض الرصيد الحالي**: رصيد المستخدم بتصميم جذاب
- **إحصائيات المحفظة**: إجمالي الشحن والإنفاق
- **سجل المعاملات**: قائمة بجميع العمليات المالية
- **حالة الخدمة**: التحقق من إمكانية الوصول للخدمات

### 3. نظام العمولات والاشتراكات
- **خصم تلقائي**: خصم عمولة التطبيق من الطلبات
- **اشتراكات شهرية**: دفع الاشتراكات من رصيد المحفظة
- **حجب الخدمة**: منع الوصول عند نفاذ الرصيد

## هيكل قاعدة البيانات

### الجداول الرئيسية

#### 1. `igtaxi_cards` - بطاقات الشحن
```sql
- id: معرف فريد للبطاقة
- serial_number: الرقم التسلسلي
- redeem_code: كود الاستخدام
- qr_url: رابط رمز QR
- value: قيمة البطاقة
- status: حالة البطاقة (unused/used/expired)
- type: نوع البطاقة (driver/company/general)
```

#### 2. `user_wallets` - محافظ المستخدمين
```sql
- user_id: معرف المستخدم
- balance: الرصيد الحالي
- total_recharged: إجمالي الشحن
- total_spent: إجمالي الإنفاق
- status: حالة المحفظة
```

#### 3. `wallet_transactions` - معاملات المحفظة
```sql
- user_id: معرف المستخدم
- type: نوع المعاملة (recharge/deduction/commission/subscription)
- amount: المبلغ
- description: وصف المعاملة
- balance_before/after: الرصيد قبل وبعد المعاملة
```

## الاستخدام

### 1. إعداد قاعدة البيانات
```bash
# تشغيل سكريبت إنشاء الجداول
psql -f scripts/create-recharge-system.sql

# تشغيل سكريبت الدوال
psql -f scripts/create-recharge-functions.sql

# إدراج البيانات التجريبية
psql -f scripts/insert-recharge-sample-data.sql
```

### 2. استخدام واجهة الشحن
```typescript
import RechargeScreen from '@/components/recharge/RechargeScreen';

// في صفحة الشحن
export default function RechargePage() {
  return <RechargeScreen />;
}
```

### 3. عرض المحفظة
```typescript
import WalletCard from '@/components/recharge/WalletCard';

// في صفحة المحفظة
<WalletCard onRechargePress={() => router.push('./recharge')} />
```

### 4. استخدام خدمات الشحن
```typescript
import { RechargeService } from '@/utils/recharge-service';

// التحقق من صحة البطاقة
const result = await RechargeService.validateCard('IGTAXI10A1B2');

// شحن البطاقة
const redeemResult = await RechargeService.redeemCard('IGTAXI10A1B2', userId);

// التحقق من إمكانية الوصول للخدمة
const accessCheck = await RechargeService.checkServiceAccess(userId);
```

## بطاقات الشحن التجريبية

للاختبار، يمكن استخدام هذه الأكواد (القيم بالريال السعودي):

| الكود | القيمة بالدولار | القيمة بالريال | النوع | الحالة |
|-------|----------------|---------------|--------|--------|
| `IGTAXI5USD001` | 5$ | 18.75 ريال | سائق | مستخدمة |
| `IGTAXI10USD02` | 10$ | 37.50 ريال | سائق | مستخدمة |
| `IGTAXI15USD03` | 15$ | 56.25 ريال | عامة | غير مستخدمة |
| `IGTAXI20USD04` | 20$ | 75.00 ريال | سائق | غير مستخدمة |
| `IGTAXI25USD05` | 25$ | 93.75 ريال | شركة | غير مستخدمة |
| `IGTAXI5USD006` | 5$ | 18.75 ريال | عامة | غير مستخدمة |
| `IGTAXI10USD07` | 10$ | 37.50 ريال | سائق | غير مستخدمة |
| `IGTAXI15USD08` | 15$ | 56.25 ريال | شركة | غير مستخدمة |
| `IGTAXI20USD09` | 20$ | 75.00 ريال | عامة | غير مستخدمة |
| `IGTAXI25USD10` | 25$ | 93.75 ريال | سائق | غير مستخدمة |

### بطاقات منتهية الصلاحية (للاختبار):
| الكود | القيمة | النوع | الحالة |
|-------|--------|--------|--------|
| `IGTAXIEXP5USD` | 18.75 ريال | عامة | منتهية الصلاحية |
| `IGTAXIEXP10USD` | 37.50 ريال | سائق | منتهية الصلاحية |

## نظام العملات المدعوم

### العملات المتاحة:
- **ريال سعودي (SAR)**: العملة الافتراضية
- **دولار أمريكي (USD)**: العملة المرجعية
- **درهم إماراتي (AED)**
- **دينار كويتي (KWD)**
- **ريال قطري (QAR)**
- **يورو (EUR)**

### استخدام خدمة العملات:
```typescript
import { CurrencyService } from '@/utils/currency-service';

// تهيئة الخدمة
CurrencyService.initialize();

// تحويل من الدولار للعملة المحلية
const localAmount = CurrencyService.convertFromUSD(10); // 37.50 ريال

// تنسيق العملة للعرض
const formatted = CurrencyService.formatCurrency(37.50); // "٣٧٫٥٠ ر.س"

// الحصول على قيم البطاقات المتاحة
const cardValues = CurrencyService.getCardValues();
```

## الأمان والحماية

### 1. التحقق من صحة البطاقات
- فحص حالة البطاقة قبل الاستخدام
- منع الاستخدام المتكرر للبطاقة الواحدة
- التحقق من تاريخ انتهاء الصلاحية

### 2. حماية المعاملات
- استخدام المعاملات الذرية (Atomic Transactions)
- تسجيل جميع العمليات في سجل المعاملات
- التحقق من كفاية الرصيد قبل الخصم

### 3. Row Level Security (RLS)
- سياسات أمان على مستوى الصفوف
- منع الوصول لبيانات المستخدمين الآخرين
- حماية البيانات الحساسة

## معالجة الأخطاء

### رسائل الخطأ المعتادة:
- `رمز البطاقة غير صحيح`: الكود المدخل غير موجود
- `البطاقة مستخدمة مسبقاً`: البطاقة تم استخدامها من قبل
- `البطاقة منتهية الصلاحية`: تاريخ انتهاء الصلاحية مضى
- `رصيد المحفظة غير كافي`: الرصيد لا يكفي للعملية المطلوبة

## التطوير والصيانة

### إضافة بطاقات جديدة
```sql
INSERT INTO public.igtaxi_cards (serial_number, redeem_code, value, type)
VALUES ('IGT-NEW-001', 'NEWIGTAXI123', 100.00, 'driver');
```

### تحديث معدلات العمولة
```sql
UPDATE public.commission_rates 
SET rate_percentage = 10.0 
WHERE user_type = 'driver' AND service_type = 'taxi';
```

### مراقبة النظام
- مراقبة أرصدة المستخدمين
- تتبع استخدام البطاقات
- تحليل أنماط الإنفاق

## الملفات المهمة

```
components/recharge/
├── RechargeScreen.tsx          # واجهة شحن البطاقات
└── WalletCard.tsx             # عرض المحفظة

utils/
├── recharge-service.ts        # خدمات الشحن والمحفظة
└── currency-service.ts        # خدمة العملات والتحويل

scripts/
├── create-recharge-system.sql      # إنشاء الجداول الأساسية
├── create-recharge-functions.sql   # الدوال المساعدة
├── update-currency-support.sql     # تحديث دعم العملات
└── insert-recharge-sample-data.sql # البيانات التجريبية

app/
├── recharge.tsx               # صفحة الشحن
└── wallet.tsx                 # صفحة المحفظة
```

## 🚀 تشغيل النظام

### 1. إعداد قاعدة البيانات:
```bash
# تشغيل السكريبتات بالترتيب
psql -f scripts/create-recharge-system.sql
psql -f scripts/create-recharge-functions.sql
psql -f scripts/update-currency-support.sql
psql -f scripts/insert-recharge-sample-data.sql
```

### 2. أكواد البطاقات للاختبار:
```
IGTAXI15USD03 - 15$ (56.25 ريال)
IGTAXI20USD04 - 20$ (75.00 ريال)  
IGTAXI25USD05 - 25$ (93.75 ريال)
```

### 3. إصلاح خطأ العمود المفقود:
إذا ظهر خطأ `column "notes" does not exist`، فهذا يعني أن السكريبت القديم يحتوي على مرجع لعمود غير موجود. النسخة المحدثة لا تستخدم عمود `notes`.

## الدعم الفني

للمساعدة في التطوير أو حل المشاكل:
1. تحقق من سجلات الأخطاء في قاعدة البيانات
2. راجع صلاحيات المستخدم وسياسات RLS
3. تأكد من تشغيل جميع السكريبتس المطلوبة
4. اختبر النظام باستخدام البطاقات التجريبية

---

*تم تطوير هذا النظام باستخدام React Native، Expo، TypeScript، وSupabase*
