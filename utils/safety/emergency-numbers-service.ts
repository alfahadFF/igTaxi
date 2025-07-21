import { supabase } from '@/utils/supabase';

// أرقام الطوارئ حسب الدولة
export interface EmergencyNumbers {
  country: string;
  countryCode: string;
  police: string;
  ambulance: string;
  fire: string;
  generalEmergency?: string;
}

// أرقام الطوارئ لبعض الدول العربية (يمكن التوسع)
export const EMERGENCY_NUMBERS_BY_COUNTRY: Record<string, EmergencyNumbers> = {
  SA: { // السعودية
    country: 'المملكة العربية السعودية',
    countryCode: 'SA',
    police: '999',
    ambulance: '997',
    fire: '998',
    generalEmergency: '911'
  },
  AE: { // الإمارات
    country: 'دولة الإمارات العربية المتحدة',
    countryCode: 'AE',
    police: '999',
    ambulance: '998',
    fire: '997',
    generalEmergency: '911'
  },
  EG: { // مصر
    country: 'جمهورية مصر العربية',
    countryCode: 'EG',
    police: '122',
    ambulance: '123',
    fire: '180',
    generalEmergency: '122'
  },
  JO: { // الأردن
    country: 'المملكة الأردنية الهاشمية',
    countryCode: 'JO',
    police: '911',
    ambulance: '911',
    fire: '911',
    generalEmergency: '911'
  },
  KW: { // الكويت
    country: 'دولة الكويت',
    countryCode: 'KW',
    police: '112',
    ambulance: '112',
    fire: '112',
    generalEmergency: '112'
  },
  QA: { // قطر
    country: 'دولة قطر',
    countryCode: 'QA',
    police: '999',
    ambulance: '999',
    fire: '999',
    generalEmergency: '999'
  },
  BH: { // البحرين
    country: 'مملكة البحرين',
    countryCode: 'BH',
    police: '999',
    ambulance: '999',
    fire: '999',
    generalEmergency: '999'
  },
  OM: { // عمان
    country: 'سلطنة عمان',
    countryCode: 'OM',
    police: '9999',
    ambulance: '9999',
    fire: '9999',
    generalEmergency: '9999'
  },
  LB: { // لبنان
    country: 'الجمهورية اللبنانية',
    countryCode: 'LB',
    police: '112',
    ambulance: '140',
    fire: '175',
    generalEmergency: '112'
  },
  IQ: { // العراق
    country: 'جمهورية العراق',
    countryCode: 'IQ',
    police: '104',
    ambulance: '115',
    fire: '115',
    generalEmergency: '104'
  }
};

export interface AppEmergencySettings {
  id: string;
  country_code: string;
  police_number: string;
  ambulance_number: string;
  fire_number: string;
  general_emergency_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class EmergencyNumbersService {
  /**
   * جلب إعدادات أرقام الطوارئ المفعلة للتطبيق
   */
  async getActiveEmergencyNumbers(): Promise<EmergencyNumbers | null> {
    try {
      const { data, error } = await supabase
        .from('app_emergency_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        return {
          country: this.getCountryName(data.country_code),
          countryCode: data.country_code,
          police: data.police_number,
          ambulance: data.ambulance_number,
          fire: data.fire_number,
          generalEmergency: data.general_emergency_number
        };
      }

      // إرجاع القيم الافتراضية إذا لم توجد إعدادات
      return EMERGENCY_NUMBERS_BY_COUNTRY.SA; // السعودية كقيمة افتراضية
    } catch (error) {
      console.error('Error fetching emergency numbers:', error);
      return EMERGENCY_NUMBERS_BY_COUNTRY.SA; // السعودية كقيمة افتراضية في حالة الخطأ
    }
  }

  /**
   * تحديث أرقام الطوارئ للتطبيق (للمطورين/المديرين فقط)
   */
  async updateEmergencyNumbers(countryCode: string): Promise<boolean> {
    try {
      const emergencyNumbers = EMERGENCY_NUMBERS_BY_COUNTRY[countryCode];
      if (!emergencyNumbers) {
        throw new Error(`Emergency numbers not found for country: ${countryCode}`);
      }

      // إلغاء تفعيل الإعدادات الحالية
      await supabase
        .from('app_emergency_settings')
        .update({ is_active: false })
        .eq('is_active', true);

      // إدراج الإعدادات الجديدة
      const { error } = await supabase
        .from('app_emergency_settings')
        .insert({
          country_code: countryCode,
          police_number: emergencyNumbers.police,
          ambulance_number: emergencyNumbers.ambulance,
          fire_number: emergencyNumbers.fire,
          general_emergency_number: emergencyNumbers.generalEmergency,
          is_active: true
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating emergency numbers:', error);
      return false;
    }
  }

  /**
   * الحصول على اسم الدولة بالعربية
   */
  private getCountryName(countryCode: string): string {
    return EMERGENCY_NUMBERS_BY_COUNTRY[countryCode]?.country || 'غير محدد';
  }

  /**
   * الحصول على جميع الدول المتاحة
   */
  getAvailableCountries(): EmergencyNumbers[] {
    return Object.values(EMERGENCY_NUMBERS_BY_COUNTRY);
  }

  /**
   * الحصول على رقم الطوارئ المناسب حسب نوع الحالة
   */
  async getEmergencyNumberByType(type: 'police' | 'ambulance' | 'fire' | 'general'): Promise<string> {
    const numbers = await this.getActiveEmergencyNumbers();
    if (!numbers) return '911'; // رقم عام كافتراضي

    switch (type) {
      case 'police':
        return numbers.police;
      case 'ambulance':
        return numbers.ambulance;
      case 'fire':
        return numbers.fire;
      case 'general':
        return numbers.generalEmergency || numbers.police;
      default:
        return numbers.generalEmergency || numbers.police;
    }
  }
}

export const emergencyNumbersService = new EmergencyNumbersService();
