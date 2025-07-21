import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OTPState {
  isLoading: boolean;
  message: string;
  messageKey: string;
  isCodeSent: boolean;
  phone: string;
  code: string;
}

interface OTPActions {
  setPhone: (phone: string) => void;
  setCode: (code: string) => void;
  sendOTP: () => Promise<void>;
  verifyCode: () => Promise<boolean>;
  resendCode: () => Promise<void>;
  reset: () => void;
  setMessage: (message: string) => void;
  isErrorMessage: () => boolean;
}

const SUPABASE_FUNCTIONS_URL = 'https://gemjqbxmfkclfgvscqbj.supabase.co/functions/v1';

export const useOTP = (): OTPState & OTPActions => {
  const { t } = useTranslation();
  const [state, setState] = useState<OTPState>({
    isLoading: false,
    message: '',
    messageKey: '',
    isCodeSent: false,
    phone: '',
    code: '',
  });

  const setPhone = (phone: string) => {
    setState(prev => ({ ...prev, phone }));
  };

  const setCode = (code: string) => {
    setState(prev => ({ ...prev, code }));
  };

  const setMessage = (message: string) => {
    setState(prev => ({ ...prev, message }));
  };

  const sendOTP = async (): Promise<void> => {
    if (!state.phone.trim()) {
      const key = 'otp.error.missingPhone';
      setState(prev => ({ 
        ...prev, 
        messageKey: key,
        message: t(key) 
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, message: '' }));

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: state.phone.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        // قراءة messageKey من الاستجابة وترجمتها
        let key = '';
        if (data.messageKey) {
          key = data.messageKey;
        } else if (data.channel) {
          key = `otp.sent.${data.channel}`;
        } else {
          key = 'otp.sent.sms'; // افتراضي
        }

        setState(prev => ({
          ...prev,
          messageKey: key,
          message: t(key),
          isCodeSent: true,
          isLoading: false
        }));
      } else {
        const key = data.error || 'otp.error.failedAllChannels';
        setState(prev => ({
          ...prev,
          messageKey: key,
          message: t(key),
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      const key = 'otp.error.failedAllChannels';
      setState(prev => ({
        ...prev,
        messageKey: key,
        message: t(key),
        isLoading: false
      }));
    }
  };

  const verifyCode = async (): Promise<boolean> => {
    if (!state.code.trim()) {
      const key = 'invalidOTP';
      setState(prev => ({ 
        ...prev, 
        messageKey: key,
        message: t(key) 
      }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, message: '' }));

    try {
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: state.phone.trim(), 
          code: state.code.trim() 
        })
      });

      const data = await response.json();

      if (response.ok) {
        const key = data.messageKey || 'otp.verify.success';
        setState(prev => ({
          ...prev,
          messageKey: key,
          message: t(key),
          isLoading: false
        }));
        return true;
      } else {
        const key = data.error || 'otp.verify.failed';
        setState(prev => ({
          ...prev,
          messageKey: key,
          message: t(key),
          isLoading: false
        }));
        return false;
      }
    } catch (error) {
      console.error('Verify Code Error:', error);
      const key = 'otp.verify.failed';
      setState(prev => ({
        ...prev,
        messageKey: key,
        message: t(key),
        isLoading: false
      }));
      return false;
    }
  };

  const resendCode = async (): Promise<void> => {
    setState(prev => ({ ...prev, code: '', message: '', messageKey: '' }));
    await sendOTP();
  };

  const reset = () => {
    setState({
      isLoading: false,
      message: '',
      messageKey: '',
      isCodeSent: false,
      phone: '',
      code: '',
    });
  };

  const isErrorMessage = (): boolean => {
    const successMessages = [
      'otp.sent.sms',
      'otp.sent.whatsapp',
      'otp.sent.call',
      'otp.verify.success'
    ];
    return !successMessages.includes(state.messageKey);
  };

  return {
    ...state,
    setPhone,
    setCode,
    sendOTP,
    verifyCode,
    resendCode,
    reset,
    setMessage,
    isErrorMessage,
  };
};
