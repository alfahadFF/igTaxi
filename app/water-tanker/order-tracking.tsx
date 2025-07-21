import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  MapPin, 
  Truck, 
  Clock,
  Phone,
  Star,
  CheckCircle,
  Circle,
  Navigation
} from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface OrderDetails {
  id: string;
  order_number: string;
  tanker_id: string;
  water_quantity: number;
  price_per_liter: number;
  total_amount: number;
  service_fee: number;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  customer_notes?: string;
  status: string;
  created_at: string;
  accepted_at?: string;
  pickup_started_at?: string;
  pickup_completed_at?: string;
  delivery_started_at?: string;
  delivery_completed_at?: string;
  tanker_info?: {
    license_plate: string;
    tanker_capacity: number;
    driver_phone: string;
    driver_name: string;
    current_latitude: number;
    current_longitude: number;
    rating: number;
  };
}

const statusMapping = {
  pending: { label: 'في انتظار الموافقة', color: '#ff9800', icon: Clock },
  searching: { label: 'البحث عن صهريج', color: '#2196F3', icon: Navigation },
  accepted: { label: 'تم قبول الطلب', color: '#4CAF50', icon: CheckCircle },
  en_route_pickup: { label: 'في الطريق للاستلام', color: '#2196F3', icon: Truck },
  arrived_pickup: { label: 'وصل لموقع الاستلام', color: '#4CAF50', icon: MapPin },
  loading: { label: 'جاري التحميل', color: '#ff9800', icon: Circle },
  en_route_delivery: { label: 'في الطريق للتسليم', color: '#2196F3', icon: Truck },
  arrived_delivery: { label: 'وصل لموقع التسليم', color: '#4CAF50', icon: MapPin },
  delivering: { label: 'جاري التفريغ', color: '#ff9800', icon: Circle },
  completed: { label: 'تم إنجاز الطلب', color: '#4CAF50', icon: CheckCircle },
  cancelled: { label: 'تم إلغاء الطلب', color: '#f44336', icon: Circle }
};

export default function OrderTrackingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
      
      // تحديث كل 30 ثانية
      const interval = setInterval(loadOrderDetails, 30000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('water_tanker_orders')
        .select(`
          *,
          tanker:water_tankers(
            license_plate,
            tanker_capacity,
            current_latitude,
            current_longitude,
            rating,
            driver:profiles(phone, full_name)
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // تنسيق البيانات
      const formattedOrder: OrderDetails = {
        ...data,
        tanker_info: data.tanker ? {
          license_plate: data.tanker.license_plate,
          tanker_capacity: data.tanker.tanker_capacity,
          driver_phone: data.tanker.driver?.phone || '',
          driver_name: data.tanker.driver?.full_name || 'السائق',
          current_latitude: data.tanker.current_latitude,
          current_longitude: data.tanker.current_longitude,
          rating: data.tanker.rating
        } : undefined
      };

      setOrder(formattedOrder);
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تحميل تفاصيل الطلب');
      console.error('Load order error:', error);
    } finally {
      setLoading(false);
    }
  };

  const callDriver = () => {
    if (order?.tanker_info?.driver_phone) {
      Alert.alert(
        'اتصال بالسائق',
        `هل تريد الاتصال بالسائق ${order.tanker_info.driver_name}؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'اتصال', 
            onPress: () => {
              // فتح تطبيق الهاتف
              // Linking.openURL(`tel:${order.tanker_info.driver_phone}`);
            }
          }
        ]
      );
    }
  };

  const cancelOrder = async () => {
    if (!order || order.status === 'completed' || order.status === 'cancelled') {
      return;
    }

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
                .from('water_tanker_orders')
                .update({ 
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString()
                })
                .eq('id', order.id);

              if (error) throw error;

              Alert.alert('تم الإلغاء', 'تم إلغاء الطلب بنجاح');
              loadOrderDetails();
            } catch (error: any) {
              Alert.alert('خطأ', error.message || 'فشل في إلغاء الطلب');
            }
          }
        }
      ]
    );
  };

  const submitRating = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('water_tanker_orders')
        .update({
          customer_rating: rating,
          customer_feedback: feedback
        })
        .eq('id', order.id);

      if (error) throw error;

      Alert.alert('شكراً لك', 'تم إرسال تقييمك بنجاح');
      setShowRatingModal(false);
      loadOrderDetails();
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في إرسال التقييم');
    }
  };

  const renderStatusTimeline = () => {
    if (!order) return null;

    const timelineSteps = [
      { key: 'pending', label: 'تم إنشاء الطلب', time: order.created_at },
      { key: 'accepted', label: 'تم قبول الطلب', time: order.accepted_at },
      { key: 'en_route_pickup', label: 'في الطريق للاستلام', time: order.pickup_started_at },
      { key: 'loading', label: 'جاري التحميل', time: order.pickup_completed_at },
      { key: 'en_route_delivery', label: 'في الطريق للتسليم', time: order.delivery_started_at },
      { key: 'completed', label: 'تم إنجاز الطلب', time: order.delivery_completed_at }
    ];

    const currentStatusIndex = timelineSteps.findIndex(step => step.key === order.status);

    return (
      <View style={styles.timeline}>
        {timelineSteps.map((step, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          
          return (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineCircle,
                  isCompleted && styles.timelineCircleCompleted,
                  isCurrent && styles.timelineCircleCurrent
                ]}>
                  {isCompleted && <CheckCircle size={16} color="white" />}
                </View>
                {index < timelineSteps.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    isCompleted && styles.timelineLineCompleted
                  ]} />
                )}
              </View>
              
              <View style={styles.timelineContent}>
                <Text style={[
                  styles.timelineLabel,
                  isCompleted && styles.timelineLabelCompleted
                ]}>
                  {step.label}
                </Text>
                {step.time && (
                  <Text style={styles.timelineTime}>
                    {new Date(step.time).toLocaleString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل تفاصيل الطلب...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>الطلب غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = statusMapping[order.status as keyof typeof statusMapping];
  const StatusIcon = statusInfo?.icon || Circle;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>تتبع الطلب</Text>
        
        {order.tanker_info && (
          <TouchableOpacity style={styles.callButton} onPress={callDriver}>
            <Phone size={20} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* معلومات الطلب */}
        <View style={styles.section}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderNumber}>طلب رقم: {order.order_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo?.color || '#666' }]}>
              <StatusIcon size={16} color="white" />
              <Text style={styles.statusText}>{statusInfo?.label || order.status}</Text>
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>الكمية:</Text>
              <Text style={styles.detailValue}>{order.water_quantity.toLocaleString()} لتر</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>السعر:</Text>
              <Text style={styles.detailValue}>{order.price_per_liter.toFixed(2)} د.أ / لتر</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>المبلغ الإجمالي:</Text>
              <Text style={styles.detailValue}>{order.total_amount.toFixed(2)} د.أ</Text>
            </View>
          </View>
        </View>

        {/* معلومات الصهريج */}
        {order.tanker_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>معلومات الصهريج</Text>
            
            <View style={styles.tankerCard}>
              <View style={styles.tankerHeader}>
                <Truck size={24} color={Colors.light.primary} />
                <View style={styles.tankerInfo}>
                  <Text style={styles.tankerPlate}>{order.tanker_info.license_plate}</Text>
                  <Text style={styles.driverName}>{order.tanker_info.driver_name}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Star size={16} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.rating}>{order.tanker_info.rating.toFixed(1)}</Text>
                </View>
              </View>
              
              <Text style={styles.tankerCapacity}>
                سعة الصهريج: {order.tanker_info.tanker_capacity.toLocaleString()} لتر
              </Text>
            </View>
          </View>
        )}

        {/* موقع التسليم */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>موقع التسليم</Text>
          
          <View style={styles.locationCard}>
            <MapPin size={20} color={Colors.light.primary} />
            <Text style={styles.locationAddress}>{order.delivery_address}</Text>
          </View>
        </View>

        {/* مراحل الطلب */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مراحل الطلب</Text>
          {renderStatusTimeline()}
        </View>

        {/* أزرار الإجراءات */}
        <View style={styles.actionsSection}>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <TouchableOpacity style={styles.cancelButton} onPress={cancelOrder}>
              <Text style={styles.cancelButtonText}>إلغاء الطلب</Text>
            </TouchableOpacity>
          )}
          
          {order.status === 'completed' && !order.customer_rating && (
            <TouchableOpacity 
              style={styles.rateButton} 
              onPress={() => setShowRatingModal(true)}
            >
              <Star size={20} color="white" />
              <Text style={styles.rateButtonText}>تقييم الخدمة</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* مودال التقييم */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تقييم الخدمة</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <Star 
                    size={32} 
                    color="#FFD700" 
                    fill={star <= rating ? "#FFD700" : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={submitRating}
              >
                <Text style={styles.modalConfirmText}>إرسال التقييم</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  callButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    gap: 10,
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
  tankerCard: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  tankerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  tankerInfo: {
    flex: 1,
  },
  tankerPlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  driverName: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tankerCapacity: {
    fontSize: 14,
    color: '#666',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 10,
  },
  locationAddress: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  timeline: {
    paddingLeft: 10,
  },
  timelineStep: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 15,
  },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineCircleCurrent: {
    backgroundColor: Colors.light.primary,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#ddd',
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: '#4CAF50',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  timelineLabelCompleted: {
    color: '#333',
    fontWeight: '600',
  },
  timelineTime: {
    fontSize: 12,
    color: '#999',
  },
  actionsSection: {
    margin: 15,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rateButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 8,
  },
  rateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 30,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
