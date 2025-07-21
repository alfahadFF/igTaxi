import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicalEmergencyCard, MedicalCondition, Medication } from '@/types/medical-emergency';
import {
  Heart,
  Shield,
  Plus,
  Edit,
  Trash2,
  User,
  Phone,
  Calendar,
  Droplet,
  AlertTriangle,
  Pill,
  Hospital,
  Save,
  Eye,
  EyeOff,
  X,
  Check,
} from 'lucide-react-native';

const MedicalCardManager: React.FC = () => {
  const { theme } = useTheme();
  const [medicalCard, setMedicalCard] = useState<MedicalEmergencyCard | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);

  useEffect(() => {
    loadMedicalCard();
  }, []);

  const loadMedicalCard = async () => {
    try {
      const saved = await AsyncStorage.getItem('medical_emergency_card');
      if (saved) {
        const card = JSON.parse(saved);
        card.dateOfBirth = new Date(card.dateOfBirth);
        card.lastUpdated = new Date(card.lastUpdated);
        setMedicalCard(card);
      } else {
        // Initialize empty card
        const newCard: MedicalEmergencyCard = {
          fullName: '',
          dateOfBirth: new Date(),
          bloodType: '',
          nationalId: '',
          medicalConditions: [],
          currentMedications: [],
          allergies: [],
          emergencyContacts: [],
          language: 'ar',
          lastUpdated: new Date(),
          isVisible: false,
        };
        setMedicalCard(newCard);
      }
    } catch (error) {
      console.error('Failed to load medical card:', error);
    }
  };

  const saveMedicalCard = async (card: MedicalEmergencyCard) => {
    try {
      const updatedCard = { ...card, lastUpdated: new Date() };
      await AsyncStorage.setItem('medical_emergency_card', JSON.stringify(updatedCard));
      setMedicalCard(updatedCard);
      Alert.alert('تم الحفظ', 'تم حفظ البطاقة الصحية بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ البطاقة الصحية');
    }
  };

  const toggleCardVisibility = async () => {
    if (!medicalCard) return;
    
    Alert.alert(
      'تغيير إعدادات الخصوصية',
      medicalCard.isVisible 
        ? 'إخفاء البطاقة الصحية؟ لن تظهر إلا في حالات الطوارئ فقط.'
        : 'إظهار البطاقة الصحية؟ ستكون مرئية للسائقين أثناء الرحلات.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: medicalCard.isVisible ? 'إخفاء' : 'إظهار',
          onPress: () => {
            const updatedCard = { ...medicalCard, isVisible: !medicalCard.isVisible };
            saveMedicalCard(updatedCard);
          },
        },
      ]
    );
  };

  const renderPersonalInfo = () => {
    if (!medicalCard) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <User size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingSection('personal');
              setShowEditModal(true);
            }}
          >
            <Edit size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>الاسم الكامل</Text>
            <Text style={styles.infoValue}>{medicalCard.fullName || 'غير محدد'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>تاريخ الميلاد</Text>
            <Text style={styles.infoValue}>
              {medicalCard.dateOfBirth.toLocaleDateString('ar')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>فصيلة الدم</Text>
            <View style={styles.bloodTypeContainer}>
              <Droplet size={16} color="#dc3545" />
              <Text style={[styles.infoValue, styles.bloodType]}>
                {medicalCard.bloodType || 'غير محدد'}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>رقم الهوية</Text>
            <Text style={styles.infoValue}>{medicalCard.nationalId || 'غير محدد'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderMedicalConditions = () => {
    if (!medicalCard) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Heart size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>الحالات الصحية</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingSection('conditions');
              setShowEditModal(true);
            }}
          >
            <Plus size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {medicalCard.medicalConditions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>لا توجد حالات صحية مسجلة</Text>
          </View>
        ) : (
          medicalCard.medicalConditions.map((condition) => (
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
              {condition.medications.length > 0 && (
                <Text style={styles.conditionMeds}>
                  الأدوية: {condition.medications.join(', ')}
                </Text>
              )}
              {condition.notes && (
                <Text style={styles.conditionNotes}>{condition.notes}</Text>
              )}
            </View>
          ))
        )}
      </View>
    );
  };

  const renderMedications = () => {
    if (!medicalCard) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Pill size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>الأدوية الحالية</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingSection('medications');
              setShowEditModal(true);
            }}
          >
            <Plus size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {medicalCard.currentMedications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>لا توجد أدوية مسجلة</Text>
          </View>
        ) : (
          medicalCard.currentMedications.map((medication) => (
            <View key={medication.id} style={styles.medicationItem}>
              <Text style={styles.medicationName}>{medication.name}</Text>
              <Text style={styles.medicationDosage}>
                {medication.dosage} - {medication.frequency}
              </Text>
              <Text style={styles.medicationPurpose}>{medication.purpose}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderAllergies = () => {
    if (!medicalCard) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AlertTriangle size={20} color="#dc3545" />
          <Text style={styles.sectionTitle}>الحساسية</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingSection('allergies');
              setShowEditModal(true);
            }}
          >
            <Plus size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {medicalCard.allergies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>لا توجد حساسية مسجلة</Text>
          </View>
        ) : (
          <View style={styles.allergiesList}>
            {medicalCard.allergies.map((allergy, index) => (
              <View key={index} style={styles.allergyItem}>
                <AlertTriangle size={14} color="#dc3545" />
                <Text style={styles.allergyText}>{allergy}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmergencyInfo = () => {
    if (!medicalCard) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Shield size={20} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>معلومات الطوارئ</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => {
              setEditingSection('emergency');
              setShowEditModal(true);
            }}
          >
            <Edit size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>المستشفى المفضل</Text>
            <Text style={styles.infoValue}>{medicalCard.preferredHospital || 'غير محدد'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>شركة التأمين</Text>
            <Text style={styles.infoValue}>{medicalCard.insuranceProvider || 'غير محدد'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>رقم التأمين</Text>
            <Text style={styles.infoValue}>{medicalCard.insuranceNumber || 'غير محدد'}</Text>
          </View>

          {medicalCard.specialInstructions && (
            <View style={[styles.infoItem, styles.fullWidth]}>
              <Text style={styles.infoLabel}>تعليمات خاصة</Text>
              <Text style={styles.infoValue}>{medicalCard.specialInstructions}</Text>
            </View>
          )}
        </View>
      </View>
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
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    visibilityToggle: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    visibilityStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: medicalCard?.isVisible ? '#e8f5e8' : '#fff3cd',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginTop: 8,
    },
    visibilityText: {
      fontSize: 12,
      marginLeft: 6,
      color: medicalCard?.isVisible ? '#28a745' : '#856404',
    },
    scrollContent: {
      paddingBottom: 20,
    },
    section: {
      backgroundColor: theme.colors.surface,
      marginTop: 12,
      paddingVertical: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginLeft: 12,
      flex: 1,
    },
    editButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    infoGrid: {
      paddingHorizontal: 20,
    },
    infoItem: {
      marginBottom: 16,
    },
    fullWidth: {
      width: '100%',
    },
    infoLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      fontWeight: '600',
    },
    infoValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    bloodTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bloodType: {
      marginLeft: 6,
      color: '#dc3545',
      fontWeight: 'bold',
    },
    emptyState: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    conditionItem: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    conditionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    conditionName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    severityText: {
      fontSize: 11,
      color: '#ffffff',
      fontWeight: '600',
    },
    conditionMeds: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    conditionNotes: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    medicationItem: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    medicationName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    medicationDosage: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    medicationPurpose: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    allergiesList: {
      paddingHorizontal: 20,
    },
    allergyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: '#fff5f5',
      borderRadius: 8,
      marginBottom: 8,
    },
    allergyText: {
      fontSize: 14,
      color: '#dc3545',
      marginLeft: 8,
      fontWeight: '500',
    },
  });

  if (!medicalCard) {
    return (
      <View style={styles.container}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>البطاقة الصحية الطارئة</Text>
          <TouchableOpacity style={styles.visibilityToggle} onPress={toggleCardVisibility}>
            {medicalCard.isVisible ? (
              <Eye size={20} color={theme.colors.primary} />
            ) : (
              <EyeOff size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          تحتوي على معلوماتك الصحية المهمة للاستخدام في حالات الطوارئ
        </Text>
        <View style={styles.visibilityStatus}>
          {medicalCard.isVisible ? (
            <Eye size={14} color="#28a745" />
          ) : (
            <EyeOff size={14} color="#856404" />
          )}
          <Text style={styles.visibilityText}>
            {medicalCard.isVisible 
              ? 'مرئية للسائقين أثناء الرحلات' 
              : 'مخفية - تظهر في الطوارئ فقط'
            }
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
        {renderPersonalInfo()}
        {renderMedicalConditions()}
        {renderMedications()}
        {renderAllergies()}
        {renderEmergencyInfo()}
      </ScrollView>
    </View>
  );
};

export default MedicalCardManager;
