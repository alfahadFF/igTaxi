import { View, Text, StyleSheet, SafeAreaView, Switch, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { router } from 'expo-router';
import { 
  Bell, 
  Moon, 
  Sun,
  Smartphone,
  Globe, 
  LogOut,
  Mail,
  Shield,
  HelpCircle,
  ChevronRight,
  Settings as SettingsIcon,
  TestTube,
  AlertTriangle
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { preferences, updatePreferences } = useNotifications();
  
  const [emailEnabled, setEmailEnabled] = useState(false);
  
  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLanguage);
  };
  
  const currentLanguage = i18n.language === 'en' ? 'English' : 'العربية';

  const getThemeText = () => {
    switch (themeMode) {
      case 'light': return 'فاتح';
      case 'dark': return 'مظلم';
      case 'auto': return 'تلقائي';
      default: return 'تلقائي';
    }
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light': return <Sun size={20} color={theme.colors.text} />;
      case 'dark': return <Moon size={20} color={theme.colors.text} />;
      case 'auto': return <Smartphone size={20} color={theme.colors.text} />;
      default: return <Smartphone size={20} color={theme.colors.text} />;
    }
  };

  const cycleTheme = () => {
    const modes = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setThemeMode(modes[nextIndex] as any);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 30,
      textAlign: 'center',
    },
    section: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
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
    itemText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    itemValue: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
    logoutButton: {
      backgroundColor: '#ef4444',
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    logoutText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('tabs.settings', 'الإعدادات')}</Text>
        
        {/* الأمان والطوارئ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الأمان والطوارئ</Text>
          
          <TouchableOpacity 
            style={styles.item}
            onPress={() => router.push('/services/safety-settings')}
          >
            <View style={styles.itemLeft}>
              <Shield size={20} color="#dc3545" style={styles.itemIcon} />
              <Text style={styles.itemText}>إعدادات الأمان</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.item}
            onPress={() => router.push('/services/safety-demo')}
          >
            <View style={styles.itemLeft}>
              <TestTube size={20} color={theme.colors.primary} style={styles.itemIcon} />
              <Text style={styles.itemText}>تجربة نظام الأمان</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={[styles.item, styles.lastItem]}>
            <View style={styles.itemLeft}>
              <AlertTriangle size={20} color="#ff9800" style={styles.itemIcon} />
              <Text style={styles.itemText}>زر الطوارئ</Text>
            </View>
            <Switch
              value={true} // This would come from safety settings
              onValueChange={() => {}}
              trackColor={{ false: theme.colors.border, true: '#dc3545' }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* الإشعارات */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الإشعارات</Text>
          
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <Bell size={20} color={theme.colors.text} style={styles.itemIcon} />
              <Text style={styles.itemText}>الإشعارات العامة</Text>
            </View>
            <Switch
              value={!preferences.general.doNotDisturb}
              onValueChange={(value) => updatePreferences({ 
                general: { ...preferences.general, doNotDisturb: !value } 
              })}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>

          <TouchableOpacity 
            style={styles.item}
            onPress={() => router.push('/services/notification-settings')}
          >
            <View style={styles.itemLeft}>
              <SettingsIcon size={20} color={theme.colors.text} style={styles.itemIcon} />
              <Text style={styles.itemText}>إعدادات الإشعارات المتقدمة</Text>
            </View>
            <ChevronRight size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={[styles.item, styles.lastItem]}>
            <View style={styles.itemLeft}>
              <Mail size={20} color={theme.colors.text} style={styles.itemIcon} />
              <Text style={styles.itemText}>الإشعارات عبر البريد</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
        </View>

        {/* المظهر واللغة */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المظهر واللغة</Text>
          
          <TouchableOpacity style={styles.item} onPress={toggleLanguage}>
            <View style={styles.itemLeft}>
              <Globe size={20} color={theme.colors.text} style={styles.itemIcon} />
              <Text style={styles.itemText}>اللغة</Text>
            </View>
            <Text style={styles.itemValue}>{currentLanguage}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.item, styles.lastItem]} onPress={cycleTheme}>
            <View style={styles.itemLeft}>
              {getThemeIcon()}
              <Text style={[styles.itemText, { marginLeft: 12 }]}>المظهر</Text>
            </View>
            <Text style={styles.itemValue}>{getThemeText()}</Text>
          </TouchableOpacity>
        </View>

        {/* الحساب والأمان */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب والأمان</Text>
          
          <TouchableOpacity style={styles.item}>
            <View style={styles.itemLeft}>
              <Shield size={20} color={theme.colors.text} style={styles.itemIcon} />
              <Text style={styles.itemText}>الخصوصية والأمان</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.item, styles.lastItem]}>
            <View style={styles.itemLeft}>
              <HelpCircle size={20} color={theme.colors.text} style={styles.itemIcon} />
              <Text style={styles.itemText}>المساعدة والدعم</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* تسجيل الخروج */}
        <TouchableOpacity style={styles.logoutButton}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
        
        {/* مساحة إضافية في الأسفل */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
