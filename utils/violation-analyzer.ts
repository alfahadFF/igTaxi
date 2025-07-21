import { supabase } from './supabase';

/**
 * نظام تحليل المخالفات والتناقضات في الوثائق
 * يكتشف التزوير والأخطاء والتناقضات تلقائياً
 */

export interface ViolationRule {
  id: string;
  name: string;
  category: 'data_consistency' | 'document_authenticity' | 'format_compliance' | 'security_check';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // شروط التطبيق
  applicableDocuments: string[];
  requiredFields: string[];
  
  // معايير الفحص
  criteria: {
    type: 'regex' | 'format' | 'range' | 'cross_reference' | 'similarity' | 'custom';
    pattern?: string;
    expectedFormat?: string;
    validRange?: { min: any; max: any };
    referenceField?: string;
    similarityThreshold?: number;
    customFunction?: string;
  };
  
  // رسائل الخطأ
  errorMessages: {
    ar: string;
    en: string;
  };
  
  // الإجراءات المطلوبة
  actions: {
    blockSubmission: boolean;
    requireReview: boolean;
    escalateToAdmin: boolean;
    logSecurityEvent: boolean;
  };
}

export interface ViolationResult {
  ruleId: string;
  ruleName: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // تفاصيل المخالفة
  violation: {
    field: string;
    expectedValue?: any;
    actualValue: any;
    description: string;
    confidence: number; // 0-100
  };
  
  // السياق
  context: {
    documentType: string;
    relatedFields: Record<string, any>;
    crossReferences: any[];
  };
  
  // التوصيات
  recommendations: {
    action: 'fix_data' | 'resubmit_document' | 'manual_review' | 'contact_support';
    details: string;
    priority: number;
  };
  
  timestamp: string;
}

export interface AnalysisReport {
  verificationRequestId: string;
  documentType: string;
  
  // ملخص التحليل
  summary: {
    totalRulesChecked: number;
    violationsFound: number;
    criticalIssues: number;
    warningsCount: number;
    overallScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // المخالفات المكتشفة
  violations: ViolationResult[];
  
  // التحليل المتقدم
  patterns: {
    suspiciousPatterns: string[];
    dataInconsistencies: string[];
    formatAnomalies: string[];
    securityConcerns: string[];
  };
  
  // التوصيات النهائية
  finalRecommendations: {
    action: 'approve' | 'reject' | 'manual_review' | 'request_resubmission';
    reasons: string[];
    nextSteps: string[];
    estimatedReviewTime?: number;
  };
  
  // بيانات إضافية
  metadata: {
    analysisTime: number;
    rulesVersion: string;
    aiConfidence: number;
    processingDetails: any;
  };
  
  createdAt: string;
}

export class ViolationAnalyzer {
  
  private rules: ViolationRule[] = [
    // قواعد تناسق البيانات
    {
      id: 'national_id_format',
      name: 'تنسيق رقم الهوية الوطنية',
      category: 'format_compliance',
      severity: 'high',
      applicableDocuments: ['national_id'],
      requiredFields: ['nationalId'],
      criteria: {
        type: 'regex',
        pattern: '^[1-2][0-9]{9}$' // رقم سعودي: يبدأ بـ 1 أو 2 ويحتوي على 10 أرقام
      },
      errorMessages: {
        ar: 'تنسيق رقم الهوية الوطنية غير صحيح',
        en: 'Invalid national ID format'
      },
      actions: {
        blockSubmission: true,
        requireReview: true,
        escalateToAdmin: false,
        logSecurityEvent: true
      }
    },
    {
      id: 'age_consistency',
      name: 'تناسق العمر',
      category: 'data_consistency',
      severity: 'medium',
      applicableDocuments: ['national_id', 'driving_license'],
      requiredFields: ['birthDate'],
      criteria: {
        type: 'range',
        validRange: { min: 18, max: 80 } // عمر السائق
      },
      errorMessages: {
        ar: 'العمر المحسوب غير منطقي للسائق',
        en: 'Calculated age is not reasonable for driver'
      },
      actions: {
        blockSubmission: false,
        requireReview: true,
        escalateToAdmin: false,
        logSecurityEvent: false
      }
    },
    {
      id: 'name_consistency',
      name: 'تناسق الاسم بين الوثائق',
      category: 'data_consistency',
      severity: 'high',
      applicableDocuments: ['national_id', 'driving_license'],
      requiredFields: ['name'],
      criteria: {
        type: 'cross_reference',
        referenceField: 'name',
        similarityThreshold: 0.8
      },
      errorMessages: {
        ar: 'عدم تطابق الاسم بين الوثائق',
        en: 'Name mismatch between documents'
      },
      actions: {
        blockSubmission: true,
        requireReview: true,
        escalateToAdmin: true,
        logSecurityEvent: true
      }
    },
    {
      id: 'document_expiry',
      name: 'انتهاء صلاحية الوثيقة',
      category: 'format_compliance',
      severity: 'critical',
      applicableDocuments: ['national_id', 'driving_license'],
      requiredFields: ['expiryDate'],
      criteria: {
        type: 'custom',
        customFunction: 'checkDocumentExpiry'
      },
      errorMessages: {
        ar: 'الوثيقة منتهية الصلاحية',
        en: 'Document has expired'
      },
      actions: {
        blockSubmission: true,
        requireReview: false,
        escalateToAdmin: false,
        logSecurityEvent: false
      }
    },
    {
      id: 'duplicate_detection',
      name: 'كشف الوثائق المكررة',
      category: 'security_check',
      severity: 'critical',
      applicableDocuments: ['all'],
      requiredFields: ['nationalId', 'documentHash'],
      criteria: {
        type: 'custom',
        customFunction: 'checkDuplicateDocument'
      },
      errorMessages: {
        ar: 'هذه الوثيقة مستخدمة من قبل مستخدم آخر',
        en: 'This document is already used by another user'
      },
      actions: {
        blockSubmission: true,
        requireReview: true,
        escalateToAdmin: true,
        logSecurityEvent: true
      }
    },
    {
      id: 'image_manipulation',
      name: 'كشف تعديل الصورة',
      category: 'document_authenticity',
      severity: 'critical',
      applicableDocuments: ['all'],
      requiredFields: ['imageMetadata'],
      criteria: {
        type: 'custom',
        customFunction: 'detectImageManipulation'
      },
      errorMessages: {
        ar: 'تم اكتشاف تعديل في الصورة',
        en: 'Image manipulation detected'
      },
      actions: {
        blockSubmission: true,
        requireReview: true,
        escalateToAdmin: true,
        logSecurityEvent: true
      }
    }
  ];

  /**
   * تحليل شامل للمخالفات والتناقضات
   */
  async analyzeViolations(
    verificationRequestId: string,
    documentData: any,
    allUserDocuments: any[] = []
  ): Promise<AnalysisReport> {
    
    try {
      console.log(`🔍 بدء تحليل المخالفات للطلب: ${verificationRequestId}`);
      
      const startTime = Date.now();
      const violations: ViolationResult[] = [];
      
      // تطبيق جميع القواعد المناسبة
      for (const rule of this.rules) {
        if (this.isRuleApplicable(rule, documentData.documentType)) {
          const ruleViolations = await this.applyRule(
            rule,
            documentData,
            allUserDocuments,
            verificationRequestId
          );
          violations.push(...ruleViolations);
        }
      }
      
      // تحليل الأنماط المشبوهة
      const patterns = await this.analyzePatterns(documentData, violations);
      
      // حساب النتيجة الإجمالية
      const summary = this.calculateSummary(violations);
      
      // توليد التوصيات النهائية
      const finalRecommendations = this.generateFinalRecommendations(
        violations,
        patterns,
        summary
      );
      
      const analysisTime = Date.now() - startTime;
      
      const report: AnalysisReport = {
        verificationRequestId,
        documentType: documentData.documentType,
        summary,
        violations,
        patterns,
        finalRecommendations,
        metadata: {
          analysisTime,
          rulesVersion: '1.0.0',
          aiConfidence: this.calculateAIConfidence(violations),
          processingDetails: {
            rulesApplied: this.rules.filter(r => 
              this.isRuleApplicable(r, documentData.documentType)
            ).length,
            documentFields: Object.keys(documentData.extractedData || {}).length
          }
        },
        createdAt: new Date().toISOString()
      };
      
      // حفظ التقرير
      await this.saveAnalysisReport(report);
      
      console.log(`✅ انتهى تحليل المخالفات: ${violations.length} مخالفة - النتيجة: ${summary.overallScore}`);
      
      return report;
      
    } catch (error) {
      console.error('خطأ في تحليل المخالفات:', error);
      
      // إرجاع تقرير آمن في حالة الخطأ
      return this.createSafeReport(verificationRequestId, documentData.documentType);
    }
  }

  /**
   * تطبيق قاعدة واحدة
   */
  private async applyRule(
    rule: ViolationRule,
    documentData: any,
    allUserDocuments: any[],
    verificationRequestId: string
  ): Promise<ViolationResult[]> {
    
    const violations: ViolationResult[] = [];
    
    try {
      // التحقق من وجود الحقول المطلوبة
      const missingFields = rule.requiredFields.filter(field => 
        !documentData.extractedData[field]
      );
      
      if (missingFields.length > 0) {
        // تجاهل القاعدة إذا كانت الحقول مفقودة
        return violations;
      }
      
      // تطبيق القاعدة حسب النوع
      let violationFound = false;
      let actualValue: any;
      let expectedValue: any;
      let confidence = 95;
      
      switch (rule.criteria.type) {
        case 'regex':
          violationFound = await this.checkRegexRule(rule, documentData);
          actualValue = documentData.extractedData[rule.requiredFields[0]];
          break;
          
        case 'format':
          violationFound = await this.checkFormatRule(rule, documentData);
          actualValue = documentData.extractedData[rule.requiredFields[0]];
          break;
          
        case 'range':
          const rangeResult = await this.checkRangeRule(rule, documentData);
          violationFound = rangeResult.violation;
          actualValue = rangeResult.actualValue;
          expectedValue = rangeResult.expectedRange;
          break;
          
        case 'cross_reference':
          const crossResult = await this.checkCrossReferenceRule(
            rule,
            documentData,
            allUserDocuments
          );
          violationFound = crossResult.violation;
          actualValue = crossResult.actualValue;
          expectedValue = crossResult.expectedValue;
          confidence = crossResult.confidence;
          break;
          
        case 'similarity':
          const similarityResult = await this.checkSimilarityRule(rule, documentData);
          violationFound = similarityResult.violation;
          actualValue = similarityResult.actualValue;
          confidence = similarityResult.confidence;
          break;
          
        case 'custom':
          const customResult = await this.checkCustomRule(
            rule,
            documentData,
            allUserDocuments,
            verificationRequestId
          );
          violationFound = customResult.violation;
          actualValue = customResult.actualValue;
          expectedValue = customResult.expectedValue;
          confidence = customResult.confidence;
          break;
      }
      
      // إنشاء مخالفة إذا وجدت
      if (violationFound) {
        const violation: ViolationResult = {
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          violation: {
            field: rule.requiredFields[0],
            expectedValue,
            actualValue,
            description: rule.errorMessages.ar,
            confidence
          },
          context: {
            documentType: documentData.documentType,
            relatedFields: this.getRelatedFields(rule, documentData),
            crossReferences: this.getCrossReferences(rule, allUserDocuments)
          },
          recommendations: this.generateRuleRecommendations(rule, violationFound),
          timestamp: new Date().toISOString()
        };
        
        violations.push(violation);
      }
      
    } catch (error) {
      console.warn(`خطأ في تطبيق القاعدة ${rule.id}:`, error);
    }
    
    return violations;
  }

  /**
   * فحص قاعدة التعبير النمطي
   */
  private async checkRegexRule(rule: ViolationRule, documentData: any): Promise<boolean> {
    const value = documentData.extractedData[rule.requiredFields[0]];
    if (!value || !rule.criteria.pattern) return false;
    
    const regex = new RegExp(rule.criteria.pattern);
    return !regex.test(value.toString());
  }

  /**
   * فحص قاعدة التنسيق
   */
  private async checkFormatRule(rule: ViolationRule, documentData: any): Promise<boolean> {
    const value = documentData.extractedData[rule.requiredFields[0]];
    if (!value || !rule.criteria.expectedFormat) return false;
    
    // فحص التنسيق حسب النوع
    switch (rule.criteria.expectedFormat) {
      case 'date':
        return !this.isValidDate(value);
      case 'phone':
        return !this.isValidPhone(value);
      case 'email':
        return !this.isValidEmail(value);
      default:
        return false;
    }
  }

  /**
   * فحص قاعدة النطاق
   */
  private async checkRangeRule(rule: ViolationRule, documentData: any): Promise<{
    violation: boolean;
    actualValue: any;
    expectedRange: any;
  }> {
    
    const value = documentData.extractedData[rule.requiredFields[0]];
    const range = rule.criteria.validRange;
    
    if (!value || !range) {
      return { violation: false, actualValue: value, expectedRange: range };
    }
    
    let actualValue = value;
    
    // حساب العمر إذا كان التاريخ هو تاريخ الميلاد
    if (rule.requiredFields[0] === 'birthDate') {
      const birthDate = new Date(value);
      const today = new Date();
      actualValue = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    }
    
    const violation = actualValue < range.min || actualValue > range.max;
    
    return {
      violation,
      actualValue,
      expectedRange: `${range.min} - ${range.max}`
    };
  }

  /**
   * فحص قاعدة المرجعية المتقاطعة
   */
  private async checkCrossReferenceRule(
    rule: ViolationRule,
    documentData: any,
    allUserDocuments: any[]
  ): Promise<{
    violation: boolean;
    actualValue: any;
    expectedValue: any;
    confidence: number;
  }> {
    
    const currentValue = documentData.extractedData[rule.requiredFields[0]];
    const referenceField = rule.criteria.referenceField || rule.requiredFields[0];
    
    // البحث في الوثائق الأخرى
    const referenceValues = allUserDocuments
      .filter(doc => doc.documentType !== documentData.documentType)
      .map(doc => doc.extractedData?.[referenceField])
      .filter(val => val);
    
    if (referenceValues.length === 0) {
      return {
        violation: false,
        actualValue: currentValue,
        expectedValue: null,
        confidence: 0
      };
    }
    
    // فحص التشابه
    const threshold = rule.criteria.similarityThreshold || 0.8;
    let maxSimilarity = 0;
    let bestMatch = '';
    
    for (const refValue of referenceValues) {
      const similarity = this.calculateStringSimilarity(
        currentValue?.toString() || '',
        refValue?.toString() || ''
      );
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = refValue;
      }
    }
    
    const violation = maxSimilarity < threshold;
    const confidence = Math.round(maxSimilarity * 100);
    
    return {
      violation,
      actualValue: currentValue,
      expectedValue: bestMatch,
      confidence
    };
  }

  /**
   * فحص قاعدة التشابه
   */
  private async checkSimilarityRule(rule: ViolationRule, documentData: any): Promise<{
    violation: boolean;
    actualValue: any;
    confidence: number;
  }> {
    
    // هذه الدالة تحتاج إلى تخصيص أكثر حسب نوع التشابه المطلوب
    return {
      violation: false,
      actualValue: documentData.extractedData[rule.requiredFields[0]],
      confidence: 100
    };
  }

  /**
   * فحص القواعد المخصصة
   */
  private async checkCustomRule(
    rule: ViolationRule,
    documentData: any,
    allUserDocuments: any[],
    verificationRequestId: string
  ): Promise<{
    violation: boolean;
    actualValue: any;
    expectedValue?: any;
    confidence: number;
  }> {
    
    switch (rule.criteria.customFunction) {
      case 'checkDocumentExpiry':
        return await this.checkDocumentExpiry(documentData);
        
      case 'checkDuplicateDocument':
        return await this.checkDuplicateDocument(documentData, verificationRequestId);
        
      case 'detectImageManipulation':
        return await this.detectImageManipulation(documentData);
        
      default:
        return {
          violation: false,
          actualValue: null,
          confidence: 0
        };
    }
  }

  /**
   * فحص انتهاء صلاحية الوثيقة
   */
  private async checkDocumentExpiry(documentData: any): Promise<{
    violation: boolean;
    actualValue: any;
    expectedValue?: any;
    confidence: number;
  }> {
    
    const expiryDate = documentData.extractedData.expiryDate;
    if (!expiryDate) {
      return { violation: false, actualValue: null, confidence: 0 };
    }
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const violation = expiry <= today;
    
    return {
      violation,
      actualValue: expiryDate,
      expectedValue: 'تاريخ مستقبلي',
      confidence: 100
    };
  }

  /**
   * فحص الوثائق المكررة
   */
  private async checkDuplicateDocument(
    documentData: any,
    verificationRequestId: string
  ): Promise<{
    violation: boolean;
    actualValue: any;
    expectedValue?: any;
    confidence: number;
  }> {
    
    const nationalId = documentData.extractedData.nationalId;
    if (!nationalId) {
      return { violation: false, actualValue: null, confidence: 0 };
    }
    
    // البحث عن وثائق مشابهة
    const { data: existingDocs } = await supabase
      .from('verification_requests')
      .select('id, driver_id, extracted_data')
      .neq('id', verificationRequestId)
      .eq('status', 'approved');
    
    if (!existingDocs) {
      return { violation: false, actualValue: nationalId, confidence: 100 };
    }
    
    // البحث عن نفس الهوية
    const duplicateFound = existingDocs.some(doc => 
      doc.extracted_data?.nationalId === nationalId
    );
    
    return {
      violation: duplicateFound,
      actualValue: nationalId,
      expectedValue: 'هوية فريدة',
      confidence: duplicateFound ? 100 : 95
    };
  }

  /**
   * كشف تعديل الصورة
   */
  private async detectImageManipulation(documentData: any): Promise<{
    violation: boolean;
    actualValue: any;
    expectedValue?: any;
    confidence: number;
  }> {
    
    const metadata = documentData.imageMetadata;
    if (!metadata) {
      return { violation: false, actualValue: null, confidence: 0 };
    }
    
    let suspiciousSignals = 0;
    let totalChecks = 0;
    
    // فحص البرامج المشبوهة
    if (metadata.software) {
      totalChecks++;
      const suspiciousTools = ['photoshop', 'gimp', 'editor', 'paint', 'manipulator'];
      if (suspiciousTools.some(tool => 
        metadata.software.toLowerCase().includes(tool)
      )) {
        suspiciousSignals++;
      }
    }
    
    // فحص معدل الضغط غير الطبيعي
    if (metadata.compression) {
      totalChecks++;
      if (metadata.compression < 0.5 || metadata.compression > 0.95) {
        suspiciousSignals++;
      }
    }
    
    // فحص التعديلات في البيانات الوصفية
    if (metadata.lastModified && metadata.created) {
      totalChecks++;
      const modifiedTime = new Date(metadata.lastModified).getTime();
      const createdTime = new Date(metadata.created).getTime();
      const timeDiff = modifiedTime - createdTime;
      
      // إذا تم التعديل بعد الإنشاء بأكثر من دقيقة
      if (timeDiff > 60000) {
        suspiciousSignals++;
      }
    }
    
    const confidence = totalChecks > 0 ? (suspiciousSignals / totalChecks) * 100 : 0;
    const violation = confidence > 50; // عتبة 50% للاشتباه
    
    return {
      violation,
      actualValue: metadata,
      expectedValue: 'صورة أصلية غير معدلة',
      confidence: Math.round(confidence)
    };
  }

  // دوال مساعدة...
  
  private isRuleApplicable(rule: ViolationRule, documentType: string): boolean {
    return rule.applicableDocuments.includes('all') || 
           rule.applicableDocuments.includes(documentType);
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
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
  
  private isValidDate(value: any): boolean {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }
  
  private isValidPhone(value: any): boolean {
    const phoneRegex = /^(\+966|0)?[5][0-9]{8}$/;
    return phoneRegex.test(value?.toString() || '');
  }
  
  private isValidEmail(value: any): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value?.toString() || '');
  }
  
  private getRelatedFields(rule: ViolationRule, documentData: any): Record<string, any> {
    const related: Record<string, any> = {};
    
    // جمع الحقول ذات الصلة
    for (const field of rule.requiredFields) {
      if (documentData.extractedData[field]) {
        related[field] = documentData.extractedData[field];
      }
    }
    
    return related;
  }
  
  private getCrossReferences(rule: ViolationRule, allUserDocuments: any[]): any[] {
    if (rule.criteria.type !== 'cross_reference') return [];
    
    return allUserDocuments.map(doc => ({
      documentType: doc.documentType,
      referenceValue: doc.extractedData?.[rule.criteria.referenceField || '']
    })).filter(ref => ref.referenceValue);
  }
  
  private generateRuleRecommendations(
    rule: ViolationRule,
    violationFound: boolean
  ): ViolationResult['recommendations'] {
    
    if (!violationFound) {
      return {
        action: 'fix_data',
        details: 'لا توجد مشكلة',
        priority: 1
      };
    }
    
    // توصيات حسب نوع القاعدة
    switch (rule.category) {
      case 'format_compliance':
        return {
          action: 'fix_data',
          details: 'تصحيح تنسيق البيانات',
          priority: rule.severity === 'critical' ? 5 : 3
        };
        
      case 'data_consistency':
        return {
          action: 'manual_review',
          details: 'مراجعة تناسق البيانات',
          priority: 4
        };
        
      case 'document_authenticity':
        return {
          action: 'resubmit_document',
          details: 'إعادة تقديم وثيقة أصلية',
          priority: 5
        };
        
      case 'security_check':
        return {
          action: 'contact_support',
          details: 'التواصل مع الدعم الفني',
          priority: 5
        };
        
      default:
        return {
          action: 'manual_review',
          details: 'مراجعة عامة مطلوبة',
          priority: 3
        };
    }
  }
  
  private async analyzePatterns(
    documentData: any,
    violations: ViolationResult[]
  ): Promise<AnalysisReport['patterns']> {
    
    const patterns: AnalysisReport['patterns'] = {
      suspiciousPatterns: [],
      dataInconsistencies: [],
      formatAnomalies: [],
      securityConcerns: []
    };
    
    // تحليل الأنماط بناءً على المخالفات
    violations.forEach(violation => {
      switch (violation.category) {
        case 'security_check':
          patterns.securityConcerns.push(violation.violation.description);
          break;
        case 'document_authenticity':
          patterns.suspiciousPatterns.push(violation.violation.description);
          break;
        case 'data_consistency':
          patterns.dataInconsistencies.push(violation.violation.description);
          break;
        case 'format_compliance':
          patterns.formatAnomalies.push(violation.violation.description);
          break;
      }
    });
    
    return patterns;
  }
  
  private calculateSummary(violations: ViolationResult[]): AnalysisReport['summary'] {
    const criticalIssues = violations.filter(v => v.severity === 'critical').length;
    const warningsCount = violations.filter(v => 
      v.severity === 'low' || v.severity === 'medium'
    ).length;
    
    // حساب النتيجة الإجمالية
    let score = 100;
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });
    
    score = Math.max(0, score);
    
    // تحديد مستوى المخاطر
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalIssues > 0) riskLevel = 'critical';
    else if (score < 50) riskLevel = 'high';
    else if (score < 70) riskLevel = 'medium';
    
    return {
      totalRulesChecked: this.rules.length,
      violationsFound: violations.length,
      criticalIssues,
      warningsCount,
      overallScore: score,
      riskLevel
    };
  }
  
  private generateFinalRecommendations(
    violations: ViolationResult[],
    patterns: AnalysisReport['patterns'],
    summary: AnalysisReport['summary']
  ): AnalysisReport['finalRecommendations'] {
    
    const reasons: string[] = [];
    const nextSteps: string[] = [];
    let action: 'approve' | 'reject' | 'manual_review' | 'request_resubmission' = 'approve';
    
    // تحديد الإجراء بناءً على شدة المخالفات
    if (summary.criticalIssues > 0) {
      action = 'reject';
      reasons.push(`${summary.criticalIssues} مخالفة حرجة`);
      nextSteps.push('إصلاح المشاكل الحرجة');
      nextSteps.push('إعادة تقديم الوثائق');
    } else if (summary.riskLevel === 'high') {
      action = 'manual_review';
      reasons.push('مستوى مخاطر عالي');
      nextSteps.push('مراجعة بشرية مطلوبة');
    } else if (summary.violationsFound > 0) {
      action = 'request_resubmission';
      reasons.push(`${summary.violationsFound} مخالفة متوسطة`);
      nextSteps.push('تصحيح البيانات');
    }
    
    // إضافة أسباب مفصلة
    if (patterns.securityConcerns.length > 0) {
      reasons.push('مخاوف أمنية');
    }
    if (patterns.suspiciousPatterns.length > 0) {
      reasons.push('أنماط مشبوهة');
    }
    
    return {
      action,
      reasons,
      nextSteps,
      estimatedReviewTime: action === 'manual_review' ? 
        Math.min(60, violations.length * 5) : undefined
    };
  }
  
  private calculateAIConfidence(violations: ViolationResult[]): number {
    if (violations.length === 0) return 95;
    
    const avgConfidence = violations.reduce((sum, v) => 
      sum + v.violation.confidence, 0
    ) / violations.length;
    
    return Math.round(avgConfidence);
  }
  
  private async saveAnalysisReport(report: AnalysisReport): Promise<void> {
    await supabase
      .from('violation_analysis_reports')
      .insert({
        verification_request_id: report.verificationRequestId,
        document_type: report.documentType,
        summary: report.summary,
        violations: report.violations,
        patterns: report.patterns,
        final_recommendations: report.finalRecommendations,
        metadata: report.metadata,
        created_at: report.createdAt
      });
  }
  
  private createSafeReport(
    verificationRequestId: string,
    documentType: string
  ): AnalysisReport {
    return {
      verificationRequestId,
      documentType,
      summary: {
        totalRulesChecked: 0,
        violationsFound: 1,
        criticalIssues: 1,
        warningsCount: 0,
        overallScore: 0,
        riskLevel: 'critical'
      },
      violations: [{
        ruleId: 'system_error',
        ruleName: 'خطأ في النظام',
        category: 'security_check',
        severity: 'critical',
        violation: {
          field: 'system',
          actualValue: 'error',
          description: 'خطأ في نظام التحليل',
          confidence: 100
        },
        context: {
          documentType,
          relatedFields: {},
          crossReferences: []
        },
        recommendations: {
          action: 'contact_support',
          details: 'الاتصال بالدعم الفني',
          priority: 5
        },
        timestamp: new Date().toISOString()
      }],
      patterns: {
        suspiciousPatterns: ['خطأ في النظام'],
        dataInconsistencies: [],
        formatAnomalies: [],
        securityConcerns: ['فشل التحليل']
      },
      finalRecommendations: {
        action: 'manual_review',
        reasons: ['خطأ في نظام التحليل'],
        nextSteps: ['مراجعة يدوية مطلوبة', 'فحص حالة النظام']
      },
      metadata: {
        analysisTime: 0,
        rulesVersion: '1.0.0',
        aiConfidence: 0,
        processingDetails: { error: true }
      },
      createdAt: new Date().toISOString()
    };
  }
}

// تصدير instance واحد
export const violationAnalyzer = new ViolationAnalyzer();
