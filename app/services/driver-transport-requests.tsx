import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Clock,
  DollarSign,
  Package,
  Weight,
  Navigation,
  MessageCircle,
  Send,
  Check,
  X,
  AlertCircle,
  Truck,
  Calendar
} from 'lucide-react-native';
import { getCurrencyByLocation, DEFAULT_CURRENCY, type Currency, formatCurrency } from '@/utils/currency';
import * as Location from 'expo-location';

interface TransportRequest {
  id: string;
  customerId: string;
  customerName: string;
  cargoType: string;
  weight: number;
  weightUnit: 'kg' | 'ton';
  pickupLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  budget: {
    min: number;
    max: number;
  };
  urgency: 'normal' | 'urgent';
  additionalNotes?: string;
  distance: number;
  createdAt: string;
  status: 'pending' | 'bidding' | 'accepted' | 'completed';
}

interface DriverOffer {
  id: string;
  driverId: string;
  price: number;
  message: string;
  estimatedTime: string;
  status: 'pending' | 'sent';
}

export default function DriverTransportRequestsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  
  // بيانات العرض
  const [offerData, setOfferData] = useState({
    price: '',
    message: '',
    estimatedTime: '',
  });

  useEffect(() => {
    loadTransportRequests();
    detectCurrencyFromLocation();
  }, []);

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

  const loadTransportRequests = async () => {
    try {
      setLoading(true);
      
      // محاكاة بيانات طلبات النقل
      const mockRequests: TransportRequest[] = [
        {
          id: 'req_1',
          customerId: 'customer_1',
          customerName: 'أحمد محمود',
          cargoType: 'furniture',
          weight: 500,
          weightUnit: 'kg',
          pickupLocation: {
            address: 'منطقة دابوق، عمان',
            coordinates: { latitude: 31.9539, longitude: 35.9106 }
          },
          deliveryLocation: {
            address: 'منطقة العبدلي، عمان',
            coordinates: { latitude: 31.9515, longitude: 35.9239 }
          },
          budget: { min: 100, max: 200 },
          urgency: 'normal',
          additionalNotes: 'أثاث منزلي ثقيل، يحتاج عناية خاصة',
          distance: 8.5,
          createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // منذ 30 دقيقة
          status: 'pending'
        },
        {
          id: 'req_2',
          customerId: 'customer_2',
          customerName: 'فاطمة أحمد',
          cargoType: 'electronics',
          weight: 50,
          weightUnit: 'kg',
          pickupLocation: {
            address: 'مجمع تاج مول، عمان',
            coordinates: { latitude: 31.9900, longitude: 35.8700 }
          },
          deliveryLocation: {
            address: 'منطقة الجبيهة، عمان',
            coordinates: { latitude: 32.0167, longitude: 35.8667 }
          },
          budget: { min: 50, max: 100 },
          urgency: 'urgent',
          additionalNotes: 'أجهزة إلكترونية حساسة',
          distance: 12.3,
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // منذ 15 دقيقة
          status: 'pending'
        },
        {
          id: 'req_3',
          customerId: 'customer_3',
          customerName: 'محمد علي',
          cargoType: 'construction',
          weight: 2,
          weightUnit: 'ton',
          pickupLocation: {
            address: 'مستودع البناء، عمان',
            coordinates: { latitude: 31.9200, longitude: 35.9500 }
          },
          deliveryLocation: {
            address: 'منطقة أبو نصير، عمان',
            coordinates: { latitude: 31.8833, longitude: 35.8500 }
          },
          budget: { min: 300, max: 500 },
          urgency: 'normal',
          additionalNotes: 'مواد بناء ثقيلة - رمل وحصى',
          distance: 15.7,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // منذ 45 دقيقة
          status: 'pending'
        }
      ];

      setRequests(mockRequests);
      setLoading(false);
    } catch (error) {
      console.error('Error loading transport requests:', error);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransportRequests().finally(() => setRefreshing(false));
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

  const getCargoIcon = (type: string) => {
    const icons: Record<string, any> = {
      'furniture': Truck,
      'electronics': Package,
      'food': Package,
      'construction': Weight,
      'clothing': Package,
      'documents': Package,
      'fragile': AlertCircle,
      'other': Package
    };
    return icons[type] || Package;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `منذ ${diffInDays} يوم`;
  };

  const openOfferModal = (request: TransportRequest) => {
    setSelectedRequest(request);
    setOfferData({
      price: '',
      message: '',
      estimatedTime: ''
    });
    setShowOfferModal(true);
  };

  const submitOffer = async () => {
    if (!selectedRequest) return;

    if (!offerData.price || !offerData.estimatedTime) {
      Alert.alert('خطأ', 'يرجى إدخال السعر ووقت التسليم المتوقع');
      return;
    }

    try {
      // محاكاة إرسال العرض
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'تم إرسال عرضك بنجاح',
        'سيتم إشعار العميل بعرضك وسيقوم بالرد عليك قريباً.',
        [
          {
            text: 'موافق',
            onPress: () => {
              setShowOfferModal(false);
              setSelectedRequest(null);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting offer:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إرسال العرض');
    }
  };

  const navigateToLocation = (coordinates: { latitude: number; longitude: number }, address: string) => {
    Alert.alert(
      'فتح الخريطة',
      `هل تريد فتح ${address} في خرائط جوجل؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'فتح', 
          onPress: () => {
            // يمكن هنا فتح Google Maps أو تطبيق الخرائط
            console.log('Navigate to:', coordinates, address);
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>طلبات النقل</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {requests.length > 0 ? (
          requests.map((request) => {
            const CargoIcon = getCargoIcon(request.cargoType);
            
            return (
              <View key={request.id} style={styles.requestCard}>
                {/* رأس البطاقة */}
                <View style={styles.cardHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{request.customerName}</Text>
                    <Text style={styles.timeAgo}>{formatTimeAgo(request.createdAt)}</Text>
                  </View>
                  
                  <View style={styles.urgencyContainer}>
                    {request.urgency === 'urgent' && (
                      <View style={styles.urgentBadge}>
                        <AlertCircle size={14} color="#ff4444" />
                        <Text style={styles.urgentText}>عاجل</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* تفاصيل الحمولة */}
                <View style={styles.cargoDetails}>
                  <CargoIcon size={20} color="#F5B800" />
                  <Text style={styles.cargoText}>
                    {getCargoTypeName(request.cargoType)} - {request.weight} {request.weightUnit === 'kg' ? 'كيلو' : 'طن'}
                  </Text>
                </View>

                {/* المواقع */}
                <View style={styles.locationsContainer}>
                  <TouchableOpacity 
                    style={styles.locationRow}
                    onPress={() => navigateToLocation(request.pickupLocation.coordinates, request.pickupLocation.address)}
                  >
                    <MapPin size={16} color="#F5B800" />
                    <Text style={styles.locationLabel}>من:</Text>
                    <Text style={styles.locationText}>{request.pickupLocation.address}</Text>
                    <Navigation size={14} color="#666" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.locationRow}
                    onPress={() => navigateToLocation(request.deliveryLocation.coordinates, request.deliveryLocation.address)}
                  >
                    <MapPin size={16} color="#4CAF50" />
                    <Text style={styles.locationLabel}>إلى:</Text>
                    <Text style={styles.locationText}>{request.deliveryLocation.address}</Text>
                    <Navigation size={14} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* المسافة والميزانية */}
                <View style={styles.detailsRow}>
                  <View style={styles.distanceContainer}>
                    <Navigation size={16} color="#666" />
                    <Text style={styles.distanceText}>{request.distance} كم</Text>
                  </View>
                  
                  <View style={styles.budgetContainer}>
                    <DollarSign size={16} color="#4CAF50" />
                    <Text style={styles.budgetText}>
                      {formatCurrency(request.budget.min, currentCurrency)} - {formatCurrency(request.budget.max, currentCurrency)}
                    </Text>
                  </View>
                </View>

                {/* الملاحظات */}
                {request.additionalNotes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>{request.additionalNotes}</Text>
                  </View>
                )}

                {/* أزرار العمل */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.offerButton}
                    onPress={() => openOfferModal(request)}
                  >
                    <Send size={18} color="#fff" />
                    <Text style={styles.offerButtonText}>تقديم عرض</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.messageButton}>
                    <MessageCircle size={18} color="#F5B800" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.noRequestsContainer}>
            <Package size={48} color="#ccc" />
            <Text style={styles.noRequestsText}>لا توجد طلبات نقل متاحة</Text>
            <Text style={styles.noRequestsSubtext}>سيتم إشعارك عند وصول طلبات جديدة في منطقتك</Text>
          </View>
        )}
      </ScrollView>

      {/* نافذة تقديم العرض */}
      <Modal
        visible={showOfferModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تقديم عرض</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowOfferModal(false)}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <View style={styles.modalBody}>
                <Text style={styles.requestSummary}>
                  طلب نقل {getCargoTypeName(selectedRequest.cargoType)} من {selectedRequest.customerName}
                </Text>

                {/* إدخال السعر */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>سعر العرض ({currentCurrency.symbol})</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={offerData.price}
                    onChangeText={(text) => setOfferData(prev => ({ ...prev, price: text }))}
                    keyboardType="numeric"
                    placeholder={`بين ${formatCurrency(selectedRequest.budget.min, currentCurrency)} - ${formatCurrency(selectedRequest.budget.max, currentCurrency)}`}
                  />
                </View>

                {/* وقت التسليم المتوقع */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>وقت التسليم المتوقع</Text>
                  <TextInput
                    style={styles.textInput}
                    value={offerData.estimatedTime}
                    onChangeText={(text) => setOfferData(prev => ({ ...prev, estimatedTime: text }))}
                    placeholder="مثل: 2-3 ساعات"
                  />
                </View>

                {/* رسالة للعميل */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>رسالة للعميل (اختياري)</Text>
                  <TextInput
                    style={styles.messageInput}
                    value={offerData.message}
                    onChangeText={(text) => setOfferData(prev => ({ ...prev, message: text }))}
                    placeholder="رسالة توضح خبرتك وخدماتك..."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                {/* أزرار العمل */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowOfferModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>إلغاء</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.submitOfferButton}
                    onPress={submitOffer}
                  >
                    <Text style={styles.submitOfferButtonText}>إرسال العرض</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    padding: 16,
  },
  requestCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  timeAgo: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  urgencyContainer: {
    alignItems: 'flex-end',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#ff4444',
  },
  cargoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cargoText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  locationsContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    minWidth: 30,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
  },
  notesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  offerButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  messageButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5B800',
  },
  noRequestsContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 32,
  },
  noRequestsText: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noRequestsSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  closeModalButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  requestSummary: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 8,
  },
  priceInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  submitOfferButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  submitOfferButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
});
