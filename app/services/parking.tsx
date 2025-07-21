import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import { ParkingList, MyParkingReservations } from '../../components/parking';
import { Car, List } from 'lucide-react-native';

export default function ParkingScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'browse' | 'myReservations'>('browse');

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('services.parking')} showBackButton />
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'browse' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('browse')}
        >
          <Car size={20} color={activeTab === 'browse' ? '#fff' : '#333'} />
          <Text
            style={[
              styles.tabText,
              activeTab === 'browse' && styles.activeTabText,
            ]}
          >
            تصفح المواقف
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'myReservations' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('myReservations')}
        >
          <List size={20} color={activeTab === 'myReservations' ? '#fff' : '#333'} />
          <Text
            style={[
              styles.tabText,
              activeTab === 'myReservations' && styles.activeTabText,
            ]}
          >
            حجوزاتي
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'browse' ? (
          <ParkingList />
        ) : (
          <MyParkingReservations />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#F5B800',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});