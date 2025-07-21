import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Menu } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { AnimatedView } from '@/components/ui/AnimatedComponents';
import { createTextStyle } from '@/constants/Typography';
import { rtlStyle, rtlIcon } from '@/utils/rtl';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import NotificationCenter from '@/components/notifications/NotificationCenter';

type HeaderProps = {
  title: string;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  showNotifications?: boolean;
  onMenuPress?: () => void;
};

export default function Header({ 
  title, 
  showBackButton = false, 
  showMenuButton = false,
  showNotifications = false,
  onMenuPress
}: HeaderProps) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const isRTL = i18n.language === 'ar';
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const styles = createStyles(theme);

  return (
    <AnimatedView 
      animation="slideInFromStart" 
      isRTL={isRTL}
      style={[styles.header, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.container, { flexDirection: rtlStyle.flexDirectionRow }]}>
        {showBackButton && (
          <AnimatedView 
            animation="scaleIn" 
            delay={100}
            style={[styles.iconButton, rtlStyle.start(0)]}
          >
            <TouchableOpacity onPress={handleBack}>
              <ArrowLeft 
                size={24} 
                color={theme.colors.text}
                style={rtlIcon.transform('arrow-left')}
              />
            </TouchableOpacity>
          </AnimatedView>
        )}
        
        <AnimatedView 
          animation="fadeIn" 
          delay={200} 
          style={styles.titleContainer}
        >
          <Text style={[
            styles.title,
            createTextStyle('h5', i18n.language as 'ar' | 'en'),
            { 
              color: theme.colors.text,
              textAlign: rtlStyle.textAlign
            }
          ]}>
            {title}
          </Text>
        </AnimatedView>
        
        {showNotifications && (
          <AnimatedView 
            animation="scaleIn" 
            delay={100}
            style={[styles.iconButton, rtlStyle.end(showMenuButton ? 60 : 0)]}
          >
            <NotificationBadge onPress={() => setShowNotificationCenter(true)} />
          </AnimatedView>
        )}
        
        {showMenuButton && (
          <AnimatedView 
            animation="scaleIn" 
            delay={100}
            style={[styles.iconButton, rtlStyle.end(0)]}
          >
            <TouchableOpacity onPress={onMenuPress}>
              <Menu size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </AnimatedView>
        )}
      </View>

      <NotificationCenter 
        visible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </AnimatedView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    shadowColor: theme.colors.shadow || '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
});