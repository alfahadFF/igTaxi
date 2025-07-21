import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Linking, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Header from '@/components/layout/Header';
import EditProfile from '@/components/profile/EditProfile';
import PersonalProfileSection from '@/components/profile/PersonalProfileSection';
import DriverProfileSection from '@/components/profile/DriverProfileSection';
import TransporterProfileSection from '@/components/profile/TransporterProfileSection';
import SpecialDriverProfileSection from '@/components/profile/SpecialDriverProfileSection';
import BusinessProfileSection from '@/components/profile/BusinessProfileSection';
import { ChevronRight, User, Bell, HelpCircle, Globe, LogOut, Shield, Phone } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/utils/supabase';

type ProfileOption = {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: string | number;
  rightElement?: React.ReactNode;
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profileData, setProfileData] = useState<{
    id: string;
    full_name: string;
    phone: string;
    verified: boolean;
    type: string;
    additional_data: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace('/auth/login');
    } else {
      fetchProfileData();
    }
  }, [user, authLoading, router]);

  const fetchProfileData = async () => {
    if (!user) return;
    try {
      // 1. جلب البيانات الأساسية من جدول profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      let additionalData = null;

      // 2. جلب البيانات الإضافية حسب نوع الحساب
      switch (profileData.type) {
        case 'personal':
          const { data: personalData, error: personalError } = await supabase
            .from('personal_profiles')
            .select('avatar_url, blood_type, health_conditions, health_notes, emergency_contacts')
            .eq('id', user.id)
            .single();

          if (!personalError && personalData) {
            additionalData = personalData;
          }
          break;

        case 'driver':
          const { data: driverData, error: driverError } = await supabase
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
            .eq('id', user.id)
            .single();

          if (!driverError && driverData) {
            const ratings = driverData.ratings || [];
            const averageRating = ratings.length > 0
              ? ratings.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0) / ratings.length
              : 0;

            additionalData = {
              ...driverData,
              average_rating: averageRating,
              total_ratings: ratings.length,
              recent_ratings: ratings.slice(0, 5),
              active_complaints: driverData.complaints?.filter((c: any) => c.status === 'pending') || [],
              loyalty_info: driverData.loyalty?.[0] || { points: 0, level: 'bronze' },
              recent_points_history: driverData.points_history?.slice(0, 10) || []
            };
          }
          break;

        case 'transporter':
          const { data: transporterData, error: transporterError } = await supabase
            .from('transporter_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!transporterError && transporterData) {
            additionalData = transporterData;
          }
          break;

        case 'special_driver':
          const { data: specialDriverData, error: specialDriverError } = await supabase
            .from('special_driver_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!specialDriverError && specialDriverData) {
            additionalData = specialDriverData;
          }
          break;

        case 'business_restaurant':
        case 'business_cafe':
        case 'business_retail':
        case 'business_fuel':
        case 'business_parking':
        case 'business_pharmacy':
          const { data: businessData, error: businessError } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!businessError && businessData) {
            additionalData = businessData;
          }
          break;

        default:
          // نوع غير معروف، لا توجد بيانات إضافية
          break;
      }

      setProfileData({
        ...profileData,
        additional_data: additionalData
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/login');
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const profileOptions: ProfileOption[] = [
    {
      id: 'edit-profile',
      titleKey: 'profile.editProfile',
      icon: <User size={22} color="#333" />,
      onPress: () => setShowEditProfile(true),
    },
    {
      id: 'notifications',
      titleKey: 'profile.notifications',
      icon: <Bell size={22} color="#333" />,
      onPress: () => {},
      rightElement: (
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: '#767577', true: '#F5B800' }}
          thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
        />
      )
    },
    {
      id: 'support',
      titleKey: 'profile.support',
      icon: <HelpCircle size={22} color="#333" />,
      onPress: () => console.log('Support pressed'),
    },
    {
      id: 'language',
      titleKey: 'profile.language',
      icon: <Globe size={22} color="#333" />,
      onPress: toggleLanguage,
    },
  ];

  // Check if the layout is RTL
  const isRTL = i18n.dir() === 'rtl';

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('profile.title')} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user || !profileData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('profile.title')} />

      {showEditProfile && (
        <View style={styles.editProfileOverlay}>
          <EditProfile
            userId={user.id}
            profileData={profileData}
            onSave={() => {
              setShowEditProfile(false);
              fetchProfileData();
            }}
            onCancel={() => setShowEditProfile(false)}
          />
        </View>
      )}
      
      <View style={styles.profileHeader}>
        <Image 
          source={
            profileData?.type === 'personal' 
              ? { uri: profileData?.additional_data?.avatar_url || 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg' }
              : { uri: profileData?.additional_data?.profile_photo_url || 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg' }
          } 
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profileData?.full_name}</Text>
          <TouchableOpacity 
            onPress={() => handlePhonePress(profileData?.phone)}
            style={styles.phoneContainer}
          >
            <Phone size={16} color="#666" />
            <Text style={styles.profilePhone}>{profileData?.phone}</Text>
          </TouchableOpacity>
          
          {profileData?.verified && (
            <View style={styles.verificationBadge}>
              <Shield size={16} color="#2ecc71" />
              <Text style={styles.verificationText}>
                {t('profile.verified')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Profile Sections */}
      {profileData?.type === 'personal' && (
        <PersonalProfileSection
          userId={user?.id || ''}
        />
      )}
      
      {profileData?.type === 'driver' && (
        <DriverProfileSection
          userId={user?.id || ''}
        />
      )}

      {/* New Profile Types */}
      {profileData?.type === 'transporter' && (
        <TransporterProfileSection
          userId={user?.id || ''}
        />
      )}
      
      {profileData?.type === 'special_driver' && (
        <SpecialDriverProfileSection
          userId={user?.id || ''}
        />
      )}

      {(profileData?.type?.startsWith('business_')) && (
        <BusinessProfileSection
          userId={user?.id || ''}
          businessType={profileData.type}
        />
      )}

      <View style={styles.optionsContainer}>
        {profileOptions.map((option) => (
          <TouchableOpacity 
            key={option.id} 
            style={[styles.optionItem, isRTL && styles.optionItemRTL]} 
            onPress={option.onPress}
          >
            <View style={[styles.optionLeft, isRTL && styles.optionLeftRTL]}>
              {option.icon}
              <Text style={styles.optionText}>{t(option.titleKey)}</Text>
            </View>
            {option.rightElement || (
              <ChevronRight 
                size={20} 
                color="#999"
                style={isRTL && { transform: [{ scaleX: -1 }] }}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#e74c3c" />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    marginLeft: 20,
    justifyContent: 'center',
    flex: 1,
  },
  profileName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#333',
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    padding: 4,
  },
  profilePhone: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verificationText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#666',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemRTL: {
    flexDirection: 'row-reverse',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLeftRTL: {
    flexDirection: 'row-reverse',
  },
  optionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  badge: {
    backgroundColor: '#F5B800',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 10,
  },
  editProfileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    zIndex: 1000,
  },
});