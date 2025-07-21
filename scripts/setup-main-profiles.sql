-- إنشاء جدول main_profiles إذا لم يكن موجوداً

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

-- تفعيل Row Level Security
ALTER TABLE public.main_profiles ENABLE ROW LEVEL SECURITY;

-- إنشاء السياسات
DROP POLICY IF EXISTS "main_profiles_select_policy" ON public.main_profiles;
CREATE POLICY "main_profiles_select_policy" ON public.main_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "main_profiles_insert_policy" ON public.main_profiles;
CREATE POLICY "main_profiles_insert_policy" ON public.main_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "main_profiles_update_policy" ON public.main_profiles;
CREATE POLICY "main_profiles_update_policy" ON public.main_profiles
    FOR UPDATE USING (auth.uid() = id);

-- إنشاء دالة التحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger للتحديث التلقائي
DROP TRIGGER IF EXISTS handle_updated_at ON public.main_profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.main_profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- إنشاء دالة إنشاء profile تلقائياً عند التسجيل
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

-- إنشاء trigger للمستخدمين الجدد
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- إنشاء فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_main_profiles_phone ON public.main_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_main_profiles_email ON public.main_profiles(email);
CREATE INDEX IF NOT EXISTS idx_main_profiles_type ON public.main_profiles(type);
