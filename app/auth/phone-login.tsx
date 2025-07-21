import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Phone } from 'lucide-react-native';
import { otpService } from '@/utils/otp-service';
import OTPVerification from '@/components/auth/OTPVerification';

export default function PhoneLoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);

  // Check if the layout is RTL
  const isRTL = i18n.dir() === 'rtl';

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهاتف');
      return;
    }

    if (!otpService.isValidPhoneNumber(phone)) {
      Alert.alert('خطأ', 'رقم الهاتف غير صحيح');
      return;
    }

    try {
      setLoading(true);
      const result = await otpService.sendOTP(phone);
      
      if (result.success) {
        setShowOTP(true);
      } else {
        Alert.alert('خطأ', result.message);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = (user?: any) => {
    // تسجيل دخول ناجح
    router.replace('/');
  };

  const handleCancel = () => {
    setShowOTP(false);
    setPhone('');
  };

  if (showOTP) {
    return (
      <SafeAreaView style={styles.container}>
        <OTPVerification
          phone={phone}
          onVerificationSuccess={handleVerificationSuccess}
          onCancel={handleCancel}
          isRegistration={false}
        />
      </SafeAreaView>
    );
  }

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
              onPress={() => router.replace('/')}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>تسجيل الدخول</Text>
            <Text style={styles.subtitle}>
              أدخل رقم هاتفك لإرسال رمز التحقق
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder="رقم الهاتف"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>ليس لديك حساب؟</Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>إنشاء حساب جديد</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.alternativeLogin}>
            <Text style={styles.alternativeText}>أو</Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity style={styles.alternativeButton}>
                <Text style={styles.alternativeButtonText}>
                  تسجيل الدخول بكلمة المرور
                </Text>
              </TouchableOpacity>
            </Link>
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
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#F8F8F8',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  inputRTL: {
    textAlign: 'right',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  footerLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  alternativeLogin: {
    alignItems: 'center',
    marginTop: 20,
  },
  alternativeText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  alternativeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  alternativeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
