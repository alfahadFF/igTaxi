import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import LoyaltyService from '@/utils/loyalty-service';
import type { UserLoyalty, LoyaltyReward, LoyaltyTier } from '@/utils/loyalty-service';

export default function LoyaltyScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [userLoyalty, setUserLoyalty] = useState<UserLoyalty | null>(null);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [availableRewards, setAvailableRewards] = useState<LoyaltyReward[]>([]);
  const [loyaltyStats, setLoyaltyStats] = useState({
    totalEarned: 0,
    totalSpent: 0,
    currentStreak: 0,
    monthlyEarned: 0,
    referralCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadLoyaltyData();
    }
  }, [currentUserId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadLoyaltyData = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);

      // Load user loyalty data
      const loyalty = await LoyaltyService.getUserLoyalty(currentUserId);
      setUserLoyalty(loyalty);

      // Load loyalty tiers
      const tiers = await LoyaltyService.getLoyaltyTiers();
      setLoyaltyTiers(tiers);

      // Load available rewards
      const rewards = await LoyaltyService.getAvailableRewards();
      setAvailableRewards(rewards);

      // Load loyalty stats
      const stats = await LoyaltyService.getLoyaltyStats(currentUserId);
      setLoyaltyStats(stats);

    } catch (error) {
      console.error('Error loading loyalty data:', error);
      Alert.alert('خطأ', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLoyaltyData();
  };

  const handleRedeemReward = async (reward: LoyaltyReward) => {
    if (!currentUserId || !userLoyalty) return;

    if (userLoyalty.available_points < reward.cost_points) {
      Alert.alert('نقاط غير كافية', 'لا تملك نقاط كافية لاستبدال هذه المكافأة');
      return;
    }

    Alert.alert(
      'استبدال المكافأة',
      `هل تريد استبدال ${reward.cost_points} نقطة للحصول على ${reward.reward_name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'استبدال',
          onPress: async () => {
            try {
              await LoyaltyService.redeemReward(currentUserId, reward.id);
              Alert.alert('تم بنجاح', 'تم استبدال المكافأة بنجاح');
              loadLoyaltyData(); // Refresh data
            } catch (error) {
              Alert.alert('خطأ', 'فشل في استبدال المكافأة');
            }
          }
        }
      ]
    );
  };

  const getTierName = (tierLevel: string) => {
    const tierNames = {
      bronze: 'برونزي',
      silver: 'فضي',
      gold: 'ذهبي',
      platinum: 'بلاتيني',
      vip: 'VIP'
    };
    return tierNames[tierLevel as keyof typeof tierNames] || tierLevel;
  };

  const getTierProgress = () => {
    if (!userLoyalty || loyaltyTiers.length === 0) return 0;
    
    // Convert tier_level string to number for comparison
    const tierMapping = { bronze: 1, silver: 2, gold: 3, platinum: 4, vip: 5 };
    const currentTierLevel = tierMapping[userLoyalty.tier_level] || 1;
    
    const currentTier = loyaltyTiers.find(t => t.tier_level === currentTierLevel);
    const nextTier = loyaltyTiers.find(t => t.tier_level === currentTierLevel + 1);
    
    if (!currentTier || !nextTier) return 100;
    
    const progress = ((userLoyalty.total_points - currentTier.min_points) / 
                     (nextTier.min_points - currentTier.min_points)) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  const getPointsToNextTier = () => {
    if (!userLoyalty || loyaltyTiers.length === 0) return 0;
    
    const tierMapping = { bronze: 1, silver: 2, gold: 3, platinum: 4, vip: 5 };
    const currentTierLevel = tierMapping[userLoyalty.tier_level] || 1;
    
    const nextTier = loyaltyTiers.find(t => t.tier_level === currentTierLevel + 1);
    if (!nextTier) return 0;
    
    return Math.max(0, nextTier.min_points - userLoyalty.total_points);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            نظام الولاء
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            اربح النقاط واستبدلها بمكافآت
          </Text>
        </View>

        {/* Loyalty Card */}
        <LinearGradient
          colors={['#FF6B6B', '#4ECDC4']}
          style={styles.loyaltyCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.tierBadge}>
              <Ionicons name="trophy" size={16} color="#FFFFFF" />
              <Text style={styles.tierText}>
                {getTierName(userLoyalty?.tier_level || 'bronze')}
              </Text>
            </View>
            <Text style={styles.pointsText}>
              {userLoyalty?.available_points || 0} نقطة
            </Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.totalPointsLabel}>إجمالي النقاط المكتسبة</Text>
            <Text style={styles.totalPointsValue}>
              {userLoyalty?.total_points || 0}
            </Text>
          </View>

          {/* Progress to next tier */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>
              التقدم للمستوى التالي
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${getTierProgress()}%` }]} 
              />
            </View>
            <Text style={styles.progressText}>
              {getPointsToNextTier()} نقطة للمستوى التالي
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.roleText}>
              {userLoyalty?.role === 'driver' ? 'سائق' : 'عميل'}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="trending-up" size={24} color="#4ECDC4" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {loyaltyStats.monthlyEarned}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              هذا الشهر
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="people" size={24} color="#FF6B6B" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {loyaltyStats.referralCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              الدعوات
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="gift" size={24} color="#FFD93D" />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {loyaltyStats.totalSpent}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              نقاط مستبدلة
            </Text>
          </View>
        </View>

        {/* Available Rewards */}
        <View style={styles.sectionHeader}>
          <Ionicons name="gift" size={20} color="#4ECDC4" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            المكافآت المتاحة
          </Text>
        </View>
        
        {availableRewards.map((reward) => (
          <TouchableOpacity
            key={reward.id}
            style={[
              styles.rewardCard, 
              { backgroundColor: colors.card },
              !reward.is_active && styles.disabledCard
            ]}
            onPress={() => handleRedeemReward(reward)}
            disabled={!reward.is_active || (userLoyalty?.available_points || 0) < reward.cost_points}
          >
            <View style={styles.rewardIcon}>
              <Ionicons name="gift" size={24} color="#4ECDC4" />
            </View>
            <View style={styles.rewardDetails}>
              <Text style={[styles.rewardTitle, { color: colors.text }]}>
                {reward.reward_name}
              </Text>
              <Text style={[styles.rewardDescription, { color: colors.textSecondary }]}>
                {reward.description}
              </Text>
              <Text style={styles.rewardPoints}>
                {reward.cost_points} نقطة
              </Text>
            </View>
            <View style={styles.rewardAction}>
              {(userLoyalty?.available_points || 0) >= reward.cost_points ? (
                <Text style={styles.canRedeemText}>يمكن الاستبدال</Text>
              ) : (
                <Text style={styles.cannotRedeemText}>نقاط غير كافية</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* Referral Program */}
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color="#4ECDC4" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            برنامج الإحالة
          </Text>
        </View>
        
        <View style={[styles.referralCard, { backgroundColor: colors.card }]}>
          <Ionicons name="people" size={32} color="#4ECDC4" />
          <Text style={[styles.referralTitle, { color: colors.text }]}>
            ادع أصدقاءك
          </Text>
          <Text style={[styles.referralDescription, { color: colors.textSecondary }]}>
            احصل على نقاط مكافآت عند دعوة الأصدقاء لاستخدام التطبيق
          </Text>
          <View style={styles.referralCodeContainer}>
            <Text style={[styles.referralCodeLabel, { color: colors.textSecondary }]}>
              كود الإحالة الخاص بك:
            </Text>
            <Text style={styles.referralCode}>
              {userLoyalty?.referral_code || 'غير متوفر'}
            </Text>
          </View>
        </View>

        {/* How to Earn Points */}
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle" size={20} color="#4ECDC4" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            كيفية كسب النقاط
          </Text>
        </View>
        
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.infoItem}>
            <Ionicons name="car" size={20} color="#4ECDC4" />
            <Text style={[styles.infoText, { color: colors.text }]}>
              أكمل رحلة - 10 نقاط
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#FFD93D" />
            <Text style={[styles.infoText, { color: colors.text }]}>
              قيم الخدمة - 15 نقطة
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={20} color="#FF6B6B" />
            <Text style={[styles.infoText, { color: colors.text }]}>
              ادع صديق - 50 نقطة
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color="#9C27B0" />
            <Text style={[styles.infoText, { color: colors.text }]}>
              ادفع - 10 نقاط لكل دينار
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  loyaltyCard: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tierText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardBody: {
    alignItems: 'center',
    marginBottom: 20,
  },
  totalPointsLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  totalPointsValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  cardFooter: {
    alignItems: 'center',
  },
  roleText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rewardCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.6,
  },
  rewardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardDetails: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  rewardAction: {
    alignItems: 'center',
  },
  canRedeemText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  cannotRedeemText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  referralCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  referralDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  referralCodeContainer: {
    alignItems: 'center',
  },
  referralCodeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  referralCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4ECDC4',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
});
