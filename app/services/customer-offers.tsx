import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Clock,
  Star,
  Phone,
  Car,
  CheckCircle,
  MapPin,
  Users,
  DollarSign,
  MessageCircle
} from 'lucide-react-native';

interface DriverOffer {
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
  submittedAt: string;
  phoneNumber?: string; // يظهر بعد القبول
}

interface BookingRequest {
  id: string;
  title: string;
  eventType: string;
  guestCount: number;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  expiresAt: string;
}

export default function CustomerOffersScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const isRTL = i18n.dir() === 'rtl';

  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const [driverOffers, setDriverOffers] = useState<DriverOffer[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [acceptedDriver, setAcceptedDriver] = useState<DriverOffer | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // محاكاة بيانات الطلب
      const mockRequest: BookingRequest = {
        id: requestId || '12345',
        title: 'حفل زفاف',
        eventType: 'wedding',
        guestCount: 8,
        date: '2025-07-25',
        time: '18:00',
        status: 'pending',
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString()
      };

      // محاكاة عروض السائقين
      const mockOffers: DriverOffer[] = [
        {
          id: 'offer1',
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
          submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: 'offer2',
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
          submittedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
        },
        {
          id: 'offer3',
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
          submittedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString()
        }
      ];

      setBookingRequest(mockRequest);
      setDriverOffers(mockOffers);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    }
  };

  const updateTimeRemaining = () => {
    if (!bookingRequest) return;

    const endTime = new Date(bookingRequest.expiresAt).getTime();
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
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptOffer = (offer: DriverOffer) => {
    Alert.alert(
      'تأكيد قبول العرض',
      `هل تريد قبول عرض ${offer.driverName} بمبلغ ${offer.bidAmount} دينار؟\n\nملاحظة: سيتم خصم عمولة التطبيق 10% من السائق.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'قبول',
          onPress: () => acceptOffer(offer)
        }
      ]
    );
  };

  const acceptOffer = async (offer: DriverOffer) => {
    try {
      // إضافة رقم الهاتف بعد القبول
      const acceptedOfferWithContact = {
        ...offer,
        phoneNumber: '+962791234567' // سيأتي من قاعدة البيانات
      };

      setAcceptedDriver(acceptedOfferWithContact);
      
      if (bookingRequest) {
        setBookingRequest({ ...bookingRequest, status: 'accepted' });
      }

      Alert.alert(
        'تم قبول العرض بنجاح',
        `تم قبول عرض ${offer.driverName}\nالمبلغ: ${offer.bidAmount} دينار\nرقم الهاتف: ${acceptedOfferWithContact.phoneNumber}`,
        [
          {
            text: 'اتصال بالسائق',
            onPress: () => Linking.openURL(`tel:${acceptedOfferWithContact.phoneNumber}`)
          },
          {
            text: 'إرسال رسالة',
            onPress: () => Linking.openURL(`sms:${acceptedOfferWithContact.phoneNumber}?body=مرحباً، تم قبول عرضك لخدمة ${bookingRequest?.title}`)
          },
          { text: 'حسناً' }
        ]
      );

    } catch (error) {
      console.error('Error accepting offer:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء قبول العرض');
    }
  };

  const sortedOffers = [...driverOffers].sort((a, b) => {
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
          <Text style={styles.title}>العروض المُستلمة</Text>
          <Text style={styles.subtitle}>{bookingRequest.title}</Text>
        </View>

        {/* معلومات الطلب */}
        <View style={styles.requestInfo}>
          <View style={styles.requestDetails}>
            <View style={styles.detailRow}>
              <Users size={16} color="#666" />
              <Text style={styles.detailText}>{bookingRequest.guestCount} راكب</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>{bookingRequest.date} - {bookingRequest.time}</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>الوقت المتبقي:</Text>
            <Text style={[
              styles.timeRemaining,
              timeRemaining === 'انتهت المدة' && styles.timeExpired
            ]}>
              {timeRemaining}
            </Text>
            <Text style={styles.offersCount}>{driverOffers.length} عرض مُستلم</Text>
          </View>
        </View>

        {/* السائق المقبول */}
        {acceptedDriver && (
          <View style={styles.acceptedDriverContainer}>
            <Text style={styles.acceptedTitle}>تم قبول العرض</Text>
            <View style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{acceptedDriver.driverName}</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.rating}>
                      {acceptedDriver.driverRating} ({acceptedDriver.totalRatings})
                    </Text>
                  </View>
                </View>
                <Text style={styles.acceptedPrice}>{acceptedDriver.bidAmount} د.أ</Text>
              </View>

              <View style={styles.vehicleInfo}>
                <Car size={16} color="#666" />
                <Text style={styles.vehicleText}>
                  {acceptedDriver.vehicleInfo.make} {acceptedDriver.vehicleInfo.model} - {acceptedDriver.vehicleInfo.color}
                </Text>
              </View>

              <View style={styles.contactButtons}>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${acceptedDriver.phoneNumber}`)}
                >
                  <Phone size={16} color="#fff" />
                  <Text style={styles.callButtonText}>اتصال</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={() => Linking.openURL(`sms:${acceptedDriver.phoneNumber}`)}
                >
                  <MessageCircle size={16} color="#4CAF50" />
                  <Text style={styles.messageButtonText}>رسالة</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* العروض */}
        {!acceptedDriver && (
          <View style={styles.offersSection}>
            <Text style={styles.offersTitle}>اختر أفضل عرض</Text>
            
            {sortedOffers.length === 0 ? (
              <View style={styles.noOffersContainer}>
                <Text style={styles.noOffersText}>لم يتم استلام أي عروض بعد</Text>
                <Text style={styles.noOffersSubtext}>سيتم إشعارك عند وصول عروض جديدة</Text>
              </View>
            ) : (
              sortedOffers.map((offer) => (
                <View key={offer.id} style={styles.offerCard}>
                  <View style={styles.offerHeader}>
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>{offer.driverName}</Text>
                      <View style={styles.ratingContainer}>
                        <Star size={14} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.rating}>
                          {offer.driverRating} ({offer.totalRatings})
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.offerPrice}>{offer.bidAmount} د.أ</Text>
                      <Text style={styles.priceLabel}>السعر المعروض</Text>
                    </View>
                  </View>

                  <View style={styles.vehicleInfo}>
                    <Car size={16} color="#666" />
                    <Text style={styles.vehicleText}>
                      {offer.vehicleInfo.make} {offer.vehicleInfo.model} {offer.vehicleInfo.year} - {offer.vehicleInfo.color}
                    </Text>
                    <Text style={styles.vehicleCapacity}>
                      ({offer.vehicleInfo.seatingCapacity} مقاعد)
                    </Text>
                  </View>

                  <View style={styles.locationInfo}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.locationText}>
                      المسافة: {offer.distance} كم - زمن الوصول: {offer.estimatedArrival} دقيقة
                    </Text>
                  </View>

                  {offer.message && (
                    <View style={styles.messageContainer}>
                      <Text style={styles.messageLabel}>رسالة من السائق:</Text>
                      <Text style={styles.messageText}>{offer.message}</Text>
                    </View>
                  )}

                  <View style={styles.offerActions}>
                    <Text style={styles.submittedTime}>
                      مُرسل منذ {Math.floor((Date.now() - new Date(offer.submittedAt).getTime()) / (1000 * 60))} دقيقة
                    </Text>
                    
                    {bookingRequest.status === 'pending' && timeRemaining !== 'انتهت المدة' && (
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAcceptOffer(offer)}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.acceptButtonText}>قبول</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
  requestInfo: {
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
  requestDetails: {
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
  statusContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusLabel: {
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
  offersCount: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
  },
  acceptedDriverContainer: {
    margin: 16,
  },
  acceptedTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 12,
  },
  offersSection: {
    margin: 16,
  },
  offersTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  noOffersContainer: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  noOffersText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  noOffersSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    textAlign: 'center',
  },
  offerCard: {
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
  driverCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  offerPrice: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
  },
  acceptedPrice: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#4CAF50',
  },
  priceLabel: {
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
  offerActions: {
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
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  callButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  messageButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
  },
});
