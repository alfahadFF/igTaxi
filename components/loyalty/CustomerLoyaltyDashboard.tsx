import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
  ActivityIndicator,
  Image,
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

interface CustomerLoyaltyDashboardProps {
  profileId: string;
  onRedeemSuccess?: (redemptionCode: string) => void;
}

export const CustomerLoyaltyDashboard: React.FC<CustomerLoyaltyDashboardProps> = ({
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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rewards' | 'history'>('overview');

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
        LoyaltyService.getLoyaltyLogs(profileId, 20),
        LoyaltyService.getAvailableRewards('customer'),
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
      // التحقق من الأهلية أولاً
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
                        // نسخ الكود هنا
                        if (onRedeemSuccess) {
                          onRedeemSuccess(result.redemptionCode!);
                        }
                      }
                    },
                    { text: 'حسناً' }
                  ]
                );
                loadLoyaltyData(); // إعادة تحميل البيانات
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

  const shareReferralCode = async () => {
    if (!userLoyalty?.referral_code) return;

    const referralLink = `https://igtaxi.com/signup?r=${userLoyalty.referral_code}`;
    const message = `🚗 انضم إلى IGTaxi واحصل على رحلة مجانية!\n\nاستخدم كود الدعوة: ${userLoyalty.referral_code}\n\nحمل التطبيق: ${referralLink}\n\n⭐ ستحصل على 50 نقطة عند التسجيل وأنا سأحصل على 100 نقطة!`;

    try {
      await Share.share({
        message,
        title: 'ادع أصدقاءك إلى IGTaxi',
      });
    } catch (error) {
      console.error('خطأ في المشاركة:', error);
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

  const formatActionType = (actionType: string) => {
    const actions: { [key: string]: string } = {
      'signup_bonus': 'مكافأة التسجيل',
      'first_trip_completed': 'أول رحلة',
      'trip_completed': 'رحلة مكتملة',
      'payment_made': 'دفع',
      'referral_completed': 'دعوة صديق',
      'referral_bonus': 'مكافأة الدعوة',
      'rating_given': 'تقييم مُعطى',
      'app_shared': 'مشاركة التطبيق',
      'reward_redeemed': 'استبدال مكافأة',
      'tier_upgrade': 'ترقية المستوى'
    };
    return actions[actionType] || actionType;
  };

  const getActionIcon = (actionType: string) => {
    const icons: { [key: string]: string } = {
      'signup_bonus': 'gift',
      'first_trip_completed': 'car',
      'trip_completed': 'checkmark-circle',
      'payment_made': 'card',
      'referral_completed': 'people',
      'referral_bonus': 'heart',
      'rating_given': 'star',
      'app_shared': 'share',
      'reward_redeemed': 'trophy',
      'tier_upgrade': 'trending-up'
    };
    return icons[actionType] || 'information-circle';
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* بطاقة النقاط الرئيسية */}
      <View style={styles.mainCard}>
        <View style={styles.pointsHeader}>
          <View style={styles.tierBadge}>
            <Ionicons 
              name={getTierInfo(userLoyalty?.tier_level || 'bronze')?.tier_icon as any || 'medal'} 
              size={24} 
              color={getTierInfo(userLoyalty?.tier_level || 'bronze')?.tier_color || Colors.light.primary} 
            />
            <Text style={styles.tierName}>{userLoyalty?.tier_level}</Text>
          </View>
          <TouchableOpacity style={styles.shareButton} onPress={shareReferralCode}>
            <Ionicons name="share" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.pointsDisplay}>
          <Text style={styles.pointsNumber}>{userLoyalty?.available_points || 0}</Text>
          <Text style={styles.pointsLabel}>نقطة متاحة</Text>
        </View>

        {/* شريط التقدم للمستوى التالي */}
        {getNextTier() && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>التقدم نحو {getNextTier()?.tier_name}</Text>
              <Text style={styles.progressPoints}>
                {getNextTier()?.min_points! - (userLoyalty?.total_points || 0)} نقطة متبقية
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

      {/* إحصائيات سريعة */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color={Colors.light.warning} />
          <Text style={styles.statNumber}>{stats.totalEarned || 0}</Text>
          <Text style={styles.statLabel}>إجمالي النقاط</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color={Colors.light.success} />
          <Text style={styles.statNumber}>{stats.referralCount || 0}</Text>
          <Text style={styles.statLabel}>الدعوات</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color={Colors.light.primary} />
          <Text style={styles.statNumber}>{stats.monthlyEarned || 0}</Text>
          <Text style={styles.statLabel}>هذا الشهر</Text>
        </View>
      </View>

      {/* كود الدعوة */}
      <View style={styles.referralCard}>
        <View style={styles.referralHeader}>
          <Ionicons name="gift" size={24} color={Colors.light.primary} />
          <Text style={styles.referralTitle}>ادع أصدقاءك</Text>
        </View>
        <Text style={styles.referralDescription}>
          احصل على 100 نقطة عند دعوة صديق وسيحصل هو على 50 نقطة
        </Text>
        <View style={styles.referralCodeContainer}>
          <Text style={styles.referralCode}>{userLoyalty?.referral_code}</Text>
          <TouchableOpacity style={styles.shareReferralButton} onPress={shareReferralCode}>
            <Text style={styles.shareReferralText}>مشاركة</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* أحدث النشاطات */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>آخر النشاطات</Text>
        {loyaltyLogs.slice(0, 5).map((log) => (
          <View key={log.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons 
                name={getActionIcon(log.action_type) as any} 
                size={20} 
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

  const renderRewards = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>المكافآت المتاحة</Text>
      
      {availableRewards.map((reward) => (
        <View key={reward.id} style={styles.rewardCard}>
          <View style={styles.rewardHeader}>
            <View style={styles.rewardIcon}>
              <Ionicons 
                name={reward.reward_type === 'free_trip' ? 'car' : 
                      reward.reward_type === 'discount' ? 'pricetag' :
                      reward.reward_type === 'credit' ? 'card' : 'gift'} 
                size={24} 
                color={Colors.light.primary} 
              />
            </View>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardName}>{reward.reward_name}</Text>
              <Text style={styles.rewardDescription}>{reward.description}</Text>
            </View>
            <View style={styles.rewardCost}>
              <Text style={styles.costPoints}>{reward.cost_points}</Text>
              <Text style={styles.costLabel}>نقطة</Text>
            </View>
          </View>
          
          <View style={styles.rewardFooter}>
            <Text style={styles.rewardValue}>
              قيمة: {reward.reward_value} {reward.reward_type === 'discount' ? '%' : 'دينار'}
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
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* المكافآت المستبدلة */}
      <Text style={styles.sectionTitle}>المكافآت المستبدلة</Text>
      {userRedemptions.map((redemption) => (
        <View key={redemption.id} style={styles.redemptionCard}>
          <View style={styles.redemptionHeader}>
            <View style={styles.redemptionIcon}>
              <Ionicons name="trophy" size={20} color={Colors.light.warning} />
            </View>
            <View style={styles.redemptionInfo}>
              <Text style={styles.redemptionName}>
                {(redemption as any).loyalty_rewards?.reward_name || 'مكافأة'}
              </Text>
              <Text style={styles.redemptionCode}>كود: {redemption.redemption_code}</Text>
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
          <Text style={styles.redemptionDate}>
            {new Date(redemption.created_at).toLocaleDateString('ar-SA')}
          </Text>
        </View>
      ))}

      {/* تاريخ النقاط الكامل */}
      <Text style={styles.sectionTitle}>تاريخ النقاط</Text>
      {loyaltyLogs.map((log) => (
        <View key={log.id} style={styles.historyItem}>
          <View style={styles.historyIcon}>
            <Ionicons 
              name={getActionIcon(log.action_type) as any} 
              size={18} 
              color={log.points_earned > 0 ? Colors.light.success : Colors.light.secondary} 
            />
          </View>
          <View style={styles.historyContent}>
            <Text style={styles.historyTitle}>{formatActionType(log.action_type)}</Text>
            <Text style={styles.historyDescription}>{log.reason}</Text>
            <Text style={styles.historyDate}>
              {new Date(log.created_at).toLocaleDateString('ar-SA', {
                year: 'numeric',
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
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>جاري تحميل نقاطك...</Text>
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
            name="home" 
            size={20} 
            color={selectedTab === 'overview' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'overview' && styles.activeTabText
          ]}>
            نظرة عامة
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
          style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
          onPress={() => setSelectedTab('history')}
        >
          <Ionicons 
            name="time" 
            size={20} 
            color={selectedTab === 'history' ? Colors.light.primary : Colors.light.secondary} 
          />
          <Text style={[
            styles.tabText,
            selectedTab === 'history' && styles.activeTabText
          ]}>
            السجل
          </Text>
        </TouchableOpacity>
      </View>

      {/* المحتوى */}
      <View style={styles.content}>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'rewards' && renderRewards()}
        {selectedTab === 'history' && renderHistory()}
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
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginLeft: 8,
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
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  pointsLabel: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 4,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.secondary,
    textAlign: 'center',
  },
  referralCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 12,
  },
  referralDescription: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  referralCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  shareReferralButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  shareReferralText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  rewardCost: {
    alignItems: 'center',
  },
  costPoints: {
    fontSize: 18,
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
  rewardValue: {
    fontSize: 12,
    color: Colors.light.secondary,
  },
  redeemButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
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
  redemptionCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  redemptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  redemptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  redemptionStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  redemptionDate: {
    fontSize: 11,
    color: Colors.light.secondary,
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
