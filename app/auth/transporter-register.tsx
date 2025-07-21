import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Truck, FileText, Camera, Ruler, Package, DoorClosed } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

const RequiredField = () => (
  <Text style={styles.requiredField}>*</Text>
);

export default function TransporterRegisterScreen() {
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
  const [vehicleLength, setVehicleLength] = useState('');
  const [cargoCapacity, setCargoCapacity] = useState('');
  const [isEnclosed, setIsEnclosed] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  
  // Account Information
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const isRTL = i18n.dir() === 'rtl';

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

  const handleRegister = () => {
    console.log('Transporter Register pressed with:', { 
      name, 
      email, 
      phone,
      profilePhoto,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleLength,
      cargoCapacity,
      isEnclosed,
      plateNumber,
      password 
    });
    router.push('/');
  };

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
            <Text style={styles.title}>{t('home.registerOptions.transporter')}</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{t('auth.driverRegistration.personalInfo')}</Text>
            
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
              <Phone size={20} color="#999" style={styles.inputIcon} />
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
            
            <Text style={styles.sectionTitle}>{t('auth.driverRegistration.vehicleInfo')}</Text>
            
            <View style={styles.inputContainer}>
              <Truck size={20} color="#999" style={styles.inputIcon} />
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
              <Truck size={20} color="#999" style={styles.inputIcon} />
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
              <Ruler size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.transporterRegistration.vehicleLength')} *`}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={vehicleLength}
                onChangeText={setVehicleLength}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <View style={styles.inputContainer}>
              <Package size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.transporterRegistration.cargoCapacity')} *`}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={cargoCapacity}
                onChangeText={setCargoCapacity}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.enclosedButton, isEnclosed && styles.enclosedButtonActive]}
              onPress={() => setIsEnclosed(!isEnclosed)}
            >
              <DoorClosed size={20} color={isEnclosed ? "#fff" : "#999"} />
              <Text style={[styles.enclosedButtonText, isEnclosed && styles.enclosedButtonTextActive]}>
                {t('auth.transporterRegistration.isEnclosed')}
              </Text>
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
            >
              <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
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
  enclosedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  enclosedButtonActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  enclosedButtonText: {
    marginLeft: 10,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#666',
  },
  enclosedButtonTextActive: {
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
});