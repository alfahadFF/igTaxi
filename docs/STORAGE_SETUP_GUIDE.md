# إعداد سياسات التخزين للتسجيلات الصوتية
## دليل إعداد bucket emergency-audio في Supabase Dashboard

### 🔧 خطوات الإعداد اليدوي:

#### 1. إنشاء bucket التخزين
```sql
-- نفذ هذا الاستعلام:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'emergency-audio',
  'emergency-audio',
  false,
  10485760,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO NOTHING;
```

#### 2. إعداد السياسات من Dashboard:

##### الخطوة 1: اذهب إلى Supabase Dashboard
- افتح مشروعك في [supabase.com](https://supabase.com)
- اذهب إلى **Storage** من القائمة الجانبية
- اختر **Policies** من الأعلى

##### الخطوة 2: أنشئ سياسة الرفع (Upload)
```
اسم السياسة: Users can upload their own audio
الجدول: objects  
العملية: INSERT
السياسة:
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

##### الخطوة 3: أنشئ سياسة العرض (View)
```
اسم السياسة: Users can view their own audio
الجدول: objects
العملية: SELECT  
السياسة:
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

##### الخطوة 4: أنشئ سياسة التحديث (Update)
```
اسم السياسة: Users can update their own audio
الجدول: objects
العملية: UPDATE
السياسة:
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

##### الخطوة 5: أنشئ سياسة الحذف (Delete)
```
اسم السياسة: Users can delete their own audio
الجدول: objects
العملية: DELETE
السياسة:
bucket_id = 'emergency-audio' AND 
(storage.foldername(name))[1] = auth.uid()::text
```

### 📁 هيكل الملفات المقترح:
```
emergency-audio/
├── {user_id_1}/
│   ├── emergency_20250720_001.m4a
│   ├── emergency_20250720_002.m4a
│   └── sos_20250720_003.m4a
├── {user_id_2}/
│   ├── manual_20250720_004.m4a
│   └── incident_20250720_005.m4a
└── ...
```

### 🔍 التحقق من الإعداد:

#### استعلام للتحقق من bucket:
```sql
SELECT * FROM check_audio_storage_status();
```

#### اختبار رفع ملف (من التطبيق):
```typescript
const filePath = `${auth.user.id}/test_recording.m4a`;
await supabase.storage
  .from('emergency-audio')
  .upload(filePath, audioFile);
```

### ⚠️ ملاحظات مهمة:

1. **الأمان**: كل مستخدم يصل لملفاته فقط
2. **البنية**: اسم الملف يجب أن يبدأ بـ `{user_id}/`
3. **الحجم**: حد أقصى 10MB للملف الواحد
4. **الأنواع**: فقط ملفات صوتية مدعومة

### 🛠️ استكشاف الأخطاء:

#### خطأ "Access denied":
- تأكد من أن السياسات مُنشأة بشكل صحيح
- تأكد من أن المستخدم مسجل دخول
- تأكد من بنية اسم الملف

#### خطأ "File too large":
- تأكد من أن الملف أقل من 10MB
- يمكن تعديل الحد الأقصى في إعدادات bucket

#### خطأ "Invalid file type":
- تأكد من أن نوع الملف مدعوم
- الأنواع المدعومة: mp3, m4a, wav, ogg

### 🎯 التكامل مع التطبيق:

```typescript
// استخدام خدمة التسجيل الصوتي
import { emergencyAudioService } from '@/utils/safety/emergency-audio-service';

// رفع تسجيل
await emergencyAudioService.uploadRecording(localPath, fileName);

// تحميل تسجيل  
await emergencyAudioService.downloadRecording(fileName, localPath);
```

---

**بعد إتمام هذه الخطوات، ستكون قد أعددت نظام تخزين آمن ومنظم للتسجيلات الصوتية! 🎉**
