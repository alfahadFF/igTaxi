// ===================================================================
// App Configuration - IGTaxi
// Centralized configuration using environment variables
// ===================================================================

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gemjqbxmfkclfgvscqbj.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbWpxYnhtZmtjbGZndnNjcWJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTA4MzEsImV4cCI6MjA2ODQ2NjgzMX0.MN27PE4pyIFbiNF7g54s0EY_x7XS_qLwV0Pv1xQGiSw',
}

// App Information
export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'IGTaxi',
  version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  defaultLanguage: process.env.EXPO_PUBLIC_DEFAULT_LANGUAGE || 'ar',
  debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
  logLevel: process.env.EXPO_PUBLIC_LOG_LEVEL || 'info',
}

// Location Configuration
export const LOCATION_CONFIG = {
  defaultCity: process.env.EXPO_PUBLIC_DEFAULT_CITY || 'دبي',
  defaultCountry: process.env.EXPO_PUBLIC_DEFAULT_COUNTRY || 'الإمارات العربية المتحدة',
  defaultLatitude: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LATITUDE || '25.2048'),
  defaultLongitude: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LONGITUDE || '55.2708'),
  defaultZoomLevel: parseInt(process.env.EXPO_PUBLIC_DEFAULT_ZOOM_LEVEL || '12'),
  maxSearchRadius: parseInt(process.env.EXPO_PUBLIC_MAX_SEARCH_RADIUS || '50'),
  timezone: process.env.EXPO_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Dubai',
}

// Business Configuration
export const BUSINESS_CONFIG = {
  defaultCommissionRate: parseFloat(process.env.EXPO_PUBLIC_DEFAULT_COMMISSION_RATE || '15.00'),
  defaultCurrency: process.env.EXPO_PUBLIC_DEFAULT_CURRENCY || 'AED',
  currencySymbol: 'د.إ',
  minimumTripFare: 10.00,
  surgeMultiplierMax: 3.0,
  driverSearchRadius: 20, // km
  tripTimeout: 300, // seconds (5 minutes)
}

// Maps Configuration
export const MAPS_CONFIG = {
  googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  provider: 'google', // 'google' | 'osm' | 'mapbox'
  showTraffic: true,
  showCompass: true,
  showUserLocation: true,
}

// Payment Configuration
export const PAYMENT_CONFIG = {
  stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  paypalClientId: process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID || '',
  supportedMethods: ['cash', 'card'] as const,
  defaultMethod: 'cash' as const,
}

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  fcmVapidKey: process.env.EXPO_PUBLIC_FCM_VAPID_KEY || '',
  enablePushNotifications: true,
  enableInAppNotifications: true,
  notificationExpiry: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
}

// API Configuration
export const API_CONFIG = {
  baseUrl: SUPABASE_CONFIG.url,
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
}

// File Upload Configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocumentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  buckets: {
    avatars: 'avatars',
    documents: 'documents', 
    vehicles: 'vehicles',
    receipts: 'receipts',
  }
}

// Error Tracking
export const ERROR_TRACKING_CONFIG = {
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  enableErrorTracking: process.env.NODE_ENV === 'production',
  enablePerformanceMonitoring: process.env.NODE_ENV === 'production',
}

// Feature Flags
export const FEATURES = {
  enableRealTimeTracking: true,
  enableMultipleStops: true,
  enableScheduledRides: true,
  enableCarpooling: false,
  enableRideSharing: false,
  enableBusinessAccounts: true,
  enableDriverRatings: true,
  enableTips: false,
  enableLoyaltyProgram: false,
}

// UI Configuration
export const UI_CONFIG = {
  primaryColor: '#4CAF50',
  secondaryColor: '#FF9800',
  errorColor: '#F44336',
  warningColor: '#FF9800',
  successColor: '#4CAF50',
  infoColor: '#2196F3',
  backgroundColor: '#F8F9FA',
  cardBackgroundColor: '#FFFFFF',
  borderRadius: 12,
  spacing: 16,
  animationDuration: 300,
}

// Route Configuration
export const ROUTES = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
  },
  main: {
    home: '/',
    profile: '/profile',
    trips: '/trips',
    settings: '/settings',
  },
  services: {
    taxi: '/services/taxi',
    transport: '/services/transport',
    food: '/services/food',
    pharmacy: '/services/pharmacy',
    fuel: '/services/fuel',
    parking: '/services/parking',
    events: '/services/events',
  }
}

// Validation Rules
export const VALIDATION = {
  phone: {
    minLength: 8,
    maxLength: 15,
    pattern: /^[+]?[\d\s-()]+$/
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[\u0600-\u06FFa-zA-Z\s]+$/
  }
}

// Export all configurations
export const CONFIG = {
  SUPABASE: SUPABASE_CONFIG,
  APP: APP_CONFIG,
  LOCATION: LOCATION_CONFIG,
  BUSINESS: BUSINESS_CONFIG,
  MAPS: MAPS_CONFIG,
  PAYMENT: PAYMENT_CONFIG,
  NOTIFICATION: NOTIFICATION_CONFIG,
  API: API_CONFIG,
  UPLOAD: UPLOAD_CONFIG,
  ERROR_TRACKING: ERROR_TRACKING_CONFIG,
  FEATURES,
  UI: UI_CONFIG,
  ROUTES,
  VALIDATION,
}

export default CONFIG
