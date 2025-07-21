import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import Header from '../../components/layout/Header';
import { MyParkingReservations } from '../../components/parking';

export default function ParkingReservationsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Header title="حجوزات المواقف" showBackButton />
      <View style={styles.content}>
        <MyParkingReservations />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
});
