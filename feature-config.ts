// =====================================================
// إعدادات الميزات المقترحة لتطبيق IGTaxi
// =====================================================

export interface AppFeatureConfig {
  // ميزات أساسية
  core: {
    realTimeTracking: boolean;
    ratingSystem: boolean;
    cashPayment: boolean;
    tripHistory: boolean;
    notifications: boolean;
  };

  // ميزات الأمان
  safety: {
    sosButton: boolean;
    tripSharing: boolean;
    driverVerification: boolean;
    audioRecording: boolean;
    emergencyContacts: boolean;
  };

  // تحسينات واجهة المستخدم
  ui: {
    darkMode: boolean;
    arabicRTL: boolean;
    customThemes: boolean;
    animations: boolean;
    voiceInstructions: boolean;
  };

  // ميزات متقدمة
  advanced: {
    aiRouteOptimization: boolean;
    demandPrediction: boolean;
    dynamicPricing: boolean;
    loyaltyProgram: boolean;
    analytics: boolean;
  };

  // خدمات إضافية
  additional: {
    scheduleRides: boolean;
    multipleStops: boolean;
    vehicleSelection: boolean;
    promo: boolean;
    referralProgram: boolean;
  };
}

// التكوين الحالي للتطبيق
export const currentConfig: AppFeatureConfig = {
  core: {
    realTimeTracking: true,
    ratingSystem: true,
    cashPayment: true,
    tripHistory: true,
    notifications: true,
  },
  safety: {
    sosButton: false, // يُنصح بإضافتها
    tripSharing: false, // مهمة للأمان
    driverVerification: true,
    audioRecording: false,
    emergencyContacts: false,
  },
  ui: {
    darkMode: false, // مطلوبة بشدة
    arabicRTL: true,
    customThemes: false,
    animations: false, // تحسن التجربة
    voiceInstructions: false,
  },
  advanced: {
    aiRouteOptimization: true, // موجودة في النظام
    demandPrediction: true, // موجودة في النظام
    dynamicPricing: true, // موجودة في النظام
    loyaltyProgram: false, // مقترحة
    analytics: true, // موجودة في النظام
  },
  additional: {
    scheduleRides: false, // مفيدة جداً
    multipleStops: false,
    vehicleSelection: false,
    promo: false, // مهمة للتسويق
    referralProgram: false,
  },
};

// الميزات المقترحة للإضافة بالأولوية
export const suggestedFeatures = {
  highPriority: [
    'darkMode',
    'sosButton',
    'tripSharing',
    'animations',
    'scheduleRides',
  ],
  mediumPriority: [
    'loyaltyProgram',
    'promo',
    'vehicleSelection',
    'emergencyContacts',
  ],
  lowPriority: [
    'multipleStops',
    'customThemes',
    'voiceInstructions',
    'referralProgram',
  ],
};

// تقدير وقت التطوير (بالأسابيع)
export const developmentTimeEstimate = {
  darkMode: 1,
  sosButton: 2,
  tripSharing: 2,
  animations: 3,
  scheduleRides: 3,
  loyaltyProgram: 4,
  promo: 2,
  vehicleSelection: 2,
  emergencyContacts: 1,
  multipleStops: 3,
  customThemes: 2,
  voiceInstructions: 4,
  referralProgram: 3,
};

// معلومات إضافية لكل ميزة
export const featureDetails = {
  darkMode: {
    description: 'وضع ليلي مريح للعينين',
    impact: 'يحسن تجربة المستخدم خاصة في الليل',
    effort: 'منخفض',
    userRequest: 'عالي',
  },
  sosButton: {
    description: 'زر طوارئ للمساعدة الفورية',
    impact: 'يزيد الثقة والأمان بشكل كبير',
    effort: 'متوسط',
    userRequest: 'عالي جداً',
  },
  tripSharing: {
    description: 'مشاركة تفاصيل الرحلة مع الأصدقاء',
    impact: 'يزيد الشعور بالأمان خاصة للنساء',
    effort: 'متوسط',
    userRequest: 'عالي',
  },
  // يمكن إضافة المزيد...
};
