import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OTPManager } from '../../components/auth/OTPManager';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';

export default function OTPLoginScreen() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // معالج نجاح التحقق
  const handleVerificationSuccess = async (phone: string) => {
    setIsLoading(true);
    
    try {
      // هنا يمكنك إما تسجيل الدخول مباشرة أو إنشاء حساب جديد
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phone,
        password: 'temp_password' // أو استخدم منطق آخر
      });

      if (error) {
        console.log('Login error:', error);
        // إذا لم يكن هناك حساب، أنشئ واحد جديد
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          phone: phone,
          password: 'temp_password'
        });

        if (signUpError) {
          Alert.alert(t('auth.error'), signUpError.message);
          return;
        }
      }

      Alert.alert(t('auth.success'), t('auth.loginSuccessful'));
      // Navigate to home screen
      
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert(t('auth.error'), t('auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  // معالج خطأ التحقق
  const handleVerificationError = (error: string) => {
    Alert.alert(t('auth.error'), error);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.loginWithPhone')}</Text>
        <Text style={styles.subtitle}>{t('auth.enterPhoneToReceiveOTP')}</Text>
      </View>

      <OTPManager
        onVerificationSuccess={handleVerificationSuccess}
        onVerificationError={handleVerificationError}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('auth.loggingIn')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
});
