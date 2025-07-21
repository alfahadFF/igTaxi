import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Droplets,
  ShoppingCart,
  Plus,
  Minus
} from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  unit: string;
}

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
  products: Product[];
  working_hours: any[];
  delivery_fee: number;
  minimum_order: number;
  delivery_areas: string[];
  logo_url?: string;
  images: string[];
}

interface CartItem extends Product {
  quantity: number;
}

export default function WaterStationDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [station, setStation] = useState<WaterStation | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      loadStationDetails();
    }
  }, [id]);

  const loadStationDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('water_stations')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      
      setStation(data);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل تفاصيل المحطة');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item => 
        item.id === productId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.id !== productId));
    }
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const getCartTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const deliveryFee = station?.delivery_fee || 0;
    return subtotal + deliveryFee;
  };

  const getCartSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const canOrder = () => {
    const subtotal = getCartSubtotal();
    return subtotal >= (station?.minimum_order || 0) && cart.length > 0;
  };

  const handleCall = () => {
    if (station?.phone) {
      Linking.openURL(`tel:${station.phone}`);
    }
  };

  const handleOrder = () => {
    if (!canOrder()) {
      Alert.alert(
        'تنبيه',
        `الحد الأدنى للطلب هو ${station?.minimum_order} دينار`
      );
      return;
    }
    
    // توجيه لصفحة إتمام الطلب
    router.push({
      pathname: '/checkout/water-order',
      params: {
        stationId: station?.id,
        cartItems: JSON.stringify(cart)
      }
    });
  };

  const getCurrentDayStatus = () => {
    if (!station?.working_hours || station.working_hours.length === 0) {
      return { isOpen: false, todayHours: null };
    }
    
    const now = new Date();
    const currentDay = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const todayHours = station.working_hours.find(h => h.day === currentDay);
    
    if (!todayHours || !todayHours.isOpen) {
      return { isOpen: false, todayHours };
    }
    
    const [openHour, openMin] = todayHours.openTime.split(':').map(Number);
    const [closeHour, closeMin] = todayHours.closeTime.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    
    return { isOpen, todayHours };
  };

  const renderProduct = (product: Product) => {
    const quantity = getCartItemQuantity(product.id);
    
    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSize}>{product.size} {product.unit}</Text>
          <Text style={styles.productPrice}>{product.price.toFixed(2)} د.أ</Text>
        </View>
        
        <View style={styles.productActions}>
          {quantity > 0 ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => removeFromCart(product.id)}
              >
                <Minus size={16} color="white" />
              </TouchableOpacity>
              
              <Text style={styles.quantityText}>{quantity}</Text>
              
              <TouchableOpacity 
                style={styles.quantityButton}
                onPress={() => addToCart(product)}
              >
                <Plus size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => addToCart(product)}
            >
              <Plus size={16} color="white" />
              <Text style={styles.addButtonText}>إضافة</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!station) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>المحطة غير موجودة</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = getCurrentDayStatus();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{station.station_name}</Text>
          
          <TouchableOpacity style={styles.callButton} onPress={handleCall}>
            <Phone size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* صورة المحطة */}
        <View style={styles.imageContainer}>
          {station.logo_url ? (
            <Image source={{ uri: station.logo_url }} style={styles.stationImage} />
          ) : (
            <View style={styles.defaultImage}>
              <Droplets size={48} color={Colors.light.primary} />
            </View>
          )}
        </View>

        {/* معلومات المحطة */}
        <View style={styles.stationInfo}>
          <Text style={styles.stationName}>{station.station_name}</Text>
          
          {station.description && (
            <Text style={styles.description}>{station.description}</Text>
          )}
          
          <View style={styles.ratingContainer}>
            <Star size={16} color="#FFD700" fill="#FFD700" />
            <Text style={styles.rating}>{station.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>({station.reviews_count} تقييم)</Text>
          </View>

          <View style={styles.addressContainer}>
            <MapPin size={16} color="#666" />
            <Text style={styles.address}>{station.address}, {station.city}</Text>
          </View>

          <View style={styles.statusContainer}>
            <Clock size={16} color={status.isOpen ? '#4CAF50' : '#ff9800'} />
            <Text style={[styles.status, { color: status.isOpen ? '#4CAF50' : '#ff9800' }]}>
              {status.isOpen ? 'مفتوح الآن' : 'مغلق'}
            </Text>
            {status.todayHours && (
              <Text style={styles.hours}>
                {status.todayHours.openTime} - {status.todayHours.closeTime}
              </Text>
            )}
          </View>

          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryFee}>
              رسوم التوصيل: {station.delivery_fee === 0 ? 'مجاني' : `${station.delivery_fee} د.أ`}
            </Text>
            <Text style={styles.minimumOrder}>
              أقل طلب: {station.minimum_order} د.أ
            </Text>
          </View>
        </View>

        {/* المنتجات */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>المنتجات المتاحة</Text>
          {station.products.map(renderProduct)}
        </View>

        {/* مناطق التوصيل */}
        {station.delivery_areas && station.delivery_areas.length > 0 && (
          <View style={styles.deliveryAreasSection}>
            <Text style={styles.sectionTitle}>مناطق التوصيل</Text>
            <View style={styles.areasContainer}>
              {station.delivery_areas.map((area, index) => (
                <View key={index} style={styles.areaTag}>
                  <Text style={styles.areaText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* السلة العائمة */}
      {cart.length > 0 && (
        <View style={styles.cartContainer}>
          <View style={styles.cartSummary}>
            <View>
              <Text style={styles.cartItemsCount}>{cart.length} منتج</Text>
              <Text style={styles.cartTotal}>{getCartTotal().toFixed(2)} د.أ</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.orderButton, !canOrder() && styles.orderButtonDisabled]}
              onPress={handleOrder}
              disabled={!canOrder()}
            >
              <ShoppingCart size={20} color="white" />
              <Text style={styles.orderButtonText}>اطلب الآن</Text>
            </TouchableOpacity>
          </View>
          
          {!canOrder() && (
            <Text style={styles.minimumOrderWarning}>
              يجب أن يكون إجمالي الطلب {station.minimum_order} د.أ على الأقل
            </Text>
          )}
        </View>
      )}
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
  callButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  defaultImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    backgroundColor: 'white',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 5,
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  address: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  status: {
    fontSize: 15,
    fontWeight: '500',
  },
  hours: {
    fontSize: 14,
    color: '#666',
  },
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  deliveryFee: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  minimumOrder: {
    fontSize: 14,
    color: '#666',
  },
  productsSection: {
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
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productSize: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  productActions: {
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  quantityButton: {
    backgroundColor: Colors.light.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryAreasSection: {
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
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  areaText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  cartContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cartSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemsCount: {
    fontSize: 14,
    color: '#666',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  orderButtonDisabled: {
    backgroundColor: '#ccc',
  },
  orderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  minimumOrderWarning: {
    fontSize: 12,
    color: '#ff9800',
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
});
