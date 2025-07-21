import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, CreditCard, Plus, TrendingUp, DollarSign, History } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
// import { useAuth } from '@/contexts/AuthContext';
import { CurrencyService } from '@/utils/currency-service';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface WalletData {
  balance: number;
  total_recharged: number;
  total_spent: number;
  status: string;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

export default function BalanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // const { user } = useAuth();
  const user = { id: 'sample-user-id' }; // مؤقت للاختبار
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      // جلب بيانات المحفظة
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      setWalletData(walletData);

      // جلب آخر المعاملات
      const { data: transactions, error: transError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transError) {
        throw transError;
      }

      setRecentTransactions(transactions || []);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert(t('error'), t('wallet.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  const formatTransactionType = (type: string) => {
    const types: Record<string, string> = {
      recharge: t('wallet.recharge'),
      deduction: t('wallet.deduction'),
      commission: t('wallet.commission'),
      subscription: t('wallet.subscription'),
      refund: t('wallet.refund'),
    };
    return types[type] || type;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return <Plus size={16} color={colors.success} />;
      case 'deduction':
      case 'commission':
      case 'subscription':
        return <DollarSign size={16} color={colors.error} />;
      case 'refund':
        return <TrendingUp size={16} color={colors.success} />;
      default:
        return <History size={16} color={colors.text} />;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      padding: 20,
      backgroundColor: colors.primary,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center',
      marginBottom: 10,
    },
    balanceCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 15,
      padding: 20,
      marginBottom: 10,
    },
    balanceLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      marginBottom: 5,
    },
    balanceAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 15,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: 5,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: 'white',
    },
    actionButtons: {
      flexDirection: 'row',
      padding: 20,
      gap: 15,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonPrimary: {
      backgroundColor: colors.primary,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginTop: 5,
    },
    actionButtonTextPrimary: {
      color: 'white',
    },
    section: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
    },
    transactionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    transactionIcon: {
      marginRight: 15,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionType: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    transactionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    transactionAmount: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    positiveAmount: {
      color: colors.success,
    },
    negativeAmount: {
      color: colors.error,
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 10,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.emptyState, { flex: 1, justifyContent: 'center' }]}>
          <Wallet size={60} color={colors.textSecondary} />
          <Text style={styles.emptyText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Balance */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('balance.myBalance')}</Text>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t('balance.currentBalance')}</Text>
            <Text style={styles.balanceAmount}>
              {CurrencyService.formatCurrency(walletData?.balance || 0)}
            </Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('balance.totalRecharged')}</Text>
                <Text style={styles.statValue}>
                  {CurrencyService.formatCurrency(walletData?.total_recharged || 0)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('balance.totalSpent')}</Text>
                <Text style={styles.statValue}>
                  {CurrencyService.formatCurrency(walletData?.total_spent || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('../recharge')}
          >
            <Plus size={24} color="white" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              {t('balance.recharge')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('../history')}
          >
            <History size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>{t('balance.history')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('../transfer')}
          >
            <CreditCard size={24} color={colors.text} />
            <Text style={styles.actionButtonText}>{t('balance.transfer')}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('balance.recentTransactions')}</Text>
          
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <History size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{t('balance.noTransactions')}</Text>
            </View>
          ) : (
            recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  {getTransactionIcon(transaction.type)}
                </View>
                
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionType}>
                    {formatTransactionType(transaction.type)}
                  </Text>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
                
                <Text
                  style={[
                    styles.transactionAmount,
                    transaction.amount >= 0 ? styles.positiveAmount : styles.negativeAmount,
                  ]}
                >
                  {transaction.amount >= 0 ? '+' : ''}
                  {CurrencyService.formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
