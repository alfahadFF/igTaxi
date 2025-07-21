import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * نظام إدارة الثيمات (الوضع المظلم والفاتح)
 * يدعم التبديل التلقائي حسب وقت اليوم ونظام التشغيل
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  // الألوان الأساسية
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  
  // ألوان الخلفية
  background: string;
  surface: string;
  card: string;
  
  // ألوان النصوص
  text: string;
  textSecondary: string;
  textDisabled: string;
  
  // ألوان الحدود والفواصل
  border: string;
  divider: string;
  
  // ألوان الحالة
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // ألوان خاصة بالتطبيق
  taxi: string;
  driver: string;
  customer: string;
  
  // شفافيات
  overlay: string;
  shadow: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    sizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    weights: {
      light: '300';
      regular: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
    };
  };
}

// الثيم الفاتح
const lightTheme: Theme = {
  mode: 'light',
  colors: {
    // الألوان الأساسية
    primary: '#F5B800',
    primaryDark: '#E6A600',
    secondary: '#3498db',
    accent: '#e67e22',
    
    // ألوان الخلفية
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    
    // ألوان النصوص
    text: '#2C3E50',
    textSecondary: '#7F8C8D',
    textDisabled: '#BDC3C7',
    
    // ألوان الحدود والفواصل
    border: '#E8E8E8',
    divider: '#ECF0F1',
    
    // ألوان الحالة
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
    info: '#3498DB',
    
    // ألوان خاصة بالتطبيق
    taxi: '#F5B800',
    driver: '#3498db',
    customer: '#2ecc71',
    
    // شفافيات
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20,
  },
  typography: {
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 24,
    },
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
};

// الثيم المظلم
const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    // الألوان الأساسية
    primary: '#F5B800',
    primaryDark: '#E6A600',
    secondary: '#5DADE2',
    accent: '#F39C12',
    
    // ألوان الخلفية
    background: '#1A1A1A',
    surface: '#2C2C2C',
    card: '#383838',
    
    // ألوان النصوص
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textDisabled: '#666666',
    
    // ألوان الحدود والفواصل
    border: '#404040',
    divider: '#333333',
    
    // ألوان الحالة
    success: '#58D68D',
    warning: '#F7DC6F',
    error: '#F1948A',
    info: '#85C1E9',
    
    // ألوان خاصة بالتطبيق
    taxi: '#F5B800',
    driver: '#5DADE2',
    customer: '#58D68D',
    
    // شفافيات
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  typography: lightTheme.typography,
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [currentTheme, setCurrentTheme] = useState<Theme>(lightTheme);

  // تحديد الثيم بناءً على الإعدادات
  const determineTheme = (mode: ThemeMode, systemScheme: 'light' | 'dark' | null): Theme => {
    if (mode === 'auto') {
      // التبديل التلقائي حسب وقت اليوم أو نظام التشغيل
      const currentHour = new Date().getHours();
      const isNightTime = currentHour >= 19 || currentHour <= 6; // من 7 مساءً إلى 6 صباحاً
      
      if (systemScheme) {
        // استخدام إعدادات النظام إذا كانت متوفرة
        return systemScheme === 'dark' ? darkTheme : lightTheme;
      } else {
        // استخدام الوقت إذا لم تكن إعدادات النظام متوفرة
        return isNightTime ? darkTheme : lightTheme;
      }
    }
    
    return mode === 'dark' ? darkTheme : lightTheme;
  };

  // تحميل الإعدادات المحفوظة
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('themeMode');
        if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.log('خطأ في تحميل إعدادات الثيم:', error);
      }
    };

    loadThemePreference();
  }, []);

  // تحديث الثيم عند تغيير الإعدادات أو النظام
  useEffect(() => {
    const systemScheme = systemColorScheme === 'dark' ? 'dark' : systemColorScheme === 'light' ? 'light' : null;
    const newTheme = determineTheme(themeMode, systemScheme);
    setCurrentTheme(newTheme);
  }, [themeMode, systemColorScheme]);

  // حفظ إعدادات الثيم
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('themeMode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.log('خطأ في حفظ إعدادات الثيم:', error);
    }
  };

  // تبديل سريع بين الفاتح والمظلم
  const toggleTheme = () => {
    const newMode = currentTheme.mode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const value: ThemeContextType = {
    theme: currentTheme,
    themeMode,
    setThemeMode,
    isDark: currentTheme.mode === 'dark',
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook لاستخدام الثيم
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme يجب أن يستخدم داخل ThemeProvider');
  }
  return context;
}

// Hook لاستخدام الألوان مباشرة
export function useColors(): ThemeColors {
  const { theme } = useTheme();
  return theme.colors;
}

// مساعدات للاستايلز
export const createThemedStyles = <T extends Record<string, any>>(
  stylesFn: (theme: Theme) => T
) => {
  return (theme: Theme) => stylesFn(theme);
};
