const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ متغيرات البيئة غير متوفرة');
  console.log('SUPABASE_URL:', supabaseUrl ? 'موجود' : 'مفقود');
  console.log('SUPABASE_KEY:', supabaseKey ? 'موجود' : 'مفقود');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixDatabase() {
  console.log('🔍 فحص حالة قاعدة البيانات...');
  
  try {
    // محاولة الوصول للجدول
    const { data, error } = await supabase
      .from('main_profiles')
      .select('id, full_name, phone, email, type')
      .limit(1);
    
    if (error) {
      console.log('❌ خطأ في الوصول للجدول:', error.message);
      
      if (error.message.includes('relation "public.main_profiles" does not exist')) {
        console.log('📝 الجدول غير موجود، سننشئه...');
        await createMainProfilesTable();
      } else if (error.message.includes('column "type" does not exist')) {
        console.log('📝 عمود type مفقود، سنضيفه...');
        await addTypeColumn();
      } else {
        console.log('❌ خطأ غير متوقع:', error);
      }
    } else {
      console.log('✅ جدول main_profiles يعمل بشكل صحيح');
      console.log('📊 بيانات العينة:', data);
    }
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال:', error);
  }
}

async function createMainProfilesTable() {
  console.log('🔨 إنشاء جدول main_profiles...');
  
  const createTableQuery = `
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
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: createTableQuery });
    if (error) {
      console.log('❌ فشل في إنشاء الجدول:', error.message);
    } else {
      console.log('✅ تم إنشاء الجدول بنجاح');
      await setupTablePolicies();
    }
  } catch (error) {
    console.log('❌ خطأ في إنشاء الجدول:', error.message);
  }
}

async function addTypeColumn() {
  console.log('📝 إضافة عمود type...');
  
  const alterQuery = `
    ALTER TABLE public.main_profiles 
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'personal';
  `;
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: alterQuery });
    if (error) {
      console.log('❌ فشل في إضافة العمود:', error.message);
    } else {
      console.log('✅ تم إضافة عمود type بنجاح');
    }
  } catch (error) {
    console.log('❌ خطأ في إضافة العمود:', error.message);
  }
}

async function setupTablePolicies() {
  console.log('🔐 إعداد سياسات الأمان...');
  
  const policies = [
    'ALTER TABLE public.main_profiles ENABLE ROW LEVEL SECURITY;',
    'DROP POLICY IF EXISTS "main_profiles_select_policy" ON public.main_profiles;',
    'CREATE POLICY "main_profiles_select_policy" ON public.main_profiles FOR SELECT USING (true);',
    'DROP POLICY IF EXISTS "main_profiles_insert_policy" ON public.main_profiles;',
    'CREATE POLICY "main_profiles_insert_policy" ON public.main_profiles FOR INSERT WITH CHECK (auth.uid() = id);',
    'DROP POLICY IF EXISTS "main_profiles_update_policy" ON public.main_profiles;',
    'CREATE POLICY "main_profiles_update_policy" ON public.main_profiles FOR UPDATE USING (auth.uid() = id);'
  ];
  
  for (const policy of policies) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: policy });
      if (error && !error.message.includes('already exists')) {
        console.log('⚠️ تحذير في السياسة:', error.message);
      }
    } catch (error) {
      console.log('⚠️ خطأ في السياسة:', error.message);
    }
  }
  
  console.log('✅ تم إعداد السياسات');
}

// تشغيل الفحص
checkAndFixDatabase();
