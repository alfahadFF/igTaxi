import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../contexts/AppContext';

export const STORAGE_BUCKETS = {
  PROFILE_PHOTOS: 'profile_photos',
  DRIVING_LICENSES: 'driving_licenses',
  IDENTITY_CARDS: 'identity_cards',
  VEHICLE_DOCS: 'vehicle_docs',
  PRESCRIPTIONS: 'prescriptions',
  DOCUMENTS: 'documents'
};

// تحديد نوع الملف المسموح
export const isValidFileType = (uri: string): boolean => {
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
  const extension = uri.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(extension || '');
};

// رفع الملفات مع تحديد النوع
export const uploadFile = async (
  uri: string,
  userId: string,
  type: 'profile' | 'license' | 'id_card' | 'vehicle_registration' | 'prescription'
): Promise<string> => {
  try {
    console.log('بدء رفع الملف:', { uri, userId, type });

    if (!isValidFileType(uri)) {
      throw new Error('نوع الملف غير مدعوم. يرجى اختيار ملف JPG, PNG, أو PDF');
    }

    let file: any;
    let mimeType: string;

    if (Platform.OS !== 'web') {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('الملف غير موجود');
      }
      
      // التحقق من أن حجم الملف لا يتجاوز 10 ميجابايت
      if (fileInfo.size > 10 * 1024 * 1024) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى هو 10 ميجابايت');
      }
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    file = base64;
    mimeType = `image/${uri.split('.').pop()?.toLowerCase() || 'jpeg'}`;

    const folder = type === 'profile' ? 'profile_photos' : 
                  type === 'license' ? 'driving_licenses' : 
                  type === 'id_card' ? 'identity_cards' :
                  type === 'vehicle_registration' ? 'vehicle_docs' : 'documents';

    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const path = `${folder}/${filename}`;

    console.log('تفاصيل الرفع:', { folder, filename, path, mimeType });

    const bucket = type === 'profile' ? STORAGE_BUCKETS.PROFILE_PHOTOS :
                   type === 'license' ? STORAGE_BUCKETS.DRIVING_LICENSES :
                   type === 'id_card' ? STORAGE_BUCKETS.IDENTITY_CARDS :
                   type === 'vehicle_registration' ? STORAGE_BUCKETS.VEHICLE_DOCS :
                   STORAGE_BUCKETS.DOCUMENTS;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('خطأ في رفع الملف:', error);
      throw new Error(`فشل رفع الملف: ${error.message}`);
    }

    console.log('تم رفع الملف بنجاح:', data);

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    throw error;
  }
};

// رفع الوصفة الطبية
export const uploadPrescription = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log('بدء رفع الوصفة الطبية:', { uri, userId });

    if (!isValidFileType(uri)) {
      throw new Error('نوع الملف غير مدعوم. يرجى اختيار ملف JPG, PNG, أو PDF');
    }

    let file: any;
    let mimeType: string;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    file = base64;
    mimeType = `image/${uri.split('.').pop()?.toLowerCase() || 'jpeg'}`;

    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `prescription_${userId}_${Date.now()}.${ext}`;
    const path = `uploads/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.PRESCRIPTIONS)
      .upload(path, file, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('خطأ في رفع الوصفة:', uploadError);
      throw new Error(`فشل رفع الوصفة: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.PRESCRIPTIONS)
      .getPublicUrl(path);

    console.log('تم رفع الوصفة بنجاح');
    return urlData.publicUrl;

  } catch (error) {
    console.error('خطأ في رفع الوصفة:', error);
    throw error;
  }
};

// رفع صورة الملف الشخصي
export const uploadProfilePhoto = async (uri: string, userId: string): Promise<string> => {
  try {
    console.log('بدء رفع صورة الملف الشخصي:', { uri, userId });

    if (!isValidFileType(uri)) {
      throw new Error('نوع الملف غير مدعوم. يرجى اختيار ملف JPG أو PNG');
    }

    let file: any;
    let mimeType: string;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    file = base64;
    mimeType = `image/${uri.split('.').pop()?.toLowerCase() || 'jpeg'}`;

    const ext = mimeType.split('/')[1] || 'jpg';
    const filename = `profile_${userId}_${Date.now()}.${ext}`;
    const path = `users/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_PHOTOS)
      .upload(path, file, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('خطأ في رفع صورة الملف الشخصي:', uploadError);
      throw new Error(`فشل رفع صورة الملف الشخصي: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.PROFILE_PHOTOS)
      .getPublicUrl(path);

    console.log('تم رفع صورة الملف الشخصي بنجاح');
    return urlData.publicUrl;

  } catch (error) {
    console.error('خطأ في رفع صورة الملف الشخصي:', error);
    throw error;
  }
};

// حذف الملف
export const deleteFile = async (path: string, bucket: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('خطأ في حذف الملف:', error);
      throw new Error(`فشل حذف الملف: ${error.message}`);
    }

    console.log('تم حذف الملف بنجاح');
  } catch (error) {
    console.error('خطأ في حذف الملف:', error);
    throw error;
  }
};

// حفظ البيانات محلياً
export const saveToStorage = async (key: string, data: any): Promise<void> => {
  try {
    const jsonData = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonData);
  } catch (error) {
    console.error('خطأ في حفظ البيانات:', error);
    throw error;
  }
};

// قراءة البيانات محلياً
export const getFromStorage = async (key: string): Promise<any> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('خطأ في قراءة البيانات:', error);
    return null;
  }
};

// حذف البيانات محلياً
export const removeFromStorage = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('خطأ في حذف البيانات:', error);
    throw error;
  }
};

// مسح جميع البيانات المحلية
export const clearStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('خطأ في مسح البيانات:', error);
    throw error;
  }
};
