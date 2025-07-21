import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DriverShoppingDeliveryManager } from '../../components/shopping';
import Header from '../../components/layout/Header';

export default function ShoppingDeliveryScreen() {
  return (
    <View style={styles.container}>
      <Header title="توصيل طلبات التسوق" />
      <DriverShoppingDeliveryManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
