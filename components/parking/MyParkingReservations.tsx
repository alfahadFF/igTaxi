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
import {
  MapPin,
  Car,
  Clock,
  Calendar,
  CreditCard,
  Phone,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';

interface ParkingReservation {
  id: number;
  reservation_number: string;
  parking_lot_id: number;
  vehicle_plate_number: string;
  vehicle_type: string;
  start_time: string;
  end_time: string;
  duration_type: string;
  duration_hours: number;
  total_amount: number;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  special_requests?: string;
  qr_code_data?: string;
  notes?: string;
  created_at: string;
  parking_lot_name: string;
  parking_lot_location: string;
  parking_lot_phone: string;
  payment_status: string;
  payment_date: string;
}

export const MyParkingReservations: React.FC = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<ParkingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ParkingReservation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user, activeTab]);

  const fetchReservations = async () => {
    try {
      let query = supabase
        .from('parking_reservations_detailed')
        .select('*')
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });

      // فلترة حسب التبويب النشط
      if (activeTab === 'active') {
        query = query.in('status', ['confirmed', 'active']);
      } else if (activeTab === 'completed') {
        query = query.in('status', ['completed', 'cancelled', 'expired']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReservations(data || []);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الحجوزات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cancelReservation = async (reservationId: number) => {
    Alert.alert(
      'إلغاء الحجز',
      'هل أنت متأكد من إلغاء هذا الحجز؟',
      [
        { text: 'لا', style: 'cancel' },
        {
          text: 'نعم، إلغاء',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('parking_reservations')
                .update({ status: 'cancelled' })
                .eq('id', reservationId);

              if (error) throw error;

              Alert.alert('تم الإلغاء', 'تم إلغاء الحجز بنجاح');
              fetchReservations();
            } catch (error) {
              console.error('Error cancelling reservation:', error);
              Alert.alert('خطأ', 'حدث خطأ في إلغاء الحجز');
            }
          }
        }
      ]
    );
  };

  const callParkingLot = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('غير متوفر', 'رقم الموقف غير متوفر');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'في الانتظار',
      confirmed: 'مؤكد',
      active: 'نشط',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      expired: 'منتهي الصلاحية',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#FF9500',
      confirmed: '#007AFF',
      active: '#34C759',
      completed: '#30D158',
      cancelled: '#FF3B30',
      expired: '#8E8E93',
    };
    return colorMap[status] || '#999';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active':
      case 'completed':
        return <CheckCircle size={16} color={getStatusColor(status)} />;
      case 'cancelled':
        return <XCircle size={16} color={getStatusColor(status)} />;
      case 'pending':
      case 'expired':
        return <AlertCircle size={16} color={getStatusColor(status)} />;
      default:
        return <AlertCircle size={16} color="#999" />;
    }
  };

  const getDurationText = (durationType: string, durationHours: number) => {
    switch (durationType) {
      case 'hourly':
        return `${durationHours} ساعة`;
      case 'daily':
        return `${Math.round(durationHours / 24)} يوم`;
      case 'monthly':
        return `${Math.round(durationHours / (24 * 30))} شهر`;
      default:
        return `${durationHours} ساعة`;
    }
  };

  const isReservationCancellable = (reservation: ParkingReservation) => {
    const startTime = new Date(reservation.start_time);
    const now = new Date();
    const timeDiff = startTime.getTime() - now.getTime();
    const hoursUntilStart = timeDiff / (1000 * 60 * 60);

    return (
      reservation.status === 'confirmed' &&
      hoursUntilStart > 1 // يمكن الإلغاء قبل ساعة من موعد البداية
    );
  };

  const renderReservationItem = ({ item }: { item: ParkingReservation }) => (
    <TouchableOpacity
      style={styles.reservationCard}
      onPress={() => {
        setSelectedReservation(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.reservationHeader}>
        <Text style={styles.reservationNumber}>#{item.reservation_number}</Text>
        <View style={styles.statusContainer}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.parkingLotName}>{item.parking_lot_name}</Text>
      
      <View style={styles.locationContainer}>
        <MapPin size={16} color="#666" />
        <Text style={styles.locationText}>{item.parking_lot_location}</Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Car size={16} color="#F5B800" />
          <Text style={styles.detailText}>{item.vehicle_plate_number}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={16} color="#F5B800" />
          <Text style={styles.detailText}>{getDurationText(item.duration_type, item.duration_hours)}</Text>
        </View>
      </View>

      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>من:</Text>
        <Text style={styles.timeText}>
          {new Date(item.start_time).toLocaleString('ar-SA')}
        </Text>
      </View>
      
      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>إلى:</Text>
        <Text style={styles.timeText}>
          {new Date(item.end_time).toLocaleString('ar-SA')}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.amountText}>{item.total_amount.toFixed(2)} ر.س</Text>
        {isReservationCancellable(item) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => cancelReservation(item.id)}
          >
            <Text style={styles.cancelButtonText}>إلغاء</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => {
    if (!selectedReservation) return null;

    return (
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              تفاصيل الحجز #{selectedReservation.reservation_number}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* حالة الحجز */}
            <View style={styles.statusSection}>
              <View style={styles.statusContainer}>
                {getStatusIcon(selectedReservation.status)}
                <Text style={[styles.statusText, { color: getStatusColor(selectedReservation.status) }]}>
                  {getStatusText(selectedReservation.status)}
                </Text>
              </View>
            </View>

            {/* معلومات الموقف */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات الموقف</Text>
              <Text style={styles.infoText}>الاسم: {selectedReservation.parking_lot_name}</Text>
              <Text style={styles.infoText}>الموقع: {selectedReservation.parking_lot_location}</Text>
              
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => callParkingLot(selectedReservation.parking_lot_phone)}
              >
                <Phone size={16} color="white" />
                <Text style={styles.contactButtonText}>اتصال بالموقف</Text>
              </TouchableOpacity>
            </View>

            {/* تفاصيل الحجز */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل الحجز</Text>
              <Text style={styles.infoText}>رقم اللوحة: {selectedReservation.vehicle_plate_number}</Text>
              <Text style={styles.infoText}>نوع المركبة: {selectedReservation.vehicle_type}</Text>
              <Text style={styles.infoText}>
                المدة: {getDurationText(selectedReservation.duration_type, selectedReservation.duration_hours)}
              </Text>
              <Text style={styles.infoText}>
                وقت البداية: {new Date(selectedReservation.start_time).toLocaleString('ar-SA')}
              </Text>
              <Text style={styles.infoText}>
                وقت النهاية: {new Date(selectedReservation.end_time).toLocaleString('ar-SA')}
              </Text>
              
              {selectedReservation.special_requests && (
                <View style={styles.specialRequests}>
                  <Text style={styles.sectionTitle}>طلبات خاصة:</Text>
                  <Text style={styles.infoText}>{selectedReservation.special_requests}</Text>
                </View>
              )}
            </View>

            {/* أوقات الدخول والخروج */}
            {(selectedReservation.check_in_time || selectedReservation.check_out_time) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>أوقات الدخول والخروج</Text>
                {selectedReservation.check_in_time && (
                  <Text style={styles.infoText}>
                    وقت الدخول: {new Date(selectedReservation.check_in_time).toLocaleString('ar-SA')}
                  </Text>
                )}
                {selectedReservation.check_out_time && (
                  <Text style={styles.infoText}>
                    وقت الخروج: {new Date(selectedReservation.check_out_time).toLocaleString('ar-SA')}
                  </Text>
                )}
              </View>
            )}

            {/* تفاصيل الدفع */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>تفاصيل الدفع</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>المبلغ الإجمالي:</Text>
                <Text style={styles.paymentValue}>{selectedReservation.total_amount.toFixed(2)} ر.س</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>حالة الدفع:</Text>
                <Text style={[
                  styles.paymentValue,
                  { color: selectedReservation.payment_status === 'completed' ? '#34C759' : '#FF9500' }
                ]}>
                  {selectedReservation.payment_status === 'completed' ? 'مدفوع' : 'في الانتظار'}
                </Text>
              </View>
              {selectedReservation.payment_date && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>تاريخ الدفع:</Text>
                  <Text style={styles.paymentValue}>
                    {new Date(selectedReservation.payment_date).toLocaleString('ar-SA')}
                  </Text>
                </View>
              )}
            </View>

            {/* معلومات إضافية */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>معلومات إضافية</Text>
              <Text style={styles.infoText}>
                تاريخ الحجز: {new Date(selectedReservation.created_at).toLocaleString('ar-SA')}
              </Text>
              {selectedReservation.notes && (
                <Text style={styles.infoText}>ملاحظات: {selectedReservation.notes}</Text>
              )}
            </View>

            {/* إجراءات */}
            {isReservationCancellable(selectedReservation) && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowDetailsModal(false);
                    cancelReservation(selectedReservation.id);
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>إلغاء الحجز</Text>
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
    fetchReservations();
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>يرجى تسجيل الدخول لعرض حجوزاتك</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* تبويبات */}
      <View style={styles.tabContainer}>
        {[
          { id: 'active', label: 'النشطة', count: reservations.filter(r => ['confirmed', 'active'].includes(r.status)).length },
          { id: 'completed', label: 'المكتملة', count: reservations.filter(r => ['completed', 'cancelled', 'expired'].includes(r.status)).length },
          { id: 'all', label: 'الكل', count: reservations.length },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reservations}
        renderItem={renderReservationItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'active' 
                ? 'لا توجد حجوزات نشطة حالياً' 
                : activeTab === 'completed'
                ? 'لا توجد حجوزات مكتملة'
                : 'لا توجد حجوزات'
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#F5B800',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#F5B800',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  reservationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reservationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  parkingLotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    width: 40,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5B800',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 12,
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
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
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
    marginBottom: 6,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  specialRequests: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalCancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MyParkingReservations;
