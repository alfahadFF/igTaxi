-- ============================================
-- إصلاح جدول main_profiles - تنفيذ مباشر في Supabase
-- ============================================

-- 1. حذف الجدول إذا كان موجوداً (اختياري - احذر!)
-- DROP TABLE IF EXISTS public.main_profiles CASCADE;

-- 2. إنشاء جدول main_profiles مع جميع الأعمدة
CREATE TABLE IF NOT EXISTS public.main_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone TEXT UNIQUE,
    email TEXT,
    type TEXT DEFAULT 'personal',
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. إضافة عمود type إذا لم يكن موجوداً (للجداول الموجودة)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.main_profiles ADD COLUMN type TEXT DEFAULT 'personal';
    END IF;
END $$;

-- 4. إضافة الأعمدة المفقودة الأخرى إذا لزم الأمر
DO $$ 
BEGIN 
    -- phone_verified
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' 
        AND column_name = 'phone_verified'
    ) THEN
        ALTER TABLE public.main_profiles ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- email_verified
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' 
        AND column_name = 'email_verified'
    ) THEN
        ALTER TABLE public.main_profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- avatar_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.main_profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'main_profiles' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.main_profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- 5. تفعيل Row Level Security
ALTER TABLE public.main_profiles ENABLE ROW LEVEL SECURITY;

-- 6. إنشاء السياسات
DROP POLICY IF EXISTS "main_profiles_select_policy" ON public.main_profiles;
CREATE POLICY "main_profiles_select_policy" ON public.main_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "main_profiles_insert_policy" ON public.main_profiles;
CREATE POLICY "main_profiles_insert_policy" ON public.main_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "main_profiles_update_policy" ON public.main_profiles;
CREATE POLICY "main_profiles_update_policy" ON public.main_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 7. إنشاء دالة التحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. إنشاء trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS handle_updated_at ON public.main_profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.main_profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 9. إنشاء دالة إنشاء profile تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.main_profiles (id, full_name, phone, email, type)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.phone,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'type', 'personal')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        type = EXCLUDED.type,
        updated_at = timezone('utc'::text, now());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. إنشاء trigger للمستخدمين الجدد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_main_profiles_phone ON public.main_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_main_profiles_email ON public.main_profiles(email);
CREATE INDEX IF NOT EXISTS idx_main_profiles_type ON public.main_profiles(type);

-- 12. فحص نهائي للتأكد من الجدول
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'main_profiles'
ORDER BY ordinal_position;
