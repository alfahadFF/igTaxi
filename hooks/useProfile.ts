import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

interface ExtendedProfile {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  avatar_url?: string;
  // من جدول personal_profiles
  user_name: string;     // IGT-xxxxxxxx
  blood_type?: string;
  health_conditions?: string[];
  // البيانات المجمعة
  emergency_contacts: any[];
  saved_addresses: any[];
  payment_methods: any[];
  loading?: boolean;
  error?: any;
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          // Fetch main profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (profileError) throw profileError;

          // Fetch personal profile data
          const { data: personalData, error: personalError } = await supabase
            .from('personal_profiles')
            .select('*')
            .eq('id', userId)
            .single();

          if (personalError && personalError.code !== 'PGRST116') { // يتجاهل خطأ "لا يوجد سجل"
            throw personalError;
          }

          setProfile({
            ...profileData,
            ...(personalData || {}),
            loading: false
          });

        } catch (err) {
          setError(err);
          console.error('Error fetching profile:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    }
  }, [userId]);

  return { profile, loading, error };
}