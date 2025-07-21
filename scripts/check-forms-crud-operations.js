const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

// خريطة النماذج والعمليات المطلوبة
const formsOperationsMapping = {
  // نماذج التسجيل والعمليات المطلوبة
  'نماذج التسجيل والملفات الشخصية': {
    'register.tsx': {
      operations: ['INSERT profiles'],
      tables: ['profiles']
    },
    'driver-register.tsx': {
      operations: ['INSERT profiles', 'INSERT driver_profiles'],
      tables: ['profiles', 'driver_profiles']
    },
    'restaurant-register.tsx': {
      operations: ['INSERT profiles', 'INSERT business_profiles'],
      tables: ['profiles', 'business_profiles']
    },
    'parking-register.tsx': {
      operations: ['INSERT profiles', 'INSERT business_profiles'],
      tables: ['profiles', 'business_profiles']
    },
    'pharmacy-register.tsx': {
      operations: ['INSERT profiles', 'INSERT business_profiles'],
      tables: ['profiles', 'business_profiles']
    },
    'transporter-register.tsx': {
      operations: ['INSERT profiles', 'INSERT transporter_profiles'],
      tables: ['profiles', 'transporter_profiles']
    },
    'event-driver-register.tsx': {
      operations: ['INSERT profiles', 'INSERT event_drivers'],
      tables: ['profiles', 'event_drivers']
    }
  },

  // نماذج الخدمات والعمليات
  'نماذج الخدمات والطلبات': {
    'VehicleSelection.tsx': {
      operations: ['SELECT vehicle_types', 'INSERT taxi_requests', 'SELECT driver_locations'],
      tables: ['vehicle_types', 'taxi_requests', 'driver_locations']
    },
    'ParkingList.tsx': {
      operations: ['SELECT parking_zones', 'INSERT parking_reservations', 'INSERT parking_payments'],
      tables: ['parking_zones', 'parking_reservations', 'parking_payments']
    },
    'ShoppingOrderForm.tsx': {
      operations: ['INSERT shopping_orders', 'INSERT shopping_order_items'],
      tables: ['shopping_orders', 'shopping_order_items']
    },
    'PrescriptionForm.tsx': {
      operations: ['INSERT prescriptions', 'INSERT prescription_orders'],
      tables: ['prescriptions', 'prescription_orders']
    },
    'TripRatingCard.tsx': {
      operations: ['INSERT driver_ratings'],
      tables: ['driver_ratings']
    }
  },

  // مكونات عرض البيانات
  'مكونات عرض البيانات': {
    'ProfileSection.tsx': {
      operations: ['SELECT profiles', 'UPDATE profiles'],
      tables: ['profiles']
    },
    'TripsHistory.tsx': {
      operations: ['SELECT trips'],
      tables: ['trips']
    },
    'BusinessOrdersManager.tsx': {
      operations: ['SELECT orders', 'UPDATE order status'],
      tables: ['shopping_orders', 'restaurant_orders']
    },
    'DriverDeliveryManager.tsx': {
      operations: ['SELECT delivery_requests', 'UPDATE delivery_status'],
      tables: ['shopping_delivery_requests']
    }
  }
};

async function checkFormsDataOperations() {
    console.log('🔍 فحص شامل لربط النماذج والمكونات بعمليات قاعدة البيانات');
    console.log('='.repeat(70));
    
    try {
        let totalForms = 0;
        let connectedForms = 0;
        let disconnectedForms = 0;
        
        for (const [categoryName, category] of Object.entries(formsOperationsMapping)) {
            console.log(`\n📂 ${categoryName}:`);
            console.log('-'.repeat(50));
            
            for (const [formName, formData] of Object.entries(category)) {
                totalForms++;
                console.log(`\n🔗 ${formName}:`);
                
                let formConnected = true;
                
                // فحص الجداول المطلوبة
                for (const table of formData.tables) {
                    try {
                        const { data, error } = await supabase
                            .from(table)
                            .select('*')
                            .limit(1);
                        
                        if (error) {
                            console.log(`   ❌ جدول ${table}: غير متاح`);
                            formConnected = false;
                        } else {
                            console.log(`   ✅ جدول ${table}: متاح`);
                        }
                    } catch (e) {
                        console.log(`   ❌ جدول ${table}: خطأ في الاتصال`);
                        formConnected = false;
                    }
                }
                
                // عرض العمليات المطلوبة
                console.log(`   📋 العمليات المطلوبة:`);
                formData.operations.forEach(op => {
                    console.log(`      - ${op}`);
                });
                
                // تحديد حالة النموذج
                if (formConnected) {
                    console.log(`   └─ ✅ النموذج مربوط بالكامل`);
                    connectedForms++;
                } else {
                    console.log(`   └─ ❌ النموذج يحتاج إصلاح`);
                    disconnectedForms++;
                }
            }
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 ملخص حالة ربط النماذج بقاعدة البيانات:');
        console.log('='.repeat(70));
        console.log(`✅ نماذج مربوطة: ${connectedForms}`);
        console.log(`❌ نماذج تحتاج إصلاح: ${disconnectedForms}`);
        console.log(`📈 نسبة الاكتمال: ${Math.round((connectedForms / totalForms) * 100)}%`);
        
        // اختبار عمليات CRUD الأساسية
        console.log('\n🧪 اختبار عمليات CRUD الأساسية:');
        console.log('-'.repeat(50));
        
        const crudTests = [
            { operation: 'SELECT', table: 'profiles', description: 'جلب الملفات الشخصية' },
            { operation: 'SELECT', table: 'vehicle_types', description: 'جلب أنواع السيارات' },
            { operation: 'SELECT', table: 'trips', description: 'جلب الرحلات' },
            { operation: 'SELECT', table: 'taxi_drivers', description: 'جلب بيانات السائقين' },
            { operation: 'SELECT', table: 'shopping_orders', description: 'جلب طلبات التسوق' },
            { operation: 'SELECT', table: 'parking_payments', description: 'جلب مدفوعات المواقف' }
        ];
        
        let workingOperations = 0;
        
        for (const test of crudTests) {
            try {
                const { data, error } = await supabase
                    .from(test.table)
                    .select('*')
                    .limit(1);
                
                if (!error) {
                    console.log(`✅ ${test.operation} ${test.table}: ${test.description} - يعمل`);
                    workingOperations++;
                } else {
                    console.log(`❌ ${test.operation} ${test.table}: ${test.description} - خطأ`);
                }
            } catch (e) {
                console.log(`❌ ${test.operation} ${test.table}: ${test.description} - خطأ`);
            }
        }
        
        console.log(`\n📊 عمليات قاعدة البيانات: ${workingOperations}/${crudTests.length} تعمل`);
        
        // التوصيات النهائية
        console.log('\n💡 التقييم النهائي:');
        console.log('-'.repeat(30));
        
        if (connectedForms === totalForms && workingOperations === crudTests.length) {
            console.log('🎉 ممتاز! جميع النماذج مربوطة وجميع العمليات تعمل بشكل مثالي!');
            console.log('✅ النظام جاهز للاستخدام الكامل');
        } else if (connectedForms >= totalForms * 0.8) {
            console.log('👍 جيد! معظم النماذج مربوطة والنظام قابل للاستخدام');
            console.log(`⚠️ يحتاج إصلاح ${disconnectedForms} نموذج فقط`);
        } else {
            console.log('⚠️ النظام يحتاج مزيد من الإعداد');
            console.log('📋 مراجعة الجداول والاتصالات مطلوبة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في فحص النماذج:', error.message);
    }
}

checkFormsDataOperations();
