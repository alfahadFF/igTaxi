import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { MapPin, Navigation, X } from 'lucide-react-native';
import { MapViewComponentProps, Coordinates } from './types';

// استيراد مشروط فقط للجوال
let MapView: any, Marker: any, PROVIDER_GOOGLE: any;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (error) {
  // في حالة عدم توفر react-native-maps، استخدم المكون البديل
  console.log('react-native-maps not available, using fallback');
}

// Mock nearby drivers data
const mockDrivers = [
  { id: '1', latitude: 25.276987, longitude: 55.296249, type: 'taxi' },
  { id: '2', latitude: 25.275123, longitude: 55.297890, type: 'taxi' },
  { id: '3', latitude: 25.278432, longitude: 55.294567, type: 'transport' },
  { id: '4', latitude: 25.274567, longitude: 55.299012, type: 'taxi' },
];

export default function MapViewComponent({
  onLocationSelect,
  initialLocation,
  showNearbyDrivers = false,
  onClose,
  style,
  showLocationPicker = false,
  selectedLocation: propSelectedLocation,
}: MapViewComponentProps) {
  const { t } = useTranslation();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(propSelectedLocation || null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation);
    } else {
      getCurrentLocation();
    }
  }, [initialLocation]);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Error getting location');
      // استخدام موقع افتراضي (عمان، الأردن)
      setLocation({
        latitude: 31.9539,
        longitude: 35.9106,
      });
    }
  };

  const handleMapPress = (event: any) => {
    if (showLocationPicker && event.nativeEvent && event.nativeEvent.coordinate) {
      const coordinate = event.nativeEvent.coordinate;
      setSelectedLocation(coordinate);
      onLocationSelect?.(coordinate);
    }
  };

  const handleGetCurrentLocation = () => {
    getCurrentLocation();
  };

  // إذا لم تكن react-native-maps متاحة، استخدم المكون البديل
  if (!MapView) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.fallbackContainer}>
          <MapPin size={48} color="#F5B800" />
          <Text style={styles.fallbackTitle}>خريطة تفاعلية</Text>
          <Text style={styles.fallbackText}>
            الخريطة التفاعلية غير متاحة حالياً.
            {showLocationPicker && ' يمكنك اختيار موقع تجريبي بدلاً من ذلك.'}
          </Text>
          
          {selectedLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationText}>
                الموقع المحدد: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {showLocationPicker && (
            <TouchableOpacity 
              style={styles.pickLocationButton} 
              onPress={() => {
                const mockLocation = {
                  latitude: 31.9566 + (Math.random() - 0.5) * 0.1,
                  longitude: 35.9457 + (Math.random() - 0.5) * 0.1
                };
                setSelectedLocation(mockLocation);
                onLocationSelect?.(mockLocation);
              }}
            >
              <MapPin size={16} color="#fff" />
              <Text style={styles.pickLocationText}>اختر موقع تجريبي</Text>
            </TouchableOpacity>
          )}
          
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#333" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // حساب المنطقة للخريطة
  const mapRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
      }
    : {
        latitude: 31.9539,
        longitude: 35.9106,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
      };

  return (
    <View style={[styles.container, style]}>
      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : (
        <>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={mapRegion}
            onPress={handleMapPress}
          >
            {location && (
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="Your Location"
                pinColor="#3498db"
              >
                <View style={styles.userMarker}>
                  <MapPin size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {selectedLocation && (
              <Marker
                coordinate={{
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                }}
                title="Selected Location"
                pinColor="#F5B800"
              >
                <View style={styles.selectedMarker}>
                  <MapPin size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {showNearbyDrivers && mockDrivers.map((driver) => (
              <Marker
                key={driver.id}
                coordinate={{
                  latitude: driver.latitude,
                  longitude: driver.longitude,
                }}
                title={`Driver ${driver.id}`}
                pinColor={driver.type === 'taxi' ? '#F5B800' : '#4CAF50'}
              >
                <View style={[
                  styles.driverMarker,
                  { backgroundColor: driver.type === 'taxi' ? '#F5B800' : '#4CAF50' }
                ]}>
                  <Text style={styles.driverMarkerText}>🚗</Text>
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Controls */}
          <View style={styles.controls}>
            {onClose && (
              <TouchableOpacity style={styles.controlButton} onPress={onClose}>
                <X size={20} color="#333" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={handleGetCurrentLocation}
            >
              <Navigation size={20} color="#333" />
            </TouchableOpacity>
          </View>

          {showLocationPicker && (
            <View style={styles.locationPickerInfo}>
              <Text style={styles.locationPickerText}>
                اضغط على الخريطة لتحديد الموقع
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  map: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#e74c3c',
    textAlign: 'center',
    margin: 20,
  },
  controls: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    padding: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locationPickerInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(245, 184, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
  },
  locationPickerText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
  userMarker: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  selectedMarker: {
    backgroundColor: '#F5B800',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarker: {
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarkerText: {
    fontSize: 16,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    textAlign: 'center',
    maxWidth: 400,
    lineHeight: 24,
    marginBottom: 20,
  },
  locationInfo: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#4CAF50',
    textAlign: 'center',
  },
  pickLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5B800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    marginBottom: 12,
  },
  pickLocationText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});