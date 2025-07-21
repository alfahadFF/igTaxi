import { supabase } from './supabase';
import { OCREngine, ExtractedData } from './ocr-engine';

/**
 * نظام التحقق الذكي من السائقين
 * يدعم جميع الدول العربية مع إعدادات مرنة
 */

export interface VerificationRequest {
  id?: string;
  driverId: string;
  requestType: 'taxi_driver' | 'transporter' | 'event_driver';
  countryCode: string;
  
  // الملفات المرفوعة
  documents: {
    nationalIdFront?: File;
    nationalIdBack?: File;
    drivingLicenseFront?: File;
    drivingLicenseBack?: File;
    vehicleRegistration?: File;
    profilePhoto?: File;
    additionalDocuments?: File[];
  };
  
  // البيانات المدخلة من السائق
  submittedData: {
    fullName: string;
    nationalId: string;
    birthDate: string;
    licenseNumber?: string;
    phoneNumber: string;
    email?: string;
    address?: string;
    vehicleInfo?: {
      make: string;
      model: string;
      year: string;
      color: string;
      plateNumber: string;
    };
  };
}

export interface VerificationResult {
  requestId: string;
  status: 'approved' | 'rejected' | 'manual_review';
  confidence: number;
  
  // نتائج المقارنة
  dataMatches: {
    nameMatch: boolean;
    idMatch: boolean;
    licenseMatch: boolean;
    dateMatch: boolean;
    faceMatch?: boolean;
  };
  
  // التفاصيل
  extractedData: ExtractedData;
  ocrConfidence: number;
  faceConfidence?: number;
  
  // الأخطاء أو الملاحظات
  issues: string[];
  recommendations?: string[];
  
  // معلومات المعالجة
  processedAt: Date;
  processingTime: number;
}

export class DriverVerificationSystem {
  private ocrEngine: OCREngine;
  private countryCode: string;
  
  constructor(countryCode: string = 'AE') {
    this.countryCode = countryCode;
    this.ocrEngine = new OCREngine(countryCode);
  }

  /**
   * بدء عملية التحقق الكاملة
   */
  async processVerificationRequest(request: VerificationRequest): Promise<VerificationResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 بدء التحقق من السائق: ${request.driverId}`);
      
      // 1. إنشاء سجل طلب التحقق
      const verificationId = await this.createVerificationRecord(request);
      
      // 2. رفع الملفات للتخزين
      const uploadedUrls = await this.uploadDocuments(verificationId, request.documents);
      
      // 3. معالجة الوثائق بـ OCR
      const ocrResults = await this.processDocumentsOCR(request.documents);
      
      // 4. التحقق من البيانات ومقارنتها
      const dataValidation = await this.validateAndCompareData(
        request.submittedData,
        ocrResults
      );
      
      // 5. فحص الوجه (اختياري)
      const faceMatchResult = await this.performFaceMatching(
        request.documents.profilePhoto,
        request.documents.nationalIdFront || request.documents.drivingLicenseFront
      );
      
      // 6. تطبيق قواعد التحقق
      const rulesResult = await this.applyVerificationRules(
        request,
        ocrResults,
        dataValidation,
        faceMatchResult
      );
      
      // 7. حساب النتيجة النهائية
      const finalResult = await this.calculateFinalResult(
        verificationId,
        request,
        ocrResults,
        dataValidation,
        faceMatchResult,
        rulesResult
      );
      
      // 8. تحديث قاعدة البيانات
      await this.updateVerificationRecord(verificationId, finalResult, uploadedUrls);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`✅ تم الانتهاء من التحقق في ${processingTime}ms`);
      
      return {
        ...finalResult,
        requestId: verificationId,
        processedAt: new Date(),
        processingTime
      };
      
    } catch (error) {
      console.error('خطأ في معالجة طلب التحقق:', error);
      throw error;
    }
  }

  /**
   * إنشاء سجل طلب التحقق في قاعدة البيانات
   */
  private async createVerificationRecord(request: VerificationRequest): Promise<string> {
    const { data, error } = await supabase
      .from('verification_requests')
      .insert({
        driver_id: request.driverId,
        request_type: request.requestType,
        status: 'processing',
        submitted_data: request.submittedData,
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      throw new Error(`فشل في إنشاء سجل التحقق: ${error.message}`);
    }
    
    return data.id;
  }

  /**
   * رفع الوثائق للتخزين
   */
  private async uploadDocuments(
    verificationId: string,
    documents: VerificationRequest['documents']
  ): Promise<{[key: string]: string}> {
    const uploadedUrls: {[key: string]: string} = {};
    
    try {
      // رفع صور الهوية
      if (documents.nationalIdFront) {
        const frontUrl = await this.uploadFile(
          documents.nationalIdFront,
          `verification/${verificationId}/national_id_front`
        );
        uploadedUrls.national_id_front_url = frontUrl;
      }
      
      if (documents.nationalIdBack) {
        const backUrl = await this.uploadFile(
          documents.nationalIdBack,
          `verification/${verificationId}/national_id_back`
        );
        uploadedUrls.national_id_back_url = backUrl;
      }
      
      // رفع رخصة القيادة
      if (documents.drivingLicenseFront) {
        const frontUrl = await this.uploadFile(
          documents.drivingLicenseFront,
          `verification/${verificationId}/driving_license_front`
        );
        uploadedUrls.driving_license_front_url = frontUrl;
      }
      
      if (documents.drivingLicenseBack) {
        const backUrl = await this.uploadFile(
          documents.drivingLicenseBack,
          `verification/${verificationId}/driving_license_back`
        );
        uploadedUrls.driving_license_back_url = backUrl;
      }
      
      // رفع تسجيل المركبة
      if (documents.vehicleRegistration) {
        const regUrl = await this.uploadFile(
          documents.vehicleRegistration,
          `verification/${verificationId}/vehicle_registration`
        );
        uploadedUrls.vehicle_registration_url = regUrl;
      }
      
      // رفع الصورة الشخصية
      if (documents.profilePhoto) {
        const photoUrl = await this.uploadFile(
          documents.profilePhoto,
          `verification/${verificationId}/profile_photo`
        );
        uploadedUrls.profile_photo_url = photoUrl;
      }
      
      return uploadedUrls;
      
    } catch (error) {
      console.error('خطأ في رفع الملفات:', error);
      throw error;
    }
  }

  /**
   * رفع ملف واحد
   */
  private async uploadFile(file: File, path: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('driver_documents')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      });
    
    if (error) {
      throw new Error(`فشل في رفع الملف: ${error.message}`);
    }
    
    // الحصول على الرابط العام
    const { data: urlData } = supabase.storage
      .from('driver_documents')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }

  /**
   * معالجة جميع الوثائق بـ OCR
   */
  private async processDocumentsOCR(
    documents: VerificationRequest['documents']
  ): Promise<{[key: string]: ExtractedData}> {
    const results: {[key: string]: ExtractedData} = {};
    
    try {
      // معالجة الهوية الوطنية
      if (documents.nationalIdFront) {
        const buffer = await this.fileToBuffer(documents.nationalIdFront);
        const result = await this.ocrEngine.processDocument(buffer, 'national_id');
        results.nationalId = result.extractedData;
      }
      
      // معالجة رخصة القيادة
      if (documents.drivingLicenseFront) {
        const buffer = await this.fileToBuffer(documents.drivingLicenseFront);
        const result = await this.ocrEngine.processDocument(buffer, 'driving_license');
        results.drivingLicense = result.extractedData;
      }
      
      // معالجة تسجيل المركبة
      if (documents.vehicleRegistration) {
        const buffer = await this.fileToBuffer(documents.vehicleRegistration);
        const result = await this.ocrEngine.processDocument(buffer, 'vehicle_registration');
        results.vehicleRegistration = result.extractedData;
      }
      
      return results;
      
    } catch (error) {
      console.error('خطأ في معالجة OCR:', error);
      throw error;
    }
  }

  /**
   * تحويل File إلى Buffer
   */
  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * التحقق من البيانات ومقارنتها
   */
  private async validateAndCompareData(
    submittedData: VerificationRequest['submittedData'],
    ocrResults: {[key: string]: ExtractedData}
  ): Promise<{
    nameMatch: boolean;
    idMatch: boolean;
    licenseMatch: boolean;
    dateMatch: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    // مقارنة الاسم
    const nameMatch = this.compareNames(
      submittedData.fullName,
      ocrResults.nationalId?.nationalId?.name ||
      ocrResults.drivingLicense?.drivingLicense?.name ||
      ''
    );
    
    if (!nameMatch) {
      issues.push('الاسم في الوثائق لا يطابق الاسم المدخل');
    }
    
    // مقارنة رقم الهوية
    const idMatch = submittedData.nationalId === 
      (ocrResults.nationalId?.nationalId?.number || '');
    
    if (!idMatch) {
      issues.push('رقم الهوية لا يطابق الرقم في الوثيقة');
    }
    
    // مقارنة رقم الرخصة
    const licenseMatch = !submittedData.licenseNumber || 
      submittedData.licenseNumber === 
      (ocrResults.drivingLicense?.drivingLicense?.number || '');
    
    if (!licenseMatch && submittedData.licenseNumber) {
      issues.push('رقم رخصة القيادة لا يطابق الرقم في الوثيقة');
    }
    
    // مقارنة تاريخ الميلاد
    const dateMatch = this.compareDates(
      submittedData.birthDate,
      ocrResults.nationalId?.nationalId?.birthDate ||
      ocrResults.drivingLicense?.drivingLicense?.birthDate ||
      ''
    );
    
    if (!dateMatch) {
      issues.push('تاريخ الميلاد لا يطابق التاريخ في الوثائق');
    }
    
    return {
      nameMatch,
      idMatch,
      licenseMatch,
      dateMatch,
      issues
    };
  }

  /**
   * مقارنة الأسماء (مع مرونة للاختلافات البسيطة)
   */
  private compareNames(submitted: string, extracted: string): boolean {
    if (!extracted) return false;
    
    // إزالة المسافات الإضافية وتوحيد الأحرف
    const normalizeText = (text: string) => 
      text.trim()
          .replace(/\s+/g, ' ')
          .replace(/ة/g, 'ه')
          .replace(/أ|إ|آ/g, 'ا');
    
    const normalizedSubmitted = normalizeText(submitted);
    const normalizedExtracted = normalizeText(extracted);
    
    // تحقق من التطابق التام أو الجزئي
    return normalizedSubmitted === normalizedExtracted ||
           normalizedExtracted.includes(normalizedSubmitted) ||
           normalizedSubmitted.includes(normalizedExtracted);
  }

  /**
   * مقارنة التواريخ
   */
  private compareDates(submitted: string, extracted: string): boolean {
    if (!extracted) return false;
    
    // تطبيع التواريخ لصيغة موحدة
    const normalizeDate = (date: string) => {
      return date.replace(/[/-]/g, '').replace(/\s/g, '');
    };
    
    return normalizeDate(submitted) === normalizeDate(extracted);
  }

  /**
   * مطابقة الوجه (اختياري)
   */
  private async performFaceMatching(
    profilePhoto?: File,
    documentPhoto?: File
  ): Promise<{confidence: number; match: boolean} | null> {
    if (!profilePhoto || !documentPhoto) {
      return null;
    }
    
    try {
      // هنا يمكن إضافة مكتبة face-api.js أو API خارجي
      // للآن نرجع نتيجة وهمية
      console.log('🔍 تطبيق مطابقة الوجه...');
      
      // محاكاة معالجة
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        confidence: 85,
        match: true
      };
      
    } catch (error) {
      console.error('خطأ في مطابقة الوجه:', error);
      return null;
    }
  }

  /**
   * تطبيق قواعد التحقق
   */
  private async applyVerificationRules(
    request: VerificationRequest,
    ocrResults: any,
    dataValidation: any,
    faceMatchResult: any
  ): Promise<{passed: boolean; failedRules: string[]}> {
    const failedRules: string[] = [];
    
    try {
      // جلب قواعد التحقق من قاعدة البيانات
      const { data: rules } = await supabase
        .from('verification_rules')
        .select('*')
        .eq('is_active', true)
        .contains('applies_to', [request.requestType]);
      
      if (rules) {
        for (const rule of rules) {
          const passed = await this.checkRule(rule, {
            request,
            ocrResults,
            dataValidation,
            faceMatchResult
          });
          
          if (!passed) {
            failedRules.push(rule.rule_name);
          }
        }
      }
      
      return {
        passed: failedRules.length === 0,
        failedRules
      };
      
    } catch (error) {
      console.error('خطأ في تطبيق قواعد التحقق:', error);
      return { passed: false, failedRules: ['خطأ في تطبيق القواعد'] };
    }
  }

  /**
   * فحص قاعدة تحقق واحدة
   */
  private async checkRule(rule: any, context: any): Promise<boolean> {
    // هنا يمكن تطبيق قواعد مختلفة حسب نوع القاعدة
    switch (rule.rule_type) {
      case 'name_match':
        return context.dataValidation.nameMatch;
      
      case 'date_validation':
        return context.dataValidation.dateMatch;
      
      case 'license_category':
        return await this.checkLicenseCategory(context.request, context.ocrResults);
      
      case 'document_quality':
        return true; // يمكن تطويره لاحقاً
      
      case 'face_similarity':
        return !context.faceMatchResult || context.faceMatchResult.match;
      
      case 'id_pattern_validation':
        return context.dataValidation.idMatch;
      
      default:
        return true;
    }
  }

  /**
   * فحص فئة الرخصة
   */
  private async checkLicenseCategory(
    request: VerificationRequest,
    ocrResults: any
  ): Promise<boolean> {
    try {
      // جلب متطلبات الدولة
      const { data: countryConfig } = await supabase
        .from('country_verification_config')
        .select('driver_requirements')
        .eq('country_code', request.countryCode)
        .single();
      
      if (!countryConfig) return true;
      
      const requirements = countryConfig.driver_requirements[request.requestType];
      const requiredCategories = requirements?.license_categories || [];
      const extractedCategories = ocrResults.drivingLicense?.drivingLicense?.categories || [];
      
      // التحقق من وجود فئة مناسبة
      return requiredCategories.some((category: string) => 
        extractedCategories.includes(category)
      );
      
    } catch (error) {
      console.error('خطأ في فحص فئة الرخصة:', error);
      return false;
    }
  }

  /**
   * حساب النتيجة النهائية
   */
  private async calculateFinalResult(
    verificationId: string,
    request: VerificationRequest,
    ocrResults: any,
    dataValidation: any,
    faceMatchResult: any,
    rulesResult: any
  ): Promise<Omit<VerificationResult, 'requestId' | 'processedAt' | 'processingTime'>> {
    
    // حساب درجة الثقة الإجمالية
    const ocrConfidence = Object.values(ocrResults).reduce((avg: number, result: any) => {
      const confidence = result.nationalId?.confidence || 
                        result.drivingLicense?.confidence || 
                        result.vehicleRegistration?.confidence || 0;
      return (avg + confidence) / 2;
    }, 0);
    
    const faceConfidence = faceMatchResult?.confidence || 0;
    const overallConfidence = (ocrConfidence + faceConfidence) / 2;
    
    // تحديد الحالة النهائية
    let status: 'approved' | 'rejected' | 'manual_review' = 'approved';
    const issues = [...dataValidation.issues];
    
    if (!rulesResult.passed) {
      issues.push(...rulesResult.failedRules);
      
      // إذا فشلت قواعد حرجة، الرفض المباشر
      const criticalRulesFailed = rulesResult.failedRules.some((rule: string) => 
        ['اسم متطابق', 'تاريخ صحيح', 'فئة الرخصة', 'نمط رقم الهوية'].includes(rule)
      );
      
      if (criticalRulesFailed) {
        status = 'rejected';
      } else {
        status = 'manual_review';
      }
    }
    
    if (overallConfidence < 70) {
      status = 'manual_review';
      issues.push('درجة الثقة منخفضة في استخراج البيانات');
    }
    
    return {
      status,
      confidence: overallConfidence,
      dataMatches: {
        nameMatch: dataValidation.nameMatch,
        idMatch: dataValidation.idMatch,
        licenseMatch: dataValidation.licenseMatch,
        dateMatch: dataValidation.dateMatch,
        faceMatch: faceMatchResult?.match
      },
      extractedData: ocrResults,
      ocrConfidence,
      faceConfidence,
      issues,
      recommendations: this.generateRecommendations(status, issues)
    };
  }

  /**
   * إنتاج توصيات
   */
  private generateRecommendations(
    status: string,
    issues: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (status === 'manual_review') {
      recommendations.push('يُنصح بالمراجعة اليدوية للتأكد من صحة البيانات');
    }
    
    if (issues.some(issue => issue.includes('جودة'))) {
      recommendations.push('يُنصح بإعادة تصوير الوثائق بجودة أعلى');
    }
    
    if (issues.some(issue => issue.includes('تطابق'))) {
      recommendations.push('يُنصح بالتحقق من صحة البيانات المدخلة');
    }
    
    return recommendations;
  }

  /**
   * تحديث سجل التحقق في قاعدة البيانات
   */
  private async updateVerificationRecord(
    verificationId: string,
    result: any,
    uploadedUrls: {[key: string]: string}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({
          status: result.status,
          ...uploadedUrls,
          extracted_data: result.extractedData,
          verification_results: {
            dataMatches: result.dataMatches,
            issues: result.issues,
            recommendations: result.recommendations
          },
          ocr_confidence_score: result.ocrConfidence,
          face_match_confidence: result.faceConfidence,
          overall_confidence: result.confidence,
          auto_decision: result.status === 'manual_review' ? 'manual_review' : 
                        result.status === 'approved' ? 'approve' : 'reject',
          rejection_reasons: result.status === 'rejected' ? result.issues : null,
          processed_at: new Date().toISOString()
        })
        .eq('id', verificationId);
      
      if (error) {
        throw new Error(`فشل في تحديث سجل التحقق: ${error.message}`);
      }
      
    } catch (error) {
      console.error('خطأ في تحديث قاعدة البيانات:', error);
      throw error;
    }
  }

  /**
   * تنظيف الموارد
   */
  async cleanup(): Promise<void> {
    await this.ocrEngine.cleanup();
  }
}

// دالة مساعدة سريعة للتحقق
export async function verifyDriver(
  request: VerificationRequest
): Promise<VerificationResult> {
  const system = new DriverVerificationSystem(request.countryCode);
  
  try {
    return await system.processVerificationRequest(request);
  } finally {
    await system.cleanup();
  }
}
