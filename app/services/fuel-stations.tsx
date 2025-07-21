import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import Header from '@/components/layout/Header';
import { Fuel, Zap, MapPin, Clock, Star, Filter } from 'lucide-react-native';

type StationType = 'fuel' | 'ev';

type Station = {
  id: string;
  name: string;
  type: StationType;
  image: string;
  location: string;
  distance: string;
  rating: number;
  waitTime: string;
  services: string[];
  isOpen: boolean;
};

export default function FuelStationsScreen() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<StationType>('fuel');

  const stations: Station[] = [
    {
      id: '1',
      name: 'ADNOC Station',
      type: 'fuel',
      image: 'https://images.pexels.com/photos/2996107/pexels-photo-2996107.jpeg',
      location: 'Sheikh Zayed Road',
      distance: '1.2 km',
      rating: 4.5,
      waitTime: '5-10',
      services: ['car-wash', 'market', 'oil-change'],
      isOpen: true,
    },
    {
      id: '2',
      name: 'Tesla Supercharger',
      type: 'ev',
      image: 'https://images.pexels.com/photos/10553527/pexels-photo-10553527.jpeg',
      location: 'Dubai Mall',
      distance: '2.5 km',
      rating: 4.8,
      waitTime: '0-5',
      services: ['wifi', 'lounge', 'shopping'],
      isOpen: true,
    },
    {
      id: '3',
      name: 'ENOC Station',
      type: 'fuel',
      image: 'https://images.pexels.com/photos/71764/pexels-photo-71764.jpeg',
      location: 'Al Wasl Road',
      distance: '3.1 km',
      rating: 4.3,
      waitTime: '10-15',
      services: ['car-wash', 'tire-service', 'market'],
      isOpen: true,
    },
    {
      id: '4',
      name: 'Green Charger',
      type: 'ev',
      image: 'https://images.pexels.com/photos/9796138/pexels-photo-9796138.jpeg',
      location: 'Business Bay',
      distance: '4.0 km',
      rating: 4.6,
      waitTime: '5-10',
      services: ['wifi', 'cafe', 'restroom'],
      isOpen: true,
    },
  ];

  const filteredStations = stations.filter(station => station.type === selectedType);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('services.fuelStations')} showBackButton />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Type Selection */}
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'fuel' && styles.selectedType]}
              onPress={() => setSelectedType('fuel')}
            >
              <Fuel size={24} color={selectedType === 'fuel' ? '#fff' : '#333'} />
              <Text style={[styles.typeText, selectedType === 'fuel' && styles.selectedTypeText]}>
                {t('fuelStations.fuel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, selectedType === 'ev' && styles.selectedType]}
              onPress={() => setSelectedType('ev')}
            >
              <Zap size={24} color={selectedType === 'ev' ? '#fff' : '#333'} />
              <Text style={[styles.typeText, selectedType === 'ev' && styles.selectedTypeText]}>
                {t('fuelStations.ev')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Button */}
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={20} color="#333" />
            <Text style={styles.filterText}>{t('fuelStations.filter')}</Text>
          </TouchableOpacity>

          {/* Stations List */}
          <View style={styles.stationsList}>
            {filteredStations.map((station) => (
              <TouchableOpacity key={station.id} style={styles.stationCard}>
                <Image source={{ uri: station.image }} style={styles.stationImage} />
                <View style={styles.stationInfo}>
                  <View style={styles.stationHeader}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Star size={16} color="#F5B800" fill="#F5B800" />
                      <Text style={styles.ratingText}>{station.rating}</Text>
                    </View>
                  </View>

                  <View style={styles.locationContainer}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.locationText}>{station.location}</Text>
                    <Text style={styles.distanceText}>{station.distance}</Text>
                  </View>

                  <View style={styles.waitTimeContainer}>
                    <Clock size={16} color="#666" />
                    <Text style={styles.waitTimeText}>
                      {t('fuelStations.waitTime', { time: station.waitTime })}
                    </Text>
                  </View>

                  <View style={styles.servicesContainer}>
                    {station.services.map((service) => (
                      <View key={service} style={styles.serviceTag}>
                        <Text style={styles.serviceText}>
                          {t(`fuelStations.services.${service}`)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity style={styles.navigateButton}>
                    <Text style={styles.navigateButtonText}>
                      {t('fuelStations.navigate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedType: {
    backgroundColor: '#F5B800',
  },
  typeText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  selectedTypeText: {
    color: '#fff',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  stationsList: {
    marginTop: 8,
  },
  stationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stationImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  stationInfo: {
    padding: 16,
  },
  stationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stationName: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    flex: 1,
  },
  distanceText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#F5B800',
  },
  waitTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waitTimeText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  serviceTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  navigateButton: {
    backgroundColor: '#F5B800',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
});