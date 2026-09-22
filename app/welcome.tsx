import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // بداية الحركات المتحركة
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // تأثير النبض للشعار
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // الانتقال إلى الشاشة الرئيسية بعد 4 ثوان
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 4000);

    return () => {
      clearTimeout(timer);
      pulse.stop();
    };
  }, []);

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* زر التخطي */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>تخطي</Text>
        </TouchableOpacity>

        {/* عناصر متحركة في الخلفية */}
        <View style={styles.floatingElement1}>
          <Ionicons name="car" size={40} color="rgba(255,255,255,0.2)" />
        </View>
        <View style={styles.floatingElement2}>
          <Ionicons name="location" size={30} color="rgba(255,255,255,0.15)" />
        </View>
        <View style={styles.floatingElement3}>
          <Ionicons name="star" size={25} color="rgba(255,255,255,0.1)" />
        </View>

        <View style={styles.content}>
          {/* شعار التطبيق */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { scale: pulseAnim }
                ],
              },
            ]}
          >
            <View style={styles.logoBackground}>
              <Image
                source={require('../assets/images/igtaxi logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* عنوان التطبيق */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>IGTaxi</Text>
            <Text style={styles.subtitle}>رحلتك تبدأ معنا</Text>
          </Animated.View>

          {/* الميزات */}
          <Animated.View
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.feature}>
              <Ionicons name="flash" size={24} color="#FFD700" />
              <Text style={styles.featureText}>سريع</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.featureText}>آمن</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="heart" size={24} color="#FF6B6B" />
              <Text style={styles.featureText}>موثوق</Text>
            </View>
          </Animated.View>

          {/* مؤشر التحميل */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingProgress,
                  {
                    transform: [{ scaleX: pulseAnim }],
                  },
                ]}
              />
            </View>
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </Animated.View>
        </View>

        {/* موجة في الأسفل */}
        <View style={styles.waveContainer}>
          <Animated.View
            style={[
              styles.wave,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    position: 'relative',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  floatingElement1: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    transform: [{ rotate: '15deg' }],
  },
  floatingElement2: {
    position: 'absolute',
    top: '30%',
    right: '15%',
    transform: [{ rotate: '-20deg' }],
  },
  floatingElement3: {
    position: 'absolute',
    bottom: '25%',
    left: '20%',
    transform: [{ rotate: '10deg' }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoBackground: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 50,
  },
  feature: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    minWidth: 80,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 15,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    width: '70%',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    transform: [{ scaleX: 1.5 }],
  },
});
