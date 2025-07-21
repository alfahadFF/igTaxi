import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFareCalculator, useDriverEarnings } from '@/hooks/useFareCalculator';
import { FareCalculationResult } from '@/utils/fareCalculator';

interface FareDisplayProps {
  distance_km: number;
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  waiting_time_minutes?: number;
  surge_level?: 'low' | 'normal' | 'high' | 'peak';
  showDriverBreakdown?: boolean; // إظهار تفصيل أرباح السائق
  onFareCalculated?: (result: FareCalculationResult) => void;
}

// =====================================================
// مكون عرض تفاصيل التكلفة
// =====================================================
export function FareDisplay({
  distance_km,
  fuel_type,
  waiting_time_minutes = 0,
  surge_level = 'normal',
  showDriverBreakdown = false,
  onFareCalculated
}: FareDisplayProps) {
  const { t } = useTranslation();
  const { calculateTripFare, formatFareDetails, directCalculateSurge } = useFareCalculator();
  const [fareResult, setFareResult] = useState<FareCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const current_hour = new Date().getHours();
      const surge_multiplier = directCalculateSurge(current_hour, surge_level);
      
      const result = calculateTripFare({
        distance_km,
        fuel_type,
        waiting_time_minutes,
        surge_multiplier
      });

      setFareResult(result);
      setError(null);
      
      if (onFareCalculated) {
        onFareCalculated(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في حساب التكلفة');
      setFareResult(null);
    }
  }, [distance_km, fuel_type, waiting_time_minutes, surge_level, calculateTripFare, directCalculateSurge, onFareCalculated]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!fareResult) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const fuelTypeLabels = {
    petrol: t('vehicles.fuelTypes.petrol'),
    diesel: t('vehicles.fuelTypes.diesel'),
    hybrid: t('vehicles.fuelTypes.hybrid'),
    electric: t('vehicles.fuelTypes.electric')
  };

  const breakdown = formatFareDetails(fareResult, 'ar');

  return (
    <View style={styles.container}>
      {/* معلومات الرحلة */}
      <View style={styles.tripInfoSection}>
        <Text style={styles.sectionTitle}>{t('fare.tripDetails')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('fare.distance')}:</Text>
          <Text style={styles.infoValue}>{distance_km.toFixed(2)} {t('common.km')}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('fare.fuelType')}:</Text>
          <Text style={styles.infoValue}>{fuelTypeLabels[fuel_type]}</Text>
        </View>
        {waiting_time_minutes > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('fare.waitingTime')}:</Text>
            <Text style={styles.infoValue}>{waiting_time_minutes} {t('common.minutes')}</Text>
          </View>
        )}
      </View>

      {/* تفصيل التكلفة */}
      <View style={styles.fareBreakdownSection}>
        <Text style={styles.sectionTitle}>{t('fare.breakdown')}</Text>
        {breakdown.map((item, index) => (
          <View key={index} style={[styles.breakdownRow, item.isTotal && styles.totalRow]}>
            <Text style={[styles.breakdownLabel, item.isTotal && styles.totalLabel]}>
              {item.label}
            </Text>
            <Text style={[styles.breakdownValue, item.isTotal && styles.totalValue]}>
              {item.amount.toFixed(3)} {t('common.jod')}
            </Text>
          </View>
        ))}
      </View>

      {/* إجمالي التكلفة للعميل */}
      <View style={styles.totalFareSection}>
        <Text style={styles.totalLabel}>{t('fare.totalForCustomer')}</Text>
        <Text style={styles.totalAmount}>
          {fareResult.total_fare.toFixed(3)} {t('common.jod')}
        </Text>
      </View>

      {/* تفصيل أرباح السائق (يظهر للسائقين فقط) */}
      {showDriverBreakdown && (
        <View style={styles.driverBreakdownSection}>
          <Text style={styles.sectionTitle}>{t('fare.driverEarnings')}</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t('fare.driverShare')} (90%)</Text>
            <Text style={[styles.breakdownValue, styles.driverEarning]}>
              {fareResult.driver_earnings.toFixed(3)} {t('common.jod')}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{t('fare.appCommission')} (10%)</Text>
            <Text style={[styles.breakdownValue, styles.appCommission]}>
              {fareResult.app_commission.toFixed(3)} {t('common.jod')}
            </Text>
          </View>
        </View>
      )}

      {/* ملاحظات إضافية */}
      {fareResult.minimum_fare_applied && (
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>
            {t('fare.minimumFareApplied')}
          </Text>
        </View>
      )}
    </View>
  );
}

// =====================================================
// مكون إحصائيات السائق
// =====================================================
interface DriverStatsProps {
  driverId: string;
  showDetailedBreakdown?: boolean;
}

export function DriverEarningsStats({ driverId, showDetailedBreakdown = true }: DriverStatsProps) {
  const { t } = useTranslation();
  const { dailyEarnings, monthlyEarnings, stats, loading, error, refresh } = useDriverEarnings(driverId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.statsContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* إحصائيات اليوم */}
      {dailyEarnings && (
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>{t('earnings.today')}</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{dailyEarnings.total_trips}</Text>
              <Text style={styles.statLabel}>{t('earnings.totalTrips')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {dailyEarnings.total_distance_km?.toFixed(1)} {t('common.km')}
              </Text>
              <Text style={styles.statLabel}>{t('earnings.totalDistance')}</Text>
            </View>
            
            <View style={[styles.statCard, styles.earningsCard]}>
              <Text style={[styles.statValue, styles.earningsValue]}>
                {dailyEarnings.driver_earnings?.toFixed(2)} {t('common.jod')}
              </Text>
              <Text style={styles.statLabel}>{t('earnings.todayEarnings')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {dailyEarnings.average_fare?.toFixed(2)} {t('common.jod')}
              </Text>
              <Text style={styles.statLabel}>{t('earnings.averageFare')}</Text>
            </View>
          </View>

          {showDetailedBreakdown && (
            <View style={styles.detailedBreakdown}>
              <Text style={styles.breakdownTitle}>{t('earnings.todayBreakdown')}</Text>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('earnings.totalRevenue')}</Text>
                <Text style={styles.breakdownValue}>
                  {dailyEarnings.total_revenue?.toFixed(3)} {t('common.jod')}
                </Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('earnings.yourShare')} (90%)</Text>
                <Text style={[styles.breakdownValue, styles.driverEarning]}>
                  {dailyEarnings.driver_earnings?.toFixed(3)} {t('common.jod')}
                </Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t('earnings.appCommission')} (10%)</Text>
                <Text style={[styles.breakdownValue, styles.appCommission]}>
                  {dailyEarnings.app_commission?.toFixed(3)} {t('common.jod')}
                </Text>
              </View>
              
              {dailyEarnings.fuel_cost_estimated > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{t('earnings.estimatedFuelCost')}</Text>
                  <Text style={[styles.breakdownValue, styles.fuelCost]}>
                    -{dailyEarnings.fuel_cost_estimated?.toFixed(3)} {t('common.jod')}
                  </Text>
                </View>
              )}
              
              <View style={[styles.breakdownRow, styles.totalRow]}>
                <Text style={[styles.breakdownLabel, styles.totalLabel]}>
                  {t('earnings.netProfit')}
                </Text>
                <Text style={[styles.breakdownValue, styles.totalValue]}>
                  {dailyEarnings.net_driver_profit?.toFixed(3)} {t('common.jod')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* إحصائيات الشهر */}
      {monthlyEarnings && (
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>{t('earnings.thisMonth')}</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{monthlyEarnings.total_trips}</Text>
              <Text style={styles.statLabel}>{t('earnings.totalTrips')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{monthlyEarnings.working_days}</Text>
              <Text style={styles.statLabel}>{t('earnings.workingDays')}</Text>
            </View>
            
            <View style={[styles.statCard, styles.earningsCard]}>
              <Text style={[styles.statValue, styles.earningsValue]}>
                {monthlyEarnings.driver_earnings?.toFixed(2)} {t('common.jod')}
              </Text>
              <Text style={styles.statLabel}>{t('earnings.monthlyEarnings')}</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {monthlyEarnings.best_day_earnings?.toFixed(2)} {t('common.jod')}
              </Text>
              <Text style={styles.statLabel}>{t('earnings.bestDay')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* زر اختبار النظام (للتطوير) */}
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.testButton}
          onPress={() => {
            const { runTests } = require('@/hooks/useFareCalculator');
            runTests();
            Alert.alert('اختبار النظام', 'تم تشغيل اختبارات نظام التسعير. راجع console للنتائج.');
          }}
        >
          <Text style={styles.testButtonText}>تشغيل اختبارات النظام</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// =====================================================
// الأنماط
// =====================================================
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
  
  // أقسام المعلومات
  tripInfoSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  fareBreakdownSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  driverBreakdownSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  
  totalFareSection: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  
  noteSection: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  
  // النصوص
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  infoValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
    paddingTop: 12,
  },
  
  breakdownLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#555',
    flex: 1,
  },
  
  breakdownValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    textAlign: 'right',
  },
  
  totalLabel: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  
  totalAmount: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  
  totalValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#007AFF',
  },
  
  driverEarning: {
    color: '#28a745',
    fontFamily: 'Poppins-SemiBold',
  },
  
  appCommission: {
    color: '#6c757d',
    fontFamily: 'Poppins-Regular',
  },
  
  fuelCost: {
    color: '#dc3545',
    fontFamily: 'Poppins-Regular',
  },
  
  noteText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#856404',
  },
  
  // حالات التحميل والخطأ
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    margin: 16,
  },
  
  errorText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#721c24',
    textAlign: 'center',
    marginBottom: 12,
  },
  
  retryButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  
  // إحصائيات السائق
  statsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  statsSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  statsSectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  statCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  
  earningsCard: {
    backgroundColor: '#e8f5e8',
  },
  
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#333',
    marginBottom: 4,
  },
  
  earningsValue: {
    color: '#28a745',
  },
  
  statLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
  },
  
  detailedBreakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  
  breakdownTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  
  // زر الاختبار
  testButton: {
    backgroundColor: '#6c757d',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
});
