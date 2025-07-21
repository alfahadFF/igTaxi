import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/hooks/useAuth';

interface LocationInfo {
  latitude: number;
  longitude: number;
  address: string;
}

export default function GasDistributorRegisterScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    licensePlate: '',
    phone: '',
    coverageRadius: '10',
    cylinder12kgPrice: '',
    cylinder25kgPrice: '',
    cylinderSmallPrice: '',
    serviceFee: '0',
  });
  const [currentLocation, setCurrentLocation] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'نحتاج إلى إذن الموقع لتسجيل موقع مؤسستك');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = reverseGeocode[0] 
        ? `${reverseGeocode[0].street || ''} ${reverseGeocode[0].district || ''} ${reverseGeocode[0].city || ''}`
        : 'الموقع الحالي';

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address.trim(),
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('خطأ', 'تعذر الحصول على موقعك الحالي');
    } finally {
      setLocationLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المؤسسة');
      return false;
    }
    if (!formData.licensePlate.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم اللوحة');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف');
      return false;
    }
    if (!formData.cylinder12kgPrice.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال سعر اسطوانة 12 كيلو');
      return false;
    }
    if (!currentLocation) {
      Alert.alert('خطأ', 'يرجى السماح بالوصول للموقع');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm() || !user) return;

    try {
      setLoading(true);

      // التحقق من عدم تسجيل المستخدم كموزع من قبل
      const { data: existingDistributor } = await supabase
        .from('gas_distributors')
        .select('id')
        .eq('driver_id', user.id)
        .single();

      if (existingDistributor) {
        Alert.alert('تحذير', 'أنت مسجل بالفعل كموزع غاز');
        return;
      }

      // إنشاء سجل الموزع
      const { data, error } = await supabase
        .from('gas_distributors')
        .insert([
          {
            driver_id: user.id,
            business_name: formData.businessName.trim(),
            license_plate: formData.licensePlate.trim().toUpperCase(),
            phone: formData.phone.trim(),
            current_latitude: currentLocation!.latitude,
            current_longitude: currentLocation!.longitude,
            registered_address: currentLocation!.address,
            coverage_radius: parseInt(formData.coverageRadius),
            cylinder_12kg_price: parseFloat(formData.cylinder12kgPrice),
            cylinder_25kg_price: formData.cylinder25kgPrice 
              ? parseFloat(formData.cylinder25kgPrice) 
              : null,
            cylinder_small_price: formData.cylinderSmallPrice 
              ? parseFloat(formData.cylinderSmallPrice) 
              : null,
            service_fee: parseFloat(formData.serviceFee || '0'),
            is_available: true,
            is_verified: false, // يحتاج موافقة الإدارة
            is_online: true,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        if (error.code === '23505') {
          Alert.alert('خطأ', 'رقم اللوحة مسجل من قبل');
        } else {
          Alert.alert('خطأ', 'تعذر التسجيل. يرجى المحاولة مرة أخرى.');
        }
        return;
      }

      Alert.alert(
        'تم التسجيل بنجاح!',
        'تم تسجيلك كموزع غاز. ستتم مراجعة طلبك من قبل الإدارة وسيتم تفعيل حسابك خلال 24 ساعة.',
        [
          {
            text: 'موافق',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('خطأ', 'تعذر التسجيل. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (locationLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>جاري تحديد موقعك...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>تسجيل موزع غاز</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Business Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 معلومات المؤسسة</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المؤسسة / المحل *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: مؤسسة الأردن للغاز"
              value={formData.businessName}
              onChangeText={(value) => updateFormData('businessName', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم لوحة المركبة *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 123456"
              value={formData.licensePlate}
              onChangeText={(value) => updateFormData('licensePlate', value)}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم الهاتف *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 0791234567"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 الموقع ونطاق الخدمة</Text>
          
          {currentLocation && (
            <View style={styles.locationCard}>
              <Text style={styles.locationLabel}>موقع المؤسسة:</Text>
              <Text style={styles.locationText}>{currentLocation.address}</Text>
              <TouchableOpacity 
                style={styles.refreshLocationButton}
                onPress={getCurrentLocation}
              >
                <Ionicons name="refresh" size={16} color="#FF6B35" />
                <Text style={styles.refreshLocationText}>تحديث الموقع</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>نطاق التغطية (كيلومتر)</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              value={formData.coverageRadius}
              onChangeText={(value) => updateFormData('coverageRadius', value)}
              keyboardType="numeric"
            />
            <Text style={styles.hint}>المسافة التي تستطيع تغطيتها من موقعك</Text>
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 الأسعار</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>سعر اسطوانة 12 كيلو (دينار) *</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 8.5"
              value={formData.cylinder12kgPrice}
              onChangeText={(value) => updateFormData('cylinder12kgPrice', value)}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>سعر اسطوانة 25 كيلو (دينار)</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 16.0"
              value={formData.cylinder25kgPrice}
              onChangeText={(value) => updateFormData('cylinder25kgPrice', value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>اتركه فارغاً إذا لم تكن تبيع هذا النوع</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>سعر الاسطوانة الصغيرة (دينار)</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: 4.0"
              value={formData.cylinderSmallPrice}
              onChangeText={(value) => updateFormData('cylinderSmallPrice', value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>اتركه فارغاً إذا لم تكن تبيع هذا النوع</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رسوم الخدمة (دينار)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={formData.serviceFee}
              onChangeText={(value) => updateFormData('serviceFee', value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.hint}>رسوم إضافية للتوصيل (اختياري)</Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#007BFF" />
          <Text style={styles.infoText}>
            سيتم مراجعة طلب التسجيل من قبل الإدارة خلال 24 ساعة. 
            ستحصل على إشعار عند تفعيل حسابك.
          </Text>
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.registerButton, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.registerButtonText}>تسجيل كموزع غاز</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  form: {
    padding: 15,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  locationCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  refreshLocationText: {
    color: '#FF6B35',
    fontSize: 14,
    marginLeft: 5,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});
