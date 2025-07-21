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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import LoyaltyService, { 
  UserLoyalty, 
  LoyaltyLog, 
  LoyaltyReward, 
  LoyaltyRedemption,
  LoyaltyTier 
} from '@/utils/loyalty-service';

interface DriverLoyaltyDashboardProps {
  profileId: string;
  onRedeemSuccess?: (redemptionCode: string) => void;
}

export const DriverLoyaltyDashboard: React.FC<DriverLoyaltyDashboardProps> = ({
  profileId,
  onRedeemSuccess,
}) => {
  const [userLoyalty, setUserLoyalty] = useState<UserLoyalty | null>(null);
  const [loyaltyLogs, setLoyaltyLogs] = useState<LoyaltyLog[]>([]);
  const [availableRewards, setAvailableRewards] = useState<LoyaltyReward[]>([]);
  const [userRedemptions, setUserRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'rewards' | 'earnings'>('dashboard');

  useEffect(() => {
    loadLoyaltyData();
  }, [profileId]);

  const loadLoyaltyData = async () => {
    try {
      setLoading(true);
      const [
        loyalty,
        logs,
        rewards,
        redemptions,
        tiers,
        statistics
      ] = await Promise.all([
        LoyaltyService.getUserLoyalty(profileId),
        LoyaltyService.getLoyaltyLogs(profileId, 30),
        LoyaltyService.getAvailableRewards('driver'),
        LoyaltyService.getUserRedemptions(profileId),
        LoyaltyService.getLoyaltyTiers(),
        LoyaltyService.getLoyaltyStats(profileId)
      ]);

      setUserLoyalty(loyalty);
      setLoyaltyLogs(logs);
      setAvailableRewards(rewards);
      setUserRedemptions(redemptions);
      setLoyaltyTiers(tiers);
      setStats(statistics);
    } catch (error) {
      console.error('خطأ في تحميل بيانات النقاط:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLoyaltyData();
    setRefreshing(false);
  };

  const handleRedeemReward = async (rewardId: string) => {
    try {
      const eligibility = await LoyaltyService.checkRewardEligibility(profileId, rewardId);
      
      if (!eligibility.eligible) {
        Alert.alert('غير مؤهل', eligibility.reason || 'لا يمكن استبدال هذه المكافأة');
        return;
      }

      Alert.alert(
        'تأكيد الاستبدال',
        'هل أنت متأكد من رغبتك في استبدال هذه المكافأة؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'استبدال',
            onPress: async () => {
              const result = await LoyaltyService.redeemReward(profileId, rewardId);
              
              if (result.success) {
                Alert.alert(
                  'تم الاستبدال بنجاح! 🎉',
                  `كود الاستبدال: ${result.redemptionCode}`,
                  [
                    {
                      text: 'نسخ الكود',
                      onPress: () => {
                        if (onRedeemSuccess) {
                          onRedeemSuccess(result.redemptionCode!);
                        }
                      }
                    },
                    { text: 'حسناً' }
                  ]
                );
                loadLoyaltyData();
              } else {
                Alert.alert('خطأ', result.error || 'حدث خطأ في الاستبدال');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('خطأ في استبدال المكافأة:', error);
      Alert.alert('خطأ', 'حدث خطأ غير متوقع');
    }
  };

  const getTierInfo = (tierName: string) => {
    return loyaltyTiers.find(tier => tier.tier_name === tierName);
  };

  const getNextTier = () => {
    const currentTierLevel = loyaltyTiers.find(tier => tier.tier_name === userLoyalty?.tier_level)?.tier_level || 1;
    return loyaltyTiers.find(tier => tier.tier_level === currentTierLevel + 1);
  };

  const getTierProgressPercentage = () => {
    const currentTier = getTierInfo(userLoyalty?.tier_level || 'bronze');
    const nextTier = getNextTier();
    
    if (!nextTier || !currentTier) return 100;
    
    const currentPoints = userLoyalty?.total_points || 0;
    const pointsNeeded = nextTier.min_points - currentTier.min_points;
    const progress = (currentPoints - currentTier.min_points) / pointsNeeded;
    
    return Math.min(Math.max(progress * 100, 0), 100);
  };

  const getDriverPerformanceMetrics = () => {
    const recentLogs = loyaltyLogs.filter(log => {
      const logDate = new Date(log.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return logDate >= thirtyDaysAgo;
    });

    const highRatings = recentLogs.filter(log => 
      log.action_type === 'high_rating_received'
    ).length;

    const completedTrips = recentLogs.filter(log => 
      log.action_type === 'trip_completed' || log.action_type === 'milestone_trips'
    ).length;

    const streakDays = recentLogs.filter(log => 
      log.action_type === 'no_delays_streak' || log.action_type === 'weekly_activity'
    ).length;

    return {
      highRatings,
      completedTrips,
      streakDays,
      monthlyEarnings: stats.monthlyEarned || 0
    };
  };

  const formatActionType = (actionType: string) => {
    const actions: { [key: string]: string } = {
      'signup_bonus': 'مكافأة التسجيل',
      'trip_completed': 'رحلة مكتملة',
      'milestone_trips': 'معلم الرحلات',
      'high_rating_received': 'تقييم ممتاز',
      'no_delays_streak': 'انضباط',
      'weekly_activity': 'نشاط أسبوعي',
      'driver_referral': 'دعوة سائق',
      'customer_favorite': 'سائق مفضل',
      'reward_redeemed': 'استبدال مكافأة',
      'tier_upgrade': 'ترقية المستوى'
    };
    return actions[actionType] || actionType;
  };

  const getActionIcon = (actionType: string) => {
    const icons: { [key: string]: string } = {
      'signup_bonus': 'gift',
      'trip_completed': 'car',
      'milestone_trips': 'trophy',
      'high_rating_received': 'star',
      'no_delays_streak': 'time',
      'weekly_activity': 'calendar',
      'driver_referral': 'people',
      'customer_favorite': 'heart',
      'reward_redeemed': 'card',
      'tier_upgrade': 'trending-up'
    };
    return icons[actionType] || 'checkmark-circle';
  };

  const renderDashboard = () => {
    const metrics = getDriverPerformanceMetrics();
    
    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* بطاقة النقاط الرئيسية */}
        <View style={styles.mainCard}>
          <View style={styles.driverHeader}>
            <View style={styles.tierBadge}>
              <Ionicons 
                name={getTierInfo(userLoyalty?.tier_level || 'bronze')?.tier_icon as any || 'medal'} 
                size={28} 
                color={getTierInfo(userLoyalty?.tier_level || 'bronze')?.tier_color || Colors.light.primary} 
              />
              <View style={styles.tierInfo}>
                <Text style={styles.tierName}>{userLoyalty?.tier_level}</Text>
                <Text style={styles.tierSubtitle}>سائق {userLoyalty?.tier_level}</Text>
              </View>
            </View>
            <View style={styles.pointsDisplay}>
              <Text style={styles.pointsNumber}>{userLoyalty?.available_points || 0}</Text>
              <Text style={styles.pointsLabel}>نقطة</Text>
            </View>
          </View>

          {/* شريط التقدم للمستوى التالي */}
          {getNextTier() && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>نحو مستوى {getNextTier()?.tier_name}</Text>
                <Text style={styles.progressPoints}>
                  {getNextTier()?.min_points! - (userLoyalty?.total_points || 0)} نقطة
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${getTierProgressPercentage()}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* مقاييس الأداء */}
        <View style={styles.performanceSection}>
          <Text style={styles.sectionTitle}>أداء هذا الشهر</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Ionicons name="star" size={24} color={Colors.light.warning} />
              <Text style={styles.metricNumber}>{metrics.highRatings}</Text>
              <Text style={styles.metricLabel}>تقييم 5 نجوم</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="car" size={24} color={Colors.light.primary} />
              <Text style={styles.metricNumber}>{metrics.completedTrips}</Text>
              <Text style={styles.metricLabel}>رحلة مكتملة</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="time" size={24} color={Colors.light.success} />
              <Text style={styles.metricNumber}>{metrics.streakDays}</Text>
              <Text style={styles.metricLabel}>يوم انضباط</Text>
            </View>
            <View style={styles.metricCard}>
              <Ionicons name="trophy" size={24} color={Colors.light.accent} />
              <Text style={styles.metricNumber}>{metrics.monthlyEarnings}</Text>
              <Text style={styles.metricLabel}>نقطة مكتسبة</Text>
            </View>
          </View>
        </View>

        {/* نصائح كسب النقاط */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>نصائح لكسب المزيد من النقاط</Text>
          <View style={styles.tipCard}>
            <Ionicons name="star" size={20} color={Colors.light.warning} />
            <Text style={styles.tipText}>احرص على الحصول على تقييم 5 نجوم (+20 نقطة لكل تقييم)</Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="time" size={20} color={Colors.light.success} />
            <Text style={styles.tipText}>التزم بالمواعيد لمدة 3 أيام (+50 نقطة)</Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="people" size={20} color={Colors.light.primary} />
            <Text style={styles.tipText}>ادع سائقين جدد (+200 نقطة لكل دعوة ناجحة)</Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="trophy" size={20} color={Colors.light.accent} />
            <Text style={styles.tipText}>أكمل 10 رحلات للحصول على مكافأة (+100 نقطة)</Text>
          </View>
        </View>

        {/* آخر النشاطات */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>آخر النشاطات</Text>
          {loyaltyLogs.slice(0, 8).map((log) => (
            <View key={log.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons 
                  name={getActionIcon(log.action_type) as any} 
                  size={18} 
                  color={log.points_earned > 0 ? Colors.light.success : Colors.light.secondary} 
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{formatActionType(log.action_type)}</Text>
                <Text style={styles.activityDescription}>{log.reason}</Text>
                <Text style={styles.activityDate}>
                  {new Date(log.created_at).toLocaleDateString('ar-SA')}
                </Text>
              </View>
              <View style={styles.activityPoints}>
                <Text style={[
                  styles.pointsText,
                  { color: log.points_earned > 0 ? Colors.light.success : Colors.light.error }
                ]}>
                  {log.points_earned > 0 ? '+' : ''}{log.points_earned || -log.points_spent} ⭐
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderRewards = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>مكافآت السائقين</Text>
      <Text style={styles.sectionDescription}>
        استبدل نقاطك برصيد نقدي أو مكافآت حصرية
      </Text>
      
      {availableRewards.map((reward) => (
        <View key={reward.id} style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <View style={styles.rewardIcon}>
              <Ionicons 
                name={reward.reward_type === 'credit' ? 'card' : 
                      reward.reward_type === 'gift' ? 'gift' :
                      reward.reward_type === 'upgrade' ? 'trending-up' : 'trophy'} 
                size={28} 
                color={Colors.light.primary} 
              />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardName}>{reward.reward_name}</Text>
              <Text style={styles.rewardDescription}>{reward.description}</Text>
              {reward.reward_value && (
                <Text style={styles.rewardValue}>
                  قيمة: {reward.reward_value} دينار
                </Text>
              )}
            </View>
            <View style={styles.rewardCost}>
              <Text style={styles.costPoints}>{reward.cost_points}</Text>
              <Text style={styles.costLabel}>نقطة</Text>
            </View>
          </View>
          
          <View style={styles.rewardFooter}>
            <Text style={styles.rewardTerms}>
              صالح لمدة {reward.validity_days} يوم من تاريخ الاستبدال
            </Text>
            <TouchableOpacity
              style={[
                styles.redeemButton,
                (userLoyalty?.available_points || 0) < reward.cost_points && styles.redeemButtonDisabled
              ]}
              onPress={() => handleRedeemReward(reward.id)}
              disabled={(userLoyalty?.available_points || 0) < reward.cost_points}
            >
              <Text style={[
                styles.redeemButtonText,
                (userLoyalty?.available_points || 0) < reward.cost_points && styles.redeemButtonTextDisabled
              ]}>
                {(userLoyalty?.available_points || 0) >= reward.cost_points ? 'استبدال' : 'غير كافي'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* المكافآت المستبدلة */}
      {userRedemptions.length > 0 && (
        <View style={styles.redemptionsSection}>
          <Text style={styles.sectionTitle}>مكافآتك المستبدلة</Text>
          {userRedemptions.slice(0, 5).map((redemption) => (
            <View key={redemption.id} style={styles.redemptionCard}>
              <View style={styles.redemptionHeader}>
                <View style={styles.redemptionIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
                </View>
                <View style={styles.redemptionInfo}>
                  <Text style={styles.redemptionName}>
                    {(redemption as any).loyalty_rewards?.reward_name || 'مكافأة'}
                  </Text>
                  <Text style={styles.redemptionCode}>كود: {redemption.redemption_code}</Text>
                  <Text style={styles.redemptionDate}>
                    {new Date(redemption.created_at).toLocaleDateString('ar-SA')}
                  </Text>
                </View>
                <View style={styles.redemptionStatus}>
                  <Text style={[
                    styles.statusText,
                    {
                      color: redemption.status === 'used' ? Colors.light.success :
                            redemption.status === 'expired' ? Colors.light.error :
                            Colors.light.warning
                    }
                  ]}>
                    {redemption.status === 'used' ? 'مُستخدم' :
                     redemption.status === 'expired' ? 'منتهي' : 'فعال'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderEarnings = () => {
    const monthlyLogs = loyaltyLogs.filter(log => {
      const logDate = new Date(log.created_at);
      const currentMonth = new Date().getMonth();
      return logDate.getMonth() === currentMonth && log.points_earned > 0;
    });

    const weeklyLogs = loyaltyLogs.filter(log => {
      const logDate = new Date(log.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return logDate >= sevenDaysAgo && log.points_earned > 0;
    });

    const totalMonthlyPoints = monthlyLogs.reduce((sum, log) => sum + log.points_earned, 0);
    const totalWeeklyPoints = weeklyLogs.reduce((sum, log) => sum + log.points_earned, 0);

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* ملخص الأرباح */}
        <View style={styles.earningsCard}>
          <Text style={styles.sectionTitle}>ملخص أرباح النقاط</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNumber}>{totalWeeklyPoints}</Text>
              <Text style={styles.earningsLabel}>هذا الأسبوع</Text>
              <Ionicons name="calendar" size={20} color={Colors.light.primary} />
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNumber}>{totalMonthlyPoints}</Text>
              <Text style={styles.earningsLabel}>هذا الشهر</Text>
              <Ionicons name="trending-up" size={20} color={Colors.light.success} />
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsNumber}>{userLoyalty?.total_points || 0}</Text>
              <Text style={styles.earningsLabel}>الإجمالي</Text>
              <Ionicons name="trophy" size={20} color={Colors.light.warning} />
            </View>
          </View>
        </View>

        {/* تفاصيل مصادر النقاط */}
        <View style={styles.sourcesSection}>
          <Text style={styles.sectionTitle}>مصادر النقاط (هذا الشهر)</Text>
          {Object.entries(
            monthlyLogs.reduce((acc: any, log) => {
              acc[log.action_type] = (acc[log.action_type] || 0) + log.points_earned;
              return acc;
            }, {})
          ).map(([actionType, points]) => (
            <View key={actionType} style={styles.sourceItem}>
              <View style={styles.sourceIcon}>
                <Ionicons 
                  name={getActionIcon(actionType) as any} 
                  size={20} 
                  color={Colors.light.primary} 
                />
              </View>
              <Text style={styles.sourceName}>{formatActionType(actionType)}</Text>
              <Text style={styles.sourcePoints}>+{String(points)} نقطة</Text>
            </View>
          ))}
        </View>

        {/* تاريخ النقاط التفصيلي */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>السجل التفصيلي</Text>
          {loyaltyLogs.map((log) => (
            <View key={log.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <Ionicons 
                  name={getActionIcon(log.action_type) as any} 
                  size={16} 
                  color={log.points_earned > 0 ? Colors.light.success : Colors.light.secondary} 
                />
              </View>
              <View style={styles.historyContent}>
                <Text style={styles.historyTitle}>{formatActionType(log.action_type)}</Text>
                <Text style={styles.historyDescription}>{log.reason}</Text>
                <Text style={styles.historyDate}>
                  {new Date(log.created_at).toLocaleDateString('ar-SA', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
              <View style={styles.historyPoints}>
                <Text style={[
                  styles.pointsText,
                  { color: log.points_earned > 0 ? Colors.light.success : Colors.light.error }
                ]}>
                  {log.points_earned > 0 ? '+' : ''}{log.points_earned || -log.points_spent}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>جاري تحميل لوحة السائق...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* التبويبات */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'dashboard' && styles.activeTab]}
          onPress={() => setSelectedTab('dashboard')}
        >
          <Ionicons 
            name="speedometer" 
            size={20} 
            color={selectedTab === 'dashboard' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'dashboard' && styles.activeTabText
          ]}>
            لوحة التحكم
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
          <Text style={[
            styles.tabText,
            selectedTab === 'rewards' && styles.activeTabText
          ]}>
            المكافآت
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'earnings' && styles.activeTab]}
          onPress={() => setSelectedTab('earnings')}
        >
          <Ionicons 
            name="analytics" 
            size={20} 
            color={selectedTab === 'earnings' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'earnings' && styles.activeTabText
          ]}>
            الأرباح
          </Text>
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      <View style={styles.content}>
        {selectedTab === 'dashboard' && renderDashboard()}
        {selectedTab === 'rewards' && renderRewards()}
        {selectedTab === 'earnings' && renderEarnings()}
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
  mainCard: {
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
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierInfo: {
    marginLeft: 12,
  },
  tierName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  tierSubtitle: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  pointsDisplay: {
    alignItems: 'center',
  },
  pointsNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  pointsLabel: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  progressSection: {
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  progressPoints: {
    fontSize: 12,
    color: Colors.light.secondary,
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
  performanceSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
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
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.light.secondary,
    textAlign: 'center',
  },
  tipsSection: {
    marginBottom: 16,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 12,
    lineHeight: 18,
  },
  activitySection: {
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  activityDescription: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  activityDate: {
    fontSize: 11,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  activityPoints: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 12,
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
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  rewardDescription: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.primary,
    marginTop: 4,
  },
  rewardCost: {
    alignItems: 'center',
  },
  costPoints: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  costLabel: {
    fontSize: 11,
    color: Colors.light.secondary,
  },
  rewardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardTerms: {
    fontSize: 11,
    color: Colors.light.secondary,
    flex: 1,
  },
  redeemButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  redeemButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  redeemButtonText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  redeemButtonTextDisabled: {
    color: Colors.light.secondary,
  },
  redemptionsSection: {
    marginTop: 24,
  },
  redemptionCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  redemptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redemptionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  redemptionInfo: {
    flex: 1,
  },
  redemptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  redemptionCode: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  redemptionDate: {
    fontSize: 11,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  redemptionStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  earningsCard: {
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
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  earningsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginBottom: 8,
  },
  sourcesSection: {
    marginBottom: 16,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sourceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceName: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  sourcePoints: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.success,
  },
  historySection: {
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  historyDescription: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.light.secondary,
    marginTop: 4,
  },
  historyPoints: {
    alignItems: 'flex-end',
  },
});
