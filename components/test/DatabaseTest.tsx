import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../utils/supabase';

interface DatabaseStatus {
  connected: boolean;
  tablesExist: boolean;
  vehicleCount: number;
  profileCount: number;
  error?: string;
  details: string[];
}

export default function DatabaseTest() {
  const [status, setStatus] = useState<DatabaseStatus>({
    connected: false,
    tablesExist: false,
    vehicleCount: 0,
    profileCount: 0,
    details: []
  });
  const [loading, setLoading] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    const details: string[] = [];
    
    try {
      details.push('🔌 Testing Supabase connection...');
      
      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('vehicle_types')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        if (connectionError.message.includes('does not exist')) {
          details.push('❌ Tables do not exist yet');
          details.push('📝 Please run the SQL script in Supabase SQL Editor');
          setStatus({
            connected: true,
            tablesExist: false,
            vehicleCount: 0,
            profileCount: 0,
            error: 'Tables not created',
            details
          });
        } else {
          details.push(`❌ Connection error: ${connectionError.message}`);
          setStatus({
            connected: false,
            tablesExist: false,
            vehicleCount: 0,
            profileCount: 0,
            error: connectionError.message,
            details
          });
        }
        setLoading(false);
        return;
      }

      details.push('✅ Connection successful');
      
      // Count vehicle types
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicle_types')
        .select('*', { count: 'exact' });
      
      const vehicleCount = vehicleData?.length || 0;
      details.push(`🚗 Vehicle types found: ${vehicleCount}`);
      
      if (vehicleData && vehicleData.length > 0) {
        details.push(`📋 Sample vehicle: ${vehicleData[0].name} (${vehicleData[0].name_ar})`);
      }

      // Count profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });
      
      const profileCount = profileData?.length || 0;
      details.push(`👤 Profiles found: ${profileCount}`);

      setStatus({
        connected: true,
        tablesExist: vehicleCount > 0,
        vehicleCount,
        profileCount,
        details
      });

    } catch (error) {
      details.push(`💥 Unexpected error: ${error}`);
      setStatus({
        connected: false,
        tablesExist: false,
        vehicleCount: 0,
        profileCount: 0,
        error: String(error),
        details
      });
    }
    
    setLoading(false);
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  const getStatusColor = () => {
    if (!status.connected) return '#ef4444';
    if (!status.tablesExist) return '#f59e0b';
    return '#10b981';
  };

  const getStatusText = () => {
    if (!status.connected) return 'Connection Failed';
    if (!status.tablesExist) return 'Tables Missing';
    return 'Database Ready';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Status</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={checkDatabase}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{status.vehicleCount}</Text>
          <Text style={styles.statLabel}>Vehicle Types</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{status.profileCount}</Text>
          <Text style={styles.statLabel}>Profiles</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Test Details:</Text>
        {status.details.map((detail, index) => (
          <Text key={index} style={styles.detailText}>
            {detail}
          </Text>
        ))}
      </View>

      {!status.tablesExist && status.connected && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📋 Next Steps:</Text>
          <Text style={styles.instructionText}>
            1. Open Supabase Dashboard → SQL Editor{'\n'}
            2. Copy content from scripts/create-basic.sql{'\n'}
            3. Paste and execute the SQL script{'\n'}
            4. Return here and test again
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  detailsContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  detailText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  instructionsContainer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#92400e',
  },
  instructionText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
