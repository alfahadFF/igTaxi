#!/usr/bin/env node
// ===================================================================
// Create Tables using Supabase Client
// ===================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndTestTables() {
  console.log('🔍 Checking database tables...');

  try {
    // Test if vehicle_types table exists and has data
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicle_types')
      .select('*')
      .limit(5);

    if (vehicleError) {
      console.log('❌ vehicle_types table issue:', vehicleError.message);
      console.log('📝 Please run the SQL script in Supabase SQL Editor:');
      console.log('   File: scripts/create-minimal-tables.sql');
      return;
    }

    console.log(`✅ vehicle_types table exists with ${vehicles.length} records`);
    
    if (vehicles.length > 0) {
      console.log('📋 Sample vehicle types:');
      vehicles.forEach((v, i) => {
        console.log(`   ${i + 1}. ${v.name_ar} (${v.name}) - ${v.base_fare} AED`);
      });
    }

    // Test if profiles table exists
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (profileError) {
      console.log('❌ profiles table issue:', profileError.message);
    } else {
      console.log(`✅ profiles table exists with ${profiles.length || 0} records`);
    }

    console.log('\n🎉 Database is ready for use!');
    console.log('Next step: npm start');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkAndTestTables();
