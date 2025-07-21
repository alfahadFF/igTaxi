const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestDataToSeeColumns() {
    console.log('🔍 محاولة إدراج بيانات تجريبية لمعرفة بنية الجداول...');
    console.log('='.repeat(60));
    
    try {
        // محاولة إدراج في taxi_drivers
        console.log('📋 اختبار جدول taxi_drivers...');
        
        const { data: driverData, error: driverError } = await supabase
            .from('taxi_drivers')
            .insert({
                // نضع فقط الحقول الأساسية المتوقعة
                license_number: 'TEST-123',
                vehicle_plate: 'ABC-123',
                is_active: true
            })
            .select();
        
        if (driverError) {
            console.log('❌ خطأ في إدراج taxi_drivers:');
            console.log(driverError.message);
            
            // استخراج الأعمدة المطلوبة من رسالة الخطأ
            if (driverError.message.includes('null value in column')) {
                const matches = driverError.message.match(/null value in column "([^"]+)"/);
                if (matches) {
                    console.log(`💡 العمود المطلوب: ${matches[1]}`);
                }
            }
        } else {
            console.log('✅ تم إدراج البيانات في taxi_drivers');
            console.log('الأعمدة الموجودة:', Object.keys(driverData[0]));
            
            // حذف البيانات التجريبية
            await supabase
                .from('taxi_drivers')
                .delete()
                .eq('license_number', 'TEST-123');
        }
        
        // محاولة إدراج في taxi_requests
        console.log('\n📋 اختبار جدول taxi_requests...');
        
        const { data: requestData, error: requestError } = await supabase
            .from('taxi_requests')
            .insert({
                pickup_latitude: 25.2048,
                pickup_longitude: 55.2708,
                pickup_address: 'Test Address'
            })
            .select();
        
        if (requestError) {
            console.log('❌ خطأ في إدراج taxi_requests:');
            console.log(requestError.message);
            
            // استخراج الأعمدة المطلوبة من رسالة الخطأ
            if (requestError.message.includes('null value in column')) {
                const matches = requestError.message.match(/null value in column "([^"]+)"/);
                if (matches) {
                    console.log(`💡 العمود المطلوب: ${matches[1]}`);
                }
            }
        } else {
            console.log('✅ تم إدراج البيانات في taxi_requests');
            console.log('الأعمدة الموجودة:', Object.keys(requestData[0]));
            
            // حذف البيانات التجريبية
            await supabase
                .from('taxi_requests')
                .delete()
                .eq('pickup_address', 'Test Address');
        }
        
    } catch (error) {
        console.error('❌ خطأ عام:', error.message);
    }
}

insertTestDataToSeeColumns();
