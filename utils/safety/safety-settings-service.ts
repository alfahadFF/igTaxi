import { supabase } from '@/utils/supabase';

export interface SafetySettings {
  id: string;
  user_id: string;
  auto_emergency_calling: boolean;
  emergency_countdown_duration: number; // بالثواني
  share_location_in_emergency: boolean;
  allow_driver_medical_access: boolean;
  emergency_contact_notifications: boolean;
  trip_sharing_auto_start: boolean;
  panic_button_enabled: boolean;
  voice_activation_enabled: boolean;
  emergency_services_auto_call: boolean;
  medical_card_emergency_visibility: boolean;
  notification_sound_enabled: boolean;
  vibration_enabled: boolean;
  created_at: string;
  updated_at: string;
}

class SafetySettingsService {
  /**
   * جلب إعدادات الأمان للمستخدم الحالي
   */
  async getSafetySettings(): Promise<SafetySettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('safety_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching safety settings:', error);
      throw error;
    }
  }

  /**
   * تحديث إعدادات الأمان
   */
  async updateSafetySettings(settings: Partial<Omit<SafetySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<SafetySettings> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // التحقق من وجود إعدادات موجودة
      const existingSettings = await this.getSafetySettings();

      if (existingSettings) {
        // تحديث الإعدادات الموجودة
        const { data, error } = await supabase
          .from('safety_settings')
          .update(settings)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // إنشاء إعدادات جديدة مع القيم الافتراضية
        const defaultSettings = this.getDefaultSettings();
        const newSettings = { ...defaultSettings, ...settings };

        const { data, error } = await supabase
          .from('safety_settings')
          .insert({
            user_id: user.id,
            ...newSettings,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating safety settings:', error);
      throw error;
    }
  }

  /**
   * إعادة تعيين الإعدادات للقيم الافتراضية
   */
  async resetToDefaults(): Promise<SafetySettings> {
    try {
      const defaultSettings = this.getDefaultSettings();
      return await this.updateSafetySettings(defaultSettings);
    } catch (error) {
      console.error('Error resetting safety settings:', error);
      throw error;
    }
  }

  /**
   * تحديث إعداد واحد فقط
   */
  async updateSingleSetting<K extends keyof Omit<SafetySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>(
    key: K,
    value: SafetySettings[K]
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('safety_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * الحصول على الإعدادات الافتراضية
   */
  private getDefaultSettings(): Omit<SafetySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    return {
      auto_emergency_calling: true,
      emergency_countdown_duration: 10, // 10 ثوان
      share_location_in_emergency: true,
      allow_driver_medical_access: true,
      emergency_contact_notifications: true,
      trip_sharing_auto_start: false,
      panic_button_enabled: true,
      voice_activation_enabled: false,
      emergency_services_auto_call: false, // يحتاج موافقة المستخدم
      medical_card_emergency_visibility: true,
      notification_sound_enabled: true,
      vibration_enabled: true,
    };
  }

  /**
   * التحقق من تمكين ميزة معينة
   */
  async isFeatureEnabled(feature: keyof Omit<SafetySettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const settings = await this.getSafetySettings();
      if (!settings) {
        const defaultSettings = this.getDefaultSettings();
        return defaultSettings[feature] as boolean;
      }
      return settings[feature] as boolean;
    } catch (error) {
      console.error(`Error checking feature ${feature}:`, error);
      return false;
    }
  }

  /**
   * الحصول على مدة العد التنازلي للطوارئ
   */
  async getEmergencyCountdownDuration(): Promise<number> {
    try {
      const settings = await this.getSafetySettings();
      return settings?.emergency_countdown_duration || 10;
    } catch (error) {
      console.error('Error getting countdown duration:', error);
      return 10; // القيمة الافتراضية
    }
  }

  /**
   * تحديث مدة العد التنازلي للطوارئ
   */
  async updateEmergencyCountdownDuration(duration: number): Promise<void> {
    try {
      if (duration < 3 || duration > 60) {
        throw new Error('Countdown duration must be between 3 and 60 seconds');
      }

      await this.updateSingleSetting('emergency_countdown_duration', duration);
    } catch (error) {
      console.error('Error updating countdown duration:', error);
      throw error;
    }
  }

  /**
   * تمكين/تعطيل الوصول للبطاقة الطبية في حالات الطوارئ
   */
  async toggleMedicalCardEmergencyAccess(enabled: boolean): Promise<void> {
    try {
      await this.updateSingleSetting('medical_card_emergency_visibility', enabled);
    } catch (error) {
      console.error('Error toggling medical card access:', error);
      throw error;
    }
  }

  /**
   * تمكين/تعطيل وصول السائق للبطاقة الطبية
   */
  async toggleDriverMedicalAccess(enabled: boolean): Promise<void> {
    try {
      await this.updateSingleSetting('allow_driver_medical_access', enabled);
    } catch (error) {
      console.error('Error toggling driver medical access:', error);
      throw error;
    }
  }

  /**
   * تمكين/تعطيل الاتصال التلقائي بالطوارئ
   */
  async toggleAutoEmergencyCalling(enabled: boolean): Promise<void> {
    try {
      await this.updateSingleSetting('auto_emergency_calling', enabled);
    } catch (error) {
      console.error('Error toggling auto emergency calling:', error);
      throw error;
    }
  }
}

export const safetySettingsService = new SafetySettingsService();
