import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import SmartAchievementsService, {
  UserBadge,
  UserAchievement,
  ActiveReward,
  AchievementProgress,
  Achievement
} from '@/utils/smart-achievements-service';

const { width } = Dimensions.get('window');

interface SmartAchievementsDashboardProps {
  profileId: string;
  userRole: 'driver' | 'customer';
  onRewardUsed?: (rewardId: string) => void;
}

export const SmartAchievementsDashboard: React.FC<SmartAchievementsDashboardProps> = ({
  profileId,
  userRole,
  onRewardUsed,
}) => {
  const [userBadge, setUserBadge] = useState<UserBadge | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [activeRewards, setActiveRewards] = useState<ActiveReward[]>([]);
  const [progress, setProgress] = useState<AchievementProgress[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'rewards'>('overview');

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      setLoading(true);
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

      setUserBadge(badge);
      setAchievements(userAchievements);
      setActiveRewards(rewards);
      setProgress(progressData);
      setAvailableAchievements(availableData);
      setStats(userStats);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUseReward = async (reward: ActiveReward) => {
    try {
      Alert.alert(
        'استخدام المكافأة',
        `هل تريد استخدام: ${SmartAchievementsService.formatRewardDetails(reward.reward_type, reward.reward_details)}؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استخدام',
            onPress: async () => {
              const result = await SmartAchievementsService.useReward(
                profileId,
                reward.id,
                { usedAt: new Date().toISOString() }
              );

              if (result.success) {
                Alert.alert('تم بنجاح! 🎉', result.message || 'تم استخدام المكافأة');
                if (onRewardUsed) {
                  onRewardUsed(reward.id);
                }
                loadData();
              } else {
                Alert.alert('خطأ', result.message || 'حدث خطأ في استخدام المكافأة');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('خطأ في استخدام المكافأة:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    }
  };

  const renderOverview = () => (
    <ScrollView 
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* بطاقة الشارة الحالية */}
      <View style={styles.badgeCard}>
        {userBadge ? (
          <View style={styles.badgeContent}>
            <View style={styles.badgeIcon}>
              <Text style={styles.badgeEmoji}>{userBadge.badge_level?.badge_icon}</Text>
            </View>
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeTitle}>{userBadge.badge_level?.display_name}</Text>
              <Text style={styles.badgeSubtitle}>
                {userBadge.current_trips} رحلة مكتملة
              </Text>
              {userBadge.badge_level?.max_trips && (
                <View style={styles.progressContainer}>
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
                  <Text style={styles.progressText}>
                    {Math.max(0, userBadge.badge_level.max_trips - userBadge.current_trips)} رحلة للمستوى التالي
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noBadgeContainer}>
            <Ionicons name="medal" size={48} color={Colors.light.secondary} />
            <Text style={styles.noBadgeText}>ابدأ رحلتك لكسب الشارات!</Text>
          </View>
        )}
      </View>

      {/* إحصائيات سريعة */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color={Colors.light.warning} />
          <Text style={styles.statNumber}>{stats.completedAchievements || 0}</Text>
          <Text style={styles.statLabel}>إنجاز</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="gift" size={24} color={Colors.light.success} />
          <Text style={styles.statNumber}>{stats.activeRewards || 0}</Text>
          <Text style={styles.statLabel}>مكافأة نشطة</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="car" size={24} color={Colors.light.primary} />
          <Text style={styles.statNumber}>{stats.totalTrips || 0}</Text>
          <Text style={styles.statLabel}>رحلة</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color={Colors.light.accent} />
          <Text style={styles.statNumber}>{(stats.averageRating || 0).toFixed(1)}</Text>
          <Text style={styles.statLabel}>التقييم</Text>
        </View>
      </View>

      {/* المكافآت النشطة */}
      {activeRewards.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 مكافآتك النشطة</Text>
          {activeRewards.slice(0, 3).map((reward) => (
            <View key={reward.id} style={styles.rewardQuickCard}>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>
                  {SmartAchievementsService.formatRewardType(reward.reward_type)}
                </Text>
                <Text style={styles.rewardDescription}>
                  {SmartAchievementsService.formatRewardDetails(reward.reward_type, reward.reward_details)}
                </Text>
                <Text style={styles.rewardExpiry}>
                  ينتهي خلال: {SmartAchievementsService.formatTimeRemaining(reward.expires_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.useButton}
                onPress={() => handleUseReward(reward)}
              >
                <Text style={styles.useButtonText}>استخدم</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* آخر الإنجازات */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 آخر الإنجازات</Text>
        {achievements.slice(0, 3).map((achievement) => (
          <View key={achievement.id} style={styles.achievementQuickCard}>
            <Text style={styles.achievementIcon}>{achievement.achievement?.icon}</Text>
            <View style={styles.achievementInfo}>
              <Text style={styles.achievementTitle}>{achievement.achievement?.title}</Text>
              <Text style={styles.achievementDate}>
                {new Date(achievement.achieved_at).toLocaleDateString('ar-SA')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAchievements = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>🎯 الإنجازات المتاحة</Text>
      
      {availableAchievements.map((achievement) => {
        const userProgress = progress.find(p => p.achievement_id === achievement.id);
        const isCompleted = achievements.some(a => a.achievement_id === achievement.id);
        const progressPercent = userProgress 
          ? Math.min((userProgress.current_value / achievement.condition_value) * 100, 100)
          : 0;

        return (
          <View key={achievement.id} style={[
            styles.achievementCard,
            isCompleted && styles.completedAchievementCard
          ]}>
            <View style={styles.achievementHeader}>
              <Text style={styles.achievementCardIcon}>{achievement.icon}</Text>
              <View style={styles.achievementCardInfo}>
                <Text style={[
                  styles.achievementCardTitle,
                  isCompleted && styles.completedText
                ]}>
                  {achievement.title}
                </Text>
                <Text style={styles.achievementCardDescription}>
                  {achievement.description}
                </Text>
                {achievement.reward_duration_hours && (
                  <Text style={styles.achievementReward}>
                    المكافأة: {SmartAchievementsService.formatRewardType(achievement.reward_type)}
                    {' '}(صالحة {achievement.reward_duration_hours} ساعة)
                  </Text>
                )}
              </View>
              {isCompleted && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.light.success} />
              )}
            </View>
            
            {!isCompleted && userProgress && (
              <View style={styles.achievementProgress}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {userProgress.current_value} / {achievement.condition_value}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderRewards = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>🎁 مكافآتك</Text>
      
      {activeRewards.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="gift-outline" size={64} color={Colors.light.secondary} />
          <Text style={styles.emptyStateText}>لا توجد مكافآت نشطة</Text>
          <Text style={styles.emptyStateSubtext}>أكمل الإنجازات للحصول على مكافآت رائعة!</Text>
        </View>
      ) : (
        activeRewards.map((reward) => (
          <View key={reward.id} style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <View style={styles.rewardIcon}>
                <Ionicons name="gift" size={28} color={Colors.light.primary} />
              </View>
              <View style={styles.rewardCardInfo}>
                <Text style={styles.rewardCardTitle}>
                  {SmartAchievementsService.formatRewardType(reward.reward_type)}
                </Text>
                <Text style={styles.rewardCardDescription}>
                  {SmartAchievementsService.formatRewardDetails(reward.reward_type, reward.reward_details)}
                </Text>
                <Text style={styles.rewardExpiry}>
                  ينتهي خلال: {SmartAchievementsService.formatTimeRemaining(reward.expires_at)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.useRewardButton}
              onPress={() => handleUseReward(reward)}
            >
              <Text style={styles.useRewardButtonText}>استخدام المكافأة</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* المكافآت المستخدمة حديثاً */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📋 المكافآت المستخدمة</Text>
      {achievements
        .filter(a => a.reward_used)
        .slice(0, 5)
        .map((achievement) => (
          <View key={achievement.id} style={styles.usedRewardCard}>
            <Text style={styles.usedRewardIcon}>✅</Text>
            <View style={styles.usedRewardInfo}>
              <Text style={styles.usedRewardTitle}>{achievement.achievement?.title}</Text>
              <Text style={styles.usedRewardDate}>
                استُخدمت في: {achievement.reward_used_at ? new Date(achievement.reward_used_at).toLocaleDateString('ar-SA') : 'غير محدد'}
              </Text>
            </View>
          </View>
        ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>جاري تحميل الإنجازات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* التبويبات */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Ionicons 
            name="speedometer" 
            size={20} 
            color={selectedTab === 'overview' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            نظرة عامة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
          onPress={() => setSelectedTab('achievements')}
        >
          <Ionicons 
            name="trophy" 
            size={20} 
            color={selectedTab === 'achievements' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>
            الإنجازات
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'rewards' && styles.activeTab]}
          onPress={() => setSelectedTab('rewards')}
        >
          <Ionicons 
            name="gift" 
            size={20} 
            color={selectedTab === 'rewards' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[styles.tabText, selectedTab === 'rewards' && styles.activeTabText]}>
            المكافآت
          </Text>
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      <View style={styles.content}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'achievements' && renderAchievements()}
        {selectedTab === 'rewards' && renderRewards()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginLeft: 6,
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  badgeCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  badgeSubtitle: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  noBadgeContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBadgeText: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  rewardQuickCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  rewardDescription: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  rewardExpiry: {
    fontSize: 11,
    color: Colors.light.warning,
    marginTop: 4,
  },
  useButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  useButtonText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: '600',
  },
  achievementQuickCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  achievementDate: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  achievementCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completedAchievementCard: {
    backgroundColor: '#f0f9ff',
    borderColor: Colors.light.success,
    borderWidth: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  achievementCardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  achievementCardInfo: {
    flex: 1,
  },
  achievementCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  completedText: {
    color: Colors.light.success,
  },
  achievementCardDescription: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  achievementReward: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 6,
    fontWeight: '500',
  },
  achievementProgress: {
    marginTop: 12,
  },
  rewardCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rewardCardInfo: {
    flex: 1,
  },
  rewardCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  rewardCardDescription: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  useRewardButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  useRewardButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    color: Colors.light.secondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  usedRewardCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.7,
  },
  usedRewardIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  usedRewardInfo: {
    flex: 1,
  },
  usedRewardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  usedRewardDate: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
});

export default SmartAchievementsDashboard;
