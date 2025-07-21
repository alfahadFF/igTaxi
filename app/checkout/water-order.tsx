import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Wallet,
  DollarSign,
  Clock,
  User,
  Phone
} from 'lucide-react-native';
import * as Location from 'expo-location';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface CartItem {
  id: string;
  name: string;
  size: string;
  price: number;
  unit: string;
  quantity: number;
}

interface WaterStation {
  id: string;
  station_name: string;
  phone: string;
  delivery_fee: number;
  minimum_order: number;
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { stationId, cartItems } = useLocalSearchParams();
  
  const [station, setStation] = useState<WaterStation | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // معلومات التوصيل
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // معلومات الاتصال
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // طريقة الدفع
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');

  const paymentMethods = [
    { id: 'cash', name: 'دفع عند الاستلام', icon: DollarSign },
    { id: 'card', name: 'بطاقة ائتمان', icon: CreditCard },
    { id: 'wallet', name: 'محفظة إلكترونية', icon: Wallet }
  ];

  useEffect(() => {
    loadData();
    getCurrentLocation();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // تحميل بيانات المحطة
      const { data: stationData, error: stationError } = await supabase
        .from('water_stations')
        .select('id, station_name, phone, delivery_fee, minimum_order')
        .eq('id', stationId)
        .single();
      
      if (stationError) throw stationError;
      setStation(stationData);
      
      // تحميل عناصر السلة
      if (cartItems) {
        const parsedItems = JSON.parse(cartItems as string);
        setItems(parsedItems);
      }
      
      // تحميل بيانات المستخدم
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('main_profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setCustomerName(profile.full_name || '');
          setCustomerPhone(profile.phone || '');
        }
      }
      
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل البيانات');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        // الحصول على العنوان
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode[0]) {
          const addr = geocode[0];
          setDeliveryAddress(`${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`);
        }
      }
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotal = () => {
    return getSubtotal() + (station?.delivery_fee || 0);
  };

  const validateOrder = () => {
    if (!customerName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المستلم');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف');
      return false;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال عنوان التوصيل');
      return false;
    }
    if (getSubtotal() < (station?.minimum_order || 0)) {
      Alert.alert('خطأ', `الحد الأدنى للطلب هو ${station?.minimum_order} دينار`);
      return false;
    }
    return true;
  };

  const submitOrder = async () => {
    if (!validateOrder()) return;
    
    setSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
        return;
      }

      const orderData = {
        customer_id: user.id,
        station_id: stationId,
        items: items,
        total_amount: getSubtotal(),
        delivery_fee: station?.delivery_fee || 0,
        final_amount: getTotal(),
        delivery_address: deliveryAddress.trim(),
        delivery_latitude: userLocation?.latitude,
        delivery_longitude: userLocation?.longitude,
        delivery_notes: deliveryNotes.trim() || null,
        payment_method: paymentMethod,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('water_orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'تم بنجاح!',
        `تم إرسال طلبك برقم ${data.order_number}. ستتلقى اتصالاً من المحطة لتأكيد الطلب.`,
        [
          {
            text: 'موافق',
            onPress: () => {
              router.replace('/(tabs)/trips'); // التوجه لصفحة الطلبات
            }
          }
        ]
      );
      
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إتمام الطلب</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ملخص المحطة */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المحطة</Text>
            <Text style={styles.stationName}>{station?.station_name}</Text>
            <Text style={styles.stationPhone}>{station?.phone}</Text>
          </View>

          {/* ملخص الطلب */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملخص الطلب</Text>
            {items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSize}>{item.size} {item.unit}</Text>
                </View>
                <View style={styles.itemQuantity}>
                  <Text style={styles.quantityText}>× {item.quantity}</Text>
                  <Text style={styles.itemPrice}>{(item.price * item.quantity).toFixed(2)} د.أ</Text>
                </View>
              </View>
            ))}
            
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>المجموع الفرعي:</Text>
                <Text style={styles.totalValue}>{getSubtotal().toFixed(2)} د.أ</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>رسوم التوصيل:</Text>
                <Text style={styles.totalValue}>
                  {station?.delivery_fee === 0 ? 'مجاني' : `${station?.delivery_fee?.toFixed(2)} د.أ`}
                </Text>
              </View>
              <View style={[styles.totalRow, styles.finalTotal]}>
                <Text style={styles.finalTotalLabel}>الإجمالي:</Text>
                <Text style={styles.finalTotalValue}>{getTotal().toFixed(2)} د.أ</Text>
              </View>
            </View>
          </View>

          {/* معلومات المستلم */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>معلومات المستلم</Text>
            
            <View style={styles.inputContainer}>
              <User size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="اسم المستلم"
                textAlign="right"
              />
            </View>

            <View style={styles.inputContainer}>
              <Phone size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="رقم الهاتف"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* عنوان التوصيل */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
            
            <View style={styles.addressContainer}>
              <MapPin size={20} color="#666" />
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="العنوان التفصيلي"
                textAlign="right"
                multiline
                numberOfLines={2}
              />
            </View>

            <TextInput
              style={[styles.input, styles.notesInput]}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="ملاحظات إضافية (اختياري)"
              textAlign="right"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* طريقة الدفع */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>طريقة الدفع</Text>
            
            {paymentMethods.map((method) => {
              const IconComponent = method.icon;
              const isSelected = paymentMethod === method.id;
              
              return (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.paymentMethod, isSelected && styles.paymentMethodSelected]}
                  onPress={() => setPaymentMethod(method.id as any)}
                >
                  <IconComponent size={20} color={isSelected ? Colors.light.primary : '#666'} />
                  <Text style={[styles.paymentText, isSelected && styles.paymentTextSelected]}>
                    {method.name}
                  </Text>
                  <View style={[styles.radio, isSelected && styles.radioSelected]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* معلومات إضافية */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.infoText}>زمن التوصيل المتوقع: 30-60 دقيقة</Text>
            </View>
          </View>
        </ScrollView>

        {/* زر التأكيد */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[styles.confirmButton, submitting && styles.confirmButtonDisabled]}
            onPress={submitOrder}
            disabled={submitting}
          >
            <Text style={styles.confirmButtonText}>
              {submitting ? 'جاري الإرسال...' : `تأكيد الطلب - ${getTotal().toFixed(2)} د.أ`}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
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
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
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
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  stationPhone: {
    fontSize: 14,
    color: '#666',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
  },
  itemQuantity: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  totalSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  finalTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'right',
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  paymentMethodSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: '#e3f2fd',
  },
  paymentText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  paymentTextSelected: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioSelected: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  bottomContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
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
});
