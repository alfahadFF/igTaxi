import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { safetyDataService } from '@/utils/safety/safety-data-service';
import { emergencyContactsService } from '@/utils/safety/emergency-contacts-service';
import { emergencyNumbersService } from '@/utils/safety/emergency-numbers-service';
import { emergencyIncidentService } from '@/utils/safety/emergency-incident-service';
import { safetySettingsService } from '@/utils/safety/safety-settings-service';
import { tripSharingService } from '@/utils/safety/trip-sharing-service';

// Emergency System Types
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string; // family, friend, colleague
  isPrimary: boolean;
}

export interface EmergencySettings {
  sosButton: boolean;
  emergencyContacts: EmergencyContact[];
  policeHotline: string;
  locationSharing: boolean;
  audioRecording: boolean;
  autoDialAfterSOS: boolean;
  sosCountdown: number; // seconds before auto-dial
}

export interface EmergencyIncident {
  id: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  type: 'sos' | 'panic' | 'deviation' | 'manual';
  status: 'active' | 'resolved' | 'false_alarm';
  tripId?: string;
  contactsNotified: string[];
  audioRecordingPath?: string;
  notes?: string;
}

export interface TripSharing {
  enabled: boolean;
  shareWithContacts: string[]; // contact IDs
  shareLocation: boolean;
  shareETA: boolean;
  shareDriverInfo: boolean;
  autoShare: boolean; // automatically share all trips
  shareCode?: string; // unique code for sharing
}

export interface TripShare {
  id: string;
  tripId: string;
  shareCode: string;
  shareUrl?: string;
  startTime?: Date;
  endTime?: Date;
  expiresAt?: Date;
  passengerName?: string;
  destination?: string;
  recipients: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
  }>;
  isActive: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface SafetyContextType {
  // Emergency Settings
  emergencySettings: EmergencySettings;
  updateEmergencySettings: (settings: Partial<EmergencySettings>) => Promise<void>;
  
  // Emergency Contacts
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  updateEmergencyContact: (id: string, contact: Partial<EmergencyContact>) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;
  
  // Emergency Actions
  triggerSOS: (type?: 'sos' | 'panic') => Promise<void>;
  resolveSOS: (incidentId: string, notes?: string) => Promise<void>;
  reportFalseAlarm: (incidentId: string) => Promise<void>;
  
  // Trip Sharing
  tripSharing: TripSharing;
  updateTripSharing: (settings: Partial<TripSharing>) => Promise<void>;
  startTripSharing: (tripId: string) => Promise<string>; // returns share code
  stopTripSharing: (tripId: string) => Promise<void>;
  
  // Active Trip Share
  activeTripShare: TripShare | null;
  createTripShare: (tripId: string, destination?: string) => Promise<string>;
  stopTripShare: (shareId: string) => Promise<void>;
  shareLocation: (shareId: string) => Promise<void>;
  updateLocationShare: (tripId: string, location: Location.LocationObject) => Promise<void>;
  
  // Incidents
  activeIncident: EmergencyIncident | null;
  incidentHistory: EmergencyIncident[];
  
  // Location Services
  currentLocation: Location.LocationObject | null;
  isLocationTracking: boolean;
  startLocationTracking: () => Promise<void>;
  stopLocationTracking: () => Promise<void>;
}

const defaultEmergencySettings: EmergencySettings = {
  sosButton: true,
  emergencyContacts: [],
  policeHotline: '999', // Kuwait emergency number
  locationSharing: true,
  audioRecording: false,
  autoDialAfterSOS: true,
  sosCountdown: 10,
};

const defaultTripSharing: TripSharing = {
  enabled: false,
  shareWithContacts: [],
  shareLocation: true,
  shareETA: true,
  shareDriverInfo: true,
  autoShare: false,
};

const SafetyContext = createContext<SafetyContextType | undefined>(undefined);

export const useSafety = () => {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error('useSafety must be used within a SafetyProvider');
  }
  return context;
};

interface SafetyProviderProps {
  children: ReactNode;
}

export const SafetyProvider: React.FC<SafetyProviderProps> = ({ children }) => {
  const [emergencySettings, setEmergencySettings] = useState<EmergencySettings>(defaultEmergencySettings);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [tripSharing, setTripSharing] = useState<TripSharing>(defaultTripSharing);
  const [activeIncident, setActiveIncident] = useState<EmergencyIncident | null>(null);
  const [incidentHistory, setIncidentHistory] = useState<EmergencyIncident[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [activeTripShare, setActiveTripShare] = useState<TripShare | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllSafetyData();
  }, []);

  // مزامنة جميع بيانات الأمان من قاعدة البيانات
  const loadAllSafetyData = async () => {
    try {
      // تحميل إعدادات الأمان
      await loadEmergencySettings();
      // تحميل جهات الاتصال الطارئة
      await loadEmergencyContacts();
      // تحميل إعدادات مشاركة الرحلة
      await loadTripSharing();
      // تحميل سجل الحوادث
      await loadIncidentHistory();
      // مزامنة البيانات
      await safetyDataService.syncAllSafetyData();
    } catch (error) {
      console.error('Error loading safety data:', error);
    }
  };

  const loadEmergencySettings = async () => {
    try {
      // جلب من قاعدة البيانات أولاً
      const settings = await safetyDataService.getData('safety_settings');
      if (settings) {
        setEmergencySettings(prev => ({
          ...prev,
          sosButton: settings.panic_button_enabled,
          locationSharing: settings.share_location_in_emergency,
          audioRecording: settings.voice_activation_enabled,
          autoDialAfterSOS: settings.emergency_services_auto_call,
          sosCountdown: settings.emergency_countdown_duration
        }));
      }
      
      // جلب أرقام الطوارئ
      const emergencyNumbers = await emergencyNumbersService.getActiveEmergencyNumbers();
      if (emergencyNumbers) {
        setEmergencySettings(prev => ({
          ...prev,
          policeHotline: emergencyNumbers.generalEmergency || emergencyNumbers.police
        }));
      }
    } catch (error) {
      console.warn('Failed to load emergency settings from database, using local storage fallback:', error);
      // استخدام AsyncStorage كبديل
      const saved = await AsyncStorage.getItem('emergency_settings');
      if (saved) {
        setEmergencySettings({ ...defaultEmergencySettings, ...JSON.parse(saved) });
      }
    }
  };

  const loadEmergencyContacts = async () => {
    try {
      // جلب من قاعدة البيانات
      const contacts = await safetyDataService.getData('emergency_contacts');
      if (contacts && Array.isArray(contacts)) {
        setEmergencyContacts(contacts.map(contact => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
          isPrimary: contact.is_primary
        })));
      }
    } catch (error) {
      console.warn('Failed to load emergency contacts from database, using local storage fallback:', error);
      // استخدام AsyncStorage كبديل
      const saved = await AsyncStorage.getItem('emergency_contacts');
      if (saved) {
        setEmergencyContacts(JSON.parse(saved));
      }
    }
  };

  const loadTripSharing = async () => {
    try {
      // جلب مشاركات الرحلة النشطة
      const tripShares = await safetyDataService.getData('trip_shares');
      if (tripShares && Array.isArray(tripShares) && tripShares.length > 0) {
        setActiveTripShare({
          id: tripShares[0].id,
          tripId: tripShares[0].trip_id,
          shareCode: tripShares[0].share_code,
          isActive: tripShares[0].is_active,
          expiresAt: new Date(tripShares[0].expires_at),
          recipients: []
        });
      }
      
      // تحديث إعدادات مشاركة الرحلة
      setTripSharing(prev => ({
        ...prev,
        enabled: tripShares && tripShares.length > 0
      }));
    } catch (error) {
      console.warn('Failed to load trip sharing from database, using local storage fallback:', error);
      // استخدام AsyncStorage كبديل
      const saved = await AsyncStorage.getItem('trip_sharing');
      if (saved) {
        setTripSharing({ ...defaultTripSharing, ...JSON.parse(saved) });
      }
    }
  };

  const loadIncidentHistory = async () => {
    try {
      // مؤقتاً نستخدم AsyncStorage للحوادث المحلية
      // يمكن إضافة استعلام قاعدة البيانات لاحقاً
      const saved = await AsyncStorage.getItem('incident_history');
      if (saved) {
        const incidents = JSON.parse(saved).map((incident: any) => ({
          ...incident,
          timestamp: new Date(incident.timestamp),
        }));
        setIncidentHistory(incidents);
      }
    } catch (error) {
      console.warn('Failed to load incident history:', error);
    }
  };

  const updateEmergencySettings = async (settings: Partial<EmergencySettings>) => {
    const updated = { ...emergencySettings, ...settings };
    setEmergencySettings(updated);
    await AsyncStorage.setItem('emergency_settings', JSON.stringify(updated));
  };

  const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    try {
      // حفظ في قاعدة البيانات
      const newContact = await emergencyContactsService.addEmergencyContact({
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
        isPrimary: contact.isPrimary
      });
      
      // تحديث الحالة المحلية
      setEmergencyContacts(prev => [...prev, newContact]);
      
      // حفظ في التخزين المحلي كنسخة احتياطية
      const updated = [...emergencyContacts, newContact];
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      // في حالة الخطأ، حفظ محلياً فقط
      const newContact: EmergencyContact = {
        ...contact,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      };
      
      const updated = [...emergencyContacts, newContact];
      setEmergencyContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
      
      // إضافة للعمليات المؤجلة
      safetyDataService.queueOperation('addEmergencyContact', contact);
    }
  };

  const updateEmergencyContact = async (id: string, updates: Partial<EmergencyContact>) => {
    try {
      // تحديث في قاعدة البيانات
      await emergencyContactsService.updateEmergencyContact(id, updates);
      
      // تحديث الحالة المحلية
      const updated = emergencyContacts.map(contact =>
        contact.id === id ? { ...contact, ...updates } : contact
      );
      setEmergencyContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      // في حالة الخطأ، تحديث محلياً فقط
      const updated = emergencyContacts.map(contact =>
        contact.id === id ? { ...contact, ...updates } : contact
      );
      setEmergencyContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
      
      // إضافة للعمليات المؤجلة
      safetyDataService.queueOperation('updateEmergencyContact', { id, updates });
    }
  };

  const removeEmergencyContact = async (id: string) => {
    try {
      // حذف من قاعدة البيانات
      await emergencyContactsService.removeEmergencyContact(id);
      
      // تحديث الحالة المحلية
      const updated = emergencyContacts.filter(contact => contact.id !== id);
      setEmergencyContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing emergency contact:', error);
      // في حالة الخطأ، حذف محلياً فقط
      const updated = emergencyContacts.filter(contact => contact.id !== id);
      setEmergencyContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
      
      // إضافة للعمليات المؤجلة
      safetyDataService.queueOperation('deleteEmergencyContact', { id });
    }
  };

  const generateIncidentId = () => 'EMRG_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);

  const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      return location;
    } catch (error) {
      console.warn('Failed to get current location:', error);
      return null;
    }
  };

  const getAddressFromLocation = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        return `${address.street || ''} ${address.district || ''} ${address.city || ''} ${address.country || ''}`.trim();
      }
    } catch (error) {
      console.warn('Failed to get address:', error);
    }
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  const triggerSOS = async (type: 'sos' | 'panic' = 'sos') => {
    try {
      const location = await getCurrentLocation();
      if (!location) {
        console.warn('Could not get location for SOS');
        return;
      }

      const address = await getAddressFromLocation(location.coords.latitude, location.coords.longitude);

      const incident: EmergencyIncident = {
        id: generateIncidentId(),
        timestamp: new Date(),
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address,
        },
        type,
        status: 'active',
        contactsNotified: [],
      };

      setActiveIncident(incident);

      // حفظ في قاعدة البيانات
      try {
        await emergencyIncidentService.createIncident({
          type: type === 'sos' ? 'medical' : 'panic',
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            address: address
          },
          description: `حالة طوارئ ${type} تم تفعيلها`,
          priority: 'critical'
        });
      } catch (dbError) {
        console.warn('Could not save incident to database:', dbError);
        // المتابعة مع التخزين المحلي
      }

      // Save to local history
      const updatedHistory = [incident, ...incidentHistory].slice(0, 50);
      setIncidentHistory(updatedHistory);
      await AsyncStorage.setItem('incident_history', JSON.stringify(updatedHistory));

      // إشعار جهات الاتصال الطارئة
      await notifyEmergencyContacts(incident);

      // الحصول على رقم الطوارئ المناسب
      const emergencyNumber = await emergencyNumbersService.getEmergencyNumberByType(
        type === 'panic' ? 'police' : 'general'
      );

      // إذا كان الاتصال التلقائي مفعل
      if (emergencySettings.autoDialAfterSOS) {
        console.log(`سيتم الاتصال برقم الطوارئ: ${emergencyNumber} خلال ${emergencySettings.sosCountdown} ثانية`);
        // هنا يمكن إضافة countdown ثم الاتصال التلقائي
        // setTimeout(() => {
        //   Linking.openURL(`tel:${emergencyNumber}`);
        // }, emergencySettings.sosCountdown * 1000);
      }

      console.log('SOS triggered:', incident);
    } catch (error) {
      console.error('Error triggering SOS:', error);
    }
  };

  const notifyEmergencyContacts = async (incident: EmergencyIncident) => {
    // In a real app, this would send SMS/calls/push notifications
    const primaryContacts = emergencyContacts.filter(contact => contact.isPrimary);
    const contactsToNotify = primaryContacts.length > 0 ? primaryContacts : emergencyContacts.slice(0, 3);

    const notifiedIds = contactsToNotify.map(contact => contact.id);
    
    // Update incident with notified contacts
    const updatedIncident = { ...incident, contactsNotified: notifiedIds };
    setActiveIncident(updatedIncident);

    // Here you would implement actual notification logic:
    // - Send SMS via SMS API
    // - Make phone calls via calling API
    // - Send push notifications
    // - Send location via messaging API

    console.log('Emergency contacts notified:', contactsToNotify.map(c => c.name));
  };

  const resolveSOS = async (incidentId: string, notes?: string) => {
    if (activeIncident?.id === incidentId) {
      const resolvedIncident = {
        ...activeIncident,
        status: 'resolved' as const,
        notes,
      };
      
      setActiveIncident(null);
      
      // Update in history
      const updatedHistory = incidentHistory.map(incident =>
        incident.id === incidentId ? resolvedIncident : incident
      );
      setIncidentHistory(updatedHistory);
      await AsyncStorage.setItem('incident_history', JSON.stringify(updatedHistory));
    }
  };

  const reportFalseAlarm = async (incidentId: string) => {
    await resolveSOS(incidentId, 'تم الإبلاغ عن إنذار كاذب');
    
    if (activeIncident?.id === incidentId) {
      const updatedIncident = { ...activeIncident, status: 'false_alarm' as const };
      setActiveIncident(null);
      
      const updatedHistory = incidentHistory.map(incident =>
        incident.id === incidentId ? updatedIncident : incident
      );
      setIncidentHistory(updatedHistory);
      await AsyncStorage.setItem('incident_history', JSON.stringify(updatedHistory));
    }
  };

  const updateTripSharing = async (settings: Partial<TripSharing>) => {
    const updated = { ...tripSharing, ...settings };
    setTripSharing(updated);
    await AsyncStorage.setItem('trip_sharing', JSON.stringify(updated));
  };

  const startTripSharing = async (tripId: string): Promise<string> => {
    const shareCode = 'TRIP_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    
    await updateTripSharing({
      ...tripSharing,
      shareCode,
    });

    // In a real app, you would:
    // 1. Create a shareable link with the code
    // 2. Send SMS/message to selected contacts
    // 3. Start real-time location sharing

    console.log(`Trip sharing started for ${tripId} with code: ${shareCode}`);
    return shareCode;
  };

  const stopTripSharing = async (tripId: string) => {
    await updateTripSharing({
      ...tripSharing,
      shareCode: undefined,
    });

    console.log(`Trip sharing stopped for ${tripId}`);
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          setCurrentLocation(location);
        }
      );

      setLocationSubscription(subscription);
      setIsLocationTracking(true);
    } catch (error) {
      console.warn('Failed to start location tracking:', error);
    }
  };

  const stopLocationTracking = async () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    setIsLocationTracking(false);
  };

  // Trip Share Functions
  const createTripShare = async (tripId: string, destination?: string): Promise<string> => {
    const location = await getCurrentLocation();
    if (!location) {
      throw new Error('Could not get current location');
    }

    const shareCode = 'TRIP_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
    const shareUrl = `https://igtaxi.app/track/${shareCode}`;

    const tripShare: TripShare = {
      id: Date.now().toString(),
      tripId,
      shareCode,
      shareUrl,
      startTime: new Date(),
      passengerName: 'المستخدم', // This should come from user profile
      destination,
      recipients: [],
      isActive: true,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: await getAddressFromLocation(location.coords.latitude, location.coords.longitude),
      },
    };

    setActiveTripShare(tripShare);
    
    // Start location tracking for trip sharing
    if (!isLocationTracking) {
      await startLocationTracking();
    }

    return shareCode;
  };

  const stopTripShare = async (shareId: string) => {
    if (activeTripShare?.id === shareId) {
      setActiveTripShare(null);
      // Stop location tracking if no active incident
      if (!activeIncident) {
        await stopLocationTracking();
      }
    }
  };

  const shareLocation = async (shareId: string) => {
    if (activeTripShare?.id === shareId && currentLocation) {
      // In a real app, this would send location update to shared contacts
      console.log('Location shared for trip:', shareId, currentLocation.coords);
    }
  };

  const updateLocationShare = async (tripId: string, location: Location.LocationObject) => {
    try {
      // تحديث الموقع في قاعدة البيانات
      if (activeTripShare?.tripId === tripId) {
        // تبسيط استدعاء الخدمة
        console.log('Location updated for trip:', tripId, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      console.error('خطأ في تحديث موقع الرحلة:', error);
    }
  };

  const contextValue: SafetyContextType = {
    emergencySettings,
    updateEmergencySettings,
    emergencyContacts,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    triggerSOS,
    resolveSOS,
    reportFalseAlarm,
    tripSharing,
    updateTripSharing,
    startTripSharing,
    stopTripSharing,
    activeIncident,
    incidentHistory,
    currentLocation,
    isLocationTracking,
    startLocationTracking,
    stopLocationTracking,
    // Trip Share Functions
    activeTripShare,
    createTripShare,
    stopTripShare,
    shareLocation,
    updateLocationShare,
  };

  return (
    <SafetyContext.Provider value={contextValue}>
      {children}
    </SafetyContext.Provider>
  );
};
