import { useEffect, useRef } from 'react';
import { useActivityLogger } from '@/hooks/useAchievements';

interface ActivityTrackerProps {
  profileId: string;
  isEnabled?: boolean;
}

// مكون غير مرئي لتسجيل النشاطات تلقائياً
export const ActivityTracker: React.FC<ActivityTrackerProps> = ({
  profileId,
  isEnabled = true,
}) => {
  const { logActivity } = useActivityLogger(profileId);
  const lastActivity = useRef<{ [key: string]: number }>({});

  // دالة لتسجيل النشاط مع منع التكرار السريع
  const trackActivity = async (
    activityType: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak',
    context: Record<string, any> = {},
    cooldownMinutes: number = 1
  ) => {
    if (!isEnabled) return;

    const now = Date.now();
    const key = `${activityType}_${JSON.stringify(context)}`;
    const lastTime = lastActivity.current[key] || 0;
    const cooldownMs = cooldownMinutes * 60 * 1000;

    // تجنب التسجيل المكرر في فترة قصيرة
    if (now - lastTime < cooldownMs) {
      return;
    }

    try {
      await logActivity(activityType, {
        ...context,
        timestamp: new Date().toISOString(),
        source: 'auto_tracker',
      });
      lastActivity.current[key] = now;
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
    }
  };

  // تعريض دالة التسجيل للاستخدام الخارجي
  useEffect(() => {
    // إضافة المتتبع إلى النافذة العامة للوصول إليه
    if (typeof window !== 'undefined') {
      (window as any).achievementTracker = {
        trackTripCompleted: (tripId: string, rating?: number, duration?: number) =>
          trackActivity('trip_completed', { tripId, rating, duration }),
        
        trackRatingGiven: (tripId: string, rating: number, feedback?: string) =>
          trackActivity('rating_given', { tripId, rating, feedback }),
        
        trackReferralJoined: (referralCode: string, referredUserId?: string) =>
          trackActivity('referral_joined', { referralCode, referredUserId }),
        
        trackNoDelayStreak: (streakDays: number) =>
          trackActivity('no_delay_streak', { streakDays }),
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).achievementTracker;
      }
    };
  }, [isEnabled]);

  return null; // هذا المكون غير مرئي
};

// دوال مساعدة للاستخدام المباشر في المكونات الأخرى
export class AchievementTracker {
  private static profileId: string;
  private static logActivity: (
    activityType: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak',
    context: Record<string, any>
  ) => Promise<boolean>;

  static initialize(
    profileId: string,
    logActivity: (
      activityType: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak',
      context: Record<string, any>
    ) => Promise<boolean>
  ) {
    AchievementTracker.profileId = profileId;
    AchievementTracker.logActivity = logActivity;
  }

  static async trackTripCompleted(tripData: {
    tripId: string;
    duration?: number;
    distance?: number;
    rating?: number;
    fare?: number;
    driverDelay?: number;
  }) {
    if (!AchievementTracker.logActivity) {
      console.warn('Achievement tracker not initialized');
      return;
    }

    try {
      await AchievementTracker.logActivity('trip_completed', {
        tripId: tripData.tripId,
        duration: tripData.duration,
        distance: tripData.distance,
        rating: tripData.rating,
        fare: tripData.fare,
        driverDelay: tripData.driverDelay,
        timestamp: new Date().toISOString(),
      });

      // إذا لم يكن هناك تأخير، سجل إنجاز عدم التأخير أيضاً
      if (tripData.driverDelay !== undefined && tripData.driverDelay <= 5) {
        await AchievementTracker.logActivity('no_delay_streak', {
          tripId: tripData.tripId,
          delayMinutes: tripData.driverDelay,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('خطأ في تسجيل إكمال الرحلة:', error);
    }
  }

  static async trackRatingGiven(ratingData: {
    tripId: string;
    rating: number;
    feedback?: string;
    ratedUserId?: string;
  }) {
    if (!AchievementTracker.logActivity) {
      console.warn('Achievement tracker not initialized');
      return;
    }

    try {
      await AchievementTracker.logActivity('rating_given', {
        tripId: ratingData.tripId,
        rating: ratingData.rating,
        feedback: ratingData.feedback,
        ratedUserId: ratingData.ratedUserId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('خطأ في تسجيل التقييم:', error);
    }
  }

  static async trackReferralJoined(referralData: {
    referralCode: string;
    referredUserId?: string;
    referralType?: 'driver' | 'customer';
  }) {
    if (!AchievementTracker.logActivity) {
      console.warn('Achievement tracker not initialized');
      return;
    }

    try {
      await AchievementTracker.logActivity('referral_joined', {
        referralCode: referralData.referralCode,
        referredUserId: referralData.referredUserId,
        referralType: referralData.referralType,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('خطأ في تسجيل الإحالة:', error);
    }
  }

  static async trackCustomActivity(activityData: {
    type: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak';
    context: Record<string, any>;
  }) {
    if (!AchievementTracker.logActivity) {
      console.warn('Achievement tracker not initialized');
      return;
    }

    try {
      await AchievementTracker.logActivity(activityData.type, {
        ...activityData.context,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('خطأ في تسجيل النشاط المخصص:', error);
    }
  }
}

// مكون لتهيئة المتتبع في التطبيق
interface AchievementTrackerProviderProps {
  profileId: string;
  children: React.ReactNode;
}

export const AchievementTrackerProvider: React.FC<AchievementTrackerProviderProps> = ({
  profileId,
  children,
}) => {
  const { logActivity } = useActivityLogger(profileId);

  useEffect(() => {
    AchievementTracker.initialize(profileId, logActivity);
  }, [profileId, logActivity]);

  return (
    <>
      <ActivityTracker profileId={profileId} isEnabled={true} />
      {children}
    </>
  );
};

export default ActivityTracker;
