import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image, Alert, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Mail, User, PhoneCall, Camera, MapPin, Check, Clock, Info } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/utils/supabase';
import { parsePhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';
import MapView from '@/components/maps';

// Category type definition
type Category = {
  id: string;
  nameKey: string;
  selected: boolean;
};

// Required field component
const RequiredField = () => <Text style={styles.requiredField}>*</Text>;

export default function RestaurantRegister() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  // Form state
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [currentRating, setCurrentRating] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [is24Hours, setIs24Hours] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState({ type: '', visible: false });
  const [showMapModal, setShowMapModal] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [photo, setPhoto] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('JO');
  const [isLoading, setIsLoading] = useState(false);
  
  // Categories state for food types
  const [categories, setCategories] = useState<Category[]>([
    { id: 'eastern_restaurants', nameKey: 'auth.restaurantRegistration.categories.eastern_restaurants', selected: false },
    { id: 'western_restaurants', nameKey: 'auth.restaurantRegistration.categories.western_restaurants', selected: false },
    { id: 'catering_kitchen', nameKey: 'auth.restaurantRegistration.categories.catering_kitchen', selected: false },
    { id: 'fast_food', nameKey: 'auth.restaurantRegistration.categories.fast_food', selected: false },
    { id: 'family_restaurants', nameKey: 'auth.restaurantRegistration.categories.family_restaurants', selected: false },
    { id: 'fine_dining', nameKey: 'auth.restaurantRegistration.categories.fine_dining', selected: false },
    { id: 'seafood', nameKey: 'auth.restaurantRegistration.categories.seafood', selected: false },
    { id: 'vegetarian_healthy', nameKey: 'auth.restaurantRegistration.categories.vegetarian_healthy', selected: false },
    { id: 'grills_meat', nameKey: 'auth.restaurantRegistration.categories.grills_meat', selected: false },
    { id: 'popular_restaurant', nameKey: 'auth.restaurantRegistration.categories.popular_restaurant', selected: false },
    { id: 'pastries_bakery', nameKey: 'auth.restaurantRegistration.categories.pastries_bakery', selected: false },
    { id: 'broasted_shawarma', nameKey: 'auth.restaurantRegistration.categories.broasted_shawarma', selected: false },
    { id: 'diet_healthy', nameKey: 'auth.restaurantRegistration.categories.diet_healthy', selected: false },
    { id: 'sweets_desserts', nameKey: 'auth.restaurantRegistration.categories.sweets_desserts', selected: false },
    { id: 'oriental_sweets', nameKey: 'auth.restaurantRegistration.categories.oriental_sweets', selected: false },
    { id: 'western_sweets', nameKey: 'auth.restaurantRegistration.categories.western_sweets', selected: false },
    { id: 'ice_cream_gelato', nameKey: 'auth.restaurantRegistration.categories.ice_cream_gelato', selected: false },
    { id: 'chocolate_candy', nameKey: 'auth.restaurantRegistration.categories.chocolate_candy', selected: false },
    { id: 'cakes_pastries', nameKey: 'auth.restaurantRegistration.categories.cakes_pastries', selected: false },
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
          t('auth.restaurantRegistration.locationPermissionRequired')
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
        t('auth.restaurantRegistration.locationError')
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

  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleTimeSelect = (type: 'opening' | 'closing', hour: number, minute: number) => {
    const formattedTime = formatTime(hour, minute);
    if (type === 'opening') {
      setOpeningTime(formattedTime);
    } else {
      setClosingTime(formattedTime);
    }
    setShowTimePicker({ type: '', visible: false });
  };

  const openTimePicker = (type: 'opening' | 'closing') => {
    setShowTimePicker({ type, visible: true });
  };

  const toggle24Hours = () => {
    setIs24Hours(!is24Hours);
    if (!is24Hours) {
      setOpeningTime('');
      setClosingTime('');
    }
  };

  const handleLocationSelect = (selectedLocation: {latitude: number, longitude: number}) => {
    setLocation(selectedLocation);
    setShowMapModal(false);
  };

  const openMapModal = () => {
    setShowMapModal(true);
  };

  const toggleCategory = (categoryId: string) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, selected: !cat.selected } : cat
      )
    );
  };

  const validateForm = () => {
    if (!restaurantName.trim()) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.restaurantNameRequired'));
      return false;
    }
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.emailRequired'));
      return false;
    }
    if (!phone.trim()) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.phoneRequired'));
      return false;
    }
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.descriptionRequired'));
      return false;
    }
    if (!is24Hours && (!openingTime || !closingTime)) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.workingHoursRequired'));
      return false;
    }
    if (!location) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.locationRequired'));
      return false;
    }
    if (!photo) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.photoRequired'));
      return false;
    }
    if (!categories.some(cat => cat.selected)) {
      Alert.alert(t('common.error'), t('auth.restaurantRegistration.categoriesRequired'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const selectedCategories = categories
        .filter(cat => cat.selected)
        .map(cat => cat.id);

      // Format phone number
      const formattedPhone = `+${getCountryCallingCode(countryCode)}${phone}`;

      const restaurantData = {
        name: restaurantName,
        email: email,
        phone: formattedPhone,
        description: description,
        is24Hours: is24Hours,
        openingTime: is24Hours ? '00:00' : openingTime,
        closingTime: is24Hours ? '23:59' : closingTime,
        currentRating: currentRating || null,
        averagePrice: averagePrice || null,
        location: location,
        photo: photo,
        categories: selectedCategories,
        type: 'restaurant'
      };

      console.log('Restaurant registration data:', restaurantData);
      
      Alert.alert(
        t('common.success'),
        t('auth.restaurantRegistration.registrationSuccess'),
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
        t('auth.restaurantRegistration.registrationError')
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
            {t('auth.restaurantRegistration.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.form}>
            {/* Restaurant Name */}
            <View style={styles.inputContainer}>
              <User size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.restaurantRegistration.restaurantName')} *`}
                placeholderTextColor="#999"
                value={restaurantName}
                onChangeText={setRestaurantName}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Mail size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={`${t('auth.restaurantRegistration.email')} *`}
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
                placeholder={`${t('auth.restaurantRegistration.phone')} *`}
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
                placeholder={`${t('auth.restaurantRegistration.description')} *`}
                placeholderTextColor="#999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Average Price */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('auth.restaurantRegistration.averagePrice')}
                placeholderTextColor="#999"
                value={averagePrice}
                onChangeText={setAveragePrice}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Working Hours */}
            <View style={styles.workingHoursHeader}>
              <Text style={styles.sectionTitle}>
                {t('auth.restaurantRegistration.workingHours')} {!is24Hours && <RequiredField />}
              </Text>
              <TouchableOpacity 
                style={[styles.toggleButton, is24Hours && styles.toggleButtonActive]}
                onPress={toggle24Hours}
              >
                <Text style={[styles.toggleButtonText, is24Hours && styles.toggleButtonTextActive]}>
                  {t('auth.restaurantRegistration.24hours')}
                </Text>
              </TouchableOpacity>
            </View>

            {!is24Hours && (
              <View style={styles.timeContainer}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>{t('auth.restaurantRegistration.openingTime')}</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => openTimePicker('opening')}
                  >
                    <Clock size={16} color="#666" />
                    <Text style={styles.timePickerText}>
                      {openingTime || '09:00'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeSeparator}>-</Text>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>{t('auth.restaurantRegistration.closingTime')}</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => openTimePicker('closing')}
                  >
                    <Clock size={16} color="#666" />
                    <Text style={styles.timePickerText}>
                      {closingTime || '22:00'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Current Rating (Optional) */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isRTL && styles.inputRTL]}
                placeholder={t('auth.restaurantRegistration.currentRating')}
                placeholderTextColor="#999"
                value={currentRating}
                onChangeText={setCurrentRating}
                keyboardType="numeric"
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>

            {/* Categories */}
            <Text style={styles.sectionTitle}>
              {t('auth.restaurantRegistration.categoriesTitle')} <RequiredField />
            </Text>
            <Text style={styles.categoriesSubtitle}>
              {t('auth.restaurantRegistration.categoriesSubtitle')}
            </Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    category.selected && styles.categoryButtonSelected
                  ]}
                  onPress={() => toggleCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryText,
                    category.selected && styles.categoryTextSelected
                  ]}>
                    {t(category.nameKey)}
                  </Text>
                  {category.selected && (
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
                    ? `${t('auth.restaurantRegistration.locationSet')}: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : `${t('auth.restaurantRegistration.location')} *`
                  }
                </Text>
              </View>
              <View style={styles.locationButtons}>
                <TouchableOpacity 
                  style={[styles.locationButton, styles.primaryLocationButton]}
                  onPress={openMapModal}
                >
                  <Text style={styles.locationButtonText}>
                    {t('auth.restaurantRegistration.selectOnMap')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.locationButton, styles.secondaryLocationButton]}
                  onPress={getCurrentLocation}
                >
                  <Text style={[styles.locationButtonText, styles.secondaryLocationButtonText]}>
                    {t('auth.restaurantRegistration.getLocation')}
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
                    {t('auth.restaurantRegistration.uploadPhoto')} <RequiredField />
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Menu Note */}
            <View style={styles.noteContainer}>
              <Info size={20} color="#F5B800" />
              <Text style={styles.noteText}>
                {t('auth.restaurantRegistration.menuNote')}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? t('common.loading') : t('auth.restaurantRegistration.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker({ type: '', visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTimePicker({ type: '', visible: false })}>
                <X size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {showTimePicker.type === 'opening' 
                  ? t('auth.restaurantRegistration.openingTime')
                  : t('auth.restaurantRegistration.closingTime')
                }
              </Text>
              <View style={{ width: 24 }} />
            </View>
            
            <View style={styles.timePickerContainer}>
              {/* Hours */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>{t('auth.restaurantRegistration.hour')}</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.timeOption}
                      onPress={() => {
                        const currentTime = showTimePicker.type === 'opening' ? openingTime : closingTime;
                        const currentMinute = currentTime ? parseInt(currentTime.split(':')[1]) : 0;
                        handleTimeSelect(showTimePicker.type as 'opening' | 'closing', i, currentMinute);
                      }}
                    >
                      <Text style={styles.timeOptionText}>{i.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Minutes */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColumnLabel}>{t('auth.restaurantRegistration.minute')}</Text>
                <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      style={styles.timeOption}
                      onPress={() => {
                        const currentTime = showTimePicker.type === 'opening' ? openingTime : closingTime;
                        const currentHour = currentTime ? parseInt(currentTime.split(':')[0]) : 9;
                        handleTimeSelect(showTimePicker.type as 'opening' | 'closing', currentHour, minute);
                      }}
                    >
                      <Text style={styles.timeOptionText}>{minute.toString().padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      
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
              {t('auth.restaurantRegistration.selectLocationOnMap')}
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
              {t('auth.restaurantRegistration.tapToSelectLocation')}
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
    height: 100,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  categoriesSubtitle: {
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
  workingHoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  toggleButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  toggleButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInputContainer: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 5,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFF',
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  timePickerText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#333',
    marginLeft: 8,
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 10,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 8,
  },
  categoryButton: {
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
  categoryButtonSelected: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  categoryText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  categoryTextSelected: {
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
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F5B800',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  noteText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#B8860B',
    marginLeft: 8,
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
    paddingVertical: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  timePickerContainer: {
    flexDirection: 'row',
    paddingTop: 20,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColumnLabel: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginBottom: 10,
  },
  timeScrollView: {
    maxHeight: 200,
    width: '100%',
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 10,
  },
  timeOptionText: {
    fontSize: 18,
    fontFamily: 'Poppins-Regular',
    color: '#333',
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
