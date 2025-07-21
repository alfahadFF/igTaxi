import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafety } from '@/contexts/SafetyContext';
import { useRouter } from 'expo-router';
import {
  Shield,
  Phone,
  MapPin,
  Users,
  Settings,
  Clock,
  AlertTriangle,
  ChevronRight,
  Mic,
  Share2,
  Bell,
  Save,
} from 'lucide-react-native';

const SafetySettings: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { 
    emergencySettings, 
    updateEmergencySettings, 
    tripSharing, 
    updateTripSharing,
    emergencyContacts,
  } = useSafety();

  const [localSettings, setLocalSettings] = useState(emergencySettings);
  const [localTripSharing, setLocalTripSharing] = useState(tripSharing);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (key: keyof typeof emergencySettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleTripSharingChange = (key: keyof typeof tripSharing, value: any) => {
    setLocalTripSharing(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      await updateEmergencySettings(localSettings);
      await updateTripSharing(localTripSharing);
      setHasChanges(false);
      Alert.alert('تم الحفظ', 'تم حفظ إعدادات الأمان بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ الإعدادات');
    }
  };

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    description: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    isDisabled?: boolean
  ) => (
    <View style={[styles.settingItem, isDisabled && styles.settingItemDisabled]}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDisabled && styles.settingTitleDisabled]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, isDisabled && styles.settingDescriptionDisabled]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={isDisabled}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary + '40',
        }}
        thumbColor={value ? theme.colors.primary : '#f4f3f4'}
      />
    </View>
  );

  const renderNavigationItem = (
    icon: React.ReactNode,
    title: string,
    description: string,
    onPress: () => void,
    rightContent?: React.ReactNode
  ) => (
    <TouchableOpacity style={styles.navigationItem} onPress={onPress}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {rightContent || <ChevronRight size={20} color={theme.colors.textSecondary} />}
    </TouchableOpacity>
  );

  const renderCountdownSelector = () => (
    <View style={styles.countdownSection}>
      <Text style={styles.sectionTitle}>مدة العد التنازلي لـ SOS</Text>
      <Text style={styles.sectionDescription}>
        المدة بالثواني قبل الاتصال التلقائي بجهات الطوارئ
      </Text>
      <View style={styles.countdownOptions}>
        {[0, 5, 10, 15, 30].map((seconds) => (
          <TouchableOpacity
            key={seconds}
            style={[
              styles.countdownOption,
              localSettings.sosCountdown === seconds && styles.countdownOptionSelected,
            ]}
            onPress={() => handleSettingChange('sosCountdown', seconds)}
          >
            <Text style={[
              styles.countdownOptionText,
              localSettings.sosCountdown === seconds && styles.countdownOptionTextSelected,
            ]}>
              {seconds === 0 ? 'فوري' : `${seconds}ث`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderHotlineInput = () => (
    <View style={styles.hotlineSection}>
      <Text style={styles.sectionTitle}>رقم الطوارئ</Text>
      <Text style={styles.sectionDescription}>
        رقم الهاتف المحلي لخدمات الطوارئ
      </Text>
      <TextInput
        style={styles.hotlineInput}
        value={localSettings.policeHotline}
        onChangeText={(text) => handleSettingChange('policeHotline', text)}
        placeholder="999"
        keyboardType="phone-pad"
        maxLength={10}
      />
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      backgroundColor: theme.colors.surface,
      marginTop: 12,
      paddingVertical: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    sectionIcon: {
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    sectionDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingItemDisabled: {
      opacity: 0.5,
    },
    navigationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    settingIcon: {
      width: 32,
      alignItems: 'center',
      marginRight: 16,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    settingTitleDisabled: {
      color: theme.colors.textSecondary,
    },
    settingDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    settingDescriptionDisabled: {
      color: theme.colors.border,
    },
    warningBanner: {
      backgroundColor: '#fff3cd',
      borderLeftWidth: 4,
      borderLeftColor: '#ffc107',
      padding: 16,
      margin: 16,
      borderRadius: 8,
    },
    warningText: {
      fontSize: 14,
      color: '#856404',
      lineHeight: 18,
    },
    countdownSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    countdownOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    countdownOption: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    countdownOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    countdownOptionText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    countdownOptionTextSelected: {
      color: '#ffffff',
    },
    hotlineSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    hotlineInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      marginTop: 8,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    contactsStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    contactsStatusText: {
      fontSize: 12,
      marginLeft: 4,
    },
    contactsStatusGood: {
      color: '#4CAF50',
    },
    contactsStatusWarning: {
      color: '#ff9800',
    },
    saveButton: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    saveButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    saveButtonTextDisabled: {
      color: theme.colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>إعدادات الأمان</Text>
        <Text style={styles.headerSubtitle}>
          قم بتخصيص إعدادات الأمان والطوارئ حسب احتياجاتك
        </Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {emergencyContacts.length === 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ لم تقم بإضافة أي جهات اتصال طارئة. يُنصح بإضافة 2-3 جهات اتصال على الأقل لضمان فعالية نظام الطوارئ.
            </Text>
          </View>
        )}

        {/* Emergency Contacts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Users size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>جهات الاتصال الطارئة</Text>
              <Text style={styles.sectionDescription}>إدارة قائمة جهات الاتصال في حالات الطوارئ</Text>
            </View>
          </View>
          
          {renderNavigationItem(
            <Users size={20} color={theme.colors.text} />,
            'إدارة جهات الاتصال',
            `${emergencyContacts.length} جهة اتصال مضافة`,
            () => router.push('/safety/emergency-contacts' as any),
            <View style={styles.contactsStatus}>
              {emergencyContacts.length >= 2 ? (
                <>
                  <Shield size={16} color="#4CAF50" />
                  <Text style={[styles.contactsStatusText, styles.contactsStatusGood]}>
                    جيد
                  </Text>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} color="#ff9800" />
                  <Text style={[styles.contactsStatusText, styles.contactsStatusWarning]}>
                    يحتاج المزيد
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* SOS Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <AlertTriangle size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>إعدادات SOS</Text>
              <Text style={styles.sectionDescription}>تخصيص سلوك زر الطوارئ</Text>
            </View>
          </View>

          {renderSettingItem(
            <Shield size={20} color={theme.colors.text} />,
            'تفعيل زر SOS',
            'إظهار زر الطوارئ في الشاشات الرئيسية',
            localSettings.sosButton,
            (value) => handleSettingChange('sosButton', value)
          )}

          {renderSettingItem(
            <Phone size={20} color={theme.colors.text} />,
            'الاتصال التلقائي',
            'الاتصال بخدمات الطوارئ تلقائياً بعد تشغيل SOS',
            localSettings.autoDialAfterSOS,
            (value) => handleSettingChange('autoDialAfterSOS', value),
            !localSettings.sosButton
          )}

          {localSettings.autoDialAfterSOS && renderCountdownSelector()}
          {renderHotlineInput()}
        </View>

        {/* Location & Tracking Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MapPin size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>الموقع والتتبع</Text>
              <Text style={styles.sectionDescription}>إعدادات مشاركة الموقع والتتبع</Text>
            </View>
          </View>

          {renderSettingItem(
            <MapPin size={20} color={theme.colors.text} />,
            'مشاركة الموقع',
            'إرسال الموقع الحالي عند تشغيل SOS',
            localSettings.locationSharing,
            (value) => handleSettingChange('locationSharing', value)
          )}

          {renderSettingItem(
            <Mic size={20} color={theme.colors.text} />,
            'التسجيل الصوتي',
            'تسجيل الصوت المحيط عند تشغيل حالة الطوارئ',
            localSettings.audioRecording,
            (value) => handleSettingChange('audioRecording', value)
          )}
        </View>

        {/* Trip Sharing Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Share2 size={20} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>مشاركة الرحلة</Text>
              <Text style={styles.sectionDescription}>إعدادات مشاركة تفاصيل الرحلات</Text>
            </View>
          </View>

          {renderSettingItem(
            <Share2 size={20} color={theme.colors.text} />,
            'تفعيل مشاركة الرحلة',
            'السماح بمشاركة تفاصيل الرحلات مع الآخرين',
            localTripSharing.enabled,
            (value) => handleTripSharingChange('enabled', value)
          )}

          {renderSettingItem(
            <MapPin size={20} color={theme.colors.text} />,
            'مشاركة الموقع المباشر',
            'مشاركة الموقع المباشر أثناء الرحلة',
            localTripSharing.shareLocation,
            (value) => handleTripSharingChange('shareLocation', value),
            !localTripSharing.enabled
          )}

          {renderSettingItem(
            <Clock size={20} color={theme.colors.text} />,
            'مشاركة وقت الوصول',
            'مشاركة الوقت المتوقع للوصول',
            localTripSharing.shareETA,
            (value) => handleTripSharingChange('shareETA', value),
            !localTripSharing.enabled
          )}

          {renderSettingItem(
            <Users size={20} color={theme.colors.text} />,
            'مشاركة معلومات السائق',
            'مشاركة اسم ومعلومات السائق',
            localTripSharing.shareDriverInfo,
            (value) => handleTripSharingChange('shareDriverInfo', value),
            !localTripSharing.enabled
          )}

          {renderSettingItem(
            <Bell size={20} color={theme.colors.text} />,
            'المشاركة التلقائية',
            'مشاركة جميع الرحلات تلقائياً مع جهات الاتصال المحددة',
            localTripSharing.autoShare,
            (value) => handleTripSharingChange('autoShare', value),
            !localTripSharing.enabled
          )}
        </View>
      </ScrollView>

      {hasChanges && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveSettings}
        >
          <Save size={20} color="#ffffff" />
          <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SafetySettings;
