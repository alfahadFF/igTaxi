import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Car, Award, Star, Clock, Medal, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

interface DriverProfileSectionProps {
  userId: string;
}

const DriverProfileSection: React.FC<DriverProfileSectionProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [driverData, setDriverData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverData();
  }, [userId]);

  const fetchDriverData = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          ratings:driver_ratings(
            rating,
            comment,
            created_at,
            customer:profiles!driver_ratings_customer_id_fkey(full_name)
          ),
          complaints:driver_complaints(
            complaint_type,
            description,
            status,
            created_at
          ),
          loyalty:driver_loyalty_points(
            points,
            level
          ),
          points_history:driver_points_history(
            points_change,
            reason,
            created_at
          )
        `)
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching driver data:', error);
      } else if (data) {
        const ratings = data.ratings || [];
        const averageRating = ratings.length > 0
          ? ratings.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0) / ratings.length
          : 0;

        setDriverData({
          ...data,
          average_rating: averageRating,
          total_ratings: ratings.length,
          recent_ratings: ratings.slice(0, 5),
          active_complaints: data.complaints?.filter((c: any) => c.status === 'pending') || [],
          loyalty_info: data.loyalty?.[0] || { points: 0, level: 'bronze' },
          recent_points_history: data.points_history?.slice(0, 10) || []
        });
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

  if (!driverData) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>لا توجد بيانات سائق</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Vehicle Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Car size={20} color="#007AFF" />
          <Text style={styles.sectionTitle}>معلومات المركبة</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>الماركة:</Text>
          <Text style={styles.value}>{driverData?.vehicle_make || 'غير محدد'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>الموديل:</Text>
          <Text style={styles.value}>{driverData?.vehicle_model || 'غير محدد'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>السنة:</Text>
          <Text style={styles.value}>{driverData?.vehicle_year || 'غير محدد'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>اللون:</Text>
          <Text style={styles.value}>{driverData?.vehicle_color || 'غير محدد'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>رقم اللوحة:</Text>
          <Text style={styles.value}>{driverData?.license_plate || 'غير محدد'}</Text>
        </View>
      </View>

      {/* Driver Status */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Award size={20} color="#28A745" />
          <Text style={styles.sectionTitle}>حالة السائق</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>الحالة:</Text>
          <Text style={[styles.value, { color: driverData?.is_active ? '#28A745' : '#DC3545' }]}>
            {driverData?.is_active ? 'مفعل' : 'غير مفعل'}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>متاح للعمل:</Text>
          <Text style={[styles.value, { color: driverData?.available ? '#28A745' : '#FFC107' }]}>
            {driverData?.available ? 'متاح' : 'غير متاح'}
          </Text>
        </View>
      </View>

      {/* Ratings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Star size={20} color="#FFD700" />
          <Text style={styles.sectionTitle}>التقييمات</Text>
        </View>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingScore}>{driverData?.average_rating?.toFixed(1) || '0.0'}</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                color={star <= (driverData?.average_rating || 0) ? '#FFD700' : '#E0E0E0'}
                fill={star <= (driverData?.average_rating || 0) ? '#FFD700' : 'transparent'}
              />
            ))}
          </View>
          <Text style={styles.ratingCount}>({driverData?.total_ratings || 0} تقييم)</Text>
        </View>
      </View>

      {/* Loyalty Points */}
      {driverData?.loyalty_info && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Medal size={20} color="#FF6B35" />
            <Text style={styles.sectionTitle}>نقاط الولاء</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>النقاط:</Text>
            <Text style={styles.value}>{driverData.loyalty_info.points || 0}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>المستوى:</Text>
            <Text style={styles.value}>{driverData.loyalty_info.level || 'برونزي'}</Text>
          </View>
        </View>
      )}

      {/* Active Complaints */}
      {driverData?.active_complaints && driverData.active_complaints.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertCircle size={20} color="#DC3545" />
            <Text style={styles.sectionTitle}>الشكاوى النشطة</Text>
          </View>
          
          {driverData.active_complaints.map((complaint: any, index: number) => (
            <View key={index} style={styles.complaintItem}>
              <Text style={styles.complaintType}>{complaint.complaint_type}</Text>
              <Text style={styles.complaintDesc}>{complaint.description}</Text>
              <Text style={styles.complaintDate}>
                {new Date(complaint.created_at).toLocaleDateString('ar-SA')}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  noDataText: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
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
  ratingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  ratingScore: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
  },
  complaintItem: {
    padding: 12,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  complaintType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC3545',
    marginBottom: 4,
  },
  complaintDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  complaintDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default DriverProfileSection;
