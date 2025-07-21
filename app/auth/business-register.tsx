import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Header from '@/components/layout/Header';

const businessTypes = [
  {
    id: 'restaurant',
    icon: '🍽️',
    nameKey: 'auth.businessRegistration.types.restaurant'
  },
  {
    id: 'cafe',
    icon: '☕',
    nameKey: 'auth.businessRegistration.types.cafe'
  },
  {
    id: 'retail',
    icon: '�',
    nameKey: 'auth.businessRegistration.types.retail'
  },
  {
    id: 'station',
    icon: '⛽',
    nameKey: 'auth.businessRegistration.types.station'
  },
  {
    id: 'parking',
    icon: '🅿️',
    nameKey: 'auth.businessRegistration.types.parking'
  },
  {
    id: 'pharmacy',
    icon: '💊',
    nameKey: 'auth.businessRegistration.types.pharmacy'
  }
] as const;

export default function BusinessTypeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleSelectType = (type: string) => {
    console.log('Selected business type:', type);
    
    if (type === 'cafe') {
      router.push('/auth/cafe-register');
    } else if (type === 'restaurant') {
      router.push('/auth/restaurant-register');
    } else if (type === 'station') {
      router.push('/auth/fuel-station-register');
    } else if (type === 'retail') {
      router.push('/auth/shopping-register');
    } else if (type === 'pharmacy') {
      router.push('/auth/pharmacy-register');
    } else if (type === 'parking') {
      router.push('/auth/parking-register');
    } else {
      // For other types, show alert for now
      Alert.alert(
        t('auth.businessRegistration.businessType'),
        `Selected: ${t(`auth.businessRegistration.types.${type}`)}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('home.registerOptions.business')} showBackButton />
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {t('auth.businessRegistration.businessType')}
        </Text>
        <View style={styles.grid}>
          {businessTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={styles.typeButton}
              onPress={() => handleSelectType(type.id)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={styles.typeText}>
                {t(type.nameKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeButton: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  typeText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  }
});