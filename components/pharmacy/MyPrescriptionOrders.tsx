import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

interface PrescriptionOrder {
  id: number;
  order_number: string;
  pharmacy_name: string;
  pharmacy_location: string;
  prescription_image_url: string;
  patient_name: string;
  urgent_order: boolean;
  status: string;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  quoted_at?: string;
  approved_at?: string;
  delivered_at?: string;
}

interface MyPrescriptionOrdersProps {
  onSelectOrder: (orderId: number) => void;
}

export default function MyPrescriptionOrders({ onSelectOrder }: MyPrescriptionOrdersProps) {
  const [orders, setOrders] = useState<PrescriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
    
    // اشتراك في التحديثات المباشرة
    const subscription = supabase
      .channel('prescription_orders_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'prescription_orders',
          filter: `customer_id=eq.${user?.id}`
        }, 
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('prescription_orders_detailed')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل قائمة الطلبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getFilteredOrders = () => {
    switch (activeTab) {
      case 'active':
        return orders.filter(order => 
          !['delivered', 'cancelled', 'rejected'].includes(order.status)
        );
      case 'completed':
        return orders.filter(order => 
          ['delivered', 'cancelled', 'rejected'].includes(order.status)
        );
      default:
        return orders;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'reviewed': return '#17a2b8';
      case 'quoted': return '#6f42c1';
      case 'approved': return '#28a745';
      case 'preparing': return '#fd7e14';
      case 'ready': return '#20c997';
      case 'delivering': return '#007bff';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'rejected': return '#dc3545';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'reviewed': return 'تم المراجعة';
      case 'quoted': return 'تم التسعير';
      case 'approved': return 'تم الموافقة';
      case 'preparing': return 'قيد التحضير';
      case 'ready': return 'جاهز للتوصيل';
      case 'delivering': return 'قيد التوصيل';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'reviewed': return 'eye-outline';
      case 'quoted': return 'document-text-outline';
      case 'approved': return 'checkmark-circle-outline';
      case 'preparing': return 'construct-outline';
      case 'ready': return 'bag-check-outline';
      case 'delivering': return 'bicycle-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'rejected': return 'ban-outline';
      default: return 'help-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-AE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderOrderCard = ({ item }: { item: PrescriptionOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onSelectOrder(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderTitleContainer}>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
          {item.urgent_order && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={12} color={colors.error} />
              <Text style={styles.urgentText}>عاجل</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={12} 
            color="#fff" 
          />
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.orderContent}>
        <View style={styles.leftContent}>
          <View style={styles.pharmacyInfo}>
            <Ionicons name="storefront" size={16} color={colors.primary} />
            <Text style={styles.pharmacyName}>{item.pharmacy_name}</Text>
          </View>
          
          <View style={styles.patientInfo}>
            <Ionicons name="person" size={16} color={colors.textSecondary} />
            <Text style={styles.patientName}>المريض: {item.patient_name}</Text>
          </View>

          <View style={styles.dateInfo}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>

          {item.total_amount > 0 && (
            <View style={styles.priceInfo}>
              <Ionicons name="card" size={16} color={colors.success} />
              <Text style={styles.priceText}>{item.total_amount} درهم</Text>
            </View>
          )}
        </View>

        <View style={styles.rightContent}>
          <Image
            source={{ uri: item.prescription_image_url }}
            style={styles.prescriptionThumbnail}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.orderFooter}>
        {item.status === 'quoted' && (
          <View style={styles.actionRequired}>
            <Ionicons name="information-circle" size={16} color={colors.warning} />
            <Text style={styles.actionText}>يتطلب موافقة</Text>
          </View>
        )}
        
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>عرض التفاصيل</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'active' && styles.activeTab]}
        onPress={() => setActiveTab('active')}
      >
        <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
          النشطة
        </Text>
        <View style={[styles.tabBadge, { backgroundColor: colors.warning }]}>
          <Text style={styles.tabBadgeText}>
            {orders.filter(o => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
        onPress={() => setActiveTab('completed')}
      >
        <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
          المكتملة
        </Text>
        <View style={[styles.tabBadge, { backgroundColor: colors.success }]}>
          <Text style={styles.tabBadgeText}>
            {orders.filter(o => ['delivered', 'cancelled', 'rejected'].includes(o.status)).length}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
          الكل
        </Text>
        <View style={[styles.tabBadge, { backgroundColor: colors.textSecondary }]}>
          <Text style={styles.tabBadgeText}>{orders.length}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
      </View>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <View style={styles.container}>
      {renderTabs()}
      
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="document-text-outline" 
              size={64} 
              color={colors.textSecondary} 
            />
            <Text style={styles.emptyTitle}>لا توجد طلبات</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'active' 
                ? 'لا توجد طلبات نشطة حالياً'
                : activeTab === 'completed'
                ? 'لا توجد طلبات مكتملة'
                : 'لم تقم بإرسال أي طلبات بعد'
              }
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: colors.primary + '20',
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginRight: 8,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 10,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  urgentText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  orderContent: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  leftContent: {
    flex: 1,
    marginRight: 15,
  },
  rightContent: {
    width: 60,
  },
  pharmacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    marginLeft: 8,
  },
  prescriptionThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  actionText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
