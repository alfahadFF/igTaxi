import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Send, User, CreditCard, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CurrencyService } from '@/utils/currency-service';
import Colors from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function TransferScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [transferAmount, setTransferAmount] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // بيانات تجريبية للرصيد الحالي
  const currentBalance = 1500.00;

  const handleTransfer = () => {
    const amount = parseFloat(transferAmount);
    
    // التحقق من صحة البيانات
    if (!amount || amount <= 0) {
      Alert.alert(t('error'), 'يرجى إدخال مبلغ صحيح');
      return;
    }
    
    if (amount > currentBalance) {
      Alert.alert(t('error'), 'الرصيد غير كافي');
      return;
    }
    
    if (!recipientPhone || recipientPhone.length < 10) {
      Alert.alert(t('error'), 'يرجى إدخال رقم هاتف صحيح');
      return;
    }
    
    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    
    try {
      // محاكاة عملية التحويل
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'تم التحويل بنجاح',
        `تم تحويل ${CurrencyService.formatCurrency(parseFloat(transferAmount))} إلى ${recipientPhone}`,
        [
          {
            text: 'موافق',
            onPress: () => {
              // مسح البيانات والعودة
              setTransferAmount('');
              setRecipientPhone('');
              setTransferNote('');
              router.back();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert(t('error'), 'حدث خطأ أثناء التحويل');
    } finally {
      setLoading(false);
    }
  };

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
      marginBottom: 10,
    },
    balanceInfo: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 15,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceLabel: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    balanceAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: 'white',
    },
    form: {
      padding: 20,
    },
    section: {
      marginBottom: 25,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: 8,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      textAlign: 'right',
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    noteInput: {
      height: 80,
      textAlignVertical: 'top',
    },
    transferButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    transferButtonDisabled: {
      backgroundColor: colors.border,
    },
    transferButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    transferButtonTextDisabled: {
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 25,
      margin: 20,
      maxWidth: '90%',
      width: '100%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 20,
    },
    modalDetails: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    modalDetailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    modalDetailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    modalDetailValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 15,
    },
    modalButton: {
      flex: 1,
      borderRadius: 12,
      padding: 15,
      alignItems: 'center',
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonSecondary: {
      backgroundColor: colors.border,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    modalButtonTextPrimary: {
      color: 'white',
    },
    modalButtonTextSecondary: {
      color: colors.text,
    },
    infoBox: {
      backgroundColor: colors.primary + '20',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 5,
    },
    infoText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });

  const isFormValid = transferAmount && recipientPhone && parseFloat(transferAmount) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>تحويل رصيد</Text>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
            <Text style={styles.balanceAmount}>
              {CurrencyService.formatCurrency(currentBalance)}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ما هو تحويل الرصيد؟</Text>
            <Text style={styles.infoText}>
              يمكنك تحويل جزء من رصيدك إلى مستخدم آخر في التطبيق. المبلغ المحول سيُخصم من رصيدك ويُضاف لرصيد المستلم فوراً.
            </Text>
          </View>

          {/* Amount Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <CreditCard size={20} color={colors.primary} style={styles.sectionIcon} />
              <Text>مبلغ التحويل</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={transferAmount}
              onChangeText={setTransferAmount}
              keyboardType="numeric"
            />
          </View>

          {/* Recipient Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <User size={20} color={colors.primary} style={styles.sectionIcon} />
              <Text>رقم هاتف المستلم</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="05xxxxxxxx"
              placeholderTextColor={colors.textSecondary}
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Note Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <Text>ملاحظة (اختيارية)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="أضف ملاحظة للتحويل..."
              placeholderTextColor={colors.textSecondary}
              value={transferNote}
              onChangeText={setTransferNote}
              multiline
            />
          </View>

          {/* Transfer Button */}
          <TouchableOpacity
            style={[
              styles.transferButton,
              !isFormValid && styles.transferButtonDisabled,
            ]}
            onPress={handleTransfer}
            disabled={!isFormValid || loading}
          >
            <Send size={20} color={isFormValid ? 'white' : colors.textSecondary} />
            <Text
              style={[
                styles.transferButtonText,
                !isFormValid && styles.transferButtonTextDisabled,
              ]}
            >
              {loading ? 'جاري التحويل...' : 'تحويل الرصيد'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>تأكيد التحويل</Text>
            
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>المبلغ</Text>
                <Text style={styles.modalDetailValue}>
                  {CurrencyService.formatCurrency(parseFloat(transferAmount || '0'))}
                </Text>
              </View>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>المستلم</Text>
                <Text style={styles.modalDetailValue}>{recipientPhone}</Text>
              </View>
              {transferNote && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>الملاحظة</Text>
                  <Text style={styles.modalDetailValue}>{transferNote}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>
                  إلغاء
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={confirmTransfer}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                  تأكيد
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
