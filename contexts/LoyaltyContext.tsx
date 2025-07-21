/**
 * نظام التكامل الرئيسي لنقاط الولاء في IGTaxi
 * يربط نظام النقاط مع جميع أجزاء التطبيق
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import LoyaltyService, { UserLoyalty } from '@/utils/loyalty-service';
import LoyaltyManager from '@/utils/loyalty-manager-new';
import { useAuth } from '@/hooks/useAuth';

// Context للولاء
interface LoyaltyContextType {
  userLoyalty: UserLoyalty | null;
  isLoading: boolean;
  refreshLoyalty: () => Promise<void>;
  addPoints: (actionType: string, reason: string, points: number) => Promise<void>;
  canRedeemReward: (rewardId: string) => Promise<boolean>;
  getTierProgress: () => number;
  getPointsPreview: (actionType: string) => { points: number; description: string };
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

// Hook لاستخدام context
export const useLoyalty = () => {
  const context = useContext(LoyaltyContext);
  if (!context) {
    throw new Error('useLoyalty must be used within a LoyaltyProvider');
  }
  return context;
};

// Provider للولاء
export const LoyaltyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userLoyalty, setUserLoyalty] = useState<UserLoyalty | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const loyaltyManager = LoyaltyManager.getInstance();

  useEffect(() => {
    if (user?.id) {
      loadUserLoyalty();
    }
  }, [user?.id]);

  const loadUserLoyalty = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const loyalty = await LoyaltyService.getUserLoyalty(user.id);
      setUserLoyalty(loyalty);
    } catch (error) {
      console.error('خطأ في تحميل بيانات الولاء:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLoyalty = async () => {
    await loadUserLoyalty();
  };

  const addPoints = async (actionType: string, reason: string, points: number) => {
    if (!user?.id) return;

    try {
      await LoyaltyService.addPoints(user.id, actionType, reason, points);
      await refreshLoyalty();
    } catch (error) {
      console.error('خطأ في إضافة النقاط:', error);
      throw error;
    }
  };

  const canRedeemReward = async (rewardId: string): Promise<boolean> => {
    if (!user?.id) return false;
    return await loyaltyManager.canRedeemReward(user.id, rewardId);
  };

  const getTierProgress = (): number => {
    if (!userLoyalty) return 0;
    return userLoyalty.tier_progress;
  };

  const getPointsPreview = (actionType: string) => {
    return loyaltyManager.getPointsPreview(actionType);
  };

  const value: LoyaltyContextType = {
    userLoyalty,
    isLoading,
    refreshLoyalty,
    addPoints,
    canRedeemReward,
    getTierProgress,
    getPointsPreview,
  };

  return (
    <LoyaltyContext.Provider value={value}>
      {children}
    </LoyaltyContext.Provider>
  );
};

// Hook للتعامل مع أحداث الرحلات
export const useTripLoyalty = () => {
  const { user } = useAuth();
  const { refreshLoyalty } = useLoyalty();
  const loyaltyManager = LoyaltyManager.getInstance();

  const handleTripStarted = async (tripData: {
    tripId: string;
    driverId: string;
    customerId: string;
  }) => {
    // يمكن إضافة نقاط لبداية الرحلة إذا لزم الأمر
    console.log('Trip started:', tripData.tripId);
  };

  const handleTripCompleted = async (tripData: {
    tripId: string;
    driverId: string;
    customerId: string;
    duration: number;
    distance: number;
    amount: number;
    driverRating?: number;
    customerRating?: number;
  }) => {
    try {
      // نقاط للسائق
      await loyaltyManager.handleTripCompleted(tripData.driverId, {
        duration: tripData.duration,
        distance: tripData.distance,
        amount: tripData.amount,
        rating: tripData.driverRating,
      });

      // نقاط للعميل (أقل من السائق)
      await LoyaltyService.addPoints(
        tripData.customerId,
        'trip_completed',
        'رحلة مكتملة كعميل',
        5,
        {
          tripId: tripData.tripId,
          ratingValue: tripData.customerRating,
          amountPaid: tripData.amount,
        }
      );

      // تحديث البيانات
      await refreshLoyalty();
    } catch (error) {
      console.error('خطأ في معالجة نقاط الرحلة:', error);
    }
  };

  const handleTripCancelled = async (tripData: {
    tripId: string;
    driverId: string;
    customerId: string;
    reason: string;
  }) => {
    // يمكن خصم نقاط للإلغاء المتكرر
    console.log('Trip cancelled:', tripData.tripId, tripData.reason);
  };

  return {
    handleTripStarted,
    handleTripCompleted,
    handleTripCancelled,
  };
};

// Hook للتعامل مع التقييمات
export const useRatingLoyalty = () => {
  const { user } = useAuth();
  const { refreshLoyalty } = useLoyalty();

  const handleRatingGiven = async (ratingData: {
    ratedUserId: string;
    rating: number;
    tripId: string;
  }) => {
    try {
      if (!user?.id) return;

      // نقاط لكتابة التقييم
      await LoyaltyService.addPoints(
        user.id,
        'rating_given',
        'كتابة تقييم',
        10,
        {
          tripId: ratingData.tripId,
          ratingValue: ratingData.rating,
        }
      );

      // نقاط إضافية للمُقيم إذا كان التقييم عالي
      if (ratingData.rating >= 4.5) {
        await LoyaltyService.addPoints(
          ratingData.ratedUserId,
          'high_rating_received',
          `تقييم ممتاز: ${ratingData.rating} نجوم`,
          20,
          {
            tripId: ratingData.tripId,
            ratingValue: ratingData.rating,
          }
        );
      }

      await refreshLoyalty();
    } catch (error) {
      console.error('خطأ في معالجة نقاط التقييم:', error);
    }
  };

  return {
    handleRatingGiven,
  };
};

// Hook للتعامل مع الإحالات
export const useReferralLoyalty = () => {
  const { user } = useAuth();
  const { refreshLoyalty } = useLoyalty();
  const loyaltyManager = LoyaltyManager.getInstance();

  const handleUserRegistration = async (userData: {
    userId: string;
    userType: 'driver' | 'customer';
    referralCode?: string;
  }) => {
    try {
      // مكافأة التسجيل
      if (userData.userType === 'driver') {
        await loyaltyManager.handleDriverSignup(userData.userId);
      } else {
        await loyaltyManager.handleCustomerSignup(userData.userId);
      }

      // معالجة الإحالة إذا وُجدت
      if (userData.referralCode) {
        // البحث عن المستخدم باستخدام كود الإحالة (سيتم تنفيذه لاحقاً)
        try {
          // هنا يجب إضافة دالة للبحث بكود الإحالة في قاعدة البيانات
          console.log('معالجة كود الإحالة:', userData.referralCode);
        } catch (error) {
          console.error('خطأ في معالجة كود الإحالة:', error);
        }
      }

      await refreshLoyalty();
    } catch (error) {
      console.error('خطأ في معالجة نقاط التسجيل:', error);
    }
  };

  const generateReferralLink = async (): Promise<string | null> => {
    try {
      if (!user?.id) return null;

      const loyalty = await LoyaltyService.getUserLoyalty(user.id);
      if (!loyalty) return null;

      return `https://igtaxi.app/register?ref=${loyalty.referral_code}`;
    } catch (error) {
      console.error('خطأ في إنشاء رابط الإحالة:', error);
      return null;
    }
  };

  return {
    handleUserRegistration,
    generateReferralLink,
  };
};

// Hook للتحليلات والإحصائيات
export const useLoyaltyAnalytics = () => {
  const { user } = useAuth();
  const loyaltyManager = LoyaltyManager.getInstance();

  const generateReport = async (period: 'week' | 'month' | 'year' = 'month') => {
    if (!user?.id) return null;

    try {
      return await loyaltyManager.generateLoyaltyReport(user.id, period);
    } catch (error) {
      console.error('خطأ في إنشاء التقرير:', error);
      return null;
    }
  };

  const getTierInfo = async () => {
    if (!user?.id) return null;

    try {
      return await loyaltyManager.getUserTierInfo(user.id);
    } catch (error) {
      console.error('خطأ في جلب معلومات المستوى:', error);
      return null;
    }
  };

  return {
    generateReport,
    getTierInfo,
  };
};

// Hook للعمليات الدورية
export const useLoyaltyScheduler = () => {
  const { user } = useAuth();
  const loyaltyManager = LoyaltyManager.getInstance();

  const runDailyTasks = async () => {
    if (!user?.id) return;

    try {
      // معالجة المكافآت التلقائية
      await loyaltyManager.processAutomaticRewards(user.id);

      console.log('تم تشغيل المهام اليومية للولاء');
    } catch (error) {
      console.error('خطأ في تشغيل المهام اليومية:', error);
    }
  };

  return {
    runDailyTasks,
  };
};

// دالة مساعدة لتشغيل النظام عند بدء التطبيق
export const initializeLoyaltySystem = async () => {
  try {
    console.log('🎯 بدء تشغيل نظام النقاط والولاء...');
    console.log('📊 نظام النقاط والولاء IGTaxi - جاهز للاستخدام!');
  } catch (error) {
    console.error('❌ خطأ في تشغيل نظام النقاط:', error);
  }
};

// المكونات المساعدة لعرض النقاط
export const PointsBadge: React.FC<{
  points: number;
  size?: 'small' | 'medium' | 'large';
}> = ({ points, size = 'medium' }) => {
  const sizeStyles = {
    small: { fontSize: 12, padding: 4 },
    medium: { fontSize: 14, padding: 6 },
    large: { fontSize: 16, padding: 8 },
  };

  return (
    <View style={[
      {
        backgroundColor: '#FFD700',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 24,
      },
      sizeStyles[size]
    ]}>
      <Text style={{ fontWeight: 'bold', color: '#000' }}>
        {points} ⭐
      </Text>
    </View>
  );
};

export const TierBadge: React.FC<{
  tier: string;
}> = ({ tier }) => {
  const tierColors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    vip: '#9B59B6',
  };

  const tierIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    vip: '👑',
  };

  return (
    <View style={{
      backgroundColor: tierColors[tier as keyof typeof tierColors] || '#888',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      <Text style={{ fontSize: 12 }}>
        {tierIcons[tier as keyof typeof tierIcons]} {tier.toUpperCase()}
      </Text>
    </View>
  );
};

// تصدير جميع الواجهات والوظائف
export default {
  LoyaltyProvider,
  useLoyalty,
  useTripLoyalty,
  useRatingLoyalty,
  useReferralLoyalty,
  useLoyaltyAnalytics,
  useLoyaltyScheduler,
  initializeLoyaltySystem,
  PointsBadge,
  TierBadge,
};
