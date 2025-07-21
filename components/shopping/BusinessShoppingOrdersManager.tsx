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

interface ShoppingOrder {
  id: number;
  order_number: string;
  customer_id: string;
  order_type: 'offers' | 'custom_text';
  custom_order_text?: string;
  special_instructions?: string;
  delivery_address: string;
  delivery_phone?: string;
  total_amount: number;
  status: string;
  created_at: string;
  estimated_processing_time?: number;
  customer_name?: string;
  customer_phone?: string;
  order_items?: any[];
}

export const BusinessShoppingOrdersManager: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ShoppingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ShoppingOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchOrders();
    
    // الاستماع للطلبات الجديدة
    const ordersSubscription = supabase
      .channel('business_shopping_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopping_orders',
          filter: `business_id=eq.${user?.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_orders',
          filter: `business_id=eq.${user?.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      ordersSubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('shopping_orders')
        .select(`
          *,
          profiles!shopping_orders_customer_id_fkey (
            full_name,
            phone
          )
        `)
        .eq('business_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // جلب عناصر الطلبات للطلبات من العروض
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          if (order.order_type === 'offers') {
            const { data: itemsData } = await supabase
              .from('shopping_order_items')
              .select('*')
              .eq('shopping_order_id', order.id);

            return {
              ...order,
              customer_name: order.profiles?.full_name,
              customer_phone: order.profiles?.phone,
              order_items: itemsData || [],
            };
          }

          return {
            ...order,
            customer_name: order.profiles?.full_name,
            customer_phone: order.profiles?.phone,
          };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (newStatus === 'processing') {
        updateData.processed_at = new Date().toISOString();
      } else if (newStatus === 'ready') {
        // عندما يصبح الطلب جاهز، نقوم بإنشاء طلب توصيل
        await createDeliveryRequest(orderId);
      } else if (newStatus === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shopping_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      fetchOrders();
      Alert.alert('تم التحديث', `تم تغيير حالة الطلب إلى: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث حالة الطلب');
    }
  };

  const createDeliveryRequest = async (orderId: number) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const deliveryRequestData = {
        shopping_order_id: orderId,
        business_id: user?.id,
        pickup_address: 'عنوان المنشأة', // يجب الحصول عليه من بيانات المنشأة
        delivery_address: order.delivery_address,
        delivery_contact_phone: order.delivery_phone,
        distance_km: 5, // تقدير افتراضي
        estimated_time: 30, // 30 دقيقة
        delivery_fee: 15, // رسوم توصيل افتراضية
        status: 'pending',
      };

      const { error } = await supabase
        .from('shopping_delivery_requests')
        .insert([deliveryRequestData]);

      if (error) throw error;

      Alert.alert(
        'طلب التوصيل',
        'تم إنشاء طلب توصيل وإرساله للسائقين المتاحين'
      );
    } catch (error) {
      console.error('Error creating delivery request:', error);
      Alert.alert('خطأ', 'حدث خطأ في إنشاء طلب التوصيل');
    }
  };

  const callCustomer = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      processing: 'قيد المعالجة',
      ready: 'جاهز للتوصيل',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#FF9500',
      confirmed: '#007AFF',
      processing: '#5856D6',
      ready: '#34C759',
      shipped: '#32D74B',
      delivered: '#30D158',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#999';
  };

  const renderOrderItem = ({ item }: { item: ShoppingOrder }) => (
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
      
      <View style={styles.orderInfo}>
        <Text style={styles.customerName}>العميل: {item.customer_name}</Text>
        <Text style={styles.orderAmount}>{item.total_amount.toFixed(2)} ر.س</Text>
      </View>
      
      <Text style={styles.orderType}>
        {item.order_type === 'offers' ? 'طلب من العروض' : 'طلب مخصص'}
      </Text>
      
      <Text style={styles.orderTime}>
        {new Date(item.created_at).toLocaleString('ar-SA')}
      </Text>

      {item.status === 'pending' && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => updateOrderStatus(item.id, 'confirmed')}
          >
            <Text style={styles.actionButtonText}>تأكيد</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => updateOrderStatus(item.id, 'cancelled')}
          >
            <Text style={styles.actionButtonText}>رفض</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        visible={showOrderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>تفاصيل الطلب #{selectedOrder.order_number}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOrderModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* معلومات العميل */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات العميل</Text>
              <Text style={styles.infoText}>الاسم: {selectedOrder.customer_name}</Text>
              <Text style={styles.infoText}>الهاتف: {selectedOrder.customer_phone}</Text>
              <Text style={styles.infoText}>عنوان التوصيل: {selectedOrder.delivery_address}</Text>
              {selectedOrder.delivery_phone && (
                <Text style={styles.infoText}>هاتف التوصيل: {selectedOrder.delivery_phone}</Text>
              )}
              
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => callCustomer(selectedOrder.customer_phone || '')}
              >
                <Text style={styles.contactButtonText}>📞 اتصال بالعميل</Text>
              </TouchableOpacity>
            </View>

            {/* تفاصيل الطلب */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
              
              {selectedOrder.order_type === 'offers' ? (
                selectedOrder.order_items?.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.itemName}>{item.item_title}</Text>
                    <Text style={styles.itemDetails}>
                      الكمية: {item.quantity} × {item.item_price} ر.س = {(item.quantity * item.item_price).toFixed(2)} ر.س
                    </Text>
                    {item.special_requests && (
                      <Text style={styles.itemRequests}>
                        ملاحظات: {item.special_requests}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.customOrderSection}>
                  <Text style={styles.customOrderTitle}>طلب مخصص:</Text>
                  <Text style={styles.customOrderText}>{selectedOrder.custom_order_text}</Text>
                </View>
              )}

              {selectedOrder.special_instructions && (
                <View style={styles.specialInstructions}>
                  <Text style={styles.sectionTitle}>تعليمات خاصة:</Text>
                  <Text style={styles.infoText}>{selectedOrder.special_instructions}</Text>
                </View>
              )}
            </View>

            {/* معلومات إضافية */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات إضافية</Text>
              <Text style={styles.infoText}>
                وقت المعالجة المقدر: {selectedOrder.estimated_processing_time} ساعة
              </Text>
              <Text style={styles.infoText}>
                المبلغ الإجمالي: {selectedOrder.total_amount.toFixed(2)} ر.س
              </Text>
              <Text style={styles.infoText}>
                وقت الطلب: {new Date(selectedOrder.created_at).toLocaleString('ar-SA')}
              </Text>
            </View>

            {/* إجراءات الطلب */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>إدارة الطلب</Text>
              <View style={styles.statusActions}>
                {selectedOrder.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.statusButton, styles.confirmButton]}
                      onPress={() => {
                        updateOrderStatus(selectedOrder.id, 'confirmed');
                        setShowOrderModal(false);
                      }}
                    >
                      <Text style={styles.statusButtonText}>تأكيد الطلب</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusButton, styles.cancelButton]}
                      onPress={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setShowOrderModal(false);
                      }}
                    >
                      <Text style={styles.statusButtonText}>رفض الطلب</Text>
                    </TouchableOpacity>
                  </>
                )}

                {selectedOrder.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.statusButton, styles.processingButton]}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, 'processing');
                      setShowOrderModal(false);
                    }}
                  >
                    <Text style={styles.statusButtonText}>بدء المعالجة</Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.status === 'processing' && (
                  <TouchableOpacity
                    style={[styles.statusButton, styles.readyButton]}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, 'ready');
                      setShowOrderModal(false);
                    }}
                  >
                    <Text style={styles.statusButtonText}>جاهز للتوصيل</Text>
                  </TouchableOpacity>
                )}

                {selectedOrder.status === 'ready' && (
                  <TouchableOpacity
                    style={[styles.statusButton, styles.shippedButton]}
                    onPress={() => {
                      updateOrderStatus(selectedOrder.id, 'shipped');
                      setShowOrderModal(false);
                    }}
                  >
                    <Text style={styles.statusButtonText}>تم التسليم للسائق</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
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
        <Text style={styles.title}>إدارة طلبات التسوق</Text>
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
  orderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  orderType: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  orderTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
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
  itemRequests: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 5,
    fontStyle: 'italic',
  },
  customOrderSection: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  customOrderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  customOrderText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  specialInstructions: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
  },
  statusActions: {
    gap: 10,
  },
  statusButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  processingButton: {
    backgroundColor: '#5856D6',
  },
  readyButton: {
    backgroundColor: '#34C759',
  },
  shippedButton: {
    backgroundColor: '#FF9500',
  },
  statusButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BusinessShoppingOrdersManager;
