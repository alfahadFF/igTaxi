import { supabase } from '@/utils/supabase';

// أنواع البيانات لنظام الإنجازات الذكية
export interface Achievement {
  id: string;
  achievement_key: string;
  title: string;
  description: string;
  icon: string;
  category: 'driving' | 'referral' | 'rating' | 'consistency';
  target_role: 'driver' | 'customer' | 'both';
  condition_type: string;
  condition_value: number;
  condition_period?: string;
  reward_type: string;
  reward_value: any;
  reward_duration_hours?: number;
  max_claims_per_user: number;
  cooldown_days: number;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  profile_id: string;
  achievement_id: string;
  achieved_at: string;
  progress_value: number;
  is_completed: boolean;
  reward_claimed: boolean;
  reward_expires_at?: string;
  reward_used: boolean;
  reward_used_at?: string;
  achievement?: Achievement; // joined data
}

export interface UserBadge {
  id: string;
  profile_id: string;
  badge_level_id: string;
  current_trips: number;
  earned_at: string;
  is_current: boolean;
  total_rating_sum: number;
  total_ratings_count: number;
  total_successful_referrals: number;
  streak_days: number;
  badge_level?: BadgeLevel; // joined data
}

export interface BadgeLevel {
  id: string;
  level_name: string;
  level_order: number;
  min_trips: number;
  max_trips?: number;
  badge_icon: string;
  badge_color: string;
  display_name: string;
  benefits: any;
}

export interface ActiveReward {
  id: string;
  profile_id: string;
  user_achievement_id: string;
  reward_type: string;
  reward_details: any;
  expires_at: string;
  is_used: boolean;
  used_at?: string;
  usage_details?: any;
  created_at: string;
}

export interface AchievementProgress {
  id: string;
  profile_id: string;
  achievement_id: string;
  current_value: number;
  last_updated: string;
  reset_date?: string;
  metadata: any;
  achievement?: Achievement; // joined data
}

class SmartAchievementsService {
  
  /**
   * تسجيل نشاط جديد (سيؤدي لمعالجة الإنجازات تلقائياً)
   */
  static async logActivity(
    profileId: string,
    activityType: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak',
    details: {
      tripId?: string;
      rating?: number;
      relatedProfileId?: string;
      streakDays?: number;
      [key: string]: any;
    } = {}
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('log_activity_and_process_achievements', {
        user_profile_id: profileId,
        activity_type_param: activityType,
        activity_details_param: details,
        trip_id_param: details.tripId || null,
        rating_value_param: details.rating || null,
        related_profile_id_param: details.relatedProfileId || null
      });

      if (error) {
        console.error('خطأ في تسجيل النشاط:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
      return false;
    }
  }

  /**
   * الحصول على شارة المستخدم الحالية
   */
  static async getUserBadge(profileId: string): Promise<UserBadge | null> {
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select(`
          *,
          badge_level:badge_levels(*)
        `)
        .eq('profile_id', profileId)
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('خطأ في جلب الشارة:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('خطأ في جلب الشارة:', error);
      return null;
    }
  }

  /**
   * الحصول على جميع إنجازات المستخدم
   */
  static async getUserAchievements(profileId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('profile_id', profileId)
        .eq('is_completed', true)
        .order('achieved_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب الإنجازات:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في جلب الإنجازات:', error);
      return [];
    }
  }

  /**
   * الحصول على المكافآت النشطة للمستخدم
   */
  static async getActiveRewards(profileId: string): Promise<ActiveReward[]> {
    try {
      const { data, error } = await supabase
        .from('active_rewards')
        .select('*')
        .eq('profile_id', profileId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب المكافآت:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في جلب المكافآت:', error);
      return [];
    }
  }

  /**
   * استخدام مكافأة
   */
  static async useReward(
    profileId: string, 
    rewardId: string, 
    usageDetails: any = {}
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const { data, error } = await supabase.rpc('use_reward', {
        user_profile_id: profileId,
        reward_id: rewardId,
        usage_details_param: usageDetails
      });

      if (error) {
        console.error('خطأ في استخدام المكافأة:', error);
        return { success: false, message: 'حدث خطأ في استخدام المكافأة' };
      }

      if (!data) {
        return { success: false, message: 'المكافأة غير متاحة أو منتهية الصلاحية' };
      }

      return { success: true, message: 'تم استخدام المكافأة بنجاح' };
    } catch (error) {
      console.error('خطأ في استخدام المكافأة:', error);
      return { success: false, message: 'حدث خطأ غير متوقع' };
    }
  }

  /**
   * الحصول على تقدم المستخدم في الإنجازات
   */
  static async getAchievementProgress(profileId: string): Promise<AchievementProgress[]> {
    try {
      const { data, error } = await supabase
        .from('achievement_progress')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('profile_id', profileId);

      if (error) {
        console.error('خطأ في جلب التقدم:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في جلب التقدم:', error);
      return [];
    }
  }

  /**
   * الحصول على جميع الإنجازات المتاحة
   */
  static async getAvailableAchievements(role?: 'driver' | 'customer'): Promise<Achievement[]> {
    try {
      let query = supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true);

      if (role) {
        query = query.in('target_role', [role, 'both']);
      }

      const { data, error } = await query.order('category');

      if (error) {
        console.error('خطأ في جلب الإنجازات المتاحة:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في جلب الإنجازات المتاحة:', error);
      return [];
    }
  }

  /**
   * الحصول على جميع مستويات الشارات
   */
  static async getBadgeLevels(): Promise<BadgeLevel[]> {
    try {
      const { data, error } = await supabase
        .from('badge_levels')
        .select('*')
        .order('level_order');

      if (error) {
        console.error('خطأ في جلب مستويات الشارات:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في جلب مستويات الشارات:', error);
      return [];
    }
  }

  /**
   * الحصول على إحصائيات المستخدم
   */
  static async getUserStats(profileId: string): Promise<{
    totalTrips: number;
    averageRating: number;
    totalReferrals: number;
    currentStreak: number;
    completedAchievements: number;
    activeRewards: number;
  }> {
    try {
      // الحصول على إحصائيات من activity_log
      const { data: activityStats } = await supabase
        .from('activity_log')
        .select('activity_type, rating_value')
        .eq('profile_id', profileId);

      const trips = activityStats?.filter(a => a.activity_type === 'trip_completed') || [];
      const ratings = trips.filter(t => t.rating_value).map(t => t.rating_value);
      const referrals = activityStats?.filter(a => a.activity_type === 'referral_completed') || [];

      // الحصول على عدد الإنجازات المكتملة
      const { count: achievementsCount } = await supabase
        .from('user_achievements')
        .select('id', { count: 'exact' })
        .eq('profile_id', profileId)
        .eq('is_completed', true);

      // الحصول على عدد المكافآت النشطة
      const { count: rewardsCount } = await supabase
        .from('active_rewards')
        .select('id', { count: 'exact' })
        .eq('profile_id', profileId)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString());

      // الحصول على أيام الانضباط الحالية من الشارة
      const { data: badge } = await supabase
        .from('user_badges')
        .select('streak_days')
        .eq('profile_id', profileId)
        .eq('is_current', true)
        .single();

      return {
        totalTrips: trips.length,
        averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        totalReferrals: referrals.length,
        currentStreak: badge?.streak_days || 0,
        completedAchievements: achievementsCount || 0,
        activeRewards: rewardsCount || 0,
      };
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
      return {
        totalTrips: 0,
        averageRating: 0,
        totalReferrals: 0,
        currentStreak: 0,
        completedAchievements: 0,
        activeRewards: 0,
      };
    }
  }

  /**
   * دوال مساعدة للتعامل مع الأنشطة الشائعة
   */

  // تسجيل إكمال رحلة
  static async recordTripCompletion(
    profileId: string,
    tripId: string,
    rating?: number
  ): Promise<boolean> {
    return this.logActivity(profileId, 'trip_completed', {
      tripId,
      rating,
      completedAt: new Date().toISOString()
    });
  }

  // تسجيل إحالة ناجحة
  static async recordSuccessfulReferral(
    referrerProfileId: string,
    newUserProfileId: string
  ): Promise<boolean> {
    return this.logActivity(referrerProfileId, 'referral_joined', {
      relatedProfileId: newUserProfileId,
      referralDate: new Date().toISOString()
    });
  }

  // تسجيل تقييم
  static async recordRatingGiven(
    profileId: string,
    tripId: string,
    rating: number,
    ratedProfileId: string
  ): Promise<boolean> {
    return this.logActivity(profileId, 'rating_given', {
      tripId,
      rating,
      relatedProfileId: ratedProfileId
    });
  }

  // تسجيل أيام الانضباط
  static async recordConsistencyStreak(
    profileId: string,
    streakDays: number
  ): Promise<boolean> {
    return this.logActivity(profileId, 'no_delay_streak', {
      streakDays,
      date: new Date().toISOString()
    });
  }

  /**
   * دوال للإدارة والصيانة
   */

  // تنظيف المكافآت المنتهية
  static async cleanupExpiredRewards(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_rewards');

      if (error) {
        console.error('خطأ في تنظيف المكافآت:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('خطأ في تنظيف المكافآت:', error);
      return 0;
    }
  }

  // الحصول على تقرير أداء النظام
  static async getSystemPerformance(): Promise<{
    totalUsers: number;
    totalAchievements: number;
    activeRewards: number;
    expiredRewards: number;
  }> {
    try {
      const [
        { count: usersCount },
        { count: achievementsCount },
        { count: activeRewardsCount },
        { count: expiredRewardsCount }
      ] = await Promise.all([
        supabase.from('user_badges').select('id', { count: 'exact' }),
        supabase.from('user_achievements').select('id', { count: 'exact' }).eq('is_completed', true),
        supabase.from('active_rewards').select('id', { count: 'exact' }).eq('is_used', false).gt('expires_at', new Date().toISOString()),
        supabase.from('active_rewards').select('id', { count: 'exact' }).eq('is_used', false).lt('expires_at', new Date().toISOString())
      ]);

      return {
        totalUsers: usersCount || 0,
        totalAchievements: achievementsCount || 0,
        activeRewards: activeRewardsCount || 0,
        expiredRewards: expiredRewardsCount || 0,
      };
    } catch (error) {
      console.error('خطأ في جلب أداء النظام:', error);
      return {
        totalUsers: 0,
        totalAchievements: 0,
        activeRewards: 0,
        expiredRewards: 0,
      };
    }
  }

  /**
   * دوال مساعدة للواجهة
   */

  // تنسيق وقت انتهاء الصلاحية
  static formatTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'منتهية الصلاحية';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} يوم`;
    } else if (hours > 0) {
      return `${hours} ساعة`;
    } else {
      return `${minutes} دقيقة`;
    }
  }

  // تنسيق نوع المكافأة
  static formatRewardType(rewardType: string): string {
    const types: { [key: string]: string } = {
      'badge_plus_support': 'شارة + دعم أولوية',
      'commission_discount': 'خصم على العمولة',
      'free_trip_voucher': 'قسيمة رحلة مجانية',
      'temporary_upgrade': 'ترقية مؤقتة',
      'discount_voucher': 'قسيمة خصم',
      'upgrade_voucher': 'قسيمة ترقية'
    };
    return types[rewardType] || rewardType;
  }

  // تنسيق تفاصيل المكافأة
  static formatRewardDetails(rewardType: string, rewardDetails: any): string {
    switch (rewardType) {
      case 'commission_discount':
        return `خصم ${rewardDetails.discount_percent}% على العمولة`;
      case 'free_trip_voucher':
        return `${rewardDetails.trips_count} رحلة مجانية (حد أقصى ${rewardDetails.max_distance} كم)`;
      case 'discount_voucher':
        return `خصم ${rewardDetails.discount_percent}% (حد أقصى ${rewardDetails.max_amount} دينار)`;
      case 'upgrade_voucher':
        return `ترقية ${rewardDetails.upgrade_type} لـ ${rewardDetails.trips_count} رحلات`;
      case 'temporary_upgrade':
        return `ترقية مؤقتة بمزايا: ${rewardDetails.benefits?.join(', ') || 'مزايا خاصة'}`;
      default:
        return 'مكافأة خاصة';
    }
  }
}

export default SmartAchievementsService;
