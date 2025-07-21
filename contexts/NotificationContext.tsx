import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType = 
  | 'trip_request'      // طلب رحلة جديد
  | 'trip_accepted'     // تم قبول الرحلة
  | 'trip_started'      // بدء الرحلة
  | 'trip_completed'    // انتهاء الرحلة
  | 'driver_arrived'    // وصول السائق
  | 'payment_received'  // استلام الدفع
  | 'earning_update'    // تحديث الأرباح
  | 'promo_offer'       // عروض ترويجية
  | 'system_update'     // تحديثات النظام
  | 'rating_request'    // طلب تقييم
  | 'document_expire'   // انتهاء صلاحية الوثائق
  | 'maintenance';      // صيانة النظام

export interface NotificationPreferences {
  // إشعارات العملاء
  customer: {
    tripUpdates: boolean;        // تحديثات الرحلة
    driverLocation: boolean;     // موقع السائق
    paymentAlerts: boolean;      // تنبيهات الدفع
    promoOffers: boolean;        // العروض الترويجية
    ratingReminders: boolean;    // تذكير التقييم
    emailNotifications: boolean; // الإشعارات عبر البريد
    smsNotifications: boolean;   // الإشعارات عبر الرسائل
  };
  
  // إشعارات السائقين
  driver: {
    newRequests: boolean;        // طلبات جديدة
    tripUpdates: boolean;        // تحديثات الرحلة
    earningUpdates: boolean;     // تحديثات الأرباح
    documentExpiry: boolean;     // انتهاء صلاحية الوثائق
    systemAlerts: boolean;       // تنبيهات النظام
    maintenanceAlerts: boolean;  // تنبيهات الصيانة
    emailNotifications: boolean; // الإشعارات عبر البريد
    smsNotifications: boolean;   // الإشعارات عبر الرسائل
  };
  
  // إعدادات عامة
  general: {
    sound: boolean;              // الصوت
    vibration: boolean;          // الاهتزاز
    quietHours: {               // الساعات الهادئة
      enabled: boolean;
      startTime: string;         // مثل "22:00"
      endTime: string;           // مثل "07:00"
    };
    doNotDisturb: boolean;       // عدم الإزعاج
    groupSimilar: boolean;       // تجميع الإشعارات المشابهة
  };
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  actionData?: any;             // بيانات إضافية للإجراءات
  expiresAt?: Date;             // تاريخ انتهاء الصلاحية
}

interface NotificationContextType {
  // الإعدادات
  preferences: NotificationPreferences;
  updatePreferences: (newPreferences: Partial<NotificationPreferences>) => Promise<void>;
  
  // الإشعارات
  notifications: NotificationItem[];
  unreadCount: number;
  
  // إدارة الإشعارات
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // إشعارات محددة للعملاء
  notifyTripUpdate: (tripId: string, status: string, details?: string) => void;
  notifyDriverArrival: (driverName: string, estimatedTime: number) => void;
  notifyPaymentReceived: (amount: number, paymentMethod: string) => void;
  
  // إشعارات محددة للسائقين
  notifyNewTripRequest: (pickup: string, destination: string, fare: number) => void;
  notifyEarningUpdate: (dailyEarnings: number, totalEarnings: number) => void;
  notifyDocumentExpiry: (documentType: string, expiryDate: Date) => void;
  
  // حالة الإشعارات
  isNotificationAllowed: (type: NotificationType) => boolean;
  shouldShowNotification: () => boolean; // يتحقق من الساعات الهادئة
}

const defaultPreferences: NotificationPreferences = {
  customer: {
    tripUpdates: true,
    driverLocation: true,
    paymentAlerts: true,
    promoOffers: false,
    ratingReminders: true,
    emailNotifications: false,
    smsNotifications: true,
  },
  driver: {
    newRequests: true,
    tripUpdates: true,
    earningUpdates: true,
    documentExpiry: true,
    systemAlerts: true,
    maintenanceAlerts: true,
    emailNotifications: false,
    smsNotifications: true,
  },
  general: {
    sound: true,
    vibration: true,
    quietHours: {
      enabled: false,
      startTime: "22:00",
      endTime: "07:00",
    },
    doNotDisturb: false,
    groupSimilar: true,
  },
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // تحميل الإعدادات من التخزين المحلي عند بدء التطبيق
  useEffect(() => {
    loadPreferences();
    loadNotifications();
  }, []);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_preferences');
      if (saved) {
        const parsedPreferences = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...parsedPreferences });
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const saved = await AsyncStorage.getItem('notifications');
      if (saved) {
        const parsedNotifications = JSON.parse(saved).map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp),
          expiresAt: notif.expiresAt ? new Date(notif.expiresAt) : undefined,
        }));
        // إزالة الإشعارات المنتهية الصلاحية
        const validNotifications = parsedNotifications.filter((notif: NotificationItem) => 
          !notif.expiresAt || notif.expiresAt > new Date()
        );
        setNotifications(validNotifications);
      }
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    try {
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.warn('Failed to save notification preferences:', error);
    }
  };

  const saveNotifications = async (newNotifications: NotificationItem[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
    } catch (error) {
      console.warn('Failed to save notifications:', error);
    }
  };

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    const updated = {
      ...preferences,
      ...newPreferences,
      customer: { ...preferences.customer, ...newPreferences.customer },
      driver: { ...preferences.driver, ...newPreferences.driver },
      general: { ...preferences.general, ...newPreferences.general },
    };
    setPreferences(updated);
    await savePreferences(updated);
  };

  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    if (!shouldShowNotification() || !isNotificationAllowed(notification.type)) {
      return;
    }

    const newNotification: NotificationItem = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 100); // الاحتفاظ بآخر 100 إشعار فقط
      saveNotifications(updated);
      return updated;
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      );
      saveNotifications(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notif => ({ ...notif, isRead: true }));
      saveNotifications(updated);
      return updated;
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(notif => notif.id !== id);
      saveNotifications(updated);
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  // إشعارات محددة للعملاء
  const notifyTripUpdate = (tripId: string, status: string, details?: string) => {
    const statusMessages: Record<string, string> = {
      'accepted': 'تم قبول طلب رحلتك',
      'started': 'بدأت رحلتك',
      'arrived': 'وصل السائق إلى موقعك',
      'completed': 'تم إنهاء رحلتك بنجاح',
      'cancelled': 'تم إلغاء الرحلة',
    };

    addNotification({
      type: 'trip_started',
      title: statusMessages[status] || 'تحديث حالة الرحلة',
      message: details || `رحلة رقم ${tripId}`,
      isRead: false,
      isImportant: ['started', 'arrived'].includes(status),
    });
  };

  const notifyDriverArrival = (driverName: string, estimatedTime: number) => {
    addNotification({
      type: 'driver_arrived',
      title: 'وصل السائق',
      message: `السائق ${driverName} سيصل خلال ${estimatedTime} دقيقة`,
      isRead: false,
      isImportant: true,
    });
  };

  const notifyPaymentReceived = (amount: number, paymentMethod: string) => {
    addNotification({
      type: 'payment_received',
      title: 'تم استلام الدفع',
      message: `تم دفع ${amount} ريال عبر ${paymentMethod}`,
      isRead: false,
      isImportant: false,
    });
  };

  // إشعارات محددة للسائقين
  const notifyNewTripRequest = (pickup: string, destination: string, fare: number) => {
    addNotification({
      type: 'trip_request',
      title: 'طلب رحلة جديد',
      message: `من ${pickup} إلى ${destination} - ${fare} ريال`,
      isRead: false,
      isImportant: true,
      expiresAt: new Date(Date.now() + 60000), // ينتهي خلال دقيقة
    });
  };

  const notifyEarningUpdate = (dailyEarnings: number, totalEarnings: number) => {
    addNotification({
      type: 'earning_update',
      title: 'تحديث الأرباح',
      message: `أرباح اليوم: ${dailyEarnings} ريال | المجموع: ${totalEarnings} ريال`,
      isRead: false,
      isImportant: false,
    });
  };

  const notifyDocumentExpiry = (documentType: string, expiryDate: Date) => {
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    addNotification({
      type: 'document_expire',
      title: 'انتهاء صلاحية الوثائق',
      message: `${documentType} ستنتهي صلاحيته خلال ${daysLeft} يوم`,
      isRead: false,
      isImportant: daysLeft <= 7,
    });
  };

  // فحص إذا كان نوع الإشعار مسموح
  const isNotificationAllowed = (type: NotificationType): boolean => {
    if (preferences.general.doNotDisturb) return false;

    // فحص حسب نوع الإشعار
    switch (type) {
      case 'trip_request':
      case 'trip_accepted':
      case 'trip_started':
      case 'trip_completed':
      case 'driver_arrived':
        return preferences.customer.tripUpdates || preferences.driver.tripUpdates;
      
      case 'payment_received':
        return preferences.customer.paymentAlerts;
      
      case 'earning_update':
        return preferences.driver.earningUpdates;
      
      case 'promo_offer':
        return preferences.customer.promoOffers;
      
      case 'document_expire':
        return preferences.driver.documentExpiry;
      
      case 'maintenance':
      case 'system_update':
        return preferences.driver.systemAlerts;
      
      default:
        return true;
    }
  };

  // فحص الساعات الهادئة
  const shouldShowNotification = (): boolean => {
    if (!preferences.general.quietHours.enabled) return true;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.general.quietHours.startTime.split(':').map(Number);
    const [endHour, endMin] = preferences.general.quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // إذا كانت فترة الهدوء تمتد عبر منتصف الليل
    if (startTime > endTime) {
      return !(currentTime >= startTime || currentTime <= endTime);
    } else {
      return !(currentTime >= startTime && currentTime <= endTime);
    }
  };

  const unreadCount = notifications.filter(notif => !notif.isRead).length;

  const contextValue: NotificationContextType = {
    preferences,
    updatePreferences,
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    notifyTripUpdate,
    notifyDriverArrival,
    notifyPaymentReceived,
    notifyNewTripRequest,
    notifyEarningUpdate,
    notifyDocumentExpiry,
    isNotificationAllowed,
    shouldShowNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
