import { supabase } from '@/utils/supabase';

// أنواع البيانات لنظام النقاط
export interface UserLoyalty {
  profile_id: string;
  role: 'driver' | 'customer';
  total_points: number;
  available_points: number;
  used_points: number;
  tier_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'vip';
  tier_progress: number;
  referral_code: string;
  invited_by?: string;
  total_referrals: number;
  successful_referrals: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyLog {
  id: string;
  profile_id: string;
  action_type: string;
  reason: string;
  points_earned: number;
  points_spent: number;
  trip_id?: string;
  referral_profile_id?: string;
  rating_value?: number;
  amount_paid?: number;
  bonus_multiplier: number;
  expires_at?: string;
  status: 'active' | 'expired' | 'cancelled';
  metadata?: any;
  created_at: string;
}

export interface LoyaltyRule {
  id: string;
  rule_name: string;
  description: string;
  target_role: 'driver' | 'customer' | 'both';
  action_trigger: string;
  base_points: number;
  bonus_points: number;
  multiplier: number;
  min_requirement: number;
  max_per_day?: number;
  max_per_month?: number;
  tier_restrictions?: string[];
  expiry_days?: number;
  is_active: boolean;
}

export interface LoyaltyTier {
  id: string;
  tier_name: string;
  tier_level: number;
  min_points: number;
  tier_color: string;
  tier_icon: string;
  benefits: any;
  point_multiplier: number;
  discount_percentage: number;
  priority_booking: boolean;
  free_cancellation: boolean;
}

export interface LoyaltyReward {
  id: string;
  reward_name: string;
  description: string;
  reward_type: 'free_trip' | 'discount' | 'credit' | 'upgrade' | 'gift';
  cost_points: number;
  reward_value?: number;
  max_uses_per_user: number;
  validity_days: number;
  tier_requirements?: string[];
  role_restrictions: 'driver' | 'customer' | 'both';
  is_active: boolean;
  stock_quantity?: number;
  image_url?: string;
  terms_conditions?: string;
}

export interface LoyaltyRedemption {
  id: string;
  profile_id: string;
  reward_id: string;
  points_spent: number;
  status: 'pending' | 'approved' | 'used' | 'expired' | 'cancelled';
  redemption_code: string;
  expires_at?: string;
  used_at?: string;
  trip_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralData {
  id: string;
  referrer_id: string;
  referee_id: string;
  referral_code: string;
  signup_date: string;
  first_trip_date?: string;
  status: 'pending' | 'completed' | 'expired';
  referrer_points: number;
  referee_points: number;
  bonus_tier?: string;
  metadata?: any;
}

export class LoyaltyService {
  
  /**
   * الحصول على بيانات نقاط المستخدم
   */
  static async getUserLoyalty(profileId: string): Promise<UserLoyalty | null> {
    try {
      const { data, error } = await supabase
        .from('user_loyalty')
        .select('*')
        .eq('profile_id', profileId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('خطأ في جلب بيانات النقاط:', error);
      return null;
    }
  }

  /**
   * الحصول على سجل النقاط للمستخدم
   */
  static async getLoyaltyLogs(
    profileId: string, 
    limit: number = 50,
    offset: number = 0
  ): Promise<LoyaltyLog[]> {
    try {
      const { data, error } = await supabase
        .from('loyalty_logs')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('خطأ في جلب سجل النقاط:', error);
      return [];
    }
  }

  /**
   * إضافة نقاط للمستخدم
   */
  static async addPoints(
    profileId: string,
    actionType: string,
    reason: string,
    points: number,
    options?: {
      tripId?: string;
      ratingValue?: number;
      amountPaid?: number;
      referralProfileId?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('add_loyalty_points', {
        p_profile_id: profileId,
        p_action_type: actionType,
        p_reason: reason,
        p_points: points,
        p_trip_id: options?.tripId || null,
        p_rating_value: options?.ratingValue || null,
        p_amount_paid: options?.amountPaid || null
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('خطأ في إضافة النقاط:', error);
      return false;
    }
  }

  /**
   * الحصول على جميع المكافآت المتاحة
   */
  static async getAvailableRewards(
    role?: 'driver' | 'customer'
  ): Promise<LoyaltyReward[]> {
    try {
      let query = supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('is_active', true);

      if (role) {
        query = query.in('role_restrictions', [role, 'both']);
      }

      const { data, error } = await query.order('cost_points', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('خطأ في جلب المكافآت:', error);
      return [];
    }
  }

  /**
   * استبدال مكافأة
   */
  static async redeemReward(
    profileId: string,
    rewardId: string
  ): Promise<{ success: boolean; redemptionCode?: string; error?: string }> {
    try {
      // التحقق من وجود نقاط كافية
      const userLoyalty = await this.getUserLoyalty(profileId);
      if (!userLoyalty) {
        return { success: false, error: 'المستخدم غير موجود' };
      }

      // الحصول على تفاصيل المكافأة
      const { data: reward, error: rewardError } = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('id', rewardId)
        .eq('is_active', true)
        .single();

      if (rewardError || !reward) {
        return { success: false, error: 'المكافأة غير متاحة' };
      }

      if (userLoyalty.available_points < reward.cost_points) {
        return { success: false, error: 'نقاط غير كافية' };
      }

      // إنشاء كود استبدال
      const redemptionCode = this.generateRedemptionCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + reward.validity_days);

      // إنشاء عملية الاستبدال
      const { data: redemption, error: redemptionError } = await supabase
        .from('loyalty_redemptions')
        .insert({
          profile_id: profileId,
          reward_id: rewardId,
          points_spent: reward.cost_points,
          redemption_code: redemptionCode,
          expires_at: expiresAt.toISOString(),
          status: 'approved'
        })
        .select()
        .single();

      if (redemptionError) throw redemptionError;

      // خصم النقاط
      const { error: updateError } = await supabase
        .from('user_loyalty')
        .update({
          available_points: userLoyalty.available_points - reward.cost_points,
          used_points: userLoyalty.used_points + reward.cost_points,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', profileId);

      if (updateError) throw updateError;

      // تسجيل العملية في السجل
      await supabase
        .from('loyalty_logs')
        .insert({
          profile_id: profileId,
          action_type: 'reward_redeemed',
          reason: `استبدال مكافأة: ${reward.reward_name}`,
          points_spent: reward.cost_points,
          metadata: { reward_id: rewardId, redemption_code: redemptionCode }
        });

      return { success: true, redemptionCode };
    } catch (error) {
      console.error('خطأ في استبدال المكافأة:', error);
      return { success: false, error: 'حدث خطأ في العملية' };
    }
  }

  /**
   * الحصول على مكافآت المستخدم المستبدلة
   */
  static async getUserRedemptions(profileId: string): Promise<LoyaltyRedemption[]> {
    try {
      const { data, error } = await supabase
        .from('loyalty_redemptions')
        .select(`
          *,
          loyalty_rewards (
            reward_name,
            description,
            reward_type,
            reward_value,
            image_url
          )
        `)
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('خطأ في جلب المكافآت المستبدلة:', error);
      return [];
    }
  }

  /**
   * إنشاء دعوة جديدة
   */
  static async createReferral(
    referrerId: string,
    refereeId: string,
    referralCode: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('referral_system')
        .insert({
          referrer_id: referrerId,
          referee_id: refereeId,
          referral_code: referralCode,
          status: 'pending'
        });

      if (error) throw error;

      // تحديث عدد الدعوات للمدعي
      const { data: currentUser } = await supabase
        .from('user_loyalty')
        .select('total_referrals')
        .eq('profile_id', referrerId)
        .single();

      await supabase
        .from('user_loyalty')
        .update({
          total_referrals: (currentUser?.total_referrals || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', referrerId);

      return true;
    } catch (error) {
      console.error('خطأ في إنشاء الدعوة:', error);
      return false;
    }
  }

  /**
   * إتمام دعوة (عند أول رحلة للمدعو)
   */
  static async completeReferral(refereeId: string): Promise<boolean> {
    try {
      // البحث عن الدعوة المعلقة
      const { data: referral, error: referralError } = await supabase
        .from('referral_system')
        .select('*')
        .eq('referee_id', refereeId)
        .eq('status', 'pending')
        .single();

      if (referralError || !referral) {
        return false;
      }

      // تحديث حالة الدعوة
      await supabase
        .from('referral_system')
        .update({
          status: 'completed',
          first_trip_date: new Date().toISOString(),
          referrer_points: 100,
          referee_points: 50,
          updated_at: new Date().toISOString()
        })
        .eq('id', referral.id);

      // منح النقاط للمدعي
      await this.addPoints(
        referral.referrer_id,
        'referral_completed',
        'دعوة صديق مكتملة',
        100,
        { referralProfileId: refereeId }
      );

      // منح النقاط للمدعو
      await this.addPoints(
        refereeId,
        'referral_bonus',
        'مكافأة الدعوة',
        50,
        { referralProfileId: referral.referrer_id }
      );

      // تحديث عدد الدعوات الناجحة
      const { data: referrerData } = await supabase
        .from('user_loyalty')
        .select('successful_referrals')
        .eq('profile_id', referral.referrer_id)
        .single();

      await supabase
        .from('user_loyalty')
        .update({
          successful_referrals: (referrerData?.successful_referrals || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', referral.referrer_id);

      return true;
    } catch (error) {
      console.error('خطأ في إتمام الدعوة:', error);
      return false;
    }
  }

  /**
   * التحقق من صحة كود الدعوة
   */
  static async validateReferralCode(code: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_loyalty')
        .select('profile_id')
        .eq('referral_code', code)
        .single();

      if (error || !data) {
        return null;
      }

      return data.profile_id;
    } catch (error) {
      console.error('خطأ في التحقق من كود الدعوة:', error);
      return null;
    }
  }

  /**
   * الحصول على إحصائيات النقاط
   */
  static async getLoyaltyStats(profileId: string): Promise<{
    totalEarned: number;
    totalSpent: number;
    currentStreak: number;
    monthlyEarned: number;
    referralCount: number;
  }> {
    try {
      const user = await this.getUserLoyalty(profileId);
      
      // إحصائيات الشهر الحالي
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyLogs } = await supabase
        .from('loyalty_logs')
        .select('points_earned')
        .eq('profile_id', profileId)
        .gte('created_at', startOfMonth.toISOString());

      const monthlyEarned = monthlyLogs?.reduce(
        (sum, log) => sum + (log.points_earned || 0), 0
      ) || 0;

      return {
        totalEarned: user?.total_points || 0,
        totalSpent: user?.used_points || 0,
        currentStreak: 0, // يمكن حسابه لاحقاً
        monthlyEarned,
        referralCount: user?.successful_referrals || 0
      };
    } catch (error) {
      console.error('خطأ في جلب إحصائيات النقاط:', error);
      return {
        totalEarned: 0,
        totalSpent: 0,
        currentStreak: 0,
        monthlyEarned: 0,
        referralCount: 0
      };
    }
  }

  /**
   * معالجة أحداث كسب النقاط حسب نوع النشاط
   */
  static async handleLoyaltyEvent(
    profileId: string,
    eventType: string,
    eventData: any
  ): Promise<boolean> {
    try {
      switch (eventType) {
        case 'trip_completed':
          await this.handleTripCompletion(profileId, eventData);
          break;
        case 'payment_made':
          await this.handlePayment(profileId, eventData);
          break;
        case 'rating_given':
          await this.handleRatingGiven(profileId, eventData);
          break;
        case 'rating_received':
          await this.handleRatingReceived(profileId, eventData);
          break;
        case 'app_shared':
          await this.handleAppShare(profileId);
          break;
        case 'milestone_reached':
          await this.handleMilestone(profileId, eventData);
          break;
        default:
          console.log('نوع حدث غير معروف:', eventType);
      }
      return true;
    } catch (error) {
      console.error('خطأ في معالجة حدث النقاط:', error);
      return false;
    }
  }

  /**
   * معالجة إتمام الرحلة
   */
  private static async handleTripCompletion(profileId: string, eventData: any) {
    const { tripId, isFirstTrip, userRole, tripCount } = eventData;
    
    if (isFirstTrip) {
      await this.addPoints(
        profileId,
        'first_trip_completed',
        'أول رحلة ناجحة',
        50,
        { tripId }
      );

      // التحقق من إتمام دعوة
      if (userRole === 'customer') {
        await this.completeReferral(profileId);
      }
    } else {
      await this.addPoints(
        profileId,
        'trip_completed',
        'رحلة مكتملة',
        10,
        { tripId }
      );
    }

    // مكافآت المعالم للسائقين
    if (userRole === 'driver' && tripCount % 10 === 0) {
      await this.addPoints(
        profileId,
        'milestone_trips',
        `إتمام ${tripCount} رحلة`,
        100,
        { tripId }
      );
    }
  }

  /**
   * معالجة الدفع
   */
  private static async handlePayment(profileId: string, eventData: any) {
    const { amount, tripId } = eventData;
    const points = Math.floor(amount * 10); // 10 نقاط لكل دينار
    
    await this.addPoints(
      profileId,
      'payment_made',
      `دفع ${amount} دينار`,
      points,
      { tripId, amountPaid: amount }
    );
  }

  /**
   * معالجة التقييم المُعطى
   */
  private static async handleRatingGiven(profileId: string, eventData: any) {
    const { rating, tripId } = eventData;
    
    if (rating >= 4) {
      await this.addPoints(
        profileId,
        'rating_given',
        `تقييم ${rating} نجوم`,
        15,
        { tripId, ratingValue: rating }
      );
    }
  }

  /**
   * معالجة التقييم المُستقبل (للسائقين)
   */
  private static async handleRatingReceived(profileId: string, eventData: any) {
    const { rating, tripId } = eventData;
    
    if (rating === 5) {
      await this.addPoints(
        profileId,
        'high_rating_received',
        'تقييم 5 نجوم من العميل',
        20,
        { tripId, ratingValue: rating }
      );
    }
  }

  /**
   * معالجة مشاركة التطبيق
   */
  private static async handleAppShare(profileId: string) {
    await this.addPoints(
      profileId,
      'app_shared',
      'مشاركة التطبيق',
      25
    );
  }

  /**
   * معالجة المعالم والإنجازات
   */
  private static async handleMilestone(profileId: string, eventData: any) {
    const { milestoneType, value } = eventData;
    
    switch (milestoneType) {
      case 'no_delays_streak':
        await this.addPoints(
          profileId,
          'no_delays_streak',
          `${value} أيام بلا تأخير`,
          50
        );
        break;
      case 'weekly_activity':
        await this.addPoints(
          profileId,
          'weekly_activity',
          'نشاط أسبوعي مستمر',
          150
        );
        break;
    }
  }

  /**
   * إنشاء كود استبدال فريد
   */
  private static generateRedemptionCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'IGT-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * الحصول على مستويات الولاء
   */
  static async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    try {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('خطأ في جلب مستويات الولاء:', error);
      return [];
    }
  }

  /**
   * التحقق من أهلية المكافأة
   */
  static async checkRewardEligibility(
    profileId: string, 
    rewardId: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const user = await this.getUserLoyalty(profileId);
      const reward = await supabase
        .from('loyalty_rewards')
        .select('*')
        .eq('id', rewardId)
        .single();

      if (!user || !reward.data) {
        return { eligible: false, reason: 'بيانات غير صحيحة' };
      }

      if (user.available_points < reward.data.cost_points) {
        return { eligible: false, reason: 'نقاط غير كافية' };
      }

      if (reward.data.tier_requirements?.length > 0) {
        if (!reward.data.tier_requirements.includes(user.tier_level)) {
          return { eligible: false, reason: 'مستوى الولاء غير كافي' };
        }
      }

      if (reward.data.role_restrictions !== 'both' && 
          reward.data.role_restrictions !== user.role) {
        return { eligible: false, reason: 'المكافأة غير متاحة لدورك' };
      }

      return { eligible: true };
    } catch (error) {
      console.error('خطأ في التحقق من أهلية المكافأة:', error);
      return { eligible: false, reason: 'خطأ في النظام' };
    }
  }
}

export default LoyaltyService;
