import { supabase } from '@/utils/supabase';
import { EmergencyContact } from '@/contexts/SafetyContext';

export interface DatabaseEmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class EmergencyContactsService {
  /**
   * جلب جميع جهات الاتصال الطارئة للمستخدم الحالي
   */
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(this.mapDatabaseToContact);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      throw error;
    }
  }

  /**
   * إضافة جهة اتصال طارئة جديدة
   */
  async addEmergencyContact(contact: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // التحقق من عدم وجود أكثر من 3 جهات اتصال أساسية
      if (contact.isPrimary) {
        const { count } = await supabase
          .from('emergency_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_primary', true)
          .eq('is_active', true);

        if (count && count >= 3) {
          throw new Error('Cannot have more than 3 primary emergency contacts');
        }
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert({
          user_id: user.id,
          name: contact.name,
          phone: contact.phone,
          relationship: contact.relationship,
          is_primary: contact.isPrimary,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToContact(data);
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      throw error;
    }
  }

  /**
   * تحديث جهة اتصال طارئة
   */
  async updateEmergencyContact(id: string, updates: Partial<EmergencyContact>): Promise<EmergencyContact> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.relationship) updateData.relationship = updates.relationship;
      if (updates.isPrimary !== undefined) updateData.is_primary = updates.isPrimary;

      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToContact(data);
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      throw error;
    }
  }

  /**
   * حذف جهة اتصال طارئة (حذف منطقي)
   */
  async removeEmergencyContact(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('emergency_contacts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing emergency contact:', error);
      throw error;
    }
  }

  /**
   * جلب جهات الاتصال الأساسية للمستخدم
   */
  async getPrimaryContacts(): Promise<EmergencyContact[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(this.mapDatabaseToContact);
    } catch (error) {
      console.error('Error fetching primary contacts:', error);
      throw error;
    }
  }

  /**
   * جلب جهات الاتصال لراكب معين (للسائق في حالة الطوارئ)
   */
  async getPassengerEmergencyContacts(passengerId: string): Promise<EmergencyContact[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // التحقق من وجود رحلة نشطة أو حالة طوارئ
      const { data: tripData } = await supabase
        .from('trips')
        .select('*')
        .eq('driver_id', user.id)
        .eq('customer_id', passengerId)
        .in('status', ['in_progress', 'emergency'])
        .single();

      if (!tripData) {
        // التحقق من وجود حالة طوارئ نشطة
        const { data: incidentData } = await supabase
          .from('emergency_incidents')
          .select('*')
          .eq('user_id', passengerId)
          .eq('status', 'active')
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // آخر ساعتين
          .single();

        if (!incidentData) {
          throw new Error('No active trip or emergency incident found');
        }
      }

      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', passengerId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data.map(this.mapDatabaseToContact);
    } catch (error) {
      console.error('Error fetching passenger emergency contacts:', error);
      throw error;
    }
  }

  /**
   * تحويل بيانات قاعدة البيانات إلى نموذج التطبيق
   */
  private mapDatabaseToContact(data: DatabaseEmergencyContact): EmergencyContact {
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      relationship: data.relationship,
      isPrimary: data.is_primary,
    };
  }
}

export const emergencyContactsService = new EmergencyContactsService();
