import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Mail, Lock, User, PhoneCall, Eye, EyeOff, Car, FileText, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/utils/supabase'; // تصحيح المسار هنا
import { uploadDriverDocument } from '@/utils/storage';
import { parsePhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';
import * as Location from 'expo-location';

// Required field indicator component
const RequiredField = () => (
  <Text style={styles.requiredField}>*</Text>
);

export default function DriverRegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  // Personal Information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  
  // Vehicle Information
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [seatingCapacity, setSeatingCapacity] = useState('');
  
  // Account Information
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Documents
  const [drivingLicense, setDrivingLicense] = useState('');
  const [idCard, setIdCard] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  // Country code
  const [countryCode, setCountryCode] = useState<CountryCode>('JO');
  
  // Check if the layout is RTL
  const isRTL = i18n.dir() === 'rtl';

  // Add loading state
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const geocode = await Location.reverseGeocodeAsync(
            location.coords,
            { useGoogleMaps: false }
          );
          
          if (geocode[0]?.isoCountryCode) {
            setCountryCode(geocode[0].isoCountryCode as CountryCode);
          }
        } catch (error) {
          console.log('Geocoding error:', error);
          setCountryCode('JO');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const pickDocument = async (type: 'license' | 'id') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: false
      });

      if (result.type === 'success') {
        if (type === 'license') {
          setDrivingLicense(result.uri);
        } else {
          setIdCard(result.uri);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const formatPhoneWithCountry = (phoneNumber: string) => {
    try {
      if (!phoneNumber.startsWith('+')) {
        phoneNumber = `+${getCountryCallingCode(countryCode)}${phoneNumber}`;
      }
      const parsed = parsePhoneNumber(phoneNumber, countryCode);
      return parsed?.isValid() ? parsed.format('E.164') : null;
    } catch (error) {
      return null;
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password || !nationalId || !licenseNumber) {
      Alert.alert('خطأ', 'يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    try {
      setIsLoading(true);

      // تنسيق رقم الهاتف
      const phoneNumber = phone.startsWith('+') ? phone : `+962${phone.replace(/^0+/, '')}`;

      // 1. إنشاء المستخدم في Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        phone: phoneNumber,
        password: password,
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        throw new Error('فشل في إنشاء الحساب');
      }

      if (!authData.user?.id) {
        throw new Error('لم يتم إنشاء معرف المستخدم');
      }

      // 2. رفع الصور
      let profilePhotoUrl = null;
      let drivingLicenseUrl = null;
      let idCardUrl = null;

      try {
        if (profilePhoto) {
          profilePhotoUrl = await uploadDriverDocument(profilePhoto, 'profile', authData.user.id);
        }

        if (drivingLicense) {
          drivingLicenseUrl = await uploadDriverDocument(drivingLicense, 'license', authData.user.id);
        }

        if (idCard) {
          idCardUrl = await uploadDriverDocument(idCard, 'id_card', authData.user.id);
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('فشل في رفع الملفات، يرجى المحاولة مرة أخرى');
      }

      // 3. إنشاء الملف الشخصي
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: name,
            phone: phoneNumber,
            email: email || null,
            type: 'driver',
          }
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw new Error('فشل في إنشاء الملف الشخصي');
      }

      // 4. إنشاء ملف السائق
      const driverProfile = {
        id: authData.user.id,
        profile_photo_url: profilePhotoUrl || null,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
        vehicle_color: vehicleColor || null,
        plate_number: plateNumber || null,
        fuel_type: fuelType || null,
        seating_capacity: seatingCapacity ? parseInt(seatingCapacity) : null,
        driving_license_url: drivingLicenseUrl || null,
        id_card_url: idCardUrl || null,
        national_id: nationalId || null,
        license_number: licenseNumber || null
      };

      const { data: driverData, error: driverError } = await supabase
        .from('driver_profiles')
        .insert([driverProfile])
        .select();

      if (driverError) {
        console.error('Driver profile creation error:', driverError);
        if (driverError.code === '23502') { // Not null violation
          throw new Error('بعض الحقول المطلوبة غير موجودة');
        } else if (driverError.code === '23505') { // Unique violation
          throw new Error('رقم الهوية أو رخصة القيادة مستخدم مسبقاً');
        } else {
          throw new Error(`فشل في إنشاء ملف السائق: ${driverError.message}`);
        }
      }

      if (!driverData || driverData.length === 0) {
        throw new Error('فشل في إنشاء ملف السائق: لم يتم إرجاع أي بيانات');
      }

      Alert.alert(
        'تم التسجيل بنجاح',
        'سيتم مراجعة طلبك وسنتواصل معك قريباً',
        [
          {
            text: 'حسناً',
            onPress: () => router.replace('/auth/login')
          }
        ]
      );

    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        'خطأ',
        error instanceof Error ? error.message : 'حدث خطأ أثناء التسجيل'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fuelTypes = [
    { id: 'petrol', nameKey: 'auth.driverRegistration.fuelTypes.petrol' },
    { id: 'diesel', nameKey: 'auth.driverRegistration.fuelTypes.diesel' },
    { id: 'electric', nameKey: 'auth.driverRegistration.fuelTypes.electric' },
    { id: 'hybrid', nameKey: 'auth.driverRegistration.fuelTypes.hybrid' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>{t('auth.becomeDriver')}</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{t('auth.driverRegistration.personalInfo')}</Text>
            
            {/* Profile Photo */}
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={40} color="#999" />
                  <Text style={styles.photoText}>
                    {t('auth.driverRegistration.uploadPhoto')} <RequiredField />
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <User size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.name')} *`}
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('auth.email')}
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <PhoneCall size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.phone')} *`}
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <FileText size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.nationalId')} *`}
                placeholderTextColor="#999"
                value={nationalId}
                onChangeText={setNationalId}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <FileText size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.licenseNumber')} *`}
                placeholderTextColor="#999"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <Text style={styles.sectionTitle}>{t('auth.driverRegistration.vehicleInfo')}</Text>
            
            <View style={styles.inputContainer}>
              <Car size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.vehicleMake')} *`}
                placeholderTextColor="#999"
                value={vehicleMake}
                onChangeText={setVehicleMake}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Car size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.vehicleModel')} *`}
                placeholderTextColor="#999"
                value={vehicleModel}
                onChangeText={setVehicleModel}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <FileText size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.vehicleYear')} *`}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={vehicleYear}
                onChangeText={setVehicleYear}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <FileText size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.vehicleColor')} *`}
                placeholderTextColor="#999"
                value={vehicleColor}
                onChangeText={setVehicleColor}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <FileText size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.plateNumber')} *`}
                placeholderTextColor="#999"
                value={plateNumber}
                onChangeText={setPlateNumber}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.fuelTypeContainer}>
              <Text style={styles.fuelTypeLabel}>
                {t('auth.driverRegistration.fuelType')} <RequiredField />
              </Text>
              {fuelTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.fuelTypeButton,
                    fuelType === type.id && styles.selectedFuelType
                  ]}
                  onPress={() => setFuelType(type.id)}
                >
                  <Text
                    style={[
                      styles.fuelTypeText,
                      fuelType === type.id && styles.selectedFuelTypeText
                    ]}
                  >
                    {t(type.nameKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.driverRegistration.seatingCapacity')} *`}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={seatingCapacity}
                onChangeText={setSeatingCapacity}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <Text style={styles.sectionTitle}>{t('auth.driverRegistration.accountInfo')}</Text>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.password')} *`}
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#999" />
                ) : (
                  <Eye size={20} color="#999" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.confirmPassword')} *`}
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                textAlign={isRTL ? 'right' : 'left'}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#999" />
                ) : (
                  <Eye size={20} color="#999" />
                )}
              </TouchableOpacity>
            </View>

            {/* حقل رخصة القيادة */}
            <TouchableOpacity 
              style={styles.documentButton} 
              onPress={() => pickDocument('license')}
            >
              <FileText size={24} color="#666" />
              <Text style={styles.documentButtonText}>
                {drivingLicense 
                  ? t('auth.driverRegistration.documentUploaded')
                  : t('auth.driverRegistration.uploadDrivingLicense')}
                <RequiredField />
              </Text>
            </TouchableOpacity>

            {/* حقل الهوية */}
            <TouchableOpacity 
              style={styles.documentButton} 
              onPress={() => pickDocument('id')}
            >
              <FileText size={24} color="#666" />
              <Text style={styles.documentButtonText}>
                {idCard 
                  ? t('auth.driverRegistration.documentUploaded')
                  : t('auth.driverRegistration.uploadIdCard')}
                <RequiredField />
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? t('auth.registering') : t('auth.register')}
              </Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>
                {t('auth.alreadyHaveAccount')}
              </Text>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>
                    {t('auth.loginNow')}
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginVertical: 16,
  },
  formContainer: {
    flex: 1,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 15,
    height: 56,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  inputRTL: {
    textAlign: 'right',
  },
  eyeIcon: {
    padding: 8,
  },
  fuelTypeContainer: {
    marginBottom: 16,
  },
  fuelTypeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 8,
  },
  fuelTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
    display: 'inline-flex',
  },
  selectedFuelType: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  fuelTypeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  selectedFuelTypeText: {
    color: '#fff',
  },
  registerButton: {
    backgroundColor: '#F5B800',
    borderRadius: 10,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
    flexWrap: 'wrap',
  },
  loginText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  loginLink: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#F5B800',
  },
  requiredField: {
    color: '#e74c3c',
    fontSize: 14,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  documentButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  }
});