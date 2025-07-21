# 📱 دليل تفعيل تسجيل الدخول بالهاتف - IGTaxi

## المشكلة الحالية
❌ تسجيل الدخول بالهاتف معطل حالياً
✅ الهدف: جعل تسجيل الدخول بالهاتف هو الأولوية

## 🔧 الخطوات المطلوبة

### الخطوة 1: تفعيل Phone Authentication في Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك: `gemjqbxmfkclfgvscqbj`
3. من القائمة الجانبية، اختر **Authentication**
4. اختر **Providers**
5. ابحث عن **Phone** وقم بتفعيله
6. في إعدادات Phone:
   - ✅ **Enable Phone provider**
   - ✅ **Enable Phone confirmations**
   - اختر SMS provider (مثل Twilio)
   - أدخل API credentials للـ SMS provider

### الخطوة 2: إعداد SMS Provider (Twilio مثلاً)

```
Account SID: [Your Twilio Account SID]
Auth Token: [Your Twilio Auth Token]
Phone Number: [Your Twilio Phone Number]
```

### الخطوة 3: تحديث إعدادات Authentication

في **Authentication > Settings**:
- ✅ **Enable email confirmations**: OFF
- ✅ **Enable phone confirmations**: ON
- **Default provider**: Phone

### الخطوة 4: إعداد رقم الهاتف الافتراضي

في **Authentication > Templates**:
- اختر **SMS templates**
- تخصيص رسالة التحقق باللغة العربية

## 🔧 إعدادات التطبيق الحالية

### الملفات المُعدة للتعامل مع Phone Auth:

1. **app/auth/login.tsx** ✅
   - يدعم تسجيل الدخول بالهاتف
   - يقوم بتنسيق رقم الهاتف تلقائياً

2. **app/auth/register.tsx** ✅
   - يدعم التسجيل بالهاتف
   - يتضمن التحقق من صحة رقم الهاتف

3. **app/auth/driver-register.tsx** ✅
   - تسجيل السائقين بالهاتف

### كود Phone Authentication:

```typescript
// في login.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  phone: formattedPhone,
  password: password,
});

// في register.tsx
const { data: authData, error: signUpError } = await supabase.auth.signUp({
  phone: formattedPhone,
  password: password,
  options: {
    data: {
      full_name: name,
      type: 'personal'
    }
  }
});
```

## 🎯 خطة التحسين

### إضافة تحقق OTP (اختيارية)

إذا كنت تريد إضافة تحقق OTP:

```typescript
// إرسال OTP
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+962XXXXXXXXX'
});

// التحقق من OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+962XXXXXXXXX',
  token: '123456',
  type: 'sms'
});
```

## 🔐 إعدادات الأمان

### Row Level Security (RLS) - مُفعل ✅

الجداول محمية بـ RLS:
- `profiles` 
- `main_profiles`
- `personal_profiles`
- `driver_profiles`

### سياسات الأمان:

```sql
-- المستخدم يرى بياناته فقط
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
```

## 📋 خطوات الاختبار

### 1. اختبار التسجيل:
1. افتح التطبيق
2. اذهب لصفحة التسجيل
3. أدخل رقم هاتف صحيح (مثل: +962791234567)
4. أدخل كلمة مرور
5. اضغط "إنشاء حساب"

### 2. اختبار تسجيل الدخول:
1. اذهب لصفحة تسجيل الدخول
2. أدخل رقم الهاتف وكلمة المرور
3. اضغط "تسجيل دخول"

## 🚨 نصائح مهمة

1. **تنسيق رقم الهاتف**: التطبيق يقوم بإضافة رمز البلد تلقائياً
2. **التحقق**: تأكد من تفعيل Phone provider في Supabase
3. **SMS Provider**: ستحتاج خدمة SMS (Twilio/MessageBird) للإنتاج
4. **الاختبار**: يمكن اختبار بدون SMS في Development mode

## 🛠 الدعم الفني

إذا واجهت مشاكل:
1. تحقق من logs في Supabase Dashboard
2. تأكد من تفعيل Phone provider
3. تحقق من صحة تنسيق رقم الهاتف
4. راجع Authentication Settings

---

**تم إعداد كل شيء في الكود، تحتاج فقط تفعيل Phone Authentication في Supabase Dashboard!** 🎉
