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

interface ShoppingDeliveryRequest {
  id: number;
  shopping_order_id: number;
  business_id: string;
  pickup_address: string;
  delivery_address: string;
  delivery_contact_phone?: string;
  distance_km: number;
  estimated_time: number;
  delivery_fee: number;
  status: string;
  driver_id?: string;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  created_at: string;
  business_name?: string;
  business_phone?: string;
  order_details?: any;
}

export const DriverShoppingDeliveryManager: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ShoppingDeliveryRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<ShoppingDeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShoppingDeliveryRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'available' | 'myDeliveries'>('available');

  useEffect(() => {
    fetchData();
    
    // الاستماع لطلبات التوصيل الجديدة
    const deliverySubscription = supabase
      .channel('driver_shopping_deliveries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopping_delivery_requests',
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_delivery_requests',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      deliverySubscription.unsubscribe();
    };
  }, [user?.id]);

  const fetchData = async () => {
    try {
      // جلب الطلبات المتاحة (غير مُسندة لسائق)
      const { data: availableRequests, error: availableError } = await supabase
        .from('shopping_delivery_requests')
        .select(`
          *,
          business_profiles:profiles!shopping_delivery_requests_business_id_fkey (
            full_name,
            phone
          ),
          shopping_orders (
            order_number,
            total_amount,
            order_type,
            custom_order_text,
            special_instructions
          )
        `)
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;

      // جلب طلبات التوصيل الخاصة بي
      const { data: myDeliveriesData, error: myDeliveriesError } = await supabase
        .from('shopping_delivery_requests')
        .select(`
          *,
          business_profiles:profiles!shopping_delivery_requests_business_id_fkey (
            full_name,
            phone
          ),
          shopping_orders (
            order_number,
            total_amount,
            order_type,
            custom_order_text,
            special_instructions
          )
        `)
        .eq('driver_id', user?.id)
        .in('status', ['assigned', 'picked_up'])
        .order('created_at', { ascending: false });

      if (myDeliveriesError) throw myDeliveriesError;

      const processRequests = (data: any[]) =>
        (data || []).map((request) => ({
          ...request,
          business_name: request.business_profiles?.full_name,
          business_phone: request.business_profiles?.phone,
          order_details: request.shopping_orders,
        }));

      setRequests(processRequests(availableRequests));
      setMyDeliveries(processRequests(myDeliveriesData));
    } catch (error) {
      console.error('Error fetching delivery data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل طلبات التوصيل');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acceptDeliveryRequest = async (requestId: number) => {
    try {
      const { error } = await supabase
        .from('shopping_delivery_requests')
        .update({
          status: 'assigned',
          driver_id: user?.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      fetchData();
      Alert.alert('تم القبول', 'تم قبول طلب التوصيل بنجاح');
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
        .from('shopping_delivery_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // تحديث حالة الطلب الأصلي
      if (newStatus === 'delivered') {
        const request = myDeliveries.find(r => r.id === requestId);
        if (request) {
          await supabase
            .from('shopping_orders')
            .update({ status: 'delivered' })
            .eq('id', request.shopping_order_id);
        }
      }

      fetchData();
      Alert.alert('تم التحديث', `تم تغيير حالة التوصيل إلى: ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating delivery status:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحديث حالة التوصيل');
    }
  };

  const openNavigation = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const callContact = (phoneNumber: string) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url);
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'في الانتظار',
      assigned: 'مُسند',
      picked_up: 'تم الاستلام',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#FF9500',
      assigned: '#007AFF',
      picked_up: '#5856D6',
      delivered: '#34C759',
      cancelled: '#FF3B30',
    };
    return colorMap[status] || '#999';
  };

  const renderRequestItem = ({ item }: { item: ShoppingDeliveryRequest }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedRequest(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.businessName}>{item.business_name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.requestInfo}>
        <Text style={styles.orderNumber}>
          طلب #{item.order_details?.order_number}
        </Text>
        <Text style={styles.deliveryFee}>{item.delivery_fee} ر.س</Text>
      </View>

      <Text style={styles.distance}>
        المسافة: {item.distance_km} كم • الوقت المقدر: {item.estimated_time} دقيقة
      </Text>

      <Text style={styles.deliveryAddress} numberOfLines={2}>
        التوصيل إلى: {item.delivery_address}
      </Text>

      {activeTab === 'available' && (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => acceptDeliveryRequest(item.id)}
        >
          <Text style={styles.acceptButtonText}>قبول التوصيل</Text>
        </TouchableOpacity>
      )}

      {activeTab === 'myDeliveries' && (
        <View style={styles.deliveryActions}>
          {item.status === 'assigned' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.pickupButton]}
              onPress={() => updateDeliveryStatus(item.id, 'picked_up')}
            >
              <Text style={styles.actionButtonText}>تم الاستلام</Text>
            </TouchableOpacity>
          )}
          {item.status === 'picked_up' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deliveredButton]}
              onPress={() => updateDeliveryStatus(item.id, 'delivered')}
            >
              <Text style={styles.actionButtonText}>تم التوصيل</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailsModal = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              تفاصيل طلب التوصيل #{selectedRequest.order_details?.order_number}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* معلومات المنشأة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات المنشأة</Text>
              <Text style={styles.infoText}>الاسم: {selectedRequest.business_name}</Text>
              <Text style={styles.infoText}>الهاتف: {selectedRequest.business_phone}</Text>
              <Text style={styles.infoText}>عنوان الاستلام: {selectedRequest.pickup_address}</Text>
              
              <View style={styles.contactActions}>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => callContact(selectedRequest.business_phone || '')}
                >
                  <Text style={styles.contactButtonText}>📞 اتصال</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => openNavigation(selectedRequest.pickup_address)}
                >
                  <Text style={styles.navButtonText}>🧭 التنقل</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* معلومات التوصيل */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات التوصيل</Text>
              <Text style={styles.infoText}>العنوان: {selectedRequest.delivery_address}</Text>
              {selectedRequest.delivery_contact_phone && (
                <Text style={styles.infoText}>
                  هاتف التواصل: {selectedRequest.delivery_contact_phone}
                </Text>
              )}
              <Text style={styles.infoText}>المسافة: {selectedRequest.distance_km} كم</Text>
              <Text style={styles.infoText}>الوقت المقدر: {selectedRequest.estimated_time} دقيقة</Text>
              
              <View style={styles.contactActions}>
                {selectedRequest.delivery_contact_phone && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={() => callContact(selectedRequest.delivery_contact_phone || '')}
                  >
                    <Text style={styles.contactButtonText}>📞 اتصال بالعميل</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => openNavigation(selectedRequest.delivery_address)}
                >
                  <Text style={styles.navButtonText}>🧭 التنقل للعميل</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* تفاصيل الطلب */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل الطلب</Text>
              <Text style={styles.infoText}>
                نوع الطلب: {selectedRequest.order_details?.order_type === 'offers' ? 'طلب من العروض' : 'طلب مخصص'}
              </Text>
              <Text style={styles.infoText}>
                المبلغ الإجمالي: {selectedRequest.order_details?.total_amount?.toFixed(2)} ر.س
              </Text>
              
              {selectedRequest.order_details?.order_type === 'custom_text' && (
                <View style={styles.customOrderSection}>
                  <Text style={styles.customOrderTitle}>تفاصيل الطلب المخصص:</Text>
                  <Text style={styles.customOrderText}>
                    {selectedRequest.order_details.custom_order_text}
                  </Text>
                </View>
              )}

              {selectedRequest.order_details?.special_instructions && (
                <View style={styles.specialInstructions}>
                  <Text style={styles.sectionTitle}>تعليمات خاصة:</Text>
                  <Text style={styles.infoText}>
                    {selectedRequest.order_details.special_instructions}
                  </Text>
                </View>
              )}
            </View>

            {/* معلومات الأرباح */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات الأرباح</Text>
              <Text style={styles.deliveryFeeText}>
                رسوم التوصيل: {selectedRequest.delivery_fee} ر.س
              </Text>
              <Text style={styles.infoText}>
                وقت الطلب: {new Date(selectedRequest.created_at).toLocaleString('ar-SA')}
              </Text>
              {selectedRequest.assigned_at && (
                <Text style={styles.infoText}>
                  وقت القبول: {new Date(selectedRequest.assigned_at).toLocaleString('ar-SA')}
                </Text>
              )}
              {selectedRequest.picked_up_at && (
                <Text style={styles.infoText}>
                  وقت الاستلام: {new Date(selectedRequest.picked_up_at).toLocaleString('ar-SA')}
                </Text>
              )}
              {selectedRequest.delivered_at && (
                <Text style={styles.infoText}>
                  وقت التوصيل: {new Date(selectedRequest.delivered_at).toLocaleString('ar-SA')}
                </Text>
              )}
            </View>

            {/* إجراءات التوصيل */}
            {activeTab === 'myDeliveries' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>إجراءات التوصيل</Text>
                <View style={styles.modalActions}>
                  {selectedRequest.status === 'assigned' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.pickupButton]}
                      onPress={() => {
                        updateDeliveryStatus(selectedRequest.id, 'picked_up');
                        setShowDetailsModal(false);
                      }}
                    >
                      <Text style={styles.modalActionButtonText}>تأكيد الاستلام</Text>
                    </TouchableOpacity>
                  )}
                  {selectedRequest.status === 'picked_up' && (
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.deliveredButton]}
                      onPress={() => {
                        updateDeliveryStatus(selectedRequest.id, 'delivered');
                        setShowDetailsModal(false);
                      }}
                    >
                      <Text style={styles.modalActionButtonText}>تأكيد التوصيل</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'available' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.modalActionButton, styles.acceptButtonLarge]}
                  onPress={() => {
                    acceptDeliveryRequest(selectedRequest.id);
                    setShowDetailsModal(false);
                  }}
                >
                  <Text style={styles.modalActionButtonText}>قبول طلب التوصيل</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل طلبات التوصيل...</Text>
      </View>
    );
  }

  const currentData = activeTab === 'available' ? requests : myDeliveries;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>توصيل طلبات التسوق</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'available' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('available')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'available' && styles.activeTabText,
              ]}
            >
              الطلبات المتاحة ({requests.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'myDeliveries' && styles.activeTab,
            ]}
            onPress={() => setActiveTab('myDeliveries')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'myDeliveries' && styles.activeTabText,
              ]}
            >
              توصيلاتي ({myDeliveries.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={currentData}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.requestsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'available' 
                ? 'لا توجد طلبات توصيل متاحة حالياً' 
                : 'لا توجد توصيلات نشطة حالياً'
              }
            </Text>
          </View>
        }
      />

      {renderDetailsModal()}
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
    alignItems: 'center',
    borderRadius: 6,
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
  requestsList: {
    flex: 1,
    padding: 10,
  },
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  businessName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  requestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 14,
    color: '#666',
  },
  deliveryFee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  distance: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  deliveryAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickupButton: {
    backgroundColor: '#5856D6',
  },
  deliveredButton: {
    backgroundColor: '#34C759',
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
  contactActions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  contactButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  navButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customOrderSection: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
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
  deliveryFeeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
  },
  modalActions: {
    gap: 10,
  },
  modalActionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptButtonLarge: {
    backgroundColor: '#007AFF',
  },
  modalActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DriverShoppingDeliveryManager;
