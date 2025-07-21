import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/Colors';

interface TransporterProfileSectionProps {
  userId: string;
}

const TransporterProfileSection: React.FC<TransporterProfileSectionProps> = ({ userId }) => {
  const [transporterData, setTransporterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransporterData();
  }, [userId]);

  const fetchTransporterData = async () => {
    try {
      const { data, error } = await supabase
        .from('transporter_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching transporter data:', error);
      } else {
        setTransporterData(data);
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
        <Text style={styles.sectionTitle}>معلومات النقل</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>نوع المركبة:</Text>
          <Text style={styles.value}>{transporterData?.vehicle_type || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>رقم المركبة:</Text>
          <Text style={styles.value}>{transporterData?.vehicle_number || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>الحمولة القصوى:</Text>
          <Text style={styles.value}>{transporterData?.max_capacity || 'غير محدد'} كيلو</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>سنة الصنع:</Text>
          <Text style={styles.value}>{transporterData?.manufacturing_year || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>رقم الرخصة:</Text>
          <Text style={styles.value}>{transporterData?.license_number || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>حالة التفعيل:</Text>
          <Text style={[styles.value, { color: transporterData?.is_active ? Colors.light.tint : '#FF6B6B' }]}>
            {transporterData?.is_active ? 'مفعل' : 'غير مفعل'}
          </Text>
        </View>

        {transporterData?.services && transporterData.services.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.label}>الخدمات المتاحة:</Text>
            {transporterData.services.map((service: string, index: number) => (
              <View key={index} style={styles.serviceTag}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        )}

        {transporterData?.specializations && transporterData.specializations.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.label}>التخصصات:</Text>
            {transporterData.specializations.map((spec: string, index: number) => (
              <View key={index} style={styles.specializationTag}>
                <Text style={styles.serviceText}>{spec}</Text>
              </View>
            ))}
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
  servicesContainer: {
    marginTop: 15,
  },
  serviceTag: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  specializationTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  serviceText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TransporterProfileSection;
