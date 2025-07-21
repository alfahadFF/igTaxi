import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Vibration,
  ScrollView,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MedicalEmergencyCard } from '@/types/medical-emergency';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Heart,
  Phone,
  User,
  AlertTriangle,
  Shield,
  Hospital,
  Droplet,
  Pill,
  Clock,
  MapPin,
  X,
  PhoneCall,
} from 'lucide-react-native';

interface DriverEmergencyButtonProps {
  passengerName?: string;
  passengerPhone?: string;
  onEmergencyTriggered?: () => void;
}

const DriverEmergencyButton: React.FC<DriverEmergencyButtonProps> = ({
  passengerName = 'الراكب',
  passengerPhone,
  onEmergencyTriggered,
}) => {
  const { theme } = useTheme();
  const [showMedicalCard, setShowMedicalCard] = useState(false);
  const [medicalCard, setMedicalCard] = useState<MedicalEmergencyCard | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadPassengerMedicalCard();
  }, []);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const loadPassengerMedicalCard = async () => {
    try {
      // In a real app, this would fetch the passenger's medical card from server
      // For now, we'll use local storage as a demo
      const saved = await AsyncStorage.getItem('medical_emergency_card');
      if (saved) {
        const card = JSON.parse(saved);
        card.dateOfBirth = new Date(card.dateOfBirth);
        card.lastUpdated = new Date(card.lastUpdated);
        setMedicalCard(card);
      }
    } catch (error) {
      console.error('Failed to load passenger medical card:', error);
    }
  };

  const handleEmergencyPress = () => {
    // Strong vibration to alert driver
    Vibration.vibrate([0, 200, 100, 200, 100, 200]);
    
    Alert.alert(
      '⚠️ حالة طوارئ صحية',
      `هل تحتاج لعرض البطاقة الصحية الطارئة للراكب "${passengerName}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'عرض البطاقة الصحية',
          onPress: () => {
            setShowMedicalCard(true);
            onEmergencyTriggered?.();
          },
        },
        {
          text: 'اتصال بالإسعاف',
          style: 'destructive',
          onPress: () => handleCallAmbulance(),
        },
      ]
    );
  };

  const handleCallAmbulance = () => {
    Alert.alert(
      'اتصال بالإسعاف',
      'سيتم الاتصال برقم الطوارئ 777',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'اتصال الآن',
          style: 'destructive',
          onPress: () => {
            Linking.openURL('tel:777');
          },
        },
      ]
    );
  };

  const handleCallEmergencyContact = (phone: string, name: string) => {
    Alert.alert(
      'اتصال بجهة الاتصال الطارئة',
      `اتصال بـ ${name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'اتصال',
          onPress: () => {
            Linking.openURL(`tel:${phone}`);
          },
        },
      ]
    );
  };

  const renderMedicalInfo = () => {
    if (!medicalCard) {
      return (
        <View style={styles.noCardContainer}>
          <AlertTriangle size={48} color={theme.colors.textSecondary} />
          <Text style={styles.noCardTitle}>لا توجد بطاقة صحية</Text>
          <Text style={styles.noCardDescription}>
            لم يقم الراكب بإعداد بطاقة صحية طارئة
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.cardContent}>
        {/* Critical Information Banner */}
        <View style={styles.criticalBanner}>
          <AlertTriangle size={20} color="#ffffff" />
          <Text style={styles.criticalText}>معلومات طبية طارئة</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>الاسم:</Text>
              <Text style={styles.infoValue}>{medicalCard.fullName || 'غير محدد'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>العمر:</Text>
              <Text style={styles.infoValue}>
                {new Date().getFullYear() - medicalCard.dateOfBirth.getFullYear()} سنة
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>فصيلة الدم:</Text>
              <View style={styles.bloodTypeContainer}>
                <Droplet size={16} color="#dc3545" />
                <Text style={[styles.infoValue, styles.bloodType]}>
                  {medicalCard.bloodType || 'غير محدد'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Medical Conditions */}
        {medicalCard.medicalConditions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heart size={18} color="#dc3545" />
              <Text style={styles.sectionTitle}>الحالات الصحية الحرجة</Text>
            </View>
            {medicalCard.medicalConditions.map((condition) => (
              <View key={condition.id} style={styles.conditionItem}>
                <View style={styles.conditionHeader}>
                  <Text style={styles.conditionName}>{condition.name}</Text>
                  <View style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(condition.severity) }
                  ]}>
                    <Text style={styles.severityText}>
                      {getSeverityLabel(condition.severity)}
                    </Text>
                  </View>
                </View>
                {condition.notes && (
                  <Text style={styles.conditionNotes}>{condition.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Current Medications */}
        {medicalCard.currentMedications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Pill size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>الأدوية الحالية</Text>
            </View>
            {medicalCard.currentMedications.map((medication) => (
              <View key={medication.id} style={styles.medicationItem}>
                <Text style={styles.medicationName}>{medication.name}</Text>
                <Text style={styles.medicationDetails}>
                  {medication.dosage} - {medication.frequency}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Allergies */}
        {medicalCard.allergies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={18} color="#dc3545" />
              <Text style={styles.sectionTitle}>الحساسية</Text>
            </View>
            <View style={styles.allergiesList}>
              {medicalCard.allergies.map((allergy, index) => (
                <View key={index} style={styles.allergyItem}>
                  <AlertTriangle size={12} color="#dc3545" />
                  <Text style={styles.allergyText}>{allergy}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Emergency Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Hospital size={18} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>معلومات الطوارئ</Text>
          </View>
          {medicalCard.preferredHospital && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>المستشفى المفضل:</Text>
              <Text style={styles.infoValue}>{medicalCard.preferredHospital}</Text>
            </View>
          )}
          {medicalCard.insuranceProvider && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>التأمين:</Text>
              <Text style={styles.infoValue}>
                {medicalCard.insuranceProvider}
                {medicalCard.insuranceNumber && ` (${medicalCard.insuranceNumber})`}
              </Text>
            </View>
          )}
          {medicalCard.specialInstructions && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsLabel}>تعليمات خاصة:</Text>
              <Text style={styles.instructionsText}>{medicalCard.specialInstructions}</Text>
            </View>
          )}
        </View>

        {/* Emergency Contacts */}
        {medicalCard.emergencyContacts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Phone size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>جهات الاتصال الطارئة</Text>
            </View>
            {medicalCard.emergencyContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.contactItem}
                onPress={() => handleCallEmergencyContact(contact.phone, contact.name)}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactRelation}>({contact.relationship})</Text>
                  <Text style={styles.contactPhone}>{contact.phone}</Text>
                </View>
                <PhoneCall size={20} color="#4CAF50" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'severe': return '#fd7e14';
      case 'moderate': return '#ffc107';
      case 'mild': return '#28a745';
      default: return theme.colors.border;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'حرجة';
      case 'severe': return 'شديدة';
      case 'moderate': return 'متوسطة';
      case 'mild': return 'بسيطة';
      default: return 'غير محدد';
    }
  };

  const styles = StyleSheet.create({
    emergencyButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#dc3545',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#dc3545',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 3,
      borderColor: '#ffffff',
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.background,
    },
    cardContent: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    criticalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#dc3545',
      padding: 16,
    },
    criticalText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    section: {
      backgroundColor: theme.colors.surface,
      marginTop: 12,
      padding: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginLeft: 8,
    },
    infoGrid: {
      gap: 8,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      minWidth: 80,
    },
    infoValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
      flex: 1,
    },
    bloodTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bloodType: {
      color: '#dc3545',
      fontWeight: 'bold',
      marginLeft: 4,
    },
    conditionItem: {
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    conditionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    conditionName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    severityText: {
      fontSize: 11,
      color: '#ffffff',
      fontWeight: '600',
    },
    conditionNotes: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    medicationItem: {
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    medicationName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    medicationDetails: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    allergiesList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    allergyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: '#fff5f5',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#ffcdd2',
    },
    allergyText: {
      fontSize: 12,
      color: '#dc3545',
      marginLeft: 4,
      fontWeight: '500',
    },
    instructionsContainer: {
      padding: 12,
      backgroundColor: '#e3f2fd',
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#2196f3',
    },
    instructionsLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1976d2',
      marginBottom: 4,
    },
    instructionsText: {
      fontSize: 13,
      color: '#1976d2',
      lineHeight: 18,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    contactInfo: {
      flex: 1,
    },
    contactName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    contactRelation: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    contactPhone: {
      fontSize: 13,
      color: '#4CAF50',
      fontWeight: '500',
    },
    noCardContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    noCardTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    noCardDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    emergencyActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    ambulanceButton: {
      backgroundColor: '#dc3545',
    },
    hospitalButton: {
      backgroundColor: '#4CAF50',
    },
    actionButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
  });

  return (
    <>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergencyPress}
          activeOpacity={0.8}
        >
          <Heart size={28} color="#ffffff" />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={showMedicalCard}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>البطاقة الصحية الطارئة</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMedicalCard(false)}
            >
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {renderMedicalInfo()}

          <View style={styles.emergencyActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.ambulanceButton]}
              onPress={handleCallAmbulance}
            >
              <Phone size={16} color="#ffffff" />
              <Text style={styles.actionButtonText}>إسعاف 777</Text>
            </TouchableOpacity>
            
            {medicalCard?.preferredHospital && (
              <TouchableOpacity
                style={[styles.actionButton, styles.hospitalButton]}
                onPress={() => {
                  // Navigate to hospital or call hospital
                  Alert.alert('توجه للمستشفى', `التوجه إلى ${medicalCard.preferredHospital}؟`);
                }}
              >
                <Hospital size={16} color="#ffffff" />
                <Text style={styles.actionButtonText}>المستشفى</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default DriverEmergencyButton;
