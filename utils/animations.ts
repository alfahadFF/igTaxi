import { Animated, Easing } from 'react-native';

// Animation configurations
export const AnimationConfig = {
  // Standard durations
  fast: 200,
  normal: 300,
  slow: 500,
  
  // Easing functions
  easeInOut: Easing.bezier(0.4, 0, 0.2, 1),
  easeOut: Easing.bezier(0, 0, 0.2, 1),
  easeIn: Easing.bezier(0.4, 0, 1, 1),
  
  // Spring configurations
  spring: {
    tension: 100,
    friction: 8,
  },
  
  // Bounce configuration
  bounce: {
    tension: 180,
    friction: 12,
  }
};

// Fade animations
export const fadeIn = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: AnimationConfig.easeOut,
    useNativeDriver: true,
  });
};

export const fadeOut = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationConfig.easeIn,
    useNativeDriver: true,
  });
};

// Scale animations
export const scaleIn = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration,
    easing: AnimationConfig.easeOut,
    useNativeDriver: true,
  });
};

export const scaleOut = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationConfig.easeIn,
    useNativeDriver: true,
  });
};

// Slide animations
export const slideInFromRight = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationConfig.easeOut,
    useNativeDriver: true,
  });
};

export const slideInFromLeft = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 0,
    duration,
    easing: AnimationConfig.easeOut,
    useNativeDriver: true,
  });
};

export const slideOutToRight = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: 300,
    duration,
    easing: AnimationConfig.easeIn,
    useNativeDriver: true,
  });
};

export const slideOutToLeft = (animatedValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.timing(animatedValue, {
    toValue: -300,
    duration,
    easing: AnimationConfig.easeIn,
    useNativeDriver: true,
  });
};

// Spring animations
export const springIn = (animatedValue: Animated.Value) => {
  return Animated.spring(animatedValue, {
    toValue: 1,
    ...AnimationConfig.spring,
    useNativeDriver: true,
  });
};

export const bounceIn = (animatedValue: Animated.Value) => {
  return Animated.spring(animatedValue, {
    toValue: 1,
    ...AnimationConfig.bounce,
    useNativeDriver: true,
  });
};

// Sequence animations
export const pulseAnimation = (animatedValue: Animated.Value, duration = 1000) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: duration / 2,
        easing: AnimationConfig.easeInOut,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing: AnimationConfig.easeInOut,
        useNativeDriver: true,
      }),
    ]),
  );
};

export const shakeAnimation = (animatedValue: Animated.Value, intensity = 10) => {
  return Animated.sequence([
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: -intensity,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: intensity,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }),
  ]);
};

// Combined animations
export const fadeInUp = (fadeValue: Animated.Value, translateValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.parallel([
    fadeIn(fadeValue, duration),
    Animated.timing(translateValue, {
      toValue: 0,
      duration,
      easing: AnimationConfig.easeOut,
      useNativeDriver: true,
    }),
  ]);
};

export const fadeInScale = (fadeValue: Animated.Value, scaleValue: Animated.Value, duration = AnimationConfig.normal) => {
  return Animated.parallel([
    fadeIn(fadeValue, duration),
    scaleIn(scaleValue, duration),
  ]);
};

// Stagger animation helper
export const staggerAnimation = (
  animations: Animated.CompositeAnimation[],
  staggerDelay = 100
) => {
  return Animated.stagger(staggerDelay, animations);
};

// RTL-aware slide animations
export const slideInFromStart = (animatedValue: Animated.Value, isRTL: boolean, duration = AnimationConfig.normal) => {
  return isRTL ? slideInFromRight(animatedValue, duration) : slideInFromLeft(animatedValue, duration);
};

export const slideInFromEnd = (animatedValue: Animated.Value, isRTL: boolean, duration = AnimationConfig.normal) => {
  return isRTL ? slideInFromLeft(animatedValue, duration) : slideInFromRight(animatedValue, duration);
};

export const slideOutToStart = (animatedValue: Animated.Value, isRTL: boolean, duration = AnimationConfig.normal) => {
  return isRTL ? slideOutToRight(animatedValue, duration) : slideOutToLeft(animatedValue, duration);
};

export const slideOutToEnd = (animatedValue: Animated.Value, isRTL: boolean, duration = AnimationConfig.normal) => {
  return isRTL ? slideOutToLeft(animatedValue, duration) : slideOutToRight(animatedValue, duration);
};
