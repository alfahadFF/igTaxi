import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import SmartAchievementsService, {
  UserBadge,
  ActiveReward,
} from '@/utils/smart-achievements-service';

interface AchievementWidgetProps {
  profileId: string;
  userRole: 'driver' | 'customer';
  onPress?: () => void;
  compact?: boolean;
}

export const AchievementWidget: React.FC<AchievementWidgetProps> = ({
  profileId,
  userRole,
  onPress,
  compact = false,
}) => {
  const [userBadge, setUserBadge] = useState<UserBadge | null>(null);
  const [activeRewards, setActiveRewards] = useState<ActiveReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      const [badge, rewards] = await Promise.all([
        SmartAchievementsService.getUserBadge(profileId),
        SmartAchievementsService.getActiveRewards(profileId),
      ]);

      setUserBadge(badge);
      setActiveRewards(rewards);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, compact && styles.compactContainer]}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
      </View>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactContainer} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.badgeSection}>
            {userBadge ? (
              <>
                <Text style={styles.compactBadgeIcon}>
                  {userBadge.badge_level?.badge_icon}
                </Text>
                <Text style={styles.compactBadgeText}>
                  {userBadge.badge_level?.display_name}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="medal" size={16} color={Colors.light.secondary} />
                <Text style={styles.compactBadgeText}>ابدأ الآن</Text>
              </>
            )}
          </View>
          
          {activeRewards.length > 0 && (
            <View style={styles.rewardIndicator}>
              <Ionicons name="gift" size={12} color={Colors.light.success} />
              <Text style={styles.rewardCount}>{activeRewards.length}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.title}>🏆 إنجازاتي</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.light.secondary} />
      </View>

      <View style={styles.content}>
        {userBadge ? (
          <View style={styles.badgeDisplay}>
            <Text style={styles.badgeIcon}>{userBadge.badge_level?.badge_icon}</Text>
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeName}>{userBadge.badge_level?.display_name}</Text>
              <Text style={styles.badgeTrips}>
                {userBadge.current_trips} رحلة مكتملة
              </Text>
              {userBadge.badge_level?.max_trips && (
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: `${Math.min((userBadge.current_trips / userBadge.badge_level.max_trips) * 100, 100)}%`,
                        backgroundColor: userBadge.badge_level.badge_color
                      }
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noBadge}>
            <Ionicons name="medal-outline" size={32} color={Colors.light.secondary} />
            <Text style={styles.noBadgeText}>ابدأ رحلتك لكسب الشارات!</Text>
          </View>
        )}

        {activeRewards.length > 0 && (
          <View style={styles.rewardsSection}>
            <View style={styles.rewardsHeader}>
              <Ionicons name="gift" size={16} color={Colors.light.success} />
              <Text style={styles.rewardsText}>
                {activeRewards.length} مكافأة جاهزة للاستخدام
              </Text>
            </View>
            <Text style={styles.rewardsSubtext}>اضغط لعرض التفاصيل</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

interface AchievementNotificationProps {
  achievement: {
    id: string;
    title: string;
    icon: string;
    reward_type?: string;
    reward_details?: any;
  };
  onClose: () => void;
  onViewReward?: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
  onViewReward,
}) => {
  return (
    <View style={styles.notificationContainer}>
      <View style={styles.notificationContent}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={20} color={Colors.light.secondary} />
        </TouchableOpacity>

        <View style={styles.notificationHeader}>
          <Text style={styles.notificationIcon}>{achievement.icon}</Text>
          <Text style={styles.congratsText}>تهانينا! 🎉</Text>
        </View>

        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementCompleted}>تم إنجاز المهمة بنجاح!</Text>

        {achievement.reward_type && (
          <View style={styles.rewardSection}>
            <Text style={styles.rewardText}>
              حصلت على: {SmartAchievementsService.formatRewardType(achievement.reward_type)}
            </Text>
            <TouchableOpacity style={styles.viewRewardButton} onPress={onViewReward}>
              <Text style={styles.viewRewardText}>عرض المكافأة</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactBadgeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  compactBadgeText: {
    fontSize: 10,
    color: Colors.light.text,
    fontWeight: '600',
  },
  rewardIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: Colors.light.success,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rewardCount: {
    fontSize: 10,
    color: Colors.light.background,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  content: {
    gap: 12,
  },
  badgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  badgeTrips: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  noBadge: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noBadgeText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  rewardsSection: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
    marginLeft: 6,
  },
  rewardsSubtext: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  // Notification styles
  notificationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  notificationContent: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  notificationHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  congratsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementCompleted: {
    fontSize: 14,
    color: Colors.light.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  rewardSection: {
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    color: Colors.light.success,
    fontWeight: '600',
    marginBottom: 12,
  },
  viewRewardButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewRewardText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AchievementWidget;
