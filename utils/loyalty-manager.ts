import { LoyaltyService } from '../utils/loyalty-service';

export class LoyaltyManager {
  private static instance: LoyaltyManager;
  private loyaltyService: typeof LoyaltyService;

  private constructor() {
    this.loyaltyService = LoyaltyService;
  }

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
      await this.loyaltyService.addPoints(
        profileId,
        '10',
        'trip_completed',
        'رحلة مكتملة'
      );

      // Bonus for high ratings
      if (tripDetails.rating && tripDetails.rating >= 4.5) {
        await this.loyaltyService.addPoints(
          profileId,
          '20',
          'high_rating_received',
          `تقييم عالي: ${tripDetails.rating} نجوم`
        );
      }

      // Distance bonus
      if (tripDetails.distance > 10) {
        await this.loyaltyService.addPoints(
          profileId,
          '15',
          'long_distance_trip',
          `رحلة طويلة: ${tripDetails.distance} كم`
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
      await this.loyaltyService.addPoints(
        profileId,
        '100',
        'signup_bonus',
        'مكافأة التسجيل كسائق'
      );
    } catch (error) {
      console.error('خطأ في مكافأة التسجيل:', error);
    }
  }

  async handleCustomerSignup(profileId: string) {
    try {
      await this.loyaltyService.addPoints(
        profileId,
        '50',
        'signup_bonus',
        'مكافأة التسجيل كعميل'
      );
    } catch (error) {
      console.error('خطأ في مكافأة التسجيل:', error);
    }
  }

  async handleReferralComplete(referrerProfileId: string, referredProfileId: string, userType: 'driver' | 'customer') {
    try {
      const referralPoints = userType === 'driver' ? 200 : 100;
      
      // Points for referrer
      await this.loyaltyService.addPoints(
        referrerProfileId,
        String(referralPoints),
        'referral_bonus',
        `دعوة ${userType === 'driver' ? 'سائق' : 'عميل'} جديد`,
        {}
      );

      // Smaller bonus for referred user
      await this.loyaltyService.addPoints(
        referredProfileId,
        '25',
        'referred_bonus',
        'مكافأة الانضمام عبر دعوة',
        {}
      );

    } catch (error) {
      console.error('خطأ في مكافأة الدعوة:', error);
    }
  }

  async handleWeeklyActivity(profileId: string, tripsThisWeek: number) {
    try {
      if (tripsThisWeek >= 10) {
        await this.loyaltyService.addPoints(
          profileId,
          50,
          'weekly_activity',
          `نشاط أسبوعي: ${tripsThisWeek} رحلة`
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
        await this.loyaltyService.addPoints(
          profileId,
          points,
          'no_delays_streak',
          `انضباط ${streakDays} أيام متتالية`
        );
      }
    } catch (error) {
      console.error('خطأ في مكافأة الانضباط:', error);
    }
  }

  async handleSpecialEvent(profileId: string, eventType: string, points: number, description: string) {
    try {
      await this.loyaltyService.addPoints(
        profileId,
        points,
        'special_event',
        description
      );
    } catch (error) {
      console.error('خطأ في مكافأة الحدث الخاص:', error);
    }
  }

  private async checkTripMilestones(profileId: string) {
    try {
      const stats = await this.loyaltyService.getLoyaltyStats(profileId);
      const totalTrips = stats.totalTripsCompleted || 0;

      // Milestone rewards
      const milestones = [10, 25, 50, 100, 200, 500, 1000];
      
      for (const milestone of milestones) {
        if (totalTrips === milestone) {
          const points = milestone * 2; // 2 points per milestone trip
          await this.loyaltyService.addPoints(
            profileId,
            points,
            'milestone_trips',
            `معلم ${milestone} رحلة مكتملة`
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
      const eligibility = await this.loyaltyService.checkRewardEligibility(profileId, rewardId);
      return eligibility.eligible;
    } catch (error) {
      console.error('خطأ في فحص أهلية المكافأة:', error);
      return false;
    }
  }

  async getUserTierInfo(profileId: string) {
    try {
      const loyalty = await this.loyaltyService.getUserLoyalty(profileId);
      const tiers = await this.loyaltyService.getLoyaltyTiers();
      
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
      await this.loyaltyService.handleLoyaltyEvent(profileId, 'daily_check', {});
      
      // Process any pending tier upgrades
      const loyalty = await this.loyaltyService.getUserLoyalty(profileId);
      const tiers = await this.loyaltyService.getLoyaltyTiers();
      
      const eligibleTier = tiers
        .filter(tier => tier.min_points <= loyalty.total_points)
        .sort((a, b) => b.tier_level - a.tier_level)[0];
      
      if (eligibleTier && eligibleTier.tier_name !== loyalty.tier_level) {
        // Trigger tier upgrade
        await this.loyaltyService.addPoints(
          profileId,
          50,
          'tier_upgrade',
          `ترقية إلى مستوى ${eligibleTier.tier_name}`
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
      const stats = await this.loyaltyService.getLoyaltyStats(profileId);
      const loyalty = await this.loyaltyService.getUserLoyalty(profileId);
      
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

      const logs = await this.loyaltyService.getLoyaltyLogs(profileId, 
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
