const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

// قائمة النماذج والجداول المتوقعة
const formTableMapping = {
  // نماذج التسجيل والجداول المرتبطة بها
  'نماذج التسجيل': {
    'driver-register.tsx': ['profiles', 'driver_profiles'],
    'restaurant-register.tsx': ['profiles', 'business_profiles', 'restaurant_menu_categories', 'restaurant_menu_items'],
    'parking-register.tsx': ['profiles', 'business_profiles', 'parking_zones', 'parking_spaces'],
    'fuel-station-register.tsx': ['profiles', 'business_profiles', 'fuel_station_services', 'fuel_station_pumps'],
    'pharmacy-register.tsx': ['profiles', 'business_profiles', 'pharmacies'],
    'shopping-register.tsx': ['profiles', 'business_profiles'],
    'cafe-register.tsx': ['profiles', 'business_profiles', 'menu_categories', 'menu_items'],
    'transporter-register.tsx': ['profiles', 'transporter_profiles'],
    'event-driver-register.tsx': ['profiles', 'event_drivers', 'event_driver_availability'],
    'business-register.tsx': ['profiles', 'business_profiles']
  },
  
  // نماذج الخدمات والجداول المرتبطة بها
  'نماذج الخدمات': {
    'VehicleSelection.tsx': ['taxi_requests', 'driver_locations', 'driver_notifications'],
    'ParkingList.tsx': ['parking_reservations', 'parking_payments'],
    'PharmacyList.tsx': ['prescription_orders', 'prescription_items'],
    'ShoppingOrderForm.tsx': ['shopping_orders', 'shopping_order_items', 'shopping_delivery_requests'],
    'TripRatingCard.tsx': ['driver_ratings'],
    'PrescriptionForm.tsx': ['prescriptions', 'prescription_orders']
  },
  
  // جداول أساسية مشتركة
  'جداول أساسية': {
    'shared-tables': ['profiles', 'vehicle_types', 'trips', 'taxi_drivers', 'taxi_requests']
  }
};

async function checkFormTableMapping() {
    console.log('🔍 فحص ربط النماذج بجداول قاعدة البيانات');
    console.log('='.repeat(60));
    
    try {
        // جمع كل الجداول المطلوبة
        const allRequiredTables = new Set();
        
        Object.values(formTableMapping).forEach(category => {
            Object.values(category).forEach(tables => {
                if (Array.isArray(tables)) {
                    tables.forEach(table => allRequiredTables.add(table));
                }
            });
        });
        
        console.log(`📊 إجمالي الجداول المطلوبة: ${allRequiredTables.size}`);
        console.log('');
        
        // فحص كل جدول
        const tableStatus = {};
        const existingTables = [];
        const missingTables = [];
        
        for (const table of allRequiredTables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    if (error.message.includes('does not exist') || error.message.includes('relation')) {
                        tableStatus[table] = '❌ غير موجود';
                        missingTables.push(table);
                        console.log(`❌ ${table}: غير موجود`);
                    } else {
                        tableStatus[table] = `⚠️ خطأ: ${error.message}`;
                        console.log(`⚠️ ${table}: ${error.message}`);
                    }
                } else {
                    tableStatus[table] = '✅ موجود';
                    existingTables.push(table);
                    console.log(`✅ ${table}: موجود ويعمل`);
                }
            } catch (e) {
                tableStatus[table] = `❌ خطأ: ${e.message}`;
                missingTables.push(table);
                console.log(`❌ ${table}: خطأ في الاتصال`);
            }
        }
        
        console.log('');
        console.log('📋 تفصيل ربط النماذج بالجداول:');
        console.log('='.repeat(60));
        
        Object.entries(formTableMapping).forEach(([categoryName, category]) => {
            console.log(`\n📂 ${categoryName}:`);
            console.log('-'.repeat(40));
            
            Object.entries(category).forEach(([formName, tables]) => {
                console.log(`\n🔗 ${formName}:`);
                
                if (Array.isArray(tables)) {
                    tables.forEach(table => {
                        const status = tableStatus[table] || '❓ غير محدد';
                        console.log(`   ${status} ${table}`);
                    });
                    
                    // تحقق من اكتمال النموذج
                    const allTablesExist = tables.every(table => tableStatus[table] === '✅ موجود');
                    const formStatus = allTablesExist ? '✅ مكتمل' : '⚠️ ناقص';
                    console.log(`   └─ حالة النموذج: ${formStatus}`);
                }
            });
        });
        
        console.log('');
        console.log('📊 الملخص النهائي:');
        console.log('='.repeat(60));
        console.log(`✅ جداول موجودة: ${existingTables.length}`);
        console.log(`❌ جداول مفقودة: ${missingTables.length}`);
        console.log(`📈 نسبة الاكتمال: ${Math.round((existingTables.length / allRequiredTables.size) * 100)}%`);
        
        if (missingTables.length > 0) {
            console.log('\n⚠️ الجداول المفقودة:');
            missingTables.forEach(table => {
                console.log(`   - ${table}`);
            });
        }
        
        console.log('');
        if (existingTables.length >= allRequiredTables.size * 0.8) {
            console.log('🎉 معظم الجداول موجودة! النظام جاهز للاستخدام');
        } else {
            console.log('⚠️ عدد كبير من الجداول مفقود. تحقق من migrations');
        }
        
        // فحص سريع للجداول الأساسية فقط
        console.log('\n🔍 فحص سريع للجداول الأساسية:');
        console.log('-'.repeat(40));
        
        const coreTables = ['profiles', 'vehicle_types', 'trips', 'taxi_drivers', 'taxi_requests'];
        let coreTablesWorking = 0;
        
        for (const table of coreTables) {
            if (tableStatus[table] === '✅ موجود') {
                coreTablesWorking++;
                console.log(`✅ ${table}`);
            } else {
                console.log(`❌ ${table}`);
            }
        }
        
        console.log(`\n📊 الجداول الأساسية: ${coreTablesWorking}/${coreTables.length} تعمل`);
        
        if (coreTablesWorking === coreTables.length) {
            console.log('🎯 جميع الجداول الأساسية تعمل - النظام جاهز للاستخدام الأساسي!');
        } else {
            console.log('⚠️ بعض الجداول الأساسية مفقودة - النظام يحتاج إعداد إضافي');
        }
        
    } catch (error) {
        console.error('❌ خطأ في فحص ربط النماذج:', error.message);
        process.exit(1);
    }
}

checkFormTableMapping();
