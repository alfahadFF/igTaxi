import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Search,
  Filter,
  MapPin,
  Users,
  Calendar,
  Clock,
  Star,
  DollarSign,
  Car,
  Phone,
  MessageCircle,
  Heart,
  HeartOff
} from 'lucide-react-native';

interface EventDriver {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  profileImage?: string;
  specialization: string[];
  experience: number; // years
  priceRange: {
    min: number;
    max: number;
  };
  availability: string[];
  location: {
    city: string;
    distance: number; // km
  };
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    type: string;
    capacity: number;
    features: string[];
  };
  services: string[];
  description: string;
  phoneNumber: string;
  isOnline: boolean;
  responseTime: string;
  completedEvents: number;
}

const eventTypes = [
  { id: 'all', name: 'جميع المناسبات', icon: '🎉' },
  { id: 'wedding', name: 'أعراس', icon: '💒' },
  { id: 'family', name: 'مناسبات عائلية', icon: '👨‍👩‍👧‍👦' },
  { id: 'tourism', name: 'سياحة', icon: '🏖️' },
  { id: 'business', name: 'أعمال', icon: '💼' },
  { id: 'sports', name: 'رياضة', icon: '⚽' },
  { id: 'concerts', name: 'حفلات', icon: '🎵' }
];

export default function EventDriversSearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { eventType } = useLocalSearchParams<{ eventType?: string }>();
  const isRTL = i18n.dir() === 'rtl';

  const [drivers, setDrivers] = useState<EventDriver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<EventDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState(eventType || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // المرشحات
  const [filters, setFilters] = useState({
    maxPrice: '',
    minRating: '',
    maxDistance: '',
    availability: 'all',
    vehicleType: 'all'
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchQuery, selectedEventType, filters]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      
      // محاكاة بيانات السائقين
      const mockDrivers: EventDriver[] = [
        {
          id: '1',
          name: 'أحمد محمد العلي',
          rating: 4.9,
          totalRatings: 127,
          specialization: ['wedding', 'family'],
          experience: 8,
          priceRange: { min: 50, max: 200 },
          availability: ['morning', 'evening'],
          location: { city: 'عمان', distance: 2.5 },
          vehicleInfo: {
            make: 'تويوتا',
            model: 'كامري',
            year: 2020,
            type: 'فاخرة',
            capacity: 5,
            features: ['تكييف', 'زينة أعراس', 'نظام صوتي']
          },
          services: ['نقل العروسين', 'جولات سياحية', 'مناسبات عائلية'],
          description: 'سائق محترف متخصص في خدمة الأعراس والمناسبات العائلية مع خبرة 8 سنوات',
          phoneNumber: '+962791234567',
          isOnline: true,
          responseTime: '5 دقائق',
          completedEvents: 89
        },
        {
          id: '2',
          name: 'محمد أحمد السعود',
          rating: 4.7,
          totalRatings: 94,
          specialization: ['tourism', 'business'],
          experience: 5,
          priceRange: { min: 40, max: 150 },
          availability: ['morning', 'afternoon'],
          location: { city: 'عمان', distance: 4.2 },
          vehicleInfo: {
            make: 'مرسيدس',
            model: 'E-Class',
            year: 2019,
            type: 'فاخرة',
            capacity: 5,
            features: ['تكييف', 'واي فاي', 'مقاعد جلدية']
          },
          services: ['جولات سياحية', 'اجتماعات أعمال', 'نقل المطار'],
          description: 'متخصص في الجولات السياحية ونقل رجال الأعمال بسيارة فاخرة',
          phoneNumber: '+962791234568',
          isOnline: false,
          responseTime: '15 دقيقة',
          completedEvents: 67
        },
        {
          id: '3',
          name: 'سامر علي الخالد',
          rating: 4.8,
          totalRatings: 156,
          specialization: ['family', 'sports'],
          experience: 6,
          priceRange: { min: 35, max: 120 },
          availability: ['afternoon', 'evening'],
          location: { city: 'عمان', distance: 1.8 },
          vehicleInfo: {
            make: 'BMW',
            model: 'X5',
            year: 2021,
            type: 'SUV',
            capacity: 7,
            features: ['تكييف', 'مساحة واسعة', 'أمان عالي']
          },
          services: ['مناسبات عائلية', 'فعاليات رياضية', 'رحلات مدرسية'],
          description: 'سائق موثوق مع سيارة SUV مناسبة للعائلات والمجموعات الكبيرة',
          phoneNumber: '+962791234569',
          isOnline: true,
          responseTime: '8 دقائق',
          completedEvents: 112
        }
      ];

      setDrivers(mockDrivers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading drivers:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
      setLoading(false);
    }
  };

  const filterDrivers = () => {
    let filtered = drivers;

    // البحث بالاسم
    if (searchQuery.trim()) {
      filtered = filtered.filter(driver =>
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.services.some(service => service.includes(searchQuery))
      );
    }

    // فلترة حسب نوع المناسبة
    if (selectedEventType !== 'all') {
      filtered = filtered.filter(driver =>
        driver.specialization.includes(selectedEventType)
      );
    }

    // فلترة حسب السعر
    if (filters.maxPrice) {
      filtered = filtered.filter(driver =>
        driver.priceRange.min <= parseInt(filters.maxPrice)
      );
    }

    // فلترة حسب التقييم
    if (filters.minRating) {
      filtered = filtered.filter(driver =>
        driver.rating >= parseFloat(filters.minRating)
      );
    }

    // فلترة حسب المسافة
    if (filters.maxDistance) {
      filtered = filtered.filter(driver =>
        driver.location.distance <= parseInt(filters.maxDistance)
      );
    }

    setFilteredDrivers(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDrivers();
    setRefreshing(false);
  };

  const toggleFavorite = (driverId: string) => {
    setFavorites(prev => 
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const contactDriver = (driver: EventDriver) => {
    Alert.alert(
      'التواصل مع السائق',
      `${driver.name}\nحالة التواجد: ${driver.isOnline ? 'متصل' : 'غير متصل'}\nوقت الاستجابة: ${driver.responseTime}`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'اتصال',
          onPress: () => {
            // هنا يمكن إضافة منطق الاتصال
            Alert.alert('اتصال', `سيتم الاتصال بـ ${driver.name}`);
          }
        },
        {
          text: 'رسالة',
          onPress: () => {
            // هنا يمكن إضافة منطق إرسال الرسائل
            Alert.alert('رسالة', `سيتم إرسال رسالة لـ ${driver.name}`);
          }
        }
      ]
    );
  };

  const requestQuote = (driver: EventDriver) => {
    router.push({
      pathname: '/services/event-booking-form',
      params: { driverId: driver.id, eventType: selectedEventType }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>سائقو المناسبات</Text>
        <Text style={styles.subtitle}>اختر أفضل سائق لمناسبتك</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#999" />
          <TextInput
            style={[styles.searchInput, isRTL && styles.inputRTL]}
            placeholder="ابحث عن سائق أو خدمة..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign={isRTL ? 'right' : 'left'}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color="#F5B800" />
        </TouchableOpacity>
      </View>

      {/* Event Types */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.eventTypesContainer}
      >
        {eventTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.eventTypeCard,
              selectedEventType === type.id && styles.selectedEventType
            ]}
            onPress={() => setSelectedEventType(type.id)}
          >
            <Text style={styles.eventTypeIcon}>{type.icon}</Text>
            <Text style={[
              styles.eventTypeName,
              selectedEventType === type.id && styles.selectedEventTypeName
            ]}>
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>أقصى سعر (د.أ)</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="200"
                value={filters.maxPrice}
                onChangeText={(value) => setFilters(prev => ({ ...prev, maxPrice: value }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>أقل تقييم</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="4.0"
                value={filters.minRating}
                onChangeText={(value) => setFilters(prev => ({ ...prev, minRating: value }))}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      )}

      {/* Results */}
      <ScrollView
        style={styles.resultsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.resultsCount}>
          {filteredDrivers.length} سائق متاح
        </Text>

        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            {/* Driver Header */}
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <View style={styles.driverNameRow}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <View style={[
                    styles.onlineIndicator,
                    { backgroundColor: driver.isOnline ? '#4CAF50' : '#999' }
                  ]} />
                </View>
                <View style={styles.ratingContainer}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.rating}>
                    {driver.rating} ({driver.totalRatings})
                  </Text>
                  <Text style={styles.experience}>• {driver.experience} سنوات خبرة</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => toggleFavorite(driver.id)}
              >
                {favorites.includes(driver.id) ? (
                  <Heart size={20} color="#F44336" fill="#F44336" />
                ) : (
                  <HeartOff size={20} color="#999" />
                )}
              </TouchableOpacity>
            </View>

            {/* Vehicle Info */}
            <View style={styles.vehicleContainer}>
              <Car size={16} color="#666" />
              <Text style={styles.vehicleText}>
                {driver.vehicleInfo.make} {driver.vehicleInfo.model} {driver.vehicleInfo.year}
              </Text>
              <Text style={styles.vehicleCapacity}>
                ({driver.vehicleInfo.capacity} مقاعد)
              </Text>
            </View>

            {/* Services */}
            <View style={styles.servicesContainer}>
              {driver.services.slice(0, 2).map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
              {driver.services.length > 2 && (
                <Text style={styles.moreServices}>
                  +{driver.services.length - 2} أخرى
                </Text>
              )}
            </View>

            {/* Price & Location */}
            <View style={styles.infoRow}>
              <View style={styles.priceContainer}>
                <DollarSign size={16} color="#F5B800" />
                <Text style={styles.priceText}>
                  {driver.priceRange.min} - {driver.priceRange.max} د.أ
                </Text>
              </View>
              <View style={styles.locationContainer}>
                <MapPin size={16} color="#666" />
                <Text style={styles.locationText}>
                  {driver.location.distance} كم • {driver.location.city}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>
              {driver.description}
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => contactDriver(driver)}
              >
                <Phone size={16} color="#4CAF50" />
                <Text style={styles.contactButtonText}>تواصل</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quoteButton}
                onPress={() => requestQuote(driver)}
              >
                <Text style={styles.quoteButtonText}>طلب عرض سعر</Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                {driver.completedEvents} مناسبة مكتملة
              </Text>
              <Text style={styles.statText}>
                يرد خلال {driver.responseTime}
              </Text>
            </View>
          </View>
        ))}

        {filteredDrivers.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد نتائج للبحث</Text>
            <Text style={styles.emptySubtext}>جرب تغيير معايير البحث</Text>
          </View>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    marginLeft: 8,
    color: '#333',
  },
  inputRTL: {
    textAlign: 'right',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTypesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  eventTypeCard: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  selectedEventType: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  eventTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  eventTypeName: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    textAlign: 'center',
  },
  selectedEventTypeName: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterItem: {
    width: '48%',
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 8,
  },
  filterInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginRight: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginLeft: 4,
  },
  experience: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 8,
  },
  favoriteButton: {
    padding: 8,
  },
  vehicleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  vehicleCapacity: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTag: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  serviceText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#F5B800',
  },
  moreServices: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.45,
    justifyContent: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
    marginLeft: 6,
  },
  quoteButton: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
});
