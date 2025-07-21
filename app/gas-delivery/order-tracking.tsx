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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

interface GasOrder {
  id: string;
  order_number: string;
  cylinder_type: string;
  quantity: number;
  price_per_cylinder: number;
  total_amount: number;
  delivery_address: string;
  status: string;
  search_radius: number;
  created_at: string;
  distributor?: {
    business_name: string;
    phone: string;
  };
}

const statusLabels: Record<string, string> = {
  searching: 'جاري البحث عن موزع',
  accepted: 'تم قبول الطلب',
  en_route: 'في الطريق إليك',
  arrived: 'وصل الموزع',
  delivering: 'جاري التسليم',
  completed: 'تم التسليم',
  cancelled: 'تم الإلغاء',
  no_distributors_found: 'لا يوجد موزعين متاحين',
};

const statusIcons: Record<string, string> = {
  searching: 'search',
  accepted: 'checkmark-circle',
  en_route: 'car',
  arrived: 'location',
  delivering: 'hand-left',
  completed: 'checkmark-done-circle',
  cancelled: 'close-circle',
  no_distributors_found: 'warning',
};

const statusColors: Record<string, string> = {
  searching: '#FFA500',
  accepted: '#007BFF',
  en_route: '#6F42C1',
  arrived: '#17A2B8',
  delivering: '#FD7E14',
  completed: '#28A745',
  cancelled: '#DC3545',
  no_distributors_found: '#DC3545',
};

export default function GasOrderTrackingScreen() {
  const { user } = useAuth();
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<GasOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
      // تحديث البيانات كل 10 ثوانِ
      const interval = setInterval(loadOrderDetails, 10000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;

    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from('gas_delivery_orders')
        .select(`
          *,
          distributor:gas_distributors(business_name, phone)
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error loading order:', error);
        Alert.alert('خطأ', 'تعذر تحميل تفاصيل الطلب');
        return;
      }

      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('خطأ', 'تعذر تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;

    Alert.alert(
      'إلغاء الطلب',
      'هل أنت متأكد من إلغاء هذا الطلب؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم، إلغاء',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('gas_delivery_orders')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                })
                .eq('id', order.id);

              if (error) {
                Alert.alert('خطأ', 'تعذر إلغاء الطلب');
                return;
              }

              Alert.alert('تم الإلغاء', 'تم إلغاء طلبك بنجاح');
              router.back();
            } catch (error) {
              Alert.alert('خطأ', 'تعذر إلغاء الطلب');
            }
          },
        },
      ]
    );
  };

  const retrySearch = async () => {
    if (!order) return;

    try {
      setLoading(true);

      // إعادة تعيين حالة الطلب للبحث
      const { error: updateError } = await supabase
        .from('gas_delivery_orders')
        .update({
          status: 'searching',
          search_radius: 5,
          distributors_notified: [],
        })
        .eq('id', order.id);

      if (updateError) {
        Alert.alert('خطأ', 'تعذر إعادة البحث');
        return;
      }

      // بدء البحث مجدداً
      const { error: notifyError } = await supabase.rpc(
        'notify_gas_distributors_progressive',
        { order_uuid: order.id }
      );

      if (notifyError) {
        console.error('Error notifying distributors:', notifyError);
      }

      Alert.alert('تم', 'جاري البحث عن موزعين متاحين...');
      loadOrderDetails();
    } catch (error) {
      Alert.alert('خطأ', 'تعذر إعادة البحث');
    } finally {
      setLoading(false);
    }
  };

  const getCylinderName = (type: string) => {
    switch (type) {
      case '12kg': return 'اسطوانة 12 كيلو';
      case '25kg': return 'اسطوانة 25 كيلو';
      case 'small': return 'اسطوانة صغيرة';
      default: return type;
    }
  };

  if (loading && !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل الطلب...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={50} color="#DC3545" />
        <Text style={styles.errorText}>لم يتم العثور على الطلب</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>العودة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStatus = order.status;
  const statusLabel = statusLabels[currentStatus] || currentStatus;
  const statusIcon = statusIcons[currentStatus] || 'help';
  const statusColor = statusColors[currentStatus] || '#666';

  return (
    <ScrollView style={styles.container} refreshControl={
      <ScrollView refreshControl={undefined} />
    }>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: statusColor }]}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>تتبع طلب الغاز</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Order Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name={statusIcon as any} size={30} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
        {currentStatus === 'searching' && (
          <Text style={styles.statusSubtext}>
            نطاق البحث الحالي: {order.search_radius} كم
          </Text>
        )}
      </View>

      {/* Order Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>تفاصيل الطلب</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>رقم الطلب:</Text>
          <Text style={styles.detailValue}>{order.order_number}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>نوع الاسطوانة:</Text>
          <Text style={styles.detailValue}>{getCylinderName(order.cylinder_type)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>الكمية:</Text>
          <Text style={styles.detailValue}>{order.quantity}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>المبلغ الإجمالي:</Text>
          <Text style={styles.detailValue}>{order.total_amount} دينار</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>وقت الطلب:</Text>
          <Text style={styles.detailValue}>
            {new Date(order.created_at).toLocaleString('ar')}
          </Text>
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>عنوان التسليم</Text>
        <View style={styles.addressContainer}>
          <Ionicons name="location" size={20} color="#FF6B35" />
          <Text style={styles.addressText}>{order.delivery_address}</Text>
        </View>
      </View>

      {/* Distributor Info */}
      {order.distributor && (
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>معلومات الموزع</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>اسم المؤسسة:</Text>
            <Text style={styles.detailValue}>{order.distributor.business_name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>رقم الهاتف:</Text>
            <Text style={styles.detailValue}>{order.distributor.phone}</Text>
          </View>

          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => {/* Implement call functionality */}}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>الاتصال بالموزع</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {currentStatus === 'searching' && (
          <TouchableOpacity style={styles.retryButton} onPress={retrySearch}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>إعادة البحث</Text>
          </TouchableOpacity>
        )}

        {currentStatus === 'no_distributors_found' && (
          <TouchableOpacity style={styles.retryButton} onPress={retrySearch}>
            <Ionicons name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>المحاولة مرة أخرى</Text>
          </TouchableOpacity>
        )}

        {['searching', 'accepted'].includes(currentStatus) && (
          <TouchableOpacity style={styles.cancelButton} onPress={cancelOrder}>
            <Ionicons name="close" size={20} color="#FFFFFF" />
            <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
          </TouchableOpacity>
        )}

        {currentStatus === 'completed' && (
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => router.push('/gas-delivery/' as any)}
          >
            <Ionicons name="repeat" size={20} color="#FFFFFF" />
            <Text style={styles.reorderButtonText}>طلب مرة أخرى</Text>
          </TouchableOpacity>
        )}
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  backIcon: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#DC3545',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  callButton: {
    backgroundColor: '#28A745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionsContainer: {
    margin: 15,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reorderButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  reorderButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});
