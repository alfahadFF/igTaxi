import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Colors from '../../constants/Colors';

interface OTPManagerProps {
  onVerificationSuccess?: (phone: string) => void;
  onVerificationError?: (error: string) => void;
}

export const OTPManager: React.FC<OTPManagerProps> = ({
  onVerificationSuccess,
  onVerificationError
}) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKey, setMessageKey] = useState('');

  // دالة لتحديد نوع الرسالة
  const isErrorMessage = (): boolean => {
    const successMessages = [
      'otp.sent.sms', 
      'otp.sent.whatsapp', 
      'otp.sent.call', 
      'otp.verify.success'
    ];
    return !successMessages.includes(messageKey);
  };

  // دالة إرسال OTP
  const sendOTP = async () => {
    if (!phone.trim()) {
      const key = 'otp.error.missingPhone';
      setMessageKey(key);
      setMessage(t(key));
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageKey('');

    try {
      const response = await fetch('https://gemjqbxmfkclfgvscqbj.supabase.co/functions/v1/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phone.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        // قراءة messageKey من الاستجابة
        let key = '';
        if (data.messageKey) {
          key = data.messageKey;
        } else if (data.channel) {
          key = `otp.sent.${data.channel}`;
        } else {
          key = 'otp.sent.sms'; // افتراضي
        }
        setMessageKey(key);
        setMessage(t(key));
        setIsCodeSent(true);
      } else {
        // معالجة الأخطاء
        const key = data.error || 'otp.error.failedAllChannels';
        setMessageKey(key);
        setMessage(t(key));
        onVerificationError?.(t(key));
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      const key = 'otp.error.failedAllChannels';
      setMessageKey(key);
      setMessage(t(key));
      onVerificationError?.(t(key));
    } finally {
      setIsLoading(false);
    }
  };

  // دالة التحقق من OTP
  const verifyCode = async () => {
    if (!code.trim()) {
      const key = 'invalidOTP';
      setMessageKey(key);
      setMessage(t(key));
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageKey('');

    try {
      const response = await fetch('https://gemjqbxmfkclfgvscqbj.supabase.co/functions/v1/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone.trim(), 
          code: code.trim() 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // نجح التحقق
        const key = data.messageKey || 'otp.verify.success';
        setMessageKey(key);
        setMessage(t(key));
        onVerificationSuccess?.(phone);
      } else {
        // فشل التحقق
        const key = data.error || 'otp.verify.failed';
        setMessageKey(key);
        setMessage(t(key));
        onVerificationError?.(t(key));
      }
    } catch (error) {
      console.error('Verify Code Error:', error);
      const key = 'otp.verify.failed';
      setMessageKey(key);
      setMessage(t(key));
      onVerificationError?.(t(key));
    } finally {
      setIsLoading(false);
    }
  };

  // إعادة الإرسال
  const resendCode = () => {
    setCode('');
    setMessage('');
    setMessageKey('');
    sendOTP();
  };

  // إعادة تعيين
  const resetForm = () => {
    setPhone('');
    setCode('');
    setMessage('');
    setMessageKey('');
    setIsCodeSent(false);
  };

  return (
    <View style={styles.container}>
      {!isCodeSent ? (
        // مرحلة إدخال رقم الهاتف
        <View>
          <Text style={styles.title}>{t('auth.phone')}</Text>
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
          <Text style={styles.title}>{t('auth.enterOTP')}</Text>
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
            onPress={verifyCode}
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
            <TouchableOpacity onPress={resetForm} disabled={isLoading}>
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
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
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
    borderColor: Colors.light.tabIconDefault,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: Colors.light.tabIconDefault,
  },
  buttonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  linkText: {
    color: Colors.light.tint,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  successMessage: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
