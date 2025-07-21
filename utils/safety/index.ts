// خدمات الأمان - نظام شامل لإدارة حالات الطوارئ والأمان
export { emergencyContactsService } from './emergency-contacts-service';
export { medicalCardService } from './medical-card-service';
export { emergencyIncidentService, tripSharingService } from './emergency-incident-service';
export { safetySettingsService } from './safety-settings-service';

// استيراد الخدمات للاستخدام الداخلي
import { emergencyContactsService } from './emergency-contacts-service';
import { medicalCardService } from './medical-card-service';
import { emergencyIncidentService, tripSharingService } from './emergency-incident-service';
import { safetySettingsService } from './safety-settings-service';

// أنواع البيانات المشتركة
export type {
  DatabaseMedicalCard,
  DatabaseMedicalCondition,
  DatabaseMedication,
  DatabaseAllergy,
} from './medical-card-service';

export type {
  EmergencyIncident,
  EmergencyNotification,
  TripShare,
  TripShareRecipient,
  TripLocationHistory,
} from './emergency-incident-service';

export type {
  SafetySettings,
} from './safety-settings-service';

// نظام إدارة شامل للأمان والطوارئ
export class SafetyManager {
  static async initializeSafety(userId: string) {
    try {
      // إنشاء إعدادات الأمان الافتراضية للمستخدم الجديد
      await safetySettingsService.updateSafetySettings({});
      
      console.log('Safety system initialized for user:', userId);
    } catch (error) {
      console.error('Error initializing safety system:', error);
    }
  }

  static async handleEmergencyTrigger(
    type: 'medical' | 'security' | 'accident' | 'panic' | 'other',
    location: { latitude: number; longitude: number; address?: string },
    description: string,
    tripId?: string
  ) {
    try {
      // إنشاء حادثة الطوارئ
      const incident = await emergencyIncidentService.createIncident({
        type,
        location,
        description,
        priority: type === 'medical' ? 'critical' : 'high',
        tripId,
      });

      // التحقق من إعدادات الاتصال التلقائي
      const autoCallEnabled = await safetySettingsService.isFeatureEnabled('auto_emergency_calling');
      
      if (autoCallEnabled && (type === 'medical' || type === 'accident')) {
        // محاكاة الاتصال بالطوارئ (سيتم تطبيق الاتصال الفعلي حسب القوانين المحلية)
        console.log('Auto-calling emergency services...');
      }

      return incident;
    } catch (error) {
      console.error('Error handling emergency trigger:', error);
      throw error;
    }
  }

  static async shareTrip(
    tripId: string,
    emergencyContacts: Array<{ name: string; phone: string }>
  ) {
    try {
      // إنشاء مشاركة الرحلة
      const tripShare = await tripSharingService.createTripShare(tripId, emergencyContacts);
      
      console.log('Trip shared successfully with code:', tripShare.share_code);
      return tripShare;
    } catch (error) {
      console.error('Error sharing trip:', error);
      throw error;
    }
  }

  static async getMedicalInfoForEmergency(passengerId: string) {
    try {
      // التحقق من صلاحية الوصول للبطاقة الطبية
      const driverAccessEnabled = await safetySettingsService.isFeatureEnabled('allow_driver_medical_access');
      
      if (!driverAccessEnabled) {
        throw new Error('Driver access to medical information is disabled');
      }

      // جلب البطاقة الطبية والمعلومات الطبية
      const [medicalCard, emergencyContacts] = await Promise.all([
        medicalCardService.getPassengerMedicalCard(passengerId),
        emergencyContactsService.getPassengerEmergencyContacts(passengerId),
      ]);

      return {
        medicalCard,
        emergencyContacts,
      };
    } catch (error) {
      console.error('Error getting medical info for emergency:', error);
      throw error;
    }
  }
}
