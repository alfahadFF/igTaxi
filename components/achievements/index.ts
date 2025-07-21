// Smart Achievement System Components
// نظام الإنجازات الذكية - مجموعة شاملة من المكونات

export { default as SmartAchievementsDashboard } from './SmartAchievementsDashboard';
export { default as AchievementWidget, AchievementNotification } from './AchievementWidget';
export { default as AchievementManager } from './AchievementManager';
export { default as HomeAchievementSection } from './HomeAchievementSection';
export { 
  default as ActivityTracker, 
  AchievementTracker, 
  AchievementTrackerProvider 
} from './ActivityTracker';

// Re-export hooks for convenience
export { default as useAchievements, useActivityLogger, useAchievementChecker } from '@/hooks/useAchievements';

// Re-export service for direct usage
export { default as SmartAchievementsService } from '@/utils/smart-achievements-service';

// Quick usage examples for developers:

/*
1. Basic Dashboard Usage:
import { SmartAchievementsDashboard } from '@/components/achievements';

<SmartAchievementsDashboard 
  profileId={currentUser.id}
  userRole="customer" // or "driver"
  onRewardUsed={(rewardId) => console.log('Reward used:', rewardId)}
/>

2. Home Section Widget:
import { HomeAchievementSection } from '@/components/achievements';

<HomeAchievementSection 
  profileId={currentUser.id}
  userRole="customer"
  onNavigateToFull={() => navigation.navigate('Achievements')}
/>

3. Activity Tracking:
import { AchievementTracker } from '@/components/achievements';

// After trip completion
AchievementTracker.trackTripCompleted({
  tripId: '123',
  duration: 15,
  rating: 5,
  fare: 25.50
});

4. Provider Setup (in App root):
import { AchievementTrackerProvider } from '@/components/achievements';

<AchievementTrackerProvider profileId={currentUser.id}>
  <YourApp />
</AchievementTrackerProvider>

5. Using Hooks:
import { useAchievements } from '@/components/achievements';

const { userBadge, activeRewards, logActivity, loading } = useAchievements({
  profileId: currentUser.id,
  userRole: 'customer',
  autoRefresh: true
});

6. Manual Activity Logging:
import { useActivityLogger } from '@/components/achievements';

const { logActivity } = useActivityLogger(currentUser.id);
await logActivity('trip_completed', { tripId: '123', rating: 5 });

7. Direct Service Usage:
import { SmartAchievementsService } from '@/components/achievements';

const userBadge = await SmartAchievementsService.getUserBadge(profileId);
const rewards = await SmartAchievementsService.getActiveRewards(profileId);
*/
