import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Heart, AlertTriangle, Shield } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

interface PersonalProfileData {
  blood_type: string;
  health_conditions: string[];
  health_notes: string;
  emergency_contacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
  saved_addresses: Array<{
    title: string;
    address: string;
    coordinates: [number, number];
  }>;
  payment_methods: Array<{
    type: string;
    details: any;
  }>;
}

const MedicalInfo = ({ info }: { info: { blood_type: string; health_conditions?: string[]; health_notes?: string } }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('profile.medicalInfo')}</Text>
      <View style={styles.infoItem}>
        <Heart size={20} color="#666" />
        <Text style={styles.infoText}>{t('profile.bloodType') + ': ' + (info.blood_type || '-')}</Text>
      </View>
      
      {info.health_conditions && info.health_conditions.length > 0 && (
        <View style={styles.infoItem}>
          <AlertTriangle size={20} color="#666" />
          <Text style={styles.infoText}>{info.health_conditions.join(', ')}</Text>
        </View>
      )}
      
      {info.health_notes && (
        <View style={styles.infoItem}>
          <Shield size={20} color="#666" />
          <Text style={styles.infoText}>{info.health_notes}</Text>
        </View>
      )}
    </View>
  );
};

const EmergencyContacts = ({ contacts }: { contacts: Array<{ name: string; phone: string; relationship: string }> }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('profile.emergencyContacts')}</Text>
      {contacts.map((contact, index) => (
        <View key={index} style={styles.contactCard}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactRelationship}>{contact.relationship}</Text>
          <Text style={styles.contactPhone}>{contact.phone}</Text>
        </View>
      ))}
    </View>
  );
};

export default function PersonalProfileSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<PersonalProfileData | null>(null);

  useEffect(() => {
    fetchPersonalProfile();
  }, []);

  const fetchPersonalProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_profiles')
        .select('blood_type, health_conditions, health_notes, emergency_contacts')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error fetching personal profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !profileData) return null;

  return (
    <View>
      <MedicalInfo info={profileData} />
      {profileData.emergency_contacts && (
        <EmergencyContacts contacts={profileData.emergency_contacts} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  contactCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#333',
  },
  contactRelationship: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  contactPhone: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
});
