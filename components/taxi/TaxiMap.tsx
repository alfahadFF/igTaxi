import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

interface TaxiLocation {
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

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
}

interface TaxiMapProps {
  onLocationSelected: (pickup: TaxiLocation, destination: TaxiLocation) => void;
  onPriceCalculated: (pricing: any) => void;
}

export default function TaxiMap({ onLocationSelected, onPriceCalculated }: TaxiMapProps) {
  const [currentLocation, setCurrentLocation] = useState<TaxiLocation | null>(null);
  const [pickupLocation, setPickupLocation] = useState<TaxiLocation | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<TaxiLocation | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [isSelectingDestination, setIsSelectingDestination] = useState(false);
  const [isSelectingPickup, setIsSelectingPickup] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  
  const mapRef = useRef<any>(null);
  const bottomSheetAnimation = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();

  const vehicleTypes: VehicleType[] = [
    {
      id: 'economy',
      name: 'اقتصادي',
      description: 'سيارة صغيرة - 4 ركاب',
      basePrice: 5.0,
      pricePerKm: 1.5,
      pricePerMinute: 0.25,
      icon: 'car',
      fuelType: 'gasoline',
      color: '#2ecc71'
    },
    {
      id: 'comfort',
      name: 'مريح',
      description: 'سيارة متوسطة - 4 ركاب',
      basePrice: 8.0,
      pricePerKm: 2.0,
      pricePerMinute: 0.35,
      icon: 'car-sport',
      fuelType: 'gasoline',
      color: '#3498db'
    },
    {
      id: 'premium',
      name: 'فاخر',
      description: 'سيارة فاخرة - 4 ركاب',
      basePrice: 15.0,
      pricePerKm: 3.5,
      pricePerMinute: 0.60,
      icon: 'diamond',
      fuelType: 'gasoline',
      color: '#9b59b6'
    },
    {
      id: 'xl',
      name: 'كبير',
      description: 'سيارة كبيرة - 6 ركاب',
      basePrice: 12.0,
      pricePerKm: 2.8,
      pricePerMinute: 0.45,
      icon: 'bus',
      fuelType: 'gasoline',
      color: '#e67e22'
    },
    {
      id: 'hybrid',
      name: 'هايبرد',
      description: 'سيارة صديقة للبيئة - 4 ركاب',
      basePrice: 7.0,
      pricePerKm: 1.8,
      pricePerMinute: 0.30,
      icon: 'leaf',
      fuelType: 'hybrid',
      color: '#27ae60'
    },
    {
      id: 'electric',
      name: 'كهربائي',
      description: 'سيارة كهربائية - 4 ركاب',
      basePrice: 10.0,
      pricePerKm: 2.2,
      pricePerMinute: 0.40,
      icon: 'flash',
      fuelType: 'electric',
      color: '#f39c12'
    }
  ];

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (pickupLocation && destinationLocation) {
      calculateRoute();
    }
  }, [pickupLocation, destinationLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن مطلوب', 'نحتاج إذن الوصول للموقع لتحديد موقعك الحالي');
        setLoading(false);
        return;
      }

      setLocationPermission(true);
      getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('خطأ', 'حدث خطأ في طلب إذن الموقع');
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentLoc: TaxiLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        title: 'موقعي الحالي',
        description: 'نقطة الانطلاق'
      };

      setCurrentLocation(currentLoc);
      setPickupLocation(currentLoc);

      const initialRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

      setRegion(initialRegion);
      setLoading(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديد موقعك الحالي');
      setLoading(false);
    }
  };

  const calculateRoute = async () => {
    if (!pickupLocation || !destinationLocation) return;

    try {
      // محاكاة حساب المسار (في التطبيق الحقيقي استخدم Google Directions API)
      const lat1 = pickupLocation.latitude;
      const lon1 = pickupLocation.longitude;
      const lat2 = destinationLocation.latitude;
      const lon2 = destinationLocation.longitude;

      // حساب المسافة باستخدام Haversine formula
      const R = 6371; // نصف قطر الأرض بالكيلومتر
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const calculatedDistance = R * c;

      setDistance(calculatedDistance);
      setDuration(calculatedDistance * 2.5); // تقدير الوقت: 2.5 دقيقة لكل كيلومتر

      // إنشاء خط مستقيم بين النقطتين (في التطبيق الحقيقي استخدم المسار الفعلي)
      const coordinates = [
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
      ];
      setRouteCoordinates(coordinates);

      // حساب التسعير لجميع أنواع السيارات
      const pricing = vehicleTypes.map(vehicle => ({
        ...vehicle,
        estimatedPrice: calculatePrice(vehicle, calculatedDistance, calculatedDistance * 2.5),
        estimatedTime: Math.round(calculatedDistance * 2.5)
      }));

      onPriceCalculated(pricing);
      onLocationSelected(pickupLocation, destinationLocation);

      // تحريك الخريطة لإظهار المسار كاملاً
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }

      showBottomSheet();
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('خطأ', 'حدث خطأ في حساب المسار');
    }
  };

  const calculatePrice = (vehicle: VehicleType, distanceKm: number, durationMinutes: number): number => {
    const basePrice = vehicle.basePrice;
    const distancePrice = distanceKm * vehicle.pricePerKm;
    const timePrice = durationMinutes * vehicle.pricePerMinute;
    
    // إضافة رسوم إضافية حسب نوع الوقود
    let fuelSurcharge = 0;
    if (vehicle.fuelType === 'hybrid') {
      fuelSurcharge = -0.5; // خصم للسيارات الهايبرد
    } else if (vehicle.fuelType === 'electric') {
      fuelSurcharge = -1.0; // خصم أكبر للسيارات الكهربائية
    }

    return Math.max(basePrice + distancePrice + timePrice + fuelSurcharge, basePrice);
  };

  const showBottomSheet = () => {
    Animated.spring(bottomSheetAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideBottomSheet = () => {
    Animated.spring(bottomSheetAnimation, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleMapPress = async (event: any) => {
    const coordinate = event.nativeEvent.coordinate;
    
    try {
      // الحصول على اسم المكان (في التطبيق الحقيقي استخدم Geocoding API)
      const locationName = `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
      
      const newLocation: TaxiLocation = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        title: locationName,
      };

      if (isSelectingPickup) {
        setPickupLocation(newLocation);
        setIsSelectingPickup(false);
      } else if (isSelectingDestination) {
        setDestinationLocation(newLocation);
        setIsSelectingDestination(false);
      } else if (!destinationLocation) {
        // إذا لم يكن هناك وجهة محددة، اجعل النقر يحدد الوجهة
        setDestinationLocation(newLocation);
      }
    } catch (error) {
      console.error('Error handling map press:', error);
    }
  };

  const resetSelection = () => {
    setDestinationLocation(null);
    setRouteCoordinates([]);
    setDistance(0);
    setDuration(0);
    hideBottomSheet();
  };

  const useCurrentLocationAsPickup = () => {
    if (currentLocation) {
      setPickupLocation(currentLocation);
      setIsSelectingPickup(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحديد موقعك...</Text>
      </View>
    );
  }

  if (!locationPermission || !region) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>الموقع غير متاح</Text>
        <Text style={styles.errorSubtitle}>
          يرجى السماح بالوصول للموقع لاستخدام خدمة التاكسي
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحديد موقعك...</Text>
      </View>
    );
  }

  if (!locationPermission || !region) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-outline" size={64} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>الموقع غير متاح</Text>
        <Text style={styles.errorSubtitle}>
          يرجى السماح بالوصول للموقع لاستخدام خدمة التاكسي
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
          <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onPress={handleMapPress}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        mapType="standard"
      >
        {/* نقطة الانطلاق */}
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title={pickupLocation.title}
            description={pickupLocation.description}
            pinColor={colors.success}
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="radio-button-on" size={20} color="#fff" />
            </View>
          </Marker>
        )}

        {/* نقطة الوصول */}
        {destinationLocation && (
          <Marker
            coordinate={destinationLocation}
            title={destinationLocation.title}
            description="نقطة الوصول"
            pinColor={colors.error}
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={20} color="#fff" />
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

      {/* أزرار التحكم */}
      <View style={styles.controlsContainer}>
        {/* زر موقعي الحالي */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={useCurrentLocationAsPickup}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>

        {/* زر إعادة تعيين */}
        {destinationLocation && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetSelection}
          >
            <Ionicons name="refresh" size={24} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* مؤشرات الاختيار */}
      <View style={styles.instructionsContainer}>
        {!destinationLocation && (
          <View style={styles.instructionCard}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.instructionText}>اضغط على الخريطة لتحديد وجهتك</Text>
          </View>
        )}

        {isSelectingPickup && (
          <View style={[styles.instructionCard, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="radio-button-on" size={20} color={colors.success} />
            <Text style={[styles.instructionText, { color: colors.success }]}>
              اضغط لتحديد نقطة الانطلاق
            </Text>
          </View>
        )}

        {isSelectingDestination && (
          <View style={[styles.instructionCard, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="location" size={20} color={colors.error} />
            <Text style={[styles.instructionText, { color: colors.error }]}>
              اضغط لتحديد نقطة الوصول
            </Text>
          </View>
        )}
      </View>

      {/* أزرار تغيير النقاط */}
      <View style={styles.addressContainer}>
        <TouchableOpacity
          style={styles.addressButton}
          onPress={() => setIsSelectingPickup(true)}
        >
          <View style={styles.addressIcon}>
            <Ionicons name="radio-button-on" size={16} color={colors.success} />
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.addressLabel}>من</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {pickupLocation?.title || 'تحديد نقطة الانطلاق'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.addressDivider} />

        <TouchableOpacity
          style={styles.addressButton}
          onPress={() => setIsSelectingDestination(true)}
        >
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={16} color={colors.error} />
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.addressLabel}>إلى</Text>
            <Text style={styles.addressText} numberOfLines={1}>
              {destinationLocation?.title || 'تحديد الوجهة'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* معلومات المسار */}
      {distance > 0 && (
        <View style={styles.routeInfoContainer}>
          <View style={styles.routeInfoItem}>
            <Ionicons name="navigate" size={20} color={colors.primary} />
            <Text style={styles.routeInfoText}>
              {distance.toFixed(1)} كم
            </Text>
          </View>
          <View style={styles.routeInfoItem}>
            <Ionicons name="time" size={20} color={colors.primary} />
            <Text style={styles.routeInfoText}>
              {Math.round(duration)} دقيقة
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
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
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    gap: 10,
  },
  locationButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  resetButton: {
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 80,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  addressContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  addressIcon: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  addressDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 15,
  },
  routeInfoContainer: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    flexDirection: 'row',
    gap: 15,
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  routeInfoText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 5,
  },
  pickupMarker: {
    width: 30,
    height: 30,
    backgroundColor: colors.success,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  destinationMarker: {
    width: 30,
    height: 30,
    backgroundColor: colors.error,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
});
