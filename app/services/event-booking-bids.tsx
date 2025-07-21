import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Linking,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  Clock,
  Star,
  Phone,
  MessageCircle,
  Car,
  CheckCircle,
  XCircle,
  MapPin,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react-native';

interface DriverBid {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  totalRatings: number;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    color: string;
    type: string;
    seatingCapacity: number;
  };
  bidAmount: number;
  estimatedArrival: number; // minutes
  distance: number; // km
  message?: string;
  features: string[];
  submittedAt: string;
  phoneNumber?: string; // يظهر فقط بعد القبول
}

interface BookingRequest {
  id: string;
  title: string;
  eventType: string;
  guestCount: number;
  date: string;
  time: string;
  duration: {
    type: 'hours' | 'days';
    value: number;
  };
  budget: {
    min: number;
    max: number;
  };
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  biddingEndsAt: string;
  totalBids: number;
}

export default function EventBookingBidsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const [driverBids, setDriverBids] = useState<DriverBid[]>([]);
  const [selectedBid, setSelectedBid] = useState<DriverBid | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    loadBookingData();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadBookingData = async () => {
    try {
      // محاكاة بيانات الطلب
      const mockBooking: BookingRequest = {
        id: '12345',
        title: 'حفل زفاف',
        eventType: 'wedding',
        guestCount: 8,
        date: '2025-07-25',
        time: '18:00',
        duration: { type: 'hours', value: 6 },
        budget: { min: 100, max: 200 },
        status: 'pending',
        biddingEndsAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 دقيقة من الآن
        totalBids: 0
      };

      // محاكاة عروض السائقين
      const mockBids: DriverBid[] = [
        {
          id: 'bid1',
          driverId: 'driver1',
          driverName: 'أحمد محمد',
          driverRating: 4.8,
          totalRatings: 156,
          vehicleInfo: {
            make: 'تويوتا',
            model: 'كامري',
            year: 2020,
            color: 'أسود',
            type: 'فاخرة',
            seatingCapacity: 5
          },
          bidAmount: 150,
          estimatedArrival: 12,
          distance: 3.2,
          message: 'لدي خبرة 8 سنوات في خدمة الأعراس. السيارة مزينة ومجهزة لهذه المناسبة.',
          features: ['decoration', 'photography', 'ac', 'sound'],
          submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: 'bid2',
          driverId: 'driver2',
          driverName: 'محمد أحمد',
          driverRating: 4.6,
          totalRatings: 89,
          vehicleInfo: {
            make: 'مرسيدس',
            model: 'E-Class',
            year: 2019,
            color: 'أبيض',
            type: 'فاخرة',
            seatingCapacity: 5
          },
          bidAmount: 180,
          estimatedArrival: 8,
          distance: 2.1,
          message: 'سيارة فاخرة بيضاء مناسبة للأعراس مع خدمة تصوير مجانية.',
          features: ['decoration', 'photography', 'ac'],
          submittedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
        },
        {
          id: 'bid3',
          driverId: 'driver3',
          driverName: 'سامر علي',
          driverRating: 4.9,
          totalRatings: 203,
          vehicleInfo: {
            make: 'BMW',
            model: 'X5',
            year: 2021,
            color: 'رمادي',
            type: 'SUV',
            seatingCapacity: 7
          },
          bidAmount: 120,
          estimatedArrival: 15,
          distance: 4.8,
          features: ['ac', 'wifi', 'sound'],
          submittedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString()
        }
      ];

      setBookingRequest(mockBooking);
      setDriverBids(mockBids);
      mockBooking.totalBids = mockBids.length;

    } catch (error) {
      console.error('Error loading booking data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    }
  };

  const updateTimeRemaining = () => {
    if (!bookingRequest) return;

    const endTime = new Date(bookingRequest.biddingEndsAt).getTime();
    const now = new Date().getTime();
    const diff = endTime - now;

    if (diff <= 0) {
      setTimeRemaining('انتهت المدة');
      return;
    }

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookingData();
    setRefreshing(false);
  };

  const handleAcceptBid = (bid: DriverBid) => {
    setSelectedBid(bid);
    setShowAcceptModal(true);
  };

  const confirmAcceptBid = async () => {
    if (!selectedBid || !bookingRequest) return;

    try {
      // حساب عمولة التطبيق (10%)
      const appCommission = selectedBid.bidAmount * 0.1;
      const finalAmount = selectedBid.bidAmount;

      console.log('Accepting bid:', {
        bidId: selectedBid.id,
        amount: finalAmount,
        commission: appCommission
      });

      // هنا سيتم إرسال القبول إلى الخادم
      // وسيتم إشعار السائق وتحديث حالة الطلب

      // إضافة رقم الهاتف للسائق المقبول
      const updatedBid = {
        ...selectedBid,
        phoneNumber: '+962791234567' // سيأتي من قاعدة البيانات
      };

      Alert.alert(
        'تم قبول العرض بنجاح',
        `تم قبول عرض ${selectedBid.driverName} بمبلغ ${finalAmount} دينار.\nرقم هاتف السائق: ${updatedBid.phoneNumber}\n\nعمولة التطبيق: ${appCommission.toFixed(2)} دينار`,
        [
          {
            text: 'اتصال بالسائق',
            onPress: () => {
              setShowAcceptModal(false);
              Linking.openURL(`tel:${updatedBid.phoneNumber}`);
            }
          },
          {
            text: 'إرسال رسالة',
            onPress: () => {
              setShowAcceptModal(false);
              Linking.openURL(`sms:${updatedBid.phoneNumber}?body=مرحباً، تم قبول عرضك لخدمة ${bookingRequest.title}`);
            }
          },
          {
            text: 'حسناً',
            onPress: () => setShowAcceptModal(false)
          }
        ]
      );

      // تحديث حالة الطلب
      setBookingRequest(prev => prev ? { ...prev, status: 'accepted' } : null);

    } catch (error) {
      console.error('Error accepting bid:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء قبول العرض');
    }
  };

  const getFeatureName = (featureId: string) => {
    const features = {
      ac: 'تكييف هواء',
      wifi: 'واي فاي',
      sound: 'نظام صوتي',
      decoration: 'زينة للمناسبة',
      child_seats: 'كراسي أطفال',
      tour_guide: 'مرشد سياحي',
      photography: 'خدمة تصوير',
      equipment_space: 'مساحة للمعدات'
    };
    return features[featureId as keyof typeof features] || featureId;
  };

  const sortedBids = [...driverBids].sort((a, b) => {
    // ترتيب حسب التقييم أولاً، ثم السعر
    if (b.driverRating !== a.driverRating) {
      return b.driverRating - a.driverRating;
    }
    return a.bidAmount - b.bidAmount;
  });

  if (!bookingRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>عروض الأسعار</Text>
          <Text style={styles.subtitle}>{bookingRequest.title}</Text>
        </View>

        {/* طلب المعلومات */}
        <View style={styles.bookingInfo}>
          <View style={styles.bookingDetails}>
            <View style={styles.detailRow}>
              <Users size={16} color="#666" />
              <Text style={styles.detailText}>{bookingRequest.guestCount} راكب</Text>
            </View>
            <View style={styles.detailRow}>
              <Calendar size={16} color="#666" />
              <Text style={styles.detailText}>{bookingRequest.date} - {bookingRequest.time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.detailText}>
                {bookingRequest.duration.value} {bookingRequest.duration.type === 'hours' ? 'ساعة' : 'يوم'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <DollarSign size={16} color="#666" />
              <Text style={styles.detailText}>
                الميزانية: {bookingRequest.budget.min} - {bookingRequest.budget.max} دينار
              </Text>
            </View>
          </View>

          <View style={styles.biddingStatus}>
            <Text style={styles.timeRemainingLabel}>الوقت المتبقي:</Text>
            <Text style={[
              styles.timeRemaining,
              timeRemaining === 'انتهت المدة' && styles.timeExpired
            ]}>
              {timeRemaining}
            </Text>
            <Text style={styles.bidsCount}>{bookingRequest.totalBids} عرض مُستلم</Text>
          </View>
        </View>

        {/* عروض السائقين */}
        <View style={styles.bidsSection}>
          <Text style={styles.bidsTitle}>العروض المُستلمة</Text>
          
          {sortedBids.length === 0 ? (
            <View style={styles.noBidsContainer}>
              <Text style={styles.noBidsText}>لم يتم استلام أي عروض بعد</Text>
              <Text style={styles.noBidsSubtext}>سيتم إشعارك عند وصول عروض جديدة</Text>
            </View>
          ) : (
            sortedBids.map((bid) => (
              <View key={bid.id} style={styles.bidCard}>
                <View style={styles.bidHeader}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{bid.driverName}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.rating}>
                        {bid.driverRating} ({bid.totalRatings})
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bidAmount}>
                    <Text style={styles.bidPrice}>{bid.bidAmount} د.أ</Text>
                    <Text style={styles.bidLabel}>السعر المعروض</Text>
                  </View>
                </View>

                <View style={styles.vehicleInfo}>
                  <Car size={16} color="#666" />
                  <Text style={styles.vehicleText}>
                    {bid.vehicleInfo.make} {bid.vehicleInfo.model} {bid.vehicleInfo.year} - {bid.vehicleInfo.color}
                  </Text>
                  <Text style={styles.vehicleCapacity}>
                    ({bid.vehicleInfo.seatingCapacity} مقاعد)
                  </Text>
                </View>

                <View style={styles.locationInfo}>
                  <MapPin size={16} color="#666" />
                  <Text style={styles.locationText}>
                    المسافة: {bid.distance} كم - زمن الوصول: {bid.estimatedArrival} دقيقة
                  </Text>
                </View>

                {bid.features.length > 0 && (
                  <View style={styles.featuresContainer}>
                    <Text style={styles.featuresLabel}>المميزات:</Text>
                    <View style={styles.featuresRow}>
                      {bid.features.map((feature) => (
                        <View key={feature} style={styles.featureTag}>
                          <Text style={styles.featureText}>
                            {getFeatureName(feature)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {bid.message && (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>رسالة من السائق:</Text>
                    <Text style={styles.messageText}>{bid.message}</Text>
                  </View>
                )}

                <View style={styles.bidActions}>
                  <Text style={styles.submittedTime}>
                    مُرسل منذ {Math.floor((Date.now() - new Date(bid.submittedAt).getTime()) / (1000 * 60))} دقيقة
                  </Text>
                  
                  {bookingRequest.status === 'pending' && timeRemaining !== 'انتهت المدة' && (
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptBid(bid)}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.acceptButtonText}>قبول العرض</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Accept Bid Modal */}
      <Modal
        visible={showAcceptModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تأكيد قبول العرض</Text>
            
            {selectedBid && (
              <>
                <Text style={styles.modalText}>
                  هل تريد قبول عرض {selectedBid.driverName} بمبلغ {selectedBid.bidAmount} دينار؟
                </Text>
                
                <View style={styles.commissionInfo}>
                  <Text style={styles.commissionLabel}>تفاصيل التكلفة:</Text>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>سعر الخدمة:</Text>
                    <Text style={styles.costValue}>{selectedBid.bidAmount} د.أ</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>عمولة التطبيق (10%):</Text>
                    <Text style={styles.costValue}>{(selectedBid.bidAmount * 0.1).toFixed(2)} د.أ</Text>
                  </View>
                  <View style={[styles.costRow, styles.totalCostRow]}>
                    <Text style={styles.totalCostLabel}>المجموع:</Text>
                    <Text style={styles.totalCostValue}>{selectedBid.bidAmount} د.أ</Text>
                  </View>
                </View>

                <Text style={styles.modalNote}>
                  * سيتم خصم عمولة التطبيق من السائق
                  {'\n'}* ستحصل على بيانات الاتصال بالسائق فور القبول
                </Text>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAcceptModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmAcceptBid}
              >
                <Text style={styles.confirmButtonText}>تأكيد القبول</Text>
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
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  bookingInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  biddingStatus: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  timeRemainingLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  timeRemaining: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
    marginVertical: 4,
  },
  timeExpired: {
    color: '#F44336',
  },
  bidsCount: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
  },
  bidsSection: {
    margin: 16,
  },
  bidsTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  noBidsContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  noBidsText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  noBidsSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    textAlign: 'center',
  },
  bidCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  bidAmount: {
    alignItems: 'flex-end',
  },
  bidPrice: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
  },
  bidLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    flex: 1,
  },
  vehicleCapacity: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featuresLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#F5B800',
  },
  messageContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
  },
  bidActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submittedTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxWidth: 400,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  commissionInfo: {
    backgroundColor: 'rgba(245, 184, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  commissionLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  costLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  costValue: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  totalCostRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalCostLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  totalCostValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
  },
  modalNote: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    textAlign: 'center',
  },
});
