#!/usr/bin/env node
// ===================================================================
// Test Supabase Connection - Simple Test
// ===================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gemjqbxmfkclfgvscqbj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  console.log(`URL: ${supabaseUrl}`);
  
  try {
    // Test the connection
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth error:', error.message);
    } else {
      console.log('✅ Authentication works!');
    }

    // Test a simple RPC call
    const { data: rpcData, error: rpcError } = await supabase.rpc('now');
    
    if (rpcError) {
      console.log('⚠️  RPC test failed:', rpcError.message);
    } else {
      console.log('✅ RPC works! Current time:', rpcData);
    }

    console.log('🎉 Connection test completed!');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testConnection();
