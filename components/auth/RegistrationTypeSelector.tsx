import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { 
  Car, 
  Truck, 
  CalendarClock,
  Store,
  UserPlus,
  X
} from 'lucide-react-native';

interface RegistrationTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  source?: 'login' | 'home'; // لتمييز مصدر الاستدعاء
}

export default function RegistrationTypeSelector({ 
  visible, 
  onClose, 
  source = 'login' 
}: RegistrationTypeSelectorProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const registrationOptions = [
    {
      id: 'personal',
      name: t('home.registerOptions.personal'),
      description: 'للعملاء الراغبين في استخدام خدمات التاكسي',
      icon: <UserPlus size={24} color="#fff" />,
      route: '/auth/register',
      color: '#34495e',
    },
    {
      id: 'driver',
      name: t('home.registerOptions.driver'),
      description: 'للسائقين الراغبين في العمل كسائق تاكسي',
      icon: <Car size={24} color="#fff" />,
      route: '/auth/driver-register',
      color: '#3498db',
    },
    {
      id: 'event-driver',
      name: 'سائق مناسبات',
      description: 'للسائقين المتخصصين في المناسبات والأحداث',
      icon: <CalendarClock size={24} color="#fff" />,
      route: '/auth/event-driver-register',
      color: '#e67e22',
    },
    {
      id: 'transporter',
      name: t('home.registerOptions.transporter'),
      description: 'لأصحاب شاحنات النقل والتوصيل',
      icon: <Truck size={24} color="#fff" />,
      route: '/auth/transporter-register',
      color: '#2ecc71',
    },
    {
      id: 'business',
      name: t('home.registerOptions.business'),
      description: 'للشركات والمؤسسات التجارية (مطاعم، صيدليات، محطات وقود، إلخ)',
      icon: <Store size={24} color="#fff" />,
      route: '/auth/business-register',
      color: '#9b59b6',
    }
  ];

  const handleOptionPress = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {source === 'login' ? 'اختر نوع التسجيل' : t('home.registerOptions.title')}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            اختر النوع المناسب لك لإنشاء حساب جديد
          </Text>

          <View style={styles.optionsContainer}>
            {registrationOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.registrationOption, { backgroundColor: option.color }]}
                onPress={() => handleOptionPress(option.route)}
              >
                <View style={styles.optionLeft}>
                  {option.icon}
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{option.name}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </View>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>←</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* زر الإلغاء كخيار أخير */}
            <TouchableOpacity
              style={styles.cancelOptionButton}
              onPress={onClose}
            >
              <View style={styles.cancelOptionContent}>
                <X size={24} color="#666" />
                <Text style={styles.cancelOptionText}>إلغاء</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    maxHeight: '70%',
  },
  registrationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#fff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  arrow: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  cancelOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelOptionText: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#666',
    marginLeft: 12,
  },
});
