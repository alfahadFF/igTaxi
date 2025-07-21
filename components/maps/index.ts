// مكونات الخرائط والملاحة المتقدمة
export { SmartMap } from './SmartMap';
export { LocationPicker } from './LocationPicker';
export { VoiceNavigation } from './VoiceNavigation';
export { TrafficInfo } from './TrafficInfo';
export { AdvancedNavigation } from './AdvancedNavigation';

// أنواع البيانات
export interface MapLocation {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
}

export interface RouteInfo {
  distance: string;
  duration: string;
  coordinates: MapLocation[];
  trafficLevel: 'free' | 'light' | 'moderate' | 'heavy';
}

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  coordinates: MapLocation;
}

// إعدادات افتراضية للخرائط
export const DEFAULT_MAP_CONFIG = {
  initialRegion: {
    latitude: 24.7136, // الرياض
    longitude: 46.6753,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  },
  mapType: 'standard' as const,
  showTraffic: true,
  showUserLocation: true,
  followsUserLocation: false,
};

// ألوان ومظاهر الخرائط
export const MAP_STYLES = {
  routeColors: {
    primary: '#007AFF',
    alternative: '#FF9500',
    selected: '#34C759',
    heavy_traffic: '#FF3B30',
  },
  markerColors: {
    start: '#34C759',
    end: '#FF3B30',
    waypoint: '#007AFF',
    landmark: '#FF9500',
  },
};

// رسائل الملاحة الصوتية
export const VOICE_INSTRUCTIONS = {
  ar: {
    turn_left: 'انعطف يساراً',
    turn_right: 'انعطف يميناً',
    continue_straight: 'استمر مستقيماً',
    arrived: 'وصلت إلى وجهتك',
    rerouting: 'جاري إعادة حساب المسار',
    prepare_turn: 'استعد للانعطاف',
    in_meters: 'بعد {distance} متر',
    in_kilometers: 'بعد {distance} كيلومتر',
  },
  en: {
    turn_left: 'Turn left',
    turn_right: 'Turn right',
    continue_straight: 'Continue straight',
    arrived: 'You have arrived at your destination',
    rerouting: 'Rerouting',
    prepare_turn: 'Prepare to turn',
    in_meters: 'in {distance} meters',
    in_kilometers: 'in {distance} kilometers',
  },
};

// أدوات مساعدة للخرائط
export const MapUtils = {
  /**
   * حساب المسافة بين نقطتين بالكيلومتر
   */
  calculateDistance: (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * تنسيق المسافة للعرض
   */
  formatDistance: (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} م`;
    } else {
      return `${distanceKm.toFixed(1)} كم`;
    }
  },

  /**
   * تنسيق المدة للعرض
   */
  formatDuration: (durationMinutes: number): string => {
    if (durationMinutes < 60) {
      return `${Math.round(durationMinutes)} دقيقة`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = Math.round(durationMinutes % 60);
      return `${hours} ساعة${minutes > 0 ? ` و ${minutes} دقيقة` : ''}`;
    }
  },

  /**
   * الحصول على اتجاه البوصلة من زاوية
   */
  getCompassDirection: (degrees: number): string => {
    const directions = [
      'شمال', 'شمال شرق', 'شرق', 'جنوب شرق',
      'جنوب', 'جنوب غرب', 'غرب', 'شمال غرب'
    ];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  },

  /**
   * تحويل إحداثيات إلى منطقة عرض للخريطة
   */
  coordinatesToRegion: (
    coordinates: MapLocation[],
    padding: number = 0.01
  ) => {
    if (coordinates.length === 0) return null;

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLon = coordinates[0].longitude;
    let maxLon = coordinates[0].longitude;

    coordinates.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLon = Math.min(minLon, coord.longitude);
      maxLon = Math.max(maxLon, coord.longitude);
    });

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat + padding, 0.01),
      longitudeDelta: Math.max(maxLon - minLon + padding, 0.01),
    };
  },
};