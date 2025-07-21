import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications, NotificationPreferences } from '@/contexts/NotificationContext';
import { 
  Bell, 
  BellOff,
  Volume2,
  VolumeX,
  Vibrate,
  Mail,
  MessageSquare,
  Clock,
  DollarSign,
  Car,
  Shield,
  Settings as SettingsIcon,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const { preferences, updatePreferences } = useNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const handlePreferenceUpdate = async (updates: Partial<NotificationPreferences>) => {
    setIsLoading(true);
    try {
      await updatePreferences(updates);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerUpdate = (key: keyof NotificationPreferences['customer'], value: boolean) => {
    handlePreferenceUpdate({
      customer: {
        ...preferences.customer,
        [key]: value,
      },
    });
  };

  const handleDriverUpdate = (key: keyof NotificationPreferences['driver'], value: boolean) => {
    handlePreferenceUpdate({
      driver: {
        ...preferences.driver,
        [key]: value,
      },
    });
  };

  const handleGeneralUpdate = (key: keyof NotificationPreferences['general'], value: boolean) => {
    handlePreferenceUpdate({
      general: {
        ...preferences.general,
        [key]: value,
      },
    });
  };

  const handleQuietHoursUpdate = (updates: Partial<NotificationPreferences['general']['quietHours']>) => {
    handlePreferenceUpdate({
      general: {
        ...preferences.general,
        quietHours: {
          ...preferences.general.quietHours,
          ...updates,
        },
      },
    });
  };

  const toggleQuietHours = () => {
    handleQuietHoursUpdate({ enabled: !preferences.general.quietHours.enabled });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      paddingVertical: 16,
    },
    backButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      marginRight: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      shadowColor: theme.colors.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      marginRight: 8,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + '30',
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    itemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    itemIcon: {
      marginRight: 12,
    },
    itemContent: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    itemDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    quietHoursContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 12,
    },
    timeContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    timeItem: {
      flex: 1,
      alignItems: 'center',
    },
    timeLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    timeValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '600',
    },
    disabledOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface + '80',
      borderRadius: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronRight size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>إعدادات الإشعارات</Text>
        </View>

        {/* إعدادات عامة */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <SettingsIcon size={20} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
              الإعدادات العامة
            </Text>
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Volume2 size={20} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>الصوت</Text>
                <Text style={styles.itemDescription}>تشغيل صوت عند وصول إشعار جديد</Text>
              </View>
            </View>
            <Switch
              value={preferences.general.sound}
              onValueChange={(value) => handleGeneralUpdate('sound', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Vibrate size={20} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>الاهتزاز</Text>
                <Text style={styles.itemDescription}>اهتزاز الجهاز عند وصول إشعار مهم</Text>
              </View>
            </View>
            <Switch
              value={preferences.general.vibration}
              onValueChange={(value) => handleGeneralUpdate('vibration', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <BellOff size={20} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>عدم الإزعاج</Text>
                <Text style={styles.itemDescription}>إيقاف جميع الإشعارات مؤقتاً</Text>
              </View>
            </View>
            <Switch
              value={preferences.general.doNotDisturb}
              onValueChange={(value) => handleGeneralUpdate('doNotDisturb', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={[styles.item, styles.lastItem]}>
            <View style={styles.itemLeft}>
              <Clock size={20} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>الساعات الهادئة</Text>
                <Text style={styles.itemDescription}>تقليل الإشعارات في أوقات محددة</Text>
                
                {preferences.general.quietHours.enabled && (
                  <View style={styles.quietHoursContainer}>
                    <View style={styles.timeContainer}>
                      <View style={styles.timeItem}>
                        <Text style={styles.timeLabel}>من</Text>
                        <Text style={styles.timeValue}>{preferences.general.quietHours.startTime}</Text>
                      </View>
                      <View style={styles.timeItem}>
                        <Text style={styles.timeLabel}>إلى</Text>
                        <Text style={styles.timeValue}>{preferences.general.quietHours.endTime}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
            <Switch
              value={preferences.general.quietHours.enabled}
              onValueChange={toggleQuietHours}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* إشعارات العملاء */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <Car size={20} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
              إشعارات الرحلات
            </Text>
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Bell size={16} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>تحديثات الرحلة</Text>
                <Text style={styles.itemDescription}>إشعارات حالة الرحلة والسائق</Text>
              </View>
            </View>
            <Switch
              value={preferences.customer.tripUpdates}
              onValueChange={(value) => handleCustomerUpdate('tripUpdates', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <DollarSign size={16} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>تنبيهات الدفع</Text>
                <Text style={styles.itemDescription}>إشعارات استلام وإتمام المدفوعات</Text>
              </View>
            </View>
            <Switch
              value={preferences.customer.paymentAlerts}
              onValueChange={(value) => handleCustomerUpdate('paymentAlerts', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={[styles.item, styles.lastItem]}>
            <View style={styles.itemLeft}>
              <MessageSquare size={16} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>الرسائل النصية</Text>
                <Text style={styles.itemDescription}>إشعارات عبر SMS للتحديثات المهمة</Text>
              </View>
            </View>
            <Switch
              value={preferences.customer.smsNotifications}
              onValueChange={(value) => handleCustomerUpdate('smsNotifications', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* إشعارات السائقين */}
        <View style={styles.section}>
          <View style={styles.sectionTitle}>
            <Shield size={20} color={theme.colors.primary} style={styles.sectionIcon} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>
              إشعارات السائقين
            </Text>
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Bell size={16} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>طلبات جديدة</Text>
                <Text style={styles.itemDescription}>إشعارات الرحلات الجديدة المتاحة</Text>
              </View>
            </View>
            <Switch
              value={preferences.driver.newRequests}
              onValueChange={(value) => handleDriverUpdate('newRequests', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <DollarSign size={16} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>تحديثات الأرباح</Text>
                <Text style={styles.itemDescription}>ملخص الأرباح اليومية والإجمالية</Text>
              </View>
            </View>
            <Switch
              value={preferences.driver.earningUpdates}
              onValueChange={(value) => handleDriverUpdate('earningUpdates', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>

          <View style={[styles.item, styles.lastItem]}>
            <View style={styles.itemLeft}>
              <Mail size={16} color={theme.colors.text} style={styles.itemIcon} />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>البريد الإلكتروني</Text>
                <Text style={styles.itemDescription}>تقارير مفصلة عبر البريد الإلكتروني</Text>
              </View>
            </View>
            <Switch
              value={preferences.driver.emailNotifications}
              onValueChange={(value) => handleDriverUpdate('emailNotifications', value)}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
              disabled={isLoading}
            />
          </View>
        </View>

        {/* مساحة إضافية في الأسفل */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
