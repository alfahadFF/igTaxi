import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/Colors';

interface SpecialDriverProfileSectionProps {
  userId: string;
}

const SpecialDriverProfileSection: React.FC<SpecialDriverProfileSectionProps> = ({ userId }) => {
  const [specialDriverData, setSpecialDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecialDriverData();
  }, [userId]);

  const fetchSpecialDriverData = async () => {
    try {
      const { data, error } = await supabase
        .from('special_driver_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching special driver data:', error);
      } else {
        setSpecialDriverData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>معلومات السائق المختص</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>نوع التخصص:</Text>
          <Text style={styles.value}>{specialDriverData?.specialization_type || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>رقم الرخصة المهنية:</Text>
          <Text style={styles.value}>{specialDriverData?.professional_license || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>سنوات الخبرة:</Text>
          <Text style={styles.value}>{specialDriverData?.years_of_experience || 0} سنة</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>تاريخ انتهاء الرخصة:</Text>
          <Text style={styles.value}>
            {specialDriverData?.license_expiry 
              ? new Date(specialDriverData.license_expiry).toLocaleDateString('ar-SA')
              : 'غير محدد'
            }
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>حالة التفعيل:</Text>
          <Text style={[styles.value, { color: specialDriverData?.is_active ? Colors.light.tint : '#FF6B6B' }]}>
            {specialDriverData?.is_active ? 'مفعل' : 'غير مفعل'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>متاح للعمل:</Text>
          <Text style={[styles.value, { color: specialDriverData?.available_for_work ? '#4CAF50' : '#FF9800' }]}>
            {specialDriverData?.available_for_work ? 'متاح' : 'غير متاح'}
          </Text>
        </View>

        {specialDriverData?.certifications && specialDriverData.certifications.length > 0 && (
          <View style={styles.certificationsContainer}>
            <Text style={styles.label}>الشهادات والتدريبات:</Text>
            {specialDriverData.certifications.map((cert: string, index: number) => (
              <View key={index} style={styles.certificationTag}>
                <Text style={styles.certificationText}>{cert}</Text>
              </View>
            ))}
          </View>
        )}

        {specialDriverData?.languages && specialDriverData.languages.length > 0 && (
          <View style={styles.certificationsContainer}>
            <Text style={styles.label}>اللغات:</Text>
            {specialDriverData.languages.map((lang: string, index: number) => (
              <View key={index} style={styles.languageTag}>
                <Text style={styles.certificationText}>{lang}</Text>
              </View>
            ))}
          </View>
        )}

        {specialDriverData?.equipment && specialDriverData.equipment.length > 0 && (
          <View style={styles.certificationsContainer}>
            <Text style={styles.label}>المعدات المتخصصة:</Text>
            {specialDriverData.equipment.map((eq: string, index: number) => (
              <View key={index} style={styles.equipmentTag}>
                <Text style={styles.certificationText}>{eq}</Text>
              </View>
            ))}
          </View>
        )}

        {specialDriverData?.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.label}>ملاحظات إضافية:</Text>
            <Text style={styles.notesText}>{specialDriverData.notes}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  section: {
    padding: 20,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  certificationsContainer: {
    marginTop: 15,
  },
  certificationTag: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  languageTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  equipmentTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  certificationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 5,
  },
});

export default SpecialDriverProfileSection;
