import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import * as Progress from 'react-native-progress';
import LoyaltyService from '@/utils/loyalty-service';
import type { 
  UserLoyalty, 
  LoyaltyReward, 
  LoyaltyTier, 
  LoyaltyRedemption,
  LoyaltyLog 
} from '@/utils/loyalty-service';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');

export default function LoyaltyScreen() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // State management
  const [userLoyalty, setUserLoyalty] = useState<UserLoyalty | null>(null);
  const [availableRewards, setAvailableRewards] = useState<LoyaltyReward[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [userRedemptions, setUserRedemptions] = useState<LoyaltyRedemption[]>([]);
  const [loyaltyStats, setLoyaltyStats] = useState({
    totalEarned: 0,
    totalSpent: 0,
    currentStreak: 0,
    monthlyEarned: 0,
    referralCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingReward, setRedeemingReward] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'rewards' | 'history'>('overview');

  // Get current user profile
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

      // Load available rewards
      const rewards = await LoyaltyService.getAvailableRewards(loyalty?.role);
      setAvailableRewards(rewards);

      // Load loyalty tiers
      const tiers = await LoyaltyService.getLoyaltyTiers();
      setLoyaltyTiers(tiers);

      // Load user redemptions
      const redemptions = await LoyaltyService.getUserRedemptions(currentUserId);
      setUserRedemptions(redemptions);

      // Load loyalty stats
      const stats = await LoyaltyService.getLoyaltyStats(currentUserId);
      setLoyaltyStats(stats);

    } catch (error) {
      console.error('Error loading loyalty data:', error);
      Alert.alert(
        t('error'),
        t('failedToLoadData')
      );
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

    // Check eligibility
    const eligibility = await LoyaltyService.checkRewardEligibility(currentUserId, reward.id);
    if (!eligibility.eligible) {
      Alert.alert(t('notEligible'), eligibility.reason || t('unknownError'));
      return;
    }

    Alert.alert(
      t('confirmRedemption'),
      t('confirmRedemptionMessage', { 
        reward: isRTL ? reward.reward_name_ar : reward.reward_name,
        points: reward.cost_points 
      }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('redeem'),
          onPress: async () => {
            setRedeemingReward(reward.id);
            try {
              const result = await LoyaltyService.redeemReward(currentUserId, reward.id);
              if (result.success) {
                Alert.alert(
                  t('redeemSuccess'),
                  t('redeemSuccessMessage', { code: result.redemptionCode }),
                  [{ text: t('ok'), onPress: () => loadLoyaltyData() }]
                );
              } else {
                Alert.alert(t('error'), result.error || t('unknownError'));
              }
            } catch (error) {
              console.error('Error redeeming reward:', error);
              Alert.alert(t('error'), t('unknownError'));
            } finally {
              setRedeemingReward(null);
            }
          }
        }
      ]
    );
  };

  const getCurrentTier = () => {
    if (!userLoyalty || !loyaltyTiers.length) return null;
    return loyaltyTiers.find(tier => tier.tier_level === userLoyalty.tier_level);
  };

  const getNextTier = () => {
    if (!userLoyalty || !loyaltyTiers.length) return null;
    return loyaltyTiers.find(tier => tier.tier_level === userLoyalty.tier_level + 1);
  };

  const getTierProgress = () => {
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    
    if (!currentTier || !nextTier || !userLoyalty) return 0;
    
    const currentPoints = userLoyalty.total_points;
    const currentTierMin = currentTier.min_points;
    const nextTierMin = nextTier.min_points;
    
    return Math.min((currentPoints - currentTierMin) / (nextTierMin - currentTierMin), 1);
  };

  const renderLoyaltyCard = () => {
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    const progress = getTierProgress();

    return (
      <LinearGradient
        colors={['#FF6B6B', '#4ECDC4']}
        style={styles.loyaltyCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.tierBadge, { 
            backgroundColor: currentTier?.color || '#FFD700' 
          }]}>
            <Ionicons 
              name="trophy" 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.tierText}>
              {isRTL ? currentTier?.tier_name_ar : currentTier?.tier_name || 'Bronze'}
            </Text>
          </View>
          <Text style={styles.pointsText}>
            {userLoyalty?.available_points || 0} {t('points')}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.totalPointsLabel}>{t('totalPoints')}</Text>
          <Text style={styles.totalPointsValue}>
            {userLoyalty?.total_points || 0}
          </Text>
        </View>

        {nextTier && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {t('progressToNext', { 
                  tier: isRTL ? nextTier.tier_name_ar : nextTier.tier_name 
                })}
              </Text>
              <Text style={styles.progressPoints}>
                {nextTier.min_points - (userLoyalty?.total_points || 0)} {t('pointsNeeded')}
              </Text>
            </View>
            <Progress.Bar
              progress={progress}
              width={width - 80}
              height={8}
              color="#FFFFFF"
              unfilledColor="rgba(255,255,255,0.3)"
              borderWidth={0}
              style={styles.progressBar}
            />
          </View>
        )}
      </LinearGradient>
    );
  };

  const renderStatsCards = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Ionicons name="trending-up" size={24} color="#4ECDC4" />
        <Text style={styles.statValue}>{loyaltyStats.monthlyEarned}</Text>
        <Text style={styles.statLabel}>{t('thisMonth')}</Text>
      </View>
      
      <View style={styles.statCard}>
        <Ionicons name="people" size={24} color="#FF6B6B" />
        <Text style={styles.statValue}>{loyaltyStats.referralCount}</Text>
        <Text style={styles.statLabel}>{t('referrals')}</Text>
      </View>
      
      <View style={styles.statCard}>
        <Ionicons name="gift" size={24} color="#FFD93D" />
        <Text style={styles.statValue}>{loyaltyStats.totalSpent}</Text>
        <Text style={styles.statLabel}>{t('redeemed')}</Text>
      </View>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
        onPress={() => setSelectedTab('overview')}
      >
        <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
          {t('overview')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'rewards' && styles.activeTab]}
        onPress={() => setSelectedTab('rewards')}
      >
        <Text style={[styles.tabText, selectedTab === 'rewards' && styles.activeTabText]}>
          {t('rewards')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
        onPress={() => setSelectedTab('history')}
      >
        <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>
          {t('history')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRewardItem = ({ item }: { item: LoyaltyReward }) => (
    <TouchableOpacity
      style={[
        styles.rewardCard,
        (!userLoyalty || userLoyalty.available_points < item.cost_points) && styles.disabledCard
      ]}
      onPress={() => handleRedeemReward(item)}
      disabled={!userLoyalty || userLoyalty.available_points < item.cost_points || redeemingReward === item.id}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.rewardImage} />
      ) : (
        <View style={styles.rewardIconContainer}>
          <Ionicons 
            name={item.reward_type === 'discount' ? 'pricetag' : 'gift'} 
            size={32} 
            color="#4ECDC4" 
          />
        </View>
      )}
      
      <View style={styles.rewardInfo}>
        <Text style={styles.rewardTitle}>
          {isRTL ? item.reward_name_ar : item.reward_name}
        </Text>
        <Text style={styles.rewardDescription}>
          {isRTL ? item.description_ar : item.description}
        </Text>
        <Text style={styles.rewardPoints}>
          {item.cost_points} {t('points')}
        </Text>
      </View>
      
      {redeemingReward === item.id && (
        <ActivityIndicator size="small" color="#4ECDC4" style={styles.rewardLoader} />
      )}
    </TouchableOpacity>
  );

  const renderRedemptionItem = ({ item }: { item: LoyaltyRedemption }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>
          {item.loyalty_rewards?.reward_name}
        </Text>
        <Text style={styles.historyDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.historyDetails}>
        <Text style={styles.historyPoints}>
          -{item.points_spent} {t('points')}
        </Text>
        <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
          <Text style={styles.statusText}>
            {t(item.status)}
          </Text>
        </View>
      </View>
      
      {item.redemption_code && (
        <Text style={styles.redemptionCode}>
          {t('code')}: {item.redemption_code}
        </Text>
      )}
    </View>
  );

  const renderContent = () => {
    switch (selectedTab) {
      case 'overview':
        return (
          <View>
            {renderStatsCards()}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('referralProgram')}</Text>
            </View>
            <View style={styles.referralCard}>
              <Ionicons name="people" size={32} color="#4ECDC4" />
              <Text style={styles.referralTitle}>{t('inviteFriends')}</Text>
              <Text style={styles.referralDescription}>
                {t('referralDescription')}
              </Text>
              <Text style={styles.referralCode}>
                {t('yourCode')}: {userLoyalty?.referral_code || ''}
              </Text>
            </View>
          </View>
        );
        
      case 'rewards':
        return (
          <FlatList
            data={availableRewards}
            renderItem={renderRewardItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.rewardsList}
          />
        );
        
      case 'history':
        return (
          <FlatList
            data={userRedemptions}
            renderItem={renderRedemptionItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyText}>{t('noRedemptions')}</Text>
              </View>
            }
          />
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>{t('loading')}</Text>
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
        {renderLoyaltyCard()}
        {renderTabBar()}
        {renderContent()}
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
    backgroundColor: '#FFD700',
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
  progressSection: {
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  progressPoints: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    color: '#333333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#4ECDC4',
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  referralCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
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
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  referralDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
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
  rewardsList: {
    paddingHorizontal: 20,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  rewardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  rewardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  rewardLoader: {
    marginLeft: 12,
  },
  historyList: {
    paddingHorizontal: 20,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#666666',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusapproved: {
    backgroundColor: '#E7F5E7',
  },
  statuspending: {
    backgroundColor: '#FFF3CD',
  },
  statusused: {
    backgroundColor: '#D1ECF1',
  },
  statusexpired: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  redemptionCode: {
    fontSize: 12,
    color: '#4ECDC4',
    fontFamily: 'monospace',
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 16,
  },
});
