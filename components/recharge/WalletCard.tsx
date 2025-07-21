import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { RechargeService, UserWallet, WalletTransaction } from '@/utils/recharge-service';
import { CurrencyService } from '@/utils/currency-service';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

interface WalletCardProps {
  onRechargePress: () => void;
}

const WalletCard: React.FC<WalletCardProps> = ({ onRechargePress }) => {
  const { t, i18n } = useTranslation();
  const { state } = useApp();
  const { user, theme } = state;
  const isRTL = i18n.dir() === 'rtl';
  const router = useRouter();

  // State
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [serviceAccess, setServiceAccess] = useState<{
    hasAccess: boolean;
    reason?: string;
  }>({ hasAccess: true });

  // Colors
  const colors = Colors[theme as keyof typeof Colors] || Colors.light;

  // Load wallet data
  const loadWalletData = async (showLoader = true) => {
    if (!user?.id) return;

    if (showLoader) setLoading(true);

    try {
      // Load wallet
      const walletData = await RechargeService.getUserWallet(user.id);
      setWallet(walletData);

      // Check service access
      const accessData = await RechargeService.checkServiceAccess(user.id);
      setServiceAccess(accessData);

      // Load recent transactions
      const transactionsData = await RechargeService.getWalletTransactions(user.id, 10);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletData(false);
    setRefreshing(false);
  };

  // Load data on mount
  useEffect(() => {
    // Initialize currency service
    RechargeService.initializeCurrency();
    loadWalletData();
  }, [user?.id]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return RechargeService.formatCurrency(amount, isRTL);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get transaction icon
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return 'add-circle';
      case 'deduction':
      case 'commission':
        return 'remove-circle';
      case 'refund':
        return 'return-up-back';
      case 'subscription':
        return 'calendar';
      default:
        return 'swap-horizontal';
    }
  };

  // Get transaction color
  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'recharge':
      case 'refund':
        return colors.success;
      case 'deduction':
      case 'commission':
      case 'subscription':
        return colors.error;
      default:
        return colors.text;
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {t('wallet.loading')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Wallet Balance Card */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight || colors.primary]}
        style={styles.walletCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.walletHeader}>
          <Text style={styles.walletTitle}>
            {t('wallet.currentBalance')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              loadWalletData();
            }}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.balanceAmount}>
          {formatCurrency(wallet?.balance || 0)}
        </Text>

        <View style={styles.walletStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {t('wallet.totalRecharged')}
            </Text>
            <Text style={styles.statValue}>
              {formatCurrency(wallet?.total_recharged || 0)}
            </Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>
              {t('wallet.totalSpent')}
            </Text>
            <Text style={styles.statValue}>
              {formatCurrency(wallet?.total_spent || 0)}
            </Text>
          </View>
        </View>

        {/* Service Access Status */}
        {!serviceAccess.hasAccess && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#FFF176" />
            <Text style={styles.warningText}>
              {serviceAccess.reason}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onRechargePress();
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>
            {t('wallet.recharge')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTransactions(true);
          }}
        >
          <Ionicons name="list" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>
            {t('wallet.transactions')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <View style={[styles.transactionsSection, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('wallet.recentTransactions')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowTransactions(true)}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                {t('wallet.seeAll')}
              </Text>
            </TouchableOpacity>
          </View>

          {transactions.slice(0, 3).map((transaction) => (
            <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: getTransactionColor(transaction.type) + '20' }
                ]}>
                  <Ionicons
                    name={getTransactionIcon(transaction.type) as any}
                    size={16}
                    color={getTransactionColor(transaction.type)}
                  />
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionDescription, { color: colors.text }]}>
                    {transaction.description || t(`wallet.transactionTypes.${transaction.type}`)}
                  </Text>
                  <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                    {formatDate(transaction.created_at)}
                  </Text>
                </View>
              </View>
              
              <Text style={[
                styles.transactionAmount,
                { color: getTransactionColor(transaction.type) }
              ]}>
                {transaction.amount > 0 ? '+' : ''}
                {formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Transactions Modal */}
      <Modal
        visible={showTransactions}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('wallet.allTransactions')}
            </Text>
            <TouchableOpacity
              onPress={() => setShowTransactions(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: colors.border }]}>
                <View style={styles.transactionLeft}>
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: getTransactionColor(transaction.type) + '20' }
                  ]}>
                    <Ionicons
                      name={getTransactionIcon(transaction.type) as any}
                      size={16}
                      color={getTransactionColor(transaction.type)}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: colors.text }]}>
                      {transaction.description || t(`wallet.transactionTypes.${transaction.type}`)}
                    </Text>
                    <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                      {formatDate(transaction.created_at)}
                    </Text>
                    {transaction.reference_type && (
                      <Text style={[styles.transactionReference, { color: colors.textSecondary }]}>
                        {t(`wallet.referenceTypes.${transaction.reference_type}`)}
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(transaction.type) }
                  ]}>
                    {transaction.amount > 0 ? '+' : ''}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                  <Text style={[styles.balanceAfter, { color: colors.textSecondary }]}>
                    {t('wallet.balance')}: {formatCurrency(transaction.balance_after)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
  },
  walletCard: {
    margin: 20,
    padding: 25,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  walletTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    color: '#fff',
    opacity: 0.9,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: Typography.fontFamily.arabic.bold,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 15,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.arabic.regular,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 5,
  },
  statValue: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.arabic.bold,
    color: '#fff',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: 'rgba(255,193,7,0.2)',
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.arabic.medium,
    color: '#fff',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    color: '#fff',
  },
  transactionsSection: {
    margin: 20,
    marginTop: 30,
    borderRadius: 15,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.arabic.bold,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.arabic.medium,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.arabic.medium,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.arabic.regular,
  },
  transactionReference: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.arabic.regular,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.bold,
    marginBottom: 4,
  },
  balanceAfter: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.arabic.regular,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.arabic.bold,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default WalletCard;
