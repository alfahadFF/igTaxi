import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput
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
  MessageSquare,
  CheckCircle,
  Car,
  Navigation
} from 'lucide-react-native';

interface BookingRequest {
  id: string;
  eventType: string;
  title: string;
  description: string;
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
  locations: Array<{
    address: string;
    type: string;
  }>;
  requiredFeatures: string[];
  specialRequests: string;
  distance: number; // km from driver
  expiresAt: string;
}

export default function DriverBidScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const isRTL = i18n.dir() === 'rtl';

  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [driverMessage, setDriverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBookingRequest();
  }, []);

  const loadBookingRequest = async () => {
    try {
      // محاكاة بيانات الطلب
      const mockRequest: BookingRequest = {
        id: requestId || '12345',
        eventType: 'wedding',
        title: 'حفل زفاف',
        description: 'نحتاج لخدمة نقل للعروسين وضيوف الزفاف',
        guestCount: 8,
        date: '2025-07-25',
        time: '18:00',
        duration: { type: 'hours', value: 6 },
        budget: { min: 100, max: 200 },
        locations: [
          { address: 'عمان - جبل الحسين', type: 'نقطة الانطلاق' },
          { address: 'قاعة الأفراح - عبدون', type: 'الوجهة' },
          { address: 'فندق الريجنسي', type: 'محطة توقف' }
        ],
        requiredFeatures: ['decoration', 'photography', 'ac'],
        specialRequests: 'نريد سيارة فاخرة بيضاء مع زينة للزفاف',
        distance: 3.2,
        expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString()
      };

      setBookingRequest(mockRequest);
    } catch (error) {
      console.error('Error loading booking request:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    }
  };

  const getEventTypeName = (eventType: string) => {
    const types = {
      family: 'مناسبة عائلية',
      wedding: 'حفل زفاف',
      tourism: 'جولة سياحية',
      field: 'رحلة ميدانية',
      sports: 'فعالية رياضية',
      concert: 'حفلة موسيقية'
    };
    return types[eventType as keyof typeof types] || eventType;
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

  const validateBid = () => {
    if (!bidAmount.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال السعر المطلوب');
      return false;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر صحيح');
      return false;
    }

    if (!bookingRequest) return false;

    if (amount < bookingRequest.budget.min || amount > bookingRequest.budget.max) {
      Alert.alert(
        'تحذير',
        `السعر المطلوب خارج نطاق ميزانية العميل (${bookingRequest.budget.min} - ${bookingRequest.budget.max} دينار). هل تريد المتابعة؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'متابعة', onPress: () => submitBid() }
        ]
      );
      return false;
    }

    return true;
  };

  const submitBid = async () => {
    if (!validateBid()) return;

    setSubmitting(true);
    try {
      const bidData = {
        requestId: bookingRequest?.id,
        amount: parseFloat(bidAmount),
        message: driverMessage.trim(),
        submittedAt: new Date().toISOString()
      };

      console.log('Driver Bid:', bidData);

      // حساب عمولة التطبيق (10%)
      const commission = bidData.amount * 0.1;
      const netAmount = bidData.amount - commission;

      Alert.alert(
        'تم إرسال عرضك بنجاح',
        `عرضك: ${bidData.amount} دينار\nصافي المبلغ بعد العمولة: ${netAmount.toFixed(2)} دينار\n\nسيتم إشعارك في حالة قبول العرض`,
        [
          {
            text: 'حسناً',
            onPress: () => router.back()
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting bid:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إرسال العرض');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTimeRemaining = () => {
    if (!bookingRequest) return 'انتهت المدة';
    
    const now = new Date().getTime();
    const expiry = new Date(bookingRequest.expiresAt).getTime();
    const diff = expiry - now;
    
    if (diff <= 0) return 'انتهت المدة';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!bookingRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeRemaining = calculateTimeRemaining();
  const isExpired = timeRemaining === 'انتهت المدة';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>طلب خدمة جديد</Text>
          <View style={styles.timeContainer}>
            <Clock size={16} color={isExpired ? '#F44336' : '#F5B800'} />
            <Text style={[
              styles.timeText,
              { color: isExpired ? '#F44336' : '#F5B800' }
            ]}>
              {timeRemaining}
            </Text>
          </View>
        </View>

        {/* معلومات الطلب */}
        <View style={styles.section}>
          <View style={styles.requestHeader}>
            <Text style={styles.eventType}>{getEventTypeName(bookingRequest.eventType)}</Text>
            <View style={styles.distanceContainer}>
              <Navigation size={16} color="#666" />
              <Text style={styles.distanceText}>{bookingRequest.distance} كم</Text>
            </View>
          </View>
          
          <Text style={styles.requestTitle}>{bookingRequest.title}</Text>
          
          {bookingRequest.description && (
            <Text style={styles.requestDescription}>{bookingRequest.description}</Text>
          )}

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Users size={16} color="#666" />
              <Text style={styles.detailText}>{bookingRequest.guestCount} راكب</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Calendar size={16} color="#666" />
              <Text style={styles.detailText}>{bookingRequest.date}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Clock size={16} color="#666" />
              <Text style={styles.detailText}>
                {bookingRequest.time} ({bookingRequest.duration.value} {bookingRequest.duration.type === 'hours' ? 'ساعة' : 'يوم'})
              </Text>
            </View>
          </View>
        </View>

        {/* المواقع */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المواقع</Text>
          {bookingRequest.locations.map((location, index) => (
            <View key={index} style={styles.locationItem}>
              <MapPin size={16} color="#666" />
              <View style={styles.locationDetails}>
                <Text style={styles.locationType}>{location.type}</Text>
                <Text style={styles.locationAddress}>{location.address}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* الميزانية */}
        <View style={styles.budgetContainer}>
          <Text style={styles.budgetLabel}>الميزانية المطلوبة:</Text>
          <View style={styles.budgetRange}>
            <Text style={styles.budgetText}>
              {bookingRequest.budget.min} - {bookingRequest.budget.max} دينار أردني
            </Text>
          </View>
        </View>

        {/* المميزات المطلوبة */}
        {bookingRequest.requiredFeatures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المميزات المطلوبة</Text>
            <View style={styles.featuresContainer}>
              {bookingRequest.requiredFeatures.map((feature, index) => (
                <View key={index} style={styles.featureTag}>
                  <Text style={styles.featureText}>{getFeatureName(feature)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* الطلبات الخاصة */}
        {bookingRequest.specialRequests && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>طلبات خاصة</Text>
            <Text style={styles.specialRequestsText}>{bookingRequest.specialRequests}</Text>
          </View>
        )}

        {/* نموذج العرض */}
        {!isExpired && (
          <View style={styles.bidSection}>
            <Text style={styles.bidSectionTitle}>ضع عرضك</Text>
            
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder="السعر المطلوب (دينار أردني) *"
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <MessageSquare size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.textArea, isRTL && styles.inputRTL]}
                placeholder="رسالة للعميل (اختياري)"
                value={driverMessage}
                onChangeText={setDriverMessage}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.commissionInfo}>
              <Text style={styles.commissionText}>
                * سيتم خصم عمولة التطبيق 10% من السعر
              </Text>
              {bidAmount && !isNaN(parseFloat(bidAmount)) && (
                <Text style={styles.netAmountText}>
                  صافي المبلغ: {(parseFloat(bidAmount) * 0.9).toFixed(2)} دينار
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={submitBid}
              disabled={submitting}
            >
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {submitting ? 'جاري الإرسال...' : 'إرسال العرض'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isExpired && (
          <View style={styles.expiredContainer}>
            <Text style={styles.expiredText}>انتهت مدة استقبال العروض لهذا الطلب</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  section: {
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventType: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  requestTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  requestDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationDetails: {
    marginLeft: 12,
    flex: 1,
  },
  locationType: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  budgetContainer: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5B800',
  },
  budgetLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  budgetRange: {
    alignItems: 'center',
  },
  budgetText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#F5B800',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#4CAF50',
  },
  specialRequestsText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    lineHeight: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  bidSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bidSectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
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
  textArea: {
    flex: 1,
    minHeight: 80,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#333',
    textAlignVertical: 'top',
  },
  inputRTL: {
    textAlign: 'right',
  },
  commissionInfo: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  commissionText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FF9800',
    marginBottom: 4,
  },
  netAmountText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 8,
  },
  expiredContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  expiredText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#F44336',
    textAlign: 'center',
  },
});
