import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  History, 
  Filter, 
  Calendar,
  ArrowUp,
  ArrowDown,
  CreditCard,
  DollarSign,
  Gift,
  TrendingUp
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CurrencyService } from '@/utils/currency-service';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface Transaction {
  id: string;
  type: 'recharge' | 'deduction' | 'commission' | 'subscription' | 'refund' | 'transfer_sent' | 'transfer_received';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // بيانات تجريبية للمعاملات
  const sampleTransactions: Transaction[] = [
    {
      id: '1',
      type: 'recharge',
      amount: 100.00,
      description: 'شحن رصيد باستخدام بطاقة شحن',
      date: new Date().toISOString(),
      status: 'completed',
      reference: 'IGTAXI15USD03'
    },
    {
      id: '2',
      type: 'commission',
      amount: -15.00,
      description: 'عمولة رحلة تاكسي #TX001',
      date: new Date(Date.now() - 86400000).toISOString(),
      status: 'completed',
      reference: 'TX001'
    },
    {
      id: '3',
      type: 'transfer_sent',
      amount: -50.00,
      description: 'تحويل رصيد إلى +966501234567',
      date: new Date(Date.now() - 172800000).toISOString(),
      status: 'completed',
      reference: 'TF001'
    },
    {
      id: '4',
      type: 'subscription',
      amount: -35.00,
      description: 'اشتراك شهري - خطة أساسية',
      date: new Date(Date.now() - 259200000).toISOString(),
      status: 'completed',
      reference: 'SUB001'
    },
    {
      id: '5',
      type: 'transfer_received',
      amount: 75.00,
      description: 'استلام تحويل من +966509876543',
      date: new Date(Date.now() - 345600000).toISOString(),
      status: 'completed',
      reference: 'TR001'
    },
    {
      id: '6',
      type: 'refund',
      amount: 25.00,
      description: 'استرداد مبلغ رحلة ملغاة',
      date: new Date(Date.now() - 432000000).toISOString(),
      status: 'completed',
      reference: 'REF001'
    }
  ];

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, searchQuery]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // محاكاة تحميل البيانات
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTransactions(sampleTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const applyFilters = () => {
    let filtered = transactions;

    // تصفية حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // تصفية حسب البحث
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return <ArrowDown size={20} color={colors.success} />;
      case 'transfer_received':
      case 'refund':
        return <ArrowDown size={20} color={colors.success} />;
      case 'commission':
      case 'subscription':
      case 'deduction':
        return <ArrowUp size={20} color={colors.error} />;
      case 'transfer_sent':
        return <ArrowUp size={20} color={colors.error} />;
      default:
        return <DollarSign size={20} color={colors.text} />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? colors.success : colors.error;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filterOptions = [
    { key: 'all', label: 'جميع المعاملات' },
    { key: 'recharge', label: 'شحن الرصيد' },
    { key: 'commission', label: 'العمولات' },
    { key: 'subscription', label: 'الاشتراكات' },
    { key: 'transfer_sent', label: 'تحويلات مرسلة' },
    { key: 'transfer_received', label: 'تحويلات مستلمة' },
    { key: 'refund', label: 'استردادات' }
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      padding: 20,
      paddingTop: 60,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: 'white',
      textAlign: 'center',
      marginBottom: 15,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      color: 'white',
      fontSize: 16,
      marginLeft: 10,
    },
    filtersContainer: {
      backgroundColor: colors.card,
      paddingVertical: 15,
    },
    filtersScroll: {
      paddingHorizontal: 20,
    },
    filterButton: {
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 8,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    filterButtonTextActive: {
      color: 'white',
    },
    content: {
      flex: 1,
      padding: 20,
    },
    transactionItem: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    transactionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 15,
    },
    transactionDetails: {
      flex: 1,
    },
    transactionDescription: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 5,
    },
    transactionMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    transactionDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    transactionReference: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '500',
    },
    transactionAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'right',
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 15,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 5,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    summaryCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
    },
    summaryTitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 10,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    summaryLabel: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: 'white',
    },
  });

  // حساب الإحصائيات
  const totalIncome = filteredTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.emptyState, { flex: 1, justifyContent: 'center' }]}>
          <History size={60} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>سجل المعاملات</Text>
        
        {/* Search */}
        <View style={styles.searchContainer}>
          <History size={20} color="rgba(255, 255, 255, 0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="البحث في المعاملات..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Summary */}
        {filteredTransactions.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>ملخص المعاملات</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>إجمالي الواردات</Text>
              <Text style={styles.summaryValue}>
                {CurrencyService.formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>إجمالي المصروفات</Text>
              <Text style={styles.summaryValue}>
                {CurrencyService.formatCurrency(totalExpense)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {filterOptions.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterButton,
                filterType === option.key && styles.filterButtonActive
              ]}
              onPress={() => setFilterType(option.key)}
            >
              <Text style={[
                styles.filterButtonText,
                filterType === option.key && styles.filterButtonTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <History size={60} color={colors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>لا توجد معاملات</Text>
            <Text style={styles.emptyText}>
              {searchQuery || filterType !== 'all' 
                ? 'لم يتم العثور على معاملات تطابق البحث أو الفلتر المحدد'
                : 'لم تقم بأي معاملات مالية حتى الآن'
              }
            </Text>
          </View>
        ) : (
          filteredTransactions.map(transaction => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionIcon}>
                {getTransactionIcon(transaction.type)}
              </View>
              
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionDescription}>
                  {transaction.description}
                </Text>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.date)}
                  </Text>
                  {transaction.reference && (
                    <Text style={styles.transactionReference}>
                      {transaction.reference}
                    </Text>
                  )}
                </View>
              </View>
              
              <Text
                style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(transaction.amount) }
                ]}
              >
                {transaction.amount >= 0 ? '+' : ''}
                {CurrencyService.formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
