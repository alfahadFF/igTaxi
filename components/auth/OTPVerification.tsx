import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { otpService } from '@/utils/otp-service';

interface OTPVerificationProps {
  phone: string;
  onVerificationSuccess: (user?: any) => void;
  onCancel: () => void;
  isRegistration?: boolean;
  userData?: {
    name: string;
    type?: 'personal' | 'driver' | 'business';
  };
}

export default function OTPVerification({
  phone,
  onVerificationSuccess,
  onCancel,
  isRegistration = false,
  userData,
}: OTPVerificationProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // بدء العد التنازلي
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // إرسال رمز OTP عند تحميل المكون
  useEffect(() => {
    sendOTP();
  }, []);

  const sendOTP = async () => {
    try {
      setResendLoading(true);
      
      let result;
      if (isRegistration && userData) {
        result = await otpService.sendRegistrationOTP(phone, userData);
      } else {
        result = await otpService.sendOTP(phone);
      }

      if (result.success) {
        setCountdown(60);
        setCanResend(false);
        Alert.alert('نجح', result.message);
      } else {
        Alert.alert('خطأ', result.message);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال رمز التحقق');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // الانتقال إلى الحقل التالي
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // التحقق التلقائي عند إدخال 6 أرقام
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // الرجوع للحقل السابق عند الضغط على Backspace
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (otpCode?: string) => {
    const codeToVerify = otpCode || code.join('');
    
    if (codeToVerify.length !== 6) {
      Alert.alert('خطأ', 'يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    try {
      setLoading(true);

      let result;
      if (isRegistration) {
        result = await otpService.verifyRegistrationOTP(phone, codeToVerify);
      } else {
        result = await otpService.verifyOTP(phone, codeToVerify);
      }

      if (result.success && result.valid) {
        Alert.alert('نجح', result.message, [
          {
            text: 'موافق',
            onPress: () => onVerificationSuccess(result.user),
          },
        ]);
      } else {
        Alert.alert('خطأ', result.message);
        // مسح الحقول عند فشل التحقق
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل في التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!canResend) return;
    await sendOTP();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>التحقق من رقم الهاتف</Text>
        <Text style={styles.subtitle}>
          أدخل رمز التحقق المرسل إلى{'\n'}
          <Text style={styles.phoneNumber}>{phone}</Text>
        </Text>
      </View>

      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.codeInput,
              digit ? styles.codeInputFilled : styles.codeInputEmpty,
            ]}
            value={digit}
            onChangeText={(value) => handleCodeChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
        onPress={() => verifyCode()}
        disabled={loading || code.some(digit => !digit)}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>تحقق من الرمز</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        {canResend ? (
          <TouchableOpacity onPress={resendOTP} disabled={resendLoading}>
            <Text style={styles.resendText}>
              {resendLoading ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.countdownText}>
            إعادة الإرسال خلال {countdown} ثانية
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>إلغاء</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
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
  phoneNumber: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  codeInputEmpty: {
    borderColor: '#E1E1E1',
    backgroundColor: '#F8F8F8',
  },
  codeInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  countdownText: {
    color: '#666',
    fontSize: 16,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
