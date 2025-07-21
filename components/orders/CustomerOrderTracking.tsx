import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

interface CustomerOrder {
  id: number;
  order_number: string;
  business_id: string;
  order_type: 'menu' | 'custom_text';
  custom_order_text?: string;
  special_instructions?: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  created_at: string;
  confirmed_at?: string;
  prepared_at?: string;
  estimated_preparation_time?: number;
  business?: {
    business_name: string;
    phone?: string;
  };
  delivery_request?: {
    id: number;
    driver_id?: string;
    pickup_address: string;
    delivery_fee: number;
    distance_km?: number;
    estimated_time?: number;
    status: string;
    accepted_at?: string;
    picked_up_at?: string;
    delivered_at?: string;
    driver?: {
      full_name: string;
      phone?: string;
    };
  };
  order_items?: any[];
}

export const CustomerOrderTracking: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchCustomerOrders();
    
    // الاستماع لتحديثات الطلبات
    const ordersSubscription = supabase
      .channel('customer_orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user?.id}`,
        },
        () => {
          fetchCustomerOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
        },
        () => {
          fetchCustomerOrders();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchCustomerOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          business_profiles!orders_business_id_fkey (
            business_name,
            phone
          )
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // جلب تفاصيل التوصيل وعناصر الطلبات
      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          // جلب طلب التوصيل
          const { data: deliveryData } = await supabase
            .from('delivery_requests')
            .select(`
              *,
              profiles!delivery_requests_driver_id_fkey (
                full_name,
                phone
              )
            `)
            .eq('order_id', order.id)
            .single();

          // جلب عناصر الطلب للطلبات من القائمة
          let orderItems = [];
          if (order.order_type === 'menu') {
            const { data: itemsData } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);
            orderItems = itemsData || [];
          }

          return {
            ...order,
            business: {
              business_name: order.business_profiles?.business_name,
              phone: order.business_profiles?.phone,
            },
            delivery_request: deliveryData ? {
              ...deliveryData,
              driver: deliveryData.profiles ? {
                full_name: deliveryData.profiles.full_name,
                phone: deliveryData.profiles.phone,
              } : undefined,
            } : undefined,
            order_items: orderItems,
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    Alert.alert(
      'تأكيد الإلغاء',
      'هل أنت متأكد من إلغاء هذا الطلب؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('orders')
                .update({ 
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                })
                .eq('id', orderId);

              if (error) throw error;

              // إلغاء طلب التوصيل إذا كان موجوداً
              const { error: deliveryError } = await supabase
                .from('delivery_requests')
                .update({ status: 'cancelled' })
                .eq('order_id', orderId);

              fetchCustomerOrders();
              Alert.alert('تم الإلغاء', 'تم إلغاء الطلب بنجاح');
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('خطأ', 'حدث خطأ في إلغاء الطلب');
            }
          },
        },
      ]
    );
  };

  const callBusiness = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  const callDriver = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للتوصيل',
      picked_up: 'تم الاستلام',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#FF9500',
      confirmed: '#007AFF',
      preparing: '#5856D6',
      ready: '#34C759',
      picked_up: '#32D74B',
      delivered: '#30D158',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#999';
  };

  const getDeliveryStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'البحث عن سائق',
      accepted: 'سائق في الطريق',
      picked_up: 'تم استلام الطلب',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
  };

  const getProgressSteps = (order: CustomerOrder) => {
    const steps = [
      { id: 'ordered', label: 'تم الطلب', completed: true },
      { id: 'confirmed', label: 'تأكيد الطلب', completed: order.status !== 'pending' && order.status !== 'cancelled' },
      { id: 'preparing', label: 'قيد التحضير', completed: ['preparing', 'ready', 'picked_up', 'delivered'].includes(order.status) },
      { id: 'ready', label: 'جاهز للتوصيل', completed: ['ready', 'picked_up', 'delivered'].includes(order.status) },
      { id: 'picked_up', label: 'تم الاستلام', completed: ['picked_up', 'delivered'].includes(order.status) },
      { id: 'delivered', label: 'تم التوصيل', completed: order.status === 'delivered' },
    ];

    if (order.status === 'cancelled') {
      return [
        { id: 'ordered', label: 'تم الطلب', completed: true },
        { id: 'cancelled', label: 'تم الإلغاء', completed: true },
      ];
    }

    return steps;
  };

  const renderOrderItem = ({ item }: { item: CustomerOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setShowOrderModal(true);
      }}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>#{item.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <Text style={styles.businessName}>{item.business?.business_name}</Text>
      <Text style={styles.orderAmount}>{item.total_amount.toFixed(2)} ر.س</Text>
      
      {item.delivery_request && (
        <Text style={styles.deliveryStatus}>
          التوصيل: {getDeliveryStatusText(item.delivery_request.status)}
        </Text>
      )}
      
      <Text style={styles.orderTime}>
        {new Date(item.created_at).toLocaleString('ar-SA')}
      </Text>

      {item.status === 'pending' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => cancelOrder(item.id)}
        >
          <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderProgressBar = (steps: any[]) => (
    <View style={styles.progressContainer}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.progressStep}>
          <View style={[
            styles.progressDot,
            step.completed && styles.progressDotCompleted
          ]}>
            {step.completed && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={[
            styles.progressLabel,
            step.completed && styles.progressLabelCompleted
          ]}>
            {step.label}
          </Text>
          {index < steps.length - 1 && (
            <View style={[
              styles.progressLine,
              step.completed && styles.progressLineCompleted
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    const progressSteps = getProgressSteps(selectedOrder);

    return (
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>تتبع الطلب #{selectedOrder.order_number}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOrderModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* شريط التقدم */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>حالة الطلب</Text>
              {renderProgressBar(progressSteps)}
            </View>

            {/* معلومات المنشأة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات المنشأة</Text>
              <Text style={styles.infoText}>الاسم: {selectedOrder.business?.business_name}</Text>
              {selectedOrder.business?.phone && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => callBusiness(selectedOrder.business?.phone || '')}
                >
                  <Text style={styles.contactButtonText}>📞 اتصال بالمنشأة</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* تفاصيل الطلب */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
              
              {selectedOrder.order_type === 'menu' ? (
                selectedOrder.order_items?.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    <Text style={styles.itemDetails}>
                      الكمية: {item.quantity} × {item.item_price} ر.س
                    </Text>
                    {item.special_instructions && (
                      <Text style={styles.itemInstructions}>
                        ملاحظات: {item.special_instructions}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.customOrderText}>{selectedOrder.custom_order_text}</Text>
              )}

              {selectedOrder.special_instructions && (
                <View style={styles.specialInstructions}>
                  <Text style={styles.sectionTitle}>ملاحظات خاصة:</Text>
                  <Text style={styles.infoText}>{selectedOrder.special_instructions}</Text>
                </View>
              )}

              <Text style={styles.totalAmount}>
                المبلغ الإجمالي: {selectedOrder.total_amount.toFixed(2)} ر.س
              </Text>
            </View>

            {/* معلومات التوصيل */}
            {selectedOrder.delivery_request && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>معلومات التوصيل</Text>
                <Text style={styles.infoText}>
                  حالة التوصيل: {getDeliveryStatusText(selectedOrder.delivery_request.status)}
                </Text>
                <Text style={styles.infoText}>
                  رسوم التوصيل: {selectedOrder.delivery_request.delivery_fee.toFixed(2)} ر.س
                </Text>
                <Text style={styles.infoText}>
                  المسافة: {selectedOrder.delivery_request.distance_km?.toFixed(1)} كم
                </Text>
                <Text style={styles.infoText}>
                  الوقت المقدر: {selectedOrder.delivery_request.estimated_time} دقيقة
                </Text>

                {selectedOrder.delivery_request.driver && (
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverTitle}>معلومات السائق:</Text>
                    <Text style={styles.infoText}>
                      الاسم: {selectedOrder.delivery_request.driver.full_name}
                    </Text>
                    {selectedOrder.delivery_request.driver.phone && (
                      <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => callDriver(selectedOrder.delivery_request?.driver?.phone || '')}
                      >
                        <Text style={styles.contactButtonText}>📞 اتصال بالسائق</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* عنوان التوصيل */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
              <Text style={styles.addressText}>{selectedOrder.delivery_address}</Text>
            </View>

            {/* أوقات مهمة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>التوقيتات</Text>
              <Text style={styles.infoText}>
                وقت الطلب: {new Date(selectedOrder.created_at).toLocaleString('ar-SA')}
              </Text>
              {selectedOrder.confirmed_at && (
                <Text style={styles.infoText}>
                  وقت التأكيد: {new Date(selectedOrder.confirmed_at).toLocaleString('ar-SA')}
                </Text>
              )}
              {selectedOrder.prepared_at && (
                <Text style={styles.infoText}>
                  وقت الانتهاء من التحضير: {new Date(selectedOrder.prepared_at).toLocaleString('ar-SA')}
                </Text>
              )}
              {selectedOrder.delivery_request?.delivered_at && (
                <Text style={styles.infoText}>
                  وقت التوصيل: {new Date(selectedOrder.delivery_request.delivered_at).toLocaleString('ar-SA')}
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomerOrders();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>طلباتي</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد طلبات حالياً</Text>
          </View>
        }
      />

      {renderOrderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  ordersList: {
    flex: 1,
    padding: 10,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  businessName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  deliveryStatus: {
    fontSize: 14,
    color: '#5856D6',
    marginBottom: 5,
  },
  orderTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
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
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  progressContainer: {
    paddingVertical: 10,
  },
  progressStep: {
    alignItems: 'center',
    marginBottom: 15,
  },
  progressDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressDotCompleted: {
    backgroundColor: '#34C759',
  },
  checkMark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  progressLabelCompleted: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  progressLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginTop: 5,
  },
  progressLineCompleted: {
    backgroundColor: '#34C759',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  contactButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderItem: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDetails: {
    fontSize: 12,
    color: '#666',
  },
  itemInstructions: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 5,
  },
  customOrderText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  specialInstructions: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
  },
  driverInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
  },
  driverTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
});

export default CustomerOrderTracking;
