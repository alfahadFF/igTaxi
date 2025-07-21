import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

interface CartItem {
  offer?: {
    id: number;
    title: string;
    sale_price: number;
    business_id: string;
    business_name?: string;
  };
  quantity: number;
  special_requests?: string;
}

interface ShoppingOrderFormProps {
  businessId?: string;
  businessName?: string;
  cartItems?: CartItem[];
  onOrderComplete?: () => void;
}

export const ShoppingOrderForm: React.FC<ShoppingOrderFormProps> = ({
  businessId,
  businessName,
  cartItems = [],
  onOrderComplete,
}) => {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<'offers' | 'custom_text'>('offers');
  const [customOrderText, setCustomOrderText] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(15); // رسوم توصيل افتراضية
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderType === 'offers' && cartItems.length > 0) {
      const subtotal = cartItems.reduce(
        (total, item) => total + (item.offer?.sale_price || 0) * item.quantity,
        0
      );
      setEstimatedTotal(subtotal + deliveryFee);
    } else if (orderType === 'custom_text') {
      // للطلبات النصية، سنضع سعر تقديري
      setEstimatedTotal(50 + deliveryFee); // سعر تقديري + رسوم التوصيل
    }
  }, [orderType, cartItems, deliveryFee]);

  const validateForm = () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال عنوان التوصيل');
      return false;
    }

    if (!deliveryPhone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم هاتف التوصيل');
      return false;
    }

    if (orderType === 'offers' && cartItems.length === 0) {
      Alert.alert('خطأ', 'يرجى إضافة عناصر للسلة');
      return false;
    }

    if (orderType === 'custom_text' && !customOrderText.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال تفاصيل الطلب');
      return false;
    }

    return true;
  };

  const submitOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // إنشاء الطلب الأساسي
      const orderData = {
        customer_id: user?.id,
        business_id: businessId || cartItems[0]?.offer?.business_id,
        order_type: orderType,
        custom_order_text: orderType === 'custom_text' ? customOrderText : null,
        special_instructions: specialInstructions || null,
        delivery_address: deliveryAddress,
        delivery_phone: deliveryPhone,
        subtotal: orderType === 'offers' 
          ? cartItems.reduce((total, item) => total + (item.offer?.sale_price || 0) * item.quantity, 0)
          : 50, // سعر تقديري للطلبات النصية
        delivery_fee: deliveryFee,
        service_fee: 0,
        total_amount: estimatedTotal,
        status: 'pending',
        payment_status: 'pending',
        estimated_processing_time: orderType === 'offers' ? 2 : 4, // بالساعات
      };

      const { data: orderResult, error: orderError } = await supabase
        .from('shopping_orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // إضافة عناصر الطلب للطلبات من العروض
      if (orderType === 'offers' && cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          shopping_order_id: orderResult.id,
          offer_id: item.offer?.id,
          item_title: item.offer?.title || '',
          item_description: '',
          item_price: item.offer?.sale_price || 0,
          quantity: item.quantity,
          special_requests: item.special_requests || null,
        }));

        const { error: itemsError } = await supabase
          .from('shopping_order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // إنشاء طلب التوصيل
      const deliveryRequestData = {
        shopping_order_id: orderResult.id,
        business_id: businessId || cartItems[0]?.offer?.business_id,
        pickup_address: 'عنوان المنشأة', // يجب الحصول عليه من بيانات المنشأة
        delivery_address: deliveryAddress,
        delivery_contact_phone: deliveryPhone,
        distance_km: 5, // تقدير افتراضي
        estimated_time: 30, // 30 دقيقة
        delivery_fee: deliveryFee,
        status: 'pending',
        special_delivery_instructions: specialInstructions || null,
      };

      const { error: deliveryError } = await supabase
        .from('shopping_delivery_requests')
        .insert([deliveryRequestData]);

      if (deliveryError) throw deliveryError;

      Alert.alert(
        'تم إرسال الطلب',
        `تم إرسال طلبك بنجاح. رقم الطلب: ${orderResult.order_number}`,
        [
          {
            text: 'موافق',
            onPress: () => {
              if (onOrderComplete) onOrderComplete();
            },
          },
        ]
      );

      // إعادة تعيين النموذج
      resetForm();
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomOrderText('');
    setSpecialInstructions('');
    setDeliveryAddress('');
    setDeliveryPhone('');
  };

  const renderCartSummary = () => {
    if (orderType !== 'offers' || cartItems.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ملخص الطلب</Text>
        {cartItems.map((item, index) => (
          <View key={index} style={styles.cartSummaryItem}>
            <Text style={styles.itemName}>{item.offer?.title}</Text>
            <Text style={styles.itemDetails}>
              {item.quantity} × {item.offer?.sale_price?.toFixed(2)} ر.س = {((item.offer?.sale_price || 0) * item.quantity).toFixed(2)} ر.س
            </Text>
            {item.special_requests && (
              <Text style={styles.itemRequests}>ملاحظات: {item.special_requests}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderPriceSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ملخص التكلفة</Text>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>المجموع الفرعي:</Text>
        <Text style={styles.priceValue}>
          {orderType === 'offers' 
            ? cartItems.reduce((total, item) => total + (item.offer?.sale_price || 0) * item.quantity, 0).toFixed(2)
            : '50.00'
          } ر.س
        </Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>رسوم التوصيل:</Text>
        <Text style={styles.priceValue}>{deliveryFee.toFixed(2)} ر.س</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>رسوم الخدمة:</Text>
        <Text style={styles.priceValue}>0.00 ر.س</Text>
      </View>
      <View style={[styles.priceRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>المجموع الكلي:</Text>
        <Text style={styles.totalValue}>{estimatedTotal.toFixed(2)} ر.س</Text>
      </View>
      {orderType === 'custom_text' && (
        <Text style={styles.estimateNote}>
          * السعر تقديري وقد يتغير حسب تفاصيل الطلب
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إنشاء طلب تسوق</Text>
        {businessName && (
          <Text style={styles.businessName}>من: {businessName}</Text>
        )}
      </View>

      {/* نوع الطلب */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نوع الطلب</Text>
        <View style={styles.orderTypeContainer}>
          <TouchableOpacity
            style={[
              styles.orderTypeButton,
              orderType === 'offers' && styles.orderTypeButtonActive
            ]}
            onPress={() => setOrderType('offers')}
          >
            <Text style={[
              styles.orderTypeText,
              orderType === 'offers' && styles.orderTypeTextActive
            ]}>
              من العروض المتاحة
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.orderTypeButton,
              orderType === 'custom_text' && styles.orderTypeButtonActive
            ]}
            onPress={() => setOrderType('custom_text')}
          >
            <Text style={[
              styles.orderTypeText,
              orderType === 'custom_text' && styles.orderTypeTextActive
            ]}>
              طلب مخصص (نص)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* تفاصيل الطلب */}
      {orderType === 'custom_text' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل الطلب المخصص</Text>
          <TextInput
            style={styles.textArea}
            value={customOrderText}
            onChangeText={setCustomOrderText}
            placeholder="اكتب تفاصيل طلبك هنا..."
            multiline
            numberOfLines={5}
          />
          <Text style={styles.helperText}>
            اكتب تفاصيل واضحة عما تريد شراءه مع الكميات والمواصفات المطلوبة
          </Text>
        </View>
      )}

      {/* ملخص الطلب للعروض */}
      {renderCartSummary()}

      {/* تعليمات خاصة */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>تعليمات خاصة (اختياري)</Text>
        <TextInput
          style={styles.textArea}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="أي تعليمات خاصة للمنشأة أو السائق..."
          multiline
          numberOfLines={3}
        />
      </View>

      {/* معلومات التوصيل */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات التوصيل</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>عنوان التوصيل *</Text>
          <TextInput
            style={styles.input}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="أدخل عنوان التوصيل كاملاً"
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>رقم هاتف التوصيل *</Text>
          <TextInput
            style={styles.input}
            value={deliveryPhone}
            onChangeText={setDeliveryPhone}
            placeholder="05xxxxxxxx"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* ملخص التكلفة */}
      {renderPriceSummary()}

      {/* أزرار العمليات */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={submitOrder}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  businessName: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  orderTypeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  orderTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  orderTypeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  orderTypeTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  cartSummaryItem: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  itemRequests: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  estimateNote: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ShoppingOrderForm;
