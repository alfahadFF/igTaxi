import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OTPManager } from '../../components/auth/OTPManager';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';

export default function VerifyPhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleVerificationSuccess = async (phone: string) => {
    try {
      // تحديث حالة التحقق من الهاتف في قاعدة البيانات
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from('main_profiles')
          .update({ phone_verified: true })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating phone verification:', error);
        }
      }

      // توجيه المستخدم إلى الصفحة الرئيسية
      router.replace('/');
    } catch (error) {
      console.error('Verification success handler error:', error);
    }
  };

  const handleVerificationError = (error: string) => {
    console.error('OTP Verification Error:', error);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.verify')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.enterPhoneToReceiveOTP')}
        </Text>
      </View>

      <OTPManager
        onVerificationSuccess={handleVerificationSuccess}
        onVerificationError={handleVerificationError}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 22,
  },
});
