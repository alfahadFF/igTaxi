import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Image,
  Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { 
  Droplets, 
  Clock, 
  CheckCircle, 
  XCircle,
  Phone,
  MapPin,
  Star
} from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface WaterOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  final_amount: number;
  delivery_address: string;
  created_at: string;
  estimated_delivery_time?: number;
  water_stations: {
    station_name: string;
    phone: string;
    logo_url?: string;
  };
  items: any[];
}

interface WaterOrdersListProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function WaterOrdersList({ refreshing, onRefresh }: WaterOrdersListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [orders, setOrders] = useState<WaterOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('water_orders')
        .select(`
          *,
          water_stations (
            station_name,
            phone,
            logo_url
          )
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading water orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusMap: { [key: string]: { text: string; color: string; icon: any } } = {
      pending: { text: 'في الانتظار', color: '#ff9800', icon: Clock },
      accepted: { text: 'تم القبول', color: '#2196F3', icon: CheckCircle },
      preparing: { text: 'قيد التحضير', color: '#9C27B0', icon: Clock },
      delivering: { text: 'في الطريق', color: '#FF5722', icon: Clock },
      completed: { text: 'تم التسليم', color: '#4CAF50', icon: CheckCircle },
      cancelled: { text: 'ملغي', color: '#f44336', icon: XCircle },
    };
    return statusMap[status] || statusMap.pending;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrderItem = ({ item }: { item: WaterOrder }) => {
    const statusInfo = getStatusInfo(item.status);
    const StatusIcon = statusInfo.icon;

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => {
          // يمكن إضافة صفحة تفاصيل الطلب لاحقاً
        }}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <View style={styles.orderNumber}>
              <Droplets size={16} color={Colors.light.primary} />
              <Text style={styles.orderNumberText}>{item.order_number}</Text>
            </View>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <StatusIcon size={14} color="white" />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
        </View>

        <View style={styles.stationInfo}>
          <View style={styles.stationDetails}>
            {item.water_stations.logo_url ? (
              <Image 
                source={{ uri: item.water_stations.logo_url }} 
                style={styles.stationLogo} 
              />
            ) : (
              <View style={styles.defaultLogo}>
                <Droplets size={16} color={Colors.light.primary} />
              </View>
            )}
            <View style={styles.stationText}>
              <Text style={styles.stationName}>{item.water_stations.station_name}</Text>
              <View style={styles.addressRow}>
                <MapPin size={12} color="#666" />
                <Text style={styles.address} numberOfLines={1}>
                  {item.delivery_address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.itemsPreview}>
            <Text style={styles.itemsText}>
              {item.items.length} منتج - {item.items.reduce((sum, item) => sum + item.quantity, 0)} قطعة
            </Text>
          </View>
          
          <View style={styles.priceInfo}>
            <Text style={styles.totalAmount}>{item.final_amount.toFixed(2)} د.أ</Text>
            {item.delivery_fee > 0 && (
              <Text style={styles.deliveryFee}>+ {item.delivery_fee.toFixed(2)} توصيل</Text>
            )}
          </View>
        </View>

        {item.estimated_delivery_time && item.status === 'delivering' && (
          <View style={styles.deliveryTime}>
            <Clock size={14} color="#FF5722" />
            <Text style={styles.deliveryTimeText}>
              متوقع الوصول خلال {item.estimated_delivery_time} دقيقة
            </Text>
          </View>
        )}

        {(item.status === 'pending' || item.status === 'accepted') && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.callButton}
              onPress={() => {
                // فتح تطبيق الهاتف للاتصال
                Linking.openURL(`tel:${item.water_stations.phone}`);
              }}
            >
              <Phone size={14} color="white" />
              <Text style={styles.callButtonText}>اتصال</Text>
            </TouchableOpacity>
            
            {item.status === 'pending' && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  // إضافة منطق الإلغاء
                }}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.status === 'completed' && (
          <TouchableOpacity style={styles.rateButton}>
            <Star size={14} color="#FFD700" />
            <Text style={styles.rateButtonText}>قيم الخدمة</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>جاري تحميل طلبات المياه...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Droplets size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>لا توجد طلبات مياه</Text>
        <Text style={styles.emptySubtitle}>
          اطلب المياه من محطات التنقية القريبة منك
        </Text>
        <TouchableOpacity 
          style={styles.orderWaterButton}
          onPress={() => router.push('/(tabs)/water-service')}
        >
          <Text style={styles.orderWaterButtonText}>اطلب المياه الآن</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Droplets size={20} color={Colors.light.primary} />
        <Text style={styles.headerTitle}>طلبات المياه</Text>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              onRefresh();
              loadOrders();
            }} 
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  orderNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
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
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  stationInfo: {
    marginBottom: 12,
  },
  stationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stationLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationText: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemsPreview: {
    flex: 1,
  },
  itemsText: {
    fontSize: 13,
    color: '#666',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  deliveryFee: {
    fontSize: 11,
    color: '#666',
  },
  deliveryTime: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  deliveryTimeText: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  callButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    gap: 4,
  },
  rateButtonText: {
    color: '#F57C00',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
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
    marginBottom: 30,
    lineHeight: 20,
  },
  orderWaterButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  orderWaterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
