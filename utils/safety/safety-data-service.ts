import { supabase } from '@/utils/supabase';
import { emergencyContactsService } from './emergency-contacts-service';
import { medicalCardService } from './medical-card-service';
import { emergencyIncidentService } from './emergency-incident-service';
import { safetySettingsService } from './safety-settings-service';
import { emergencyNumbersService } from './emergency-numbers-service';
import { tripSharingService } from './trip-sharing-service';

export interface SafetyDataSync {
  lastSyncTime: string;
  pendingSyncs: number;
  isOnline: boolean;
}

class SafetyDataService {
  private isOnline: boolean = true;
  private pendingOperations: Array<{ operation: string; data: any }> = [];

  /**
   * مزامنة جميع بيانات الأمان
   */
  async syncAllSafetyData(): Promise<SafetyDataSync> {
    try {
      const startTime = new Date().toISOString();
      
      // التحقق من الاتصال
      this.isOnline = await this.checkConnection();
      
      if (this.isOnline) {
        // تنفيذ العمليات المؤجلة
        await this.executePendingOperations();
        
        // مزامنة البيانات
        await Promise.all([
          this.syncEmergencyContacts(),
          this.syncMedicalCards(),
          this.syncSafetySettings(),
          this.syncTripShares()
        ]);
      }

      return {
        lastSyncTime: startTime,
        pendingSyncs: this.pendingOperations.length,
        isOnline: this.isOnline
      };
    } catch (error) {
      console.error('Error syncing safety data:', error);
      throw error;
    }
  }

  /**
   * مزامنة جهات الاتصال الطارئة
   */
  private async syncEmergencyContacts(): Promise<void> {
    try {
      // جلب البيانات من الخادم
      const serverContacts = await emergencyContactsService.getEmergencyContacts();
      
      // حفظ في التخزين المحلي للعمل بدون اتصال
      await this.saveToLocalStorage('emergency_contacts', serverContacts);
      
    } catch (error) {
      console.error('Error syncing emergency contacts:', error);
    }
  }

  /**
   * مزامنة البطاقات الطبية
   */
  private async syncMedicalCards(): Promise<void> {
    try {
      const medicalCard = await medicalCardService.getMedicalCard();
      await this.saveToLocalStorage('medical_card', medicalCard);
    } catch (error) {
      console.error('Error syncing medical cards:', error);
    }
  }

  /**
   * مزامنة إعدادات الأمان
   */
  private async syncSafetySettings(): Promise<void> {
    try {
      const settings = await safetySettingsService.getSafetySettings();
      await this.saveToLocalStorage('safety_settings', settings);
    } catch (error) {
      console.error('Error syncing safety settings:', error);
    }
  }

  /**
   * مزامنة مشاركة الرحلات
   */
  private async syncTripShares(): Promise<void> {
    try {
      const tripShares = await tripSharingService.getActiveTripShares();
      await this.saveToLocalStorage('trip_shares', tripShares);
    } catch (error) {
      console.error('Error syncing trip shares:', error);
    }
  }

  /**
   * تنفيذ العمليات المؤجلة
   */
  private async executePendingOperations(): Promise<void> {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('Error executing pending operation:', error);
        // إعادة إضافة العملية إلى القائمة المؤجلة
        this.pendingOperations.push(operation);
      }
    }
  }

  /**
   * تنفيذ عملية واحدة
   */
  private async executeOperation(operation: { operation: string; data: any }): Promise<void> {
    switch (operation.operation) {
      case 'addEmergencyContact':
        await emergencyContactsService.addEmergencyContact(operation.data);
        break;
      case 'updateEmergencyContact':
        await emergencyContactsService.updateEmergencyContact(operation.data.id, operation.data.updates);
        break;
      case 'deleteEmergencyContact':
        await emergencyContactsService.removeEmergencyContact(operation.data.id);
        break;
      case 'updateMedicalCard':
        await medicalCardService.saveMedicalCard(operation.data);
        break;
      case 'createIncident':
        await emergencyIncidentService.createIncident(operation.data);
        break;
      case 'updateSafetySettings':
        await safetySettingsService.updateSafetySettings(operation.data);
        break;
      default:
        console.warn('Unknown operation:', operation.operation);
    }
  }

  /**
   * إضافة عملية للقائمة المؤجلة
   */
  queueOperation(operation: string, data: any): void {
    this.pendingOperations.push({ operation, data });
  }

  /**
   * التحقق من الاتصال بالإنترنت
   */
  private async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * حفظ البيانات في التخزين المحلي
   */
  private async saveToLocalStorage(key: string, data: any): Promise<void> {
    try {
      // في React Native يمكن استخدام AsyncStorage
      // هنا نحفظ في memory للآن
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`safety_${key}`, JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  /**
   * جلب البيانات من التخزين المحلي
   */
  private async getFromLocalStorage(key: string): Promise<any> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = window.localStorage.getItem(`safety_${key}`);
        return data ? JSON.parse(data) : null;
      }
      return null;
    } catch (error) {
      console.error('Error getting from local storage:', error);
      return null;
    }
  }

  /**
   * جلب البيانات (من الخادم أو التخزين المحلي)
   */
  async getData(type: string): Promise<any> {
    try {
      if (this.isOnline) {
        // محاولة جلب من الخادم
        switch (type) {
          case 'emergency_contacts':
            return await emergencyContactsService.getEmergencyContacts();
          case 'medical_card':
            return await medicalCardService.getMedicalCard();
          case 'safety_settings':
            return await safetySettingsService.getSafetySettings();
          case 'trip_shares':
            return await tripSharingService.getActiveTripShares();
          case 'emergency_numbers':
            return await emergencyNumbersService.getActiveEmergencyNumbers();
          default:
            return null;
        }
      } else {
        // جلب من التخزين المحلي
        return await this.getFromLocalStorage(type);
      }
    } catch (error) {
      console.error(`Error getting ${type} data:`, error);
      // في حالة الخطأ، محاولة جلب من التخزين المحلي
      return await this.getFromLocalStorage(type);
    }
  }

  /**
   * حفظ البيانات (في الخادم أو القائمة المؤجلة)
   */
  async saveData(type: string, operation: string, data: any): Promise<boolean> {
    try {
      if (this.isOnline) {
        await this.executeOperation({ operation, data });
        return true;
      } else {
        this.queueOperation(operation, data);
        return false; // محفوظ محلياً فقط
      }
    } catch (error) {
      console.error(`Error saving ${type} data:`, error);
      this.queueOperation(operation, data);
      return false;
    }
  }

  /**
   * الحصول على حالة المزامنة
   */
  getSyncStatus(): SafetyDataSync {
    return {
      lastSyncTime: new Date().toISOString(),
      pendingSyncs: this.pendingOperations.length,
      isOnline: this.isOnline
    };
  }

  /**
   * تنظيف البيانات المؤقتة
   */
  clearCache(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = Object.keys(window.localStorage);
      keys.forEach(key => {
        if (key.startsWith('safety_')) {
          window.localStorage.removeItem(key);
        }
      });
    }
  }
}

export const safetyDataService = new SafetyDataService();
