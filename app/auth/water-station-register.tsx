import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { MapPin, Camera, Plus, X, Clock, DollarSign } from 'lucide-react-native';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

interface ProductItem {
  id: string;
  name: string;
  size: string;
  price: number;
  unit: string;
}

interface WorkingHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export default function WaterStationRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  // معلومات أساسية
  const [stationName, setStationName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // الموقع
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // المنتجات
  const [products, setProducts] = useState<ProductItem[]>([
    { id: '1', name: 'جالون كبير', size: '20', price: 0, unit: 'لتر' },
    { id: '2', name: 'جالون متوسط', size: '10', price: 0, unit: 'لتر' },
    { id: '3', name: 'قوارير صغيرة', size: '5', price: 0, unit: 'لتر' }
  ]);
  
  // ساعات العمل
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: 'الأحد', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'الإثنين', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'الثلاثاء', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'الأربعاء', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'الخميس', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'الجمعة', isOpen: true, openTime: '08:00', closeTime: '22:00' },
    { day: 'السبت', isOpen: true, openTime: '08:00', closeTime: '22:00' }
  ]);
  
  // إعدادات التوصيل
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [deliveryAreas, setDeliveryAreas] = useState(['']);
  
  // الصور
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [stationImages, setStationImages] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    getCurrentLocation(); // التقاط الموقع تلقائياً عند فتح الصفحة
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('تنبيه', 'نحتاج إذن الموقع لتحديد موقع المحطة تلقائياً');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      // الحصول على العنوان من الإحداثيات
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (geocode[0]) {
        const addr = geocode[0];
        const fullAddress = [addr.street, addr.streetNumber].filter(Boolean).join(' ');
        setAddress(fullAddress || '');
        setCity(addr.city || addr.subregion || '');
        setArea(addr.district || addr.region || '');
      }
      
    } catch (error) {
      console.log('Location error:', error);
      // لا نظهر تنبيه خطأ، فقط نسجل في الكونسول
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const pickStationImage = async () => {
    if (stationImages.length >= 5) {
      Alert.alert('تنبيه', 'يمكنك إضافة 5 صور كحد أقصى');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setStationImages([...stationImages, result.assets[0].uri]);
    }
  };

  const removeStationImage = (index: number) => {
    const newImages = stationImages.filter((_, i) => i !== index);
    setStationImages(newImages);
  };

  const updateProduct = (id: string, field: string, value: string) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, [field]: value } : product
    ));
  };

  const addProduct = () => {
    const newProduct: ProductItem = {
      id: Date.now().toString(),
      name: '',
      size: '',
      price: 0,
      unit: 'لتر'
    };
    setProducts([...products, newProduct]);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const updateWorkingHours = (index: number, field: string, value: any) => {
    const newHours = [...workingHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setWorkingHours(newHours);
  };

  const addDeliveryArea = () => {
    setDeliveryAreas([...deliveryAreas, '']);
  };

  const updateDeliveryArea = (index: number, value: string) => {
    const newAreas = [...deliveryAreas];
    newAreas[index] = value;
    setDeliveryAreas(newAreas);
  };

  const removeDeliveryArea = (index: number) => {
    if (deliveryAreas.length > 1) {
      setDeliveryAreas(deliveryAreas.filter((_, i) => i !== index));
    }
  };

  const validateForm = () => {
    if (!stationName.trim()) {
      Alert.alert('خطأ', 'اسم المحطة مطلوب');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('خطأ', 'رقم الهاتف مطلوب');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('خطأ', 'العنوان مطلوب');
      return false;
    }
    if (!location) {
      Alert.alert('خطأ', 'يرجى تحديد الموقع على الخريطة');
      return false;
    }
    
    const validProducts = products.filter(p => p.name.trim() && p.size && p.price > 0);
    if (validProducts.length === 0) {
      Alert.alert('خطأ', 'يجب إضافة منتج واحد على الأقل');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('خطأ', 'يجب تسجيل الدخول أولاً');
        return;
      }

      // تحضير البيانات
      const validProducts = products.filter(p => p.name.trim() && p.size && p.price > 0);
      const validAreas = deliveryAreas.filter(area => area.trim());
      
      const stationData = {
        owner_id: user.id,
        station_name: stationName.trim(),
        description: description.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim(),
        city: city.trim(),
        area: area.trim() || null,
        latitude: location!.latitude,
        longitude: location!.longitude,
        products: validProducts,
        working_hours: workingHours,
        delivery_fee: parseFloat(deliveryFee) || 0,
        minimum_order: parseFloat(minimumOrder) || 0,
        delivery_areas: validAreas,
        logo_url: logoUri, // في التطبيق الحقيقي، يجب رفع الصورة للتخزين أولاً
        images: stationImages // في التطبيق الحقيقي، يجب رفع الصور للتخزين أولاً
      };

      const { error } = await supabase
        .from('water_stations')
        .insert(stationData);

      if (error) throw error;

      Alert.alert(
        'تم بنجاح!',
        'تم تسجيل محطة التنقية بنجاح. سيتم مراجعة طلبك وتفعيل المحطة قريباً.',
        [
          {
            text: 'موافق',
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>تسجيل محطة تنقية المياه</Text>
            <Text style={styles.subtitle}>املأ البيانات لتسجيل محطتك</Text>
          </View>

          {/* المعلومات الأساسية */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المعلومات الأساسية</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>اسم المحطة *</Text>
              <TextInput
                style={styles.input}
                value={stationName}
                onChangeText={setStationName}
                placeholder="اسم محطة التنقية"
                textAlign="right"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>الوصف</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="وصف المحطة والخدمات المقدمة"
                textAlign="right"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>رقم الهاتف *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0791234567"
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                textAlign="right"
              />
            </View>
          </View>

          {/* الموقع */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الموقع</Text>
            
            <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
              <MapPin size={20} color="white" />
              <Text style={styles.locationButtonText}>
                {location ? 'تحديث الموقع الحالي' : 'تحديد الموقع الحالي'}
              </Text>
            </TouchableOpacity>
            
            {location && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationText}>
                  📍 تم تحديد الموقع: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>العنوان *</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="الشارع والرقم"
                textAlign="right"
              />
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>المدينة</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="المدينة"
                  textAlign="right"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>المنطقة</Text>
                <TextInput
                  style={styles.input}
                  value={area}
                  onChangeText={setArea}
                  placeholder="المنطقة"
                  textAlign="right"
                />
              </View>
            </View>
          </View>

          {/* المنتجات */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>المنتجات والأسعار</Text>
              <TouchableOpacity style={styles.addButton} onPress={addProduct}>
                <Plus size={16} color="white" />
              </TouchableOpacity>
            </View>

            {products.map((product, index) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productNumber}>منتج {index + 1}</Text>
                  {products.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeProduct(product.id)}
                    >
                      <X size={16} color="#ff4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>النوع</Text>
                    <TextInput
                      style={styles.input}
                      value={product.name}
                      onChangeText={(value) => updateProduct(product.id, 'name', value)}
                      placeholder="جالون، قارورة، كأس"
                      textAlign="right"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.label}>الحجم (لتر)</Text>
                    <TextInput
                      style={styles.input}
                      value={product.size}
                      onChangeText={(value) => updateProduct(product.id, 'size', value)}
                      placeholder="20"
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>السعر (دينار)</Text>
                  <TextInput
                    style={styles.input}
                    value={product.price.toString()}
                    onChangeText={(value) => updateProduct(product.id, 'price', value)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    textAlign="right"
                  />
                </View>
              </View>
            ))}
          </View>

          {/* إعدادات التوصيل */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إعدادات التوصيل</Text>
            
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>رسوم التوصيل (دينار)</Text>
                <TextInput
                  style={styles.input}
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  placeholder="0.50"
                  keyboardType="decimal-pad"
                  textAlign="right"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.label}>أقل طلب (دينار)</Text>
                <TextInput
                  style={styles.input}
                  value={minimumOrder}
                  onChangeText={setMinimumOrder}
                  placeholder="5.00"
                  keyboardType="decimal-pad"
                  textAlign="right"
                />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.label}>مناطق التوصيل</Text>
              <TouchableOpacity style={styles.addButton} onPress={addDeliveryArea}>
                <Plus size={16} color="white" />
              </TouchableOpacity>
            </View>

            {deliveryAreas.map((area, index) => (
              <View key={index} style={styles.areaRow}>
                <TextInput
                  style={[styles.input, styles.areaInput]}
                  value={area}
                  onChangeText={(value) => updateDeliveryArea(index, value)}
                  placeholder="اسم المنطقة"
                  textAlign="right"
                />
                {deliveryAreas.length > 1 && (
                  <TouchableOpacity 
                    style={styles.removeAreaButton}
                    onPress={() => removeDeliveryArea(index)}
                  >
                    <X size={16} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* الصور */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الصور والشعار</Text>
            
            <View style={styles.imageSection}>
              <Text style={styles.label}>شعار المحطة</Text>
              <TouchableOpacity style={styles.logoUpload} onPress={pickLogo}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                ) : (
                  <>
                    <Camera size={24} color="#666" />
                    <Text style={styles.uploadText}>اختر شعار</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.imageSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.label}>صور المحطة</Text>
                <TouchableOpacity style={styles.addButton} onPress={pickStationImage}>
                  <Plus size={16} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.imagesGrid}>
                {stationImages.map((uri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri }} style={styles.stationImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => removeStationImage(index)}
                    >
                      <X size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'جاري التسجيل...' : 'تسجيل المحطة'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.light.primary,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    opacity: 0.9,
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
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  locationButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  locationText: {
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 20,
    padding: 8,
  },
  productCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  removeButton: {
    backgroundColor: '#ffe6e6',
    borderRadius: 15,
    padding: 4,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  areaInput: {
    flex: 1,
  },
  removeAreaButton: {
    backgroundColor: '#ffe6e6',
    borderRadius: 15,
    padding: 8,
  },
  imageSection: {
    marginBottom: 20,
  },
  logoUpload: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imageContainer: {
    position: 'relative',
  },
  stationImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    padding: 2,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    margin: 20,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
