# نظام التسجيل الصوتي للطوارئ
## دليل التشغيل السريع

### 🎯 نظرة عامة
تم إعداد نظام متكامل للتسجيل الصوتي في حالات الطوارئ مع ربط كامل بقاعدة البيانات والتخزين السحابي.

### 📁 المكونات الرئيسية

#### 1. قاعدة البيانات
```sql
scripts/create-audio-recording-system.sql     # الجداول والوظائف
scripts/create-audio-storage-bucket.sql      # bucket التخزين
```

**الجداول:**
- `emergency_audio_recordings` - التسجيلات الأساسية
- `audio_recording_shares` - المشاركات  
- `audio_processing_queue` - معالجة الملفات
- `audio_recording_analytics` - الإحصائيات

#### 2. الخدمات
```typescript
utils/safety/emergency-audio-service.ts      # خدمة التسجيل الرئيسية
```

**الوظائف المتاحة:**
- `createRecording()` - إنشاء تسجيل جديد
- `updateRecording()` - تحديث التسجيل
- `shareRecording()` - مشاركة مع جهات الاتصال
- `getUserRecordings()` - قائمة التسجيلات
- `deleteRecording()` - حذف التسجيل
- `uploadRecording()` - رفع للتخزين السحابي
- `downloadRecording()` - تحميل من السحابة

#### 3. مكونات الواجهة
```typescript
components/safety/EmergencyAudioRecorderSimple.tsx  # مسجل الصوت
components/safety/AudioRecordingsList.tsx           # قائمة التسجيلات
```

### ⚙️ إعداد النظام

#### الخطوة 1: تشغيل السكريبت
```bash
node scripts/setup-audio-recording-system.js
```

#### الخطوة 2: التحقق من الإعداد
السكريبت سيقوم بـ:
- ✅ إنشاء جداول قاعدة البيانات
- ✅ إنشاء bucket التخزين `emergency-audio`
- ✅ تفعيل سياسات الأمان RLS
- ✅ اختبار الوظائف المساعدة

### 🎙️ استخدام النظام

#### في مكون React Native:
```typescript
import { EmergencyAudioRecorder } from '@/components/safety/EmergencyAudioRecorderSimple';
import { AudioRecordingsList } from '@/components/safety/AudioRecordingsList';

// عرض مسجل الطوارئ
<EmergencyAudioRecorder 
  isVisible={showRecorder}
  emergencyType="sos"  // أو "manual", "auto", "incident"
  tripId={currentTripId}
  onClose={() => setShowRecorder(false)}
  onRecordingComplete={(recording) => {
    console.log('تم إكمال التسجيل:', recording);
  }}
/>

// عرض قائمة التسجيلات
<AudioRecordingsList
  isVisible={showList}
  onClose={() => setShowList(false)}
  onRecordingSelect={(recording) => {
    console.log('تم اختيار تسجيل:', recording);
  }}
/>
```

#### استخدام الخدمة مباشرة:
```typescript
import { emergencyAudioService } from '@/utils/safety/emergency-audio-service';

// إنشاء تسجيل جديد
const recordingId = await emergencyAudioService.createRecording({
  recording_id: 'emergency_' + Date.now(),
  recording_type: 'sos',
  emergency_level: 'critical',
  trip_id: 'trip123'
});

// الحصول على التسجيلات
const recordings = await emergencyAudioService.getUserRecordings({
  recording_type: 'sos',
  limit: 10
});

// مشاركة تسجيل
await emergencyAudioService.shareRecording({
  recording_id: 'rec123',
  contact_id: 'contact456',
  share_method: 'whatsapp'
});
```

### 🔐 الأمان والخصوصية

#### Row Level Security (RLS):
- ✅ المستخدمون يصلون لتسجيلاتهم فقط
- ✅ المشاركة محكومة بصلاحيات
- ✅ جهات الاتصال المخولة يمكنها الوصول للمشارك فقط

#### التخزين الآمن:
- 📁 ملفات منظمة حسب المستخدم: `{user_id}/{recording_id}.m4a`
- 🔒 bucket خاص (ليس عام)
- 📏 حد أقصى 10MB للملف
- 🎵 أنواع ملفات مدعومة: m4a, mp3, wav, ogg

### 📊 أنواع التسجيلات

| النوع | الوصف | مستوى الطوارئ |
|-------|--------|---------------|
| `sos` | تسجيل من زر الطوارئ | Critical |
| `auto` | تسجيل تلقائي من النظام | High |
| `manual` | تسجيل يدوي من المستخدم | Medium |
| `incident` | تسجيل حادث/مشكلة | High |
| `evidence` | تسجيل كدليل قانوني | Medium |

### 🔄 العمليات المتقدمة

#### التنظيف التلقائي:
```sql
-- يحذف التسجيلات المحذوفة بعد 30 يوم
SELECT cleanup_old_audio_recordings();
```

#### الإحصائيات:
```typescript
const stats = await emergencyAudioService.getRecordingStats();
// إجمالي التسجيلات، المدة، التوزيع حسب النوع
```

#### البحث:
```typescript
const results = await emergencyAudioService.searchRecordings({
  query: 'حادث',
  recording_type: 'incident',
  date_from: '2024-01-01',
  limit: 20
});
```

### 🚀 الاختبار والتطوير

#### اختبار التسجيل:
```bash
# تشغيل التطبيق واختبار:
# 1. فتح مسجل الطوارئ
# 2. بدء/إيقاف التسجيل
# 3. مشاركة مع جهات الاتصال
# 4. عرض قائمة التسجيلات
```

#### مراقبة قاعدة البيانات:
```sql
-- عدد التسجيلات
SELECT COUNT(*) FROM emergency_audio_recordings;

-- آخر التسجيلات
SELECT * FROM emergency_audio_recordings 
ORDER BY created_at DESC LIMIT 5;

-- التسجيلات المشاركة
SELECT * FROM audio_recording_shares 
WHERE share_status = 'sent';
```

### 📝 الملاحظات المهمة

1. **expo-av**: يحتاج تثبيت للتسجيل الفعلي
2. **الصلاحيات**: Location + Microphone مطلوبة
3. **التخزين**: ملفات محلية + سحابية
4. **الأداء**: فهرسة محسنة للبحث السريع
5. **التوافق**: React Native + Expo + Supabase

### 🔧 استكشاف الأخطاء

#### مشاكل شائعة:
- **التسجيل لا يعمل**: تحقق من صلاحيات الميكروفون
- **الرفع فاشل**: تحقق من bucket والشبكة  
- **المشاركة لا تعمل**: تحقق من جهات الاتصال الطارئة
- **قاعدة البيانات**: تحقق من RLS policies

#### لوج الأخطاء:
```typescript
// مفعل في جميع وظائف emergencyAudioService
console.error('خطأ في التسجيل:', error);
```

---

**النظام جاهز للاستخدام! 🎉**

للدعم التقني أو الأسئلة، راجع الكود في:
- `utils/safety/emergency-audio-service.ts`
- `components/safety/EmergencyAudioRecorderSimple.tsx`
