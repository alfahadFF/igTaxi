import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

// استخدام الألوان من theme light
const colors = {
  ...Colors.light,
  textSecondary: '#6c757d' // لون رمادي للنصوص الثانوية
};

interface Pharmacy {
  id: number;
  name: string;
  description: string;
  location: string;
  image_url: string;
  contact_phone: string;
  is_24_hours: boolean;
  accepts_insurance: boolean;
  delivery_fee: number;
  min_order_amount: number;
  rating: number;
  total_reviews: number;
  operating_hours: { start: string; end: string };
}

interface PharmacyListProps {
  onSelectPharmacy: (pharmacy: Pharmacy) => void;
}

export default function PharmacyList({ onSelectPharmacy }: PharmacyListProps) {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    try {
      const { data, error } = await supabase
        .from('pharmacies_with_details')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل قائمة الصيدليات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPharmacies();
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pharmacy.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderPharmacyFeatures = (pharmacy: Pharmacy) => {
    const features = [];
    
    if (pharmacy.is_24_hours) {
      features.push(
        <View key="24h" style={styles.featureTag}>
          <Ionicons name="time" size={12} color={colors.primary} />
          <Text style={styles.featureText}>24 ساعة</Text>
        </View>
      );
    }
    
    if (pharmacy.accepts_insurance) {
      features.push(
        <View key="insurance" style={styles.featureTag}>
          <Ionicons name="card" size={12} color={colors.primary} />
          <Text style={styles.featureText}>تأمين</Text>
        </View>
      );
    }
    
    if (pharmacy.delivery_fee === 0) {
      features.push(
        <View key="free-delivery" style={[styles.featureTag, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="bicycle" size={12} color={colors.success} />
          <Text style={[styles.featureText, { color: colors.success }]}>توصيل مجاني</Text>
        </View>
      );
    }

    return features;
  };

  const renderPharmacyCard = ({ item }: { item: Pharmacy }) => (
    <TouchableOpacity
      style={styles.pharmacyCard}
      onPress={() => onSelectPharmacy(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/120x120' }}
        style={styles.pharmacyImage}
        resizeMode="cover"
      />
      
      <View style={styles.pharmacyInfo}>
        <View style={styles.pharmacyHeader}>
          <Text style={styles.pharmacyName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>
              {item.rating > 0 ? item.rating.toFixed(1) : 'جديد'}
            </Text>
            <Text style={styles.reviewCount}>
              ({item.total_reviews})
            </Text>
          </View>
        </View>

        <Text style={styles.pharmacyDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.locationContainer}>
          <Ionicons name="location" size={14} color={colors.textSecondary} />
          <Text style={styles.location} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.pharmacyDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="call" size={14} color={colors.primary} />
            <Text style={styles.detailText}>{item.contact_phone}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="bicycle" size={14} color={colors.primary} />
            <Text style={styles.detailText}>
              {item.delivery_fee === 0 ? 'مجاني' : `${item.delivery_fee} درهم`}
            </Text>
          </View>
        </View>

        <View style={styles.operatingHours}>
          <Ionicons name="time" size={14} color={colors.textSecondary} />
          <Text style={styles.hoursText}>
            {item.is_24_hours 
              ? '24 ساعة' 
              : `${item.operating_hours?.start || '08:00'} - ${item.operating_hours?.end || '22:00'}`
            }
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          {renderPharmacyFeatures(item)}
        </View>

        {item.min_order_amount > 0 && (
          <Text style={styles.minOrder}>
            الحد الأدنى للطلب: {item.min_order_amount} درهم
          </Text>
        )}
      </View>

      <View style={styles.selectButton}>
        <Ionicons name="chevron-forward" size={20} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل الصيدليات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>اختر الصيدلية</Text>
        <Text style={styles.subtitle}>
          أرسل صورة الوصفة للصيدلية للحصول على الأدوية
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن صيدلية..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <FlatList
        data={filteredPharmacies}
        renderItem={renderPharmacyCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>لا توجد صيدليات</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'لم يتم العثور على صيدليات مطابقة لبحثك' : 'لا توجد صيدليات متاحة حالياً'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  listContainer: {
    padding: 20,
    paddingTop: 5,
  },
  pharmacyCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pharmacyImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 15,
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 3,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 3,
  },
  pharmacyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  location: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 5,
    flex: 1,
  },
  pharmacyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 5,
  },
  operatingHours: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  hoursText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 5,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 10,
    color: colors.primary,
    marginLeft: 3,
    fontWeight: '500',
  },
  minOrder: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '500',
    marginTop: 5,
  },
  selectButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
