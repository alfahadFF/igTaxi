import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOTP } from '../../hooks/useOTP';
import Colors from '../../constants/Colors';

export default function SimpleOTPExample() {
  const { t } = useTranslation();
  const {
    phone,
    code,
    message,
    messageKey,
    isLoading,
    isCodeSent,
    setPhone,
    setCode,
    sendOTP,
    verifyCode,
    resendCode,
    reset,
    isErrorMessage
  } = useOTP();

  const handleVerify = async () => {
    const success = await verifyCode();
    if (success) {
      // التحقق نجح، يمكنك الآن تسجيل الدخول أو إكمال العملية
      console.log('OTP verified successfully for phone:', phone);
      // مثال: redirect أو update state
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.loginWithPhone')}</Text>

      {!isCodeSent ? (
        // مرحلة إدخال رقم الهاتف
        <View>
          <TextInput
            style={styles.input}
            placeholder={t('auth.phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={sendOTP}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('auth.pleaseWait') : t('auth.sendOTP')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // مرحلة التحقق من الكود
        <View>
          <Text style={styles.phoneDisplay}>{phone}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('auth.enterOTP')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? t('auth.pleaseWait') : t('auth.verify')}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={resendCode} disabled={isLoading}>
              <Text style={styles.linkText}>{t('auth.sendOTP')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} disabled={isLoading}>
              <Text style={styles.linkText}>{t('auth.back')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* عرض الرسائل */}
      {message ? (
        <View style={[
          styles.messageContainer,
          isErrorMessage() ? styles.errorMessage : styles.successMessage
        ]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: Colors.light.text,
  },
  phoneDisplay: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: Colors.light.tabIconDefault,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    backgroundColor: Colors.light.card,
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  linkText: {
    color: Colors.light.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 6,
    marginTop: 15,
  },
  successMessage: {
    backgroundColor: Colors.light.success + '20',
    borderColor: Colors.light.success,
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: Colors.light.error + '20',
    borderColor: Colors.light.error,
    borderWidth: 1,
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.light.text,
  },
});
