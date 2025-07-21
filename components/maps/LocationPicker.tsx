import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Colors from '@/constants/Colors';

interface LocationPickerProps {
  onLocationSelect: (location: SelectedLocation) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
  placeholder?: string;
  showFavorites?: boolean;
}

interface SelectedLocation {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
  type?: 'current' | 'search' | 'favorite' | 'landmark';
}

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'landmark' | 'business' | 'residence' | 'government';
  distance?: number;
}

interface FavoriteLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  icon: string;
  color: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  placeholder = "أدخل عنوان أو اختر من الخريطة",
  showFavorites = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // المعالم المشهورة في الرياض (بيانات تجريبية)
  const famousLandmarks = [
    {
      id: '1',
      name: 'برج المملكة',
      address: 'طريق الملك فهد، الرياض',
      latitude: 24.7116,
      longitude: 46.6753,
      type: 'landmark' as const,
    },
    {
      id: '2',
      name: 'مستشفى الملك فيصل التخصصي',
      address: 'الزهراء، الرياض',
      latitude: 24.6968,
      longitude: 46.6976,
      type: 'landmark' as const,
    },
    {
      id: '3',
      name: 'مطار الملك خالد الدولي',
      address: 'شمال الرياض',
      latitude: 24.9576,
      longitude: 46.6988,
      type: 'landmark' as const,
    },
    {
      id: '4',
      name: 'جامعة الملك سعود',
      address: 'المدينة الجامعية، الرياض',
      latitude: 24.7253,
      longitude: 46.6186,
      type: 'landmark' as const,
    },
    {
      id: '5',
      name: 'حديقة الملك عبدالله',
      address: 'الملز، الرياض',
      latitude: 24.6919,
      longitude: 46.7256,
      type: 'landmark' as const,
    },
  ];

  useEffect(() => {
    getCurrentLocation();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchLocations();
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يحتاج التطبيق إلى صلاحية الموقع لتحديد موقعك الحالي');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location);
    } catch (error) {
      console.error('خطأ في الحصول على الموقع:', error);
    }
  };

  const loadFavorites = () => {
    // في التطبيق الحقيقي، ستقرأ من قاعدة البيانات
    const mockFavorites: FavoriteLocation[] = [
      {
        id: 'home',
        name: 'المنزل',
        address: 'شارع الأمير محمد بن عبدالعزيز، الرياض',
        latitude: 24.7136,
        longitude: 46.6753,
        icon: 'home',
        color: Colors.light.primary,
      },
      {
        id: 'work',
        name: 'العمل',
        address: 'برج العنود، طريق الملك فهد، الرياض',
        latitude: 24.7200,
        longitude: 46.6800,
        icon: 'business',
        color: Colors.light.secondary,
      },
    ];
    setFavorites(mockFavorites);
  };

  const searchLocations = async () => {
    setLoading(true);
    try {
      // فلترة المعالم المشهورة حسب البحث
      const filteredLandmarks = famousLandmarks.filter(landmark =>
        landmark.name.includes(searchQuery) || 
        landmark.address.includes(searchQuery)
      );

      // محاكاة نتائج بحث إضافية
      const mockResults: SearchResult[] = [
        ...filteredLandmarks,
        {
          id: 'search_1',
          name: `${searchQuery} - منطقة تجارية`,
          address: `${searchQuery}، الرياض`,
          latitude: 24.7136 + (Math.random() - 0.5) * 0.1,
          longitude: 46.6753 + (Math.random() - 0.5) * 0.1,
          type: 'business',
        },
        {
          id: 'search_2',
          name: `${searchQuery} - منطقة سكنية`,
          address: `${searchQuery}، الرياض`,
          latitude: 24.7136 + (Math.random() - 0.5) * 0.1,
          longitude: 46.6753 + (Math.random() - 0.5) * 0.1,
          type: 'residence',
        },
      ];

      // حساب المسافة من الموقع الحالي
      const resultsWithDistance = mockResults.map(result => {
        if (currentLocation) {
          const distance = calculateDistance(
            currentLocation.coords.latitude,
            currentLocation.coords.longitude,
            result.latitude,
            result.longitude
          );
          return { ...result, distance };
        }
        return result;
      });

      // ترتيب حسب المسافة
      resultsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setSearchResults(resultsWithDistance);
    } catch (error) {
      console.error('خطأ في البحث:', error);
    } finally {
      setLoading(false);
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

  const selectLocation = (location: any) => {
    const selectedLocation: SelectedLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      name: location.name,
      type: location.type || 'search',
    };

    setSearchQuery(location.name || location.address);
    setShowSuggestions(false);
    onLocationSelect(selectedLocation);
  };

  const useCurrentLocation = async () => {
    if (!currentLocation) {
      await getCurrentLocation();
      return;
    }

    try {
      // في التطبيق الحقيقي، ستستخدم Reverse Geocoding
      const selectedLocation: SelectedLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: 'موقعك الحالي',
        name: 'موقعك الحالي',
        type: 'current',
      };

      setSearchQuery('موقعك الحالي');
      onLocationSelect(selectedLocation);
    } catch (error) {
      console.error('خطأ في استخدام الموقع الحالي:', error);
      Alert.alert('خطأ', 'لا يمكن الحصول على تفاصيل الموقع الحالي');
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'landmark': return 'location';
      case 'business': return 'business';
      case 'residence': return 'home';
      case 'government': return 'shield';
      default: return 'location-outline';
    }
  };

  const getLocationColor = (type: string) => {
    switch (type) {
      case 'landmark': return Colors.light.primary;
      case 'business': return Colors.light.secondary;
      case 'residence': return Colors.light.success;
      case 'government': return Colors.light.accent;
      default: return Colors.light.text;
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => selectLocation(item)}
    >
      <View style={[styles.resultIcon, { backgroundColor: getLocationColor(item.type) }]}>
        <Ionicons 
          name={getLocationIcon(item.type) as any} 
          size={16} 
          color={Colors.light.background} 
        />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultAddress}>{item.address}</Text>
        {item.distance && (
          <Text style={styles.resultDistance}>
            {item.distance < 1 
              ? `${Math.round(item.distance * 1000)} متر`
              : `${item.distance.toFixed(1)} كم`
            }
          </Text>
        )}
      </View>
      <Ionicons name="chevron-back" size={20} color={Colors.light.secondary} />
    </TouchableOpacity>
  );

  const renderFavorite = ({ item }: { item: FavoriteLocation }) => (
    <TouchableOpacity
      style={styles.favoriteItem}
      onPress={() => selectLocation(item)}
    >
      <View style={[styles.favoriteIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={16} color={Colors.light.background} />
      </View>
      <View style={styles.favoriteInfo}>
        <Text style={styles.favoriteName}>{item.name}</Text>
        <Text style={styles.favoriteAddress}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* شريط البحث */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={Colors.light.secondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={placeholder}
            placeholderTextColor={Colors.light.secondary}
            onFocus={() => setShowSuggestions(true)}
          />
          {loading && <ActivityIndicator size="small" color={Colors.light.primary} />}
        </View>
        
        <TouchableOpacity style={styles.currentLocationButton} onPress={useCurrentLocation}>
          <Ionicons name="locate" size={20} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      {/* المفضلة */}
      {showFavorites && favorites.length > 0 && !showSuggestions && (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>المواقع المفضلة</Text>
          <FlatList
            data={favorites}
            renderItem={renderFavorite}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.favoritesList}
          />
        </View>
      )}

      {/* نتائج البحث */}
      {showSuggestions && (
        <View style={styles.resultsContainer}>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              style={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noResults}>
              <Ionicons name="search" size={48} color={Colors.light.secondary} />
              <Text style={styles.noResultsText}>
                {loading ? 'جاري البحث...' : 'لا توجد نتائج'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* الاقتراحات السريعة */}
      {!showSuggestions && !searchQuery && (
        <View style={styles.quickSuggestions}>
          <Text style={styles.sectionTitle}>اقتراحات سريعة</Text>
          <View style={styles.suggestionsGrid}>
            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={() => setSearchQuery('مستشفى')}
            >
              <Ionicons name="medical" size={24} color={Colors.light.error} />
              <Text style={styles.suggestionText}>مستشفيات</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={() => setSearchQuery('مطعم')}
            >
              <Ionicons name="restaurant" size={24} color={Colors.light.warning} />
              <Text style={styles.suggestionText}>مطاعم</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={() => setSearchQuery('محطة وقود')}
            >
              <Ionicons name="car" size={24} color={Colors.light.primary} />
              <Text style={styles.suggestionText}>محطات وقود</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.suggestionButton}
              onPress={() => setSearchQuery('مول')}
            >
              <Ionicons name="storefront" size={24} color={Colors.light.secondary} />
              <Text style={styles.suggestionText}>مولات</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.light.text,
  },
  currentLocationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoritesSection: {
    padding: 16,
    backgroundColor: Colors.light.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  favoritesList: {
    flexGrow: 0,
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 180,
  },
  favoriteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  favoriteInfo: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  favoriteAddress: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  resultAddress: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  resultDistance: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 4,
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 12,
  },
  quickSuggestions: {
    padding: 16,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  suggestionButton: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingVertical: 20,
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 12,
    color: Colors.light.text,
    marginTop: 8,
  },
});
