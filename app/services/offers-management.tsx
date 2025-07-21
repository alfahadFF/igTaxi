import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OffersManagement } from '../../components/shopping';
import Header from '../../components/layout/Header';

export default function OffersManagementScreen() {
  return (
    <View style={styles.container}>
      <Header title="إدارة العروض" />
      <OffersManagement />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
