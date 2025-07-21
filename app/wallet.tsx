import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import WalletCard from '@/components/recharge/WalletCard';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/Colors';

export default function WalletPage() {
  const router = useRouter();
  const { state } = useApp();
  const { theme } = state;

  // Colors
  const colors = Colors[theme as keyof typeof Colors] || Colors.light;

  const handleRechargePress = () => {
    router.push('./recharge' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <WalletCard onRechargePress={handleRechargePress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
