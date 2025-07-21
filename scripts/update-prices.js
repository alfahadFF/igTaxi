const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateVehiclePrices() {
    console.log('💰 تحديث أسعار السيارات...');
    console.log('==================================================');
    
    try {
        // تحديث أسعار السيارات
        const priceUpdates = [
            { name_en: 'Economy Car', base_rate: 10.0 },
            { name_en: 'Comfort Car', base_rate: 15.0 },
            { name_en: 'Premium Car', base_rate: 25.0 },
            { name_en: 'Van', base_rate: 20.0 },
            { name_en: 'Electric Car', base_rate: 18.0 },
            { name_en: 'Motorcycle', base_rate: 8.0 }
        ];

        for (const update of priceUpdates) {
            console.log(`⚙️  تحديث سعر ${update.name_en} إلى ${update.base_rate} درهم...`);
            
            const { data, error } = await supabase
                .from('vehicle_types')
                .update({ base_rate: update.base_rate })
                .eq('name_en', update.name_en);
            
            if (error) {
                console.log(`❌ خطأ في تحديث ${update.name_en}: ${error.message}`);
            } else {
                console.log(`✅ تم تحديث ${update.name_en} بنجاح`);
            }
        }
        
        console.log('\n🔍 التحقق من النتائج...');
        
        // التحقق من النتائج
        const { data: vehicleTypes, error: fetchError } = await supabase
            .from('vehicle_types')
            .select('name_ar, name_en, base_rate');
        
        if (fetchError) {
            console.log(`❌ خطأ في جلب البيانات: ${fetchError.message}`);
        } else {
            console.log('\n✅ أسعار السيارات المحدثة:');
            vehicleTypes.forEach(vt => {
                console.log(`   - ${vt.name_ar} (${vt.name_en}): ${vt.base_rate} درهم`);
            });
        }
        
        console.log('\n==================================================');
        console.log('🎉 تم تحديث أسعار السيارات بنجاح!');
        
    } catch (error) {
        console.error('❌ خطأ في تحديث الأسعار:', error.message);
        process.exit(1);
    }
}

updateVehiclePrices();
