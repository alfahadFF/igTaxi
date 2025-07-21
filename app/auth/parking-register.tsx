import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { MapPin } from 'lucide-react-native';
import Header from '@/components/layout/Header';
import MapView from '@/components/maps';

interface ParkingFormData {
  parkingName: string;
  email: string;
  phone: string;
  description: string;
  totalSpaces: string;
  pricePerMinute: string;
  pricePerHour: string;
  pricePerDay: string;
  pricePerMonth: string;
  photo: string | null;
  workingHours: {
    opening: string;
    closing: string;
    is24Hours: boolean;
  };
  services: string[];
}

const timePickerData = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const availableServices = [
  'covered',
  'security', 
  'valet',
  'ev-charging',
  'car-wash'
] as const;

export default function ParkingRegistrationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [formData, setFormData] = useState<ParkingFormData>({
    parkingName: '',
    email: '',
    phone: '',
    description: '',
    totalSpaces: '',
    pricePerMinute: '',
    pricePerHour: '',
    pricePerDay: '',
    pricePerMonth: '',
    photo: null,
    workingHours: {
      opening: '00:00',
      closing: '23:59',
      is24Hours: true
    },
    services: []
  });

  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timePickerType, setTimePickerType] = useState<'opening' | 'closing'>('opening');
  const [isLoading, setIsLoading] = useState(false);

  const formatDecimalInput = (value: string): string => {
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 3 for minute pricing, 2 for others
    if (parts.length === 2 && parts[1].length > 3) {
      parts[1] = parts[1].substring(0, 3);
    }
    
    return parts.join('.');
  };

  const handleInputChange = (field: keyof ParkingFormData, value: string) => {
    // Format decimal input for pricing fields
    if (['pricePerMinute', 'pricePerHour', 'pricePerDay', 'pricePerMonth'].includes(field)) {
      value = formatDecimalInput(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleTimeSelect = (time: string) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [timePickerType]: time
      }
    }));
    setShowTimeModal(false);
  };

  const handle24HoursToggle = () => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        is24Hours: !prev.workingHours.is24Hours,
        opening: !prev.workingHours.is24Hours ? '00:00' : prev.workingHours.opening,
        closing: !prev.workingHours.is24Hours ? '23:59' : prev.workingHours.closing
      }
    }));
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', t('auth.parkingRegistration.locationPermissionRequired'));
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });

    } catch (error) {
      Alert.alert('Error', t('auth.parkingRegistration.locationError'));
    }
  };

  // Auto-capture location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const handleMapLocationSelect = (coordinate: { latitude: number; longitude: number }) => {
    setLocation(coordinate);
    setShowMapModal(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        photo: result.assets[0].uri
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.parkingName.trim()) {
      Alert.alert('Error', t('auth.parkingRegistration.parkingNameRequired'));
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert('Error', t('auth.parkingRegistration.emailRequired'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', t('auth.parkingRegistration.emailRequired'));
      return false;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', t('auth.parkingRegistration.phoneRequired'));
      return false;
    }

    const phoneNumber = parsePhoneNumberFromString(formData.phone, 'JO');
    if (!phoneNumber || !phoneNumber.isValid()) {
      Alert.alert('Error', t('auth.invalidPhone'));
      return false;
    }

    if (!formData.totalSpaces.trim() || isNaN(Number(formData.totalSpaces)) || Number(formData.totalSpaces) <= 0) {
      Alert.alert('Error', t('auth.parkingRegistration.totalSpacesRequired'));
      return false;
    }

    if (!formData.pricePerHour.trim() || isNaN(Number(formData.pricePerHour)) || Number(formData.pricePerHour) < 0) {
      Alert.alert('Error', t('auth.parkingRegistration.pricePerHourRequired'));
      return false;
    }

    if (!location) {
      Alert.alert('Error', t('auth.parkingRegistration.locationRequired'));
      return false;
    }

    if (!formData.photo) {
      Alert.alert('Error', t('auth.parkingRegistration.photoRequired'));
      return false;
    }

    if (!formData.workingHours.is24Hours) {
      if (!formData.workingHours.opening || !formData.workingHours.closing) {
        Alert.alert('Error', t('auth.parkingRegistration.workingHoursRequired'));
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Here you would send the data to your backend
      console.log('Parking registration data:', { ...formData, location });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        t('common.success'),
        t('auth.parkingRegistration.registrationSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.push('/(tabs)')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', t('auth.parkingRegistration.registrationError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('auth.parkingRegistration.title')} showBackButton />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Parking Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.parkingName')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.parkingName}
              onChangeText={(value) => handleInputChange('parkingName', value)}
              placeholder={t('auth.parkingRegistration.parkingName')}
              placeholderTextColor="#999"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.email')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder={t('auth.parkingRegistration.email')}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.phone')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder={t('auth.parkingRegistration.phone')}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => handleInputChange('description', value)}
              placeholder={t('auth.parkingRegistration.description')}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Total Spaces */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.totalSpaces')} *</Text>
            <TextInput
              style={styles.input}
              value={formData.totalSpaces}
              onChangeText={(value) => handleInputChange('totalSpaces', value)}
              placeholder={t('auth.parkingRegistration.totalSpaces')}
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
          </View>

          {/* Pricing */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.pricing')}</Text>
            <View style={styles.pricingRow}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('auth.parkingRegistration.pricePerMinute')} (JOD)</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={formData.pricePerMinute}
                  onChangeText={(value) => handleInputChange('pricePerMinute', value)}
                  placeholder="0.000"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.pricingRow}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('auth.parkingRegistration.pricePerHour')} (JOD) *</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={formData.pricePerHour}
                  onChangeText={(value) => handleInputChange('pricePerHour', value)}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.pricingRow}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('auth.parkingRegistration.pricePerDay')} (JOD)</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={formData.pricePerDay}
                  onChangeText={(value) => handleInputChange('pricePerDay', value)}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.pricingRow}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('auth.parkingRegistration.pricePerMonth')} (JOD)</Text>
                <TextInput
                  style={styles.pricingInput}
                  value={formData.pricePerMonth}
                  onChangeText={(value) => handleInputChange('pricePerMonth', value)}
                  placeholder="0.00"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Working Hours */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.workingHours')} *</Text>
            
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={handle24HoursToggle}
            >
              <View style={[styles.checkbox, formData.workingHours.is24Hours && styles.checkboxChecked]}>
                {formData.workingHours.is24Hours && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.toggleText}>{t('auth.parkingRegistration.24hours')}</Text>
            </TouchableOpacity>

            {!formData.workingHours.is24Hours && (
              <View style={styles.timeRow}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setTimePickerType('opening');
                    setShowTimeModal(true);
                  }}
                >
                  <Text style={styles.timeLabel}>{t('auth.parkingRegistration.openingTime')}</Text>
                  <Text style={styles.timeValue}>{formData.workingHours.opening}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => {
                    setTimePickerType('closing');
                    setShowTimeModal(true);
                  }}
                >
                  <Text style={styles.timeLabel}>{t('auth.parkingRegistration.closingTime')}</Text>
                  <Text style={styles.timeValue}>{formData.workingHours.closing}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Services */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.servicesTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.parkingRegistration.servicesSubtitle')}</Text>
            <View style={styles.servicesGrid}>
              {availableServices.map((service) => (
                <TouchableOpacity
                  key={service}
                  style={[
                    styles.serviceButton,
                    formData.services.includes(service) && styles.serviceButtonSelected
                  ]}
                  onPress={() => handleServiceToggle(service)}
                >
                  <Text style={[
                    styles.serviceText,
                    formData.services.includes(service) && styles.serviceTextSelected
                  ]}>
                    {t(`fuelStations.services.${service}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.location')} *</Text>
            <View style={styles.locationHeader}>
              <MapPin size={20} color="#999" />
              <Text style={styles.locationDisplayText}>
                {location 
                  ? `${t('auth.parkingRegistration.locationSet')}: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : `${t('auth.parkingRegistration.location')} *`
                }
              </Text>
            </View>
            <View style={styles.locationButtons}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.locationButtonText}>
                  {t('auth.parkingRegistration.getLocation')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowMapModal(true)}
              >
                <Text style={styles.locationButtonText}>
                  {t('auth.parkingRegistration.selectOnMap')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.parkingRegistration.uploadPhoto')} *</Text>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              {formData.photo ? (
                <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>📷</Text>
                  <Text style={styles.photoPlaceholderSubtext}>
                    {t('auth.parkingRegistration.uploadPhoto')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? t('common.saving') : t('auth.parkingRegistration.submit')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Map Modal */}
      <Modal visible={showMapModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)}>
              <Text style={styles.modalCloseButton}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('auth.parkingRegistration.selectLocationOnMap')}</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <View style={styles.mapContainer}>
            <Text style={styles.mapInstructions}>
              {t('auth.parkingRegistration.tapToSelectLocation')}
            </Text>
            <MapView onLocationSelect={handleMapLocationSelect} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContainer}>
            <View style={styles.timeModalHeader}>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Text style={styles.timeModalButton}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.timeModalTitle}>
                {timePickerType === 'opening' 
                  ? t('auth.parkingRegistration.openingTime')
                  : t('auth.parkingRegistration.closingTime')
                }
              </Text>
            </View>
            <ScrollView style={styles.timeList}>
              {timePickerData.map((time) => (
                <TouchableOpacity
                  key={time.value}
                  style={styles.timeOption}
                  onPress={() => handleTimeSelect(time.value)}
                >
                  <Text style={styles.timeOptionText}>{time.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pricingRow: {
    marginBottom: 10,
  },
  pricingItem: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
    marginBottom: 4,
  },
  pricingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    backgroundColor: '#fff',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  serviceButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
  },
  serviceButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  serviceText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
  serviceTextSelected: {
    color: '#fff',
  },
  locationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 8,
  },
  locationDisplayText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  locationText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  photoButton: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  photoPlaceholderText: {
    fontSize: 40,
    marginBottom: 8,
  },
  photoPlaceholderSubtext: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCloseButton: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  modalPlaceholder: {
    width: 60,
  },
  mapContainer: {
    flex: 1,
  },
  mapInstructions: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timeModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  timeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeModalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  timeModalButton: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#007AFF',
  },
  timeList: {
    maxHeight: 300,
  },
  timeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeOptionText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    textAlign: 'center',
  }
});
