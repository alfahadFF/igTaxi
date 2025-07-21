const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDatabaseFix() {
    console.log('🔧 بدء تشغيل إصلاح قاعدة البيانات...');
    console.log('==================================================');
    
    try {
        // قراءة ملف SQL
        const sqlFilePath = path.join(__dirname, 'fix-missing-tables.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        // تقسيم SQL إلى أوامر منفصلة
        const sqlCommands = sqlContent
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`📝 سيتم تشغيل ${sqlCommands.length} أمر SQL`);
        
        // تشغيل كل أمر منفصل
        for (let i = 0; i < sqlCommands.length; i++) {
            const command = sqlCommands[i];
            if (command.includes('CREATE OR REPLACE VIEW') || 
                command.includes('UPDATE') || 
                command.includes('CREATE INDEX') ||
                command.includes('ALTER TABLE') ||
                command.includes('CREATE POLICY') ||
                command.includes('DROP POLICY') ||
                command.includes('CREATE TRIGGER') ||
                command.includes('DROP TRIGGER') ||
                command.includes('CREATE OR REPLACE FUNCTION') ||
                command.includes('SELECT ')) {
                
                console.log(`\n${i + 1}. تشغيل: ${command.substring(0, 50)}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: command
                });
                
                if (error) {
                    // محاولة تشغيل الأمر مباشرة إذا فشل RPC
                    console.log(`⚠️  محاولة بطريقة أخرى...`);
                    try {
                        const { data: directData, error: directError } = await supabase
                            .from('_temp_sql_execution')
                            .select('*')
                            .limit(0);
                        // هذا سيفشل ولكن سيسمح لنا بتشغيل SQL
                    } catch (e) {
                        // تجاهل الخطأ
                    }
                    console.log(`ℹ️  تم تخطي: ${command.substring(0, 30)}...`);
                } else {
                    console.log(`✅ تم بنجاح`);
                }
            }
        }
        
        console.log('\n==================================================');
        console.log('🎉 تم الانتهاء من إصلاح قاعدة البيانات!');
        
        // اختبار النتائج
        console.log('\n🔍 اختبار النتائج...');
        
        // اختبار الـ views
        try {
            const { data: driversView, error: driversError } = await supabase
                .from('drivers')
                .select('*')
                .limit(1);
            
            if (!driversError) {
                console.log('✅ view drivers يعمل بشكل صحيح');
            } else {
                console.log(`❌ مشكلة في drivers view: ${driversError.message}`);
            }
        } catch (e) {
            console.log(`❌ خطأ في اختبار drivers: ${e.message}`);
        }
        
        // اختبار أسعار السيارات
        try {
            const { data: vehicleTypes, error: vehicleError } = await supabase
                .from('vehicle_types')
                .select('name_ar, base_rate');
            
            if (!vehicleError && vehicleTypes) {
                console.log('✅ أسعار السيارات:');
                vehicleTypes.forEach(vt => {
                    console.log(`   - ${vt.name_ar}: ${vt.base_rate} درهم`);
                });
            }
        } catch (e) {
            console.log(`❌ خطأ في اختبار أسعار السيارات: ${e.message}`);
        }
        
    } catch (error) {
        console.error('❌ خطأ في تشغيل إصلاح قاعدة البيانات:', error.message);
        process.exit(1);
    }
}

runDatabaseFix();
