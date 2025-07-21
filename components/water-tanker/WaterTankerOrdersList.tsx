import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Truck, Clock, MapPin, Star, CheckCircle, XCircle } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface WaterTankerOrder {
  id: string;
  order_number: string;
  water_quantity: number;
  price_per_liter: number;
  total_amount: number;
  delivery_address: string;
  status: string;
  created_at: string;
  delivery_completed_at?: string;
  tanker_info?: {
    license_plate: string;
    driver_name: string;
  };
}

const statusMapping = {
  pending: { label: 'في انتظار الموافقة', color: '#ff9800', icon: Clock },
  searching: { label: 'البحث عن صهريج', color: '#2196F3', icon: Clock },
  accepted: { label: 'تم قبول الطلب', color: '#4CAF50', icon: CheckCircle },
  en_route_pickup: { label: 'في الطريق للاستلام', color: '#2196F3', icon: Truck },
  arrived_pickup: { label: 'وصل لموقع الاستلام', color: '#4CAF50', icon: MapPin },
  loading: { label: 'جاري التحميل', color: '#ff9800', icon: Clock },
  en_route_delivery: { label: 'في الطريق للتسليم', color: '#2196F3', icon: Truck },
  arrived_delivery: { label: 'وصل لموقع التسليم', color: '#4CAF50', icon: MapPin },
  delivering: { label: 'جاري التفريغ', color: '#ff9800', icon: Clock },
  completed: { label: 'تم الإنجاز', color: '#4CAF50', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: '#f44336', icon: XCircle }
};

export default function WaterTankerOrdersList() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [orders, setOrders] = useState<WaterTankerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('water_tanker_orders')
        .select(`
          *,
          tanker:water_tankers(
            license_plate,
            driver:profiles(full_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedOrders = (data || []).map(order => ({
        ...order,
        tanker_info: order.tanker ? {
          license_plate: order.tanker.license_plate,
          driver_name: order.tanker.driver?.full_name || 'السائق'
        } : undefined
      }));

      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Load orders error:', error);
      Alert.alert('خطأ', error.message || 'فشل في تحميل الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const navigateToTracking = (orderId: string) => {
    router.push({
      pathname: '/water-tanker/order-tracking',
      params: { orderId }
    });
  };

  const renderOrderItem = ({ item }: { item: WaterTankerOrder }) => {
    const statusInfo = statusMapping[item.status as keyof typeof statusMapping];
    const StatusIcon = statusInfo?.icon || Clock;
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigateToTracking(item.id)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIcon}>
            <Truck size={20} color={Colors.light.primary} />
          </View>
          
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>طلب #{item.order_number}</Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo?.color || '#666' }]}>
            <StatusIcon size={12} color="white" />
            <Text style={styles.statusText}>{statusInfo?.label || item.status}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>الكمية:</Text>
            <Text style={styles.detailValue}>{item.water_quantity.toLocaleString()} لتر</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>المبلغ:</Text>
            <Text style={styles.detailValue}>{item.total_amount.toFixed(2)} د.أ</Text>
          </View>
          
          <View style={styles.addressRow}>
            <MapPin size={14} color="#666" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.delivery_address}
            </Text>
          </View>
        </View>

        {item.tanker_info && (
          <View style={styles.tankerInfo}>
            <Text style={styles.tankerPlate}>الصهريج: {item.tanker_info.license_plate}</Text>
            <Text style={styles.driverName}>السائق: {item.tanker_info.driver_name}</Text>
          </View>
        )}

        {item.status === 'completed' && !item.delivery_completed_at && (
          <View style={styles.ratingPrompt}>
            <Star size={16} color="#FFD700" />
            <Text style={styles.ratingText}>اضغط لتقييم الخدمة</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري تحميل طلبات صهاريج المياه...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Truck size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>لا توجد طلبات صهاريج مياه</Text>
        <Text style={styles.emptySubtitle}>
          عندما تطلب صهريج ماء، ستظهر طلباتك هنا
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Truck size={20} color={Colors.light.primary} />
        <Text style={styles.headerTitle}>طلبات صهاريج المياه</Text>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  orderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  tankerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  tankerPlate: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  driverName: {
    fontSize: 12,
    color: '#666',
  },
  ratingPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
