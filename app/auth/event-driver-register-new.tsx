import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  User,
  Phone,
  Mail,
  Award,
  Car,
  Users,
  DollarSign,
  MapPin,
  X,
  Calendar,
  Shield
} from 'lucide-react-native';

// Interfaces
interface DriverProfile {
  // معلومات شخصية
  fullName: string;
  phoneNumber: string;
  email: string;
  nationalId: string;
  dateOfBirth: string;
  address: string;
  city: string;
  
  // معلومات مهنية
  experience: string;
  specializations: string[];
  description: string;
  languages: string[];
  
  // معلومات المركبة
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleCapacity: string;
  vehicleFeatures: string[];
  
  // التسعير والتوفر
  pricePerHour: string;
  pricePerDay: string;
  availability: string[];
  serviceAreas: string[];
  
  // الوثائق
  drivingLicense: boolean;
  vehicleRegistration: boolean;
  insurance: boolean;
  criminalRecord: boolean;
  
  // إعدادات الحساب
  acceptTerms: boolean;
  receiveNotifications: boolean;
}

// مكون لإدخال منطقة الخدمة
const ServiceAreaInput = ({ onAddArea, isRTL }: { onAddArea: (area: string) => void, isRTL: boolean }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onAddArea(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <View style={styles.inputContainer}>
      <MapPin size={20} color="#999" style={styles.inputIcon} />
      <TextInput
        style={[styles.input, isRTL && styles.inputRTL]}
        placeholder="أضف منطقة خدمة جديدة..."
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={handleSubmit}
        textAlign={isRTL ? 'right' : 'left'}
      />
    </View>
  );
};

export default function EventDriverRegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isRTL = i18n.dir() === 'rtl';

  // بيانات ثابتة
  const eventTypes = [
    { id: 'family', name: 'مناسبات عائلية', description: 'أعياد ميلاد، حفلات أطفال', icon: '👨‍👩‍👧‍👦' },
    { id: 'wedding', name: 'حفلات زفاف', description: 'نقل العروسين والضيوف', icon: '💒' },
    { id: 'business', name: 'فعاليات تجارية', description: 'مؤتمرات، اجتماعات', icon: '💼' },
    { id: 'tourism', name: 'سياحة', description: 'جولات سياحية', icon: '🏛️' },
    { id: 'sports', name: 'رياضة', description: 'مباريات، فعاليات رياضية', icon: '⚽' },
    { id: 'education', name: 'تعليمية', description: 'رحلات مدرسية، جامعية', icon: '🎓' }
  ];

  const vehicleTypes = [
    { id: 'sedan', name: 'سيدان', capacity: '1-4 أشخاص', icon: '🚗' },
    { id: 'suv', name: 'SUV', capacity: '1-7 أشخاص', icon: '🚙' },
    { id: 'van', name: 'فان', capacity: '8-15 شخص', icon: '🚐' },
    { id: 'bus', name: 'باص', capacity: '16+ شخص', icon: '🚌' },
    { id: 'luxury', name: 'فاخرة', capacity: '1-4 أشخاص', icon: '🏎️' }
  ];

  const availableFeatures = [
    { id: 'ac', name: 'تكييف هواء', icon: '❄️' },
    { id: 'wifi', name: 'واي فاي', icon: '📶' },
    { id: 'music', name: 'نظام صوتي', icon: '🎵' },
    { id: 'luxury_seats', name: 'مقاعد فاخرة', icon: '💺' },
    { id: 'refrigerator', name: 'ثلاجة', icon: '🧊' },
    { id: 'tv', name: 'شاشة ترفيه', icon: '📺' }
  ];

  // State للنموذج
  const [profile, setProfile] = useState<DriverProfile>({
    // معلومات شخصية
    fullName: '',
    phoneNumber: '',
    email: '',
    nationalId: '',
    dateOfBirth: '',
    address: '',
    city: '',
    
    // معلومات مهنية
    experience: '',
    specializations: [],
    description: '',
    languages: ['العربية'],
    
    // معلومات المركبة
    vehicleType: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehiclePlate: '',
    vehicleCapacity: '',
    vehicleFeatures: [],
    
    // التسعير والتوفر
    pricePerHour: '',
    pricePerDay: '',
    availability: [],
    serviceAreas: [],
    
    // الوثائق
    drivingLicense: false,
    vehicleRegistration: false,
    insurance: false,
    criminalRecord: false,
    
    // إعدادات الحساب
    acceptTerms: false,
    receiveNotifications: true
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const updateProfile = (field: keyof DriverProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const toggleSpecialization = (eventId: string) => {
    const current = profile.specializations;
    const updated = current.includes(eventId)
      ? current.filter(id => id !== eventId)
      : [...current, eventId];
    updateProfile('specializations', updated);
  };

  const toggleFeature = (featureId: string) => {
    const current = profile.vehicleFeatures;
    const updated = current.includes(featureId)
      ? current.filter(id => id !== featureId)
      : [...current, featureId];
    updateProfile('vehicleFeatures', updated);
  };

  const toggleAvailability = (day: string) => {
    const current = profile.availability;
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    updateProfile('availability', updated);
  };

  const addServiceArea = (area: string) => {
    if (area.trim() && !profile.serviceAreas.includes(area.trim())) {
      updateProfile('serviceAreas', [...profile.serviceAreas, area.trim()]);
    }
  };

  const removeServiceArea = (area: string) => {
    updateProfile('serviceAreas', profile.serviceAreas.filter(a => a !== area));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(profile.fullName && profile.phoneNumber && profile.email && profile.nationalId);
      case 2:
        return !!(profile.experience && profile.specializations.length > 0);
      case 3:
        return !!(profile.vehicleType && profile.vehicleMake && profile.vehicleModel && profile.vehicleYear);
      case 4:
        return !!(profile.pricePerHour && profile.pricePerDay);
      case 5:
        return profile.drivingLicense && profile.vehicleRegistration && profile.insurance && profile.acceptTerms;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // هنا سيتم إرسال البيانات للخادم
      console.log('Event Driver Profile:', profile);
      
      Alert.alert(
        'تم التسجيل بنجاح',
        'سيتم مراجعة طلبك والموافقة عليه خلال 24-48 ساعة. ستصلك رسالة تأكيد على البريد الإلكتروني.',
        [
          {
            text: 'حسناً',
            onPress: () => router.replace('/(tabs)')
          }
        ]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderPersonalInfo();
      case 2:
        return renderProfessionalInfo();
      case 3:
        return renderVehicleInfo();
      case 4:
        return renderPricingInfo();
      case 5:
        return renderDocuments();
      case 6:
        return renderReview();
      default:
        return null;
    }
  };

  const renderPersonalInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>المعلومات الشخصية</Text>
      
      <View style={styles.inputContainer}>
        <User size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="الاسم الكامل *"
          value={profile.fullName}
          onChangeText={(value) => updateProfile('fullName', value)}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.inputContainer}>
        <Phone size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="رقم الهاتف *"
          value={profile.phoneNumber}
          onChangeText={(value) => updateProfile('phoneNumber', value)}
          keyboardType="phone-pad"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.inputContainer}>
        <Mail size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="البريد الإلكتروني *"
          value={profile.email}
          onChangeText={(value) => updateProfile('email', value)}
          keyboardType="email-address"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.inputContainer}>
        <Shield size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="رقم الهوية الشخصية *"
          value={profile.nationalId}
          onChangeText={(value) => updateProfile('nationalId', value)}
          keyboardType="numeric"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.inputContainer}>
        <Calendar size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="تاريخ الميلاد (YYYY-MM-DD)"
          value={profile.dateOfBirth}
          onChangeText={(value) => updateProfile('dateOfBirth', value)}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.inputContainer}>
        <MapPin size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="العنوان"
          value={profile.address}
          onChangeText={(value) => updateProfile('address', value)}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <View style={styles.inputContainer}>
        <MapPin size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="المدينة"
          value={profile.city}
          onChangeText={(value) => updateProfile('city', value)}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>
    </View>
  );

  const renderProfessionalInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>المعلومات المهنية</Text>
      
      <View style={styles.inputContainer}>
        <Award size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.input, isRTL && styles.inputRTL]}
          placeholder="سنوات الخبرة *"
          value={profile.experience}
          onChangeText={(value) => updateProfile('experience', value)}
          keyboardType="numeric"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      <Text style={styles.sectionTitle}>التخصصات (اختر نوع أو أكثر من المناسبات) *</Text>
      <View style={styles.specialtiesGrid}>
        {eventTypes.map((eventType) => (
          <TouchableOpacity
            key={eventType.id}
            style={[
              styles.specialtyCard,
              profile.specializations.includes(eventType.id) && styles.selectedSpecialty
            ]}
            onPress={() => toggleSpecialization(eventType.id)}
          >
            <Text style={styles.specialtyIcon}>{eventType.icon}</Text>
            <Text style={[
              styles.specialtyName,
              profile.specializations.includes(eventType.id) && styles.selectedSpecialtyName
            ]}>
              {eventType.name}
            </Text>
            <Text style={styles.specialtyDescription}>{eventType.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textArea, isRTL && styles.inputRTL]}
          placeholder="وصف موجز عن خدماتك وخبرتك..."
          value={profile.description}
          onChangeText={(value) => updateProfile('description', value)}
          multiline
          numberOfLines={4}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>
    </View>
  );

  const renderVehicleInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>معلومات المركبة</Text>
      
      <Text style={styles.sectionTitle}>نوع المركبة *</Text>
      <View style={styles.vehicleTypesGrid}>
        {vehicleTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.vehicleTypeCard,
              profile.vehicleType === type.id && styles.selectedVehicleType
            ]}
            onPress={() => updateProfile('vehicleType', type.id)}
          >
            <Text style={styles.vehicleTypeIcon}>{type.icon}</Text>
            <Text style={[
              styles.vehicleTypeName,
              profile.vehicleType === type.id && styles.selectedVehicleTypeName
            ]}>
              {type.name}
            </Text>
            <Text style={styles.vehicleTypeCapacity}>{type.capacity}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <Car size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="الماركة *"
              value={profile.vehicleMake}
              onChangeText={(value) => updateProfile('vehicleMake', value)}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="الموديل *"
              value={profile.vehicleModel}
              onChangeText={(value) => updateProfile('vehicleModel', value)}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="سنة الصنع *"
              value={profile.vehicleYear}
              onChangeText={(value) => updateProfile('vehicleYear', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="اللون"
              value={profile.vehicleColor}
              onChangeText={(value) => updateProfile('vehicleColor', value)}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="رقم اللوحة"
              value={profile.vehiclePlate}
              onChangeText={(value) => updateProfile('vehiclePlate', value)}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <Users size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="عدد المقاعد"
              value={profile.vehicleCapacity}
              onChangeText={(value) => updateProfile('vehicleCapacity', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>المميزات الإضافية</Text>
      <View style={styles.featuresGrid}>
        {availableFeatures.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.featureCard,
              profile.vehicleFeatures.includes(feature.id) && styles.selectedFeature
            ]}
            onPress={() => toggleFeature(feature.id)}
          >
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <Text style={[
              styles.featureName,
              profile.vehicleFeatures.includes(feature.id) && styles.selectedFeatureName
            ]}>
              {feature.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPricingInfo = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>التسعير والتوفر</Text>
      
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="السعر بالساعة (د.أ) *"
              value={profile.pricePerHour}
              onChangeText={(value) => updateProfile('pricePerHour', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
        <View style={styles.halfInput}>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, isRTL && styles.inputRTL]}
              placeholder="السعر باليوم (د.أ) *"
              value={profile.pricePerDay}
              onChangeText={(value) => updateProfile('pricePerDay', value)}
              keyboardType="numeric"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>أيام العمل</Text>
      <View style={styles.availabilityContainer}>
        {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayCard,
              profile.availability.includes(day) && styles.selectedDay
            ]}
            onPress={() => toggleAvailability(day)}
          >
            <Text style={[
              styles.dayText,
              profile.availability.includes(day) && styles.selectedDayText
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>مناطق الخدمة</Text>
      <View style={styles.serviceAreasContainer}>
        {profile.serviceAreas.map((area, index) => (
          <View key={index} style={styles.serviceAreaTag}>
            <Text style={styles.serviceAreaText}>{area}</Text>
            <TouchableOpacity onPress={() => removeServiceArea(area)}>
              <X size={16} color="#666" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      
      <ServiceAreaInput 
        onAddArea={addServiceArea} 
        isRTL={isRTL}
      />
    </View>
  );

  const renderDocuments = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>الوثائق المطلوبة</Text>
      <Text style={styles.stepSubtitle}>يرجى تأكيد توفر الوثائق التالية:</Text>
      
      <View style={styles.documentsContainer}>
        <View style={styles.documentItem}>
          <View style={styles.documentInfo}>
            <Shield size={20} color="#4CAF50" />
            <Text style={styles.documentName}>رخصة القيادة السارية *</Text>
          </View>
          <Switch
            value={profile.drivingLicense}
            onValueChange={(value) => updateProfile('drivingLicense', value)}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={profile.drivingLicense ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.documentItem}>
          <View style={styles.documentInfo}>
            <Car size={20} color="#4CAF50" />
            <Text style={styles.documentName}>رخصة المركبة السارية *</Text>
          </View>
          <Switch
            value={profile.vehicleRegistration}
            onValueChange={(value) => updateProfile('vehicleRegistration', value)}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={profile.vehicleRegistration ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.documentItem}>
          <View style={styles.documentInfo}>
            <Shield size={20} color="#4CAF50" />
            <Text style={styles.documentName}>تأمين المركبة الساري *</Text>
          </View>
          <Switch
            value={profile.insurance}
            onValueChange={(value) => updateProfile('insurance', value)}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={profile.insurance ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.documentItem}>
          <View style={styles.documentInfo}>
            <Shield size={20} color="#4CAF50" />
            <Text style={styles.documentName}>عدم وجود سوابق جنائية</Text>
          </View>
          <Switch
            value={profile.criminalRecord}
            onValueChange={(value) => updateProfile('criminalRecord', value)}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={profile.criminalRecord ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.termsContainer}>
        <View style={styles.documentItem}>
          <Text style={styles.termsText}>
            أوافق على الشروط والأحكام وسياسة الخصوصية *
          </Text>
          <Switch
            value={profile.acceptTerms}
            onValueChange={(value) => updateProfile('acceptTerms', value)}
            trackColor={{ false: '#767577', true: '#F5B800' }}
            thumbColor={profile.acceptTerms ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.documentItem}>
          <Text style={styles.termsText}>
            أرغب في تلقي إشعارات حول الطلبات الجديدة
          </Text>
          <Switch
            value={profile.receiveNotifications}
            onValueChange={(value) => updateProfile('receiveNotifications', value)}
            trackColor={{ false: '#767577', true: '#F5B800' }}
            thumbColor={profile.receiveNotifications ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>مراجعة البيانات</Text>
      <Text style={styles.stepSubtitle}>تأكد من صحة جميع البيانات قبل التسجيل</Text>
      
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>المعلومات الشخصية</Text>
        <Text style={styles.reviewItem}>الاسم: {profile.fullName}</Text>
        <Text style={styles.reviewItem}>الهاتف: {profile.phoneNumber}</Text>
        <Text style={styles.reviewItem}>البريد: {profile.email}</Text>
        <Text style={styles.reviewItem}>الخبرة: {profile.experience} سنوات</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>التخصصات</Text>
        <Text style={styles.reviewItem}>
          {profile.specializations.map(s => eventTypes.find(e => e.id === s)?.name).join(', ')}
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>المركبة</Text>
        <Text style={styles.reviewItem}>
          {profile.vehicleMake} {profile.vehicleModel} {profile.vehicleYear}
        </Text>
        <Text style={styles.reviewItem}>السعة: {profile.vehicleCapacity} مقاعد</Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>التسعير</Text>
        <Text style={styles.reviewItem}>بالساعة: {profile.pricePerHour} د.أ</Text>
        <Text style={styles.reviewItem}>باليوم: {profile.pricePerDay} د.أ</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <X size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>تسجيل سائق مناسبات</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[
            styles.progressFill,
            { width: `${(currentStep / 6) * 100}%` }
          ]} />
        </View>
        <Text style={styles.progressText}>الخطوة {currentStep} من 6</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={handlePrevious}>
            <Text style={styles.backBtnText}>السابق</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[
            styles.nextBtn,
            !validateStep(currentStep) && styles.disabledBtn
          ]} 
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>
            {currentStep === 6 ? 'تسجيل' : 'التالي'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5'
  },
  backButton: {
    padding: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  placeholder: {
    width: 40
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5B800',
    borderRadius: 2
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8
  },
  content: {
    flex: 1,
    paddingHorizontal: 16
  },
  stepContainer: {
    paddingVertical: 20
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'right'
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'right'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'right'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    backgroundColor: '#F9F9F9'
  },
  inputIcon: {
    marginRight: 8
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333'
  },
  inputRTL: {
    textAlign: 'right'
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
    minHeight: 100,
    textAlignVertical: 'top'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  halfInput: {
    flex: 1
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  specialtyCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9F9F9'
  },
  selectedSpecialty: {
    borderColor: '#F5B800',
    backgroundColor: '#FFF8E1'
  },
  specialtyIcon: {
    fontSize: 24,
    marginBottom: 8
  },
  specialtyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4
  },
  selectedSpecialtyName: {
    color: '#F5B800'
  },
  specialtyDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  vehicleTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20
  },
  vehicleTypeCard: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9F9F9'
  },
  selectedVehicleType: {
    borderColor: '#F5B800',
    backgroundColor: '#FFF8E1'
  },
  vehicleTypeIcon: {
    fontSize: 20,
    marginBottom: 8
  },
  vehicleTypeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4
  },
  selectedVehicleTypeName: {
    color: '#F5B800'
  },
  vehicleTypeCapacity: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center'
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  featureCard: {
    flex: 1,
    minWidth: '30%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F9F9F9'
  },
  selectedFeature: {
    borderColor: '#F5B800',
    backgroundColor: '#FFF8E1'
  },
  featureIcon: {
    fontSize: 16,
    marginBottom: 4
  },
  featureName: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center'
  },
  selectedFeatureName: {
    color: '#F5B800',
    fontWeight: '600'
  },
  availabilityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  dayCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    backgroundColor: '#F9F9F9'
  },
  selectedDay: {
    borderColor: '#F5B800',
    backgroundColor: '#FFF8E1'
  },
  dayText: {
    fontSize: 12,
    color: '#333'
  },
  selectedDayText: {
    color: '#F5B800',
    fontWeight: '600'
  },
  serviceAreasContainer: {
    marginBottom: 20
  },
  serviceAreaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  serviceAreaText: {
    fontSize: 12,
    color: '#333',
    marginRight: 8
  },
  documentsContainer: {
    marginBottom: 20
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  documentName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    textAlign: 'right'
  },
  termsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16
  },
  termsText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right'
  },
  reviewSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'right'
  },
  reviewItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'right'
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5'
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8
  },
  backBtnText: {
    fontSize: 16,
    color: '#333'
  },
  nextBtn: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  disabledBtn: {
    backgroundColor: '#CCC'
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
