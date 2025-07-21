import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafety } from '@/contexts/SafetyContext';
import { EmergencyContact } from '@/contexts/SafetyContext';
import {
  Plus,
  Phone,
  Edit,
  Trash2,
  User,
  Heart,
  Shield,
  Users,
  MessageCircle,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react-native';

const EmergencyContactsManager: React.FC = () => {
  const { theme } = useTheme();
  const { emergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact } = useSafety();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: 'family' as EmergencyContact['relationship'],
    isPrimary: false,
  });

  const relationshipLabels = {
    family: 'عائلة',
    friend: 'صديق',
    colleague: 'زميل',
    medical: 'طبي',
    other: 'أخرى',
  };

  const relationshipIcons = {
    family: Heart,
    friend: Users,
    colleague: User,
    medical: Shield,
    other: User,
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      relationship: 'family',
      isPrimary: false,
    });
    setEditingContact(null);
  };

  const handleAddContact = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      isPrimary: contact.isPrimary,
    });
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const handleSaveContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('خطأ', 'يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(formData.phone)) {
      Alert.alert('خطأ', 'يرجى إدخال رقم هاتف صحيح');
      return;
    }

    try {
      if (editingContact) {
        await updateEmergencyContact(editingContact.id, formData);
      } else {
        await addEmergencyContact(formData);
      }
      
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      Alert.alert('خطأ', 'فشل في حفظ جهة الاتصال');
    }
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'حذف جهة الاتصال',
      `هل أنت متأكد من حذف "${contact.name}"؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => removeEmergencyContact(contact.id),
        },
      ]
    );
  };

  const handleCallContact = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleMessageContact = (phoneNumber: string) => {
    Linking.openURL(`sms:${phoneNumber}`);
  };

  const renderContactItem = (contact: EmergencyContact) => {
    const IconComponent = relationshipIcons[contact.relationship as keyof typeof relationshipIcons];
    
    return (
      <View key={contact.id} style={styles.contactItem}>
        <View style={styles.contactHeader}>
          <View style={styles.contactInfo}>
            <View style={styles.contactMainInfo}>
              <IconComponent size={20} color={theme.colors.primary} />
              <Text style={styles.contactName}>{contact.name}</Text>
              {contact.isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>أساسي</Text>
                </View>
              )}
            </View>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
            <Text style={styles.contactRelationship}>
              {relationshipLabels[contact.relationship as keyof typeof relationshipLabels]}
            </Text>
          </View>
          
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditContact(contact)}
            >
              <Edit size={16} color={theme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteContact(contact)}
            >
              <Trash2 size={16} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.contactFooter}>
          <TouchableOpacity
            style={styles.contactActionButton}
            onPress={() => handleCallContact(contact.phone)}
          >
            <Phone size={16} color="#4CAF50" />
            <Text style={[styles.contactActionText, { color: '#4CAF50' }]}>اتصال</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.contactActionButton}
            onPress={() => handleMessageContact(contact.phone)}
          >
            <MessageCircle size={16} color={theme.colors.primary} />
            <Text style={[styles.contactActionText, { color: theme.colors.primary }]}>رسالة</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAddEditModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingContact ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال جديدة'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>الاسم *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="أدخل الاسم الكامل"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>رقم الهاتف *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+966 50 123 4567"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>العلاقة</Text>
              <View style={styles.relationshipGrid}>
                {Object.entries(relationshipLabels).map(([key, label]) => {
                  const IconComponent = relationshipIcons[key as keyof typeof relationshipIcons];
                  const isSelected = formData.relationship === key;
                  
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.relationshipOption,
                        isSelected && styles.relationshipOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, relationship: key as any })}
                    >
                      <IconComponent 
                        size={20} 
                        color={isSelected ? '#ffffff' : theme.colors.text} 
                      />
                      <Text style={[
                        styles.relationshipOptionText,
                        isSelected && styles.relationshipOptionTextSelected,
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.primaryContactToggle}
                onPress={() => setFormData({ ...formData, isPrimary: !formData.isPrimary })}
              >
                <View style={[
                  styles.checkbox,
                  formData.isPrimary && styles.checkboxChecked,
                ]}>
                  {formData.isPrimary && <Check size={16} color="#ffffff" />}
                </View>
                <Text style={styles.primaryContactText}>جهة اتصال أساسية</Text>
              </TouchableOpacity>
              <Text style={styles.primaryContactDescription}>
                جهات الاتصال الأساسية يتم إشعارها أولاً في حالات الطوارئ
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <Text style={[styles.modalButtonText, styles.cancelButtonText]}>إلغاء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSaveContact}
            >
              <Text style={[styles.modalButtonText, styles.saveButtonText]}>
                {editingContact ? 'تحديث' : 'إضافة'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    addButtonText: {
      color: '#ffffff',
      fontWeight: '600',
      marginLeft: 4,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },
    contactsList: {
      flex: 1,
      padding: 16,
    },
    contactItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    contactHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    contactInfo: {
      flex: 1,
    },
    contactMainInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    contactName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginLeft: 8,
      flex: 1,
    },
    primaryBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    primaryBadgeText: {
      fontSize: 12,
      color: '#ffffff',
      fontWeight: '600',
    },
    contactPhone: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    contactRelationship: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    contactActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    editButton: {
      backgroundColor: theme.colors.background,
    },
    deleteButton: {
      backgroundColor: '#ffe6e6',
    },
    contactFooter: {
      flexDirection: 'row',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 16,
    },
    contactActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
    },
    contactActionText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    modalForm: {
      flex: 1,
      padding: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    formLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    formInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
    },
    relationshipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    relationshipOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      minWidth: '45%',
    },
    relationshipOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    relationshipOptionText: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: 4,
    },
    relationshipOptionTextSelected: {
      color: '#ffffff',
    },
    primaryContactToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    primaryContactText: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '600',
    },
    primaryContactDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    modalFooter: {
      flexDirection: 'row',
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    saveButtonText: {
      color: '#ffffff',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>جهات الاتصال الطارئة</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>إضافة</Text>
        </TouchableOpacity>
      </View>

      {emergencyContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyStateIcon}>
            <AlertTriangle size={48} color={theme.colors.textSecondary} />
          </View>
          <Text style={styles.emptyStateTitle}>لا توجد جهات اتصال طارئة</Text>
          <Text style={styles.emptyStateDescription}>
            أضف جهات الاتصال الطارئة التي تريد إشعارها في حالات الطوارئ.
            يمكن إضافة أفراد العائلة والأصدقاء والجهات الطبية.
          </Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddContact}>
            <Plus size={20} color="#ffffff" />
            <Text style={styles.addButtonText}>إضافة جهة اتصال</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.contactsList}>
          {emergencyContacts.map(renderContactItem)}
        </ScrollView>
      )}

      {renderAddEditModal()}
    </View>
  );
};

export default EmergencyContactsManager;
