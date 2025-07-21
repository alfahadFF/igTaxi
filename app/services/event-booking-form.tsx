import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
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
  Plus,
  X,
  Star,
  Navigation,
  DollarSign,
  MessageSquare
} from 'lucide-react-native';
import MapViewComponent from '@/components/maps';
import type { Coordinates } from '@/components/maps/types';
import * as Location from 'expo-location';
import { getCurrencyByLocation, DEFAULT_CURRENCY, type Currency } from '@/utils/currency';

interface ServiceLocation {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'pickup' | 'stop' | 'destination';
  notes?: string;
}

interface EventBookingRequest {
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
  locations: ServiceLocation[];
  specialRequests: string;
  budget: {
    min: number;
    max: number;
    currency: Currency;
  };
  requiredFeatures: string[];
}

export default function EventBookingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { eventType } = useLocalSearchParams<{ eventType: string }>();
  const isRTL = i18n.dir() === 'rtl';

  // معلومات الحجز
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  
  // المدة
  const [durationType, setDurationType] = useState<'hours' | 'days'>('hours');
  const [durationValue, setDurationValue] = useState('');
  
  // المواقع
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentLocationIndex, setCurrentLocationIndex] = useState(-1);
  const [locationInput, setLocationInput] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<{latitude: number, longitude: number} | null>(null);
  
  // التسعير والمميزات
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // المميزات المطلوبة
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);

  // العملة الديناميكية
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY);

  // خريطة
  const [region, setRegion] = useState({
    latitude: 31.9539,
    longitude: 35.9106,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(newRegion);
        
        // الحصول على العملة حسب الموقع
        try {
          const currency = await getCurrencyByLocation(
            location.coords.latitude,
            location.coords.longitude
          );
          setCurrentCurrency(currency);
        } catch (error) {
          console.error('Error getting currency:', error);
          // الاحتفاظ بالعملة الافتراضية في حالة الخطأ
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const eventTypeNames = {
    family: 'مناسبة عائلية',
    wedding: 'حفل زفاف',
    tourism: 'جولة سياحية',
    field: 'رحلة ميدانية',
    sports: 'فعالية رياضية',
    concert: 'حفلة موسيقية'
  };

  const availableFeatures = [
    { id: 'ac', name: 'تكييف هواء', icon: '❄️' },
    { id: 'wifi', name: 'واي فاي', icon: '📶' },
    { id: 'sound', name: 'نظام صوتي', icon: '🔊' },
    { id: 'decoration', name: 'زينة للمناسبة', icon: '🎊' },
    { id: 'child_seats', name: 'كراسي أطفال', icon: '👶' },
    { id: 'tour_guide', name: 'مرشد سياحي', icon: '🎯' },
    { id: 'photography', name: 'خدمة تصوير', icon: '📸' },
    { id: 'equipment_space', name: 'مساحة للمعدات', icon: '🎒' }
  ];

  const toggleFeature = (featureId: string) => {
    setRequiredFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const addLocation = (type: 'pickup' | 'stop' | 'destination') => {
    setCurrentLocationIndex(locations.length);
    setShowLocationModal(true);
    setLocationInput('');
    setSelectedPosition(null);
  };

  const saveLocation = () => {
    if (!locationInput.trim() || !selectedPosition) {
      Alert.alert('خطأ', 'يرجى تحديد العنوان والموقع على الخريطة');
      return;
    }

    const newLocation: ServiceLocation = {
      id: Date.now().toString(),
      address: locationInput.trim(),
      latitude: selectedPosition.latitude,
      longitude: selectedPosition.longitude,
      type: locations.length === 0 ? 'pickup' : 
            locations.length === 1 ? 'destination' : 'stop'
    };

    setLocations(prev => [...prev, newLocation]);
    setShowLocationModal(false);
    setLocationInput('');
    setSelectedPosition(null);
  };

  const removeLocation = (locationId: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== locationId));
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('خطأ', 'عنوان المناسبة مطلوب');
      return false;
    }
    if (!guestCount.trim() || parseInt(guestCount) < 1) {
      Alert.alert('خطأ', 'عدد الركاب مطلوب');
      return false;
    }
    if (!eventDate.trim()) {
      Alert.alert('خطأ', 'تاريخ المناسبة مطلوب');
      return false;
    }
    if (!eventTime.trim()) {
      Alert.alert('خطأ', 'وقت المناسبة مطلوب');
      return false;
    }
    if (!durationValue.trim() || parseInt(durationValue) < 1) {
      Alert.alert('خطأ', 'مدة الخدمة مطلوبة');
      return false;
    }
    if (locations.length < 2) {
      Alert.alert('خطأ', 'يجب تحديد نقطة انطلاق ووجهة واحدة على الأقل');
      return false;
    }
    if (!budgetMin.trim() || !budgetMax.trim()) {
      Alert.alert('خطأ', 'الميزانية المتوقعة مطلوبة');
      return false;
    }
    if (parseInt(budgetMin) >= parseInt(budgetMax)) {
      Alert.alert('خطأ', 'الحد الأدنى للميزانية يجب أن يكون أقل من الحد الأقصى');
      return false;
    }
    return true;
  };

  const submitBookingRequest = async () => {
    if (!validateForm()) return;

    try {
      const bookingRequest: EventBookingRequest = {
        eventType: eventType!,
        title: title.trim(),
        description: description.trim(),
        guestCount: parseInt(guestCount),
        duration: {
          type: durationType,
          value: parseInt(durationValue)
        },
        date: eventDate,
        time: eventTime,
        locations,
        specialRequests: specialRequests.trim(),
        budget: {
          min: parseInt(budgetMin),
          max: parseInt(budgetMax),
          currency: currentCurrency
        },
        requiredFeatures
      };

      console.log('Event Booking Request:', bookingRequest);

      // إرسال الطلب للسائقين في نطاق 25 كم
      Alert.alert(
        'تم إرسال طلبك بنجاح',
        'سيتم عرض طلبك على السائقين المتخصصين في نطاق 25 كم. ستصلك عروض الأسعار من السائقين المهتمين.',
        [
          {
            text: 'مراجعة العروض',
            onPress: () => router.push({
              pathname: '/services/event-offers',
              params: { requestId: Date.now().toString() }
            })
          },
          {
            text: 'حسناً',
            style: 'default'
          }
        ]
      );

    } catch (error) {
      console.error('Booking request error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إرسال الطلب');
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'pickup': return 'نقطة الانطلاق';
      case 'destination': return 'الوجهة';
      case 'stop': return 'محطة توقف';
      default: return 'موقع';
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'pickup': return '#4CAF50';
      case 'destination': return '#F44336';
      case 'stop': return '#FF9800';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <X size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>طلب {eventTypeNames[eventType as keyof typeof eventTypeNames]}</Text>
        </View>

        {/* معلومات أساسية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>تفاصيل المناسبة</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="عنوان المناسبة *"
              value={title}
              onChangeText={setTitle}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textArea, isRTL && styles.inputRTL]}
              placeholder="وصف مختصر للمناسبة"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <View style={styles.inputContainer}>
                <Users size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder="عدد الركاب *"
                  value={guestCount}
                  onChangeText={setGuestCount}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>
            <View style={styles.halfInput}>
              <View style={styles.inputContainer}>
                <Calendar size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL]}
                  placeholder="التاريخ (YYYY-MM-DD) *"
                  value={eventDate}
                  onChangeText={setEventDate}
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Clock size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="الوقت (HH:MM) *"
              value={eventTime}
              onChangeText={setEventTime}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        {/* المدة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مدة الخدمة *</Text>
          
          <View style={styles.durationContainer}>
            <View style={styles.durationTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.durationTypeButton,
                  durationType === 'hours' && styles.selectedDurationType
                ]}
                onPress={() => setDurationType('hours')}
              >
                <Text style={[
                  styles.durationTypeText,
                  durationType === 'hours' && styles.selectedDurationTypeText
                ]}>
                  بالساعة
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.durationTypeButton,
                  durationType === 'days' && styles.selectedDurationType
                ]}
                onPress={() => setDurationType('days')}
              >
                <Text style={[
                  styles.durationTypeText,
                  durationType === 'days' && styles.selectedDurationTypeText
                ]}>
                  باليوم
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`عدد ${durationType === 'hours' ? 'الساعات' : 'الأيام'} *`}
                value={durationValue}
                onChangeText={setDurationValue}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>
        </View>

        {/* المواقع */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المواقع والمحطات *</Text>
          <Text style={styles.sectionSubtitle}>حدد نقطة الانطلاق والوجهات المطلوبة</Text>
          
          {locations.map((location, index) => (
            <View key={location.id} style={styles.locationItem}>
              <View style={styles.locationInfo}>
                <View style={[
                  styles.locationTypeIndicator,
                  { backgroundColor: getLocationTypeColor(location.type) }
                ]}>
                  <Text style={styles.locationTypeText}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.locationDetails}>
                  <Text style={styles.locationTypeLabel}>
                    {getLocationTypeLabel(location.type)}
                  </Text>
                  <Text style={styles.locationAddress}>
                    {location.address}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.removeLocationButton}
                onPress={() => removeLocation(location.id)}
              >
                <X size={16} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={() => addLocation(locations.length === 0 ? 'pickup' : 'destination')}
          >
            <Plus size={20} color="#F5B800" />
            <Text style={styles.addLocationText}>
              {locations.length === 0 ? 'إضافة نقطة الانطلاق' : 'إضافة محطة أخرى'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* الميزانية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الميزانية المتوقعة ({currentCurrency.nameAr}) *</Text>
          <Text style={styles.sectionSubtitle}>
            العملة محددة تلقائياً حسب موقعك الجغرافي • {currentCurrency.code}
          </Text>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, styles.inputWithCurrency]}
                  placeholder="الحد الأدنى *"
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>
            <View style={styles.halfInput}>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>{currentCurrency.symbol}</Text>
                <TextInput
                  style={[styles.input, isRTL && styles.inputRTL, styles.inputWithCurrency]}
                  placeholder="الحد الأقصى *"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  keyboardType="numeric"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyInfoText}>
              💡 يتم تحديد العملة تلقائياً بناءً على موقعك الجغرافي لضمان دقة الأسعار
            </Text>
          </View>
        </View>

        {/* المميزات المطلوبة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المميزات المطلوبة (اختياري)</Text>
          
          <View style={styles.featuresGrid}>
            {availableFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.featureCard,
                  requiredFeatures.includes(feature.id) && styles.selectedFeature
                ]}
                onPress={() => toggleFeature(feature.id)}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={[
                  styles.featureName,
                  requiredFeatures.includes(feature.id) && styles.selectedFeatureName
                ]}>
                  {feature.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* طلبات خاصة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طلبات إضافية (اختياري)</Text>
          
          <View style={styles.inputContainer}>
            <MessageSquare size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.textArea, isRTL && styles.inputRTL]}
              placeholder="أي طلبات خاصة أو ملاحظات للسائق..."
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={3}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        {/* زر الإرسال */}
        <TouchableOpacity style={styles.submitButton} onPress={submitBookingRequest}>
          <Text style={styles.submitButtonText}>إرسال الطلب للسائقين</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تحديد الموقع</Text>
            <TouchableOpacity onPress={saveLocation}>
              <Text style={styles.saveLocationText}>حفظ</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.locationInputContainer}>
            <TextInput
              style={[styles.locationInput, isRTL && styles.inputRTL]}
              placeholder="أدخل عنوان الموقع"
              value={locationInput}
              onChangeText={setLocationInput}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
          
          <View style={styles.map}>
            <MapViewComponent 
              onLocationSelect={(location: Coordinates) => {
                setSelectedPosition({
                  latitude: location.latitude,
                  longitude: location.longitude
                });
              }}
            />
          </View>
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
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
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
  currencyInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 184, 0, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F5B800',
  },
  currencyInfoText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 18,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  durationContainer: {
    marginTop: 8,
  },
  durationTypeSelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  durationTypeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
  },
  selectedDurationType: {
    borderColor: '#F5B800',
    backgroundColor: '#F5B800',
  },
  durationTypeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  selectedDurationTypeText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(245, 184, 0, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationTypeIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationTypeText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  locationDetails: {
    flex: 1,
  },
  locationTypeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  removeLocationButton: {
    padding: 8,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5B800',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addLocationText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedFeature: {
    borderColor: '#F5B800',
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureName: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    textAlign: 'center',
  },
  selectedFeatureName: {
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
  },
  biddingTimeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeOption: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedTimeOption: {
    borderColor: '#F5B800',
    backgroundColor: '#F5B800',
  },
  timeOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  selectedTimeOptionText: {
    color: '#fff',
    fontFamily: 'Poppins-SemiBold',
  },
  submitButton: {
    backgroundColor: '#F5B800',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
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
  saveLocationText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
  },
  locationInputContainer: {
    padding: 16,
  },
  locationInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  map: {
    flex: 1,
  },
});
