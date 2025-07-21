import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  Search,
  Filter,
  Star,
  MapPin,
  Phone,
  Car,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Heart,
  MessageCircle,
  Sparkles
} from 'lucide-react-native';

interface EventDriver {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  profileImage?: string;
  phone: string;
  experience: number; // سنوات الخبرة
  location: {
    city: string;
    area: string;
    distance: number; // كم
  };
  specializations: string[]; // أنواع المناسبات
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    color: string;
    seatingCapacity: number;
    features: string[];
  };
  pricing: {
    hourlyRate: number;
    dailyRate: number;
    basePrice: number;
  };
  availability: {
    isOnline: boolean;
    nextAvailable: string;
  };
  completedEvents: number;
  languages: string[];
  isVerified: boolean;
  isFavorite: boolean;
  responseTime: string; // مثل "خلال 5 دقائق"
}

export default function EventDriverSearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [drivers, setDrivers] = useState<EventDriver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<EventDriver[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    eventType: '',
    minRating: 0,
    maxDistance: 50,
    priceRange: '',
    availability: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchQuery, selectedFilters]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      // محاكاة بيانات سائقي المناسبات
      const mockDrivers: EventDriver[] = [
        {
          id: '1',
          name: 'أحمد محمد العلي',
          rating: 4.9,
          totalRatings: 156,
          phone: '+962791234567',
          experience: 8,
          location: {
            city: 'عمان',
            area: 'العبدلي',
            distance: 2.3
          },
          specializations: ['wedding', 'family', 'tourism'],
          vehicleInfo: {
            make: 'مرسيدس',
            model: 'E-Class',
            year: 2020,
            color: 'أسود',
            seatingCapacity: 5,
            features: ['ac', 'wifi', 'sound', 'decoration']
          },
          pricing: {
            hourlyRate: 25,
            dailyRate: 180,
            basePrice: 20
          },
          availability: {
            isOnline: true,
            nextAvailable: 'متاح الآن'
          },
          completedEvents: 89,
          languages: ['العربية', 'الإنجليزية'],
          isVerified: true,
          isFavorite: false,
          responseTime: 'خلال 3 دقائق'
        },
        {
          id: '2',
          name: 'سامر أحمد الزعبي',
          rating: 4.7,
          totalRatings: 203,
          phone: '+962792345678',
          experience: 5,
          location: {
            city: 'عمان',
            area: 'الجبيهة',
            distance: 4.7
          },
          specializations: ['sports', 'concert', 'field'],
          vehicleInfo: {
            make: 'تويوتا',
            model: 'هايلكس',
            year: 2019,
            color: 'أبيض',
            seatingCapacity: 5,
            features: ['ac', 'equipment_space', 'sound']
          },
          pricing: {
            hourlyRate: 20,
            dailyRate: 150,
            basePrice: 15
          },
          availability: {
            isOnline: false,
            nextAvailable: 'متاح في 30 دقيقة'
          },
          completedEvents: 67,
          languages: ['العربية'],
          isVerified: true,
          isFavorite: true,
          responseTime: 'خلال 10 دقائق'
        },
        {
          id: '3',
          name: 'فادي خالد السعد',
          rating: 4.8,
          totalRatings: 98,
          phone: '+962793456789',
          experience: 12,
          location: {
            city: 'عمان',
            area: 'المدينة الرياضية',
            distance: 6.2
          },
          specializations: ['wedding', 'tourism', 'family'],
          vehicleInfo: {
            make: 'BMW',
            model: 'X5',
            year: 2021,
            color: 'رمادي',
            seatingCapacity: 7,
            features: ['ac', 'wifi', 'sound', 'photography', 'tour_guide']
          },
          pricing: {
            hourlyRate: 35,
            dailyRate: 250,
            basePrice: 30
          },
          availability: {
            isOnline: true,
            nextAvailable: 'متاح الآن'
          },
          completedEvents: 124,
          languages: ['العربية', 'الإنجليزية', 'الفرنسية'],
          isVerified: true,
          isFavorite: false,
          responseTime: 'خلال دقيقة واحدة'
        }
      ];

      setDrivers(mockDrivers);
    } catch (error) {
      console.error('Error loading drivers:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل بيانات السائقين');
    } finally {
      setLoading(false);
    }
  };

  const filterDrivers = () => {
    let filtered = drivers.filter(driver => {
      // البحث النصي
      if (searchQuery && !driver.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !driver.location.area.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // نوع المناسبة
      if (selectedFilters.eventType && !driver.specializations.includes(selectedFilters.eventType)) {
        return false;
      }

      // التقييم الأدنى
      if (selectedFilters.minRating > 0 && driver.rating < selectedFilters.minRating) {
        return false;
      }

      // المسافة القصوى
      if (driver.location.distance > selectedFilters.maxDistance) {
        return false;
      }

      // التوفر
      if (selectedFilters.availability === 'online' && !driver.availability.isOnline) {
        return false;
      }

      return true;
    });

    // ترتيب النتائج
    filtered.sort((a, b) => {
      // المفضلة أولاً
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      // المتاحين أولاً
      if (a.availability.isOnline !== b.availability.isOnline) {
        return a.availability.isOnline ? -1 : 1;
      }
      // التقييم الأعلى
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }
      // المسافة الأقرب
      return a.location.distance - b.location.distance;
    });

    setFilteredDrivers(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDrivers();
    setRefreshing(false);
  };

  const toggleFavorite = (driverId: string) => {
    setDrivers(prev => prev.map(driver => 
      driver.id === driverId 
        ? { ...driver, isFavorite: !driver.isFavorite }
        : driver
    ));
  };

  const contactDriver = (driver: EventDriver, method: 'call' | 'message') => {
    if (method === 'call') {
      Alert.alert(
        'اتصال بالسائق',
        `هل تريد الاتصال بـ ${driver.name}؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'اتصال', onPress: () => console.log(`Calling ${driver.phone}`) }
        ]
      );
    } else {
      router.push(`/chat/${driver.id}`);
    }
  };

  const bookDriver = (driver: EventDriver) => {
    router.push({
      pathname: '/services/event-booking-form',
      params: { driverId: driver.id, eventType: 'custom' }
    });
  };

  const getEventTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      wedding: 'أعراس',
      family: 'عائلية',
      tourism: 'سياحية',
      field: 'ميدانية',
      sports: 'رياضية',
      concert: 'حفلات'
    };
    return labels[type] || type;
  };

  const getFeatureLabel = (feature: string) => {
    const labels: { [key: string]: string } = {
      ac: 'تكييف',
      wifi: 'واي فاي',
      sound: 'صوتيات',
      decoration: 'زينة',
      photography: 'تصوير',
      tour_guide: 'مرشد',
      equipment_space: 'مساحة معدات',
      child_seats: 'كراسي أطفال'
    };
    return labels[feature] || feature;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>سائقو المناسبات</Text>
        <Text style={styles.subtitle}>{filteredDrivers.length} سائق متاح</Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.inputRTL]}
            placeholder="ابحث عن سائق أو منطقة..."
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

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>نوع المناسبة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>التقييم</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>المسافة</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterChipText}>السعر</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Drivers List */}
      <ScrollView
        style={styles.driversList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredDrivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            {/* Driver Header */}
            <View style={styles.driverHeader}>
              <View style={styles.driverInfo}>
                <View style={styles.driverNameContainer}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  {driver.isVerified && (
                    <Sparkles size={16} color="#4CAF50" style={styles.verifiedIcon} />
                  )}
                </View>
                
                <View style={styles.ratingContainer}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.rating}>
                    {driver.rating} ({driver.totalRatings} تقييم)
                  </Text>
                </View>

                <View style={styles.locationContainer}>
                  <MapPin size={14} color="#999" />
                  <Text style={styles.location}>
                    {driver.location.area} - {driver.location.distance} كم
                  </Text>
                </View>
              </View>

              <View style={styles.driverActions}>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => toggleFavorite(driver.id)}
                >
                  <Heart 
                    size={20} 
                    color={driver.isFavorite ? "#F44336" : "#999"} 
                    fill={driver.isFavorite ? "#F44336" : "none"}
                  />
                </TouchableOpacity>

                <View style={[
                  styles.statusIndicator,
                  driver.availability.isOnline && styles.statusOnline
                ]}>
                  <Text style={[
                    styles.statusText,
                    driver.availability.isOnline && styles.statusTextOnline
                  ]}>
                    {driver.availability.isOnline ? 'متاح' : 'مشغول'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Specializations */}
            <View style={styles.specializationsContainer}>
              <Text style={styles.sectionLabel}>التخصصات:</Text>
              <View style={styles.specializationsList}>
                {driver.specializations.map((spec, index) => (
                  <View key={index} style={styles.specializationChip}>
                    <Text style={styles.specializationText}>
                      {getEventTypeLabel(spec)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Vehicle Info */}
            <View style={styles.vehicleContainer}>
              <Car size={16} color="#666" />
              <Text style={styles.vehicleText}>
                {driver.vehicleInfo.make} {driver.vehicleInfo.model} {driver.vehicleInfo.year}
              </Text>
              <Text style={styles.vehicleCapacity}>
                ({driver.vehicleInfo.seatingCapacity} مقاعد)
              </Text>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {driver.vehicleInfo.features.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.featureChip}>
                  <Text style={styles.featureText}>
                    {getFeatureLabel(feature)}
                  </Text>
                </View>
              ))}
              {driver.vehicleInfo.features.length > 4 && (
                <Text style={styles.moreFeatures}>
                  +{driver.vehicleInfo.features.length - 4} المزيد
                </Text>
              )}
            </View>

            {/* Pricing and Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <DollarSign size={14} color="#F5B800" />
                <Text style={styles.statText}>
                  {driver.pricing.hourlyRate} د.أ/ساعة
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Calendar size={14} color="#4CAF50" />
                <Text style={styles.statText}>
                  {driver.completedEvents} مناسبة
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Clock size={14} color="#2196F3" />
                <Text style={styles.statText}>
                  {driver.responseTime}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => contactDriver(driver, 'call')}
              >
                <Phone size={16} color="#4CAF50" />
                <Text style={styles.contactButtonText}>اتصال</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.messageButton}
                onPress={() => contactDriver(driver, 'message')}
              >
                <MessageCircle size={16} color="#2196F3" />
                <Text style={styles.messageButtonText}>رسالة</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => bookDriver(driver)}
              >
                <Text style={styles.bookButtonText}>حجز مناسبة</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredDrivers.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد سائقين متاحين</Text>
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
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  inputRTL: {
    textAlign: 'right',
  },
  filterButton: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    borderRadius: 20,
    padding: 10,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  driversList: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  verifiedIcon: {
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  driverActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  favoriteButton: {
    padding: 4,
  },
  statusIndicator: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusOnline: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#999',
  },
  statusTextOnline: {
    color: '#4CAF50',
  },
  specializationsContainer: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  specializationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specializationChip: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specializationText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#F5B800',
  },
  vehicleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    flex: 1,
  },
  vehicleCapacity: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  featureChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  moreFeatures: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  contactButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  messageButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#2196F3',
  },
  bookButton: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
    textAlign: 'center',
  },
});
