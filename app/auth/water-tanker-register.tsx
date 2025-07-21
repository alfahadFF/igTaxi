import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ArrowLeft, Truck, Droplets, MapPin, DollarSign } from 'lucide-react-native';
import * as Location from 'expo-location';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

const jordanianCities = [
  'عمان', 'الزرقاء', 'إربد', 'الرصيفة', 'وادي السير', 'الرمثا', 'السلط', 
  'مادبا', 'عجلون', 'العقبة', 'الكرك', 'معان', 'جرش', 'الطفيلة'
];

export default function WaterTankerRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    licensePlate: '',
    tankerCapacity: '',
    pricePerLiter: '',
    minimumOrder: '1000',
    serviceAreas: [] as string[],
    vehicleInfo: {
      brand: '',
      model: '',
      year: '',
      color: ''
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  React.useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const toggleServiceArea = (city: string) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(city)
        ? prev.serviceAreas.filter(area => area !== city)
        : [...prev.serviceAreas, city]
    }));
  };

  const validateForm = () => {
    if (!formData.licensePlate.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم اللوحة');
      return false;
    }

    if (!formData.tankerCapacity || parseFloat(formData.tankerCapacity) <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعة الصهريج بشكل صحيح');
      return false;
    }

    if (!formData.pricePerLiter || parseFloat(formData.pricePerLiter) <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال سعر اللتر بشكل صحيح');
      return false;
    }

    if (formData.serviceAreas.length === 0) {
      Alert.alert('خطأ', 'يرجى اختيار منطقة واحدة على الأقل للخدمة');
      return false;
    }

    if (!currentLocation) {
      Alert.alert('خطأ', 'لا يمكن تحديد الموقع الحالي');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // التحقق من عدم وجود رقم اللوحة مسبقاً
      const { data: existingTanker, error: checkError } = await supabase
        .from('water_tankers')
        .select('id')
        .eq('license_plate', formData.licensePlate.toUpperCase())
        .single();

      if (existingTanker) {
        Alert.alert('خطأ', 'رقم اللوحة مسجل مسبقاً');
        return;
      }

      // إنشاء سجل جديد
      const { data: tankerData, error: insertError } = await supabase
        .from('water_tankers')
        .insert({
          license_plate: formData.licensePlate.toUpperCase(),
          tanker_capacity: parseInt(formData.tankerCapacity),
          available_capacity: parseInt(formData.tankerCapacity), // في البداية متاح بالكامل
          current_latitude: currentLocation!.latitude,
          current_longitude: currentLocation!.longitude,
          price_per_liter: parseFloat(formData.pricePerLiter),
          minimum_order: parseInt(formData.minimumOrder),
          service_areas: formData.serviceAreas,
          vehicle_info: formData.vehicleInfo,
          is_available: true,
          is_verified: false // بحاجة لموافقة الإدارة
        })
        .select()
        .single();

      if (insertError) throw insertError;

      Alert.alert(
        'تم التسجيل بنجاح',
        'تم تسجيل صهريج المياه بنجاح. سيتم مراجعة طلبك والموافقة عليه خلال 24 ساعة.',
        [
          {
            text: 'موافق',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'فشل في تسجيل الصهريج');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>تسجيل صهريج ماء</Text>
        
        <View style={styles.headerIcon}>
          <Truck size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* معلومات أساسية */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>رقم اللوحة *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="مثال: ABC123"
              value={formData.licensePlate}
              onChangeText={(text) => setFormData(prev => ({ ...prev, licensePlate: text }))}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>سعة الصهريج (لتر) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="مثال: 5000"
              value={formData.tankerCapacity}
              onChangeText={(text) => setFormData(prev => ({ ...prev, tankerCapacity: text }))}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>سعر اللتر (دينار) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="مثال: 0.50"
              value={formData.pricePerLiter}
              onChangeText={(text) => setFormData(prev => ({ ...prev, pricePerLiter: text }))}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>الحد الأدنى للطلب (لتر)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1000"
              value={formData.minimumOrder}
              onChangeText={(text) => setFormData(prev => ({ ...prev, minimumOrder: text }))}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* معلومات المركبة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات المركبة</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>العلامة التجارية</Text>
            <TextInput
              style={styles.textInput}
              placeholder="مثال: مرسيدس"
              value={formData.vehicleInfo.brand}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicleInfo: { ...prev.vehicleInfo, brand: text }
              }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>الموديل</Text>
            <TextInput
              style={styles.textInput}
              placeholder="مثال: Actros"
              value={formData.vehicleInfo.model}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicleInfo: { ...prev.vehicleInfo, model: text }
              }))}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>سنة الصنع</Text>
              <TextInput
                style={styles.textInput}
                placeholder="2020"
                value={formData.vehicleInfo.year}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  vehicleInfo: { ...prev.vehicleInfo, year: text }
                }))}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
              <Text style={styles.inputLabel}>اللون</Text>
              <TextInput
                style={styles.textInput}
                placeholder="أبيض"
                value={formData.vehicleInfo.color}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  vehicleInfo: { ...prev.vehicleInfo, color: text }
                }))}
              />
            </View>
          </View>
        </View>

        {/* مناطق الخدمة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>مناطق الخدمة *</Text>
          <Text style={styles.sectionSubtitle}>اختر المناطق التي تقدم بها الخدمة</Text>
          
          <View style={styles.citiesContainer}>
            {jordanianCities.map((city) => (
              <TouchableOpacity
                key={city}
                style={[
                  styles.cityButton,
                  formData.serviceAreas.includes(city) && styles.selectedCityButton
                ]}
                onPress={() => toggleServiceArea(city)}
              >
                <Text style={[
                  styles.cityButtonText,
                  formData.serviceAreas.includes(city) && styles.selectedCityButtonText
                ]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* معلومات الموقع */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الموقع الحالي</Text>
          
          {currentLocation ? (
            <View style={styles.locationInfo}>
              <MapPin size={20} color={Colors.light.primary} />
              <View style={styles.locationDetails}>
                <Text style={styles.locationText}>تم تحديد الموقع بنجاح</Text>
                <Text style={styles.coordsText}>
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
              <MapPin size={20} color="white" />
              <Text style={styles.locationButtonText}>تحديد الموقع الحالي</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* زر التسجيل */}
        <View style={styles.registerSection}>
          <TouchableOpacity 
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Droplets size={20} color="white" />
            <Text style={styles.registerButtonText}>
              {loading ? 'جاري التسجيل...' : 'تسجيل الصهريج'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.noteText}>
            * سيتم مراجعة طلبك والموافقة عليه خلال 24 ساعة
          </Text>
        </View>
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
  headerIcon: {
    width: 34,
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  citiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  selectedCityButton: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  cityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCityButtonText: {
    color: 'white',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    gap: 10,
  },
  locationDetails: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  locationButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerSection: {
    margin: 15,
    marginTop: 0,
  },
  registerButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 10,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
