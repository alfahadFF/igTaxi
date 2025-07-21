import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

interface Pharmacy {
  id: number;
  name: string;
  location: string;
  contact_phone: string;
  delivery_fee: number;
}

interface PrescriptionFormProps {
  pharmacy: Pharmacy;
  onOrderSubmitted: (orderId: number) => void;
  onBack: () => void;
}

export default function PrescriptionForm({ 
  pharmacy, 
  onOrderSubmitted, 
  onBack 
}: PrescriptionFormProps) {
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');
  const [customerNotes, setCustomerNotes] = useState('');
  const [urgentOrder, setUrgentOrder] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const pickImage = async () => {
    try {
      // طلب الإذن للوصول إلى الصور
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى الصور لرفع صورة الوصفة');
        return;
      }

      // فتح منتقي الصور
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPrescriptionImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('خطأ', 'حدث خطأ في اختيار الصورة');
    }
  };

  const takePhoto = async () => {
    try {
      // طلب الإذن للوصول إلى الكاميرا
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('إذن مطلوب', 'نحتاج إذن للوصول إلى الكاميرا لالتقاط صورة الوصفة');
        return;
      }

      // فتح الكاميرا
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPrescriptionImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('خطأ', 'حدث خطأ في التقاط الصورة');
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'اختر طريقة إضافة الصورة',
      'كيف تريد إضافة صورة الوصفة؟',
      [
        { text: 'الكاميرا', onPress: takePhoto },
        { text: 'من الصور', onPress: pickImage },
        { text: 'إلغاء', style: 'cancel' }
      ]
    );
  };

  const validateForm = () => {
    if (!prescriptionImage) {
      Alert.alert('خطأ', 'يرجى إضافة صورة الوصفة الطبية');
      return false;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال عنوان التوصيل');
      return false;
    }
    if (!deliveryPhone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم هاتف التوصيل');
      return false;
    }
    if (!patientName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم المريض');
      return false;
    }
    return true;
  };

  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileName = `prescription_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, blob);

      if (error) throw error;
      
      // الحصول على URL عام للصورة
      const { data: urlData } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('فشل في رفع الصورة');
    }
  };

  const submitOrder = async () => {
    if (!validateForm() || !user) return;

    setLoading(true);
    try {
      // رفع صورة الوصفة
      const imageUrl = await uploadImage(prescriptionImage!);

      // إنشاء طلب جديد
      const { data, error } = await supabase
        .from('prescription_orders')
        .insert({
          pharmacy_id: pharmacy.id,
          customer_id: user.id,
          prescription_image_url: imageUrl,
          customer_notes: customerNotes.trim() || null,
          delivery_address: deliveryAddress.trim(),
          delivery_phone: deliveryPhone.trim(),
          patient_name: patientName.trim(),
          patient_age: patientAge ? parseInt(patientAge) : null,
          patient_gender: patientGender,
          urgent_order: urgentOrder,
          delivery_fee: pharmacy.delivery_fee,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'تم إرسال الطلب',
        'تم إرسال طلب الوصفة بنجاح. ستحصل على رد من الصيدلية قريباً.',
        [
          {
            text: 'موافق',
            onPress: () => onOrderSubmitted(data.id)
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting order:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إرسال وصفة طبية</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Pharmacy Info */}
      <View style={styles.pharmacyInfo}>
        <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
        <View style={styles.pharmacyDetails}>
          <Ionicons name="location" size={16} color={colors.textSecondary} />
          <Text style={styles.pharmacyLocation}>{pharmacy.location}</Text>
        </View>
        <View style={styles.pharmacyDetails}>
          <Ionicons name="call" size={16} color={colors.textSecondary} />
          <Text style={styles.pharmacyPhone}>{pharmacy.contact_phone}</Text>
        </View>
      </View>

      {/* Prescription Image */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>صورة الوصفة الطبية *</Text>
        <Text style={styles.sectionSubtitle}>
          يرجى التأكد من وضوح الصورة وقابليتها للقراءة
        </Text>
        
        {prescriptionImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: prescriptionImage }} style={styles.prescriptionImage} />
            <TouchableOpacity style={styles.changeImageButton} onPress={showImagePicker}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.changeImageText}>تغيير الصورة</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadButton} onPress={showImagePicker}>
            <Ionicons name="camera" size={48} color={colors.textSecondary} />
            <Text style={styles.uploadText}>اضغط لإضافة صورة الوصفة</Text>
            <Text style={styles.uploadSubtext}>كاميرا أو من الصور</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Patient Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات المريض</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>اسم المريض *</Text>
          <TextInput
            style={styles.textInput}
            value={patientName}
            onChangeText={setPatientName}
            placeholder="أدخل اسم المريض"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.inputLabel}>العمر</Text>
            <TextInput
              style={styles.textInput}
              value={patientAge}
              onChangeText={setPatientAge}
              placeholder="العمر"
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.inputLabel}>الجنس</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  patientGender === 'male' && styles.genderButtonActive
                ]}
                onPress={() => setPatientGender('male')}
              >
                <Text style={[
                  styles.genderText,
                  patientGender === 'male' && styles.genderTextActive
                ]}>ذكر</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  patientGender === 'female' && styles.genderButtonActive
                ]}
                onPress={() => setPatientGender('female')}
              >
                <Text style={[
                  styles.genderText,
                  patientGender === 'female' && styles.genderTextActive
                ]}>أنثى</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Delivery Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات التوصيل</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>عنوان التوصيل *</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="أدخل العنوان الكامل للتوصيل"
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>رقم هاتف التوصيل *</Text>
          <TextInput
            style={styles.textInput}
            value={deliveryPhone}
            onChangeText={setDeliveryPhone}
            placeholder="أدخل رقم الهاتف"
            keyboardType="phone-pad"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.deliveryFeeContainer}>
          <Text style={styles.deliveryFeeLabel}>رسوم التوصيل:</Text>
          <Text style={styles.deliveryFeeAmount}>
            {pharmacy.delivery_fee === 0 ? 'مجاني' : `${pharmacy.delivery_fee} درهم`}
          </Text>
        </View>
      </View>

      {/* Additional Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>خيارات إضافية</Text>
        
        <View style={styles.switchContainer}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchTitle}>طلب عاجل</Text>
            <Text style={styles.switchSubtitle}>سيتم إعطاء الأولوية لطلبك</Text>
          </View>
          <Switch
            value={urgentOrder}
            onValueChange={setUrgentOrder}
            trackColor={{ false: '#e0e0e0', true: colors.primary + '40' }}
            thumbColor={urgentOrder ? colors.primary : '#f4f3f4'}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ملاحظات إضافية</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={customerNotes}
            onChangeText={setCustomerNotes}
            placeholder="أي ملاحظات أو طلبات خاصة..."
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={submitOrder}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#fff" style={styles.submitIcon} />
            <Text style={styles.submitText}>إرسال الطلب</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 34,
  },
  pharmacyInfo: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  pharmacyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  pharmacyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  pharmacyLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  pharmacyPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
  },
  imageContainer: {
    position: 'relative',
  },
  prescriptionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  uploadButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
    textAlign: 'right',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  genderContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    overflow: 'hidden',
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderButtonActive: {
    backgroundColor: colors.primary,
  },
  genderText: {
    fontSize: 16,
    color: colors.text,
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  deliveryFeeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  deliveryFeeLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  deliveryFeeAmount: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 15,
  },
  switchInfo: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  switchSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 30,
  },
});
