# 🗂️ حل مشكلة حفظ الصور والملفات في IGTaxi

## ❌ **المشكلة المكتشفة:**
- التطبيق يحاول رفع الصور ولكن **Storage Buckets** غير موجودة في Supabase
- النماذج تحتوي على كود رفع الصور لكن المجلدات المطلوبة غير مُعدة

## ✅ **الحل المطلوب:**

### 1️⃣ **إنشاء Storage Buckets يدوياً:**
```sql
-- انسخ هذه الاستعلامات ونفذها في Supabase SQL Editor:

-- إنشاء bucket للوثائق الخاصة بالسائقين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver_documents', 'driver_documents', true, 5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
);

-- إنشاء bucket للوصفات الطبية  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescriptions', 'prescriptions', true, 10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
);

-- إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_photos', 'profile_photos', true, 5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']  
);

-- إنشاء bucket لصور الأعمال التجارية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business_photos', 'business_photos', true, 10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
);

-- إنشاء bucket لصور المنتجات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_images', 'product_images', true, 5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- إنشاء bucket لصور السيارات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle_photos', 'vehicle_photos', true, 5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
);

-- إنشاء bucket لملفات النظام
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system_files', 'system_files', true, 20971520,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
);
```

### 2️⃣ **إنشاء السياسات للأمان:**
```sql
-- سياسات driver_documents
CREATE POLICY "Enable insert for authenticated users" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'driver_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users" ON storage.objects FOR SELECT 
USING (bucket_id = 'driver_documents');

-- سياسات prescriptions  
CREATE POLICY "Enable insert for authenticated users prescriptions" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users prescriptions" ON storage.objects FOR SELECT 
USING (bucket_id = 'prescriptions');

-- سياسات profile_photos
CREATE POLICY "Enable insert for authenticated users profiles" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'profile_photos' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users profiles" ON storage.objects FOR SELECT 
USING (bucket_id = 'profile_photos');

-- سياسات business_photos
CREATE POLICY "Enable insert for authenticated users business" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'business_photos' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users business" ON storage.objects FOR SELECT 
USING (bucket_id = 'business_photos');

-- سياسات product_images
CREATE POLICY "Enable insert for authenticated users products" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product_images' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users products" ON storage.objects FOR SELECT 
USING (bucket_id = 'product_images');

-- سياسات vehicle_photos
CREATE POLICY "Enable insert for authenticated users vehicles" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vehicle_photos' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users vehicles" ON storage.objects FOR SELECT 
USING (bucket_id = 'vehicle_photos');

-- سياسات system_files
CREATE POLICY "Enable insert for authenticated users system" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'system_files' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users system" ON storage.objects FOR SELECT 
USING (bucket_id = 'system_files');
```

### 3️⃣ **التحقق من النجاح:**
```sql
-- للتحقق من إنشاء Buckets بنجاح
SELECT id, name, public, file_size_limit, created_at 
FROM storage.buckets 
ORDER BY created_at DESC;

-- يجب أن ترى 7 buckets جديدة
```

## 📁 **بنية المجلدات المُنشأة:**

### 🗂️ **driver_documents/**
- `profile_photos/` - الصور الشخصية للسائقين
- `driving_licenses/` - صور رخص القيادة  
- `identity_cards/` - صور الهويات الشخصية
- `vehicle_docs/` - وثائق السيارات

### 💊 **prescriptions/**
- `uploads/` - صور الوصفات الطبية

### 👤 **profile_photos/**
- `users/` - الصور الشخصية للمستخدمين

### 🏢 **business_photos/**
- `logos/` - شعارات الشركات
- `restaurants/` - صور المطاعم
- `cafes/` - صور المقاهي

### 📦 **product_images/**
- `catalog/` - صور المنتجات

### 🚗 **vehicle_photos/**
- `gallery/` - صور السيارات والمركبات

### ⚙️ **system_files/**
- `tests/` - ملفات اختبار النظام

## 🎯 **كيفية الاستخدام في الكود:**

### للنماذج الموجودة:
```typescript
import { 
  uploadProfilePhoto,
  uploadDriverDocument, 
  uploadPrescriptionImage
} from '../utils/storage';

// رفع صورة شخصية
const profileUrl = await uploadProfilePhoto(imageUri, userId);

// رفع رخصة قيادة  
const licenseUrl = await uploadDriverDocument(imageUri, 'license', userId);

// رفع وصفة طبية
const prescriptionUrl = await uploadPrescriptionImage(imageUri, userId);
```

## ✅ **بعد تنفيذ هذه الخطوات:**
1. ✅ جميع النماذج ستتمكن من رفع الصور بنجاح
2. ✅ الصور ستُحفظ في مجلدات منظمة
3. ✅ النظام سيكون آمن مع سياسات محددة
4. ✅ حجم الملفات محدود لتجنب إساءة الاستخدام
5. ✅ أنواع الملفات محددة للأمان

## 🚨 **تذكير مهم:**
يجب تنفيذ استعلامات SQL أعلاه في **Supabase Dashboard** قبل اختبار رفع الصور في التطبيق!
