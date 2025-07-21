import { useState, useEffect, useCallback } from 'react';
import { 
  calculateFare, 
  estimateFare, 
  calculateSurgeMultiplier,
  calculateWaitingTime,
  mapFuelTypeToEnglish,
  formatFareBreakdown,
  FareCalculationInput, 
  FareCalculationResult,
  runFareCalculationTests
} from '@/utils/fareCalculator';
import { supabase } from '@/utils/supabase';
import { useAuth } from './useAuth';

interface TripFareData {
  tripId: string;
  driverId: string;
  customerId: string;
  distance_km: number;
  fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  trip_duration_minutes: number;
  average_speed_kmh: number;
  surge_level?: 'low' | 'normal' | 'high' | 'peak';
}

interface PricingConfig {
  id: number;
  config_name: string;
  base_fare: number;
  minimum_fare: number;
  waiting_rate_per_minute: number;
  app_commission_rate: number;
  fuel_rates: {
    petrol: number;
    diesel: number;
    hybrid: number;
    electric: number;
  };
  surge_settings: {
    max_multiplier: number;
    peak_hours: number[];
    demand_multipliers: {
      low: number;
      normal: number;
      high: number;
      peak: number;
    };
  };
  is_active: boolean;
}

export function useFareCalculator() {
  const { user } = useAuth();
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // تحميل إعدادات التسعير من قاعدة البيانات
  // =====================================================
  const loadPricingConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: configError } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (configError) throw configError;

      setPricingConfig(data);
    } catch (err) {
      console.error('Error loading pricing config:', err);
      setError('فشل في تحميل إعدادات التسعير');
    } finally {
      setLoading(false);
    }
  }, []);

  // تحميل الإعدادات عند بدء التشغيل
  useEffect(() => {
    loadPricingConfig();
  }, [loadPricingConfig]);

  // =====================================================
  // حساب تكلفة الرحلة
  // =====================================================
  const calculateTripFare = useCallback((input: FareCalculationInput): FareCalculationResult => {
    try {
      setError(null);
      return calculateFare(input);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حساب التكلفة';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // =====================================================
  // تقدير تكلفة الرحلة للعرض المبدئي
  // =====================================================
  const estimateTripFare = useCallback((
    distance_km: number,
    fuel_type: 'petrol' | 'diesel' | 'hybrid' | 'electric',
    current_hour?: number,
    demand_level?: 'low' | 'normal' | 'high' | 'peak'
  ) => {
    try {
      setError(null);
      return estimateFare(distance_km, fuel_type, current_hour, demand_level);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في تقدير التكلفة';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // =====================================================
  // حساب وحفظ تفاصيل الرحلة الكاملة
  // =====================================================
  const calculateAndSaveTripFare = useCallback(async (tripData: TripFareData): Promise<FareCalculationResult> => {
    try {
      setLoading(true);
      setError(null);

      // حساب وقت الانتظار
      const waiting_time = calculateWaitingTime(
        tripData.trip_duration_minutes,
        tripData.average_speed_kmh
      );

      // حساب مضاعف الازدحام
      const current_hour = new Date().getHours();
      const surge_multiplier = calculateSurgeMultiplier(
        current_hour,
        tripData.surge_level || 'normal'
      );

      // حساب التكلفة
      const fareResult = calculateFare({
        distance_km: tripData.distance_km,
        fuel_type: tripData.fuel_type,
        waiting_time_minutes: waiting_time,
        surge_multiplier
      });

      // حفظ تفاصيل التسعير في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          fuel_type: tripData.fuel_type,
          base_fare: fareResult.base_fare,
          distance_fare: fareResult.distance_fare,
          waiting_charges: fareResult.waiting_charges,
          surge_multiplier: surge_multiplier,
          surge_amount: fareResult.surge_amount,
          minimum_fare_applied: fareResult.minimum_fare_applied,
          subtotal: fareResult.subtotal,
          total_customer_fare: fareResult.total_fare,
          driver_earnings: fareResult.driver_earnings,
          app_commission: fareResult.app_commission,
          commission_rate: 0.10,
          waiting_time_minutes: waiting_time,
          average_speed_kmh: tripData.average_speed_kmh,
          fare_breakdown: fareResult.breakdown,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', tripData.tripId);

      if (updateError) throw updateError;

      return fareResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في حساب وحفظ تكلفة الرحلة';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // الحصول على إحصائيات السائق
  // =====================================================
  const getDriverStats = useCallback(async (
    driverId: string,
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: statsError } = await supabase
        .rpc('get_driver_stats', {
          p_driver_id: driverId,
          p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_end_date: endDate || new Date().toISOString().split('T')[0]
        });

      if (statsError) throw statsError;

      return data[0] || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب إحصائيات السائق';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // الحصول على إيرادات السائق اليومية
  // =====================================================
  const getDriverDailyEarnings = useCallback(async (
    driverId: string,
    date?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const targetDate = date || new Date().toISOString().split('T')[0];

      const { data, error: earningsError } = await supabase
        .from('driver_daily_earnings')
        .select('*')
        .eq('driver_id', driverId)
        .eq('earning_date', targetDate)
        .single();

      if (earningsError && earningsError.code !== 'PGRST116') {
        throw earningsError;
      }

      return data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب الإيرادات اليومية';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // الحصول على إيرادات السائق الشهرية
  // =====================================================
  const getDriverMonthlyEarnings = useCallback(async (
    driverId: string,
    year?: number,
    month?: number
  ) => {
    try {
      setLoading(true);
      setError(null);

      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || (currentDate.getMonth() + 1);

      const { data, error: earningsError } = await supabase
        .from('driver_monthly_earnings')
        .select('*')
        .eq('driver_id', driverId)
        .eq('year', targetYear)
        .eq('month', targetMonth)
        .single();

      if (earningsError && earningsError.code !== 'PGRST116') {
        throw earningsError;
      }

      return data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'خطأ في جلب الإيرادات الشهرية';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // تشغيل اختبارات نظام التسعير
  // =====================================================
  const runTests = useCallback(() => {
    console.log('🚀 تشغيل اختبارات نظام التسعير...');
    runFareCalculationTests();
  }, []);

  // =====================================================
  // تحويل نوع الوقود من العربية للإنجليزية
  // =====================================================
  const convertFuelType = useCallback((arabicFuelType: string) => {
    return mapFuelTypeToEnglish(arabicFuelType);
  }, []);

  // =====================================================
  // تنسيق تفصيل التكلفة للعرض
  // =====================================================
  const formatFareDetails = useCallback((
    result: FareCalculationResult,
    language: 'ar' | 'en' = 'ar'
  ) => {
    return formatFareBreakdown(result, language);
  }, []);

  return {
    // البيانات
    pricingConfig,
    loading,
    error,

    // الدوال الأساسية
    calculateTripFare,
    estimateTripFare,
    calculateAndSaveTripFare,

    // إحصائيات السائق
    getDriverStats,
    getDriverDailyEarnings,
    getDriverMonthlyEarnings,

    // دوال مساعدة
    convertFuelType,
    formatFareDetails,
    runTests,
    loadPricingConfig,

    // دوال منفصلة للاستخدام المباشر
    directCalculateFare: calculateFare,
    directEstimateFare: estimateFare,
    directCalculateSurge: calculateSurgeMultiplier,
    directCalculateWaiting: calculateWaitingTime,
  };
}

// =====================================================
// Hook مخصص لإحصائيات السائق المباشرة
// =====================================================
export function useDriverEarnings(driverId?: string) {
  const [dailyEarnings, setDailyEarnings] = useState<any>(null);
  const [monthlyEarnings, setMonthlyEarnings] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getDriverStats, getDriverDailyEarnings, getDriverMonthlyEarnings } = useFareCalculator();

  const loadDriverData = useCallback(async () => {
    if (!driverId) return;

    try {
      setLoading(true);
      setError(null);

      const [statsData, dailyData, monthlyData] = await Promise.all([
        getDriverStats(driverId),
        getDriverDailyEarnings(driverId),
        getDriverMonthlyEarnings(driverId)
      ]);

      setStats(statsData);
      setDailyEarnings(dailyData);
      setMonthlyEarnings(monthlyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل بيانات السائق');
    } finally {
      setLoading(false);
    }
  }, [driverId, getDriverStats, getDriverDailyEarnings, getDriverMonthlyEarnings]);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  return {
    dailyEarnings,
    monthlyEarnings,
    stats,
    loading,
    error,
    refresh: loadDriverData
  };
}
