import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Car,
  Star,
  Send,
  X,
  Navigation,
  Check
} from 'lucide-react-native';
import { getCurrencyByLocation, DEFAULT_CURRENCY, type Currency, formatCurrency, formatPriceRange } from '@/utils/currency';
import * as Location from 'expo-location';

interface EventRequest {
  id: string;
  eventType: string;
  title: string;
  description: string;
  guestCount: number;
  duration: {
    type: 'hours' | 'days';
    value: number;
  };
  date: string;
  time: string;
  locations: {
    id: string;
    address: string;
    type: 'pickup' | 'stop' | 'destination';
  }[];
  budget: {
    min: number;
    max: number;
    currency?: Currency;
  };
  requiredFeatures: string[];
  specialRequests: string;
  distance: number; // المسافة عن السائق بالكيلومتر
  postedAt: string;
  status: 'pending' | 'responded' | 'accepted' | 'completed';
}

interface DriverResponse {
  requestId: string;
  price: number;
  message: string;
  estimatedDuration: string;
}

export default function DriverEventRequestsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  const [requests, setRequests] = useState<EventRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EventRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  
  // نموذج الرد
  const [responsePrice, setResponsePrice] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  useEffect(() => {
    loadRequests();
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

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // محاكاة بيانات الطلبات
      const mockRequests: EventRequest[] = [
        {
          id: '1',
          eventType: 'wedding',
          title: 'حفل زفاف العائلة',
          description: 'نحتاج سائق موثوق لنقل العروسين والضيوف',
          guestCount: 6,
          duration: { type: 'hours', value: 8 },
          date: '2025-08-15',
          time: '16:00',
          locations: [
            { id: '1', address: 'منطقة دابوق، عمان', type: 'pickup' },
            { id: '2', address: 'قاعة الملكة، العبدلي', type: 'destination' },
            { id: '3', address: 'منطقة دابوق، عمان', type: 'destination' }
          ],
          budget: { min: 150, max: 300, currency: currentCurrency },
          requiredFeatures: ['ac', 'decoration'],
          specialRequests: 'يرجى التنسيق مع منسق الحفل قبل الوصول',
          distance: 12.5,
          postedAt: '2025-07-19T10:30:00Z',
          status: 'pending'
        },
        {
          id: '2',
          eventType: 'family',
          title: 'رحلة عائلية لطيرة الشحن',
          description: 'رحلة يوم كامل للعائلة',
          guestCount: 8,
          duration: { type: 'days', value: 1 },
          date: '2025-08-20',
          time: '08:00',
          locations: [
            { id: '1', address: 'شارع الجامعة، عمان', type: 'pickup' },
            { id: '2', address: 'طيرة الشحن، إربد', type: 'destination' }
          ],
          budget: { min: 200, max: 350, currency: currentCurrency },
          requiredFeatures: ['ac', 'music'],
          specialRequests: 'نحتاج سائق خبرة في الطرق الجبلية',
          distance: 8.2,
          postedAt: '2025-07-19T09:15:00Z',
          status: 'pending'
        },
        {
          id: '3',
          eventType: 'tourism',
          title: 'جولة سياحية في البتراء',
          description: 'جولة سياحية لمجموعة من السياح',
          guestCount: 4,
          duration: { type: 'days', value: 2 },
          date: '2025-08-25',
          time: '07:00',
          locations: [
            { id: '1', address: 'فندق الكراون بلازا، عمان', type: 'pickup' },
            { id: '2', address: 'البتراء، معان', type: 'destination' },
            { id: '3', address: 'فندق الكراون بلازا، عمان', type: 'destination' }
          ],
          budget: { min: 400, max: 600, currency: currentCurrency },
          requiredFeatures: ['ac', 'wifi', 'tour_guide'],
          specialRequests: 'يفضل سائق يتحدث الإنجليزية',
          distance: 5.8,
          postedAt: '2025-07-19T08:45:00Z',
          status: 'pending'
        }
      ];

      setRequests(mockRequests);
      setLoading(false);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الطلبات');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const openResponseModal = (request: EventRequest) => {
    setSelectedRequest(request);
    setResponsePrice('');
    setResponseMessage('');
    setEstimatedDuration('');
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!selectedRequest || !responsePrice.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال السعر المطلوب');
      return;
    }

    const price = parseFloat(responsePrice);
    if (price <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return;
    }

    try {
      const response: DriverResponse = {
        requestId: selectedRequest.id,
        price: price,
        message: responseMessage.trim() || 'أقدم خدمة ممتازة بأفضل الأسعار',
        estimatedDuration: estimatedDuration.trim() || 'حسب المدة المحددة'
      };

      console.log('Driver Response:', response);

      // تحديث حالة الطلب
      setRequests(prev => 
        prev.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: 'responded' as const }
            : req
        )
      );

      setShowResponseModal(false);
      
      Alert.alert(
        'تم إرسال العرض بنجاح',
        'تم إرسال عرض السعر الخاص بك. ستصلك رسالة في حالة الموافقة على العرض.',
        [{ text: 'حسناً', style: 'default' }]
      );

    } catch (error) {
      console.error('Response error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إرسال العرض');
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    const types: { [key: string]: string } = {
      family: 'مناسبة عائلية',
      wedding: 'حفل زفاف',
      business: 'فعالية تجارية',
      tourism: 'جولة سياحية',
      sports: 'فعالية رياضية',
      education: 'رحلة تعليمية'
    };
    return types[eventType] || eventType;
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'pickup': return '🟢';
      case 'destination': return '🔴';
      case 'stop': return '🟡';
      default: return '📍';
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'pickup': return 'انطلاق';
      case 'destination': return 'وجهة';
      case 'stop': return 'توقف';
      default: return 'موقع';
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

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const posted = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `قبل ${diffInMinutes} دقيقة`;
    } else if (diffInMinutes < 1440) {
      return `قبل ${Math.floor(diffInMinutes / 60)} ساعة`;
    } else {
      return `قبل ${Math.floor(diffInMinutes / 1440)} يوم`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>طلبات المناسبات</Text>
        <Text style={styles.subtitle}>اختر الطلبات المناسبة وقدم عروضك</Text>
      </View>

      {/* Results */}
      <ScrollView
        style={styles.resultsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.resultsCount}>
          {requests.filter(r => r.status === 'pending').length} طلب متاح في نطاقك
        </Text>

        {requests.filter(r => r.status === 'pending').map((request) => (
          <View key={request.id} style={styles.requestCard}>
            {/* Header */}
            <View style={styles.requestHeader}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <Text style={styles.eventType}>{getEventTypeLabel(request.eventType)}</Text>
                <Text style={styles.postedTime}>{getTimeAgo(request.postedAt)}</Text>
              </View>
              <View style={styles.distanceContainer}>
                <Navigation size={16} color="#F5B800" />
                <Text style={styles.distanceText}>{request.distance} كم</Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.requestDetails}>
              <View style={styles.detailRow}>
                <Users size={16} color="#666" />
                <Text style={styles.detailText}>{request.guestCount} ركاب</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Calendar size={16} color="#666" />
                <Text style={styles.detailText}>
                  {formatDate(request.date)} في {request.time}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Clock size={16} color="#666" />
                <Text style={styles.detailText}>
                  {request.duration.value} {request.duration.type === 'hours' ? 'ساعات' : 'أيام'}
                </Text>
              </View>
            </View>

            {/* Locations */}
            <View style={styles.locationsContainer}>
              <Text style={styles.locationsTitle}>المسار:</Text>
              {request.locations.map((location, index) => (
                <View key={location.id} style={styles.locationItem}>
                  <Text style={styles.locationIcon}>
                    {getLocationTypeIcon(location.type)}
                  </Text>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>
                      {getLocationTypeLabel(location.type)} {index + 1}
                    </Text>
                    <Text style={styles.locationAddress}>{location.address}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Budget */}
            <View style={styles.budgetContainer}>
              <DollarSign size={16} color="#F5B800" />
              <Text style={styles.budgetText}>
                الميزانية المتوقعة: {formatPriceRange(request.budget.min, request.budget.max, request.budget.currency || currentCurrency)}
              </Text>
            </View>

            {/* Description */}
            {request.description && (
              <Text style={styles.description}>{request.description}</Text>
            )}

            {/* Features */}
            {request.requiredFeatures.length > 0 && (
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>مميزات مطلوبة:</Text>
                <View style={styles.featuresList}>
                  {request.requiredFeatures.map((feature, index) => (
                    <View key={index} style={styles.featureTag}>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Special Requests */}
            {request.specialRequests && (
              <View style={styles.specialRequestsContainer}>
                <Text style={styles.specialRequestsTitle}>طلبات خاصة:</Text>
                <Text style={styles.specialRequestsText}>{request.specialRequests}</Text>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={styles.responseButton}
              onPress={() => openResponseModal(request)}
            >
              <Send size={16} color="#fff" />
              <Text style={styles.responseButtonText}>تقديم عرض سعر</Text>
            </TouchableOpacity>
          </View>
        ))}

        {requests.filter(r => r.status === 'pending').length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد طلبات متاحة حالياً</Text>
            <Text style={styles.emptySubtext}>سيتم إشعارك عند وجود طلبات جديدة في نطاقك</Text>
          </View>
        )}
      </ScrollView>

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowResponseModal(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تقديم عرض سعر</Text>
            <TouchableOpacity onPress={submitResponse}>
              <Check size={24} color="#F5B800" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedRequest && (
              <>
                <View style={styles.requestSummary}>
                  <Text style={styles.summaryTitle}>{selectedRequest.title}</Text>
                  <Text style={styles.summaryDetails}>
                    {selectedRequest.guestCount} ركاب • {selectedRequest.duration.value} {selectedRequest.duration.type === 'hours' ? 'ساعات' : 'أيام'}
                  </Text>
                  <Text style={styles.summaryBudget}>
                    الميزانية المتوقعة: {formatPriceRange(selectedRequest.budget.min, selectedRequest.budget.max, selectedRequest.budget.currency || currentCurrency)}
                  </Text>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>السعر المطلوب ({currentCurrency.nameAr}) *</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
                    <TextInput
                      style={[styles.input, isRTL && styles.inputRTL, styles.inputWithCurrency]}
                      placeholder="أدخل السعر المطلوب"
                      value={responsePrice}
                      onChangeText={setResponsePrice}
                      keyboardType="numeric"
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>مدة التنفيذ المتوقعة (اختياري)</Text>
                  <View style={styles.inputContainer}>
                    <Clock size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, isRTL && styles.inputRTL]}
                      placeholder="مثال: حسب المدة المحددة"
                      value={estimatedDuration}
                      onChangeText={setEstimatedDuration}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>رسالة للعميل (اختياري)</Text>
                  <TextInput
                    style={[styles.textArea, isRTL && styles.inputRTL]}
                    placeholder="اكتب رسالة قصيرة تعرض فيها خدماتك..."
                    value={responseMessage}
                    onChangeText={setResponseMessage}
                    multiline
                    numberOfLines={4}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>

                <View style={styles.noteContainer}>
                  <Text style={styles.noteText}>
                    ملاحظة: سيحصل التطبيق على عمولة 10% من السعر المتفق عليه عند إتمام الخدمة.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
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
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#F5B800',
    marginBottom: 4,
  },
  postedTime: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
    marginLeft: 4,
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    marginLeft: 8,
  },
  locationsContainer: {
    marginBottom: 12,
  },
  locationsTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#666',
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  featuresList: {
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
    fontFamily: 'Poppins-Medium',
    color: '#F5B800',
  },
  specialRequestsContainer: {
    marginBottom: 16,
  },
  specialRequestsTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    fontStyle: 'italic',
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  responseButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  requestSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  summaryDetails: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 4,
  },
  summaryBudget: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    paddingHorizontal: 12,
    color: '#333',
  },
  inputWithCurrency: {
    paddingLeft: 40, // مساحة إضافية لرمز العملة
  },
  currencySymbol: {
    position: 'absolute',
    left: 12,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
    zIndex: 1,
  },
  inputRTL: {
    textAlign: 'right',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#856404',
    textAlign: 'center',
  },
});
