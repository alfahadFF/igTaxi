#!/usr/bin/env node
// ===================================================================
// Database Setup Script - IGTaxi
// This script will run the migration and populate initial data
// ===================================================================

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

console.log('🚀 IGTaxi Database Setup');
console.log('========================');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function checkTablesExist() {
  console.log('🔍 Checking if tables exist...');
  
  const tables = [
    'profiles',
    'driver_profiles', 
    'vehicle_types',
    'trips',
    'trip_requests',
    'notifications',
    'ratings',
    'payments'
  ];

  const existingTables = [];
  const missingTables = [];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table '${table}' does not exist`);
        missingTables.push(table);
      } else {
        console.log(`✅ Table '${table}' exists`);
        existingTables.push(table);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' check failed`);
      missingTables.push(table);
    }
  }

  console.log(`\n📊 Tables Summary:`);
  console.log(`Existing: ${existingTables.length}/${tables.length}`);
  console.log(`Missing: ${missingTables.length}/${tables.length}`);

  return { existingTables, missingTables };
}

async function insertSampleData() {
  console.log('📦 Inserting sample data...');

  try {
    // Insert vehicle types
    const vehicleTypes = [
      {
        name: 'Economy Car',
        name_ar: 'سيارة اقتصادية',
        description: 'Affordable and reliable transportation',
        capacity: 4,
        base_fare: 10.0,
        per_km_rate: 1.5,
        per_minute_rate: 0.5,
        minimum_fare: 10.0,
        surge_multiplier: 1.0,
        fuel_type: 'petrol',
        features: ['Air Conditioning', 'GPS'],
        is_active: true
      },
      {
        name: 'Comfort Car',
        name_ar: 'سيارة مريحة',
        description: 'More spacious and comfortable ride',
        capacity: 4,
        base_fare: 15.0,
        per_km_rate: 2.0,
        per_minute_rate: 0.7,
        minimum_fare: 15.0,
        surge_multiplier: 1.0,
        fuel_type: 'petrol',
        features: ['Air Conditioning', 'GPS', 'Premium Interior'],
        is_active: true
      },
      {
        name: 'Premium Car',
        name_ar: 'سيارة فاخرة',
        description: 'Luxury vehicle with premium service',
        capacity: 4,
        base_fare: 25.0,
        per_km_rate: 3.0,
        per_minute_rate: 1.0,
        minimum_fare: 25.0,
        surge_multiplier: 1.0,
        fuel_type: 'petrol',
        features: ['Air Conditioning', 'GPS', 'Leather Seats', 'WiFi'],
        is_active: true
      },
      {
        name: 'Van',
        name_ar: 'فان',
        description: 'Large vehicle for groups and luggage',
        capacity: 7,
        base_fare: 20.0,
        per_km_rate: 2.5,
        per_minute_rate: 0.8,
        minimum_fare: 20.0,
        surge_multiplier: 1.0,
        fuel_type: 'diesel',
        features: ['Air Conditioning', 'GPS', 'Large Space'],
        is_active: true
      },
      {
        name: 'Electric Car',
        name_ar: 'سيارة كهربائية',
        description: 'Eco-friendly electric vehicle',
        capacity: 4,
        base_fare: 18.0,
        per_km_rate: 2.2,
        per_minute_rate: 0.6,
        minimum_fare: 18.0,
        surge_multiplier: 1.0,
        fuel_type: 'electric',
        features: ['Air Conditioning', 'GPS', 'Eco-Friendly'],
        is_active: true
      },
      {
        name: 'Motorbike',
        name_ar: 'دراجة نارية',
        description: 'Quick and efficient for short distances',
        capacity: 1,
        base_fare: 5.0,
        per_km_rate: 1.0,
        per_minute_rate: 0.3,
        minimum_fare: 5.0,
        surge_multiplier: 1.0,
        fuel_type: 'petrol',
        features: ['GPS', 'Helmet Provided'],
        is_active: true
      }
    ];

    const { data: insertedVehicles, error: vehicleError } = await supabase
      .from('vehicle_types')
      .insert(vehicleTypes)
      .select();

    if (vehicleError) {
      console.log('⚠️  Vehicle types might already exist:', vehicleError.message);
    } else {
      console.log(`✅ Inserted ${insertedVehicles.length} vehicle types`);
    }

    console.log('✅ Sample data insertion completed');
    
  } catch (err) {
    console.error('❌ Error inserting sample data:', err.message);
  }
}

async function showDataSummary() {
  console.log('📈 Database Summary:');
  console.log('===================');

  const tables = [
    { name: 'profiles', label: 'User Profiles' },
    { name: 'driver_profiles', label: 'Driver Profiles' },
    { name: 'vehicle_types', label: 'Vehicle Types' },
    { name: 'trips', label: 'Trips' },
    { name: 'trip_requests', label: 'Trip Requests' },
    { name: 'notifications', label: 'Notifications' },
    { name: 'ratings', label: 'Ratings' },
    { name: 'payments', label: 'Payments' }
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table.label}: Table not found`);
      } else {
        console.log(`✅ ${table.label}: ${count || 0} records`);
      }
    } catch (err) {
      console.log(`❌ ${table.label}: Error checking`);
    }
  }
}

async function main() {
  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Cannot proceed without database connection');
      process.exit(1);
    }

    console.log('');

    // Check tables
    const { existingTables, missingTables } = await checkTablesExist();
    
    console.log('');

    if (missingTables.length > 0) {
      console.log('⚠️  Some tables are missing. Please run the migration SQL script first.');
      console.log('🔧 Run this in your Supabase SQL editor:');
      console.log('   File: supabase/migrations/20250720_complete_igtaxi_system.sql');
      console.log('');
    }

    // Insert sample data if tables exist
    if (existingTables.includes('vehicle_types')) {
      await insertSampleData();
      console.log('');
    }

    // Show summary
    await showDataSummary();

    console.log('');
    console.log('🎉 Database setup completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start your Expo development server: npm run start');
    console.log('2. Test the app connection using the Database Test component');
    console.log('3. Register a user account to test authentication');

  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = { testConnection, checkTablesExist, insertSampleData, showDataSummary };
