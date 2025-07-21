import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Header from '@/components/layout/Header';
import MapViewComponent from '@/components/maps';
import { Car, Clock, BadgeDollarSign } from 'lucide-react-native';

// Mock data for ride options
const rideOptions = [
  {
    id: 'standard',
    nameKey: 'taxi.standard.name',
    descriptionKey: 'taxi.standard.description',
    price: '$10-15',
    time: '5-8',
    icon: <Car size={24} color="#333" />,
  },
  {
    id: 'comfort',
    nameKey: 'taxi.comfort.name',
    descriptionKey: 'taxi.comfort.description',
    price: '$15-20',
    time: '7-10',
    icon: <Car size={24} color="#333" />,
  },
  {
    id: 'premium',
    nameKey: 'taxi.premium.name',
    descriptionKey: 'taxi.premium.description',
    price: '$25-30',
    time: '10-15',
    icon: <Car size={24} color="#333" />,
  },
];

export default function TaxiScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showMap, setShowMap] = useState(false);
  const [selectedOption, setSelectedOption] = useState('standard');

  const handleBookRide = () => {
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {showMap ? (
        <MapViewComponent showNearbyDrivers onClose={handleCloseMap} />
      ) : (
        <>
          <Header title={t('services.taxi')} showBackButton />
          
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              <Text style={styles.sectionTitle}>{t('taxi.selectRide')}</Text>
              
              <View style={styles.optionsContainer}>
                {rideOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      selectedOption === option.id && styles.selectedOptionCard,
                    ]}
                    onPress={() => setSelectedOption(option.id)}
                  >
                    <View style={styles.optionHeader}>
                      <View style={styles.optionIconContainer}>
                        {option.icon}
                      </View>
                      <View>
                        <Text style={styles.optionName}>{t(option.nameKey)}</Text>
                        <Text style={styles.optionDescription}>
                          {t(option.descriptionKey)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.optionDetails}>
                      <View style={styles.detailItem}>
                        <Clock size={16} color="#666" />
                        <Text style={styles.detailText}>
                          {option.time} {t('taxi.minutes')}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <BadgeDollarSign size={16} color="#666" />
                        <Text style={styles.detailText}>{option.price}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookRide}
              >
                <Text style={styles.bookButtonText}>{t('taxi.bookNow')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </>
      )}
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
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOptionCard: {
    borderColor: '#F5B800',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionIconContainer: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginRight: 16,
  },
  optionName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  optionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  bookButton: {
    backgroundColor: '#F5B800',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  bookButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});