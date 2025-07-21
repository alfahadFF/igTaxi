import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/Colors';

interface BusinessProfileSectionProps {
  userId: string;
  businessType: string;
}

const BusinessProfileSection: React.FC<BusinessProfileSectionProps> = ({ userId, businessType }) => {
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusinessData();
  }, [userId]);

  const fetchBusinessData = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching business data:', error);
      } else {
        setBusinessData(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBusinessTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'business_restaurant': 'مطعم',
      'business_cafe': 'مقهى',
      'business_retail': 'متجر تجاري',
      'business_fuel': 'محطة وقود',
      'business_parking': 'موقف سيارات',
      'business_pharmacy': 'صيدلية'
    };
    return typeMap[type] || 'نشاط تجاري';
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
        <Text style={styles.sectionTitle}>معلومات {getBusinessTypeLabel(businessType)}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>اسم النشاط التجاري:</Text>
          <Text style={styles.value}>{businessData?.business_name || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>السجل التجاري:</Text>
          <Text style={styles.value}>{businessData?.commercial_register || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>الرقم الضريبي:</Text>
          <Text style={styles.value}>{businessData?.tax_number || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>العنوان:</Text>
          <Text style={styles.value}>{businessData?.address || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>المدينة:</Text>
          <Text style={styles.value}>{businessData?.city || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>رقم الهاتف:</Text>
          <Text style={styles.value}>{businessData?.phone || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>البريد الإلكتروني:</Text>
          <Text style={styles.value}>{businessData?.email || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>الموقع الإلكتروني:</Text>
          <Text style={styles.value}>{businessData?.website || 'غير متوفر'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>ساعات العمل:</Text>
          <Text style={styles.value}>{businessData?.working_hours || 'غير محدد'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>حالة النشاط:</Text>
          <Text style={[styles.value, { color: businessData?.is_active ? Colors.light.tint : '#FF6B6B' }]}>
            {businessData?.is_active ? 'مفعل' : 'غير مفعل'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>يقبل التوصيل:</Text>
          <Text style={[styles.value, { color: businessData?.delivery_available ? '#4CAF50' : '#FF9800' }]}>
            {businessData?.delivery_available ? 'نعم' : 'لا'}
          </Text>
        </View>

        {businessData?.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.label}>وصف النشاط:</Text>
            <Text style={styles.descriptionText}>{businessData.description}</Text>
          </View>
        )}

        {businessData?.services && businessData.services.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.label}>الخدمات المتاحة:</Text>
            <View style={styles.tagsContainer}>
              {businessData.services.map((service: string, index: number) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.tagText}>{service}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {businessData?.specialties && businessData.specialties.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.label}>التخصصات:</Text>
            <View style={styles.tagsContainer}>
              {businessData.specialties.map((specialty: string, index: number) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.tagText}>{specialty}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {businessData?.payment_methods && businessData.payment_methods.length > 0 && (
          <View style={styles.servicesContainer}>
            <Text style={styles.label}>وسائل الدفع المقبولة:</Text>
            <View style={styles.tagsContainer}>
              {businessData.payment_methods.map((method: string, index: number) => (
                <View key={index} style={styles.paymentTag}>
                  <Text style={styles.tagText}>{method}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {businessData?.license_expiry && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>تاريخ انتهاء الترخيص:</Text>
            <Text style={styles.value}>
              {new Date(businessData.license_expiry).toLocaleDateString('ar-SA')}
            </Text>
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
  descriptionContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 5,
  },
  servicesContainer: {
    marginTop: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  serviceTag: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyTag: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  paymentTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BusinessProfileSection;
