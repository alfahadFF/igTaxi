import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera, CameraView, BarcodeScanningResult } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { RechargeService, RechargeCard } from '@/utils/recharge-service';
import { CurrencyService } from '@/utils/currency-service';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';
import { Typography } from '@/constants/Typography';

const RechargeScreen = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { state } = useApp();
  const { user, theme } = state;
  const isRTL = i18n.dir() === 'rtl';

  // State Management
  const [cardCode, setCardCode] = useState('');
  const [validatedCard, setValidatedCard] = useState<RechargeCard | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Colors based on theme
  const colors = Colors[theme as keyof typeof Colors] || Colors.light;

  // Initialize currency service
  useEffect(() => {
    RechargeService.initializeCurrency();
  }, []);

  // Request camera permission
  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  // Validate card code
  const validateCard = async (code: string) => {
    if (!code || code.length < 6) {
      setError(null);
      setValidatedCard(null);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await RechargeService.validateCard(code);
      
      if (result.success && result.card) {
        setValidatedCard(result.card);
        setError(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setValidatedCard(null);
        setError(result.error || t('recharge.invalidCard'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error('Error validating card:', err);
      setError(t('recharge.validationError'));
      setValidatedCard(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle QR code scan
  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setShowScanner(false);
    setCardCode(data);
    validateCard(data);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Redeem card
  const redeemCard = async () => {
    if (!validatedCard || !user?.id) return;

    setIsRedeeming(true);

    try {
      const result = await RechargeService.redeemCard(cardCode, user.id);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          t('recharge.success'),
          t('recharge.rechargeSuccessMessage', { 
            amount: RechargeService.formatCurrency(validatedCard.value, isRTL),
            balance: RechargeService.formatCurrency(result.wallet?.balance || 0, isRTL)
          }),
          [
            {
              text: t('common.ok'),
              onPress: () => {
                setCardCode('');
                setValidatedCard(null);
                router.back();
              }
            }
          ]
        );
      } else {
        setError(result.error || t('recharge.redeemError'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error('Error redeeming card:', err);
      setError(t('recharge.redeemError'));
    } finally {
      setIsRedeeming(false);
    }
  };

  // Handle input change
  const handleInputChange = (text: string) => {
    const cleanText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCardCode(cleanText);
    setError(null);
    
    // Auto-validate when user stops typing
    setTimeout(() => {
      validateCard(cleanText);
    }, 500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
            
            <Text style={[styles.title, { color: colors.text }]}>
              {t('recharge.title')}
            </Text>
            
            <View style={styles.placeholder} />
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight || colors.primary]}
              style={styles.logoGradient}
            >
              <Text style={styles.logoText}>IGTaxi</Text>
            </LinearGradient>
          </View>

          {/* Instruction */}
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            {t('recharge.instruction')}
          </Text>

          {/* Card Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('recharge.cardCode')}
            </Text>
            
            <View style={[styles.inputContainer, { borderColor: error ? colors.error : colors.border }]}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left'
                  }
                ]}
                value={cardCode}
                onChangeText={handleInputChange}
                placeholder={t('recharge.enterCardCode')}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />
              
              {isValidating && (
                <ActivityIndicator 
                  size="small" 
                  color={colors.primary} 
                  style={styles.inputLoader}
                />
              )}
            </View>

            {/* QR Scanner Button */}
            <TouchableOpacity
              style={[styles.scanButton, { borderColor: colors.primary }]}
              onPress={() => setShowScanner(true)}
              disabled={!hasPermission}
            >
              <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
              <Text style={[styles.scanButtonText, { color: colors.primary }]}>
                {t('recharge.scanQR')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Card Value Display */}
          {validatedCard && (
            <View style={[styles.valueContainer, { backgroundColor: colors.successBackground }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={[styles.valueText, { color: colors.success }]}>
                {t('recharge.cardValue', { 
                  value: RechargeService.formatCurrency(validatedCard.value, isRTL)
                })}
              </Text>
            </View>
          )}

          {/* Recharge Button */}
          <TouchableOpacity
            style={[
              styles.rechargeButton,
              {
                backgroundColor: validatedCard ? colors.primary : colors.disabled,
                opacity: validatedCard ? 1 : 0.6
              }
            ]}
            onPress={redeemCard}
            disabled={!validatedCard || isRedeeming}
          >
            {isRedeeming ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.rechargeButtonText, { color: colors.background }]}>
                {t('recharge.rechargeNow')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Usage Info */}
          <View style={[styles.infoContainer, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              {t('recharge.usageInfo.title')}
            </Text>
            
            <View style={styles.infoItem}>
              <Ionicons name="card" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('recharge.usageInfo.commissions')}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('recharge.usageInfo.subscriptions')}
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('recharge.usageInfo.security')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowScanner(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.scannerTitle}>
              {t('recharge.scannerTitle')}
            </Text>
          </View>

          {hasPermission ? (
            <CameraView
              style={styles.camera}
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'pdf417'],
              }}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerInstruction}>
                  {t('recharge.scannerInstruction')}
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionContainer}>
              <Ionicons name="camera" size={64} color="#666" />
              <Text style={styles.permissionText}>
                {t('recharge.cameraPermission')}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.arabic.bold,
  },
  placeholder: {
    width: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.arabic.bold,
    color: '#fff',
  },
  instruction: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    marginBottom: 10,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    letterSpacing: 1,
  },
  inputLoader: {
    marginLeft: 10,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.arabic.medium,
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  valueText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.bold,
  },
  rechargeButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  rechargeButtonText: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.arabic.bold,
  },
  infoContainer: {
    padding: 20,
    borderRadius: 15,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.bold,
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.arabic.regular,
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  closeButton: {
    padding: 10,
  },
  scannerTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.arabic.bold,
    color: '#fff',
    marginLeft: 15,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 20,
    marginBottom: 30,
  },
  scannerInstruction: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.arabic.medium,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default RechargeScreen;
