// =====================================================
// Taxi Fare Calculator - نظام حساب تكلفة سيارات الأجرة
// =====================================================

export interface FareCalculationInput {
  distance_km: number; // المسافة بالكيلومتر
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric'; // نوع الوقود
  waiting_time_minutes?: number; // وقت الانتظار بالدقائق (اختياري)
  surge_multiplier?: number; // مضاعف الازدحام (اختياري)
}

export interface FareCalculationResult {
  base_fare: number; // رسوم البداية
  distance_fare: number; // تكلفة المسافة
  waiting_charges: number; // رسوم الانتظار
  surge_amount: number; // مبلغ الازدحام
  subtotal: number; // المجموع الفرعي
  minimum_fare_applied: boolean; // هل تم تطبيق الحد الأدنى
  total_fare: number; // إجمالي التكلفة للعميل
  driver_earnings: number; // أرباح السائق (90%)
  app_commission: number; // عمولة التطبيق (10%)
  breakdown: {
    base_fare: number;
    distance_cost: number;
    waiting_cost: number;
    surge_cost: number;
    minimum_applied: number;
  };
}

// =====================================================
// إعدادات التسعير
// =====================================================
const PRICING_CONFIG = {
  // الرسوم الأساسية
  BASE_FARE: 0.35, // رسوم بداية الرحلة
  MINIMUM_FARE: 0.90, // الحد الأدنى للرحلة
  
  // التسعير حسب نوع الوقود (دينار/كم)
  FUEL_RATES: {
    petrol: 0.17, // بنزين
    diesel: 0.16, // ديزل
    hybrid: 0.15, // هجين
    electric: 0.14, // كهرباء
  } as const,
  
  // رسوم الانتظار
  WAITING_RATE_PER_MINUTE: 0.03, // دينار/دقيقة
  WAITING_SPEED_THRESHOLD: 10, // كم/س - السرعة التي تعتبر انتظار
  
  // عمولة التطبيق
  APP_COMMISSION_RATE: 0.10, // 10% للتطبيق
  DRIVER_SHARE_RATE: 0.90, // 90% للسائق
} as const;

// =====================================================
// دالة حساب التكلفة الرئيسية
// =====================================================
export function calculateFare(input: FareCalculationInput): FareCalculationResult {
  const {
    distance_km,
    fuel_type,
    waiting_time_minutes = 0,
    surge_multiplier = 1.0
  } = input;

  // التحقق من صحة المدخلات
  if (distance_km < 0) {
    throw new Error('المسافة لا يمكن أن تكون سالبة');
  }
  
  if (!PRICING_CONFIG.FUEL_RATES[fuel_type]) {
    throw new Error(`نوع الوقود غير مدعوم: ${fuel_type}`);
  }

  // 1. رسوم البداية
  const base_fare = PRICING_CONFIG.BASE_FARE;

  // 2. حساب تكلفة المسافة
  const rate_per_km = PRICING_CONFIG.FUEL_RATES[fuel_type];
  const distance_fare = distance_km * rate_per_km;

  // 3. حساب رسوم الانتظار
  const waiting_charges = waiting_time_minutes * PRICING_CONFIG.WAITING_RATE_PER_MINUTE;

  // 4. المجموع الفرعي قبل الحد الأدنى
  const subtotal_before_minimum = base_fare + distance_fare + waiting_charges;

  // 5. تطبيق الحد الأدنى
  const minimum_fare_applied = subtotal_before_minimum < PRICING_CONFIG.MINIMUM_FARE;
  const subtotal = Math.max(subtotal_before_minimum, PRICING_CONFIG.MINIMUM_FARE);

  // 6. حساب مضاعف الازدحام
  const surge_amount = (subtotal * surge_multiplier) - subtotal;

  // 7. إجمالي التكلفة
  const total_fare = subtotal + surge_amount;

  // 8. تقسيم الإيرادات
  const app_commission = total_fare * PRICING_CONFIG.APP_COMMISSION_RATE;
  const driver_earnings = total_fare * PRICING_CONFIG.DRIVER_SHARE_RATE;

  // تفصيل الحسابات
  const breakdown = {
    base_fare: base_fare,
    distance_cost: distance_fare,
    waiting_cost: waiting_charges,
    surge_cost: surge_amount,
    minimum_applied: minimum_fare_applied ? (PRICING_CONFIG.MINIMUM_FARE - subtotal_before_minimum) : 0
  };

  return {
    base_fare,
    distance_fare,
    waiting_charges,
    surge_amount,
    subtotal,
    minimum_fare_applied,
    total_fare: Math.round(total_fare * 1000) / 1000, // تقريب إلى 3 منازل عشرية
    driver_earnings: Math.round(driver_earnings * 1000) / 1000,
    app_commission: Math.round(app_commission * 1000) / 1000,
    breakdown
  };
}

// =====================================================
// دالة حساب وقت الانتظار بناءً على السرعة
// =====================================================
export function calculateWaitingTime(
  trip_duration_minutes: number,
  average_speed_kmh: number
): number {
  // إذا كانت السرعة أقل من العتبة المحددة، يعتبر وقت انتظار
  if (average_speed_kmh < PRICING_CONFIG.WAITING_SPEED_THRESHOLD) {
    // حساب الوقت الذي كانت فيه السرعة منخفضة
    const waiting_ratio = (PRICING_CONFIG.WAITING_SPEED_THRESHOLD - average_speed_kmh) / PRICING_CONFIG.WAITING_SPEED_THRESHOLD;
    return Math.max(0, trip_duration_minutes * waiting_ratio);
  }
  return 0;
}

// =====================================================
// دالة تحديد مضاعف الازدحام بناءً على الوقت والطلب
// =====================================================
export function calculateSurgeMultiplier(
  current_hour: number,
  demand_level: 'low' | 'normal' | 'high' | 'peak'
): number {
  // أوقات الذروة
  const isPeakHour = (current_hour >= 7 && current_hour <= 9) || 
                     (current_hour >= 17 && current_hour <= 19);
  
  let base_multiplier = 1.0;
  
  // تحديد المضاعف بناءً على مستوى الطلب
  switch (demand_level) {
    case 'low':
      base_multiplier = 1.0;
      break;
    case 'normal':
      base_multiplier = isPeakHour ? 1.2 : 1.0;
      break;
    case 'high':
      base_multiplier = isPeakHour ? 1.5 : 1.3;
      break;
    case 'peak':
      base_multiplier = isPeakHour ? 2.0 : 1.7;
      break;
  }
  
  return Math.min(base_multiplier, 2.5); // حد أقصى 2.5x
}

// =====================================================
// دالة إنشاء تقدير للتكلفة (للعرض المبدئي للعميل)
// =====================================================
export function estimateFare(
  estimated_distance_km: number,
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric',
  current_hour: number = new Date().getHours(),
  demand_level: 'low' | 'normal' | 'high' | 'peak' = 'normal'
): {
  estimated_min: number;
  estimated_max: number;
  estimated_average: number;
} {
  const surge_multiplier = calculateSurgeMultiplier(current_hour, demand_level);
  
  // حساب التكلفة بدون وقت انتظار (الحد الأدنى)
  const min_calculation = calculateFare({
    distance_km: estimated_distance_km,
    fuel_type,
    waiting_time_minutes: 0,
    surge_multiplier
  });
  
  // حساب التكلفة مع وقت انتظار متوسط (الحد الأقصى)
  const estimated_waiting = Math.max(0, estimated_distance_km * 2); // تقدير 2 دقيقة لكل كم
  const max_calculation = calculateFare({
    distance_km: estimated_distance_km,
    fuel_type,
    waiting_time_minutes: estimated_waiting,
    surge_multiplier
  });
  
  const estimated_average = (min_calculation.total_fare + max_calculation.total_fare) / 2;
  
  return {
    estimated_min: min_calculation.total_fare,
    estimated_max: max_calculation.total_fare,
    estimated_average: Math.round(estimated_average * 100) / 100
  };
}

// =====================================================
// دالة تحويل نوع الوقود من النص العربي إلى الإنجليزي
// =====================================================
export function mapFuelTypeToEnglish(arabicFuelType: string): FareCalculationInput['fuel_type'] {
  const fuelTypeMap: Record<string, FareCalculationInput['fuel_type']> = {
    'بنزين': 'petrol',
    'ديزل': 'diesel',
    'هجين': 'hybrid',
    'كهرباء': 'electric',
    'petrol': 'petrol',
    'diesel': 'diesel',
    'hybrid': 'hybrid',
    'electric': 'electric'
  };
  
  return fuelTypeMap[arabicFuelType] || 'petrol';
}

// =====================================================
// دالة عرض تفصيل التكلفة للعميل
// =====================================================
export function formatFareBreakdown(
  result: FareCalculationResult,
  language: 'ar' | 'en' = 'ar'
): Array<{ label: string; amount: number; isTotal?: boolean }> {
  const labels = language === 'ar' ? {
    base_fare: 'رسوم البداية',
    distance_fare: 'تكلفة المسافة',
    waiting_charges: 'رسوم الانتظار',
    surge_amount: 'رسوم الازدحام',
    minimum_applied: 'الحد الأدنى للرحلة',
    total: 'الإجمالي'
  } : {
    base_fare: 'Base Fare',
    distance_fare: 'Distance Cost',
    waiting_charges: 'Waiting Charges',
    surge_amount: 'Surge Pricing',
    minimum_applied: 'Minimum Fare',
    total: 'Total'
  };
  
  const breakdown = [];
  
  if (result.base_fare > 0) {
    breakdown.push({ label: labels.base_fare, amount: result.base_fare });
  }
  
  if (result.distance_fare > 0) {
    breakdown.push({ label: labels.distance_fare, amount: result.distance_fare });
  }
  
  if (result.waiting_charges > 0) {
    breakdown.push({ label: labels.waiting_charges, amount: result.waiting_charges });
  }
  
  if (result.surge_amount > 0) {
    breakdown.push({ label: labels.surge_amount, amount: result.surge_amount });
  }
  
  if (result.minimum_fare_applied) {
    breakdown.push({ label: labels.minimum_applied, amount: result.breakdown.minimum_applied });
  }
  
  breakdown.push({ label: labels.total, amount: result.total_fare, isTotal: true });
  
  return breakdown;
}

// =====================================================
// دوال مساعدة للاختبار
// =====================================================
export function runFareCalculationTests() {
  console.log('🧪 اختبار نظام حساب التكلفة...\n');
  
  // اختبار 1: رحلة 3 كم - بنزين
  const test1 = calculateFare({
    distance_km: 3,
    fuel_type: 'petrol',
    waiting_time_minutes: 0
  });
  console.log('اختبار 1 - رحلة 3 كم بنزين:');
  console.log(`التكلفة: ${test1.total_fare} دينار (متوقع: 0.90 دينار)`);
  console.log(`أرباح السائق: ${test1.driver_earnings} دينار`);
  console.log(`عمولة التطبيق: ${test1.app_commission} دينار\n`);
  
  // اختبار 2: رحلة 75 كم - كهرباء
  const test2 = calculateFare({
    distance_km: 75,
    fuel_type: 'electric',
    waiting_time_minutes: 0
  });
  console.log('اختبار 2 - رحلة 75 كم كهرباء:');
  console.log(`التكلفة: ${test2.total_fare} دينار (متوقع: 10.85 دينار)`);
  console.log(`أرباح السائق: ${test2.driver_earnings} دينار`);
  console.log(`عمولة التطبيق: ${test2.app_commission} دينار\n`);
  
  // اختبار 3: رحلة 75 كم - ديزل
  const test3 = calculateFare({
    distance_km: 75,
    fuel_type: 'diesel',
    waiting_time_minutes: 0
  });
  console.log('اختبار 3 - رحلة 75 كم ديزل:');
  console.log(`التكلفة: ${test3.total_fare} دينار (متوقع: 12.35 دينار)`);
  console.log(`أرباح السائق: ${test3.driver_earnings} دينار`);
  console.log(`عمولة التطبيق: ${test3.app_commission} دينار\n`);
  
  // اختبار 4: رحلة مع وقت انتظار
  const test4 = calculateFare({
    distance_km: 10,
    fuel_type: 'hybrid',
    waiting_time_minutes: 15 // 15 دقيقة انتظار
  });
  console.log('اختبار 4 - رحلة 10 كم هجين مع 15 دقيقة انتظار:');
  console.log(`التكلفة: ${test4.total_fare} دينار`);
  console.log(`رسوم الانتظار: ${test4.waiting_charges} دينار`);
  console.log(`أرباح السائق: ${test4.driver_earnings} دينار`);
  console.log(`عمولة التطبيق: ${test4.app_commission} دينار\n`);
}

// =====================================================
// تصدير الإعدادات للاستخدام في أماكن أخرى
// =====================================================
export { PRICING_CONFIG };
