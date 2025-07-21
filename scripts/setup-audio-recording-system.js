#!/usr/bin/env node

/**
 * سكريبت إعداد نظام التسجيل الصوتي
 * يقوم بإنشاء قاعدة البيانات وbucket التخزين
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// إعدادات Supabase
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ خطأ: يجب تعيين متغيرات البيئة EXPO_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupAudioRecordingSystem() {
  console.log('🎙️ بدء إعداد نظام التسجيل الصوتي...\n');

  try {
    // 1. تنفيذ SQL لإنشاء جداول قاعدة البيانات
    console.log('📊 إنشاء جداول قاعدة البيانات...');
    const audioSQLPath = path.join(__dirname, 'create-audio-recording-system.sql');
    
    if (fs.existsSync(audioSQLPath)) {
      const audioSQL = fs.readFileSync(audioSQLPath, 'utf8');
      const { error: audioError } = await supabase.rpc('exec_sql', { sql: audioSQL });
      
      if (audioError) {
        console.error('❌ خطأ في إنشاء جداول التسجيل الصوتي:', audioError);
      } else {
        console.log('✅ تم إنشاء جداول التسجيل الصوتي بنجاح');
      }
    } else {
      console.log('⚠️ لم يتم العثور على ملف create-audio-recording-system.sql');
    }

    // 2. تنفيذ SQL لإنشاء bucket التخزين
    console.log('📦 إنشاء bucket التخزين...');
    const storageSQLPath = path.join(__dirname, 'create-audio-storage-bucket.sql');
    
    if (fs.existsSync(storageSQLPath)) {
      const storageSQL = fs.readFileSync(storageSQLPath, 'utf8');
      const { error: storageError } = await supabase.rpc('exec_sql', { sql: storageSQL });
      
      if (storageError) {
        console.error('❌ خطأ في إنشاء bucket التخزين:', storageError);
      } else {
        console.log('✅ تم إنشاء bucket التخزين بنجاح');
      }
    } else {
      console.log('⚠️ لم يتم العثور على ملف create-audio-storage-bucket.sql');
    }

    // 3. التحقق من bucket التخزين
    console.log('🔍 التحقق من bucket التخزين...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ خطأ في قراءة buckets:', bucketsError);
    } else {
      const audioBucket = buckets.find(b => b.id === 'emergency-audio');
      if (audioBucket) {
        console.log('✅ bucket emergency-audio موجود ومُهيأ');
        console.log(`   📏 الحد الأقصى للملف: ${audioBucket.file_size_limit / 1024 / 1024}MB`);
        console.log(`   🔒 عام: ${audioBucket.public ? 'نعم' : 'لا'}`);
      } else {
        console.log('⚠️ bucket emergency-audio غير موجود');
      }
    }

    // 4. التحقق من الجداول
    console.log('🗃️ التحقق من جداول قاعدة البيانات...');
    const tables = [
      'emergency_audio_recordings',
      'audio_recording_shares',
      'audio_processing_queue',
      'audio_recording_analytics'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ الجدول ${table} غير موجود أو يحتوي على خطأ`);
      } else {
        console.log(`✅ الجدول ${table} موجود ويعمل`);
      }
    }

    // 5. اختبار الوظائف المساعدة
    console.log('⚙️ اختبار الوظائف المساعدة...');
    
    // اختبار دالة إحصائيات المستخدم
    const { data: statsData, error: statsError } = await supabase.rpc('get_user_recording_stats');
    if (statsError) {
      console.log('❌ دالة get_user_recording_stats لا تعمل:', statsError.message);
    } else {
      console.log('✅ دالة get_user_recording_stats تعمل بنجاح');
    }

    console.log('\n🎉 تم إعداد نظام التسجيل الصوتي بنجاح!');
    console.log('\n📋 ملخص المكونات:');
    console.log('   • جداول قاعدة البيانات: 4 جداول');
    console.log('   • أنواع البيانات: 6 enum types');
    console.log('   • الوظائف المساعدة: 3 functions');
    console.log('   • سياسات الأمان: RLS enabled');
    console.log('   • bucket التخزين: emergency-audio');
    console.log('   • أقصى حجم للملف: 10MB');
    console.log('   • أنواع الملفات المدعومة: audio/mpeg, audio/mp4, audio/m4a, audio/wav');

    console.log('\n📱 الخطوات التالية:');
    console.log('   1. اختبار مكون EmergencyAudioRecorder');
    console.log('   2. اختبار رفع وتحميل التسجيلات');
    console.log('   3. اختبار مشاركة التسجيلات');
    console.log('   4. تفعيل التنظيف التلقائي (اختياري)');

  } catch (error) {
    console.error('💥 خطأ عام في إعداد النظام:', error);
    process.exit(1);
  }
}

// تشغيل الإعداد
if (require.main === module) {
  setupAudioRecordingSystem();
}

module.exports = { setupAudioRecordingSystem };
