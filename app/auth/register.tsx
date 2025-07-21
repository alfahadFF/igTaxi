import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { parsePhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';
import * as Location from 'expo-location';

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>('JO');
  
  const isRTL = i18n.dir() === 'rtl';

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          const geocode = await Location.reverseGeocodeAsync(
            location.coords,
            { useGoogleMaps: false } // إجبار استخدام native geocoding
          );
          
          if (geocode[0]?.isoCountryCode) {
            setCountryCode(geocode[0].isoCountryCode as CountryCode);
          }
        } catch (error) {
          console.log('Geocoding error:', error);
          setCountryCode('JO'); // استخدام قيمة افتراضية في حالة الخطأ
        }
      }
    })();
  }, []);

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
    try {
      if (!name.trim()) {
        Alert.alert(t('auth.error'), t('auth.nameRequired'));
        return;
      }

      const formattedPhone = formatPhoneWithCountry(phone);
      if (!formattedPhone) {
        Alert.alert(t('auth.error'), t('auth.invalidPhone'));
        return;
      }

      if (!password.trim()) {
        Alert.alert(t('auth.error'), t('auth.passwordRequired'));
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t('auth.error'), t('auth.passwordMismatch'));
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        phone: formattedPhone,
        password, // استخدام كلمة المرور المدخلة من المستخدم
        options: {
          data: {
            full_name: name,
            type: 'personal'
          }
        }
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('No user data returned');
      }

      const { error: profileError } = await supabase
        .from('main_profiles')
        .insert({
          id: authData.user.id,
          full_name: name,
          phone: formattedPhone,
          email,
          type: 'personal'
        });

      if (profileError) throw profileError;

      router.push('/auth/verify-phone');

    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(t('auth.error'), error.message || t('auth.registrationError'));
    }
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
            <Text style={styles.title}>{t('auth.register')}</Text>
          </View>

          <View style={styles.formContainer}>
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
              <Lock size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('auth.password')}
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
                placeholder={t('auth.confirmPassword')}
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

            {/* Legal Links */}
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>
                بالتسجيل، أنت توافق على:
              </Text>
              <View style={styles.legalLinks}>
                <Link href="/legal/terms-of-service" asChild>
                  <TouchableOpacity>
                    <Text style={styles.legalLink}>شروط الخدمة</Text>
                  </TouchableOpacity>
                </Link>
                <Text style={styles.legalSeparator}> • </Text>
                <Link href="/legal/privacy-policy" asChild>
                  <TouchableOpacity>
                    <Text style={styles.legalLink}>سياسة الخصوصية</Text>
                  </TouchableOpacity>
                </Link>
                <Text style={styles.legalSeparator}> • </Text>
                <Link href="/legal/sms-consent" asChild>
                  <TouchableOpacity>
                    <Text style={styles.legalLink}>سياسة الرسائل النصية</Text>
                  </TouchableOpacity>
                </Link>
              </View>
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
    marginBottom: 30,
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
  formContainer: {
    flex: 1,
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
  legalContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  legalText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLink: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#F5B800',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
});