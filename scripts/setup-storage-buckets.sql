-- إنشاء Buckets لحفظ الصور والملفات في Supabase Storage

-- =================================================================
-- 1. إنشاء Buckets الأساسية
-- =================================================================

-- bucket للوثائق الخاصة بالسائقين
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'driver_documents',
  'driver_documents', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- bucket للوصفات الطبية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'prescriptions',
  'prescriptions',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- bucket للصور الشخصية العامة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'profile_photos',
  'profile_photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- bucket لصور المطاعم والأعمال
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'business_photos',
  'business_photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- bucket لصور المنتجات (طعام، صيدلية، تسوق)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'product_images',
  'product_images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- bucket لصور السيارات والمركبات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'vehicle_photos',
  'vehicle_photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- bucket لملفات النظام والتطبيق
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
(
  'system_files',
  'system_files',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =================================================================
-- 2. إعداد السياسات (Policies) للأمان
-- =================================================================

-- سياسة للسماح برفع الملفات للمستخدمين المسجلين
CREATE POLICY "Users can upload driver documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'driver_documents' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view driver documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'driver_documents'
);

CREATE POLICY "Users can update their own driver documents" ON storage.objects FOR UPDATE USING (
  bucket_id = 'driver_documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- سياسة للوصفات الطبية
CREATE POLICY "Users can upload prescriptions" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'prescriptions' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can view prescriptions" ON storage.objects FOR SELECT USING (
  bucket_id = 'prescriptions'
);

-- سياسة للصور الشخصية
CREATE POLICY "Users can upload profile photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profile_photos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view profile photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'profile_photos'
);

-- سياسة لصور الأعمال
CREATE POLICY "Business users can upload photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'business_photos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view business photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'business_photos'
);

-- سياسة لصور المنتجات
CREATE POLICY "Users can upload product images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'product_images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (
  bucket_id = 'product_images'
);

-- سياسة لصور السيارات
CREATE POLICY "Users can upload vehicle photos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'vehicle_photos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view vehicle photos" ON storage.objects FOR SELECT USING (
  bucket_id = 'vehicle_photos'
);

-- سياسة لملفات النظام
CREATE POLICY "Admins can upload system files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'system_files' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Anyone can view system files" ON storage.objects FOR SELECT USING (
  bucket_id = 'system_files'
);

-- =================================================================
-- 3. إنشاء دوال مساعدة لإدارة الملفات
-- =================================================================

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
  -- إزالة المسافات والأحرف الخاصة
  RETURN regexp_replace(
    lower(trim(filename)), 
    '[^a-z0-9._-]', 
    '_', 
    'g'
  );
END;
$$ LANGUAGE plpgsql;

-- دالة للتحقق من صحة نوع الملف
CREATE OR REPLACE FUNCTION validate_file_type(filename TEXT, allowed_types TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  file_extension TEXT;
BEGIN
  file_extension := lower(split_part(filename, '.', -1));
  RETURN file_extension = ANY(allowed_types);
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 4. إنشاء مجلدات افتراضية
-- =================================================================

-- سيتم إنشاء هذه المجلدات عند أول رفع ملف
-- driver_documents/profile_photos/
-- driver_documents/driving_licenses/
-- driver_documents/identity_cards/
-- driver_documents/vehicle_registration/
-- prescriptions/uploads/
-- profile_photos/users/
-- business_photos/restaurants/
-- business_photos/cafes/
-- business_photos/pharmacies/
-- product_images/food/
-- product_images/pharmacy/
-- vehicle_photos/taxis/
-- vehicle_photos/transporters/

COMMIT;
