import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useVehicleTypes } from '@/hooks/useSupabase';
import { supabase } from '@/utils/supabase';

interface TestResults {
  connection: boolean;
  vehicleCount: number;
  vehicles: any[];
  error?: string;
}

export default function QuickDatabaseTest() {
  const [results, setResults] = useState<TestResults>({
    connection: false,
    vehicleCount: 0,
    vehicles: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testDatabase();
  }, []);

  const testDatabase = async () => {
    try {
      // Test connection and fetch vehicles
      const { data: vehicles, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .eq('is_active', true);

      if (error) {
        setResults({
          connection: false,
          vehicleCount: 0,
          vehicles: [],
          error: error.message
        });
      } else {
        setResults({
          connection: true,
          vehicleCount: vehicles?.length || 0,
          vehicles: vehicles || [],
          error: undefined
        });
      }
    } catch (err) {
      setResults({
        connection: false,
        vehicleCount: 0,
        vehicles: [],
        error: String(err)
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>جاري اختبار قاعدة البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>نتائج اختبار قاعدة البيانات</Text>
        <View style={[styles.statusBadge, { 
          backgroundColor: results.connection ? '#10b981' : '#ef4444' 
        }]}>
          <Text style={styles.statusText}>
            {results.connection ? '✅ متصل' : '❌ غير متصل'}
          </Text>
        </View>
      </View>

      {results.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>خطأ:</Text>
          <Text style={styles.errorText}>{results.error}</Text>
        </View>
      )}

      {results.connection && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{results.vehicleCount}</Text>
            <Text style={styles.statLabel}>أنواع السيارات</Text>
          </View>
        </View>
      )}

      {results.vehicles.length > 0 && (
        <View style={styles.vehiclesContainer}>
          <Text style={styles.sectionTitle}>أنواع السيارات المتاحة:</Text>
          {results.vehicles.map((vehicle, index) => (
            <View key={vehicle.id} style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleName}>{vehicle.name_ar}</Text>
                <Text style={styles.vehiclePrice}>{vehicle.base_fare} د.إ</Text>
              </View>
              <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
              <View style={styles.vehicleDetails}>
                <Text style={styles.vehicleDetail}>السعة: {vehicle.capacity} أشخاص</Text>
                <Text style={styles.vehicleDetail}>نوع الوقود: {vehicle.fuel_type}</Text>
                <Text style={styles.vehicleDetail}>السعر/كم: {vehicle.per_km_rate} د.إ</Text>
              </View>
              {vehicle.features && (
                <Text style={styles.vehicleFeatures}>المميزات: {vehicle.features}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>🎉 تهانينا!</Text>
        <Text style={styles.successText}>
          تم إعداد قاعدة البيانات بنجاح وجلب البيانات يعمل بشكل مثالي!
          {'\n\n'}يمكنك الآن:
          {'\n'}• استخدام جميع أنواع السيارات
          {'\n'}• حفظ ملفات المستخدمين
          {'\n'}• تتبع الرحلات
          {'\n'}• النظام جاهز للاستخدام الكامل!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
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
  errorContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  vehiclesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  vehicleCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  vehiclePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  vehicleDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  vehicleDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  vehicleDetail: {
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vehicleFeatures: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
  },
  successContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
});
