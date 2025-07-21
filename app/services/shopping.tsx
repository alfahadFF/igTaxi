import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BusinessOffers } from '../../components/shopping';
import Header from '../../components/layout/Header';

export default function ShoppingOffersScreen() {
  return (
    <View style={styles.container}>
      <Header title="عروض التسوق" />
      <BusinessOffers />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
