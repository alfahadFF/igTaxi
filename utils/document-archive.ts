import { supabase } from './supabase';

/**
 * نظام إدارة أرشيف الوثائق والسجلات
 * مع حفظ الروابط والبيانات الوصفية
 */

export interface DocumentArchive {
  id?: string;
  verificationRequestId: string;
  documentType: 'national_id_front' | 'national_id_back' | 'driving_license_front' | 
                'driving_license_back' | 'vehicle_registration' | 'profile_photo' | 'additional';
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  thumbnailUrl?: string;
  
  // البيانات الوصفية
  metadata: {
    uploadedAt: string;
    processedAt?: string;
    ocrProcessed: boolean;
    extractedText?: string;
    extractedData?: any;
    processingResults?: any;
    imageQuality?: {
      resolution: string;
      clarity: number;
      brightness: number;
      contrast: number;
    };
    securityInfo?: {
      encrypted: boolean;
      accessLevel: 'public' | 'private' | 'restricted';
      retentionPeriod?: number; // بالأيام
    };
  };
  
  // معلومات التدقيق
  auditTrail: {
    uploadedBy: string;
    processedBy?: string;
    reviewedBy?: string[];
    accessLog: Array<{
      userId: string;
      action: 'view' | 'download' | 'process' | 'review';
      timestamp: string;
      ipAddress?: string;
    }>;
  };
  
  // معلومات الحفظ
  storageInfo: {
    bucketName: string;
    filePath: string;
    backupStatus: 'pending' | 'completed' | 'failed';
    compressionRatio?: number;
    checksumMD5: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingLog {
  id?: string;
  verificationRequestId: string;
  documentArchiveId?: string;
  stepName: string;
  stepType: 'upload' | 'ocr' | 'validation' | 'review' | 'approval';
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  
  // تفاصيل المعالجة
  processingDetails: {
    startTime: string;
    endTime?: string;
    duration?: number; // بالميلي ثانية
    processor: 'system' | 'manual' | 'api';
    processorVersion?: string;
    apiProvider?: string;
    inputData?: any;
    outputData?: any;
    errorDetails?: {
      errorCode: string;
      errorMessage: string;
      stackTrace?: string;
      retryCount: number;
    };
  };
  
  // مقاييس الأداء
  performanceMetrics: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency?: number;
    diskIO?: number;
    confidence?: number;
    accuracy?: number;
  };
  
  createdAt: string;
}

export class DocumentArchiveManager {
  
  /**
   * حفظ وثيقة في الأرشيف
   */
  async archiveDocument(
    file: File,
    verificationRequestId: string,
    documentType: DocumentArchive['documentType'],
    userId: string,
    additionalMetadata?: any
  ): Promise<DocumentArchive> {
    
    try {
      console.log(`📁 بدء أرشفة وثيقة: ${documentType}`);
      
      // 1. رفع الملف إلى التخزين
      const uploadResult = await this.uploadToStorage(file, verificationRequestId, documentType);
      
      // 2. إنشاء مصغرة إذا كانت صورة
      const thumbnailUrl = await this.generateThumbnail(file, uploadResult.filePath);
      
      // 3. حساب معلومات جودة الصورة
      const imageQuality = await this.analyzeImageQuality(file);
      
      // 4. حساب checksum للتحقق من سلامة البيانات
      const checksumMD5 = await this.calculateChecksum(file);
      
      // 5. إنشاء سجل الأرشيف
      const archiveRecord: Omit<DocumentArchive, 'id'> = {
        verificationRequestId,
        documentType,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileUrl: uploadResult.publicUrl,
        thumbnailUrl,
        
        metadata: {
          uploadedAt: new Date().toISOString(),
          ocrProcessed: false,
          imageQuality,
          securityInfo: {
            encrypted: false,
            accessLevel: 'private',
            retentionPeriod: 2555 // 7 سنوات
          },
          ...additionalMetadata
        },
        
        auditTrail: {
          uploadedBy: userId,
          accessLog: [{
            userId,
            action: 'upload',
            timestamp: new Date().toISOString()
          }]
        },
        
        storageInfo: {
          bucketName: 'driver_documents',
          filePath: uploadResult.filePath,
          backupStatus: 'pending',
          checksumMD5
        },
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 6. حفظ السجل في قاعدة البيانات
      const { data, error } = await supabase
        .from('document_archives')
        .insert(archiveRecord)
        .select()
        .single();
      
      if (error) {
        throw new Error(`فشل في حفظ سجل الأرشيف: ${error.message}`);
      }
      
      // 7. تسجيل عملية الرفع
      await this.logProcessingStep(
        verificationRequestId,
        data.id,
        'upload',
        'upload',
        'completed',
        {
          fileName: file.name,
          fileSize: file.size,
          uploadUrl: uploadResult.publicUrl
        }
      );
      
      console.log(`✅ تم أرشفة الوثيقة بنجاح: ${data.id}`);
      
      return data as DocumentArchive;
      
    } catch (error) {
      console.error('خطأ في أرشفة الوثيقة:', error);
      
      // تسجيل الخطأ
      await this.logProcessingStep(
        verificationRequestId,
        null,
        'upload',
        'upload',
        'failed',
        null,
        {
          errorCode: 'ARCHIVE_FAILED',
          errorMessage: error instanceof Error ? error.message : 'خطأ غير معروف',
          retryCount: 0
        }
      );
      
      throw error;
    }
  }

  /**
   * رفع ملف إلى التخزين
   */
  private async uploadToStorage(
    file: File,
    verificationRequestId: string,
    documentType: string
  ): Promise<{ filePath: string; publicUrl: string }> {
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${verificationRequestId}/${documentType}_${timestamp}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('driver_documents')
      .upload(fileName, file, {
        upsert: false,
        contentType: file.type
      });
    
    if (error) {
      throw new Error(`فشل في رفع الملف: ${error.message}`);
    }
    
    // الحصول على الرابط العام
    const { data: urlData } = supabase.storage
      .from('driver_documents')
      .getPublicUrl(fileName);
    
    return {
      filePath: fileName,
      publicUrl: urlData.publicUrl
    };
  }

  /**
   * إنشاء مصغرة للصورة
   */
  private async generateThumbnail(file: File, filePath: string): Promise<string | undefined> {
    try {
      if (!file.type.startsWith('image/')) {
        return undefined;
      }
      
      // إنشاء مصغرة باستخدام Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve) => {
        img.onload = async () => {
          // تحديد أبعاد المصغرة
          const maxSize = 150;
          let { width, height } = img;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // رسم الصورة المصغرة
          ctx?.drawImage(img, 0, 0, width, height);
          
          // تحويل إلى blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              try {
                // رفع المصغرة
                const thumbnailPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
                const { data } = await supabase.storage
                  .from('driver_documents')
                  .upload(thumbnailPath, blob, {
                    contentType: 'image/jpeg'
                  });
                
                if (data) {
                  const { data: thumbUrlData } = supabase.storage
                    .from('driver_documents')
                    .getPublicUrl(thumbnailPath);
                  
                  resolve(thumbUrlData.publicUrl);
                } else {
                  resolve(undefined);
                }
              } catch {
                resolve(undefined);
              }
            } else {
              resolve(undefined);
            }
          }, 'image/jpeg', 0.8);
        };
        
        img.src = URL.createObjectURL(file);
      });
      
    } catch (error) {
      console.warn('خطأ في إنشاء المصغرة:', error);
      return undefined;
    }
  }

  /**
   * تحليل جودة الصورة
   */
  private async analyzeImageQuality(file: File): Promise<DocumentArchive['metadata']['imageQuality']> {
    try {
      if (!file.type.startsWith('image/')) {
        return undefined;
      }
      
      return new Promise((resolve) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
          
          if (imageData) {
            // حساب مقاييس جودة مبسطة
            const { width, height } = img;
            const resolution = `${width}x${height}`;
            
            // حساب الوضوح (تقدير مبسط)
            const clarity = this.calculateImageClarity(imageData.data);
            
            // حساب السطوع والتباين
            const { brightness, contrast } = this.calculateBrightnessContrast(imageData.data);
            
            resolve({
              resolution,
              clarity: Math.round(clarity),
              brightness: Math.round(brightness),
              contrast: Math.round(contrast)
            });
          } else {
            resolve(undefined);
          }
        };
        
        img.src = URL.createObjectURL(file);
      });
      
    } catch (error) {
      console.warn('خطأ في تحليل جودة الصورة:', error);
      return undefined;
    }
  }

  /**
   * حساب وضوح الصورة (مبسط)
   */
  private calculateImageClarity(imageData: Uint8ClampedArray): number {
    let edgeCount = 0;
    const threshold = 50;
    
    for (let i = 0; i < imageData.length - 4; i += 4) {
      const current = imageData[i]; // أحمر
      const next = imageData[i + 4];
      
      if (Math.abs(current - next) > threshold) {
        edgeCount++;
      }
    }
    
    return Math.min(100, (edgeCount / (imageData.length / 4)) * 1000);
  }

  /**
   * حساب السطوع والتباين
   */
  private calculateBrightnessContrast(imageData: Uint8ClampedArray): { brightness: number; contrast: number } {
    let sum = 0;
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < imageData.length; i += 4) {
      // حساب القيمة الرمادية
      const gray = 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];
      sum += gray;
      min = Math.min(min, gray);
      max = Math.max(max, gray);
    }
    
    const pixelCount = imageData.length / 4;
    const brightness = sum / pixelCount;
    const contrast = max - min;
    
    return { brightness, contrast };
  }

  /**
   * حساب checksum للملف
   */
  private async calculateChecksum(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('خطأ في حساب checksum:', error);
      return '';
    }
  }

  /**
   * تسجيل خطوة معالجة
   */
  async logProcessingStep(
    verificationRequestId: string,
    documentArchiveId: string | null,
    stepName: string,
    stepType: ProcessingLog['stepType'],
    status: ProcessingLog['status'],
    outputData?: any,
    errorDetails?: ProcessingLog['processingDetails']['errorDetails']
  ): Promise<void> {
    
    try {
      const logRecord: Omit<ProcessingLog, 'id'> = {
        verificationRequestId,
        documentArchiveId,
        stepName,
        stepType,
        status,
        
        processingDetails: {
          startTime: new Date().toISOString(),
          endTime: status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined,
          duration: 0, // سيتم حسابه عند الانتهاء
          processor: 'system',
          inputData: null,
          outputData,
          errorDetails
        },
        
        performanceMetrics: {
          confidence: outputData?.confidence,
          accuracy: outputData?.accuracy
        },
        
        createdAt: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('processing_logs')
        .insert(logRecord);
      
      if (error) {
        console.warn('خطأ في تسجيل خطوة المعالجة:', error);
      }
      
    } catch (error) {
      console.warn('خطأ في تسجيل المعالجة:', error);
    }
  }

  /**
   * تحديث معلومات الوثيقة بعد المعالجة
   */
  async updateDocumentAfterProcessing(
    documentId: string,
    ocrResults: any,
    extractedData: any,
    processingResults: any
  ): Promise<void> {
    
    try {
      const { error } = await supabase
        .from('document_archives')
        .update({
          metadata: {
            processedAt: new Date().toISOString(),
            ocrProcessed: true,
            extractedText: ocrResults.text,
            extractedData,
            processingResults
          },
          updatedAt: new Date().toISOString()
        })
        .eq('id', documentId);
      
      if (error) {
        throw new Error(`فشل في تحديث معلومات الوثيقة: ${error.message}`);
      }
      
    } catch (error) {
      console.error('خطأ في تحديث الوثيقة:', error);
      throw error;
    }
  }

  /**
   * البحث في الأرشيف
   */
  async searchArchive(filters: {
    verificationRequestId?: string;
    documentType?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    userId?: string;
    status?: string;
  }): Promise<DocumentArchive[]> {
    
    try {
      let query = supabase
        .from('document_archives')
        .select('*');
      
      if (filters.verificationRequestId) {
        query = query.eq('verificationRequestId', filters.verificationRequestId);
      }
      
      if (filters.documentType) {
        query = query.eq('documentType', filters.documentType);
      }
      
      if (filters.dateRange) {
        query = query
          .gte('createdAt', filters.dateRange.start)
          .lte('createdAt', filters.dateRange.end);
      }
      
      if (filters.userId) {
        query = query.eq('auditTrail->>uploadedBy', filters.userId);
      }
      
      const { data, error } = await query
        .order('createdAt', { ascending: false });
      
      if (error) {
        throw new Error(`فشل في البحث: ${error.message}`);
      }
      
      return data || [];
      
    } catch (error) {
      console.error('خطأ في البحث:', error);
      throw error;
    }
  }

  /**
   * حذف وثيقة من الأرشيف (soft delete)
   */
  async deleteDocument(documentId: string, userId: string, reason: string): Promise<void> {
    try {
      // تحديث السجل لوضع علامة الحذف
      const { error } = await supabase
        .from('document_archives')
        .update({
          metadata: {
            deleted: true,
            deletedAt: new Date().toISOString(),
            deletedBy: userId,
            deletionReason: reason
          },
          updatedAt: new Date().toISOString()
        })
        .eq('id', documentId);
      
      if (error) {
        throw new Error(`فشل في حذف الوثيقة: ${error.message}`);
      }
      
      // تسجيل عملية الحذف
      await this.logProcessingStep(
        '',
        documentId,
        'delete_document',
        'review',
        'completed',
        { reason, deletedBy: userId }
      );
      
    } catch (error) {
      console.error('خطأ في حذف الوثيقة:', error);
      throw error;
    }
  }
}

// تصدير instance واحد
export const documentArchiveManager = new DocumentArchiveManager();
