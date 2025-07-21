import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';
import { SmartMap } from './SmartMap';
import { LocationPicker } from './LocationPicker';
import { VoiceNavigation } from './VoiceNavigation';
import { TrafficInfo } from './TrafficInfo';

const { width, height } = Dimensions.get('window');

interface AdvancedNavigationProps {
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  destination?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  onNavigationStart?: (route: any) => void;
  onNavigationEnd?: () => void;
  showVoiceNavigation?: boolean;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface NavigationRoute {
  id: string;
  coordinates: Array<{
    latitude: number;
    longitude: number;
  }>;
  distance: string;
  duration: string;
  steps: NavigationStep[];
  trafficLevel: 'free' | 'light' | 'moderate' | 'heavy';
}

export const AdvancedNavigation: React.FC<AdvancedNavigationProps> = ({
  initialLocation,
  destination,
  onNavigationStart,
  onNavigationEnd,
  showVoiceNavigation = true,
}) => {
  const [currentLocation, setCurrentLocation] = useState<any>(initialLocation);
  const [selectedDestination, setSelectedDestination] = useState<any>(destination);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTrafficInfo, setShowTrafficInfo] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [remainingDistance, setRemainingDistance] = useState('');
  const [remainingTime, setRemainingTime] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mapMode, setMapMode] = useState<'standard' | 'hybrid' | 'satellite'>('standard');
  const [showCompass, setShowCompass] = useState(false);
  const [userHeading, setUserHeading] = useState(0);

  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<any>(null);

  useEffect(() => {
    initializeLocation();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (currentLocation && selectedDestination) {
      calculateRoute();
    }
  }, [currentLocation, selectedDestination]);

  const initializeLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يحتاج التطبيق إلى صلاحية الموقع للملاحة');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // بدء تتبع الموقع المستمر
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setCurrentLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });

          if (newLocation.coords.heading !== null) {
            setUserHeading(newLocation.coords.heading);
          }

          if (isNavigating) {
            checkNavigationProgress(newLocation);
          }
        }
      );
    } catch (error) {
      console.error('خطأ في تهيئة الموقع:', error);
    }
  };

  const calculateRoute = async () => {
    if (!currentLocation || !selectedDestination) return;

    try {
      // محاكاة حساب المسار
      const mockRoute: NavigationRoute = {
        id: '1',
        coordinates: [
          currentLocation,
          {
            latitude: currentLocation.latitude + 0.01,
            longitude: currentLocation.longitude + 0.005,
          },
          {
            latitude: selectedDestination.latitude - 0.005,
            longitude: selectedDestination.longitude - 0.01,
          },
          selectedDestination,
        ],
        distance: '12.5 كم',
        duration: '18 دقيقة',
        steps: [
          {
            instruction: 'اتجه شمالاً في شارع الملك فهد',
            distance: 500,
            duration: 60,
            coordinates: currentLocation,
          },
          {
            instruction: 'انعطف يميناً في طريق العروبة',
            distance: 2000,
            duration: 180,
            coordinates: {
              latitude: currentLocation.latitude + 0.01,
              longitude: currentLocation.longitude + 0.005,
            },
          },
          {
            instruction: 'استمر مستقيماً لمسافة 8 كم',
            distance: 8000,
            duration: 600,
            coordinates: {
              latitude: selectedDestination.latitude - 0.005,
              longitude: selectedDestination.longitude - 0.01,
            },
          },
          {
            instruction: 'وصلت إلى وجهتك',
            distance: 0,
            duration: 0,
            coordinates: selectedDestination,
          },
        ],
        trafficLevel: 'light',
      };

      setNavigationRoute(mockRoute);
    } catch (error) {
      console.error('خطأ في حساب المسار:', error);
      Alert.alert('خطأ', 'لا يمكن حساب المسار، تأكد من الاتصال بالإنترنت');
    }
  };

  const startNavigation = () => {
    if (!navigationRoute) return;

    setIsNavigating(true);
    setCurrentStep(0);
    setRemainingDistance(navigationRoute.distance);
    setRemainingTime(navigationRoute.duration);
    
    if (onNavigationStart) {
      onNavigationStart(navigationRoute);
    }

    // توسيط الخريطة على المسار
    if (mapRef.current && navigationRoute.coordinates.length > 1) {
      mapRef.current.fitToCoordinates(navigationRoute.coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  };

  const stopNavigation = () => {
    setIsNavigating(false);
    setCurrentStep(0);
    setRemainingDistance('');
    setRemainingTime('');
    
    if (onNavigationEnd) {
      onNavigationEnd();
    }
  };

  const checkNavigationProgress = (newLocation: any) => {
    if (!navigationRoute || !isNavigating) return;

    // حساب المسافة إلى النقطة التالية
    const nextStep = navigationRoute.steps[currentStep];
    if (!nextStep) return;

    const distance = calculateDistance(
      newLocation.coords.latitude,
      newLocation.coords.longitude,
      nextStep.coordinates.latitude,
      nextStep.coordinates.longitude
    );

    // إذا وصل إلى النقطة التالية (أقل من 50 متر)
    if (distance < 0.05) {
      const nextStepIndex = currentStep + 1;
      if (nextStepIndex < navigationRoute.steps.length) {
        setCurrentStep(nextStepIndex);
      } else {
        // وصل إلى الوجهة
        setIsNavigating(false);
        Alert.alert('تهانينا!', 'وصلت إلى وجهتك بنجاح');
        if (onNavigationEnd) {
          onNavigationEnd();
        }
      }
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const centerOnUser = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const toggleMapMode = () => {
    const modes: Array<'standard' | 'hybrid' | 'satellite'> = ['standard', 'hybrid', 'satellite'];
    const currentIndex = modes.indexOf(mapMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMapMode(modes[nextIndex]);
  };

  const getMapModeIcon = () => {
    switch (mapMode) {
      case 'standard': return 'map-outline';
      case 'hybrid': return 'layers-outline';
      case 'satellite': return 'globe-outline';
      default: return 'map-outline';
    }
  };

  const getCurrentInstruction = (): string => {
    if (!navigationRoute || !isNavigating) return '';
    return navigationRoute.steps[currentStep]?.instruction || '';
  };

  const getNextInstruction = (): string => {
    if (!navigationRoute || !isNavigating) return '';
    const nextStep = currentStep + 1;
    return navigationRoute.steps[nextStep]?.instruction || '';
  };

  const getDistanceToNextTurn = (): number => {
    if (!navigationRoute || !isNavigating || !currentLocation) return 0;
    const nextStep = navigationRoute.steps[currentStep];
    if (!nextStep) return 0;

    return calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      nextStep.coordinates.latitude,
      nextStep.coordinates.longitude
    ) * 1000; // تحويل إلى متر
  };

  return (
    <View style={styles.container}>
      {/* الخريطة */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapMode}
        showsTraffic={true}
        showsUserLocation={true}
        followsUserLocation={isNavigating}
        showsMyLocationButton={false}
        initialRegion={currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : undefined}
      >
        {/* موقع الوجهة */}
        {selectedDestination && (
          <Marker
            coordinate={selectedDestination}
            title="الوجهة"
            description={selectedDestination.address}
          />
        )}

        {/* المسار */}
        {navigationRoute && (
          <Polyline
            coordinates={navigationRoute.coordinates}
            strokeColor={Colors.light.primary}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* نقاط الانعطاف */}
        {navigationRoute?.steps.map((step, index) => (
          <Marker
            key={index}
            coordinate={step.coordinates}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.stepMarker}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* أزرار التحكم العلوية */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowLocationPicker(true)}
        >
          <Ionicons name="search" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowTrafficInfo(true)}
        >
          <Ionicons name="car" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={toggleMapMode}
        >
          <Ionicons name={getMapModeIcon() as any} size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {/* أزرار التحكم الجانبية */}
      <View style={styles.sideControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={centerOnUser}
        >
          <Ionicons name="locate" size={24} color={Colors.light.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setShowCompass(!showCompass)}
        >
          <Ionicons 
            name="compass" 
            size={24} 
            color={showCompass ? Colors.light.primary : Colors.light.text} 
          />
        </TouchableOpacity>
      </View>

      {/* البوصلة */}
      {showCompass && (
        <View style={styles.compass}>
          <View style={[styles.compassNeedle, { transform: [{ rotate: `${userHeading}deg` }] }]}>
            <Ionicons name="navigate" size={24} color={Colors.light.error} />
          </View>
          <Text style={styles.compassText}>{Math.round(userHeading)}°</Text>
        </View>
      )}

      {/* معلومات المسار */}
      {navigationRoute && !isNavigating && (
        <View style={styles.routeInfo}>
          <View style={styles.routeDetails}>
            <Text style={styles.routeDistance}>{navigationRoute.distance}</Text>
            <Text style={styles.routeDuration}>{navigationRoute.duration}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={startNavigation}
          >
            <Ionicons name="play" size={24} color={Colors.light.background} />
            <Text style={styles.startButtonText}>بدء الملاحة</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* شريط الملاحة */}
      {isNavigating && (
        <View style={styles.navigationBar}>
          <View style={styles.navigationInfo}>
            <Text style={styles.remainingTime}>{remainingTime}</Text>
            <Text style={styles.remainingDistance}>{remainingDistance}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopNavigation}
          >
            <Ionicons name="stop" size={20} color={Colors.light.background} />
          </TouchableOpacity>
        </View>
      )}

      {/* الملاحة الصوتية */}
      {showVoiceNavigation && (
        <VoiceNavigation
          isNavigating={isNavigating}
          currentInstruction={getCurrentInstruction()}
          nextInstruction={getNextInstruction()}
          distanceToNextTurn={getDistanceToNextTurn()}
          estimatedTimeArrival={remainingTime}
          onToggleVoice={setVoiceEnabled}
        />
      )}

      {/* منتقي الموقع */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <LocationPicker
          onLocationSelect={(location) => {
            setSelectedDestination(location);
            setShowLocationPicker(false);
          }}
          initialLocation={currentLocation}
        />
      </Modal>

      {/* معلومات المرور */}
      <Modal
        visible={showTrafficInfo}
        animationType="slide"
        onRequestClose={() => setShowTrafficInfo(false)}
      >
        <TrafficInfo
          visible={showTrafficInfo}
          onClose={() => setShowTrafficInfo(false)}
          currentLocation={currentLocation}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  stepMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  sideControls: {
    position: 'absolute',
    right: 16,
    top: height * 0.4,
    zIndex: 10,
  },
  controlButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.light.background,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compass: {
    position: 'absolute',
    top: 120,
    right: 16,
    width: 60,
    height: 60,
    backgroundColor: Colors.light.background,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  compassNeedle: {
    position: 'absolute',
  },
  compassText: {
    fontSize: 10,
    color: Colors.light.text,
    marginTop: 20,
  },
  routeInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  routeDetails: {
    flex: 1,
  },
  routeDistance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  routeDuration: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationBar: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 80,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  navigationInfo: {
    flex: 1,
  },
  remainingTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  remainingDistance: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  stopButton: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.error,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
