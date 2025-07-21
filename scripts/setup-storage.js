const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

// تعريف Buckets المطلوبة
const requiredBuckets = [
  {
    id: 'driver_documents',
    name: 'driver_documents',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
  },
  {
    id: 'prescriptions',
    name: 'prescriptions',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  {
    id: 'profile_photos',
    name: 'profile_photos',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  {
    id: 'business_photos',
    name: 'business_photos',
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  {
    id: 'product_images',
    name: 'product_images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'vehicle_photos',
    name: 'vehicle_photos',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
  },
  {
    id: 'system_files',
    name: 'system_files',
    public: true,
    fileSizeLimit: 20971520, // 20MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
  }
];

async function setupStorageBuckets() {
  console.log('🗂️  إعداد Storage Buckets لحفظ الصور والملفات');
  console.log('='.repeat(60));

  try {
    // 1. فحص Buckets الموجودة
    console.log('\n📋 فحص Buckets الموجودة...');
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ خطأ في جلب قائمة Buckets:', listError.message);
      return;
    }

    const existingBucketIds = existingBuckets.map(b => b.id);
    console.log(`✅ تم العثور على ${existingBuckets.length} bucket موجود:`, existingBucketIds);

    // 2. إنشاء Buckets المفقودة
    console.log('\n🏗️  إنشاء Buckets المفقودة...');
    
    let createdCount = 0;
    let existingCount = 0;

    for (const bucketConfig of requiredBuckets) {
      if (existingBucketIds.includes(bucketConfig.id)) {
        console.log(`   ✅ ${bucketConfig.id}: موجود مسبقاً`);
        existingCount++;
        continue;
      }

      // إنشاء bucket جديد
      const { data, error } = await supabase.storage.createBucket(bucketConfig.id, {
        public: bucketConfig.public,
        fileSizeLimit: bucketConfig.fileSizeLimit,
        allowedMimeTypes: bucketConfig.allowedMimeTypes
      });

      if (error) {
        console.log(`   ❌ ${bucketConfig.id}: فشل الإنشاء - ${error.message}`);
      } else {
        console.log(`   ✅ ${bucketConfig.id}: تم الإنشاء بنجاح`);
        createdCount++;
      }
    }

    // 3. فحص الحالة النهائية
    console.log('\n📊 ملخص Storage Setup:');
    console.log('-'.repeat(30));
    console.log(`✅ Buckets موجودة مسبقاً: ${existingCount}`);
    console.log(`🆕 Buckets تم إنشاؤها: ${createdCount}`);
    console.log(`📈 إجمالي Buckets مطلوبة: ${requiredBuckets.length}`);

    // 4. اختبار رفع ملف تجريبي
    console.log('\n🧪 اختبار رفع الملفات...');
    await testFileUpload();

    // 5. عرض تفاصيل الاستخدام
    console.log('\n📚 دليل استخدام Storage:');
    console.log('-'.repeat(40));
    console.log('🔗 driver_documents: وثائق السائقين (رخص، هوية، صور شخصية)');
    console.log('💊 prescriptions: صور الوصفات الطبية');
    console.log('👤 profile_photos: الصور الشخصية للمستخدمين');
    console.log('🏢 business_photos: صور المطاعم والأعمال');
    console.log('📦 product_images: صور المنتجات (طعام، أدوية)');
    console.log('🚗 vehicle_photos: صور السيارات والمركبات');
    console.log('⚙️ system_files: ملفات النظام العامة');

    console.log('\n🎉 تم إعداد Storage بنجاح! يمكن الآن رفع الصور والملفات.');

  } catch (error) {
    console.error('❌ خطأ في إعداد Storage:', error.message);
  }
}

async function testFileUpload() {
  try {
    // إنشاء ملف تجريبي صغير
    const testContent = 'IGTaxi Storage Test File';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    
    // اختبار رفع في bucket النظام
    const testFileName = `test_${Date.now()}.txt`;
    const { data, error } = await supabase.storage
      .from('system_files')
      .upload(`tests/${testFileName}`, testBlob);

    if (error) {
      console.log(`   ❌ اختبار الرفع: فشل - ${error.message}`);
    } else {
      console.log(`   ✅ اختبار الرفع: نجح - ${testFileName}`);
      
      // الحصول على URL عام
      const { data: urlData } = supabase.storage
        .from('system_files')
        .getPublicUrl(`tests/${testFileName}`);
      
      console.log(`   🔗 URL: ${urlData.publicUrl}`);
      
      // حذف الملف التجريبي
      await supabase.storage
        .from('system_files')
        .remove([`tests/${testFileName}`]);
    }
  } catch (error) {
    console.log(`   ❌ اختبار الرفع: خطأ - ${error.message}`);
  }
}

// تشغيل الإعداد
setupStorageBuckets();
