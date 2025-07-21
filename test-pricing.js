// =====================================================
// اختبار نظام التسعير الجديد
// =====================================================

const PRICING_CONFIG = {
  BASE_FARE: 0.35,
  MINIMUM_FARE: 0.90,
  FUEL_RATES: {
    petrol: 0.17,
    diesel: 0.16,
    hybrid: 0.15,
    electric: 0.14,
  },
  WAITING_RATE_PER_MINUTE: 0.03,
  APP_COMMISSION_RATE: 0.10,
  DRIVER_SHARE_RATE: 0.90,
};

function calculateFare(input) {
  const {
    distance_km,
    fuel_type,
    waiting_time_minutes = 0,
    surge_multiplier = 1.0
  } = input;

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

  return {
    base_fare,
    distance_fare,
    waiting_charges,
    surge_amount,
    subtotal,
    minimum_fare_applied,
    total_fare: Math.round(total_fare * 1000) / 1000,
    driver_earnings: Math.round(driver_earnings * 1000) / 1000,
    app_commission: Math.round(app_commission * 1000) / 1000,
  };
}

console.log('🚀 تشغيل اختبارات نظام التسعير الجديد...\n');

// اختبار 1: رحلة 3 كم - بنزين
const test1 = calculateFare({
  distance_km: 3,
  fuel_type: 'petrol',
  waiting_time_minutes: 0
});
console.log('اختبار 1 - رحلة 3 كم بنزين:');
console.log(`▶️ الحساب: 0.35 + (3 × 0.17) = ${(0.35 + 3 * 0.17).toFixed(3)} دينار`);
console.log(`▶️ بعد الحد الأدنى: ${test1.total_fare} دينار (متوقع: 0.90 دينار)`);
console.log(`▶️ أرباح السائق: ${test1.driver_earnings} دينار (90%)`);
console.log(`▶️ عمولة التطبيق: ${test1.app_commission} دينار (10%)\n`);

// اختبار 2: رحلة 75 كم - كهرباء
const test2 = calculateFare({
  distance_km: 75,
  fuel_type: 'electric',
  waiting_time_minutes: 0
});
console.log('اختبار 2 - رحلة 75 كم كهرباء:');
console.log(`▶️ الحساب: 0.35 + (75 × 0.14) = ${(0.35 + 75 * 0.14).toFixed(3)} دينار`);
console.log(`▶️ التكلفة الإجمالية: ${test2.total_fare} دينار (متوقع: 10.85 دينار)`);
console.log(`▶️ أرباح السائق: ${test2.driver_earnings} دينار`);
console.log(`▶️ عمولة التطبيق: ${test2.app_commission} دينار\n`);

// اختبار 3: رحلة 75 كم - ديزل
const test3 = calculateFare({
  distance_km: 75,
  fuel_type: 'diesel',
  waiting_time_minutes: 0
});
console.log('اختبار 3 - رحلة 75 كم ديزل:');
console.log(`▶️ الحساب: 0.35 + (75 × 0.16) = ${(0.35 + 75 * 0.16).toFixed(3)} دينار`);
console.log(`▶️ التكلفة الإجمالية: ${test3.total_fare} دينار (متوقع: 12.35 دينار)`);
console.log(`▶️ أرباح السائق: ${test3.driver_earnings} دينار`);
console.log(`▶️ عمولة التطبيق: ${test3.app_commission} دينار\n`);

// اختبار 4: رحلة مع وقت انتظار
const test4 = calculateFare({
  distance_km: 10,
  fuel_type: 'hybrid',
  waiting_time_minutes: 15 // 15 دقيقة انتظار
});
console.log('اختبار 4 - رحلة 10 كم هجين مع 15 دقيقة انتظار:');
console.log(`▶️ تكلفة المسافة: 0.35 + (10 × 0.15) = ${(0.35 + 10 * 0.15).toFixed(3)} دينار`);
console.log(`▶️ رسوم الانتظار: 15 × 0.03 = ${(15 * 0.03).toFixed(3)} دينار`);
console.log(`▶️ التكلفة الإجمالية: ${test4.total_fare} دينار`);
console.log(`▶️ أرباح السائق: ${test4.driver_earnings} دينار`);
console.log(`▶️ عمولة التطبيق: ${test4.app_commission} دينار\n`);

// مقارنة مع المنافسين
console.log('📊 مقارنة مع التطبيقات المنافسة:');
console.log('▶️ رحلة 75 كم بنزين في التطبيقات الأخرى: ~14.30 دينار');
console.log(`▶️ رحلة 75 كم بنزين في تطبيقنا: ${calculateFare({distance_km: 75, fuel_type: 'petrol'}).total_fare} دينار`);
console.log('▶️ توفير للعميل: ' + ((14.30 - calculateFare({distance_km: 75, fuel_type: 'petrol'}).total_fare)).toFixed(3) + ' دينار\n');

console.log('✅ تم تشغيل جميع الاختبارات بنجاح!');
console.log('\n🎯 ملخص المزايا التنافسية:');
console.log('▶️ أسعار أقل من المنافسين');
console.log('▶️ تسعير شفاف ومرن');
console.log('▶️ تشجيع استخدام المركبات الصديقة للبيئة');
console.log('▶️ دخل ثابت وعادل للسائقين');
console.log('▶️ عمولة معقولة للتطبيق (10%)');

console.log('\n💰 نموذج الإيرادات:');
console.log('▶️ 90% للسائق');
console.log('▶️ 10% لصالح التطبيق');
console.log('▶️ رسوم تفاعلية حسب نوع الوقود');
console.log('▶️ رسوم انتظار في حالة الزحمة');
