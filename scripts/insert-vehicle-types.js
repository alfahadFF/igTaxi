#!/usr/bin/env node
// ===================================================================
// Insert Vehicle Types - IGTaxi
// ===================================================================

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertVehicleTypes() {
  console.log('🚗 Inserting Vehicle Types...');

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

  try {
    // Check existing vehicle types first
    const { data: existingTypes, error: checkError } = await supabase
      .from('vehicle_types')
      .select('*');

    if (checkError) {
      console.error('❌ Error checking existing vehicle types:', checkError.message);
      return;
    }

    console.log(`📊 Found ${existingTypes.length} existing vehicle types`);

    if (existingTypes.length === 0) {
      // Insert new vehicle types
      const { data: inserted, error: insertError } = await supabase
        .from('vehicle_types')
        .insert(vehicleTypes)
        .select();

      if (insertError) {
        console.error('❌ Error inserting vehicle types:', insertError.message);
        return;
      }

      console.log(`✅ Successfully inserted ${inserted.length} vehicle types`);
      
      // Display inserted data
      inserted.forEach((vehicle, index) => {
        console.log(`   ${index + 1}. ${vehicle.name_ar} (${vehicle.name}) - ${vehicle.base_fare} AED`);
      });

    } else {
      console.log('ℹ️  Vehicle types already exist:');
      existingTypes.forEach((vehicle, index) => {
        console.log(`   ${index + 1}. ${vehicle.name_ar} (${vehicle.name}) - ${vehicle.base_fare} AED`);
      });
    }

    // Final count check
    const { count, error: countError } = await supabase
      .from('vehicle_types')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📈 Total vehicle types in database: ${count}`);
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

insertVehicleTypes().then(() => {
  console.log('🎉 Vehicle types setup completed!');
}).catch(err => {
  console.error('❌ Setup failed:', err);
});
