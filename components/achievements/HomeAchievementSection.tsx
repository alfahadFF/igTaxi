import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAchievements } from '@/hooks/useAchievements';
import { AchievementNotification } from './AchievementWidget';

const { width } = Dimensions.get('window');

interface HomeAchievementSectionProps {
  profileId: string;
  userRole: 'driver' | 'customer';
  onNavigateToFull?: () => void;
}

export const HomeAchievementSection: React.FC<HomeAchievementSectionProps> = ({
  profileId,
  userRole,
  onNavigateToFull,
}) => {
  const {
    userBadge,
    activeRewards,
    stats,
    newAchievements,
    loading,
    clearNewAchievement,
    getExpiringRewards,
    getNextAchievement,
  } = useAchievements({
    profileId,
    userRole,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  const [showNotification, setShowNotification] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<any>(null);

  useEffect(() => {
    if (newAchievements.length > 0 && !showNotification) {
      setCurrentNotification(newAchievements[0]);
      setShowNotification(true);
    }
  }, [newAchievements, showNotification]);

  const closeNotification = () => {
    setShowNotification(false);
    if (currentNotification) {
      clearNewAchievement(currentNotification.id);
    }
    setTimeout(() => {
      setCurrentNotification(null);
    }, 300);
  };

  const expiringRewards = getExpiringRewards();
  const nextAchievement = getNextAchievement();

  if (loading) {
    return null; // Don't show loading state in home section
  }

  return (
    <View style={styles.container}>
      {/* عنوان القسم */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>🏆 إنجازاتي</Text>
        <TouchableOpacity onPress={onNavigateToFull} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>عرض الكل</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      {/* بطاقة الشارة الحالية */}
      <TouchableOpacity style={styles.badgeCard} onPress={onNavigateToFull}>
        {userBadge ? (
          <View style={styles.badgeContent}>
            <Text style={styles.badgeIcon}>{userBadge.badge_level?.badge_icon}</Text>
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
          <View style={styles.noBadgeContent}>
            <Ionicons name="medal" size={32} color={Colors.light.secondary} />
            <Text style={styles.noBadgeText}>ابدأ رحلتك لكسب الشارات!</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* إحصائيات سريعة */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color={Colors.light.warning} />
          <Text style={styles.statNumber}>{stats.completedAchievements}</Text>
          <Text style={styles.statLabel}>إنجاز</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="gift" size={16} color={Colors.light.success} />
          <Text style={styles.statNumber}>{stats.activeRewards}</Text>
          <Text style={styles.statLabel}>مكافأة</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color={Colors.light.accent} />
          <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>التقييم</Text>
        </View>
      </View>

      {/* التحذيرات المهمة */}
      {expiringRewards.length > 0 && (
        <TouchableOpacity style={styles.warningCard} onPress={onNavigateToFull}>
          <Ionicons name="time" size={20} color={Colors.light.warning} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>⏰ مكافآت تنتهي قريباً</Text>
            <Text style={styles.warningText}>
              {expiringRewards.length} مكافأة تنتهي خلال 24 ساعة
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.light.warning} />
        </TouchableOpacity>
      )}

      {/* الإنجاز التالي */}
      {nextAchievement && (
        <TouchableOpacity style={styles.nextAchievementCard} onPress={onNavigateToFull}>
          <Text style={styles.nextAchievementIcon}>{nextAchievement.icon}</Text>
          <View style={styles.nextAchievementContent}>
            <Text style={styles.nextAchievementTitle}>🎯 الإنجاز التالي</Text>
            <Text style={styles.nextAchievementText}>{nextAchievement.title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.light.primary} />
        </TouchableOpacity>
      )}

      {/* المكافآت النشطة */}
      {activeRewards.length > 0 && (
        <View style={styles.rewardsSection}>
          <Text style={styles.rewardsTitle}>🎁 مكافآتك ({activeRewards.length})</Text>
          <FlatList
            data={activeRewards.slice(0, 3)}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.rewardItem} onPress={onNavigateToFull}>
                <Ionicons name="gift" size={16} color={Colors.light.success} />
                <Text style={styles.rewardType}>
                  {item.reward_type === 'discount' ? 'خصم' : 
                   item.reward_type === 'free_trip' ? 'رحلة مجانية' : 
                   item.reward_type === 'priority' ? 'أولوية' : 'مكافأة'}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.rewardsList}
          />
        </View>
      )}

      {/* إشعار الإنجاز الجديد */}
      {showNotification && currentNotification && (
        <AchievementNotification
          achievement={currentNotification.achievement}
          onClose={closeNotification}
          onViewReward={onNavigateToFull}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.light.primary,
    marginRight: 4,
  },
  badgeCard: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    fontSize: 32,
    marginRight: 12,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  badgeSubtitle: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  noBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  noBadgeText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.light.card,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.secondary,
  },
  warningCard: {
    backgroundColor: '#fff8e1',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.warning,
  },
  warningText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  nextAchievementCard: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  nextAchievementIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  nextAchievementContent: {
    flex: 1,
  },
  nextAchievementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  nextAchievementText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  rewardsSection: {
    marginBottom: 12,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rewardsList: {
    paddingHorizontal: 16,
  },
  rewardItem: {
    backgroundColor: Colors.light.success + '20',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.light.success + '40',
  },
  rewardType: {
    fontSize: 10,
    color: Colors.light.success,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default HomeAchievementSection;
