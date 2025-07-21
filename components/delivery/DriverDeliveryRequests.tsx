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

interface DeliveryRequest {
  id: number;
  order_id: number;
  driver_id?: string;
  pickup_address: string;
  delivery_address: string;
  distance_km?: number;
  estimated_time?: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  order?: {
    order_number: string;
    business_name: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number;
    special_instructions?: string;
  };
}

export const DriverDeliveryRequests: React.FC = () => {
  const { user } = useAuth();
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRequest | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'my_deliveries'>('available');

  useEffect(() => {
    fetchDeliveryRequests();
    fetchMyDeliveries();
    
    // الاستماع لطلبات التوصيل الجديدة
    const deliverySubscription = supabase
      .channel('delivery_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_requests',
          filter: 'status=eq.pending',
        },
        () => {
          fetchDeliveryRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_requests',
          filter: `driver_id=eq.${user?.id}`,
        },
        () => {
          fetchMyDeliveries();
        }
      )
      .subscribe();

    return () => {
      deliverySubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchDeliveryRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          orders (
            order_number,
            total_amount,
            special_instructions,
            business_profiles!orders_business_id_fkey (
              business_name
            ),
            profiles!orders_customer_id_fkey (
              full_name,
              phone
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(request => ({
        ...request,
        order: {
          order_number: request.orders?.order_number,
          business_name: request.orders?.business_profiles?.business_name,
          customer_name: request.orders?.profiles?.full_name,
          customer_phone: request.orders?.profiles?.phone,
          total_amount: request.orders?.total_amount,
          special_instructions: request.orders?.special_instructions,
        }
      })) || [];

      setDeliveryRequests(formattedData);
    } catch (error) {
      console.error('Error fetching delivery requests:', error);
    }
  };

  const fetchMyDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_requests')
        .select(`
          *,
          orders (
            order_number,
            total_amount,
            special_instructions,
            business_profiles!orders_business_id_fkey (
              business_name
            ),
            profiles!orders_customer_id_fkey (
              full_name,
              phone
            )
          )
        `)
        .eq('driver_id', user?.id)
        .in('status', ['accepted', 'picked_up'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(request => ({
        ...request,
        order: {
          order_number: request.orders?.order_number,
          business_name: request.orders?.business_profiles?.business_name,
          customer_name: request.orders?.profiles?.full_name,
          customer_phone: request.orders?.profiles?.phone,
          total_amount: request.orders?.total_amount,
          special_instructions: request.orders?.special_instructions,
        }
      })) || [];

      setMyDeliveries(formattedData);
    } catch (error) {
      console.error('Error fetching my deliveries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acceptDeliveryRequest = async (requestId: number) => {
    try {
      const { error } = await supabase
        .from('delivery_requests')
        .update({
          driver_id: user?.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // تحديث حالة الطلب إلى picked_up
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'picked_up' })
        .eq('id', selectedDelivery?.order_id);

      if (orderError) throw orderError;

      Alert.alert('تم القبول', 'تم قبول طلب التوصيل بنجاح');
      fetchDeliveryRequests();
      fetchMyDeliveries();
      setShowDeliveryModal(false);
    } catch (error) {
      console.error('Error accepting delivery request:', error);
      Alert.alert('خطأ', 'حدث خطأ في قبول طلب التوصيل');
    }
  };

  const updateDeliveryStatus = async (requestId: number, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'picked_up') {
        updateData.picked_up_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('delivery_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // تحديث حالة الطلب المرتبط
      if (newStatus === 'delivered') {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'delivered' })
          .eq('id', selectedDelivery?.order_id);

        if (orderError) throw orderError;
      }

      Alert.alert('تم التحديث', `تم تحديث حالة التوصيل`);
      fetchMyDeliveries();
      setShowDeliveryModal(false);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث حالة التوصيل');
    }
  };

  const openGoogleMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const callCustomer = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'في الانتظار',
      accepted: 'مقبول',
      picked_up: 'تم الاستلام',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#FF9500',
      accepted: '#007AFF',
      picked_up: '#5856D6',
      delivered: '#34C759',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#999';
  };

  const renderDeliveryItem = ({ item }: { item: DeliveryRequest }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => {
        setSelectedDelivery(item);
        setShowDeliveryModal(true);
      }}
    >
      <View style={styles.deliveryHeader}>
        <Text style={styles.orderNumber}>طلب #{item.order?.order_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.deliveryInfo}>
        <Text style={styles.businessName}>{item.order?.business_name}</Text>
        <Text style={styles.deliveryFee}>{item.delivery_fee.toFixed(2)} ر.س</Text>
      </View>
      
      <Text style={styles.customerName}>العميل: {item.order?.customer_name}</Text>
      <Text style={styles.distance}>
        المسافة: {item.distance_km?.toFixed(1)} كم • الوقت المقدر: {item.estimated_time} دقيقة
      </Text>
      
      <Text style={styles.deliveryTime}>
        {new Date(item.created_at).toLocaleString('ar-SA')}
      </Text>
    </TouchableOpacity>
  );

  const renderDeliveryModal = () => {
    if (!selectedDelivery) return null;

    return (
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              تفاصيل التوصيل - طلب #{selectedDelivery.order?.order_number}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDeliveryModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* معلومات المنشأة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات المنشأة</Text>
              <Text style={styles.infoText}>الاسم: {selectedDelivery.order?.business_name}</Text>
              <Text style={styles.infoText}>عنوان الاستلام: {selectedDelivery.pickup_address}</Text>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => openGoogleMaps(selectedDelivery.pickup_address)}
              >
                <Text style={styles.mapButtonText}>📍 فتح في الخريطة</Text>
              </TouchableOpacity>
            </View>

            {/* معلومات العميل */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات العميل</Text>
              <Text style={styles.infoText}>الاسم: {selectedDelivery.order?.customer_name}</Text>
              <Text style={styles.infoText}>الهاتف: {selectedDelivery.order?.customer_phone}</Text>
              <Text style={styles.infoText}>عنوان التوصيل: {selectedDelivery.delivery_address}</Text>
              
              <View style={styles.customerActions}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => callCustomer(selectedDelivery.order?.customer_phone || '')}
                >
                  <Text style={styles.callButtonText}>📞 اتصال</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => openGoogleMaps(selectedDelivery.delivery_address)}
                >
                  <Text style={styles.mapButtonText}>📍 فتح في الخريطة</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* تفاصيل التوصيل */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل التوصيل</Text>
              <Text style={styles.infoText}>
                المسافة: {selectedDelivery.distance_km?.toFixed(1)} كم
              </Text>
              <Text style={styles.infoText}>
                الوقت المقدر: {selectedDelivery.estimated_time} دقيقة
              </Text>
              <Text style={styles.infoText}>
                رسوم التوصيل: {selectedDelivery.delivery_fee.toFixed(2)} ر.س
              </Text>
              <Text style={styles.infoText}>
                قيمة الطلب: {selectedDelivery.order?.total_amount.toFixed(2)} ر.س
              </Text>
            </View>

            {selectedDelivery.order?.special_instructions && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ملاحظات خاصة</Text>
                <Text style={styles.specialInstructions}>
                  {selectedDelivery.order.special_instructions}
                </Text>
              </View>
            )}

            {/* إجراءات التوصيل */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>إدارة التوصيل</Text>
              <View style={styles.deliveryActions}>
                {selectedDelivery.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => acceptDeliveryRequest(selectedDelivery.id)}
                  >
                    <Text style={styles.actionButtonText}>قبول طلب التوصيل</Text>
                  </TouchableOpacity>
                )}

                {selectedDelivery.status === 'accepted' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pickupButton]}
                    onPress={() => updateDeliveryStatus(selectedDelivery.id, 'picked_up')}
                  >
                    <Text style={styles.actionButtonText}>تم استلام الطلب</Text>
                  </TouchableOpacity>
                )}

                {selectedDelivery.status === 'picked_up' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deliveredButton]}
                    onPress={() => updateDeliveryStatus(selectedDelivery.id, 'delivered')}
                  >
                    <Text style={styles.actionButtonText}>تم توصيل الطلب</Text>
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
    if (activeTab === 'available') {
      fetchDeliveryRequests();
    } else {
      fetchMyDeliveries();
    }
  };

  const renderTabContent = () => {
    const data = activeTab === 'available' ? deliveryRequests : myDeliveries;
    
    return (
      <FlatList
        data={data}
        renderItem={renderDeliveryItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.deliveryList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'available' 
                ? 'لا توجد طلبات توصيل متاحة حالياً' 
                : 'لا توجد توصيلات نشطة'}
            </Text>
          </View>
        }
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل طلبات التوصيل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>طلبات التوصيل</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'available' && styles.activeTab
            ]}
            onPress={() => setActiveTab('available')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'available' && styles.activeTabText
            ]}>
              الطلبات المتاحة ({deliveryRequests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'my_deliveries' && styles.activeTab
            ]}
            onPress={() => setActiveTab('my_deliveries')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'my_deliveries' && styles.activeTabText
            ]}>
              توصيلاتي ({myDeliveries.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderTabContent()}
      {renderDeliveryModal()}
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
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deliveryList: {
    flex: 1,
    padding: 10,
  },
  deliveryCard: {
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
  deliveryHeader: {
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
  deliveryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  businessName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  deliveryFee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  distance: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#999',
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
    fontSize: 16,
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
  customerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  specialInstructions: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
    lineHeight: 20,
  },
  deliveryActions: {
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  pickupButton: {
    backgroundColor: '#5856D6',
  },
  deliveredButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DriverDeliveryRequests;
