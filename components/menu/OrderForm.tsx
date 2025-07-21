import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';
import BusinessMenu from './BusinessMenu';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  options: any[];
  special_instructions?: string;
}

interface OrderFormProps {
  businessId: string;
  businessName: string;
  onOrderComplete?: (orderId: number) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  businessId,
  businessName,
  onOrderComplete,
}) => {
  const { user } = useAuth();
  const [orderType, setOrderType] = useState<'menu' | 'custom_text'>('menu');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customOrderText, setCustomOrderText] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // حساب إجمالي السعر
  const calculateTotal = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 15; // رسوم توصيل ثابتة
    const serviceFee = subtotal * 0.05; // 5% رسوم خدمة
    return {
      subtotal,
      deliveryFee,
      serviceFee,
      total: subtotal + deliveryFee + serviceFee,
    };
  };

  const handleAddToCart = (item: any, quantity: number, options: any[]) => {
    const cartItem: CartItem = {
      id: item.id,
      name: item.name_ar || item.name,
      price: item.price,
      quantity,
      options,
    };

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        cartItem => cartItem.id === item.id
      );

      if (existingItemIndex > -1) {
        // إذا كان العنصر موجود، زيادة الكمية
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      } else {
        // إضافة عنصر جديد
        return [...prevItems, cartItem];
      }
    });

    setShowMenuModal(false);
    Alert.alert('تم الإضافة', 'تم إضافة العنصر إلى السلة');
  };

  const removeFromCart = (itemId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const submitOrder = async () => {
    if (orderType === 'menu' && cartItems.length === 0) {
      Alert.alert('خطأ', 'يرجى إضافة عناصر إلى السلة');
      return;
    }

    if (orderType === 'custom_text' && !customOrderText.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة تفاصيل الطلب');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال عنوان التوصيل');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, deliveryFee, serviceFee, total } = calculateTotal();

      // إنشاء الطلب الرئيسي
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            customer_id: user?.id,
            business_id: businessId,
            order_type: orderType,
            custom_order_text: orderType === 'custom_text' ? customOrderText : null,
            special_instructions: specialInstructions,
            pickup_address: `${businessName} - موقع المنشأة`, // يمكن تحسينه لاحقاً
            delivery_address: deliveryAddress,
            subtotal,
            delivery_fee: deliveryFee,
            service_fee: serviceFee,
            total_amount: total,
            estimated_preparation_time: orderType === 'menu' ? 30 : 45,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // إضافة عناصر الطلب إذا كان طلب من القائمة
      if (orderType === 'menu' && cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: orderData.id,
          menu_item_id: item.id,
          item_name: item.name,
          item_price: item.price,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // إنشاء طلب توصيل
      const { error: deliveryError } = await supabase
        .from('delivery_requests')
        .insert([
          {
            order_id: orderData.id,
            business_id: businessId,
            pickup_address: `${businessName} - موقع المنشأة`,
            delivery_address: deliveryAddress,
            delivery_fee: deliveryFee,
            estimated_duration: 30,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // ينتهي بعد 30 دقيقة
          },
        ]);

      if (deliveryError) throw deliveryError;

      // إضافة تتبع حالة الطلب
      await supabase
        .from('order_status_history')
        .insert([
          {
            order_id: orderData.id,
            status: 'pending',
            notes: 'تم إنشاء الطلب',
            changed_by: user?.id,
          },
        ]);

      Alert.alert(
        'تم إرسال الطلب!',
        `رقم الطلب: ${orderData.order_number}\nسيتم التواصل معك قريباً لتأكيد الطلب`,
        [
          {
            text: 'موافق',
            onPress: () => {
              // إعادة تعيين النموذج
              setCartItems([]);
              setCustomOrderText('');
              setSpecialInstructions('');
              setDeliveryAddress('');
              setOrderType('menu');
              
              if (onOrderComplete) {
                onOrderComplete(orderData.id);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const prices = calculateTotal();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>طلب من {businessName}</Text>
      </View>

      {/* اختيار نوع الطلب */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>نوع الطلب</Text>
        <View style={styles.orderTypeSelector}>
          <TouchableOpacity
            style={[
              styles.orderTypeButton,
              orderType === 'menu' && styles.selectedOrderType,
            ]}
            onPress={() => setOrderType('menu')}
          >
            <Text
              style={[
                styles.orderTypeText,
                orderType === 'menu' && styles.selectedOrderTypeText,
              ]}
            >
              من القائمة
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.orderTypeButton,
              orderType === 'custom_text' && styles.selectedOrderType,
            ]}
            onPress={() => setOrderType('custom_text')}
          >
            <Text
              style={[
                styles.orderTypeText,
                orderType === 'custom_text' && styles.selectedOrderTypeText,
              ]}
            >
              طلب نصي
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* طلب من القائمة */}
      {orderType === 'menu' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>العناصر المطلوبة</Text>
            <TouchableOpacity
              style={styles.browseMenuButton}
              onPress={() => setShowMenuModal(true)}
            >
              <Text style={styles.browseMenuButtonText}>تصفح القائمة</Text>
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <Text style={styles.emptyCartText}>لم تقم بإضافة أي عناصر بعد</Text>
          ) : (
            cartItems.map((item, index) => (
              <View key={index} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>
                    {item.price} ر.س × {item.quantity} = {(item.price * item.quantity).toFixed(2)} ر.س
                  </Text>
                </View>
                <View style={styles.cartItemActions}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* طلب نصي */}
      {orderType === 'custom_text' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
          <TextInput
            style={styles.textInput}
            placeholder="اكتب تفاصيل طلبك هنا..."
            value={customOrderText}
            onChangeText={setCustomOrderText}
            multiline
            numberOfLines={4}
          />
        </View>
      )}

      {/* ملاحظات خاصة */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ملاحظات خاصة (اختياري)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="أي ملاحظات أو طلبات خاصة..."
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* عنوان التوصيل */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>عنوان التوصيل *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="أدخل عنوان التوصيل التفصيلي..."
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* ملخص الأسعار */}
      {((orderType === 'menu' && cartItems.length > 0) || orderType === 'custom_text') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص الطلب</Text>
          
          {orderType === 'menu' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>المجموع الفرعي:</Text>
              <Text style={styles.priceValue}>{prices.subtotal.toFixed(2)} ر.س</Text>
            </View>
          )}
          
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>رسوم التوصيل:</Text>
            <Text style={styles.priceValue}>{prices.deliveryFee.toFixed(2)} ر.س</Text>
          </View>
          
          {orderType === 'menu' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>رسوم الخدمة:</Text>
              <Text style={styles.priceValue}>{prices.serviceFee.toFixed(2)} ر.س</Text>
            </View>
          )}
          
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>المجموع الكلي:</Text>
            <Text style={styles.totalValue}>
              {orderType === 'menu' ? prices.total.toFixed(2) : prices.deliveryFee.toFixed(2)} ر.س
            </Text>
          </View>
        </View>
      )}

      {/* زر إرسال الطلب */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.disabledButton]}
        onPress={submitOrder}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
        </Text>
      </TouchableOpacity>

      {/* مودال القائمة */}
      <Modal
        visible={showMenuModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>القائمة</Text>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={styles.closeModalButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <BusinessMenu
            businessId={businessId}
            onItemSelect={handleAddToCart}
            showAddToCart={true}
          />
        </View>
      </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  orderTypeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  orderTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  selectedOrderType: {
    backgroundColor: '#007AFF',
  },
  orderTypeText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOrderTypeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  browseMenuButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  browseMenuButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyCartText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#007AFF',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 10,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#34C759',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeModalButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    color: '#666',
  },
});

export default OrderForm;
