import { supabase } from '@/utils/supabase';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Types for audio recording system
export interface EmergencyAudioRecording {
  id: string;
  recording_id: string;
  user_id: string;
  trip_id?: string;
  recording_type: 'manual' | 'auto' | 'sos' | 'incident' | 'evidence';
  file_name: string;
  file_path: string;
  file_size?: number;
  duration_seconds: number;
  audio_format: string;
  sample_rate: number;
  bit_rate: number;
  channels: number;
  location_latitude?: number;
  location_longitude?: number;
  location_address?: string;
  location_accuracy?: number;
  emergency_level: 'low' | 'medium' | 'high' | 'critical';
  incident_id?: string;
  is_shared: boolean;
  shared_with_contacts?: string[];
  shared_at?: string;
  status: 'active' | 'processing' | 'archived' | 'deleted' | 'corrupted';
  is_evidence: boolean;
  is_encrypted: boolean;
  metadata: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AudioRecordingShare {
  id: string;
  recording_id: string;
  shared_by: string;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  share_method: 'whatsapp' | 'sms' | 'email' | 'telegram' | 'direct';
  share_status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed';
  share_message?: string;
  share_link?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RecordingStats {
  total_recordings: number;
  total_duration: number;
  recordings_by_type: Record<string, number>;
  recent_recordings: number;
  shared_recordings: number;
}

class EmergencyAudioService {
  private audioDir = FileSystem.documentDirectory + 'emergency_audio/';

  /**
   * تهيئة مجلد التسجيلات الصوتية
   */
  async initializeAudioDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.audioDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.audioDir, { intermediates: true });
      }
    } catch (error) {
      console.error('خطأ في إنشاء مجلد التسجيلات:', error);
      throw new Error('فشل في تهيئة مجلد التسجيلات الصوتية');
    }
  }

  /**
   * إنشاء تسجيل صوتي جديد
   */
  async createRecording(params: {
    recording_id: string;
    trip_id?: string;
    recording_type?: 'manual' | 'auto' | 'sos' | 'incident' | 'evidence';
    file_name?: string;
    file_path?: string;
    duration_seconds?: number;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      accuracy?: number;
    };
    emergency_level?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_emergency_recording', {
        p_recording_id: params.recording_id,
        p_trip_id: params.trip_id || null,
        p_recording_type: params.recording_type || 'manual',
        p_file_name: params.file_name || `${params.recording_id}.m4a`,
        p_file_path: params.file_path || `${this.audioDir}${params.recording_id}.m4a`,
        p_duration_seconds: params.duration_seconds || 0,
        p_location_lat: params.location?.latitude || null,
        p_location_lng: params.location?.longitude || null,
        p_emergency_level: params.emergency_level || 'medium',
        p_metadata: params.metadata || {}
      });

      if (error) {
        console.error('خطأ في إنشاء التسجيل:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('خطأ في إنشاء التسجيل الصوتي:', error);
      throw new Error('فشل في إنشاء التسجيل الصوتي');
    }
  }

  /**
   * الحصول على تسجيل صوتي بالمعرف
   */
  async getRecording(recordingId: string): Promise<EmergencyAudioRecording | null> {
    try {
      const { data, error } = await supabase
        .from('emergency_audio_recordings')
        .select('*')
        .eq('id', recordingId)
        .single();

      if (error) {
        console.error('خطأ في جلب التسجيل:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('خطأ في الحصول على التسجيل:', error);
      return null;
    }
  }

  /**
   * الحصول على جميع تسجيلات المستخدم
   */
  async getUserRecordings(params?: {
    recording_type?: string;
    emergency_level?: string;
    limit?: number;
    offset?: number;
  }): Promise<EmergencyAudioRecording[]> {
    try {
      let query = supabase
        .from('emergency_audio_recordings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (params?.recording_type) {
        query = query.eq('recording_type', params.recording_type);
      }

      if (params?.emergency_level) {
        query = query.eq('emergency_level', params.emergency_level);
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      if (params?.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('خطأ في جلب التسجيلات:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في الحصول على تسجيلات المستخدم:', error);
      return [];
    }
  }

  /**
   * تحديث تسجيل صوتي
   */
  async updateRecording(
    recordingId: string, 
    updates: Partial<EmergencyAudioRecording>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('emergency_audio_recordings')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (error) {
        console.error('خطأ في تحديث التسجيل:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('خطأ في تحديث التسجيل الصوتي:', error);
      return false;
    }
  }

  /**
   * مشاركة تسجيل صوتي مع جهة اتصال
   */
  async shareRecording(params: {
    recording_id: string;
    contact_id: string;
    share_method?: 'whatsapp' | 'sms' | 'email' | 'telegram' | 'direct';
    share_message?: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('share_emergency_recording', {
        p_recording_id: params.recording_id,
        p_contact_id: params.contact_id,
        p_share_method: params.share_method || 'whatsapp',
        p_share_message: params.share_message || null
      });

      if (error) {
        console.error('خطأ في مشاركة التسجيل:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('خطأ في مشاركة التسجيل الصوتي:', error);
      throw new Error('فشل في مشاركة التسجيل الصوتي');
    }
  }

  /**
   * الحصول على مشاركات تسجيل
   */
  async getRecordingShares(recordingId: string): Promise<AudioRecordingShare[]> {
    try {
      const { data, error } = await supabase
        .from('audio_recording_shares')
        .select('*')
        .eq('recording_id', recordingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('خطأ في جلب مشاركات التسجيل:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في الحصول على مشاركات التسجيل:', error);
      return [];
    }
  }

  /**
   * حذف تسجيل صوتي (soft delete)
   */
  async deleteRecording(recordingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('emergency_audio_recordings')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', recordingId);

      if (error) {
        console.error('خطأ في حذف التسجيل:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('خطأ في حذف التسجيل الصوتي:', error);
      return false;
    }
  }

  /**
   * حذف ملف التسجيل من التخزين المحلي
   */
  async deleteRecordingFile(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
      return true;
    } catch (error) {
      console.error('خطأ في حذف ملف التسجيل:', error);
      return false;
    }
  }

  /**
   * رفع تسجيل صوتي إلى التخزين السحابي
   */
  async uploadRecording(filePath: string, fileName: string): Promise<string | null> {
    try {
      // قراءة الملف
      const fileData = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // رفع إلى Supabase Storage
      const { data, error } = await supabase.storage
        .from('emergency-audio')
        .upload(fileName, decode(fileData), {
          contentType: 'audio/m4a',
          upsert: false
        });

      if (error) {
        console.error('خطأ في رفع التسجيل:', error);
        throw error;
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from('emergency-audio')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('خطأ في رفع التسجيل الصوتي:', error);
      return null;
    }
  }

  /**
   * تنزيل تسجيل صوتي من التخزين السحابي
   */
  async downloadRecording(fileName: string, localPath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from('emergency-audio')
        .download(fileName);

      if (error) {
        console.error('خطأ في تنزيل التسجيل:', error);
        throw error;
      }

      // تحويل إلى base64 وحفظ محلياً
      const base64Data = await blobToBase64(data);
      await FileSystem.writeAsStringAsync(localPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return true;
    } catch (error) {
      console.error('خطأ في تنزيل التسجيل الصوتي:', error);
      return false;
    }
  }

  /**
   * الحصول على إحصائيات التسجيلات
   */
  async getRecordingStats(userId?: string): Promise<RecordingStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_recording_stats', {
        p_user_id: userId || null
      });

      if (error) {
        console.error('خطأ في جلب إحصائيات التسجيلات:', error);
        throw error;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('خطأ في الحصول على إحصائيات التسجيلات:', error);
      return null;
    }
  }

  /**
   * البحث في التسجيلات
   */
  async searchRecordings(params: {
    query?: string;
    recording_type?: string;
    emergency_level?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<EmergencyAudioRecording[]> {
    try {
      let query = supabase
        .from('emergency_audio_recordings')
        .select('*')
        .eq('status', 'active');

      if (params.query) {
        query = query.or(`notes.ilike.%${params.query}%,file_name.ilike.%${params.query}%`);
      }

      if (params.recording_type) {
        query = query.eq('recording_type', params.recording_type);
      }

      if (params.emergency_level) {
        query = query.eq('emergency_level', params.emergency_level);
      }

      if (params.date_from) {
        query = query.gte('created_at', params.date_from);
      }

      if (params.date_to) {
        query = query.lte('created_at', params.date_to);
      }

      if (params.limit) {
        query = query.limit(params.limit);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('خطأ في البحث في التسجيلات:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('خطأ في البحث في التسجيلات الصوتية:', error);
      return [];
    }
  }

  /**
   * تحديث حالة مشاركة التسجيل
   */
  async updateShareStatus(
    shareId: string,
    status: 'pending' | 'sent' | 'delivered' | 'opened' | 'failed'
  ): Promise<boolean> {
    try {
      const updateData: any = {
        share_status: status,
        updated_at: new Date().toISOString()
      };

      // إضافة timestamp حسب الحالة
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'opened') {
        updateData.opened_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('audio_recording_shares')
        .update(updateData)
        .eq('id', shareId);

      if (error) {
        console.error('خطأ في تحديث حالة المشاركة:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('خطأ في تحديث حالة مشاركة التسجيل:', error);
      return false;
    }
  }
}

// Helper functions
function decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = new Uint8Array(Math.floor(base64.length * 0.75));
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);
    
    result[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (encoded3 !== 64) result[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    if (encoded4 !== 64) result[p++] = ((encoded3 & 3) << 6) | encoded4;
  }
  return result.subarray(0, p);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // إزالة البادئة data:...;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const emergencyAudioService = new EmergencyAudioService();
