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
  Truck,
  Award,
  Package,
  Weight
} from 'lucide-react-native';
import { getCurrencyByLocation, DEFAULT_CURRENCY, type Currency, formatCurrency } from '@/utils/currency';
import * as Location from 'expo-location';

interface TransporterOffer {
  id: string;
  transporterId: string;
  transporterName: string;
  transporterRating: number;
  transporterReviews: number;
  profileImage?: string;
  vehicleInfo: {
    make: string;
    model: string;
    year: number;
    type: string;
    capacity: string;
  };
  price: number;
  message: string;
  estimatedDeliveryTime: string;
  experience: number;
  completedJobs: number;
  responseTime: string;
  offeredAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface TransportRequest {
  id: string;
  cargoType: string;
  weight: number;
  weightUnit: 'kg' | 'ton';
  pickupLocations: {
    address: string;
    type: 'pickup';
  }[];
  deliveryLocations: {
    address: string;
    type: 'delivery';
  }[];
  budget: {
    min: number;
    max: number;
    currency?: Currency;
  };
}

export default function TransportOffersScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const isRTL = i18n.dir() === 'rtl';

  const [offers, setOffers] = useState<TransporterOffer[]>([]);
  const [request, setRequest] = useState<TransportRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<TransporterOffer | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    loadRequestAndOffers();
    detectCurrencyFromLocation();
  }, [requestId]);

  const detectCurrencyFromLocation = async () => {
    try {
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
      const mockRequest: TransportRequest = {
        id: requestId || '1',
        cargoType: 'furniture',
        weight: 500,
        weightUnit: 'kg',
        pickupLocations: [
          { address: 'منطقة دابوق، عمان', type: 'pickup' }
        ],
        deliveryLocations: [
          { address: 'منطقة العبدلي، عمان', type: 'delivery' }
        ],
        budget: { min: 100, max: 200, currency: currentCurrency }
      };

      // محاكاة عروض الناقلين
      const mockOffers: TransporterOffer[] = [
        {
          id: '1',
          transporterId: 'transporter1',
          transporterName: 'أحمد محمد',
          transporterRating: 4.8,
          transporterReviews: 156,
          vehicleInfo: {
            make: 'Mercedes',
            model: 'Sprinter',
            year: 2020,
            type: 'Van',
            capacity: '1500kg'
          },
          price: 180,
          message: 'متخصص في نقل الأثاث والأشياء الثقيلة. خدمة سريعة وآمنة.',
          estimatedDeliveryTime: '2-3 ساعات',
          experience: 5,
          completedJobs: 234,
          responseTime: 'منذ 5 دقائق',
          offeredAt: new Date().toISOString(),
          status: 'pending'
        },
        {
          id: '2',
          transporterId: 'transporter2',
          transporterName: 'سامر علي',
          transporterRating: 4.6,
          transporterReviews: 89,
          vehicleInfo: {
            make: 'Isuzu',
            model: 'NPR',
            year: 2019,
            type: 'Truck',
            capacity: '3000kg'
          },
          price: 150,
          message: 'لدي خبرة في نقل جميع أنواع البضائع. أسعار منافسة.',
          estimatedDeliveryTime: '1-2 ساعة',
          experience: 3,
          completedJobs: 145,
          responseTime: 'منذ 8 دقائق',
          offeredAt: new Date().toISOString(),
          status: 'pending'
        },
        {
          id: '3',
          transporterId: 'transporter3',
          transporterName: 'محمد صالح',
          transporterRating: 4.9,
          transporterReviews: 201,
          vehicleInfo: {
            make: 'Ford',
            model: 'Transit',
            year: 2021,
            type: 'Van',
            capacity: '1200kg'
          },
          price: 190,
          message: 'ناقل محترف مع ضمان على سلامة البضائع.',
          estimatedDeliveryTime: '2 ساعة',
          experience: 7,
          completedJobs: 312,
          responseTime: 'منذ 12 دقيقة',
          offeredAt: new Date().toISOString(),
          status: 'pending'
        }
      ];

      setRequest(mockRequest);
      setOffers(mockOffers);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequestAndOffers().finally(() => setRefreshing(false));
  };

  const acceptOffer = (offer: TransporterOffer) => {
    setSelectedOffer(offer);
    setShowConfirmModal(true);
  };

  const confirmAcceptance = () => {
    if (!selectedOffer) return;

    try {
      // حساب العمولة 10%
      const commission = selectedOffer.price * 0.1;
      const finalPrice = selectedOffer.price;

      // تحديث حالة العرض
      setOffers(prev => 
        prev.map(offer => 
          offer.id === selectedOffer.id 
            ? { ...offer, status: 'accepted' }
            : { ...offer, status: 'rejected' }
        )
      );

      setShowConfirmModal(false);

      Alert.alert(
        'تم قبول العرض بنجاح',
        `تم قبول عرض ${selectedOffer.transporterName} بمبلغ ${formatCurrency(finalPrice, currentCurrency)}\n\nسيتم التواصل معك قريباً لتأكيد التفاصيل.\n\nعمولة التطبيق: ${formatCurrency(commission, currentCurrency)}`,
        [
          {
            text: 'الانتقال للرحلات',
            onPress: () => router.push('/trips')
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting offer:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء قبول العرض');
    }
  };

  const getCargoTypeName = (type: string) => {
    const types: Record<string, string> = {
      'furniture': 'أثاث ومنزليات',
      'electronics': 'أجهزة إلكترونية',
      'food': 'مواد غذائية',
      'construction': 'مواد بناء',
      'clothing': 'ملابس ونسيج',
      'documents': 'وثائق ومستندات',
      'fragile': 'أشياء قابلة للكسر',
      'other': 'أخرى'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل العروض...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const acceptedOffer = offers.find(offer => offer.status === 'accepted');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>عروض الناقلين</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* معلومات الطلب */}
        {request && (
          <View style={styles.requestSummary}>
            <Text style={styles.summaryTitle}>تفاصيل طلبك</Text>
            <View style={styles.summaryRow}>
              <Package size={16} color="#666" />
              <Text style={styles.summaryText}>
                نوع الحمولة: {getCargoTypeName(request.cargoType)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Weight size={16} color="#666" />
              <Text style={styles.summaryText}>
                الوزن: {request.weight} {request.weightUnit === 'kg' ? 'كيلو' : 'طن'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.summaryText}>
                من: {request.pickupLocations[0]?.address}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.summaryText}>
                إلى: {request.deliveryLocations[0]?.address}
              </Text>
            </View>
          </View>
        )}

        {/* العرض المقبول */}
        {acceptedOffer && (
          <View style={styles.acceptedOfferContainer}>
            <View style={styles.acceptedHeader}>
              <Check size={24} color="#4CAF50" />
              <Text style={styles.acceptedTitle}>تم قبول العرض</Text>
            </View>
            
            <View style={styles.transporterInfo}>
              <Text style={styles.transporterName}>{acceptedOffer.transporterName}</Text>
              <View style={styles.priceContainer}>
                <DollarSign size={16} color="#F5B800" />
                <Text style={styles.finalPrice}>{formatCurrency(acceptedOffer.price, currentCurrency)}</Text>
              </View>
            </View>
            
            <View style={styles.contactButtons}>
              <TouchableOpacity style={styles.callButton}>
                <Phone size={20} color="#fff" />
                <Text style={styles.contactButtonText}>اتصال</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton}>
                <MessageCircle size={20} color="#fff" />
                <Text style={styles.contactButtonText}>رسالة</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* قائمة العروض */}
        {!acceptedOffer && (
          <View style={styles.offersContainer}>
            <Text style={styles.offersTitle}>
              العروض المتاحة ({offers.filter(o => o.status === 'pending').length})
            </Text>
            
            {offers.filter(offer => offer.status === 'pending').map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View style={styles.transporterDetails}>
                    <Text style={styles.transporterName}>{offer.transporterName}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#F5B800" fill="#F5B800" />
                      <Text style={styles.ratingText}>{offer.transporterRating}</Text>
                      <Text style={styles.reviewCount}>({offer.transporterReviews})</Text>
                    </View>
                  </View>
                  <Text style={styles.responseTime}>{offer.responseTime}</Text>
                </View>

                {/* معلومات المركبة */}
                <View style={styles.vehicleInfo}>
                  <Truck size={16} color="#666" />
                  <Text style={styles.vehicleText}>
                    {offer.vehicleInfo.make} {offer.vehicleInfo.model} ({offer.vehicleInfo.year})
                  </Text>
                </View>
                
                <View style={styles.vehicleCapacity}>
                  <Package size={16} color="#666" />
                  <Text style={styles.capacityText}>
                    حمولة: {offer.vehicleInfo.capacity}
                  </Text>
                </View>

                {/* السعر */}
                <View style={styles.priceContainer}>
                  <DollarSign size={20} color="#F5B800" />
                  <Text style={styles.price}>{formatCurrency(offer.price, currentCurrency)}</Text>
                  <Text style={styles.priceNote}>شامل جميع الخدمات</Text>
                </View>

                {/* الرسالة */}
                {offer.message && (
                  <View style={styles.messageContainer}>
                    <Text style={styles.offerMessage}>{offer.message}</Text>
                  </View>
                )}

                {/* إحصائيات */}
                <View style={styles.statsContainer}>
                  <View style={styles.stat}>
                    <Award size={16} color="#666" />
                    <Text style={styles.statText}>{offer.experience} سنوات خبرة</Text>
                  </View>
                  <View style={styles.stat}>
                    <Check size={16} color="#666" />
                    <Text style={styles.statText}>{offer.completedJobs} رحلة مكتملة</Text>
                  </View>
                </View>

                {/* وقت التسليم المتوقع */}
                <View style={styles.deliveryTime}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.deliveryText}>
                    وقت التسليم المتوقع: {offer.estimatedDeliveryTime}
                  </Text>
                </View>

                {/* أزرار العمل */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => acceptOffer(offer)}
                  >
                    <Check size={20} color="#fff" />
                    <Text style={styles.acceptButtonText}>قبول العرض</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.contactButton}>
                    <MessageCircle size={20} color="#F5B800" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {offers.filter(o => o.status === 'pending').length === 0 && !acceptedOffer && (
          <View style={styles.noOffersContainer}>
            <Truck size={48} color="#ccc" />
            <Text style={styles.noOffersText}>لا توجد عروض حتى الآن</Text>
            <Text style={styles.noOffersSubtext}>
              سيتم إشعارك عند وصول عروض جديدة
            </Text>
          </View>
        )}
      </ScrollView>

      {/* نافذة تأكيد القبول */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تأكيد قبول العرض</Text>
            
            {selectedOffer && (
              <View style={styles.confirmationDetails}>
                <Text style={styles.confirmText}>
                  هل تريد قبول عرض {selectedOffer.transporterName}؟
                </Text>
                
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryItem}>الناقل: {selectedOffer.transporterName}</Text>
                  <Text style={styles.summaryItem}>السعر: {formatCurrency(selectedOffer.price, currentCurrency)}</Text>
                  <Text style={styles.summaryItem}>
                    عمولة التطبيق: {formatCurrency(selectedOffer.price * 0.1, currentCurrency)}
                  </Text>
                  <Text style={styles.summaryItem}>
                    وقت التسليم: {selectedOffer.estimatedDeliveryTime}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>إلغاء</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmAcceptance}
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
  scrollView: {
    flex: 1,
  },
  requestSummary: {
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
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  acceptedOfferContainer: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptedTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  transporterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transporterName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finalPrice: {
    marginLeft: 4,
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  contactButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  offersContainer: {
    margin: 16,
  },
  offersTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  offerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transporterDetails: {
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  responseTime: {
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
    color: '#666',
  },
  vehicleCapacity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  price: {
    marginLeft: 4,
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
  },
  priceNote: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  offerMessage: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  deliveryTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveryText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  acceptButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  contactButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5B800',
  },
  noOffersContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  noOffersText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noOffersSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
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
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmationDetails: {
    marginBottom: 20,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  summaryItem: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  confirmButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
});
