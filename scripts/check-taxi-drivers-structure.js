const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaxiDriversStructure() {
    console.log('🔍 فحص بنية جدول taxi_drivers بالتفصيل...');
    console.log('='.repeat(50));
    
    try {
        // محاولة إدراج سجل وهمي لمعرفة الأعمدة المطلوبة
        console.log('📋 محاولة الوصول للجدول...');
        
        const { data, error } = await supabase
            .from('taxi_drivers')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log(`❌ خطأ: ${error.message}`);
            return;
        }
        
        console.log('✅ تم الوصول للجدول بنجاح');
        
        // محاولة معرفة الأعمدة من خلال إدراج تجريبي
        console.log('\n🔍 اختبار الأعمدة المختلفة...');
        
        const testColumns = [
            'status',
            'driver_status', 
            'is_active',
            'availability_status',
            'online_status',
            'current_status'
        ];
        
        for (const column of testColumns) {
            try {
                const { data: testData, error: testError } = await supabase
                    .from('taxi_drivers')
                    .select(column)
                    .limit(1);
                
                if (!testError) {
                    console.log(`✅ العمود ${column}: موجود`);
                } else {
                    console.log(`❌ العمود ${column}: غير موجود`);
                }
            } catch (e) {
                console.log(`❌ العمود ${column}: خطأ في الاختبار`);
            }
        }
        
        // اختبار جدول taxi_requests أيضاً
        console.log('\n📋 فحص جدول taxi_requests...');
        
        const requestTestColumns = [
            'status',
            'request_status',
            'trip_status',
            'booking_status'
        ];
        
        for (const column of requestTestColumns) {
            try {
                const { data: testData, error: testError } = await supabase
                    .from('taxi_requests')
                    .select(column)
                    .limit(1);
                
                if (!testError) {
                    console.log(`✅ العمود ${column}: موجود`);
                } else {
                    console.log(`❌ العمود ${column}: غير موجود`);
                }
            } catch (e) {
                console.log(`❌ العمود ${column}: خطأ في الاختبار`);
            }
        }
        
        console.log('\n💡 توصية:');
        console.log('سنقوم بإزالة الفهارس والسياسات المتعلقة بالأعمدة غير الموجودة');
        
    } catch (error) {
        console.error('❌ خطأ في فحص الجدول:', error.message);
    }
}

checkTaxiDriversStructure();
