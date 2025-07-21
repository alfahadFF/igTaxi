CREATE TYPE blood_type AS ENUM (
  'A_POSITIVE', 'A_NEGATIVE',
  'B_POSITIVE', 'B_NEGATIVE',
  'O_POSITIVE', 'O_NEGATIVE',
  'AB_POSITIVE', 'AB_NEGATIVE'
);

CREATE TABLE personal_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id),
  user_name TEXT UNIQUE GENERATED ALWAYS AS (
    'IGT-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)
  ) STORED,
  avatar_url TEXT,
  blood_type blood_type,
  health_conditions TEXT[], -- مصفوفة للحالات الصحية
  health_notes TEXT,
  emergency_contacts JSONB DEFAULT '[]', -- جهات اتصال الطوارئ كـ JSON array
  saved_addresses JSONB DEFAULT '[]', -- العناوين المحفوظة كـ JSON array
  payment_methods JSONB DEFAULT '[]', -- طرق الدفع كـ JSON array
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء دالة لتحديث timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تحديث Triggers
DROP TRIGGER IF EXISTS set_timestamp ON personal_profiles;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON personal_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- إنشاء دالة لإنشاء سجل تلقائي في personal_profiles
CREATE OR REPLACE FUNCTION create_personal_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'personal' THEN
    INSERT INTO personal_profiles (id)
    VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة التريغر على جدول profiles
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_personal_profile();

-- Row Level Security
ALTER TABLE personal_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
ON personal_profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON personal_profiles FOR UPDATE
USING (auth.uid() = id);

-- تحديث RLS Policy للإدراج
CREATE POLICY "Enable insert for users with matching id" 
ON personal_profiles FOR INSERT 
WITH CHECK (auth.uid() = id);
