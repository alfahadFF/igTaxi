import { supabase } from '@/utils/supabase';

export interface OTPResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface VerifyOTPResponse extends OTPResponse {
  valid: boolean;
  user?: any;
}

class OTPService {
  private readonly supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  private readonly supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  /**
   * إرسال رمز OTP إلى رقم الهاتف
   */
  async sendOTP(phone: string, channel: 'sms' | 'call' = 'sms'): Promise<OTPResponse> {
    try {
      // تنسيق رقم الهاتف
      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!formattedPhone) {
        return {
          success: false,
          message: 'رقم الهاتف غير صحيح'
        };
      }

      // استدعاء Edge Function لإرسال OTP
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          phone: formattedPhone,
          channel
        }
      });

      if (error) {
        console.error('Error sending OTP:', error);
        return {
          success: false,
          message: 'فشل في إرسال رمز التحقق',
          error: error.message
        };
      }

      return {
        success: true,
        message: data?.message || 'تم إرسال رمز التحقق بنجاح'
      };

    } catch (error) {
      console.error('OTP send error:', error);
      return {
        success: false,
        message: 'حدث خطأ غير متوقع',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * التحقق من رمز OTP
   */
  async verifyOTP(phone: string, code: string): Promise<VerifyOTPResponse> {
    try {
      // تنسيق رقم الهاتف
      const formattedPhone = this.formatPhoneNumber(phone);
      
      if (!formattedPhone) {
        return {
          success: false,
          valid: false,
          message: 'رقم الهاتف غير صحيح'
        };
      }

      if (!code || code.length !== 6) {
        return {
          success: false,
          valid: false,
          message: 'رمز التحقق يجب أن يكون 6 أرقام'
        };
      }

      // استدعاء Edge Function للتحقق من OTP
      const { data, error } = await supabase.functions.invoke('verify-code', {
        body: {
          phone: formattedPhone,
          code
        }
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        return {
          success: false,
          valid: false,
          message: 'فشل في التحقق من الرمز',
          error: error.message
        };
      }

      // إذا كان التحقق ناجحاً، قم بتحديث حالة المصادقة
      if (data?.status === 'approved') {
        // يمكن إضافة منطق إضافي هنا مثل إنشاء جلسة
        return {
          success: true,
          valid: true,
          message: 'تم التحقق من رقم الهاتف بنجاح',
          user: data.user
        };
      }

      return {
        success: false,
        valid: false,
        message: 'رمز التحقق غير صحيح'
      };

    } catch (error) {
      console.error('OTP verify error:', error);
      return {
        success: false,
        valid: false,
        message: 'حدث خطأ غير متوقع',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * إرسال OTP للتسجيل الجديد
   */
  async sendRegistrationOTP(phone: string, userData: {
    name: string;
    type?: 'personal' | 'driver' | 'business';
  }): Promise<OTPResponse> {
    try {
      const result = await this.sendOTP(phone);
      
      if (result.success) {
        // حفظ بيانات المستخدم مؤقتاً في localStorage للاستخدام عند التحقق
        const tempUserData = {
          phone: this.formatPhoneNumber(phone),
          ...userData,
          timestamp: Date.now()
        };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('tempRegistrationData', JSON.stringify(tempUserData));
        }
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'فشل في بدء عملية التسجيل'
      };
    }
  }

  /**
   * التحقق من OTP وإتمام التسجيل
   */
  async verifyRegistrationOTP(phone: string, code: string): Promise<VerifyOTPResponse> {
    try {
      const verifyResult = await this.verifyOTP(phone, code);
      
      if (verifyResult.success && verifyResult.valid) {
        // استرجاع بيانات التسجيل المؤقتة
        let tempData = null;
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('tempRegistrationData');
          if (stored) {
            tempData = JSON.parse(stored);
            localStorage.removeItem('tempRegistrationData');
          }
        }

        if (tempData) {
          // إنشاء المستخدم في قاعدة البيانات
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            phone: tempData.phone,
            password: 'temp_password_' + Date.now(), // كلمة مرور مؤقتة
            options: {
              data: {
                full_name: tempData.name,
                type: tempData.type || 'personal',
                phone_verified: true
              }
            }
          });

          if (signUpError) {
            console.error('SignUp error:', signUpError);
            return {
              success: false,
              valid: false,
              message: 'فشل في إنشاء الحساب'
            };
          }

          return {
            success: true,
            valid: true,
            message: 'تم إنشاء الحساب بنجاح',
            user: authData.user
          };
        }
      }
      
      return verifyResult;
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: 'فشل في إتمام التسجيل'
      };
    }
  }

  /**
   * تنسيق رقم الهاتف
   */
  private formatPhoneNumber(phone: string): string | null {
    try {
      // إزالة المسافات والرموز الإضافية
      let cleaned = phone.replace(/\D/g, '');
      
      // إضافة رمز البلد إذا لم يكن موجوداً
      if (!phone.startsWith('+')) {
        // افتراض رمز الأردن إذا بدأ بـ 07
        if (cleaned.startsWith('07')) {
          cleaned = '962' + cleaned.substring(1);
        }
        // افتراض رمز الإمارات إذا بدأ بـ 05
        else if (cleaned.startsWith('05')) {
          cleaned = '971' + cleaned.substring(1);
        }
        // إضافة + في البداية
        cleaned = '+' + cleaned;
      } else {
        cleaned = phone;
      }

      // التحقق من طول الرقم (يجب أن يكون بين 10-15 رقم)
      const digitsOnly = cleaned.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return null;
      }

      return cleaned;
    } catch {
      return null;
    }
  }

  /**
   * التحقق من صحة رقم الهاتف
   */
  isValidPhoneNumber(phone: string): boolean {
    return this.formatPhoneNumber(phone) !== null;
  }
}

export const otpService = new OTPService();
