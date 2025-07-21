import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import Header from '../../components/layout/Header';
import TaxiMap from '../../components/taxi/TaxiMap';
import VehicleSelection from '../../components/taxi/VehicleSelection';
import Colors from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

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
  estimatedPrice?: number;
  estimatedTime?: number;
}

export default function TaxiScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [pickup, setPickup] = useState<TaxiLocation | null>(null);
  const [destination, setDestination] = useState<TaxiLocation | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [pricing, setPricing] = useState<VehicleType[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [showVehicleSelection, setShowVehicleSelection] = useState(false);

  useEffect(() => {
    if (!user) {
      Alert.alert(
        'تسجيل الدخول مطلوب',
        'يجب تسجيل الدخول أولاً لاستخدام خدمة التاكسي',
        [
          { text: 'إلغاء', onPress: () => router.back() },
          { text: 'تسجيل الدخول', onPress: () => router.push('/auth/login') }
        ]
      );
    }
  }, [user]);

  const handleLocationSelected = (pickupLocation: TaxiLocation, destinationLocation: TaxiLocation) => {
    setPickup(pickupLocation);
    setDestination(destinationLocation);
    
    // حساب المسافة
    const calculatedDistance = calculateDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      destinationLocation.latitude,
      destinationLocation.longitude
    );
    setDistance(calculatedDistance);
    setShowVehicleSelection(true);
  };

  const handlePriceCalculated = (vehiclePricing: VehicleType[]) => {
    setPricing(vehiclePricing);
  };

  const handleVehicleSelected = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
  };

  const handleRequestTaxi = (vehicle: VehicleType, notes?: string) => {
    // إعادة توجيه لشاشة تتبع الرحلة
    router.push({
      pathname: '/trips/tracking',
      params: {
        vehicleType: vehicle.id,
        pickupLat: pickup?.latitude,
        pickupLng: pickup?.longitude,
        destinationLat: destination?.latitude,
        destinationLng: destination?.longitude,
        estimatedPrice: vehicle.estimatedPrice,
        notes: notes
      }
    });
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

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري التحقق من تسجيل الدخول...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header title="طلب تاكسي" showBackButton={true} />
      
      <View style={styles.mapContainer}>
        <TaxiMap
          onLocationSelected={handleLocationSelected}
          onPriceCalculated={handlePriceCalculated}
        />
      </View>

      {showVehicleSelection && pickup && destination && pricing.length > 0 && (
        <VehicleSelection
          pricing={pricing}
          pickup={pickup}
          destination={destination}
          distance={distance}
          onVehicleSelected={handleVehicleSelected}
          onRequestTaxi={handleRequestTaxi}
        />
      )}
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
  mapContainer: {
    flex: 1,
  },
});
