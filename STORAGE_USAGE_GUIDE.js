// ===================================================================
// تحديثات مطلوبة للنماذج لاستخدام نظام Storage الجديد
// ===================================================================

/**
 * 1. في ملف components/pharmacy/PrescriptionForm.tsx
 * استبدل دالة uploadImage الموجودة بهذا:
 */

import { uploadPrescriptionImage } from '../../utils/storage';

// في دالة submitOrder، استبدل:
// const imageUrl = await uploadImage(prescriptionImage);
// بـ:
const imageUrl = await uploadPrescriptionImage(prescriptionImage, user.id);

/**
 * 2. في ملف app/auth/transporter-register.tsx
 * استبدل استيراد storage بهذا:
 */

import { uploadProfilePhoto, uploadDriverDocument } from '../../utils/storage';

// في دالة handleRegister، استبدل:
// uploadDriverDocument(profilePhoto, 'profile', authData.user.id)
// بـ:
const profilePhotoUrl = profilePhoto ? 
  await uploadProfilePhoto(profilePhoto, authData.user.id) : null;

/**
 * 3. في ملف app/auth/driver-register.tsx
 * استبدل استيراد storage بهذا:
 */

import { uploadDriverDocument } from '../../utils/storage';

// الكود موجود بالفعل ويجب أن يعمل مع التحديثات

/**
 * 4. في أي نموذج آخر يحتاج رفع صور، استخدم:
 */

import { 
  uploadProfilePhoto,     // للصور الشخصية
  uploadDriverDocument,   // لوثائق السائقين  
  uploadPrescriptionImage, // لصور الوصفات
  checkStorageSetup,      // للتحقق من إعداد Storage
  STORAGE_BUCKETS         // لأسماء المجلدات
} from '../utils/storage';

// أمثلة للاستخدام:

// رفع صورة شخصية
const profileUrl = await uploadProfilePhoto(imageUri, userId);

// رفع رخصة قيادة
const licenseUrl = await uploadDriverDocument(imageUri, 'license', userId);

// رفع هوية شخصية  
const idUrl = await uploadDriverDocument(imageUri, 'id_card', userId);

// رفع وصفة طبية
const prescriptionUrl = await uploadPrescriptionImage(imageUri, userId);

// التحقق من إعداد Storage
const isStorageReady = await checkStorageSetup();
if (!isStorageReady) {
  alert('نظام رفع الملفات غير مُعد بشكل صحيح');
}

/**
 * 5. معالجة الأخطاء المحسنة:
 */

try {
  const imageUrl = await uploadProfilePhoto(selectedImage, userId);
  // نجح الرفع
  console.log('تم رفع الصورة:', imageUrl);
} catch (error) {
  // فشل الرفع
  console.error('فشل رفع الصورة:', error.message);
  alert('فشل في رفع الصورة: ' + error.message);
}

/**
 * 6. إضافة progress indicator (اختياري):
 */

const [uploadProgress, setUploadProgress] = useState(0);

// في دالة الرفع:
const imageUrl = await uploadProfilePhoto(
  selectedImage, 
  userId,
  (progress) => setUploadProgress(progress) // callback للـ progress
);

// في الـ UI:
{uploadProgress > 0 && uploadProgress < 100 && (
  <View style={styles.progressContainer}>
    <Text>جاري الرفع... {uploadProgress}%</Text>
  </View>
)}

/**
 * 7. حالات مختلفة للاستخدام:
 */

// رفع عدة صور للمطعم
const businessPhotos = [];
for (const imageUri of selectedImages) {
  const url = await uploadBusinessPhoto(imageUri, businessId);
  businessPhotos.push(url);
}

// رفع صور السيارة
const vehiclePhotoUrl = await uploadVehiclePhoto(carImageUri, driverId);

// رفع صورة منتج
const productImageUrl = await uploadProductImage(productImageUri, businessId);

/**
 * تذكير مهم:
 * تأكد من تنفيذ استعلامات SQL في manual-storage-setup.sql
 * أولاً في Supabase Dashboard قبل استخدام هذه الدوال!
 */
