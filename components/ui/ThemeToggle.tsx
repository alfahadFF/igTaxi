import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';

/**
 * مكون تبديل الثيم
 * يسمح للمستخدم بالتبديل بين الوضع الفاتح والمظلم والتلقائي
 */

interface ThemeToggleProps {
  showLabels?: boolean;
  style?: any;
}

export default function ThemeToggle({ showLabels = true, style }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const themeOptions: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    {
      mode: 'light',
      icon: <Sun size={20} color={theme.colors.text} />,
      label: t('theme.light', 'فاتح'),
    },
    {
      mode: 'dark',
      icon: <Moon size={20} color={theme.colors.text} />,
      label: t('theme.dark', 'مظلم'),
    },
    {
      mode: 'auto',
      icon: <Smartphone size={20} color={theme.colors.text} />,
      label: t('theme.auto', 'تلقائي'),
    },
  ];

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xs,
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      minHeight: 44,
    },
    activeOption: {
      backgroundColor: theme.colors.primary,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    optionLabel: {
      marginLeft: theme.spacing.xs,
      fontSize: theme.typography.sizes.sm,
      fontFamily: 'Poppins-Medium',
      color: theme.colors.text,
    },
    activeOptionLabel: {
      color: '#FFFFFF',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {themeOptions.map((option) => {
        const isActive = themeMode === option.mode;
        return (
          <TouchableOpacity
            key={option.mode}
            style={[styles.option, isActive && styles.activeOption]}
            onPress={() => setThemeMode(option.mode)}
            accessibilityLabel={`تغيير إلى ${option.label}`}
            accessibilityRole="button"
          >
            <View style={styles.optionContent}>
              {React.cloneElement(option.icon as React.ReactElement, {
                color: isActive ? '#FFFFFF' : theme.colors.text,
              })}
              {showLabels && (
                <Text
                  style={[
                    styles.optionLabel,
                    isActive && styles.activeOptionLabel,
                  ]}
                >
                  {option.label}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// مكون تبديل سريع (زر واحد)
export function QuickThemeToggle({ style }: { style?: any }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const quickStyles = StyleSheet.create({
    button: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  });

  return (
    <TouchableOpacity
      style={[quickStyles.button, style]}
      onPress={toggleTheme}
      accessibilityLabel={isDark ? 'تغيير إلى الوضع الفاتح' : 'تغيير إلى الوضع المظلم'}
      accessibilityRole="button"
    >
      {isDark ? (
        <Sun size={20} color={theme.colors.text} />
      ) : (
        <Moon size={20} color={theme.colors.text} />
      )}
    </TouchableOpacity>
  );
}
