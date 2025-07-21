import { supabase } from './supabase';

/**
 * نظام الذكاء الاصطناعي التنبؤي لقرارات المراجعة
 * يحلل التاريخ السابق والجودة لاقتراح قرار تلقائي
 */

export interface VerificationHistory {
  id: string;
  driverId: string;
  documentType: string;
  
  // نتائج سابقة
  previousDecision: 'approved' | 'rejected' | 'manual_review';
  confidence: number;
  processingTime: number; // بالثواني
  
  // خصائص الوثيقة
  imageQuality: {
    clarity: number;
    brightness: number;
    contrast: number;
    resolution: string;
  };
  
  // نتائج OCR
  ocrAccuracy: number;
  extractedFieldsCount: number;
  validFieldsCount: number;
  
  // معلومات المراجع
  reviewerId?: string;
  reviewTime?: number; // وقت المراجعة بالثواني
  reviewNotes?: string;
  
  // بيانات إضافية
  metadata: {
    deviceInfo?: any;
    uploadTime: string;
    fileSize: number;
    retryCount: number;
  };
  
  createdAt: string;
}

export interface PredictionModel {
  // نموذج التقييم
  weights: {
    historySuccess: number;      // 0.35 - تاريخ النجاح
    imageQuality: number;        // 0.25 - جودة الصورة
    ocrAccuracy: number;         // 0.20 - دقة OCR
    documentConsistency: number; // 0.15 - تناسق الوثائق
    userBehavior: number;        // 0.05 - سلوك المستخدم
  };
  
  // عتبات القرار
  thresholds: {
    autoApprove: number;     // 0.85 - موافقة تلقائية
    autoReject: number;      // 0.30 - رفض تلقائي
    manualReview: number;    // 0.30-0.85 - مراجعة يدوية
  };
  
  // معاملات التعلم
  learningRate: number;
  decayFactor: number;
  minSampleSize: number;
}

export interface PredictionResult {
  predictedDecision: 'auto_approve' | 'auto_reject' | 'manual_review';
  confidence: number;
  
  // تفاصيل التحليل
  analysis: {
    historyScore: number;
    qualityScore: number;
    ocrScore: number;
    consistencyScore: number;
    behaviorScore: number;
    
    // عوامل التأثير
    positiveFactors: string[];
    negativeFactors: string[];
    riskFactors: string[];
  };
  
  // توصيات
  recommendations: {
    action: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    estimatedReviewTime?: number;
    suggestedReviewer?: string;
    additionalChecks?: string[];
  };
  
  // بيانات للتعلم
  modelVersion: string;
  predictionTime: number;
  processingTime: number;
}

export class PredictiveReviewAI {
  
  private model: PredictionModel = {
    weights: {
      historySuccess: 0.35,
      imageQuality: 0.25,
      ocrAccuracy: 0.20,
      documentConsistency: 0.15,
      userBehavior: 0.05
    },
    thresholds: {
      autoApprove: 0.85,
      autoReject: 0.30,
      manualReview: 0.30
    },
    learningRate: 0.01,
    decayFactor: 0.95,
    minSampleSize: 10
  };

  /**
   * التنبؤ بقرار المراجعة
   */
  async predictReviewDecision(
    verificationRequestId: string,
    driverId: string,
    documentData: any
  ): Promise<PredictionResult> {
    
    try {
      console.log(`🤖 بدء التحليل التنبؤي للطلب: ${verificationRequestId}`);
      
      const startTime = Date.now();
      
      // جمع البيانات التاريخية
      const history = await this.getDriverHistory(driverId);
      const documentHistory = await this.getDocumentTypeHistory(documentData.documentType);
      
      // تحليل المؤشرات المختلفة
      const historyScore = await this.analyzeHistorySuccess(history);
      const qualityScore = this.analyzeImageQuality(documentData.imageQuality);
      const ocrScore = this.analyzeOCRAccuracy(documentData.ocrResults);
      const consistencyScore = await this.analyzeDocumentConsistency(driverId, documentData);
      const behaviorScore = await this.analyzeUserBehavior(driverId);
      
      // حساب النتيجة الإجمالية
      const finalScore = this.calculateFinalScore({
        historyScore,
        qualityScore,
        ocrScore,
        consistencyScore,
        behaviorScore
      });
      
      // تحديد القرار المتوقع
      const predictedDecision = this.determinePredictedDecision(finalScore);
      
      // تحليل العوامل المؤثرة
      const analysis = this.analyzeFactors({
        historyScore,
        qualityScore,
        ocrScore,
        consistencyScore,
        behaviorScore
      }, documentData);
      
      // توليد التوصيات
      const recommendations = await this.generateRecommendations(
        predictedDecision,
        finalScore,
        analysis,
        documentData
      );
      
      const processingTime = Date.now() - startTime;
      
      const result: PredictionResult = {
        predictedDecision,
        confidence: finalScore,
        analysis,
        recommendations,
        modelVersion: '1.0.0',
        predictionTime: Date.now(),
        processingTime
      };
      
      // حفظ نتيجة التنبؤ للتعلم المستقبلي
      await this.savePredictionResult(verificationRequestId, result);
      
      console.log(`✅ تم التحليل التنبؤي: ${predictedDecision} (ثقة: ${Math.round(finalScore * 100)}%)`);
      
      return result;
      
    } catch (error) {
      console.error('خطأ في التحليل التنبؤي:', error);
      
      // إرجاع قرار افتراضي آمن
      return {
        predictedDecision: 'manual_review',
        confidence: 0.5,
        analysis: {
          historyScore: 0.5,
          qualityScore: 0.5,
          ocrScore: 0.5,
          consistencyScore: 0.5,
          behaviorScore: 0.5,
          positiveFactors: [],
          negativeFactors: ['خطأ في التحليل'],
          riskFactors: ['فشل النظام التنبؤي']
        },
        recommendations: {
          action: 'مراجعة يدوية فورية',
          priority: 'high'
        },
        modelVersion: '1.0.0',
        predictionTime: Date.now(),
        processingTime: 0
      };
    }
  }

  /**
   * تحليل تاريخ نجاح السائق
   */
  private async analyzeHistorySuccess(history: VerificationHistory[]): Promise<number> {
    if (history.length === 0) {
      return 0.5; // نقطة متوسطة للمستخدمين الجدد
    }
    
    // حساب معدل النجاح مع إعطاء وزن أكبر للتقديمات الحديثة
    let weightedScore = 0;
    let totalWeight = 0;
    
    history.forEach((record, index) => {
      const weight = Math.pow(this.model.decayFactor, index); // أحدث = وزن أكبر
      const success = record.previousDecision === 'approved' ? 1 : 0;
      
      weightedScore += success * weight;
      totalWeight += weight;
    });
    
    const successRate = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    
    // تعديل حسب الثقة في النتائج السابقة
    const avgConfidence = history.reduce((sum, h) => sum + h.confidence, 0) / history.length;
    
    return Math.min(1.0, successRate * (0.5 + avgConfidence * 0.5));
  }

  /**
   * تحليل جودة الصورة
   */
  private analyzeImageQuality(imageQuality: any): number {
    if (!imageQuality) return 0.3;
    
    const clarityScore = Math.min(imageQuality.clarity / 100, 1.0);
    const brightnessScore = this.normalizeBrightness(imageQuality.brightness);
    const contrastScore = Math.min(imageQuality.contrast / 100, 1.0);
    const resolutionScore = this.calculateResolutionScore(imageQuality.resolution);
    
    // متوسط مرجح للجودة
    return (clarityScore * 0.4 + brightnessScore * 0.2 + contrastScore * 0.2 + resolutionScore * 0.2);
  }

  /**
   * تحليل دقة OCR
   */
  private analyzeOCRAccuracy(ocrResults: any): number {
    if (!ocrResults) return 0.3;
    
    const textConfidence = ocrResults.confidence || 0;
    const extractedFieldsRatio = ocrResults.extractedFields / ocrResults.expectedFields || 0;
    const validationScore = ocrResults.validFields / ocrResults.extractedFields || 0;
    
    return (textConfidence * 0.4 + extractedFieldsRatio * 0.3 + validationScore * 0.3);
  }

  /**
   * تحليل تناسق الوثائق
   */
  private async analyzeDocumentConsistency(driverId: string, documentData: any): Promise<number> {
    try {
      // الحصول على الوثائق الأخرى للسائق في نفس الطلب
      const { data: relatedDocs } = await supabase
        .from('verification_requests')
        .select('extracted_data, document_type')
        .eq('driver_id', driverId)
        .eq('status', 'processing')
        .neq('document_type', documentData.documentType);
      
      if (!relatedDocs || relatedDocs.length === 0) {
        return 0.7; // لا توجد وثائق أخرى للمقارنة
      }
      
      let consistencyScore = 1.0;
      
      // فحص التناسق في البيانات الأساسية
      relatedDocs.forEach(doc => {
        if (doc.extracted_data) {
          // مقارنة الاسم
          if (documentData.extractedData.name && doc.extracted_data.name) {
            const nameSimilarity = this.calculateStringSimilarity(
              documentData.extractedData.name,
              doc.extracted_data.name
            );
            consistencyScore *= nameSimilarity;
          }
          
          // مقارنة تاريخ الميلاد
          if (documentData.extractedData.birthDate && doc.extracted_data.birthDate) {
            const dateMatch = documentData.extractedData.birthDate === doc.extracted_data.birthDate;
            consistencyScore *= dateMatch ? 1.0 : 0.3;
          }
          
          // مقارنة رقم الهوية
          if (documentData.extractedData.nationalId && doc.extracted_data.nationalId) {
            const idMatch = documentData.extractedData.nationalId === doc.extracted_data.nationalId;
            consistencyScore *= idMatch ? 1.0 : 0.1;
          }
        }
      });
      
      return Math.max(0.1, consistencyScore);
      
    } catch (error) {
      console.warn('خطأ في تحليل التناسق:', error);
      return 0.7;
    }
  }

  /**
   * تحليل سلوك المستخدم
   */
  private async analyzeUserBehavior(driverId: string): Promise<number> {
    try {
      // الحصول على إحصائيات السائق
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, last_login, verification_attempts')
        .eq('id', driverId)
        .single();
      
      if (!profile) return 0.5;
      
      let behaviorScore = 0.7; // نقطة بداية
      
      // عمر الحساب (الحسابات الأقدم = ثقة أكبر)
      const accountAge = Date.now() - new Date(profile.created_at).getTime();
      const ageDays = accountAge / (1000 * 60 * 60 * 24);
      
      if (ageDays > 30) behaviorScore += 0.1;
      if (ageDays > 90) behaviorScore += 0.1;
      if (ageDays > 365) behaviorScore += 0.1;
      
      // نشاط حديث (تسجيل دخول مؤخراً)
      if (profile.last_login) {
        const lastLoginAge = Date.now() - new Date(profile.last_login).getTime();
        const loginDays = lastLoginAge / (1000 * 60 * 60 * 24);
        
        if (loginDays < 7) behaviorScore += 0.05;
        if (loginDays < 1) behaviorScore += 0.05;
      }
      
      // عدد محاولات التحقق (محاولات كثيرة = مشبوه)
      const attempts = profile.verification_attempts || 0;
      if (attempts <= 2) behaviorScore += 0.1;
      else if (attempts > 5) behaviorScore -= 0.2;
      
      return Math.min(1.0, Math.max(0.0, behaviorScore));
      
    } catch (error) {
      console.warn('خطأ في تحليل السلوك:', error);
      return 0.5;
    }
  }

  /**
   * حساب النتيجة النهائية
   */
  private calculateFinalScore(scores: {
    historyScore: number;
    qualityScore: number;
    ocrScore: number;
    consistencyScore: number;
    behaviorScore: number;
  }): number {
    
    const weightedSum = 
      scores.historyScore * this.model.weights.historySuccess +
      scores.qualityScore * this.model.weights.imageQuality +
      scores.ocrScore * this.model.weights.ocrAccuracy +
      scores.consistencyScore * this.model.weights.documentConsistency +
      scores.behaviorScore * this.model.weights.userBehavior;
    
    // تطبيق دالة sigmoid للحصول على قيمة بين 0 و 1
    return 1 / (1 + Math.exp(-6 * (weightedSum - 0.5)));
  }

  /**
   * تحديد القرار المتوقع
   */
  private determinePredictedDecision(score: number): 'auto_approve' | 'auto_reject' | 'manual_review' {
    if (score >= this.model.thresholds.autoApprove) {
      return 'auto_approve';
    } else if (score <= this.model.thresholds.autoReject) {
      return 'auto_reject';
    } else {
      return 'manual_review';
    }
  }

  /**
   * تحليل العوامل المؤثرة
   */
  private analyzeFactors(scores: any, documentData: any): PredictionResult['analysis'] {
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];
    const riskFactors: string[] = [];
    
    // تحليل العوامل الإيجابية
    if (scores.historyScore > 0.8) positiveFactors.push('تاريخ موثوق للسائق');
    if (scores.qualityScore > 0.8) positiveFactors.push('جودة صورة ممتازة');
    if (scores.ocrScore > 0.8) positiveFactors.push('استخراج نص دقيق');
    if (scores.consistencyScore > 0.9) positiveFactors.push('تناسق مثالي في البيانات');
    if (scores.behaviorScore > 0.8) positiveFactors.push('سلوك مستخدم طبيعي');
    
    // تحليل العوامل السلبية
    if (scores.historyScore < 0.4) negativeFactors.push('تاريخ سيء في التحقق');
    if (scores.qualityScore < 0.5) negativeFactors.push('جودة صورة منخفضة');
    if (scores.ocrScore < 0.6) negativeFactors.push('صعوبة في قراءة النص');
    if (scores.consistencyScore < 0.7) negativeFactors.push('تناقضات في البيانات');
    if (scores.behaviorScore < 0.4) negativeFactors.push('سلوك مشبوه');
    
    // تحليل عوامل الخطر
    if (scores.consistencyScore < 0.5) riskFactors.push('تناقضات خطيرة في الهوية');
    if (scores.qualityScore < 0.3) riskFactors.push('صور غير واضحة قد تخفي معلومات');
    if (scores.behaviorScore < 0.3) riskFactors.push('احتمالية حساب مزيف');
    if (documentData.metadata?.retryCount > 3) riskFactors.push('محاولات متكررة مشبوهة');
    
    return {
      historyScore: scores.historyScore,
      qualityScore: scores.qualityScore,
      ocrScore: scores.ocrScore,
      consistencyScore: scores.consistencyScore,
      behaviorScore: scores.behaviorScore,
      positiveFactors,
      negativeFactors,
      riskFactors
    };
  }

  /**
   * توليد التوصيات
   */
  private async generateRecommendations(
    decision: string,
    confidence: number,
    analysis: any,
    documentData: any
  ): Promise<PredictionResult['recommendations']> {
    
    const recommendations: PredictionResult['recommendations'] = {
      action: '',
      priority: 'normal'
    };
    
    switch (decision) {
      case 'auto_approve':
        recommendations.action = 'موافقة تلقائية - جودة ممتازة';
        recommendations.priority = 'low';
        break;
        
      case 'auto_reject':
        recommendations.action = 'رفض تلقائي - جودة غير مقبولة';
        recommendations.priority = 'normal';
        recommendations.additionalChecks = ['فحص يدوي للأسباب', 'تحقق من هوية المستخدم'];
        break;
        
      case 'manual_review':
        recommendations.action = 'مراجعة يدوية مطلوبة';
        recommendations.priority = confidence < 0.4 ? 'high' : 'normal';
        recommendations.estimatedReviewTime = this.estimateReviewTime(analysis);
        recommendations.suggestedReviewer = await this.suggestBestReviewer(documentData.documentType);
        
        if (analysis.riskFactors.length > 0) {
          recommendations.priority = 'high';
          recommendations.additionalChecks = [
            'فحص دقيق للتناقضات',
            'التحقق من صحة الوثائق',
            'مراجعة تاريخ السائق'
          ];
        }
        break;
    }
    
    return recommendations;
  }

  /**
   * تحديث النموذج بناءً على النتائج الفعلية
   */
  async updateModelWithActualResult(
    verificationRequestId: string,
    actualDecision: 'approved' | 'rejected',
    reviewTime: number
  ): Promise<void> {
    
    try {
      // الحصول على التنبؤ السابق
      const { data: prediction } = await supabase
        .from('prediction_results')
        .select('*')
        .eq('verification_request_id', verificationRequestId)
        .single();
      
      if (!prediction) return;
      
      // حساب دقة التنبؤ
      const wasCorrect = this.wasPredictionCorrect(prediction.predicted_decision, actualDecision);
      
      // تحديث وزن النموذج
      if (!wasCorrect) {
        await this.adjustModelWeights(prediction, actualDecision);
      }
      
      // حفظ النتيجة للتعلم المستقبلي
      await supabase
        .from('prediction_results')
        .update({
          actual_decision: actualDecision,
          review_time: reviewTime,
          prediction_accuracy: wasCorrect ? 1 : 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', prediction.id);
      
      console.log(`📈 تم تحديث النموذج: التنبؤ ${wasCorrect ? 'صحيح' : 'خاطئ'}`);
      
    } catch (error) {
      console.error('خطأ في تحديث النموذج:', error);
    }
  }

  // دوال مساعدة...
  
  private async getDriverHistory(driverId: string): Promise<VerificationHistory[]> {
    const { data } = await supabase
      .from('verification_history')
      .select('*')
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    return data || [];
  }
  
  private async getDocumentTypeHistory(documentType: string): Promise<VerificationHistory[]> {
    const { data } = await supabase
      .from('verification_history')
      .select('*')
      .eq('document_type', documentType)
      .order('created_at', { ascending: false })
      .limit(100);
    
    return data || [];
  }
  
  private normalizeBrightness(brightness: number): number {
    // المدى المثالي للسطوع: 80-180
    if (brightness >= 80 && brightness <= 180) return 1.0;
    if (brightness >= 60 && brightness <= 200) return 0.8;
    if (brightness >= 40 && brightness <= 220) return 0.6;
    return 0.3;
  }
  
  private calculateResolutionScore(resolution: string): number {
    if (!resolution) return 0.5;
    
    const [width, height] = resolution.split('x').map(Number);
    const totalPixels = width * height;
    
    if (totalPixels >= 1920 * 1080) return 1.0;      // Full HD+
    if (totalPixels >= 1280 * 720) return 0.8;       // HD
    if (totalPixels >= 640 * 480) return 0.6;        // SD
    return 0.4;
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    // تنظيف النصوص
    const clean1 = str1.toLowerCase().trim();
    const clean2 = str2.toLowerCase().trim();
    
    if (clean1 === clean2) return 1.0;
    
    // خوارزمية Levenshtein distance مبسطة
    const longer = clean1.length > clean2.length ? clean1 : clean2;
    const shorter = clean1.length > clean2.length ? clean2 : clean1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private estimateReviewTime(analysis: any): number {
    let baseTime = 180; // 3 دقائق أساسية
    
    // إضافة وقت للمشاكل
    baseTime += analysis.negativeFactors.length * 60;
    baseTime += analysis.riskFactors.length * 120;
    
    // تقليل الوقت للحالات الجيدة
    if (analysis.positiveFactors.length > 3) {
      baseTime = Math.max(120, baseTime - 60);
    }
    
    return baseTime;
  }
  
  private async suggestBestReviewer(documentType: string): Promise<string> {
    const { data: reviewers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'reviewer')
      .eq('is_available', true)
      .eq('specialization', documentType)
      .limit(1);
    
    return reviewers?.[0]?.id || 'any_available';
  }
  
  private wasPredictionCorrect(predicted: string, actual: string): boolean {
    if (predicted === 'auto_approve' && actual === 'approved') return true;
    if (predicted === 'auto_reject' && actual === 'rejected') return true;
    if (predicted === 'manual_review') return true; // دائماً صحيح للمراجعة اليدوية
    return false;
  }
  
  private async adjustModelWeights(prediction: any, actualDecision: string): Promise<void> {
    // تعديل بسيط لأوزان النموذج بناءً على الخطأ
    console.log('🔧 تعديل أوزان النموذج...');
    
    // هنا يمكن تطبيق خوارزميات تعلم أكثر تعقيداً
    // مثل Gradient Descent أو Neural Networks
  }
  
  private async savePredictionResult(verificationRequestId: string, result: PredictionResult): Promise<void> {
    await supabase
      .from('prediction_results')
      .insert({
        verification_request_id: verificationRequestId,
        predicted_decision: result.predictedDecision,
        confidence: result.confidence,
        analysis: result.analysis,
        recommendations: result.recommendations,
        model_version: result.modelVersion,
        prediction_time: new Date(result.predictionTime).toISOString(),
        processing_time: result.processingTime
      });
  }
}

// تصدير instance واحد
export const predictiveReviewAI = new PredictiveReviewAI();
