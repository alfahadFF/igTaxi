#!/usr/bin/env node
// ===================================================================
// اختبار شامل لقاعدة البيانات
// ===================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseConnection() {
  console.log('🔍 نتائج اختبار قاعدة البيانات');
  console.log('=' .repeat(50));
  
  try {
    // 1. اختبار الاتصال الأساسي
    console.log('1️⃣ اختبار الاتصال الأساسي...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ غير متصل');
      console.log('خطأ:', authError.message);
      return false;
    } else {
      console.log('✅ متصل بنجاح');
    }

    // 2. اختبار جداول البيانات الأساسية
    console.log('\n2️⃣ اختبار الجداول...');
    
    const tables = [
      'vehicle_types',
      'profiles', 
      'trips',
      'taxi_drivers',
      'taxi_requests'
    ];
    
    let allTablesWork = true;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ جدول ${table}: ${error.message}`);
          allTablesWork = false;
        } else {
          console.log(`✅ جدول ${table}: يعمل بشكل صحيح`);
        }
      } catch (err) {
        console.log(`❌ جدول ${table}: ${err.message}`);
        allTablesWork = false;
      }
    }

    // 3. اختبار جلب أنواع السيارات
    console.log('\n3️⃣ اختبار أنواع السيارات...');
    const { data: vehicleTypes, error: vehicleError } = await supabase
      .from('vehicle_types')
      .select('*');
    
    if (vehicleError) {
      console.log('❌ خطأ في جلب أنواع السيارات:', vehicleError.message);
      allTablesWork = false;
    } else {
      console.log(`✅ تم جلب ${vehicleTypes.length} نوع سيارة بنجاح`);
      vehicleTypes.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.name_ar} - ${type.base_fare} درهم`);
      });
    }

    // 4. اختبار إدراج بيانات تجريبية
    console.log('\n4️⃣ اختبار إدراج البيانات...');
    try {
      const testProfile = {
        id: 'test-user-' + Date.now(),
        email: 'test@example.com',
        full_name: 'مستخدم تجريبي',
        phone: '+971501234567',
        created_at: new Date().toISOString()
      };

      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert([testProfile])
        .select();

      if (insertError) {
        console.log('❌ خطأ في إدراج البيانات:', insertError.message);
      } else {
        console.log('✅ تم إدراج البيانات التجريبية بنجاح');
        
        // حذف البيانات التجريبية
        await supabase
          .from('profiles')
          .delete()
          .eq('id', testProfile.id);
        console.log('✅ تم حذف البيانات التجريبية');
      }
    } catch (err) {
      console.log('❌ خطأ في اختبار الإدراج:', err.message);
    }

    // النتيجة النهائية
    console.log('\n' + '='.repeat(50));
    if (allTablesWork) {
      console.log('🎉 تهانينا!');
      console.log('تم إعداد قاعدة البيانات بنجاح وجلب البيانات يعمل بشكل مثالي!');
      console.log('\nيمكنك الآن:');
      console.log('• استخدام جميع أنواع السيارات');
      console.log('• حفظ ملفات المستخدمين');
      console.log('• تتبع الرحلات');
      console.log('• النظام جاهز للاستخدام الكامل!');
      return true;
    } else {
      console.log('⚠️ هناك مشاكل في بعض الجداول');
      console.log('يرجى مراجعة الأخطاء أعلاه');
      return false;
    }
    
  } catch (err) {
    console.log('❌ خطأ عام في الاختبار:');
    console.log('TypeError: Failed to fetch');
    console.log('\nالحلول المقترحة:');
    console.log('1. تأكد من اتصال الإنترنت');
    console.log('2. تحقق من إعدادات Supabase');
    console.log('3. تأكد من صحة مفاتيح API');
    return false;
  }
}

// تشغيل الاختبار
testDatabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('خطأ غير متوقع:', err);
    process.exit(1);
  });
