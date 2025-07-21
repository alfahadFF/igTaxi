import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

const { width, height } = Dimensions.get('window');

interface VehicleType {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  pricePerKm: number;
  pricePerMinute: number;
  icon: string;
  fuelType: 'gasoline' | 'hybrid' | 'electric';
  color: string;
  estimatedPrice?: number;
  estimatedTime?: number;
}

interface TaxiLocation {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

interface VehicleSelectionProps {
  pricing: VehicleType[];
  pickup: TaxiLocation;
  destination: TaxiLocation;
  distance: number;
  onVehicleSelected: (vehicle: VehicleType) => void;
  onRequestTaxi: (vehicle: VehicleType, notes?: string) => void;
}

export default function VehicleSelection({
  pricing,
  pickup,
  destination,
  distance,
  onVehicleSelected,
  onRequestTaxi
}: VehicleSelectionProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [notes, setNotes] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const slideAnimation = useRef(new Animated.Value(height)).current;
  const { user } = useAuth();

  useEffect(() => {
    if (pricing.length > 0) {
      showSheet();
    }
  }, [pricing]);

  const showSheet = () => {
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const hideSheet = () => {
    Animated.spring(slideAnimation, {
      toValue: height,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const handleVehicleSelect = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
    onVehicleSelected(vehicle);
  };

  const handleRequestTaxi = async () => {
    if (!selectedVehicle) {
      Alert.alert('تنبيه', 'الرجاء اختيار نوع السيارة');
      return;
    }

    if (!user) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      setIsRequesting(true);

      // إنشاء طلب تاكسي جديد
      const { data: taxiRequest, error } = await supabase
        .from('taxi_requests')
        .insert({
          customer_id: user.id,
          pickup_latitude: pickup.latitude,
          pickup_longitude: pickup.longitude,
          pickup_address: pickup.title,
          destination_latitude: destination.latitude,
          destination_longitude: destination.longitude,
          destination_address: destination.title,
          vehicle_type: selectedVehicle.id,
          estimated_price: selectedVehicle.estimatedPrice,
          estimated_distance: distance,
          estimated_duration: selectedVehicle.estimatedTime,
          customer_notes: notes,
          fuel_type: selectedVehicle.fuelType,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating taxi request:', error);
        Alert.alert('خطأ', 'حدث خطأ في إنشاء الطلب. يرجى المحاولة مرة أخرى.');
        return;
      }

      // إشعار السائقين القريبين
      await notifyNearbyDrivers(taxiRequest.id);

      onRequestTaxi(selectedVehicle, notes);
      Alert.alert(
        'تم إرسال الطلب',
        'جاري البحث عن سائق قريب منك. ستصلك إشعارات بحالة الطلب.',
        [{ text: 'موافق', onPress: hideSheet }]
      );

    } catch (error) {
      console.error('Error requesting taxi:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    } finally {
      setIsRequesting(false);
    }
  };

  const notifyNearbyDrivers = async (requestId: number) => {
    try {
      // الحصول على السائقين المتاحين في نطاق 10 كم
      const { data: nearbyDrivers } = await supabase
        .from('driver_locations')
        .select(`
          driver_id,
          latitude,
          longitude,
          profiles:driver_id (
            full_name,
            phone,
            device_token
          )
        `)
        .eq('is_available', true)
        .eq('is_online', true);

      if (nearbyDrivers && nearbyDrivers.length > 0) {
        // حساب المسافة وترتيب السائقين حسب القرب
        const driversWithDistance = nearbyDrivers
          .map(driver => ({
            ...driver,
            distance: calculateDistance(
              pickup.latitude,
              pickup.longitude,
              driver.latitude,
              driver.longitude
            )
          }))
          .filter(driver => driver.distance <= 10) // ضمن 10 كم
          .sort((a, b) => a.distance - b.distance);

        // إرسال إشعارات للسائقين (الأقرب أولاً)
        for (const driver of driversWithDistance.slice(0, 5)) { // أقرب 5 سائقين
          await supabase
            .from('driver_notifications')
            .insert({
              driver_id: driver.driver_id,
              request_id: requestId,
              notification_type: 'new_request',
              title: 'طلب رحلة جديد',
              message: `طلب رحلة جديد على بعد ${driver.distance.toFixed(1)} كم منك`,
              data: {
                request_id: requestId,
                pickup_address: pickup.title,
                destination_address: destination.title,
                estimated_price: selectedVehicle?.estimatedPrice,
                vehicle_type: selectedVehicle?.name,
                distance: driver.distance
              }
            });
        }

        console.log(`تم إشعار ${driversWithDistance.length} سائق`);
      } else {
        Alert.alert(
          'لا توجد سائقين متاحين',
          'عذراً، لا يوجد سائقين متاحين في منطقتك حالياً. يرجى المحاولة لاحقاً.'
        );
      }
    } catch (error) {
      console.error('Error notifying drivers:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getFuelTypeIcon = (fuelType: string) => {
    switch (fuelType) {
      case 'hybrid':
        return 'leaf';
      case 'electric':
        return 'flash';
      default:
        return 'car';
    }
  };

  const getFuelTypeLabel = (fuelType: string) => {
    switch (fuelType) {
      case 'hybrid':
        return 'هايبرد';
      case 'electric':
        return 'كهربائي';
      default:
        return 'بنزين';
    }
  };

  const getCheapestPrice = () => {
    return Math.min(...pricing.map(v => v.estimatedPrice || 0));
  };

  const getMostExpensivePrice = () => {
    return Math.max(...pricing.map(v => v.estimatedPrice || 0));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      <View style={styles.handle} />
      
      <View style={styles.header}>
        <View style={styles.routeSummary}>
          <Text style={styles.routeTitle}>اختر نوع السيارة</Text>
          <Text style={styles.routeSubtitle}>
            {distance.toFixed(1)} كم • {Math.round(distance * 2.5)} دقيقة
          </Text>
        </View>
        
        <View style={styles.priceRange}>
          <Text style={styles.priceRangeText}>
            {getCheapestPrice().toFixed(1)} - {getMostExpensivePrice().toFixed(1)} درهم
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.vehicleList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.vehicleListContent}
      >
        {pricing.map((vehicle) => (
          <TouchableOpacity
            key={vehicle.id}
            style={[
              styles.vehicleCard,
              selectedVehicle?.id === vehicle.id && styles.selectedVehicleCard
            ]}
            onPress={() => handleVehicleSelect(vehicle)}
            activeOpacity={0.7}
          >
            <View style={styles.vehicleInfo}>
              <View style={styles.vehicleHeader}>
                <View style={[styles.vehicleIcon, { backgroundColor: vehicle.color + '20' }]}>
                  <Ionicons 
                    name={vehicle.icon as any} 
                    size={24} 
                    color={vehicle.color} 
                  />
                </View>
                <View style={styles.vehicleDetails}>
                  <Text style={styles.vehicleName}>{vehicle.name}</Text>
                  <Text style={styles.vehicleDescription}>{vehicle.description}</Text>
                </View>
              </View>

              <View style={styles.vehicleFeatures}>
                <View style={styles.featureItem}>
                  <Ionicons 
                    name={getFuelTypeIcon(vehicle.fuelType)} 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.featureText}>
                    {getFuelTypeLabel(vehicle.fuelType)}
                  </Text>
                </View>
                
                <View style={styles.featureItem}>
                  <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.featureText}>
                    {vehicle.estimatedTime} دقيقة
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.vehiclePrice}>
                {vehicle.estimatedPrice?.toFixed(1)} درهم
              </Text>
              {vehicle.fuelType !== 'gasoline' && (
                <Text style={styles.discountText}>
                  {vehicle.fuelType === 'electric' ? 'خصم كهربائي' : 'خصم هايبرد'}
                </Text>
              )}
            </View>

            {selectedVehicle?.id === vehicle.id && (
              <View style={styles.selectedIndicator}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedVehicle && (
        <View style={styles.bookingSection}>
          <View style={styles.selectedVehicleInfo}>
            <View style={styles.selectedVehicleHeader}>
              <Ionicons 
                name={selectedVehicle.icon as any} 
                size={20} 
                color={selectedVehicle.color} 
              />
              <Text style={styles.selectedVehicleText}>
                {selectedVehicle.name} • {selectedVehicle.estimatedPrice?.toFixed(1)} درهم
              </Text>
            </View>
            
            <Text style={styles.estimatedTime}>
              الوصول خلال {selectedVehicle.estimatedTime} دقيقة تقريباً
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.requestButton,
              isRequesting && styles.requestButtonDisabled
            ]}
            onPress={handleRequestTaxi}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <View style={styles.requestButtonContent}>
                <Text style={styles.requestButtonText}>جاري الطلب...</Text>
              </View>
            ) : (
              <View style={styles.requestButtonContent}>
                <Ionicons name="car" size={20} color="#fff" />
                <Text style={styles.requestButtonText}>طلب تاكسي الآن</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#dee2e6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  routeSummary: {
    marginBottom: 10,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  routeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  priceRange: {
    alignItems: 'center',
  },
  priceRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  vehicleList: {
    flex: 1,
  },
  vehicleListContent: {
    padding: 20,
    paddingBottom: 10,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedVehicleCard: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleIcon: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  vehicleDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  vehicleFeatures: {
    flexDirection: 'row',
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  vehiclePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  discountText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  bookingSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  selectedVehicleInfo: {
    marginBottom: 15,
  },
  selectedVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  selectedVehicleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  estimatedTime: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  requestButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
