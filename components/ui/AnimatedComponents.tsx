import React, { useEffect, useRef } from 'react';
import { Animated, ViewProps } from 'react-native';
import { fadeIn, fadeOut, scaleIn, slideInFromStart, AnimationConfig } from '@/utils/animations';

interface AnimatedViewProps extends ViewProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'fadeOut' | 'scaleIn' | 'slideInFromStart';
  duration?: number;
  delay?: number;
  isVisible?: boolean;
  isRTL?: boolean;
}

export const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  style,
  animation = 'fadeIn',
  duration = AnimationConfig.normal,
  delay = 0,
  isVisible = true,
  isRTL = false,
  ...props
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const translateValue = useRef(new Animated.Value(50)).current; // For slide animations

  useEffect(() => {
    if (isVisible) {
      const animationFunction = () => {
        switch (animation) {
          case 'fadeIn':
            return fadeIn(animatedValue, duration);
          case 'fadeOut':
            return fadeOut(animatedValue, duration);
          case 'scaleIn':
            return scaleIn(animatedValue, duration);
          case 'slideInFromStart':
            return slideInFromStart(translateValue, isRTL, duration);
          default:
            return fadeIn(animatedValue, duration);
        }
      };

      if (delay > 0) {
        setTimeout(() => {
          animationFunction().start();
        }, delay);
      } else {
        animationFunction().start();
      }
    }
  }, [isVisible, animation, duration, delay, animatedValue, translateValue, isRTL]);

  const getAnimatedStyle = () => {
    switch (animation) {
      case 'fadeIn':
      case 'fadeOut':
        return { opacity: animatedValue };
      case 'scaleIn':
        return { 
          opacity: animatedValue,
          transform: [{ scale: animatedValue }]
        };
      case 'slideInFromStart':
        return {
          opacity: animatedValue,
          transform: [{ translateX: translateValue }]
        };
      default:
        return { opacity: animatedValue };
    }
  };

  return (
    <Animated.View
      style={[
        style,
        getAnimatedStyle()
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

// Staggered list animation component
interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  itemAnimation?: 'fadeIn' | 'slideInFromStart';
  isRTL?: boolean;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 100,
  itemAnimation = 'fadeIn',
  isRTL = false
}) => {
  return (
    <>
      {children.map((child, index) => (
        <AnimatedView
          key={index}
          animation={itemAnimation}
          delay={index * staggerDelay}
          isRTL={isRTL}
        >
          {child}
        </AnimatedView>
      ))}
    </>
  );
};

// Pulse animation component
interface PulseViewProps extends ViewProps {
  children: React.ReactNode;
  pulseScale?: number;
  pulseDuration?: number;
}

export const PulseView: React.FC<PulseViewProps> = ({
  children,
  style,
  pulseScale = 1.05,
  pulseDuration = 1000,
  ...props
}) => {
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: pulseScale,
          duration: pulseDuration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: pulseDuration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();

    return () => pulse.stop();
  }, [pulseValue, pulseScale, pulseDuration]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pulseValue }]
        }
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

// Shake animation component
interface ShakeViewProps extends ViewProps {
  children: React.ReactNode;
  shouldShake?: boolean;
  intensity?: number;
  onShakeComplete?: () => void;
}

export const ShakeView: React.FC<ShakeViewProps> = ({
  children,
  style,
  shouldShake = false,
  intensity = 10,
  onShakeComplete,
  ...props
}) => {
  const shakeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shouldShake) {
      const shake = Animated.sequence([
        Animated.timing(shakeValue, {
          toValue: intensity,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeValue, {
          toValue: -intensity,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeValue, {
          toValue: intensity,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeValue, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]);
      
      shake.start(() => {
        onShakeComplete?.();
      });
    }
  }, [shouldShake, shakeValue, intensity, onShakeComplete]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateX: shakeValue }]
        }
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};
