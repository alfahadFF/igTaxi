import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  MapPin,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Star,
  Phone,
  MessageCircle,
  Check,
  X,
  Car,
  Award
} from 'lucide-react-native';
import { getCurrencyByLocation, DEFAULT_CURRENCY, type Currency, formatCurrency } from '@/utils/currency';
import * as Location from 'expo-location';

interface DriverOffer {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  driverReviews: number;
  profileImage?: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    type: string;
    color: string;
  };
  price: number;
  message: string;
  estimatedDuration: string;
  experience: number;
  completedTrips: number;
  responseTime: string;
  offeredAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface BookingRequest {
  id: string;
  title: string;
  eventType: string;
  date: string;
  time: string;
  guestCount: number;
  duration: {
    type: 'hours' | 'days';
    value: number;
  };
  locations: {
    address: string;
    type: 'pickup' | 'stop' | 'destination';
  }[];
  budget: {
    min: number;
    max: number;
    currency?: Currency;
  };
}

export default function CustomerOffersScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const isRTL = i18n.dir() === 'rtl';

  const [offers, setOffers] = useState<DriverOffer[]>([]);
  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<DriverOffer | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    loadRequestAndOffers();
    detectCurrencyFromLocation();
  }, [requestId]);

  const detectCurrencyFromLocation = async () => {
    try {
      // الحصول على الموقع الحالي
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const currency = await getCurrencyByLocation(
          location.coords.latitude,
          location.coords.longitude
        );
        setCurrentCurrency(currency);
      }
    } catch (error) {
      console.error('Error detecting currency:', error);
    }
  };

  const loadRequestAndOffers = async () => {
    try {
      setLoading(true);
      
      // محاكاة بيانات الطلب
      const mockRequest: BookingRequest = {
        id: requestId || '1',
        title: 'حفل زفاف العائلة',
        eventType: 'wedding',
        date: '2025-08-15',
        time: '16:00',
        guestCount: 6,
        duration: { type: 'hours', value: 8 },
        locations: [
          { address: 'منطقة دابوق، عمان', type: 'pickup' },
          { address: 'قاعة الملكة، العبدلي', type: 'destination' },
          { address: 'منطقة دابوق، عمان', type: 'destination' }
        ],
        budget: { min: 150, max: 300, currency: currentCurrency }
      };

      // محاكاة عروض السائقين
      const mockOffers: DriverOffer[] = [
        {
          id: '1',
          driverId: 'driver1',
          driverName: 'أحمد محمد العلي',
          driverRating: 4.9,
          driverReviews: 127,
          vehicleInfo: {
            make: 'تويوتا',
            model: 'كامري',
            year: 2020,
            type: 'سيدان فاخرة',
            color: 'أسود'
          },
          price: 280,
          message: 'سائق محترف متخصص في خدمة الأعراس مع 8 سنوات خبرة. أضمن لكم خدمة ممتازة وانطلاق في الموعد المحدد.',
          estimatedDuration: '8 ساعات كما هو مطلوب',
          experience: 8,
          completedTrips: 89,
          responseTime: '5 دقائق',
          offeredAt: '2025-07-19T11:00:00Z',
          status: 'pending'
        },
        {
          id: '2',
          driverId: 'driver2',
          driverName: 'محمد أحمد السعود',
          driverRating: 4.7,
          driverReviews: 94,
          vehicleInfo: {
            make: 'مرسيدس',
            model: 'E-Class',
            year: 2019,
            type: 'سيدان فاخرة',
            color: 'فضي'
          },
          price: 320,
          message: 'أقدم خدمة راقية بسيارة مرسيدس مجهزة بأحدث التقنيات. خبرة 5 سنوات في خدمة المناسبات الخاصة.',
          estimatedDuration: 'حسب البرنامج المطلوب',
          experience: 5,
          completedTrips: 67,
          responseTime: '10 دقائق',
          offeredAt: '2025-07-19T11:15:00Z',
          status: 'pending'
        },
        {
          id: '3',
          driverId: 'driver3',
          driverName: 'سامر علي الخالد',
          driverRating: 4.8,
          driverReviews: 156,
          vehicleInfo: {
            make: 'BMW',
            model: 'X5',
            year: 2021,
            type: 'SUV فاخرة',
            color: 'أزرق داكن'
          },
          price: 250,
          message: 'سيارة SUV مريحة وواسعة مناسبة للعائلات. خدمة موثوقة وأسعار منافسة.',
          estimatedDuration: 'مرونة كاملة في التوقيت',
          experience: 6,
          completedTrips: 112,
          responseTime: '3 دقائق',
          offeredAt: '2025-07-19T11:30:00Z',
          status: 'pending'
        }
      ];

      setRequest(mockRequest);
      setOffers(mockOffers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading offers:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل العروض');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequestAndOffers();
    setRefreshing(false);
  };

  const openConfirmModal = (offer: DriverOffer) => {
    setSelectedOffer(offer);
    setShowConfirmModal(true);
  };

  const confirmAcceptOffer = async () => {
    if (!selectedOffer) return;

    try {
      console.log('Accepting offer:', selectedOffer);

      // حساب العمولة (10% من السعر)
      const commission = selectedOffer.price * 0.1;
      const finalPrice = selectedOffer.price;

      // تحديث حالة العرض
      setOffers(prev => 
        prev.map(offer => 
          offer.id === selectedOffer.id 
            ? { ...offer, status: 'accepted' as const }
            : { ...offer, status: 'rejected' as const }
        )
      );

      setShowConfirmModal(false);
      
      Alert.alert(
        'تم قبول العرض بنجاح',
        `تم قبول عرض ${selectedOffer.driverName} بمبلغ ${formatCurrency(finalPrice, currentCurrency)}\n\nسيتم التواصل معك قريباً لتأكيد التفاصيل.\n\nعمولة التطبيق: ${formatCurrency(commission, currentCurrency)}`,
        [
          {
            text: 'التواصل مع السائق',
            onPress: () => {
              // هنا يمكن إضافة منطق التواصل مع السائق
              Alert.alert('معلومات التواصل', `الهاتف: +962791234567\nاسم السائق: ${selectedOffer.driverName}`);
            }
          },
          {
            text: 'حسناً',
            style: 'default'
          }
        ]
      );

    } catch (error) {
      console.error('Accept offer error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء قبول العرض');
    }
  };

  const rejectOffer = async (offerId: string) => {
    try {
      setOffers(prev => 
        prev.map(offer => 
          offer.id === offerId 
            ? { ...offer, status: 'rejected' as const }
            : offer
        )
      );

      Alert.alert('تم رفض العرض', 'تم رفض العرض بنجاح');
    } catch (error) {
      console.error('Reject offer error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء رفض العرض');
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const offered = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - offered.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `قبل ${diffInMinutes} دقيقة`;
    } else if (diffInMinutes < 1440) {
      return `قبل ${Math.floor(diffInMinutes / 60)} ساعة`;
    } else {
      return `قبل ${Math.floor(diffInMinutes / 1440)} يوم`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const pendingOffers = offers.filter(offer => offer.status === 'pending');
  const acceptedOffer = offers.find(offer => offer.status === 'accepted');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <X size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>عروض السائقين</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Request Summary */}
      {request && (
        <View style={styles.requestSummary}>
          <Text style={styles.requestTitle}>{request.title}</Text>
          <View style={styles.requestDetails}>
            <View style={styles.requestDetailItem}>
              <Calendar size={14} color="#666" />
              <Text style={styles.requestDetailText}>
                {formatDate(request.date)} في {request.time}
              </Text>
            </View>
            <View style={styles.requestDetailItem}>
              <Users size={14} color="#666" />
              <Text style={styles.requestDetailText}>{request.guestCount} ركاب</Text>
            </View>
            <View style={styles.requestDetailItem}>
              <Clock size={14} color="#666" />
              <Text style={styles.requestDetailText}>
                {request.duration.value} {request.duration.type === 'hours' ? 'ساعات' : 'أيام'}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.offersContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Accepted Offer */}
        {acceptedOffer && (
          <View style={styles.acceptedOfferContainer}>
            <Text style={styles.acceptedOfferTitle}>العرض المقبول</Text>
            <View style={[styles.offerCard, styles.acceptedOfferCard]}>
              <View style={styles.driverHeader}>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{acceptedOffer.driverName}</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.rating}>
                      {acceptedOffer.driverRating} ({acceptedOffer.driverReviews})
                    </Text>
                  </View>
                </View>
                <View style={styles.acceptedBadge}>
                  <Check size={16} color="#fff" />
                  <Text style={styles.acceptedBadgeText}>مقبول</Text>
                </View>
              </View>

              <View style={styles.vehicleInfo}>
                <Car size={16} color="#666" />
                <Text style={styles.vehicleText}>
                  {acceptedOffer.vehicleInfo.make} {acceptedOffer.vehicleInfo.model} {acceptedOffer.vehicleInfo.year}
                </Text>
              </View>

              <View style={styles.priceContainer}>
                <DollarSign size={20} color="#4CAF50" />
                <Text style={styles.finalPrice}>{formatCurrency(acceptedOffer.price, currentCurrency)}</Text>
              </View>

              <TouchableOpacity style={styles.contactButton}>
                <Phone size={16} color="#fff" />
                <Text style={styles.contactButtonText}>التواصل مع السائق</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pending Offers */}
        {!acceptedOffer && (
          <>
            <Text style={styles.offersTitle}>
              العروض المتاحة ({pendingOffers.length})
            </Text>

            {pendingOffers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                {/* Driver Header */}
                <View style={styles.driverHeader}>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{offer.driverName}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#FFD700" fill="#FFD700" />
                      <Text style={styles.rating}>
                        {offer.driverRating} ({offer.driverReviews})
                      </Text>
                      <Text style={styles.experience}>• {offer.experience} سنوات</Text>
                    </View>
                  </View>
                  <Text style={styles.responseTime}>{getTimeAgo(offer.offeredAt)}</Text>
                </View>

                {/* Vehicle Info */}
                <View style={styles.vehicleInfo}>
                  <Car size={16} color="#666" />
                  <Text style={styles.vehicleText}>
                    {offer.vehicleInfo.make} {offer.vehicleInfo.model} {offer.vehicleInfo.year}
                  </Text>
                  <Text style={styles.vehicleType}>({offer.vehicleInfo.type})</Text>
                </View>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <DollarSign size={20} color="#F5B800" />
                  <Text style={styles.price}>{formatCurrency(offer.price, currentCurrency)}</Text>
                  <Text style={styles.priceNote}>شامل جميع الخدمات</Text>
                </View>

                {/* Message */}
                {offer.message && (
                  <View style={styles.messageContainer}>
                    <MessageCircle size={16} color="#666" />
                    <Text style={styles.message}>{offer.message}</Text>
                  </View>
                )}

                {/* Driver Stats */}
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Award size={14} color="#666" />
                    <Text style={styles.statText}>{offer.completedTrips} رحلة</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Clock size={14} color="#666" />
                    <Text style={styles.statText}>يرد خلال {offer.responseTime}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => rejectOffer(offer.id)}
                  >
                    <Text style={styles.rejectButtonText}>رفض</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => openConfirmModal(offer)}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={styles.acceptButtonText}>قبول العرض</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {pendingOffers.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>لا توجد عروض متاحة بعد</Text>
                <Text style={styles.emptySubtext}>ستصلك العروض من السائقين المهتمين قريباً</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>تأكيد قبول العرض</Text>
            
            {selectedOffer && (
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>
                  هل أنت متأكد من قبول عرض {selectedOffer.driverName}؟
                </Text>
                
                <View style={styles.offerSummary}>
                  <Text style={styles.summaryItem}>السائق: {selectedOffer.driverName}</Text>
                  <Text style={styles.summaryItem}>
                    المركبة: {selectedOffer.vehicleInfo.make} {selectedOffer.vehicleInfo.model}
                  </Text>
                  <Text style={styles.summaryItem}>السعر: {formatCurrency(selectedOffer.price, currentCurrency)}</Text>
                  <Text style={styles.summaryItem}>
                    عمولة التطبيق: {formatCurrency(selectedOffer.price * 0.1, currentCurrency)}
                  </Text>
                </View>
                
                <Text style={styles.modalNote}>
                  بقبول العرض، ستحصل على معلومات التواصل مع السائق وسيتم تأكيد الحجز.
                </Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmAcceptOffer}
              >
                <Text style={styles.modalConfirmText}>تأكيد القبول</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  requestSummary: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  requestTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  requestDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestDetailText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  offersContainer: {
    flex: 1,
    padding: 16,
  },
  acceptedOfferContainer: {
    marginBottom: 20,
  },
  acceptedOfferTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  acceptedOfferCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#f8fff8',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  acceptedBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginLeft: 4,
  },
  finalPrice: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginLeft: 8,
  },
  offersTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  driverHeader: {
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
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginLeft: 4,
  },
  experience: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 8,
  },
  responseTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  vehicleType: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
    marginLeft: 8,
  },
  priceNote: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    lineHeight: 20,
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 0.3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  acceptButton: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
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
  modalContent: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  offerSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryItem: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    marginBottom: 4,
  },
  modalNote: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 0.4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  modalConfirmButton: {
    flex: 0.55,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalConfirmText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
});
