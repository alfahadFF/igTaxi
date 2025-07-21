import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';

interface SmartMapProps {
  origin?: {
    latitude: number;
    longitude: number;
  };
  destination?: {
    latitude: number;
    longitude: number;
  };
  showTraffic?: boolean;
  showAlternativeRoutes?: boolean;
  onRouteSelect?: (route: any) => void;
  driverLocation?: {
    latitude: number;
    longitude: number;
  };
  landmarks?: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: 'hospital' | 'police' | 'gas_station' | 'landmark';
  }>;
}

export const SmartMap: React.FC<SmartMapProps> = ({
  origin,
  destination,
  showTraffic = true,
  showAlternativeRoutes = true,
  onRouteSelect,
  driverLocation,
  landmarks = [],
}) => {
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number>(0);
  const [trafficEnabled, setTrafficEnabled] = useState(showTraffic);
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (origin && destination && mapReady) {
      calculateRoutes();
    }
  }, [origin, destination, mapReady]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يحتاج التطبيق إلى صلاحية الموقع لعرض الخريطة');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);

      // تحديث الخريطة للتركيز على الموقع الحالي
      if (mapRef.current && !origin) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error) {
      console.error('خطأ في الحصول على الموقع:', error);
    }
  };

  const calculateRoutes = async () => {
    if (!origin || !destination) return;

    setLoading(true);
    try {
      // في التطبيق الحقيقي، ستستخدم Google Directions API
      // هنا سنستخدم بيانات تجريبية للعرض
      const mockRoutes = [
        {
          id: 1,
          name: 'المسار الأسرع',
          duration: '15 دقيقة',
          distance: '8.5 كم',
          traffic: 'متوسط',
          coordinates: generateMockRoute(origin, destination, 0.1),
          color: Colors.light.primary,
          tollRoad: false,
        },
        {
          id: 2,
          name: 'تجنب الازدحام',
          duration: '18 دقيقة',
          distance: '9.2 كم',
          traffic: 'خفيف',
          coordinates: generateMockRoute(origin, destination, 0.15),
          color: Colors.light.secondary,
          tollRoad: false,
        },
        {
          id: 3,
          name: 'الطريق السريع',
          duration: '12 دقيقة',
          distance: '11.3 كم',
          traffic: 'كثيف',
          coordinates: generateMockRoute(origin, destination, 0.2),
          color: Colors.light.accent,
          tollRoad: true,
        },
      ];

      setRoutes(mockRoutes);
      
      // التركيز على المسار المختار
      if (mapRef.current) {
        const coordinates = [origin, destination];
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('خطأ في حساب المسارات:', error);
      Alert.alert('خطأ', 'لا يمكن حساب المسار. تحقق من الاتصال بالإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockRoute = (start: any, end: any, variation: number) => {
    const points = [];
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = start.latitude + (end.latitude - start.latitude) * ratio;
      const lng = start.longitude + (end.longitude - start.longitude) * ratio;
      
      // إضافة تنويع للمسار
      const varLat = lat + (Math.random() - 0.5) * variation;
      const varLng = lng + (Math.random() - 0.5) * variation;
      
      points.push({
        latitude: varLat,
        longitude: varLng,
      });
    }
    
    return points;
  };

  const selectRoute = (routeIndex: number) => {
    setSelectedRoute(routeIndex);
    if (onRouteSelect && routes[routeIndex]) {
      onRouteSelect(routes[routeIndex]);
    }
  };

  const toggleTraffic = () => {
    setTrafficEnabled(!trafficEnabled);
  };

  const zoomToFit = () => {
    if (!mapRef.current) return;

    const coordinates = [];
    if (origin) coordinates.push(origin);
    if (destination) coordinates.push(destination);
    if (driverLocation) coordinates.push(driverLocation);

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const getLandmarkIcon = (type: string) => {
    switch (type) {
      case 'hospital': return 'medical';
      case 'police': return 'shield';
      case 'gas_station': return 'car';
      case 'landmark': return 'location';
      default: return 'location';
    }
  };

  const getLandmarkColor = (type: string) => {
    switch (type) {
      case 'hospital': return '#e74c3c';
      case 'police': return '#3498db';
      case 'gas_station': return '#f39c12';
      case 'landmark': return '#9b59b6';
      default: return Colors.light.text;
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={trafficEnabled}
        showsBuildings={true}
        showsIndoors={true}
        onMapReady={() => setMapReady(true)}
        initialRegion={{
          latitude: userLocation?.coords.latitude || 24.7136,
          longitude: userLocation?.coords.longitude || 46.6753,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* نقطة البداية */}
        {origin && (
          <Marker coordinate={origin} title="نقطة البداية">
            <View style={styles.originMarker}>
              <Ionicons name="radio-button-on" size={20} color={Colors.light.success} />
            </View>
          </Marker>
        )}

        {/* نقطة الوصول */}
        {destination && (
          <Marker coordinate={destination} title="نقطة الوصول">
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={24} color={Colors.light.error} />
            </View>
          </Marker>
        )}

        {/* موقع السائق */}
        {driverLocation && (
          <Marker coordinate={driverLocation} title="السائق">
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={20} color={Colors.light.background} />
            </View>
          </Marker>
        )}

        {/* المعالم المهمة */}
        {landmarks.map((landmark) => (
          <Marker
            key={landmark.id}
            coordinate={{
              latitude: landmark.latitude,
              longitude: landmark.longitude,
            }}
            title={landmark.name}
          >
            <View style={[styles.landmarkMarker, { backgroundColor: getLandmarkColor(landmark.type) }]}>
              <Ionicons 
                name={getLandmarkIcon(landmark.type) as any} 
                size={16} 
                color={Colors.light.background} 
              />
            </View>
          </Marker>
        ))}

        {/* المسارات */}
        {routes.map((route, index) => (
          <Polyline
            key={route.id}
            coordinates={route.coordinates}
            strokeColor={index === selectedRoute ? route.color : '#cccccc'}
            strokeWidth={index === selectedRoute ? 4 : 2}
            onPress={() => selectRoute(index)}
          />
        ))}
      </MapView>

      {/* أزرار التحكم */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleTraffic}>
          <Ionicons 
            name="car" 
            size={20} 
            color={trafficEnabled ? Colors.light.primary : Colors.light.text} 
          />
          <Text style={[styles.controlText, { color: trafficEnabled ? Colors.light.primary : Colors.light.text }]}>
            المرور
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={zoomToFit}>
          <Ionicons name="expand" size={20} color={Colors.light.text} />
          <Text style={styles.controlText}>تكبير</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={getCurrentLocation}>
          <Ionicons name="locate" size={20} color={Colors.light.text} />
          <Text style={styles.controlText}>موقعي</Text>
        </TouchableOpacity>
      </View>

      {/* معلومات المسارات */}
      {routes.length > 0 && showAlternativeRoutes && (
        <View style={styles.routesContainer}>
          <Text style={styles.routesTitle}>اختر المسار المناسب:</Text>
          {routes.map((route, index) => (
            <TouchableOpacity
              key={route.id}
              style={[
                styles.routeOption,
                index === selectedRoute && styles.selectedRoute
              ]}
              onPress={() => selectRoute(index)}
            >
              <View style={styles.routeInfo}>
                <Text style={styles.routeName}>{route.name}</Text>
                <View style={styles.routeDetails}>
                  <Text style={styles.routeTime}>{route.duration}</Text>
                  <Text style={styles.routeDistance}>{route.distance}</Text>
                  {route.tollRoad && (
                    <Text style={styles.tollRoad}>رسوم</Text>
                  )}
                </View>
                <Text style={[
                  styles.trafficStatus,
                  { color: getTrafficColor(route.traffic) }
                ]}>
                  الازدحام: {route.traffic}
                </Text>
              </View>
              <View style={[styles.routeIndicator, { backgroundColor: route.color }]} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* مؤشر التحميل */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>جاري حساب أفضل المسارات...</Text>
        </View>
      )}
    </View>
  );
};

const getTrafficColor = (traffic: string) => {
  switch (traffic) {
    case 'خفيف': return Colors.light.success;
    case 'متوسط': return Colors.light.warning;
    case 'كثيف': return Colors.light.error;
    default: return Colors.light.text;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  controlButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  controlText: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  originMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.success,
  },
  destinationMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.error,
  },
  driverMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landmarkMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routesContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: 200,
  },
  routesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.light.text,
  },
  routeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedRoute: {
    backgroundColor: Colors.light.card,
    borderColor: Colors.light.primary,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  routeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  routeTime: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginRight: 12,
  },
  routeDistance: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginRight: 12,
  },
  tollRoad: {
    fontSize: 10,
    color: Colors.light.warning,
    backgroundColor: '#fff3cd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trafficStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  routeIndicator: {
    width: 4,
    height: 30,
    borderRadius: 2,
    marginLeft: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.light.background,
    marginTop: 12,
    fontSize: 16,
  },
});
