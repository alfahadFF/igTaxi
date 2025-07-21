import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Droplets, MapPin, Star, Clock, Phone, Store, Plus, ArrowLeft } from 'lucide-react-native';
import * as Location from 'expo-location';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');

interface WaterStation {
  id: string;
  station_name: string;
  description?: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviews_count: number;
  is_open: boolean;
  products: any[];
  working_hours: any[];
  delivery_fee: number;
  minimum_order: number;
  logo_url?: string;
  images: string[];
  distance?: number;
}

export default function WaterServiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [stations, setStations] = useState<WaterStation[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'الكل', icon: Store },
    { id: 'nearby', name: 'قريب مني', icon: MapPin },
    { id: 'top_rated', name: 'الأعلى تقييماً', icon: Star },
    { id: 'delivery', name: 'توصيل مجاني', icon: Droplets }
  ];

  useEffect(() => {
    requestLocationPermission();
    loadStations();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const loadStations = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('water_stations')
        .select('*')
        .eq('is_active', true);

      // تطبيق الفلاتر
      if (selectedCategory === 'top_rated') {
        query = query.gte('rating', 4.0).order('rating', { ascending: false });
      } else if (selectedCategory === 'delivery') {
        query = query.eq('delivery_fee', 0);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      
      if (error) throw error;

      let processedStations = data || [];

      // حساب المسافة إذا كان الموقع متاحاً
      if (userLocation && processedStations.length > 0) {
        processedStations = processedStations.map(station => ({
          ...station,
          distance: calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            station.latitude,
            station.longitude
          )
        }));

        // ترتيب حسب المسافة للفئة القريبة
        if (selectedCategory === 'nearby') {
          processedStations.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
      }

      setStations(processedStations);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل المحطات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return Math.round(d * 100) / 100;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStations();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setTimeout(() => loadStations(), 100);
  };

  const navigateToStation = (station: WaterStation) => {
    router.push({
      pathname: '/water-station/[id]',
      params: { id: station.id }
    });
  };

  const navigateToRegister = () => {
    router.push('/auth/water-station-register');
  };

  const getCurrentDayStatus = (workingHours: any[]) => {
    if (!workingHours || workingHours.length === 0) return { isOpen: false, nextOpen: null };
    
    const now = new Date();
    const currentDay = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = workingHours.find(h => h.day === currentDay);
    
    if (!todayHours || !todayHours.isOpen) {
      return { isOpen: false, nextOpen: null };
    }
    
    const [openHour, openMin] = todayHours.openTime.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.closeTime.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    
    return { 
      isOpen, 
      nextOpen: isOpen ? null : todayHours.openTime 
    };
  };

  const renderStationCard = (station: WaterStation) => {
    const status = getCurrentDayStatus(station.working_hours);
    
    return (
      <TouchableOpacity 
        key={station.id}
        style={styles.stationCard}
        onPress={() => navigateToStation(station)}
      >
        <View style={styles.stationImageContainer}>
          {station.logo_url ? (
            <Image source={{ uri: station.logo_url }} style={styles.stationLogo} />
          ) : (
            <View style={styles.defaultLogo}>
              <Droplets size={24} color={Colors.light.primary} />
            </View>
          )}
          
          {station.distance !== undefined && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{station.distance} كم</Text>
            </View>
          )}
        </View>

        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{station.station_name}</Text>
          
          <View style={styles.ratingContainer}>
            <Star size={14} color="#FFD700" fill="#FFD700" />
            <Text style={styles.rating}>{station.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>({station.reviews_count})</Text>
          </View>

          <View style={styles.addressContainer}>
            <MapPin size={14} color="#666" />
            <Text style={styles.address}>{station.address}, {station.city}</Text>
          </View>

          <View style={styles.statusContainer}>
            <Clock size={14} color={status.isOpen ? '#4CAF50' : '#ff9800'} />
            <Text style={[styles.status, { color: status.isOpen ? '#4CAF50' : '#ff9800' }]}>
              {status.isOpen ? 'مفتوح الآن' : status.nextOpen ? `مغلق - يفتح ${status.nextOpen}` : 'مغلق'}
            </Text>
          </View>

          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryFee}>
              رسوم التوصيل: {station.delivery_fee === 0 ? 'مجاني' : `${station.delivery_fee} د.أ`}
            </Text>
            <Text style={styles.minimumOrder}>
              أقل طلب: {station.minimum_order} د.أ
            </Text>
          </View>

          {station.products && station.products.length > 0 && (
            <View style={styles.productsPreview}>
              <Text style={styles.productsText}>
                {station.products.slice(0, 2).map(p => `${p.name} (${p.size}L)`).join(' • ')}
                {station.products.length > 2 && '...'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Droplets size={24} color="white" />
          <Text style={styles.title}>محطات تنقية المياه</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={navigateToRegister}
        >
          <Plus size={20} color="white" />
          <Text style={styles.registerButtonText}>سجل محطتك</Text>
        </TouchableOpacity>
      </View>

      {/* فئات التصفية */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => {
            const IconComponent = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
                onPress={() => handleCategoryChange(category.id)}
              >
                <IconComponent 
                  size={16} 
                  color={isSelected ? 'white' : Colors.light.primary} 
                />
                <Text style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* قائمة المحطات */}
      <ScrollView 
        style={styles.stationsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>جاري تحميل المحطات...</Text>
          </View>
        ) : stations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Droplets size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>لا توجد محطات متاحة</Text>
            <Text style={styles.emptySubtitle}>
              {selectedCategory === 'nearby' 
                ? 'لا توجد محطات قريبة منك' 
                : 'جرب تغيير المرشحات أو أضف محطتك'
              }
            </Text>
            <TouchableOpacity 
              style={styles.addStationButton}
              onPress={navigateToRegister}
            >
              <Text style={styles.addStationButtonText}>أضف محطة جديدة</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stations.map(renderStationCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: Colors.light.primary,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  registerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    gap: 6,
  },
  categoryButtonSelected: {
    backgroundColor: Colors.light.primary,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: 'white',
  },
  stationsList: {
    flex: 1,
    padding: 15,
  },
  stationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationImageContainer: {
    position: 'relative',
    height: 120,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  defaultLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  stationInfo: {
    padding: 15,
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewsCount: {
    fontSize: 12,
    color: '#666',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  address: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deliveryFee: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  minimumOrder: {
    fontSize: 13,
    color: '#666',
  },
  productsPreview: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
  },
  productsText: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  addStationButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addStationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
