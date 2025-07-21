import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

interface GasOrder {
  id: string;
  order_number: string;
  cylinder_type: string;
  quantity: number;
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
  distributor?: {
    business_name: string;
  };
}

const statusLabels: Record<string, string> = {
  searching: 'جاري البحث',
  accepted: 'تم القبول',
  en_route: 'في الطريق',
  arrived: 'وصل الموزع',
  delivering: 'جاري التسليم',
  completed: 'تم التسليم',
  cancelled: 'ملغي',
  no_distributors_found: 'لا يوجد موزعين',
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

const getCylinderName = (type: string) => {
  switch (type) {
    case '12kg': return 'اسطوانة 12 كيلو';
    case '25kg': return 'اسطوانة 25 كيلو';
    case 'small': return 'اسطوانة صغيرة';
    default: return type;
  }
};

export default function GasOrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<GasOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      setRefreshing(true);

      const { data, error } = await supabase
        .from('gas_delivery_orders')
        .select(`
          *,
          distributor:gas_distributors(business_name)
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading gas orders:', error);
        Alert.alert('خطأ', 'تعذر تحميل طلبات الغاز');
        return;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error loading gas orders:', error);
      Alert.alert('خطأ', 'تعذر تحميل طلبات الغاز');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOrderPress = (order: GasOrder) => {
    router.push(`/gas-delivery/order-tracking?orderId=${order.id}` as any);
  };

  const renderOrderItem = ({ item }: { item: GasOrder }) => {
    const statusColor = statusColors[item.status] || '#666';
    const statusLabel = statusLabels[item.status] || item.status;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
      >
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('ar-SA')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>نوع الاسطوانة:</Text>
            <Text style={styles.detailValue}>{getCylinderName(item.cylinder_type)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الكمية:</Text>
            <Text style={styles.detailValue}>{item.quantity}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>المبلغ:</Text>
            <Text style={styles.detailValue}>{item.total_amount} دينار</Text>
          </View>

          {item.distributor && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>الموزع:</Text>
              <Text style={styles.detailValue}>{item.distributor.business_name}</Text>
            </View>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.addressContainer}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.addressText} numberOfLines={2}>
            {item.delivery_address}
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => handleOrderPress(item)}
          >
            <Ionicons name="eye" size={16} color="#007BFF" />
            <Text style={styles.trackButtonText}>تتبع الطلب</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="flame" size={60} color="#ccc" />
      <Text style={styles.emptyText}>لا توجد طلبات غاز حالياً</Text>
      <Text style={styles.emptySubtext}>
        عندما تطلب توزيع غاز، ستظهر طلباتك هنا
      </Text>
      <TouchableOpacity
        style={styles.orderNowButton}
        onPress={() => router.push('/gas-delivery/' as any)}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.orderNowButtonText}>اطلب غاز الآن</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>جاري تحميل طلبات الغاز...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flame" size={24} color="#FF6B35" />
        <Text style={styles.headerTitle}>طلبات توزيع الغاز</Text>
        <TouchableOpacity
          onPress={() => router.push('/gas-delivery/' as any)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          orders.length === 0 && styles.emptyListContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={loadOrders}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  addButton: {
    padding: 5,
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
  listContainer: {
    padding: 15,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  trackButtonText: {
    fontSize: 12,
    color: '#007BFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  orderNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  orderNowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
