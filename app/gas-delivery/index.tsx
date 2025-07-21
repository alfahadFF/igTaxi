import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

interface GasDistributor {
  distributor_id: string;
  business_name: string;
  phone: string;
  distance_km: number;
  price_per_cylinder: number;
  rating: number;
  total_orders: number;
}

interface LocationInfo {
  latitude: number;
  longitude: number;
  address: string;
}

const cylinderTypes = [
  {
    id: '12kg',
    name: 'اسطوانة 12 كيلو',
    description: 'الحجم العادي للمنازل',
    icon: '🔥',
  },
  {
    id: '25kg',
    name: 'اسطوانة 25 كيلو',
    description: 'الحجم الكبير للمطاعم والمؤسسات',
    icon: '🔥🔥',
  },
  {
    id: 'small',
    name: 'اسطوانة صغيرة',
    description: '5-6 كيلو للرحلات والاستخدام الخفيف',
    icon: '🔥',
  },
];

export default function GasDeliveryScreen() {
  const { user } = useAuth();
  const [selectedCylinderType, setSelectedCylinderType] = useState<string>('12kg');
  const [quantity, setQuantity] = useState<number>(1);
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [nearbyDistributors, setNearbyDistributors] = useState<GasDistributor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      loadNearbyDistributors();
    }
  }, [currentLocation, selectedCylinderType]);

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى إذن الموقع لإظهار أقرب الموزعين');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = reverseGeocode[0] 
        ? `${reverseGeocode[0].street || ''} ${reverseGeocode[0].district || ''} ${reverseGeocode[0].city || ''}`
        : 'الموقع الحالي';

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address.trim(),
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('خطأ', 'تعذر الحصول على موقعك الحالي');
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadNearbyDistributors = async () => {
    if (!currentLocation) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc(
        'find_available_gas_distributors',
        {
          delivery_lat: currentLocation.latitude,
          delivery_lng: currentLocation.longitude,
          cylinder_type_param: selectedCylinderType,
          search_radius_km: 15, // نطاق أولي للعرض
          limit_count: 10,
        }
      );

      if (error) {
        console.error('Error loading distributors:', error);
        Alert.alert('خطأ', 'تعذر تحميل الموزعين المتاحين');
        return;
      }

      setNearbyDistributors(data || []);
    } catch (error) {
      console.error('Error loading distributors:', error);
      Alert.alert('خطأ', 'تعذر تحميل الموزعين المتاحين');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    if (!user || !currentLocation) {
      Alert.alert('خطأ', 'يجب تسجيل الدخول وتحديد الموقع أولاً');
      return;
    }

    try {
      setLoading(true);

      // إنشاء رقم طلب فريد
      const { data: orderNumber, error: orderNumberError } = await supabase.rpc(
        'generate_gas_order_number'
      );

      if (orderNumberError) {
        throw orderNumberError;
      }

      // الحصول على سعر الاسطوانة من أول موزع متاح
      const pricePerCylinder = nearbyDistributors.length > 0 
        ? nearbyDistributors[0].price_per_cylinder 
        : 0;

      // إنشاء الطلب
      const { data: newOrder, error: orderError } = await supabase
        .from('gas_delivery_orders')
        .insert([
          {
            order_number: orderNumber,
            customer_id: user.id,
            cylinder_type: selectedCylinderType,
            quantity: quantity,
            price_per_cylinder: pricePerCylinder,
            total_amount: pricePerCylinder * quantity,
            delivery_latitude: currentLocation.latitude,
            delivery_longitude: currentLocation.longitude,
            delivery_address: currentLocation.address,
            status: 'searching',
          },
        ])
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // بدء عملية البحث عن الموزعين وإرسال الإشعارات
      const { error: notifyError } = await supabase.rpc(
        'notify_gas_distributors_progressive',
        { order_uuid: newOrder.id }
      );

      if (notifyError) {
        console.error('Error notifying distributors:', notifyError);
      }

      Alert.alert(
        'تم إنشاء الطلب',
        `رقم الطلب: ${orderNumber}\nجاري البحث عن أقرب موزع متاح...`,
        [
          {
            text: 'تتبع الطلب',
            onPress: () => router.push('/gas-delivery/order-tracking' as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('خطأ', 'تعذر إنشاء الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const selectedCylinder = cylinderTypes.find(c => c.id === selectedCylinderType);

  if (loadingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>جاري تحديد موقعك...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔥 توزيع الغاز</Text>
        <Text style={styles.subtitle}>اطلب اسطوانة الغاز إلى موقعك</Text>
      </View>

      {/* Location Info */}
      {currentLocation && (
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={20} color="#FF6B35" />
            <Text style={styles.locationTitle}>موقع التسليم</Text>
          </View>
          <Text style={styles.locationAddress}>{currentLocation.address}</Text>
          <TouchableOpacity 
            style={styles.changeLocationButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.changeLocationText}>تغيير الموقع</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cylinder Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نوع الاسطوانة</Text>
        {cylinderTypes.map((cylinder) => (
          <TouchableOpacity
            key={cylinder.id}
            style={[
              styles.cylinderOption,
              selectedCylinderType === cylinder.id && styles.selectedCylinderOption,
            ]}
            onPress={() => setSelectedCylinderType(cylinder.id)}
          >
            <View style={styles.cylinderInfo}>
              <Text style={styles.cylinderIcon}>{cylinder.icon}</Text>
              <View>
                <Text style={styles.cylinderName}>{cylinder.name}</Text>
                <Text style={styles.cylinderDescription}>{cylinder.description}</Text>
              </View>
            </View>
            <View style={styles.radioButton}>
              {selectedCylinderType === cylinder.id && (
                <View style={styles.radioButtonSelected} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quantity Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الكمية</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nearby Distributors */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>الموزعين القريبين منك</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6B35" />
            <Text style={styles.loadingText}>جاري تحميل الموزعين...</Text>
          </View>
        ) : nearbyDistributors.length > 0 ? (
          nearbyDistributors.map((distributor, index) => (
            <View key={distributor.distributor_id} style={styles.distributorCard}>
              <View style={styles.distributorHeader}>
                <Text style={styles.distributorName}>{distributor.business_name}</Text>
                <Text style={styles.distributorDistance}>
                  {distributor.distance_km.toFixed(1)} كم
                </Text>
              </View>
              <View style={styles.distributorDetails}>
                <Text style={styles.distributorPrice}>
                  {distributor.price_per_cylinder} دينار
                </Text>
                <View style={styles.distributorRating}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {distributor.rating.toFixed(1)} ({distributor.total_orders})
                  </Text>
                </View>
              </View>
              <Text style={styles.distributorPhone}>📞 {distributor.phone}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              لا يوجد موزعين متاحين حالياً في منطقتك
            </Text>
            <TouchableOpacity onPress={loadNearbyDistributors}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Order Button */}
      <TouchableOpacity
        style={[styles.orderButton, loading && styles.disabledButton]}
        onPress={createOrder}
        disabled={loading || !currentLocation}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.orderButtonText}>
            🛒 اطلب {selectedCylinder?.name} ({quantity})
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF6B35',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  changeLocationButton: {
    alignSelf: 'flex-start',
  },
  changeLocationText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  cylinderOption: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  selectedCylinderOption: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F3',
  },
  cylinderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cylinderIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  cylinderName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  cylinderDescription: {
    fontSize: 12,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B35',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
  },
  quantityButton: {
    backgroundColor: '#FF6B35',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 30,
    color: '#333',
  },
  distributorCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  distributorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  distributorDistance: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  distributorDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributorPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28A745',
  },
  distributorRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  distributorPhone: {
    fontSize: 14,
    color: '#666',
  },
  orderButton: {
    backgroundColor: '#FF6B35',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 20,
  },
});
