import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  Droplets, 
  Truck, 
  Star,
  Clock,
  Phone,
  Navigation,
  Plus,
  Minus
} from 'lucide-react-native';
import * as Location from 'expo-location';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface TankerInfo {
  tanker_id: string;
  driver_id: string;
  license_plate: string;
  tanker_capacity: number;
  available_capacity: number;
  price_per_liter: number;
  minimum_order: number;
  rating: number;
  total_trips: number;
  distance_km: number;
  current_latitude: number;
  current_longitude: number;
}

export default function WaterTankerServiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [deliveryLocation, setDeliveryLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  
  const [waterQuantity, setWaterQuantity] = useState(1000); // بالليتر
  const [availableTankers, setAvailableTankers] = useState<TankerInfo[]>([]);
  const [selectedTanker, setSelectedTanker] = useState<TankerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchingTankers, setSearchingTankers] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  
  const quantityOptions = [
    { value: 500, label: '500 لتر' },
    { value: 1000, label: '1000 لتر' },
    { value: 2000, label: '2000 لتر' },
    { value: 5000, label: '5000 لتر' },
    { value: 10000, label: '10000 لتر' }
  ];

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'نحتاج إلى إذن الموقع لإيجاد أقرب صهريج مياه');
        return;
      }
      getCurrentLocation();
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const formattedAddress = address[0] 
        ? `${address[0].street || ''} ${address[0].district || ''} ${address[0].city || ''}`.trim()
        : 'الموقع الحالي';

      setDeliveryLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress
      });
    } catch (error: any) {
      Alert.alert('خطأ', 'فشل في تحديد الموقع الحالي');
      console.error('Location error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchNearbyTankers = async () => {
    if (!deliveryLocation) {
      Alert.alert('تنبيه', 'يرجى تحديد موقع التسليم أولاً');
      return;
    }

    try {
      setSearchingTankers(true);
      
      const { data, error } = await supabase.rpc('find_nearest_available_tankers', {
        delivery_lat: deliveryLocation.latitude,
        delivery_lng: deliveryLocation.longitude,
        required_quantity: waterQuantity,
        max_distance_km: 50,
        limit_count: 10
      });

      if (error) throw error;

      setAvailableTankers(data || []);
      
      if (!data || data.length === 0) {
        Alert.alert(
          'عذراً', 
          'لا توجد صهاريج متاحة في منطقتك حالياً. جرب تقليل الكمية أو المحاولة لاحقاً.'
        );
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في البحث عن الصهاريج');
      console.error('Search error:', error);
    } finally {
      setSearchingTankers(false);
    }
  };

  const selectTanker = (tanker: TankerInfo) => {
    setSelectedTanker(tanker);
  };

  const confirmOrder = async () => {
    if (!selectedTanker || !deliveryLocation) {
      Alert.alert('خطأ', 'يرجى اختيار صهريج وتحديد موقع التسليم');
      return;
    }

    try {
      setLoading(true);

      // إنشاء الطلب
      const { data: orderData, error: orderError } = await supabase
        .from('water_tanker_orders')
        .insert({
          tanker_id: selectedTanker.tanker_id,
          water_quantity: waterQuantity,
          price_per_liter: selectedTanker.price_per_liter,
          total_amount: waterQuantity * selectedTanker.price_per_liter,
          service_fee: Math.max(waterQuantity * selectedTanker.price_per_liter * 0.1, 5),
          delivery_latitude: deliveryLocation.latitude,
          delivery_longitude: deliveryLocation.longitude,
          delivery_address: deliveryLocation.address,
          order_number: `WTO${Date.now()}`
        })
        .select()
        .single();

      if (orderError) throw orderError;

      Alert.alert(
        'تم إنشاء الطلب',
        `تم إنشاء طلب صهريج المياه بنجاح. رقم الطلب: ${orderData.order_number}`,
        [
          {
            text: 'موافق',
            onPress: () => {
              router.push({
                pathname: '/water-tanker/order-tracking',
                params: { orderId: orderData.id }
              });
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إنشاء الطلب');
      console.error('Order creation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeLocation = () => {
    setShowLocationModal(true);
  };

  const confirmCustomLocation = async () => {
    if (!customAddress.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال العنوان');
      return;
    }

    try {
      setLoading(true);
      
      // محاولة تحويل العنوان إلى إحداثيات
      const geocoded = await Location.geocodeAsync(customAddress);
      
      if (geocoded.length > 0) {
        setDeliveryLocation({
          latitude: geocoded[0].latitude,
          longitude: geocoded[0].longitude,
          address: customAddress
        });
        setShowLocationModal(false);
        setCustomAddress('');
      } else {
        Alert.alert('خطأ', 'لم يتم العثور على الموقع. جرب عنوان أكثر تفصيلاً');
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديد الموقع من العنوان');
    } finally {
      setLoading(false);
    }
  };

  const renderTankerCard = (tanker: TankerInfo) => {
    const totalPrice = waterQuantity * tanker.price_per_liter;
    const isSelected = selectedTanker?.tanker_id === tanker.tanker_id;
    
    return (
      <TouchableOpacity
        key={tanker.tanker_id}
        style={[styles.tankerCard, isSelected && styles.selectedTankerCard]}
        onPress={() => selectTanker(tanker)}
      >
        <View style={styles.tankerHeader}>
          <View style={styles.tankerIcon}>
            <Truck size={24} color={Colors.light.primary} />
          </View>
          
          <View style={styles.tankerInfo}>
            <Text style={styles.tankerPlate}>{tanker.license_plate}</Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.rating}>{tanker.rating.toFixed(1)}</Text>
              <Text style={styles.tripsCount}>({tanker.total_trips} رحلة)</Text>
            </View>
          </View>
          
          <View style={styles.distanceContainer}>
            <Text style={styles.distance}>{tanker.distance_km} كم</Text>
            <Text style={styles.eta}>~{Math.ceil(tanker.distance_km * 2)} دقيقة</Text>
          </View>
        </View>

        <View style={styles.tankerDetails}>
          <View style={styles.capacityInfo}>
            <Text style={styles.capacityLabel}>السعة الإجمالية:</Text>
            <Text style={styles.capacityValue}>{tanker.tanker_capacity.toLocaleString()} لتر</Text>
          </View>
          
          <View style={styles.capacityInfo}>
            <Text style={styles.capacityLabel}>المتاح:</Text>
            <Text style={styles.capacityValue}>{tanker.available_capacity.toLocaleString()} لتر</Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.pricePerLiter}>
            {tanker.price_per_liter.toFixed(2)} د.أ / لتر
          </Text>
          <Text style={styles.totalPrice}>
            الإجمالي: {totalPrice.toFixed(2)} د.أ
          </Text>
        </View>

        {tanker.minimum_order > waterQuantity && (
          <Text style={styles.minimumWarning}>
            الحد الأدنى للطلب: {tanker.minimum_order.toLocaleString()} لتر
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>خدمة صهريج الماء</Text>
        
        <View style={styles.headerIcon}>
          <Truck size={24} color="white" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* تحديد موقع التسليم */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>موقع التسليم</Text>
          
          {deliveryLocation ? (
            <TouchableOpacity style={styles.locationCard} onPress={changeLocation}>
              <MapPin size={20} color={Colors.light.primary} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationAddress}>{deliveryLocation.address}</Text>
                <Text style={styles.locationCoords}>
                  {deliveryLocation.latitude.toFixed(6)}, {deliveryLocation.longitude.toFixed(6)}
                </Text>
              </View>
              <Text style={styles.changeLocationText}>تغيير</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.selectLocationButton} onPress={getCurrentLocation}>
              <Navigation size={20} color="white" />
              <Text style={styles.selectLocationText}>
                {loading ? 'جاري تحديد الموقع...' : 'تحديد الموقع الحالي'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* تحديد كمية الماء */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>كمية الماء المطلوبة</Text>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => setWaterQuantity(Math.max(500, waterQuantity - 500))}
            >
              <Minus size={20} color={Colors.light.primary} />
            </TouchableOpacity>
            
            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityValue}>{waterQuantity.toLocaleString()}</Text>
              <Text style={styles.quantityUnit}>لتر</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => setWaterQuantity(waterQuantity + 500)}
            >
              <Plus size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.quantityOptions}>
            {quantityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.quantityOptionButton,
                  waterQuantity === option.value && styles.selectedQuantityOption
                ]}
                onPress={() => setWaterQuantity(option.value)}
              >
                <Text style={[
                  styles.quantityOptionText,
                  waterQuantity === option.value && styles.selectedQuantityOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* البحث عن الصهاريج */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.searchButton, (!deliveryLocation || searchingTankers) && styles.disabledButton]}
            onPress={searchNearbyTankers}
            disabled={!deliveryLocation || searchingTankers}
          >
            <Droplets size={20} color="white" />
            <Text style={styles.searchButtonText}>
              {searchingTankers ? 'جاري البحث...' : 'البحث عن صهاريج متاحة'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* قائمة الصهاريج المتاحة */}
        {availableTankers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الصهاريج المتاحة</Text>
            {availableTankers.map(renderTankerCard)}
          </View>
        )}

        {/* تأكيد الطلب */}
        {selectedTanker && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.confirmButton, loading && styles.disabledButton]}
              onPress={confirmOrder}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? 'جاري إنشاء الطلب...' : 'تأكيد الطلب'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* مودال تغيير الموقع */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تحديد موقع التسليم</Text>
            
            <TextInput
              style={styles.addressInput}
              placeholder="أدخل العنوان (مثال: شارع الملك عبدالله، عمان)"
              value={customAddress}
              onChangeText={setCustomAddress}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowLocationModal(false);
                  setCustomAddress('');
                }}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={confirmCustomLocation}
              >
                <Text style={styles.modalConfirmText}>تأكيد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerIcon: {
    width: 34,
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 10,
  },
  locationInfo: {
    flex: 1,
  },
  locationAddress: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  changeLocationText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  selectLocationButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  selectLocationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    alignItems: 'center',
    minWidth: 100,
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityUnit: {
    fontSize: 14,
    color: '#666',
  },
  quantityOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quantityOptionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedQuantityOption: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  quantityOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedQuantityOptionText: {
    color: 'white',
  },
  searchButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tankerCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  selectedTankerCard: {
    borderColor: Colors.light.primary,
    backgroundColor: '#f0f8ff',
  },
  tankerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  tankerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tankerInfo: {
    flex: 1,
  },
  tankerPlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  tripsCount: {
    fontSize: 12,
    color: '#666',
  },
  distanceContainer: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  eta: {
    fontSize: 12,
    color: '#666',
  },
  tankerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  capacityInfo: {
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 12,
    color: '#666',
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pricePerLiter: {
    fontSize: 14,
    color: '#666',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  minimumWarning: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
    marginTop: 5,
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
