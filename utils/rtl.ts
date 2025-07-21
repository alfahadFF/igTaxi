import { I18nManager } from 'react-native';
import React from 'react';

// RTL Configuration
export const RTLConfig = {
  // Check if current layout is RTL
  isRTL: I18nManager.isRTL,
  
  // Force RTL layout (call once during app initialization)
  forceRTL: () => {
    if (!I18nManager.isRTL) {
      I18nManager.forceRTL(true);
      // Note: App restart required for this to take effect
    }
  },
  
  // Force LTR layout
  forceLTR: () => {
    if (I18nManager.isRTL) {
      I18nManager.forceRTL(false);
      // Note: App restart required for this to take effect
    }
  },
  
  // Allow RTL layout
  allowRTL: () => {
    I18nManager.allowRTL(true);
  },
  
  // Disable RTL layout
  disallowRTL: () => {
    I18nManager.allowRTL(false);
  }
};

// RTL-aware style helpers
export const rtlStyle = {
  // Margin helpers
  marginStart: (value: number) => ({
    [RTLConfig.isRTL ? 'marginRight' : 'marginLeft']: value
  }),
  
  marginEnd: (value: number) => ({
    [RTLConfig.isRTL ? 'marginLeft' : 'marginRight']: value
  }),
  
  // Padding helpers
  paddingStart: (value: number) => ({
    [RTLConfig.isRTL ? 'paddingRight' : 'paddingLeft']: value
  }),
  
  paddingEnd: (value: number) => ({
    [RTLConfig.isRTL ? 'paddingLeft' : 'paddingRight']: value
  }),
  
  // Border helpers
  borderStartWidth: (value: number) => ({
    [RTLConfig.isRTL ? 'borderRightWidth' : 'borderLeftWidth']: value
  }),
  
  borderEndWidth: (value: number) => ({
    [RTLConfig.isRTL ? 'borderLeftWidth' : 'borderRightWidth']: value
  }),
  
  borderStartColor: (color: string) => ({
    [RTLConfig.isRTL ? 'borderRightColor' : 'borderLeftColor']: color
  }),
  
  borderEndColor: (color: string) => ({
    [RTLConfig.isRTL ? 'borderLeftColor' : 'borderRightColor']: color
  }),
  
  // Position helpers
  start: (value: number) => ({
    [RTLConfig.isRTL ? 'right' : 'left']: value
  }),
  
  end: (value: number) => ({
    [RTLConfig.isRTL ? 'left' : 'right']: value
  }),
  
  // Text alignment
  textAlign: RTLConfig.isRTL ? 'right' as const : 'left' as const,
  textAlignStart: RTLConfig.isRTL ? 'right' as const : 'left' as const,
  textAlignEnd: RTLConfig.isRTL ? 'left' as const : 'right' as const,
  
  // Flex direction
  flexDirectionRow: RTLConfig.isRTL ? 'row-reverse' as const : 'row' as const,
  flexDirectionRowReverse: RTLConfig.isRTL ? 'row' as const : 'row-reverse' as const,
  
  // Transform helpers
  scaleX: RTLConfig.isRTL ? -1 : 1,
  rotateY: RTLConfig.isRTL ? '180deg' : '0deg'
};

// Icon helpers for RTL
export const rtlIcon = {
  // Common icons that need flipping in RTL
  shouldFlip: (iconName: string) => {
    const flipIcons = [
      'arrow-left',
      'arrow-right', 
      'chevron-left',
      'chevron-right',
      'angle-left',
      'angle-right',
      'caret-left',
      'caret-right',
      'play',
      'step-forward',
      'step-backward',
      'fast-forward',
      'fast-backward'
    ];
    return flipIcons.includes(iconName.toLowerCase());
  },
  
  // Transform style for icons that need flipping
  transform: (iconName: string) => {
    if (RTLConfig.isRTL && rtlIcon.shouldFlip(iconName)) {
      return { transform: [{ scaleX: -1 }] };
    }
    return {};
  }
};

// Typography configuration for Arabic
export const ArabicTypography = {
  // Font families for different weights
  fonts: {
    light: 'System', // Will use system Arabic font
    regular: 'System',
    medium: 'System',
    bold: 'System',
    black: 'System'
  },
  
  // Font sizes optimized for Arabic
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48
  },
  
  // Line heights for better Arabic readability
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },
  
  // Letter spacing (usually not needed for Arabic)
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1
  }
};

// Utility functions
export const getFlexDirection = (reverse = false) => {
  if (reverse) {
    return RTLConfig.isRTL ? 'row' : 'row-reverse';
  }
  return RTLConfig.isRTL ? 'row-reverse' : 'row';
};

export const getTextAlign = (align: 'start' | 'end' | 'center' | 'justify' = 'start') => {
  switch (align) {
    case 'start':
      return RTLConfig.isRTL ? 'right' : 'left';
    case 'end':
      return RTLConfig.isRTL ? 'left' : 'right';
    case 'center':
      return 'center';
    case 'justify':
      return 'justify';
    default:
      return RTLConfig.isRTL ? 'right' : 'left';
  }
};

export const getDirectionalValue = (startValue: any, endValue: any) => {
  return RTLConfig.isRTL ? endValue : startValue;
};

// Component wrapper for RTL support
export const withRTL = (Component: React.ComponentType<any>) => {
  return (props: any) => {
    const rtlProps = {
      ...props,
      isRTL: RTLConfig.isRTL,
      style: [
        props.style,
        RTLConfig.isRTL && { writingDirection: 'rtl' as const }
      ]
    };
    return React.createElement(Component, rtlProps);
  };
};

// Direction-aware animation values
export const getAnimationDirection = (direction: 'left' | 'right' | 'start' | 'end') => {
  switch (direction) {
    case 'start':
      return RTLConfig.isRTL ? 'right' : 'left';
    case 'end':
      return RTLConfig.isRTL ? 'left' : 'right';
    case 'left':
    case 'right':
    default:
      return direction;
  }
};
