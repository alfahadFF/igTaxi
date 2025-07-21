const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
    console.log('🔍 فحص بنية الجداول...');
    console.log('==================================================');
    
    try {
        // فحص جدول vehicle_types
        console.log('📋 جدول vehicle_types:');
        const { data: vehicleTypes, error: vehicleError } = await supabase
            .from('vehicle_types')
            .select('*')
            .limit(3);
        
        if (vehicleError) {
            console.log(`❌ خطأ: ${vehicleError.message}`);
        } else {
            console.log('✅ البيانات الموجودة:');
            console.log(JSON.stringify(vehicleTypes, null, 2));
            
            if (vehicleTypes.length > 0) {
                console.log('\n📊 الأعمدة الموجودة:');
                Object.keys(vehicleTypes[0]).forEach(key => {
                    console.log(`   - ${key}`);
                });
            }
        }
        
        // فحص جدول taxi_drivers
        console.log('\n📋 جدول taxi_drivers:');
        const { data: taxiDrivers, error: driversError } = await supabase
            .from('taxi_drivers')
            .select('*')
            .limit(1);
        
        if (driversError) {
            console.log(`❌ خطأ: ${driversError.message}`);
        } else {
            console.log('✅ الجدول موجود ويعمل');
            if (taxiDrivers.length > 0) {
                console.log('\n📊 الأعمدة الموجودة:');
                Object.keys(taxiDrivers[0]).forEach(key => {
                    console.log(`   - ${key}`);
                });
            } else {
                console.log('📝 الجدول فارغ (لا توجد بيانات)');
            }
        }
        
        // فحص جدول taxi_requests
        console.log('\n📋 جدول taxi_requests:');
        const { data: taxiRequests, error: requestsError } = await supabase
            .from('taxi_requests')
            .select('*')
            .limit(1);
        
        if (requestsError) {
            console.log(`❌ خطأ: ${requestsError.message}`);
        } else {
            console.log('✅ الجدول موجود ويعمل');
            if (taxiRequests.length > 0) {
                console.log('\n📊 الأعمدة الموجودة:');
                Object.keys(taxiRequests[0]).forEach(key => {
                    console.log(`   - ${key}`);
                });
            } else {
                console.log('📝 الجدول فارغ (لا توجد بيانات)');
            }
        }
        
    } catch (error) {
        console.error('❌ خطأ في فحص الجداول:', error.message);
    }
}

checkTableStructure();
