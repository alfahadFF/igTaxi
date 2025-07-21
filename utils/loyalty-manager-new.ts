import LoyaltyService from '../utils/loyalty-service';

export class LoyaltyManager {
  private static instance: LoyaltyManager;

  private constructor() {}

  public static getInstance(): LoyaltyManager {
    if (!LoyaltyManager.instance) {
      LoyaltyManager.instance = new LoyaltyManager();
    }
    return LoyaltyManager.instance;
  }

  /**
   * Handle loyalty events automatically during app usage
   */
  async handleTripCompleted(profileId: string, tripDetails: {
    duration: number; // in minutes
    distance: number; // in km
    amount: number;   // trip cost
    rating?: number;  // driver/customer rating
  }) {
    try {
      // Basic trip completion points
      await LoyaltyService.addPoints(
        profileId,
        'trip_completed',
        'رحلة مكتملة',
        10,
        {}
      );

      // Bonus for high ratings
      if (tripDetails.rating && tripDetails.rating >= 4.5) {
        await LoyaltyService.addPoints(
          profileId,
          'high_rating_received',
          `تقييم عالي: ${tripDetails.rating} نجوم`,
          20,
          { ratingValue: tripDetails.rating }
        );
      }

      // Distance bonus
      if (tripDetails.distance > 10) {
        await LoyaltyService.addPoints(
          profileId,
          'long_distance_trip',
          `رحلة طويلة: ${tripDetails.distance} كم`,
          15,
          {}
        );
      }

      // Check for milestones
      await this.checkTripMilestones(profileId);

    } catch (error) {
      console.error('خطأ في معالجة نقاط الرحلة:', error);
    }
  }

  async handleDriverSignup(profileId: string) {
    try {
      await LoyaltyService.addPoints(
        profileId,
        'signup_bonus',
        'مكافأة التسجيل كسائق',
        100,
        {}
      );
    } catch (error) {
      console.error('خطأ في مكافأة التسجيل:', error);
    }
  }

  async handleCustomerSignup(profileId: string) {
    try {
      await LoyaltyService.addPoints(
        profileId,
        'signup_bonus',
        'مكافأة التسجيل كعميل',
        50,
        {}
      );
    } catch (error) {
      console.error('خطأ في مكافأة التسجيل:', error);
    }
  }

  async handleReferralComplete(referrerProfileId: string, referredProfileId: string, userType: 'driver' | 'customer') {
    try {
      const referralPoints = userType === 'driver' ? 200 : 100;
      
      // Points for referrer
      await LoyaltyService.addPoints(
        referrerProfileId,
        'referral_bonus',
        `دعوة ${userType === 'driver' ? 'سائق' : 'عميل'} جديد`,
        referralPoints,
        { referralProfileId: referredProfileId }
      );

      // Smaller bonus for referred user
      await LoyaltyService.addPoints(
        referredProfileId,
        'referred_bonus',
        'مكافأة الانضمام عبر دعوة',
        25,
        { referralProfileId: referrerProfileId }
      );

    } catch (error) {
      console.error('خطأ في مكافأة الدعوة:', error);
    }
  }

  async handleWeeklyActivity(profileId: string, tripsThisWeek: number) {
    try {
      if (tripsThisWeek >= 10) {
        await LoyaltyService.addPoints(
          profileId,
          'weekly_activity',
          `نشاط أسبوعي: ${tripsThisWeek} رحلة`,
          50,
          {}
        );
      }
    } catch (error) {
      console.error('خطأ في مكافأة النشاط الأسبوعي:', error);
    }
  }

  async handleNoDelaysStreak(profileId: string, streakDays: number) {
    try {
      if (streakDays >= 3) {
        const points = Math.min(streakDays * 10, 100); // Max 100 points
        await LoyaltyService.addPoints(
          profileId,
          'no_delays_streak',
          `انضباط ${streakDays} أيام متتالية`,
          points,
          {}
        );
      }
    } catch (error) {
      console.error('خطأ في مكافأة الانضباط:', error);
    }
  }

  async handleSpecialEvent(profileId: string, eventType: string, points: number, description: string) {
    try {
      await LoyaltyService.addPoints(
        profileId,
        'special_event',
        description,
        points,
        {}
      );
    } catch (error) {
      console.error('خطأ في مكافأة الحدث الخاص:', error);
    }
  }

  private async checkTripMilestones(profileId: string) {
    try {
      const stats = await LoyaltyService.getLoyaltyStats(profileId);
      // Use totalEarned as a proxy for trip count (assuming 10 points per trip)
      const estimatedTrips = Math.floor(stats.totalEarned / 10);

      // Milestone rewards
      const milestones = [10, 25, 50, 100, 200, 500, 1000];
      
      for (const milestone of milestones) {
        if (estimatedTrips === milestone) {
          const points = milestone * 2; // 2 points per milestone trip
          await LoyaltyService.addPoints(
            profileId,
            'milestone_trips',
            `معلم ${milestone} رحلة مكتملة`,
            points,
            {}
          );
          break;
        }
      }
    } catch (error) {
      console.error('خطأ في فحص معالم الرحلات:', error);
    }
  }

  /**
   * Helper methods for checking eligibility and status
   */
  async canRedeemReward(profileId: string, rewardId: string): Promise<boolean> {
    try {
      const eligibility = await LoyaltyService.checkRewardEligibility(profileId, rewardId);
      return eligibility.eligible;
    } catch (error) {
      console.error('خطأ في فحص أهلية المكافأة:', error);
      return false;
    }
  }

  async getUserTierInfo(profileId: string) {
    try {
      const loyalty = await LoyaltyService.getUserLoyalty(profileId);
      if (!loyalty) return null;
      
      const tiers = await LoyaltyService.getLoyaltyTiers();
      
      const currentTier = tiers.find(tier => tier.tier_name === loyalty.tier_level);
      const nextTier = tiers.find(tier => tier.tier_level === (currentTier?.tier_level || 0) + 1);
      
      return {
        current: currentTier,
        next: nextTier,
        progress: this.calculateTierProgress(loyalty.total_points, currentTier, nextTier)
      };
    } catch (error) {
      console.error('خطأ في جلب معلومات المستوى:', error);
      return null;
    }
  }

  private calculateTierProgress(totalPoints: number, currentTier: any, nextTier: any): number {
    if (!nextTier || !currentTier) return 100;
    
    const pointsNeeded = nextTier.min_points - currentTier.min_points;
    const currentProgress = totalPoints - currentTier.min_points;
    
    return Math.min(Math.max((currentProgress / pointsNeeded) * 100, 0), 100);
  }

  /**
   * Automated loyalty rules execution
   */
  async processAutomaticRewards(profileId: string) {
    try {
      // Check and apply automatic loyalty rules
      await LoyaltyService.handleLoyaltyEvent(profileId, 'daily_check', {});
      
      // Process any pending tier upgrades
      const loyalty = await LoyaltyService.getUserLoyalty(profileId);
      if (!loyalty) return;
      
      const tiers = await LoyaltyService.getLoyaltyTiers();
      
      const eligibleTier = tiers
        .filter(tier => tier.min_points <= loyalty.total_points)
        .sort((a, b) => b.tier_level - a.tier_level)[0];
      
      if (eligibleTier && eligibleTier.tier_name !== loyalty.tier_level) {
        // Trigger tier upgrade
        await LoyaltyService.addPoints(
          profileId,
          'tier_upgrade',
          `ترقية إلى مستوى ${eligibleTier.tier_name}`,
          50,
          {}
        );
      }
    } catch (error) {
      console.error('خطأ في معالجة المكافآت التلقائية:', error);
    }
  }

  /**
   * Points preview for actions
   */
  getPointsPreview(actionType: string): { points: number; description: string } {
    const pointsMap: { [key: string]: { points: number; description: string } } = {
      'trip_completed': { points: 10, description: 'إكمال رحلة' },
      'high_rating_received': { points: 20, description: 'تقييم 4.5+ نجوم' },
      'long_distance_trip': { points: 15, description: 'رحلة أكثر من 10 كم' },
      'weekly_activity': { points: 50, description: '10+ رحلات أسبوعياً' },
      'no_delays_streak': { points: 30, description: '3+ أيام بدون تأخير' },
      'referral_bonus': { points: 200, description: 'دعوة سائق جديد' },
      'customer_referral': { points: 100, description: 'دعوة عميل جديد' },
      'signup_bonus': { points: 100, description: 'مكافأة التسجيل' },
    };

    return pointsMap[actionType] || { points: 0, description: 'إجراء غير معروف' };
  }

  /**
   * Analytics and reporting
   */
  async generateLoyaltyReport(profileId: string, period: 'week' | 'month' | 'year' = 'month') {
    try {
      const stats = await LoyaltyService.getLoyaltyStats(profileId);
      const loyalty = await LoyaltyService.getUserLoyalty(profileId);
      if (!loyalty) return null;
      
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const logs = await LoyaltyService.getLoyaltyLogs(profileId, 
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      const periodLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= startDate && logDate <= endDate;
      });

      const pointsEarned = periodLogs
        .filter(log => log.points_earned > 0)
        .reduce((sum, log) => sum + log.points_earned, 0);

      const pointsSpent = periodLogs
        .filter(log => log.points_spent > 0)
        .reduce((sum, log) => sum + log.points_spent, 0);

      return {
        period,
        pointsEarned,
        pointsSpent,
        netPoints: pointsEarned - pointsSpent,
        currentBalance: loyalty.available_points,
        totalLifetime: loyalty.total_points,
        currentTier: loyalty.tier_level,
        activitiesCount: periodLogs.length,
        topActivities: this.getTopActivities(periodLogs)
      };
    } catch (error) {
      console.error('خطأ في إنشاء تقرير الولاء:', error);
      return null;
    }
  }

  private getTopActivities(logs: any[]): Array<{ activity: string; count: number; points: number }> {
    const activities: { [key: string]: { count: number; points: number } } = {};

    logs.forEach(log => {
      if (!activities[log.action_type]) {
        activities[log.action_type] = { count: 0, points: 0 };
      }
      activities[log.action_type].count++;
      activities[log.action_type].points += log.points_earned || 0;
    });

    return Object.entries(activities)
      .map(([activity, data]) => ({ activity, ...data }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
  }
}

export default LoyaltyManager;
