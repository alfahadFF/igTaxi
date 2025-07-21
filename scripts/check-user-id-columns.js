const { createClient } = require('@supabase/supabase-js');

// إعدادات قاعدة البيانات
const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserIdColumns() {
    console.log('🔍 فحص أعمدة user_id في الجداول...');
    console.log('='.repeat(50));
    
    const tables = ['taxi_drivers', 'taxi_requests'];
    const userIdColumns = ['user_id', 'customer_id', 'driver_id', 'profile_id'];
    
    for (const table of tables) {
        console.log(`\n📋 جدول ${table}:`);
        
        for (const column of userIdColumns) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select(column)
                    .limit(1);
                
                if (!error) {
                    console.log(`✅ ${column}: موجود`);
                } else {
                    console.log(`❌ ${column}: غير موجود`);
                }
            } catch (e) {
                console.log(`❌ ${column}: خطأ`);
            }
        }
    }
}

checkUserIdColumns();
