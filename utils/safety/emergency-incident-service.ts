import { supabase } from '@/utils/supabase';

export interface EmergencyIncident {
  id: string;
  user_id: string;
  incident_type: 'medical' | 'security' | 'accident' | 'panic' | 'other';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'cancelled';
  trip_id?: string;
  emergency_contacts_notified: boolean;
  emergency_services_notified: boolean;
  response_time?: number; // في الثواني
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmergencyNotification {
  id: string;
  incident_id: string;
  recipient_id: string;
  notification_type: 'emergency_contact' | 'emergency_services' | 'trip_share';
  message: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
}

export interface TripShare {
  id: string;
  trip_id: string;
  shared_by: string; // user_id
  is_active: boolean;
  share_code: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TripShareRecipient {
  id: string;
  trip_share_id: string;
  contact_name: string;
  contact_phone: string;
  notification_sent: boolean;
  last_viewed: string;
  created_at: string;
}

export interface TripLocationHistory {
  id: string;
  trip_share_id: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
}

class EmergencyIncidentService {
  /**
   * إنشاء حادثة طوارئ جديدة
   */
  async createIncident(incident: {
    type: EmergencyIncident['incident_type'];
    location: EmergencyIncident['location'];
    description: string;
    priority: EmergencyIncident['priority'];
    tripId?: string;
  }): Promise<EmergencyIncident> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('emergency_incidents')
        .insert({
          user_id: user.id,
          incident_type: incident.type,
          location: incident.location,
          description: incident.description,
          priority: incident.priority,
          trip_id: incident.tripId,
          status: 'active',
          emergency_contacts_notified: false,
          emergency_services_notified: false,
        })
        .select()
        .single();

      if (error) throw error;

      // إرسال إشعارات لجهات الاتصال الطارئة
      await this.notifyEmergencyContacts(data.id);

      return data;
    } catch (error) {
      console.error('Error creating emergency incident:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة الحادثة
   */
  async updateIncidentStatus(
    incidentId: string,
    status: EmergencyIncident['status'],
    resolvedAt?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = { status };
      if (resolvedAt) updateData.resolved_at = resolvedAt;

      const { error } = await supabase
        .from('emergency_incidents')
        .update(updateData)
        .eq('id', incidentId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating incident status:', error);
      throw error;
    }
  }

  /**
   * جلب الحوادث النشطة للمستخدم
   */
  async getActiveIncidents(): Promise<EmergencyIncident[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('emergency_incidents')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active incidents:', error);
      throw error;
    }
  }

  /**
   * جلب تاريخ الحوادث للمستخدم
   */
  async getIncidentHistory(limit: number = 50): Promise<EmergencyIncident[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('emergency_incidents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching incident history:', error);
      throw error;
    }
  }

  /**
   * إرسال إشعارات لجهات الاتصال الطارئة
   */
  private async notifyEmergencyContacts(incidentId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // جلب جهات الاتصال الأساسية
      const { data: contacts, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('is_active', true);

      if (contactsError) throw contactsError;

      if (contacts && contacts.length > 0) {
        // إنشاء إشعارات لكل جهة اتصال
        const notifications = contacts.map(contact => ({
          incident_id: incidentId,
          recipient_id: contact.id,
          notification_type: 'emergency_contact' as const,
          message: `حالة طوارئ: ${user.email} يحتاج للمساعدة. يرجى التواصل فوراً.`,
          status: 'sent' as const,
          sent_at: new Date().toISOString(),
        }));

        const { error: notificationError } = await supabase
          .from('emergency_notifications')
          .insert(notifications);

        if (notificationError) throw notificationError;

        // تحديث حالة الإشعار في الحادثة
        await supabase
          .from('emergency_incidents')
          .update({ emergency_contacts_notified: true })
          .eq('id', incidentId);
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }
}

class TripSharingService {
  /**
   * إنشاء مشاركة رحلة جديدة
   */
  async createTripShare(tripId: string, recipients: Array<{ name: string; phone: string }>): Promise<TripShare> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // إنشاء كود مشاركة فريد
      const shareCode = this.generateShareCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 ساعة

      const { data: tripShare, error: shareError } = await supabase
        .from('trip_shares')
        .insert({
          trip_id: tripId,
          shared_by: user.id,
          share_code: shareCode,
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (shareError) throw shareError;

      // إضافة المستقبلين
      if (recipients.length > 0) {
        const recipientData = recipients.map(recipient => ({
          trip_share_id: tripShare.id,
          contact_name: recipient.name,
          contact_phone: recipient.phone,
          notification_sent: false,
        }));

        const { error: recipientError } = await supabase
          .from('trip_share_recipients')
          .insert(recipientData);

        if (recipientError) throw recipientError;
      }

      return tripShare;
    } catch (error) {
      console.error('Error creating trip share:', error);
      throw error;
    }
  }

  /**
   * إيقاف مشاركة الرحلة
   */
  async stopTripShare(tripShareId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('trip_shares')
        .update({ is_active: false })
        .eq('id', tripShareId)
        .eq('shared_by', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error stopping trip share:', error);
      throw error;
    }
  }

  /**
   * تحديث موقع الرحلة
   */
  async updateTripLocation(
    tripShareId: string,
    location: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('trip_location_history')
        .insert({
          trip_share_id: tripShareId,
          latitude: location.latitude,
          longitude: location.longitude,
          speed: location.speed,
          heading: location.heading,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating trip location:', error);
      throw error;
    }
  }

  /**
   * جلب الرحلات المشاركة النشطة
   */
  async getActiveTripShares(): Promise<TripShare[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('shared_by', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active trip shares:', error);
      throw error;
    }
  }

  /**
   * جلب تفاصيل مشاركة الرحلة بالكود
   */
  async getTripShareByCode(shareCode: string): Promise<{
    tripShare: TripShare;
    recipients: TripShareRecipient[];
    lastLocation?: TripLocationHistory;
  } | null> {
    try {
      const { data: tripShare, error: shareError } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (shareError && shareError.code !== 'PGRST116') throw shareError;
      if (!tripShare) return null;

      // جلب المستقبلين
      const { data: recipients, error: recipientsError } = await supabase
        .from('trip_share_recipients')
        .select('*')
        .eq('trip_share_id', tripShare.id);

      if (recipientsError) throw recipientsError;

      // جلب آخر موقع
      const { data: lastLocation } = await supabase
        .from('trip_location_history')
        .select('*')
        .eq('trip_share_id', tripShare.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      return {
        tripShare,
        recipients: recipients || [],
        lastLocation: lastLocation || undefined,
      };
    } catch (error) {
      console.error('Error fetching trip share by code:', error);
      throw error;
    }
  }

  /**
   * توليد كود مشاركة فريد
   */
  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const emergencyIncidentService = new EmergencyIncidentService();
export const tripSharingService = new TripSharingService();
