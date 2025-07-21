# 🚀 دليل إعداد نظام OTP - IGTaxi

## 📋 المتطلبات

### 1. تثبيت Supabase CLI
```bash
npm install -g supabase
```

### 2. إعداد متغيرات البيئة
في ملف `.env.local`:
```
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twilio Verify
TWILIO_SID=your_twilio_account_sid
TWILIO_AUTH=your_twilio_auth_token
TWILIO_VERIFY_SERVICE=your_twilio_verify_service_sid

# Environment
ENVIRONMENT=development
```

## 🔧 خطوات الإعداد

### 1. إنشاء خدمة Twilio Verify
1. اذهب إلى [Twilio Console](https://www.twilio.com/console)
2. اختر **Verify** > **Services**
3. اضغط **Create new Verify Service**
4. أدخل اسم الخدمة: `IGTaxi OTP`
5. احفظ الـ Service SID

### 2. إنشاء جدول OTP في قاعدة البيانات
```sql
-- في Supabase SQL Editor، قم بتشغيل:
-- محتوى ملف: supabase/migrations/create_otp_table.sql
```

### 3. نشر Edge Functions
```bash
# تسجيل دخول في Supabase
supabase login

# ربط المشروع
supabase link --project-ref your_project_id

# نشر الدوال
supabase functions deploy send-otp
supabase functions deploy verify-code

# تعيين متغيرات البيئة
supabase secrets set TWILIO_SID=your_sid
supabase secrets set TWILIO_AUTH=your_auth_token
supabase secrets set TWILIO_VERIFY_SERVICE=your_service_sid
```

### 4. اختبار النظام
```bash
# اختبار إرسال OTP
curl -X POST 'your_supabase_url/functions/v1/send-otp' \
  -H 'Authorization: Bearer your_anon_key' \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+962791234567", "channel": "sms"}'

# اختبار التحقق من OTP
curl -X POST 'your_supabase_url/functions/v1/verify-code' \
  -H 'Authorization: Bearer your_anon_key' \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+962791234567", "code": "123456"}'
```

## 📱 استخدام النظام في التطبيق

### تسجيل الدخول بـ OTP:
```typescript
import { otpService } from '@/utils/otp-service';

// إرسال رمز OTP
const result = await otpService.sendOTP('+962791234567');

// التحقق من رمز OTP
const verification = await otpService.verifyOTP('+962791234567', '123456');
```

### التسجيل بـ OTP:
```typescript
// إرسال رمز OTP للتسجيل
const result = await otpService.sendRegistrationOTP('+962791234567', {
  name: 'أحمد محمد',
  type: 'personal'
});

// التحقق وإنشاء الحساب
const verification = await otpService.verifyRegistrationOTP('+962791234567', '123456');
```

## 🎯 المميزات

### ✅ الموجود حالياً:
- إرسال رموز OTP عبر SMS
- التحقق من الرموز
- واجهة مستخدم متكاملة
- حفظ مؤقت لبيانات التسجيل
- تنسيق أرقام الهواتف تلقائياً
- عد تنازلي وإعادة إرسال
- حماية من CORS

### 🔄 المميزات المستقبلية:
- إرسال عبر WhatsApp
- إرسال عبر المكالمات الصوتية
- تشفير إضافي للرموز
- تتبع محاولات التحقق
- قائمة سوداء للأرقام المشبوهة

## 🚨 تنبيهات مهمة

### الأمان:
- لا تعرض رموز OTP في logs الإنتاج
- استخدم HTTPS دائماً
- حدد عدد محاولات التحقق
- قم بتنظيف الرموز المنتهية

### التكلفة:
- كل رسالة SMS تكلف ~$0.0075
- خطط للميزانية حسب عدد المستخدمين
- راقب استخدام Twilio

### الاختبار:
- في التطوير، يمكن إرجاع الرمز مباشرة
- استخدم أرقام اختبار Twilio
- اختبر مع أرقام دولية مختلفة

## 📞 الدعم الفني

### مشاكل شائعة:
1. **"Function not found"**: تأكد من نشر الدوال
2. **"Twilio error"**: تحقق من بيانات API
3. **"Phone format error"**: تأكد من تنسيق الرقم
4. **"OTP expired"**: الرموز تنتهي خلال 10 دقائق

### سجلات المراقبة:
- Supabase Dashboard > Functions > Logs
- Twilio Console > Monitor > Logs
- Application logs في VS Code

---

**🎉 تم إعداد نظام OTP بنجاح! الآن يمكن للمستخدمين تسجيل الدخول باستخدام أرقام هواتفهم فقط!**
