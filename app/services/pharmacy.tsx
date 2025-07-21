import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import PrescriptionForm from '../../components/pharmacy/PrescriptionForm';
import PrescriptionDetails from '../../components/pharmacy/PrescriptionDetails';
import MyPrescriptionOrders from '../../components/pharmacy/MyPrescriptionOrders';

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

interface Pharmacy {
  id: number;
  name: string;
  description: string;
  location: string;
  image_url: string;
  contact_phone: string;
  is_24_hours: boolean;
  accepts_insurance: boolean;
  delivery_fee: number;
  min_order_amount: number;
  rating: number;
  total_reviews: number;
  operating_hours: { start: string; end: string };
}

type Screen = 'main' | 'pharmacies' | 'form' | 'orders' | 'details';

export default function PharmacyScreen() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // البيانات التجريبية للصيدليات
  const samplePharmacies: Pharmacy[] = [
    {
      id: 1,
      name: 'صيدلية النهدي',
      description: 'صيدلية متكاملة تقدم جميع أنواع الأدوية والمنتجات الصحية',
      location: 'شارع الشيخ زايد، دبي',
      image_url: 'https://images.pexels.com/photos/305568/pexels-photo-305568.jpeg',
      contact_phone: '+971501234567',
      is_24_hours: false,
      accepts_insurance: true,
      delivery_fee: 15.00,
      min_order_amount: 50.00,
      rating: 4.5,
      total_reviews: 150,
      operating_hours: { start: '08:00', end: '22:00' }
    },
    {
      id: 2,
      name: 'صيدلية الدواء',
      description: 'صيدلية حديثة مع خدمة 24 ساعة',
      location: 'شارع الوصل، دبي',
      image_url: 'https://images.pexels.com/photos/356054/pexels-photo-356054.jpeg',
      contact_phone: '+971502345678',
      is_24_hours: true,
      accepts_insurance: true,
      delivery_fee: 12.00,
      min_order_amount: 30.00,
      rating: 4.3,
      total_reviews: 89,
      operating_hours: { start: '00:00', end: '23:59' }
    },
    {
      id: 3,
      name: 'صيدلية الصحة',
      description: 'صيدلية متخصصة في الأدوية المزمنة',
      location: 'منطقة الخليج التجاري، دبي',
      image_url: 'https://images.pexels.com/photos/263337/pexels-photo-263337.jpeg',
      contact_phone: '+971503456789',
      is_24_hours: false,
      accepts_insurance: false,
      delivery_fee: 10.00,
      min_order_amount: 25.00,
      rating: 4.7,
      total_reviews: 203,
      operating_hours: { start: '09:00', end: '21:00' }
    }
  ];

  const handleSelectPharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setCurrentScreen('form');
  };

  const handleOrderSubmitted = (orderId: number) => {
    setSelectedOrderId(orderId);
    setCurrentScreen('details');
  };

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setCurrentScreen('details');
  };

  const handleBack = () => {
    if (currentScreen === 'form' || currentScreen === 'pharmacies') {
      setCurrentScreen('main');
    } else if (currentScreen === 'details') {
      setCurrentScreen('orders');
    } else {
      setCurrentScreen('main');
    }
  };

  const renderPharmacyCard = (pharmacy: Pharmacy) => (
    <TouchableOpacity
      key={pharmacy.id}
      style={styles.pharmacyCard}
      onPress={() => handleSelectPharmacy(pharmacy)}
      activeOpacity={0.7}
    >
      <View style={styles.pharmacyHeader}>
        <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.rating}>{pharmacy.rating}</Text>
        </View>
      </View>
      
      <Text style={styles.pharmacyDescription} numberOfLines={2}>
        {pharmacy.description}
      </Text>
      
      <View style={styles.pharmacyDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="location" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {pharmacy.location}
          </Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="bicycle" size={14} color={colors.primary} />
          <Text style={styles.detailText}>
            {pharmacy.delivery_fee === 0 ? 'مجاني' : `${pharmacy.delivery_fee} درهم`}
          </Text>
        </View>
      </View>

      <View style={styles.pharmacyFeatures}>
        {pharmacy.is_24_hours && (
          <View style={styles.featureTag}>
            <Ionicons name="time" size={12} color={colors.primary} />
            <Text style={styles.featureText}>24 ساعة</Text>
          </View>
        )}
        
        {pharmacy.accepts_insurance && (
          <View style={styles.featureTag}>
            <Ionicons name="card" size={12} color={colors.primary} />
            <Text style={styles.featureText}>تأمين</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMainScreen = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>الصيدليات</Text>
        <Text style={styles.subtitle}>
          أرسل صورة الوصفة الطبية واحصل على الأدوية مع التوصيل
        </Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionCard, styles.primaryAction]}
          onPress={() => setCurrentScreen('pharmacies')}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="camera" size={32} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>إرسال وصفة جديدة</Text>
          <Text style={styles.actionSubtitle}>
            اختر صيدلية وأرسل صورة الوصفة
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.secondaryAction]}
          onPress={() => setCurrentScreen('orders')}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: colors.secondary }]}>
            <Ionicons name="document-text" size={32} color="#fff" />
          </View>
          <Text style={styles.actionTitle}>طلباتي</Text>
          <Text style={styles.actionSubtitle}>
            تتبع حالة طلبات الوصفات
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الصيدليات المقترحة</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('pharmacies')}>
            <Text style={styles.seeAllText}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {samplePharmacies.slice(0, 2).map(renderPharmacyCard)}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>كيف يعمل النظام؟</Text>
        
        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>اختر الصيدلية</Text>
            <Text style={styles.stepDescription}>
              اختر الصيدلية المناسبة من القائمة المتاحة
            </Text>
          </View>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>أرسل صورة الوصفة</Text>
            <Text style={styles.stepDescription}>
              التقط صورة واضحة للوصفة الطبية وأرسلها للصيدلية
            </Text>
          </View>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>احصل على التسعير</Text>
            <Text style={styles.stepDescription}>
              سيقوم الصيدلي بمراجعة الوصفة وإرسال الأسعار والبدائل
            </Text>
          </View>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>وافق واستلم</Text>
            <Text style={styles.stepDescription}>
              وافق على العرض وستصلك الأدوية عبر سائقي التطبيق
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderPharmaciesList = () => (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>اختر الصيدلية</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.pharmaciesList} showsVerticalScrollIndicator={false}>
        <View style={styles.listPadding}>
          {samplePharmacies.map(renderPharmacyCard)}
        </View>
      </ScrollView>
    </View>
  );

  // عرض الشاشات المختلفة
  switch (currentScreen) {
    case 'form':
      return selectedPharmacy ? (
        <PrescriptionForm
          pharmacy={selectedPharmacy}
          onOrderSubmitted={handleOrderSubmitted}
          onBack={handleBack}
        />
      ) : null;

    case 'orders':
      return (
        <View style={styles.container}>
          <View style={styles.screenHeader}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>طلبات الوصفات</Text>
            <View style={styles.placeholder} />
          </View>
          <MyPrescriptionOrders onSelectOrder={handleSelectOrder} />
        </View>
      );

    case 'details':
      return selectedOrderId ? (
        <PrescriptionDetails
          orderId={selectedOrderId}
          onBack={handleBack}
        />
      ) : null;

    case 'pharmacies':
      return renderPharmaciesList();

    default:
      return renderMainScreen();
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  quickActions: {
    padding: 20,
    gap: 15,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  secondaryAction: {
    backgroundColor: '#fff',
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 18,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  pharmacyCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pharmacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 3,
  },
  pharmacyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  pharmacyDetails: {
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  pharmacyFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureText: {
    fontSize: 10,
    color: colors.primary,
    marginLeft: 3,
    fontWeight: '500',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 15,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 34,
  },
  pharmaciesList: {
    flex: 1,
  },
  listPadding: {
    padding: 20,
  },
  bottomPadding: {
    height: 30,
  },
});
