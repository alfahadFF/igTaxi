import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import { Calendar, MapPin, Clock, Car, Droplets, Truck, Flame } from 'lucide-react-native';
import RatingModal from '@/components/ratings/RatingModal';
import WaterOrdersList from '@/components/water/WaterOrdersList';
import WaterTankerOrdersList from '@/components/water-tanker/WaterTankerOrdersList';
import GasOrdersList from '@/components/gas-delivery/GasOrdersList';

// Mock data for trips
const mockTrips = [
  {
    id: '1',
    type: 'taxi',
    status: 'upcoming',
    date: '2025-05-15',
    time: '14:30',
    pickup: '123 Main St',
    destination: '456 Elm St',
    price: '$12.50',
  },
  {
    id: '2',
    type: 'transport',
    status: 'upcoming',
    date: '2025-05-16',
    time: '09:15',
    pickup: '789 Oak Ave',
    destination: '101 Pine Rd',
    price: '$24.75',
  },
  {
    id: '3',
    type: 'taxi',
    status: 'past',
    date: '2025-05-10',
    time: '18:45',
    pickup: '222 Cedar Blvd',
    destination: '333 Maple Dr',
    price: '$8.90',
  },
  {
    id: '4',
    type: 'specialEvents',
    status: 'past',
    date: '2025-05-05',
    time: '20:00',
    pickup: '444 Beach Rd',
    destination: '555 Mountain Ave',
    price: '$45.00',
  },
];

type TabType = 'taxi' | 'water-stations' | 'water-tanker' | 'gas-delivery';

export default function TripsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('taxi');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'taxi':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Car size={20} color="#3498db" />
              <Text style={styles.sectionTitle}>رحلات التاكسي والنقل</Text>
            </View>
            <View style={styles.emptyContainer}>
              <Car size={60} color="#ccc" />
              <Text style={styles.emptyText}>لا توجد رحلات تاكسي حالياً</Text>
              <Text style={styles.emptySubtext}>عندما تحجز رحلة، ستظهر هنا</Text>
            </View>
          </View>
        );
      
      case 'water-stations':
        return <WaterOrdersList refreshing={false} onRefresh={() => {}} />;
      
      case 'water-tanker':
        return <WaterTankerOrdersList />;
      
      case 'gas-delivery':
        return <GasOrdersList />;
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="طلباتي ورحلاتي" />
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'taxi' && styles.activeTab]}
          onPress={() => setActiveTab('taxi')}
        >
          <Car size={16} color={activeTab === 'taxi' ? '#3498db' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'taxi' && styles.activeTabText]}>
            التاكسي
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'water-stations' && styles.activeTab]}
          onPress={() => setActiveTab('water-stations')}
        >
          <Droplets size={16} color={activeTab === 'water-stations' ? '#00A8E8' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'water-stations' && styles.activeTabText]}>
            محطات المياه
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'water-tanker' && styles.activeTab]}
          onPress={() => setActiveTab('water-tanker')}
        >
          <Truck size={16} color={activeTab === 'water-tanker' ? '#2196F3' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'water-tanker' && styles.activeTabText]}>
            صهاريج الماء
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gas-delivery' && styles.activeTab]}
          onPress={() => setActiveTab('gas-delivery')}
        >
          <Flame size={16} color={activeTab === 'gas-delivery' ? '#FF6B35' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'gas-delivery' && styles.activeTabText]}>
            توزيع الغاز
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
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
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: 10,
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});