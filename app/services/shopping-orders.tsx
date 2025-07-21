import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BusinessShoppingOrdersManager } from '../../components/shopping';
import Header from '../../components/layout/Header';

export default function ShoppingOrdersScreen() {
  return (
    <View style={styles.container}>
      <Header title="طلبات التسوق" />
      <BusinessShoppingOrdersManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
