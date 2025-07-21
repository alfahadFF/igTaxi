import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { 
  Car, 
  Bus, 
  Clock, 
  Utensils, 
  ParkingMeter, 
  Fuel,
  UserPlus,
  Truck,
  CalendarClock,
  Store,
  ShoppingBag,
  Pill,
  Droplets,
  Flame
} from 'lucide-react-native';
import RegistrationTypeSelector from '@/components/auth/RegistrationTypeSelector';

type ServiceItem = {
  id: string;
  name: string;
  icon: React.ReactNode;
  route: string;
};

export default function ServiceGrid() {
  const { t } = useTranslation();
  const router = useRouter();
  const [showRegistrationSelector, setShowRegistrationSelector] = useState(false);

  const services: ServiceItem[] = [
    {
      id: 'taxi',
      name: t('services.taxi'),
      icon: <Car size={32} color="#F5B800" />,
      route: '/services/taxi-new',
    },
    {
      id: 'transport',
      name: t('services.transport'),
      icon: <Truck size={32} color="#F5B800" />,
      route: '/services/transport',
    },
    {
      id: 'specialEvents',
      name: t('services.specialEvents'),
      icon: <Bus size={32} color="#F5B800" />,
      route: '/services/special-events',
    },
    {
      id: 'contracts',
      name: t('services.contracts'),
      icon: <Clock size={32} color="#F5B800" />,
      route: '/services/contracts',
    },
    {
      id: 'pharmacy',
      name: 'الصيدليات',
      icon: <Pill size={32} color="#4CAF50" />,
      route: '/services/pharmacy',
    },
    {
      id: 'restaurantContracts',
      name: t('services.restaurantContracts'),
      icon: <Utensils size={32} color="#F5B800" />,
      route: '/services/restaurant-contracts',
    },
    {
      id: 'parking',
      name: t('services.parking'),
      icon: <ParkingMeter size={32} color="#F5B800" />,
      route: '/services/parking',
    },
    {
      id: 'fuelStations',
      name: t('services.fuelStations'),
      icon: <Fuel size={32} color="#F5B800" />,
      route: '/services/fuel-stations',
    },
    {
      id: 'shopping',
      name: 'عروض التسوق',
      icon: <ShoppingBag size={32} color="#F5B800" />,
      route: '/services/shopping',
    },
    {
      id: 'waterStations',
      name: 'محطات المياه',
      icon: <Droplets size={32} color="#00A8E8" />,
      route: '/water-service',
    },
    {
      id: 'waterTanker',
      name: 'صهريج ماء',
      icon: <Truck size={32} color="#2196F3" />,
      route: '/water-tanker',
    },
    {
      id: 'gasDelivery',
      name: 'توزيع الغاز',
      icon: <Flame size={32} color="#FF6B35" />,
      route: '/gas-delivery',
    },
  ];

  const handleServicePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('home.ourServices')}</Text>
      <View style={styles.grid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceCard}
            onPress={() => handleServicePress(service.route)}
          >
            <View style={styles.iconContainer}>{service.icon}</View>
            <Text style={styles.serviceName}>{service.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/trips')}
        >
          <Text style={styles.actionButtonText}>{t('home.myTrips')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.registerButton}
          onPress={() => setShowRegistrationSelector(true)}
        >
          <Text style={styles.registerButtonText}>{t('home.register')}</Text>
        </TouchableOpacity>
      </View>

      {/* مكون اختيار نوع التسجيل */}
      <RegistrationTypeSelector
        visible={showRegistrationSelector}
        onClose={() => setShowRegistrationSelector(false)}
        source="home"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 16,
    color: '#333',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
  },
  serviceName: {
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#333',
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#F5B800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  registerButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  registerButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});