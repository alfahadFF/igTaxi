import { useState, useEffect, useCallback } from 'react';
import SmartAchievementsService, {
  UserBadge,
  UserAchievement,
  ActiveReward,
  AchievementProgress,
  Achievement
} from '@/utils/smart-achievements-service';

interface UseAchievementsOptions {
  profileId: string;
  userRole: 'driver' | 'customer';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AchievementStats {
  completedAchievements: number;
  activeRewards: number;
  totalTrips: number;
  averageRating: number;
  currentStreak: number;
  bestStreak: number;
}

export const useAchievements = ({
  profileId,
  userRole,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
}: UseAchievementsOptions) => {
  const [userBadge, setUserBadge] = useState<UserBadge | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [activeRewards, setActiveRewards] = useState<ActiveReward[]>([]);
  const [progress, setProgress] = useState<AchievementProgress[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats>({
    completedAchievements: 0,
    activeRewards: 0,
    totalTrips: 0,
    averageRating: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAchievements, setNewAchievements] = useState<UserAchievement[]>([]);

  // Load all achievement data
  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const [
        badge,
        userAchievements,
        rewards,
        progressData,
        availableData,
        userStats
      ] = await Promise.all([
        SmartAchievementsService.getUserBadge(profileId),
        SmartAchievementsService.getUserAchievements(profileId),
        SmartAchievementsService.getActiveRewards(profileId),
        SmartAchievementsService.getAchievementProgress(profileId),
        SmartAchievementsService.getAvailableAchievements(userRole),
        SmartAchievementsService.getUserStats(profileId)
      ]);

      // Check for new achievements
      const currentAchievementIds = achievements.map(a => a.id);
      const newAchievementsList = userAchievements.filter(
        a => !currentAchievementIds.includes(a.id)
      );

      setUserBadge(badge);
      setAchievements(userAchievements);
      setActiveRewards(rewards);
      setProgress(progressData);
      setAvailableAchievements(availableData);
      setStats({
        completedAchievements: userAchievements.length,
        activeRewards: rewards.length,
        totalTrips: userStats.totalTrips || 0,
        averageRating: userStats.averageRating || 0,
        currentStreak: userStats.currentStreak || 0,
        bestStreak: userStats.currentStreak || 0,
      });

      if (newAchievementsList.length > 0) {
        setNewAchievements(prev => [...prev, ...newAchievementsList]);
      }

    } catch (err) {
      console.error('خطأ في تحميل بيانات الإنجازات:', err);
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [profileId, userRole, achievements]);

  // Log activity and check for new achievements
  const logActivity = useCallback(async (
    activityType: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak',
    context: Record<string, any> = {}
  ) => {
    try {
      const result = await SmartAchievementsService.logActivity(
        profileId,
        activityType,
        context
      );

      // Since logActivity returns boolean, we need to refresh data to check for new achievements
      if (result) {
        loadData(false);
      }

      return { success: result, message: result ? 'تم تسجيل النشاط بنجاح' : 'فشل في تسجيل النشاط' };
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
      return { success: false, message: 'حدث خطأ في تسجيل النشاط' };
    }
  }, [profileId, loadData]);

  // Use a reward
  const useReward = useCallback(async (
    rewardId: string,
    usageContext: Record<string, any> = {}
  ) => {
    try {
      const result = await SmartAchievementsService.useReward(
        profileId,
        rewardId,
        usageContext
      );

      if (result.success) {
        // Remove used reward from active rewards
        setActiveRewards(prev => prev.filter(r => r.id !== rewardId));
        // Update stats
        setStats(prev => ({ ...prev, activeRewards: prev.activeRewards - 1 }));
      }

      return result;
    } catch (error) {
      console.error('خطأ في استخدام المكافأة:', error);
      return { success: false, message: 'حدث خطأ في استخدام المكافأة' };
    }
  }, [profileId]);

  // Clear new achievement notifications
  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  // Clear specific new achievement
  const clearNewAchievement = useCallback((achievementId: string) => {
    setNewAchievements(prev => prev.filter(a => a.id !== achievementId));
  }, []);

  // Get progress for specific achievement
  const getAchievementProgress = useCallback((achievementId: string) => {
    return progress.find(p => p.achievement_id === achievementId);
  }, [progress]);

  // Check if achievement is completed
  const isAchievementCompleted = useCallback((achievementId: string) => {
    return achievements.some(a => a.achievement_id === achievementId);
  }, [achievements]);

  // Get available achievements filtered by user role
  const getAvailableAchievements = useCallback(() => {
    return availableAchievements.filter(a => 
      a.target_role === userRole || a.target_role === 'both'
    );
  }, [availableAchievements, userRole]);

  // Get rewards by type
  const getRewardsByType = useCallback((rewardType: string) => {
    return activeRewards.filter(r => r.reward_type === rewardType);
  }, [activeRewards]);

  // Get expiring rewards (expiring within 24 hours)
  const getExpiringRewards = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return activeRewards.filter(r => {
      const expiryDate = new Date(r.expires_at);
      return expiryDate <= tomorrow && expiryDate > now;
    });
  }, [activeRewards]);

  // Get next achievement to complete
  const getNextAchievement = useCallback(() => {
    const incomplete = availableAchievements.filter(a => 
      !isAchievementCompleted(a.id) && 
      (a.target_role === userRole || a.target_role === 'both')
    );

    // Sort by progress (closest to completion first)
    return incomplete.sort((a, b) => {
      const progressA = getAchievementProgress(a.id);
      const progressB = getAchievementProgress(b.id);
      
      if (!progressA && !progressB) return 0;
      if (!progressA) return 1;
      if (!progressB) return -1;
      
      const percentA = (progressA.current_value / a.condition_value) * 100;
      const percentB = (progressB.current_value / b.condition_value) * 100;
      
      return percentB - percentA;
    })[0];
  }, [availableAchievements, isAchievementCompleted, userRole, getAchievementProgress]);

  // Auto-refresh effect
  useEffect(() => {
    loadData(true);

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadData(false);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [loadData, autoRefresh, refreshInterval]);

  return {
    // Data
    userBadge,
    achievements,
    activeRewards,
    progress,
    availableAchievements: getAvailableAchievements(),
    stats,
    newAchievements,
    
    // State
    loading,
    error,
    
    // Actions
    loadData,
    logActivity,
    useReward,
    clearNewAchievements,
    clearNewAchievement,
    
    // Helpers
    getAchievementProgress,
    isAchievementCompleted,
    getRewardsByType,
    getExpiringRewards,
    getNextAchievement,
  };
};

// Hook for activity logging without full achievement data
export const useActivityLogger = (profileId: string) => {
  const logActivity = useCallback(async (
    activityType: 'trip_completed' | 'rating_given' | 'referral_joined' | 'no_delay_streak',
    context: Record<string, any> = {}
  ) => {
    try {
      return await SmartAchievementsService.logActivity(
        profileId,
        activityType,
        context
      );
    } catch (error) {
      console.error('خطأ في تسجيل النشاط:', error);
      return false;
    }
  }, [profileId]);

  return { logActivity };
};

// Hook for checking achievements without loading all data
export const useAchievementChecker = (profileId: string, userRole: 'driver' | 'customer') => {
  const [newAchievements, setNewAchievements] = useState<UserAchievement[]>([]);

  const checkAchievements = useCallback(async () => {
    try {
      // This could be optimized to only check for new achievements
      const achievements = await SmartAchievementsService.getUserAchievements(profileId);
      // Logic to determine new achievements would go here
      // For now, we'll just return the latest achievement
      const latest = achievements[achievements.length - 1];
      if (latest) {
        setNewAchievements([latest]);
      }
    } catch (error) {
      console.error('خطأ في فحص الإنجازات:', error);
    }
  }, [profileId]);

  const clearNewAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  return {
    newAchievements,
    checkAchievements,
    clearNewAchievements,
  };
};

export default useAchievements;
