import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Clock, Car, Fuel, DollarSign, User } from 'lucide-react-native';
import Header from '@/components/layout/Header';
import { FareDisplay } from '@/components/fare/FareComponents';
import { useFareCalculator } from '@/hooks/useFareCalculator';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

interface TripDetails {
  id: string;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  duration_minutes: number;
  status: string;
  created_at: string;
  completed_at?: string;
  driver_id?: string;
  customer_id: string;
  fuel_type?: string;
  total_customer_fare?: number;
  driver_earnings?: number;
  app_commission?: number;
  waiting_time_minutes?: number;
  average_speed_kmh?: number;
  base_fare?: number;
  distance_fare?: number;
  waiting_charges?: number;
  surge_amount?: number;
  surge_multiplier?: number;
  minimum_fare_applied?: boolean;
  fare_breakdown?: any;
  
  // معلومات السائق
  driver?: {
    full_name: string;
    phone_number: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_year?: string;
    vehicle_color?: string;
    plate_number?: string;
    fuel_type?: string;
  };
  
  // معلومات العميل
  customer?: {
    full_name: string;
    phone_number: string;
  };
}

export default function TripDetailsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { calculateAndSaveTripFare, loading: fareLoading } = useFareCalculator();
  
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);

  // =====================================================
  // تحميل تفاصيل الرحلة
  // =====================================================
  const loadTripDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          driver:main_profiles!trips_driver_id_fkey(
            id,
            full_name,
            phone_number
          ),
          customer:main_profiles!trips_customer_id_fkey(
            id,
            full_name,
            phone_number
          )
        `)
        .eq('id', id)
        .single();

      if (tripError) throw tripError;

      // الحصول على معلومات المركبة للسائق
      if (tripData.driver_id) {
        const { data: vehicleData } = await supabase
          .from('taxi_drivers')
          .select(`
            vehicle_make,
            vehicle_model,
            vehicle_year,
            vehicle_color,
            plate_number,
            fuel_type
          `)
          .eq('business_profile_id', (
            await supabase
              .from('business_profiles')
              .select('id')
              .eq('profile_id', tripData.driver_id)
              .single()
          ).data?.id)
          .single();

        if (vehicleData) {
          tripData.driver = {
            ...tripData.driver,
            ...vehicleData
          };
        }
      }

      setTripDetails(tripData);
    } catch (err) {
      console.error('Error loading trip details:', err);
      setError('فشل في تحميل تفاصيل الرحلة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTripDetails();
    }
  }, [id]);

  // =====================================================
  // إكمال الرحلة وحساب التكلفة
  // =====================================================
  const handleCompleteTrip = async () => {
    if (!tripDetails || tripDetails.status === 'completed') return;

    try {
      setIsCompletingTrip(true);

      // حساب متوسط السرعة
      const average_speed = tripDetails.duration_minutes > 0 
        ? (tripDetails.distance_km * 60) / tripDetails.duration_minutes 
        : 0;

      // إعداد بيانات الرحلة لحساب التكلفة
      const tripFareData = {
        tripId: tripDetails.id,
        driverId: tripDetails.driver_id || '',
        customerId: tripDetails.customer_id,
        distance_km: tripDetails.distance_km,
        fuel_type: (tripDetails.driver?.fuel_type || 'petrol') as any,
        trip_duration_minutes: tripDetails.duration_minutes,
        average_speed_kmh: average_speed,
        surge_level: 'normal' as any // يمكن تحديد هذا بناءً على الوقت الحالي
      };

      // حساب وحفظ التكلفة
      const fareResult = await calculateAndSaveTripFare(tripFareData);

      Alert.alert(
        t('trips.tripCompleted'),
        `${t('trips.totalFare')}: ${fareResult.total_fare.toFixed(3)} ${t('common.jod')}\n${t('trips.driverEarnings')}: ${fareResult.driver_earnings.toFixed(3)} ${t('common.jod')}`,
        [
          {
            text: t('common.ok'),
            onPress: () => {
              // إعادة تحميل تفاصيل الرحلة لإظهار البيانات المحدثة
              loadTripDetails();
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error completing trip:', err);
      Alert.alert(t('common.error'), err instanceof Error ? err.message : 'خطأ في إكمال الرحلة');
    } finally {
      setIsCompletingTrip(false);
    }
  };

  // =====================================================
  // حساب الوقت المنقضي
  // =====================================================
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours} ${t('common.hours')} ${remainingMinutes} ${t('common.minutes')}`;
    }
    return `${remainingMinutes} ${t('common.minutes')}`;
  };

  // =====================================================
  // حالات التحميل والخطأ
  // =====================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('trips.tripDetails')} showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tripDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('trips.tripDetails')} showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || t('trips.tripNotFound')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTripDetails}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isDriver = user?.id === tripDetails.driver_id;
  const isCustomer = user?.id === tripDetails.customer_id;
  const canCompleteTrip = isDriver && tripDetails.status === 'in_progress';
  const isCompleted = tripDetails.status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('trips.tripDetails')} showBackButton />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* حالة الرحلة */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusBadge,
            tripDetails.status === 'completed' && styles.completedStatus,
            tripDetails.status === 'in_progress' && styles.inProgressStatus,
            tripDetails.status === 'cancelled' && styles.cancelledStatus
          ]}>
            <Text style={styles.statusText}>
              {t(`trips.status.${tripDetails.status}`)}
            </Text>
          </View>
        </View>

        {/* معلومات الرحلة الأساسية */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{t('trips.routeDetails')}</Text>
          
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, styles.pickupIcon]}>
                <MapPin size={16} color="#fff" />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>{t('trips.pickup')}</Text>
                <Text style={styles.routeAddress}>{tripDetails.pickup_address}</Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, styles.destinationIcon]}>
                <MapPin size={16} color="#fff" />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>{t('trips.destination')}</Text>
                <Text style={styles.routeAddress}>{tripDetails.destination_address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tripMetrics}>
            <View style={styles.metricItem}>
              <MapPin size={20} color="#666" />
              <Text style={styles.metricValue}>{tripDetails.distance_km.toFixed(2)} {t('common.km')}</Text>
              <Text style={styles.metricLabel}>{t('trips.distance')}</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Clock size={20} color="#666" />
              <Text style={styles.metricValue}>{formatDuration(tripDetails.duration_minutes)}</Text>
              <Text style={styles.metricLabel}>{t('trips.duration')}</Text>
            </View>

            {tripDetails.average_speed_kmh && (
              <View style={styles.metricItem}>
                <Car size={20} color="#666" />
                <Text style={styles.metricValue}>{tripDetails.average_speed_kmh.toFixed(1)} {t('common.kmh')}</Text>
                <Text style={styles.metricLabel}>{t('trips.averageSpeed')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* معلومات السائق والمركبة */}
        {tripDetails.driver && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>{t('trips.driverInfo')}</Text>
            
            <View style={styles.driverInfo}>
              <View style={styles.driverDetail}>
                <User size={20} color="#666" />
                <View style={styles.driverText}>
                  <Text style={styles.driverName}>{tripDetails.driver.full_name}</Text>
                  <Text style={styles.driverPhone}>{tripDetails.driver.phone_number}</Text>
                </View>
              </View>

              {tripDetails.driver.vehicle_make && (
                <View style={styles.vehicleInfo}>
                  <Car size={20} color="#666" />
                  <View style={styles.vehicleText}>
                    <Text style={styles.vehicleName}>
                      {tripDetails.driver.vehicle_make} {tripDetails.driver.vehicle_model} {tripDetails.driver.vehicle_year}
                    </Text>
                    <Text style={styles.vehicleDetails}>
                      {tripDetails.driver.vehicle_color} • {tripDetails.driver.plate_number}
                    </Text>
                  </View>
                </View>
              )}

              {tripDetails.driver.fuel_type && (
                <View style={styles.fuelInfo}>
                  <Fuel size={20} color="#666" />
                  <Text style={styles.fuelType}>
                    {t(`vehicles.fuelTypes.${tripDetails.driver.fuel_type}`)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* تفاصيل التكلفة */}
        {(isCompleted || canCompleteTrip) && (
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>
              <DollarSign size={20} color="#333" /> {t('trips.fareDetails')}
            </Text>
            
            {isCompleted && tripDetails.total_customer_fare ? (
              // عرض التكلفة المحسوبة
              <View style={styles.fareContainer}>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>{t('fare.totalForCustomer')}</Text>
                  <Text style={styles.fareValue}>
                    {tripDetails.total_customer_fare.toFixed(3)} {t('common.jod')}
                  </Text>
                </View>
                
                {isDriver && (
                  <>
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>{t('fare.yourEarnings')}</Text>
                      <Text style={[styles.fareValue, styles.driverEarning]}>
                        {tripDetails.driver_earnings?.toFixed(3)} {t('common.jod')}
                      </Text>
                    </View>
                    
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>{t('fare.appCommission')}</Text>
                      <Text style={[styles.fareValue, styles.appCommission]}>
                        {tripDetails.app_commission?.toFixed(3)} {t('common.jod')}
                      </Text>
                    </View>
                  </>
                )}
                
                {tripDetails.fare_breakdown && (
                  <View style={styles.fareBreakdown}>
                    <Text style={styles.breakdownTitle}>{t('fare.breakdown')}</Text>
                    
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t('fare.baseFare')}</Text>
                      <Text style={styles.breakdownValue}>
                        {tripDetails.base_fare?.toFixed(3)} {t('common.jod')}
                      </Text>
                    </View>
                    
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{t('fare.distanceFare')}</Text>
                      <Text style={styles.breakdownValue}>
                        {tripDetails.distance_fare?.toFixed(3)} {t('common.jod')}
                      </Text>
                    </View>
                    
                    {tripDetails.waiting_charges && tripDetails.waiting_charges > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('fare.waitingCharges')}</Text>
                        <Text style={styles.breakdownValue}>
                          {tripDetails.waiting_charges.toFixed(3)} {t('common.jod')}
                        </Text>
                      </View>
                    )}
                    
                    {tripDetails.surge_amount && tripDetails.surge_amount > 0 && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{t('fare.surgeCharges')}</Text>
                        <Text style={styles.breakdownValue}>
                          {tripDetails.surge_amount.toFixed(3)} {t('common.jod')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : (
              // عرض حاسبة التكلفة التفاعلية
              <FareDisplay
                distance_km={tripDetails.distance_km}
                fuel_type={(tripDetails.driver?.fuel_type || 'petrol') as any}
                waiting_time_minutes={tripDetails.waiting_time_minutes || 0}
                surge_level="normal"
                showDriverBreakdown={isDriver}
              />
            )}
          </View>
        )}

        {/* التواريخ */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>{t('trips.timeline')}</Text>
          
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>{t('trips.tripStarted')}</Text>
            <Text style={styles.timelineValue}>
              {new Date(tripDetails.created_at).toLocaleString('ar-JO')}
            </Text>
          </View>
          
          {tripDetails.completed_at && (
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>{t('trips.tripCompleted')}</Text>
              <Text style={styles.timelineValue}>
                {new Date(tripDetails.completed_at).toLocaleString('ar-JO')}
              </Text>
            </View>
          )}
        </View>

        {/* أزرار الإجراءات */}
        {canCompleteTrip && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteTrip}
              disabled={isCompletingTrip || fareLoading}
            >
              {isCompletingTrip || fareLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>{t('trips.completeTrip')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// الأنماط
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  scrollView: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Poppins-Regular',
  },
  
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  
  // حالة الرحلة
  statusSection: {
    alignItems: 'center',
    padding: 16,
  },
  
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#6c757d',
  },
  
  completedStatus: {
    backgroundColor: '#28a745',
  },
  
  inProgressStatus: {
    backgroundColor: '#007AFF',
  },
  
  cancelledStatus: {
    backgroundColor: '#dc3545',
  },
  
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  
  // أقسام التفاصيل
  detailsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#333',
    marginBottom: 16,
  },
  
  // معلومات المسار
  routeContainer: {
    marginBottom: 16,
  },
  
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  pickupIcon: {
    backgroundColor: '#28a745',
  },
  
  destinationIcon: {
    backgroundColor: '#dc3545',
  },
  
  routeInfo: {
    flex: 1,
  },
  
  routeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 2,
  },
  
  routeAddress: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    lineHeight: 20,
  },
  
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 15,
    marginVertical: 8,
  },
  
  // مقاييس الرحلة
  tripMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  metricValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#333',
    marginTop: 4,
  },
  
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  
  // معلومات السائق
  driverInfo: {
    gap: 16,
  },
  
  driverDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  driverText: {
    marginLeft: 12,
    flex: 1,
  },
  
  driverName: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  
  driverPhone: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  vehicleText: {
    marginLeft: 12,
    flex: 1,
  },
  
  vehicleName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  
  vehicleDetails: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  fuelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  fuelType: {
    marginLeft: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  // تفاصيل التكلفة
  fareContainer: {
    gap: 12,
  },
  
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  
  fareLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  
  fareValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#333',
  },
  
  driverEarning: {
    color: '#28a745',
  },
  
  appCommission: {
    color: '#6c757d',
  },
  
  fareBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 8,
  },
  
  breakdownTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 8,
  },
  
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  
  breakdownLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  breakdownValue: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  
  // الجدول الزمني
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  timelineLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  
  timelineValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  
  // أزرار الإجراءات
  actionsSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  actionButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  completeButton: {
    backgroundColor: '#28a745',
  },
  
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
});