import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Truck,
  Package,
  Laptop,
  UtensilsCrossed,
  Wrench,
  Shirt,
  FileText,
  AlertTriangle,
  MapPin,
  Plus,
  X,
  DollarSign,
  Send,
  Calendar,
  Clock,
  ArrowLeft
} from 'lucide-react-native';
import { getCurrencyByLocation, DEFAULT_CURRENCY, type Currency } from '@/utils/currency';
import * as Location from 'expo-location';

interface LocationData {
  id: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  type: 'pickup' | 'delivery';
}

interface TransportFormData {
  cargoType: string;
  weight: number;
  weightUnit: 'kg' | 'ton';
  pickupLocations: LocationData[];
  deliveryLocations: LocationData[];
  budget: {
    min: number;
    max: number;
  };
  urgency: 'normal' | 'urgent';
  additionalNotes: string;
}

export default function TransportScreen() {
  const router = useRouter();

  const [formData, setFormData] = useState<TransportFormData>({
    cargoType: '',
    weight: 0,
    weightUnit: 'kg',
    pickupLocations: [],
    deliveryLocations: [],
    budget: { min: 0, max: 0 },
    urgency: 'normal',
    additionalNotes: '',
  });

  const [currentCurrency, setCurrentCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // أنواع الحمولات المختلفة
  const cargoTypes = [
    { id: 'furniture', name: 'أثاث ومنزليات', icon: Truck },
    { id: 'electronics', name: 'أجهزة إلكترونية', icon: Laptop },
    { id: 'food', name: 'مواد غذائية', icon: UtensilsCrossed },
    { id: 'construction', name: 'مواد بناء', icon: Wrench },
    { id: 'clothing', name: 'ملابس ونسيج', icon: Shirt },
    { id: 'documents', name: 'وثائق ومستندات', icon: FileText },
    { id: 'fragile', name: 'أشياء قابلة للكسر', icon: AlertTriangle },
    { id: 'other', name: 'أخرى', icon: Package },
  ];

  useEffect(() => {
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

  const addLocationManually = () => {
    Alert.prompt(
      'إضافة موقع استلام',
      'أدخل عنوان موقع الاستلام:',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'إضافة',
          onPress: (address) => {
            if (address && address.trim()) {
              const newLocation: LocationData = {
                id: Date.now().toString(),
                address: address.trim(),
                coordinates: {
                  latitude: 31.9539,
                  longitude: 35.9106,
                },
                type: 'pickup',
              };

              setFormData(prev => ({
                ...prev,
                pickupLocations: [...prev.pickupLocations, newLocation]
              }));
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const addDeliveryLocation = () => {
    Alert.prompt(
      'إضافة موقع تسليم',
      'أدخل عنوان موقع التسليم:',
      [
        {
          text: 'إلغاء',
          style: 'cancel',
        },
        {
          text: 'إضافة',
          onPress: (address) => {
            if (address && address.trim()) {
              const newLocation: LocationData = {
                id: Date.now().toString(),
                address: address.trim(),
                coordinates: {
                  latitude: 31.9539,
                  longitude: 35.9106,
                },
                type: 'delivery',
              };

              setFormData(prev => ({
                ...prev,
                deliveryLocations: [...prev.deliveryLocations, newLocation]
              }));
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const removeLocation = (id: string, type: 'pickup' | 'delivery') => {
    if (type === 'pickup') {
      setFormData(prev => ({
        ...prev,
        pickupLocations: prev.pickupLocations.filter(loc => loc.id !== id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        deliveryLocations: prev.deliveryLocations.filter(loc => loc.id !== id)
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.cargoType) {
      Alert.alert('خطأ', 'يرجى اختيار نوع الحمولة');
      return false;
    }

    if (formData.weight <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال وزن الحمولة');
      return false;
    }

    if (formData.pickupLocations.length === 0) {
      Alert.alert('خطأ', 'يرجى إضافة موقع الاستلام');
      return false;
    }

    if (formData.deliveryLocations.length === 0) {
      Alert.alert('خطأ', 'يرجى إضافة موقع التسليم');
      return false;
    }

    if (formData.budget.min <= 0 || formData.budget.max <= 0 || formData.budget.min >= formData.budget.max) {
      Alert.alert('خطأ', 'يرجى إدخال نطاق ميزانية صحيح');
      return false;
    }

    return true;
  };

  const submitTransportRequest = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      // محاكاة إرسال طلب النقل
      await new Promise(resolve => setTimeout(resolve, 2000));

      // إنشاء معرف فريد للطلب
      const requestId = `transport_${Date.now()}`;

      Alert.alert(
        'تم إرسال طلبك بنجاح',
        'سيتم البحث عن الناقلين المتاحين في منطقتك وإرسال العروض إليك قريباً.',
        [
          {
            text: 'عرض العروض',
            onPress: () => router.push(`/services/transport-offers?requestId=${requestId}`)
          }
        ]
      );

    } catch (error) {
      console.error('Error submitting transport request:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>خدمة النقل</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* اختيار نوع الحمولة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>نوع الحمولة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.cargoTypesContainer}>
              {cargoTypes.map((type) => {
                const IconComponent = type.icon;
                const isSelected = formData.cargoType === type.id;
                
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.cargoTypeCard,
                      isSelected && styles.selectedCargoCard
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, cargoType: type.id }))}
                  >
                    <IconComponent 
                      size={32} 
                      color={isSelected ? '#F5B800' : '#666'} 
                    />
                    <Text style={[
                      styles.cargoTypeName,
                      isSelected && styles.selectedCargoText
                    ]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* إدخال الوزن */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>وزن الحمولة</Text>
          <View style={styles.weightContainer}>
            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={formData.weight.toString()}
                onChangeText={(text) => {
                  const weight = parseFloat(text) || 0;
                  setFormData(prev => ({ ...prev, weight }));
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            
            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  formData.weightUnit === 'kg' && styles.selectedUnit
                ]}
                onPress={() => setFormData(prev => ({ ...prev, weightUnit: 'kg' }))}
              >
                <Text style={[
                  styles.unitText,
                  formData.weightUnit === 'kg' && styles.selectedUnitText
                ]}>
                  كيلو
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.unitButton,
                  formData.weightUnit === 'ton' && styles.selectedUnit
                ]}
                onPress={() => setFormData(prev => ({ ...prev, weightUnit: 'ton' }))}
              >
                <Text style={[
                  styles.unitText,
                  formData.weightUnit === 'ton' && styles.selectedUnitText
                ]}>
                  طن
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* مواقع الاستلام */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مواقع الاستلام</Text>
          
          {formData.pickupLocations.map((location) => (
            <View key={location.id} style={styles.locationItem}>
              <MapPin size={20} color="#F5B800" />
              <Text style={styles.locationText}>{location.address}</Text>
              <TouchableOpacity
                style={styles.removeLocationButton}
                onPress={() => removeLocation(location.id, 'pickup')}
              >
                <X size={16} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={addLocationManually}
          >
            <Plus size={20} color="#F5B800" />
            <Text style={styles.addLocationText}>إضافة موقع استلام</Text>
          </TouchableOpacity>
        </View>

        {/* مواقع التسليم */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مواقع التسليم</Text>
          
          {formData.deliveryLocations.map((location) => (
            <View key={location.id} style={styles.locationItem}>
              <MapPin size={20} color="#4CAF50" />
              <Text style={styles.locationText}>{location.address}</Text>
              <TouchableOpacity
                style={styles.removeLocationButton}
                onPress={() => removeLocation(location.id, 'delivery')}
              >
                <X size={16} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
          
          <TouchableOpacity
            style={styles.addLocationButton}
            onPress={addDeliveryLocation}
          >
            <Plus size={20} color="#4CAF50" />
            <Text style={styles.addLocationText}>إضافة موقع تسليم</Text>
          </TouchableOpacity>
        </View>

        {/* نطاق الميزانية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            الميزانية المتوقعة ({currentCurrency.symbol})
          </Text>
          <View style={styles.budgetContainer}>
            <View style={styles.budgetInputContainer}>
              <Text style={styles.budgetLabel}>من</Text>
              <TextInput
                style={styles.budgetInput}
                value={formData.budget.min.toString()}
                onChangeText={(text) => {
                  const min = parseFloat(text) || 0;
                  setFormData(prev => ({
                    ...prev,
                    budget: { ...prev.budget, min }
                  }));
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            
            <View style={styles.budgetInputContainer}>
              <Text style={styles.budgetLabel}>إلى</Text>
              <TextInput
                style={styles.budgetInput}
                value={formData.budget.max.toString()}
                onChangeText={(text) => {
                  const max = parseFloat(text) || 0;
                  setFormData(prev => ({
                    ...prev,
                    budget: { ...prev.budget, max }
                  }));
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>

        {/* درجة الإلحاح */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>درجة الإلحاح</Text>
          <View style={styles.urgencyContainer}>
            <TouchableOpacity
              style={[
                styles.urgencyButton,
                formData.urgency === 'normal' && styles.selectedUrgency
              ]}
              onPress={() => setFormData(prev => ({ ...prev, urgency: 'normal' }))}
            >
              <Calendar size={20} color={formData.urgency === 'normal' ? '#fff' : '#666'} />
              <Text style={[
                styles.urgencyText,
                formData.urgency === 'normal' && styles.selectedUrgencyText
              ]}>
                عادي
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.urgencyButton,
                formData.urgency === 'urgent' && styles.selectedUrgency
              ]}
              onPress={() => setFormData(prev => ({ ...prev, urgency: 'urgent' }))}
            >
              <Clock size={20} color={formData.urgency === 'urgent' ? '#fff' : '#666'} />
              <Text style={[
                styles.urgencyText,
                formData.urgency === 'urgent' && styles.selectedUrgencyText
              ]}>
                عاجل
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ملاحظات إضافية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملاحظات إضافية (اختياري)</Text>
          <TextInput
            style={styles.notesInput}
            value={formData.additionalNotes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, additionalNotes: text }))}
            placeholder="أي تفاصيل إضافية عن الحمولة أو متطلبات خاصة..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* زر الإرسال */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}
          onPress={submitTransportRequest}
          disabled={isSubmitting}
        >
          <Send size={20} color="#fff" />
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'جاري البحث عن الناقلين...' : 'طلب النقل'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  cargoTypesContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  cargoTypeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 100,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCargoCard: {
    borderColor: '#F5B800',
    backgroundColor: '#FFF8E1',
  },
  cargoTypeName: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    textAlign: 'center',
  },
  selectedCargoText: {
    color: '#F5B800',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  weightInput: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    paddingVertical: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedUnit: {
    backgroundColor: '#F5B800',
  },
  unitText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  selectedUnitText: {
    color: '#fff',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  locationText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  removeLocationButton: {
    padding: 4,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5B800',
    borderStyle: 'dashed',
  },
  addLocationText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#F5B800',
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetInputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  budgetLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginTop: 8,
  },
  budgetInput: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    paddingVertical: 8,
    paddingBottom: 16,
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedUrgency: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  urgencyText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  selectedUrgencyText: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5B800',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  bottomPadding: {
    height: 50,
  },
});
