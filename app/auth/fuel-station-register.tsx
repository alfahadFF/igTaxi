import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, Alert, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Mail, User, PhoneCall, Camera, MapPin, Check, Settings, Building, Info } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { parsePhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';
import MapView from '@/components/maps';

// Service type definition
type Service = {
  id: string;
  nameKey: string;
  selected: boolean;
};

// Facility type definition
type Facility = {
  id: string;
  nameKey: string;
  selected: boolean;
};

// Required field component
const RequiredField = () => <Text style={styles.requiredField}>*</Text>;

export default function FuelStationRegister() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  // Form state
  const [stationName, setStationName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [showMapModal, setShowMapModal] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [photo, setPhoto] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('JO');
  const [isLoading, setIsLoading] = useState(false);
  
  // Services state for fuel station services
  const [services, setServices] = useState<Service[]>([
    { id: 'gasoline_95', nameKey: 'auth.fuelStationRegistration.services.gasoline_95', selected: false },
    { id: 'gasoline_90', nameKey: 'auth.fuelStationRegistration.services.gasoline_90', selected: false },
    { id: 'diesel', nameKey: 'auth.fuelStationRegistration.services.diesel', selected: false },
    { id: 'electric_charging', nameKey: 'auth.fuelStationRegistration.services.electric_charging', selected: false },
    { id: 'oil_change', nameKey: 'auth.fuelStationRegistration.services.oil_change', selected: false },
    { id: 'lubrication', nameKey: 'auth.fuelStationRegistration.services.lubrication', selected: false },
    { id: 'car_wash', nameKey: 'auth.fuelStationRegistration.services.car_wash', selected: false },
    { id: 'tire_service', nameKey: 'auth.fuelStationRegistration.services.tire_service', selected: false },
    { id: 'quick_maintenance', nameKey: 'auth.fuelStationRegistration.services.quick_maintenance', selected: false },
    { id: 'air_water', nameKey: 'auth.fuelStationRegistration.services.air_water', selected: false },
  ]);

  // Facilities state for additional facilities
  const [facilities, setFacilities] = useState<Facility[]>([
    { id: 'mosque', nameKey: 'auth.fuelStationRegistration.facilities.mosque', selected: false },
    { id: 'cafe', nameKey: 'auth.fuelStationRegistration.facilities.cafe', selected: false },
    { id: 'supermarket', nameKey: 'auth.fuelStationRegistration.facilities.supermarket', selected: false },
    { id: 'bakery', nameKey: 'auth.fuelStationRegistration.facilities.bakery', selected: false },
    { id: 'restaurant', nameKey: 'auth.fuelStationRegistration.facilities.restaurant', selected: false },
    { id: 'atm', nameKey: 'auth.fuelStationRegistration.facilities.atm', selected: false },
    { id: 'restroom', nameKey: 'auth.fuelStationRegistration.facilities.restroom', selected: false },
    { id: 'pharmacy', nameKey: 'auth.fuelStationRegistration.facilities.pharmacy', selected: false },
  ]);

  const isRTL = i18n.dir() === 'rtl';

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('common.error'),
          t('auth.fuelStationRegistration.locationPermissionRequired')
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Get country code from location
      const geocode = await Location.reverseGeocodeAsync(currentLocation.coords);
      if (geocode[0]?.isoCountryCode) {
        setCountryCode(geocode[0].isoCountryCode as CountryCode);
      }
    } catch (error) {
      console.log('Location error:', error);
      Alert.alert(
        t('common.error'),
        t('auth.fuelStationRegistration.locationError')
      );
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleLocationSelect = (selectedLocation: {latitude: number, longitude: number}) => {
    setLocation(selectedLocation);
    setShowMapModal(false);
  };

  const openMapModal = () => {
    setShowMapModal(true);
  };

  const toggleService = (serviceId: string) => {
    setServices(prev =>
      prev.map(service =>
        service.id === serviceId ? { ...service, selected: !service.selected } : service
      )
    );
  };

  const toggleFacility = (facilityId: string) => {
    setFacilities(prev =>
      prev.map(facility =>
        facility.id === facilityId ? { ...facility, selected: !facility.selected } : facility
      )
    );
  };

  const validateForm = () => {
    if (!stationName.trim()) {
      Alert.alert(t('common.error'), t('auth.fuelStationRegistration.stationNameRequired'));
      return false;
    }
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.fuelStationRegistration.emailRequired'));
      return false;
    }
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('auth.fuelStationRegistration.phoneRequired'));
      return false;
    }
    if (!location) {
      Alert.alert(t('common.error'), t('auth.fuelStationRegistration.locationRequired'));
      return false;
    }
    if (!photo) {
      Alert.alert(t('common.error'), t('auth.fuelStationRegistration.photoRequired'));
      return false;
    }
    if (!services.some(service => service.selected)) {
      Alert.alert(t('common.error'), t('auth.fuelStationRegistration.servicesRequired'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const selectedServices = services
        .filter(service => service.selected)
        .map(service => service.id);

      const selectedFacilities = facilities
        .filter(facility => facility.selected)
        .map(facility => facility.id);

      // Format phone number
      const formattedPhone = `+${getCountryCallingCode(countryCode)}${phone}`;

      const stationData = {
        name: stationName,
        email: email,
        phone: formattedPhone,
        description: description,
        location: location,
        photo: photo,
        services: selectedServices,
        facilities: selectedFacilities,
        type: 'fuel_station'
      };

      console.log('Fuel station registration data:', stationData);
      
      Alert.alert(
        t('common.success'),
        t('auth.fuelStationRegistration.registrationSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert(
        t('common.error'),
        t('auth.fuelStationRegistration.registrationError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t('auth.fuelStationRegistration.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            {/* Station Name */}
            <View style={styles.inputContainer}>
              <User size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.fuelStationRegistration.stationName')} *`}
                placeholderTextColor="#999"
                value={stationName}
                onChangeText={setStationName}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Mail size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.fuelStationRegistration.email')} *`}
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <PhoneCall size={20} color="#999" style={styles.inputIcon} />
              <Text style={styles.countryCode}>+{getCountryCallingCode(countryCode)}</Text>
              <TextInput
                style={[styles.input, styles.phoneInput, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.fuelStationRegistration.phone')} *`}
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Description */}
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea, isRTL && styles.inputRTL]}
                placeholder={t('auth.fuelStationRegistration.description')}
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Services */}
            <Text style={styles.sectionTitle}>
              <Settings size={18} color="#333" style={styles.sectionIcon} />
              {t('auth.fuelStationRegistration.servicesTitle')} <RequiredField />
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t('auth.fuelStationRegistration.servicesSubtitle')}
            </Text>
            <View style={styles.itemsContainer}>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.itemButton,
                    service.selected && styles.itemButtonSelected
                  ]}
                  onPress={() => toggleService(service.id)}
                >
                  <Text style={[
                    styles.itemText,
                    service.selected && styles.itemTextSelected
                  ]}>
                    {t(service.nameKey)}
                  </Text>
                  {service.selected && (
                    <Check size={14} color="#fff" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Facilities */}
            <Text style={styles.sectionTitle}>
              <Building size={18} color="#333" style={styles.sectionIcon} />
              {t('auth.fuelStationRegistration.facilitiesTitle')}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t('auth.fuelStationRegistration.facilitiesSubtitle')}
            </Text>
            <View style={styles.itemsContainer}>
              {facilities.map((facility) => (
                <TouchableOpacity
                  key={facility.id}
                  style={[
                    styles.itemButton,
                    facility.selected && styles.itemButtonSelected
                  ]}
                  onPress={() => toggleFacility(facility.id)}
                >
                  <Text style={[
                    styles.itemText,
                    facility.selected && styles.itemTextSelected
                  ]}>
                    {t(facility.nameKey)}
                  </Text>
                  {facility.selected && (
                    <Check size={14} color="#fff" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Location */}
            <View style={styles.locationContainer}>
              <View style={styles.locationHeader}>
                <MapPin size={20} color="#999" />
                <Text style={styles.locationText}>
                  {location 
                    ? `${t('auth.fuelStationRegistration.locationSet')}: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : `${t('auth.fuelStationRegistration.location')} *`
                  }
                </Text>
              </View>
              <View style={styles.locationButtons}>
                <TouchableOpacity 
                  style={[styles.locationButton, styles.primaryLocationButton]}
                  onPress={openMapModal}
                >
                  <Text style={styles.locationButtonText}>
                    {t('auth.fuelStationRegistration.selectOnMap')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.locationButton, styles.secondaryLocationButton]}
                  onPress={getCurrentLocation}
                >
                  <Text style={[styles.locationButtonText, styles.secondaryLocationButtonText]}>
                    {t('auth.fuelStationRegistration.getLocation')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Photo */}
            <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color="#999" />
                  <Text style={styles.photoText}>
                    {t('auth.fuelStationRegistration.uploadPhoto')} <RequiredField />
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? t('common.loading') : t('auth.fuelStationRegistration.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>
              {t('auth.fuelStationRegistration.selectLocationOnMap')}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.mapContainer}>
            <MapView
              onLocationSelect={handleLocationSelect}
              initialLocation={location || undefined}
              onClose={() => setShowMapModal(false)}
            />
          </View>
          
          <View style={styles.mapModalFooter}>
            <Text style={styles.mapModalInstructions}>
              {t('auth.fuelStationRegistration.tapToSelectLocation')}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  form: {
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  inputRTL: {
    textAlign: 'right',
  },
  phoneInput: {
    flex: 1,
  },
  countryCode: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  textAreaContainer: {
    height: 80,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 8,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  requiredField: {
    color: '#e53e3e',
    fontSize: 16,
  },
  itemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    minWidth: '45%',
    justifyContent: 'center',
  },
  itemButtonSelected: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  itemText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  itemTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 6,
  },
  locationContainer: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  locationButton: {
    backgroundColor: '#F5B800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  primaryLocationButton: {
    backgroundColor: '#F5B800',
    flex: 1,
  },
  secondaryLocationButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F5B800',
    flex: 1,
  },
  locationButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  secondaryLocationButtonText: {
    color: '#F5B800',
  },
  photoContainer: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 150,
    marginBottom: 20,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#F5B800',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#F5B800',
  },
  mapModalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
  },
  mapModalFooter: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 30,
  },
  mapModalInstructions: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#fff',
    textAlign: 'center',
  },
});
