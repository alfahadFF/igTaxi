import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import MapView, { Marker, Polyline } from 'react-native-maps';

// تعريف الأنواع
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

const { width, height } = Dimensions.get('window');

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

interface TripStatus {
  status: string;
  estimatedArrival?: number;
  driverLocation?: DriverLocation;
  driverInfo?: {
    name: string;
    phone: string;
    avatar?: string;
    rating: number;
    vehicleType: string;
    plateNumber?: string;
  };
}

export default function TripTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [tripStatus, setTripStatus] = useState<TripStatus>({ status: 'searching' });
  const [region, setRegion] = useState<Region | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<DriverLocation | null>(null);
  const [requestId, setRequestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<any>(null);
  const statusAnimation = useRef(new Animated.Value(0)).current;

  const statusMessages = {
    searching: 'جاري البحث عن سائق...',
    driver_notified: 'تم إشعار السائقين القريبين...',
    driver_assigned: 'تم العثور على سائق!',
    driver_arrived: 'وصل السائق إلى موقعك',
    trip_started: 'بدأت الرحلة',
    trip_completed: 'انتهت الرحلة بنجاح',
    cancelled: 'تم إلغاء الرحلة',
    rejected: 'لم يتم العثور على سائق متاح'
  };

  const statusColors = {
    searching: '#f39c12',
    driver_notified: '#f39c12',
    driver_assigned: '#27ae60',
    driver_arrived: '#2ecc71',
    trip_started: '#3498db',
    trip_completed: '#27ae60',
    cancelled: '#e74c3c',
    rejected: '#e74c3c'
  };

  useEffect(() => {
    setupInitialState();
    subscribeTripUpdates();
    startLocationTracking();

    return () => {
      // تنظيف الاشتراكات
    };
  }, []);

  const setupInitialState = async () => {
    try {
      if (params.pickupLat && params.pickupLng) {
        const initialRegion: Region = {
          latitude: parseFloat(params.pickupLat as string),
          longitude: parseFloat(params.pickupLng as string),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(initialRegion);

        // إنشاء المسار الأولي
        if (params.destinationLat && params.destinationLng) {
          const coordinates = [
            {
              latitude: parseFloat(params.pickupLat as string),
              longitude: parseFloat(params.pickupLng as string)
            },
            {
              latitude: parseFloat(params.destinationLat as string),
              longitude: parseFloat(params.destinationLng as string)
            }
          ];
          setRouteCoordinates(coordinates);
        }
      }

      // محاكاة إنشاء طلب جديد (في التطبيق الحقيقي سيتم من صفحة التاكسي)
      const mockRequestId = Math.floor(Math.random() * 1000) + 1000;
      setRequestId(mockRequestId);
      setLoading(false);

      // محاكاة تقدم الحالات
      simulateTripProgress();
    } catch (error) {
      console.error('Error setting up initial state:', error);
      setLoading(false);
    }
  };

  const simulateTripProgress = () => {
    // محاكاة تقدم حالات الرحلة
    const statuses = ['searching', 'driver_notified', 'driver_assigned', 'driver_arrived', 'trip_started'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < statuses.length) {
        const newStatus = statuses[currentIndex];
        setTripStatus({
          status: newStatus,
          estimatedArrival: newStatus === 'driver_assigned' ? 5 : undefined,
          driverInfo: newStatus === 'driver_assigned' ? {
            name: 'أحمد محمد',
            phone: '+971501234567',
            rating: 4.8,
            vehicleType: 'تويوتا كامري أبيض',
            plateNumber: 'دبي 12345'
          } : undefined,
          driverLocation: newStatus === 'driver_assigned' ? {
            latitude: parseFloat(params.pickupLat as string) + 0.005,
            longitude: parseFloat(params.pickupLng as string) + 0.005,
            heading: 45,
            speed: 30
          } : undefined
        });

        animateStatusChange();
        currentIndex++;

        if (newStatus === 'trip_started') {
          clearInterval(interval);
          // بدء محاكاة حركة السائق
          simulateDriverMovement();
        }
      }
    }, 3000);
  };

  const simulateDriverMovement = () => {
    // محاكاة حركة السائق أثناء الرحلة
    const startLat = parseFloat(params.pickupLat as string);
    const startLng = parseFloat(params.pickupLng as string);
    const endLat = parseFloat(params.destinationLat as string);
    const endLng = parseFloat(params.destinationLng as string);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      
      if (progress >= 1) {
        clearInterval(interval);
        setTripStatus(prev => ({ ...prev, status: 'trip_completed' }));
        return;
      }

      const currentLat = startLat + (endLat - startLat) * progress;
      const currentLng = startLng + (endLng - startLng) * progress;

      setTripStatus(prev => ({
        ...prev,
        driverLocation: {
          latitude: currentLat,
          longitude: currentLng,
          heading: calculateBearing(prev.driverLocation?.latitude || startLat, prev.driverLocation?.longitude || startLng, currentLat, currentLng),
          speed: 25 + Math.random() * 10
        }
      }));

      // تحديث المنطقة المرئية لتتبع السائق
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: currentLat,
          longitude: currentLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    }, 2000);
  };

  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const subscribeTripUpdates = () => {
    // في التطبيق الحقيقي، اشترك في تحديثات الطلب من Supabase
    // const subscription = supabase
    //   .channel('taxi_requests')
    //   .on('postgres_changes', {
    //     event: 'UPDATE',
    //     schema: 'public',
    //     table: 'taxi_requests',
    //     filter: `id=eq.${requestId}`
    //   }, (payload) => {
    //     // تحديث حالة الرحلة
    //   })
    //   .subscribe();
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const animateStatusChange = () => {
    Animated.sequence([
      Animated.timing(statusAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(statusAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleCancelTrip = () => {
    Alert.alert(
      'إلغاء الرحلة',
      'هل أنت متأكد من إلغاء هذه الرحلة؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم',
          style: 'destructive',
          onPress: () => {
            setTripStatus({ status: 'cancelled' });
            setTimeout(() => router.back(), 2000);
          }
        }
      ]
    );
  };

  const handleCallDriver = () => {
    if (tripStatus.driverInfo?.phone) {
      Alert.alert(
        'اتصال بالسائق',
        `هل تريد الاتصال بـ ${tripStatus.driverInfo.name}؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'اتصال', onPress: () => console.log('Calling driver...') }
        ]
      );
    }
  };

  const handleMessageDriver = () => {
    if (tripStatus.driverInfo) {
      // فتح شاشة المحادثة (يمكن إنشاؤها لاحقاً)
      Alert.alert('رسالة للسائق', 'سيتم إضافة هذه الميزة قريباً');
    }
  };

  if (loading || !region) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري تحضير الرحلة...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع الرحلة</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={tripStatus.status === 'searching' || tripStatus.status === 'driver_notified'}
        >
          {/* نقطة الانطلاق */}
          <Marker
            coordinate={{
              latitude: parseFloat(params.pickupLat as string),
              longitude: parseFloat(params.pickupLng as string)
            }}
            title="نقطة الانطلاق"
            pinColor={colors.success}
          />

          {/* نقطة الوصول */}
          {params.destinationLat && params.destinationLng && (
            <Marker
              coordinate={{
                latitude: parseFloat(params.destinationLat as string),
                longitude: parseFloat(params.destinationLng as string)
              }}
              title="نقطة الوصول"
              pinColor={colors.error}
            />
          )}

          {/* موقع السائق */}
          {tripStatus.driverLocation && (
            <Marker
              coordinate={tripStatus.driverLocation}
              title="السائق"
              rotation={tripStatus.driverLocation.heading}
            >
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {/* خط المسار */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>
      </View>

      {/* بطاقة حالة الرحلة */}
      <Animated.View
        style={[
          styles.statusCard,
          {
            transform: [{
              scale: statusAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05]
              })
            }]
          }
        ]}
      >
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: statusColors[tripStatus.status as keyof typeof statusColors] }
            ]}
          />
          <Text style={styles.statusText}>
            {statusMessages[tripStatus.status as keyof typeof statusMessages]}
          </Text>
        </View>

        {tripStatus.estimatedArrival && (
          <Text style={styles.estimatedTime}>
            الوصول خلال {tripStatus.estimatedArrival} دقائق تقريباً
          </Text>
        )}

        {tripStatus.driverInfo && (
          <View style={styles.driverInfo}>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{tripStatus.driverInfo.name}</Text>
              <Text style={styles.driverVehicle}>{tripStatus.driverInfo.vehicleType}</Text>
              <Text style={styles.plateNumber}>{tripStatus.driverInfo.plateNumber}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#f39c12" />
                <Text style={styles.rating}>{tripStatus.driverInfo.rating}</Text>
              </View>
            </View>

            <View style={styles.driverActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver}>
                <Ionicons name="call" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleMessageDriver}>
                <Ionicons name="chatbubble" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {(tripStatus.status === 'searching' || tripStatus.status === 'driver_notified') && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTrip}>
            <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
          </TouchableOpacity>
        )}

        {tripStatus.status === 'trip_completed' && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => router.push('/trips/rating')}
          >
            <Text style={styles.completeButtonText}>تقييم الرحلة</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
  },
  webSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  tripDetails: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    minWidth: 300,
  },
  tripId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  helpButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  statusCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  estimatedTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  driverVehicle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  plateNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 5,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 45,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#fee',
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webMapContainer: {
    height: 300,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 500,
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    margin: 5,
    width: '45%',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
