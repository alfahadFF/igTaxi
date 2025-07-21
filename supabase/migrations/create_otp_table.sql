# إنشاء جدول رموز OTP في قاعدة البيانات

# قم بتشغيل هذا في Supabase SQL Editor

-- إنشاء جدول رموز OTP
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرسة للبحث السريع
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON public.otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON public.otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON public.otp_codes(used);

-- تفعيل RLS
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان (السماح بالقراءة والكتابة لجميع المستخدمين لأغراض OTP)
CREATE POLICY "Allow OTP operations" ON public.otp_codes
    FOR ALL USING (true);

-- تنظيف الرموز المنتهية الصلاحية (تشغيل كل ساعة)
CREATE OR REPLACE FUNCTION clean_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM public.otp_codes 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- إنشاء extension لجدولة المهام (اختياري)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('clean-expired-otps', '0 * * * *', 'SELECT clean_expired_otps();');
