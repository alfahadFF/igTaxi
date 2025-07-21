-- ===================================================================
-- استعلامات SQL لإنشاء Storage Buckets يدوياً في Supabase
-- ===================================================================
-- انسخ هذه الاستعلامات وقم بتنفيذها في SQL Editor في Supabase Dashboard

-- 1. إنشاء bucket للوثائق الخاصة بالسائقين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver_documents',
  'driver_documents', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. إنشاء bucket للوصفات الطبية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'prescriptions',
  'prescriptions',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 3. إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile_photos',
  'profile_photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 4. إنشاء bucket لصور الأعمال التجارية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business_photos',
  'business_photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 5. إنشاء bucket لصور المنتجات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product_images',
  'product_images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 6. إنشاء bucket لصور السيارات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle_photos',
  'vehicle_photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 7. إنشاء bucket لملفات النظام
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system_files',
  'system_files',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- ===================================================================
-- إنشاء السياسات (Policies) للأمان
-- ===================================================================

-- سياسات driver_documents
CREATE POLICY "Enable insert for authenticated users" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'driver_documents' AND auth.role() = 'authenticated');

CREATE POLICY "Enable select for all users" ON storage.objects FOR SELECT 
USING (bucket_id = 'driver_documents');

CREATE POLICY "Enable update for own files" ON storage.objects FOR UPDATE 
USING (bucket_id = 'driver_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

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

-- ===================================================================
-- دوال مساعدة
-- ===================================================================

-- دالة للحصول على URL آمن للملف
CREATE OR REPLACE FUNCTION get_secure_file_url(bucket_name TEXT, file_path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://gemjqbxmfkclfgvscqbj.supabase.co/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- دالة لتنظيف أسماء الملفات
CREATE OR REPLACE FUNCTION clean_filename(filename TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(lower(trim(filename)), '[^a-z0-9._-]', '_', 'g');
END;
$$ LANGUAGE plpgsql;

-- التحقق من إنشاء Buckets
SELECT id, name, public, file_size_limit, created_at 
FROM storage.buckets 
ORDER BY created_at DESC;

-- ===================================================================
-- تعليمات التنفيذ:
-- ===================================================================
-- 1. افتح Supabase Dashboard
-- 2. اذهب إلى SQL Editor
-- 3. انسخ والصق الاستعلامات أعلاه
-- 4. نفذ كل استعلام على حدة أو كلها معاً
-- 5. تأكد من ظهور النتائج بنجاح
-- ===================================================================
