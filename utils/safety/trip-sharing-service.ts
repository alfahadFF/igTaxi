import { supabase } from '@/utils/supabase';

export interface TripShare {
  id: string;
  trip_id: string;
  user_id: string;
  share_code: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface TripShareRecipient {
  id: string;
  trip_share_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string;
  notification_sent: boolean;
  created_at: string;
}

export interface TripLocationUpdate {
  id: string;
  trip_share_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

class TripSharingService {
  /**
   * إنشاء مشاركة رحلة جديدة
   */
  async createTripShare(tripId: string): Promise<TripShare> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const shareCode = this.generateShareCode();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // تنتهي صلاحيته بعد 24 ساعة

      const { data, error } = await supabase
        .from('trip_shares')
        .insert({
          trip_id: tripId,
          user_id: user.id,
          share_code: shareCode,
          is_active: true,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating trip share:', error);
      throw error;
    }
  }

  /**
   * جلب مشاركات الرحلة النشطة
   */
  async getActiveTripShares(): Promise<TripShare[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active trip shares:', error);
      throw error;
    }
  }

  /**
   * إضافة مستقبل لمشاركة الرحلة
   */
  async addTripShareRecipient(
    tripShareId: string, 
    recipientName: string, 
    recipientPhone: string,
    recipientEmail?: string
  ): Promise<TripShareRecipient> {
    try {
      const { data, error } = await supabase
        .from('trip_share_recipients')
        .insert({
          trip_share_id: tripShareId,
          recipient_name: recipientName,
          recipient_phone: recipientPhone,
          recipient_email: recipientEmail,
          notification_sent: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding trip share recipient:', error);
      throw error;
    }
  }

  /**
   * تحديث موقع الرحلة
   */
  async updateTripLocation(
    tripShareId: string,
    latitude: number,
    longitude: number,
    speed?: number,
    heading?: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('trip_location_history')
        .insert({
          trip_share_id: tripShareId,
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
          speed,
          heading
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating trip location:', error);
      throw error;
    }
  }

  /**
   * إنهاء مشاركة الرحلة
   */
  async endTripShare(tripShareId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trip_shares')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', tripShareId);

      if (error) throw error;
    } catch (error) {
      console.error('Error ending trip share:', error);
      throw error;
    }
  }

  /**
   * جلب مشاركة الرحلة بواسطة الكود
   */
  async getTripShareByCode(shareCode: string): Promise<TripShare | null> {
    try {
      const { data, error } = await supabase
        .from('trip_shares')
        .select('*')
        .eq('share_code', shareCode)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching trip share by code:', error);
      return null;
    }
  }

  /**
   * جلب تاريخ مواقع الرحلة
   */
  async getTripLocationHistory(tripShareId: string): Promise<TripLocationUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('trip_location_history')
        .select('*')
        .eq('trip_share_id', tripShareId)
        .order('timestamp', { ascending: true })
        .limit(100); // آخر 100 موقع

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trip location history:', error);
      throw error;
    }
  }

  /**
   * إرسال رابط مشاركة الرحلة
   */
  async sendTripShareLink(tripShare: TripShare, recipients: TripShareRecipient[]): Promise<boolean> {
    try {
      const shareUrl = `https://yourapp.com/track/${tripShare.share_code}`;
      
      // هنا يمكن إضافة إرسال SMS أو Email
      // مؤقتاً نحدث حالة الإرسال فقط
      for (const recipient of recipients) {
        await supabase
          .from('trip_share_recipients')
          .update({ notification_sent: true })
          .eq('id', recipient.id);
      }

      return true;
    } catch (error) {
      console.error('Error sending trip share link:', error);
      return false;
    }
  }

  /**
   * تولید کد مشاركة عشوائي
   */
  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * تنظيف مشاركات الرحلة المنتهية الصلاحية
   */
  async cleanupExpiredShares(): Promise<void> {
    try {
      const { error } = await supabase
        .from('trip_shares')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      console.error('Error cleaning up expired shares:', error);
    }
  }
}

export const tripSharingService = new TripSharingService();
