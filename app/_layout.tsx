import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/utils/i18n/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme, View } from 'react-native';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as Localization from 'expo-localization';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SafetyProvider } from '@/contexts/SafetyContext';

// Prevent auto hiding of splash screen
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const colorScheme = useColorScheme();

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium, 
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  // Set app language based on device locale
  useEffect(() => {
    const deviceLocale = Localization.locale.split('-')[0];
    // Only use supported languages, default to Arabic
    const language = ['en', 'ar'].includes(deviceLocale) ? deviceLocale : 'ar';
    i18n.changeLanguage(language);

    // Configure RTL layout for Arabic
    if (language === 'ar') {
      i18n.dir('rtl');
    } else {
      i18n.dir('ltr');
    }
  }, []);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <SafetyProvider>
          <AppProvider>
            <I18nextProvider i18n={i18n}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="auth/driver-register" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="auth/transporter-register" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="auth/business-register" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="auth/cafe-register" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="services/taxi" />
                  <Stack.Screen name="services/transport" />
                  <Stack.Screen name="services/special-events" />
                  <Stack.Screen name="services/contracts" />
                  <Stack.Screen name="services/wedding-cars" />
                  <Stack.Screen name="services/restaurant-contracts" />
                  <Stack.Screen name="services/parking" />
                  <Stack.Screen name="services/fuel-stations" />
                  <Stack.Screen name="services/notification-settings" />
                  <Stack.Screen name="services/safety-settings" />
                  <Stack.Screen name="services/safety-demo" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              </GestureHandlerRootView>
            </I18nextProvider>
          </AppProvider>
        </SafetyProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}