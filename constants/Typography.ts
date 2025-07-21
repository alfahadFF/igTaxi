import { Platform, PixelRatio } from 'react-native';
import { ArabicTypography } from '@/utils/rtl';

// Font scale factor for accessibility
const fontScale = PixelRatio.getFontScale();

// Enhanced typography configuration
export const Typography = {
  // Font families with fallbacks
  fontFamily: {
    // Arabic fonts (system defaults with fallbacks)
    arabic: {
      light: Platform.select({
        ios: 'SF Arabic Light',
        android: 'sans-serif-light',
        default: 'System'
      }),
      regular: Platform.select({
        ios: 'SF Arabic',
        android: 'sans-serif',
        default: 'System'
      }),
      medium: Platform.select({
        ios: 'SF Arabic Medium',
        android: 'sans-serif-medium',
        default: 'System'
      }),
      bold: Platform.select({
        ios: 'SF Arabic Bold',
        android: 'sans-serif-bold',
        default: 'System'
      }),
      black: Platform.select({
        ios: 'SF Arabic Heavy',
        android: 'sans-serif-black',
        default: 'System'
      })
    },
    // English fonts
    english: {
      light: Platform.select({
        ios: 'SF Pro Display Light',
        android: 'Roboto-Light',
        default: 'System'
      }),
      regular: Platform.select({
        ios: 'SF Pro Display',
        android: 'Roboto-Regular',
        default: 'System'
      }),
      medium: Platform.select({
        ios: 'SF Pro Display Medium',
        android: 'Roboto-Medium',
        default: 'System'
      }),
      bold: Platform.select({
        ios: 'SF Pro Display Bold',
        android: 'Roboto-Bold',
        default: 'System'
      }),
      black: Platform.select({
        ios: 'SF Pro Display Black',
        android: 'Roboto-Black',
        default: 'System'
      })
    }
  },

  // Font sizes with accessibility support
  fontSize: {
    xs: Math.round(12 * fontScale),
    sm: Math.round(14 * fontScale),
    base: Math.round(16 * fontScale),
    lg: Math.round(18 * fontScale),
    xl: Math.round(20 * fontScale),
    '2xl': Math.round(24 * fontScale),
    '3xl': Math.round(30 * fontScale),
    '4xl': Math.round(36 * fontScale),
    '5xl': Math.round(48 * fontScale),
    '6xl': Math.round(60 * fontScale)
  },

  // Line heights optimized for Arabic and English
  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
    extraLoose: 1.8
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const
  },

  // Letter spacing (minimal for Arabic)
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1
  }
};

// Text style presets
export const textStyles = {
  // Headings
  h1: {
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize['4xl'] * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tight
  },
  h2: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    lineHeight: Typography.fontSize['3xl'] * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.tight
  },
  h3: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.snug,
    letterSpacing: Typography.letterSpacing.normal
  },
  h4: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.snug,
    letterSpacing: Typography.letterSpacing.normal
  },
  h5: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal
  },
  h6: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal
  },

  // Body text
  bodyLarge: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.normal,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.relaxed,
    letterSpacing: Typography.letterSpacing.normal
  },
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.normal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
    letterSpacing: Typography.letterSpacing.normal
  },
  bodySmall: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.normal
  },

  // Special text styles
  caption: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.normal,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.wide
  },
  overline: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.xs * Typography.lineHeight.normal,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase' as const
  },
  button: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.wide
  },
  buttonSmall: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.wide
  },
  buttonLarge: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.tight,
    letterSpacing: Typography.letterSpacing.normal
  }
};

// Helper function to get font family based on language
export const getFontFamily = (language: 'ar' | 'en' = 'ar', weight: 'light' | 'regular' | 'medium' | 'bold' | 'black' = 'regular') => {
  return language === 'ar' 
    ? Typography.fontFamily.arabic[weight]
    : Typography.fontFamily.english[weight];
};

// Helper function to create responsive text style
export const createTextStyle = (
  preset: keyof typeof textStyles,
  language: 'ar' | 'en' = 'ar',
  customStyles?: object
) => {
  const baseStyle = textStyles[preset];
  let weightKey: 'light' | 'regular' | 'medium' | 'bold' | 'black' = 'regular';
  
  const fontWeight = baseStyle.fontWeight as string;
  if (fontWeight === '700' || fontWeight === '800' || fontWeight === '900') {
    weightKey = 'bold';
  } else if (fontWeight === '500' || fontWeight === '600') {
    weightKey = 'medium';
  } else if (fontWeight === '300') {
    weightKey = 'light';
  } else {
    weightKey = 'regular';
  }
  
  const fontFamily = getFontFamily(language, weightKey);

  return {
    ...baseStyle,
    fontFamily,
    ...customStyles
  };
};

// RTL-aware text alignment
export const getTextAlignment = (alignment: 'start' | 'end' | 'center' | 'justify' = 'start', isRTL: boolean = false) => {
  switch (alignment) {
    case 'start':
      return isRTL ? 'right' : 'left';
    case 'end':
      return isRTL ? 'left' : 'right';
    case 'center':
      return 'center';
    case 'justify':
      return 'justify';
    default:
      return isRTL ? 'right' : 'left';
  }
};

// Accessibility helpers
export const getAccessibleTextSize = (baseSize: number, scale: number = 1) => {
  return Math.round(baseSize * scale * fontScale);
};

export const getOptimalLineHeight = (fontSize: number, language: 'ar' | 'en' = 'ar') => {
  // Arabic typically needs more line height due to diacritics
  const multiplier = language === 'ar' ? 1.6 : 1.4;
  return fontSize * multiplier;
};
