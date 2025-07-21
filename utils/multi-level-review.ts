import { supabase } from './supabase';
import { notificationService } from './notification-service';
import { predictiveReviewAI } from './predictive-ai';

/**
 * نظام المراجعة متعدد المستويات
 * آلي ← بشري ← إداري
 */

export interface ReviewLevel {
  id: string;
  name: string;
  description: string;
  order: number;
  
  // شروط التفعيل
  triggers: {
    documentTypes: string[];
    riskLevels: string[];
    aiConfidence: { min: number; max: number };
    userCategories: string[];
  };
  
  // معايير المراجعة
  criteria: {
    requiredApprovals: number;
    timeoutMinutes: number;
    escalationThreshold: number;
    allowSkip: boolean;
  };
  
  // المراجعون المؤهلون
  reviewers: {
    roles: string[];
    specializations: string[];
    minimumExperience: number;
    requiredCertifications: string[];
  };
  
  // إعدادات الإصعاد
  escalation: {
    autoEscalateAfter: number; // بالدقائق
    escalateOnFailure: boolean;
    notifyOnTimeout: boolean;
    requireReason: boolean;
  };
}

export interface ReviewStage {
  id: string;
  verificationRequestId: string;
  levelId: string;
  order: number;
  
  // حالة المرحلة
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'escalated' | 'failed';
  
  // معلومات المراجع
  assignedTo?: string;
  reviewerId?: string;
  startedAt?: string;
  completedAt?: string;
  
  // نتائج المراجعة
  decision?: 'approve' | 'reject' | 'escalate' | 'request_more_info';
  confidence?: number;
  notes?: string;
  tags?: string[];
  
  // بيانات إضافية
  metadata: {
    autoAssigned: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    estimatedTime: number;
    actualTime?: number;
    retryCount: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWorkflow {
  id: string;
  verificationRequestId: string;
  driverId: string;
  documentType: string;
  
  // الحالة العامة
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  currentStage: number;
  totalStages: number;
  
  // إعدادات التدفق
  workflow: {
    levels: ReviewLevel[];
    allowParallel: boolean;
    requireConsensus: boolean;
    majorityThreshold: number;
  };
  
  // التوقيتات
  startedAt: string;
  estimatedCompletion?: string;
  actualCompletion?: string;
  totalTime?: number;
  
  // النتائج النهائية
  finalDecision?: 'approved' | 'rejected' | 'requires_resubmission';
  finalConfidence?: number;
  consensusScore?: number;
  
  // المراجعون المشاركون
  participants: {
    reviewerId: string;
    role: string;
    contribution: number; // 0-100%
    agreement: boolean;
  }[];
  
  createdAt: string;
  updatedAt: string;
}

export class MultiLevelReviewSystem {
  
  private defaultLevels: ReviewLevel[] = [
    {
      id: 'ai_auto',
      name: 'المراجعة الآلية',
      description: 'فحص تلقائي باستخدام الذكاء الاصطناعي',
      order: 1,
      triggers: {
        documentTypes: ['all'],
        riskLevels: ['low', 'medium'],
        aiConfidence: { min: 0, max: 100 },
        userCategories: ['all']
      },
      criteria: {
        requiredApprovals: 1,
        timeoutMinutes: 5,
        escalationThreshold: 70,
        allowSkip: false
      },
      reviewers: {
        roles: ['ai_system'],
        specializations: ['all'],
        minimumExperience: 0,
        requiredCertifications: []
      },
      escalation: {
        autoEscalateAfter: 5,
        escalateOnFailure: true,
        notifyOnTimeout: false,
        requireReason: false
      }
    },
    {
      id: 'human_basic',
      name: 'المراجعة البشرية الأساسية',
      description: 'مراجعة بواسطة مراجع بشري مؤهل',
      order: 2,
      triggers: {
        documentTypes: ['national_id', 'driving_license'],
        riskLevels: ['medium', 'high'],
        aiConfidence: { min: 30, max: 85 },
        userCategories: ['regular', 'new']
      },
      criteria: {
        requiredApprovals: 1,
        timeoutMinutes: 30,
        escalationThreshold: 85,
        allowSkip: false
      },
      reviewers: {
        roles: ['reviewer', 'senior_reviewer'],
        specializations: ['document_verification'],
        minimumExperience: 6, // بالأشهر
        requiredCertifications: ['basic_verification']
      },
      escalation: {
        autoEscalateAfter: 30,
        escalateOnFailure: true,
        notifyOnTimeout: true,
        requireReason: true
      }
    },
    {
      id: 'senior_review',
      name: 'المراجعة المتقدمة',
      description: 'مراجعة بواسطة مراجع كبير للحالات المعقدة',
      order: 3,
      triggers: {
        documentTypes: ['all'],
        riskLevels: ['high', 'critical'],
        aiConfidence: { min: 0, max: 85 },
        userCategories: ['suspicious', 'flagged']
      },
      criteria: {
        requiredApprovals: 1,
        timeoutMinutes: 60,
        escalationThreshold: 95,
        allowSkip: true
      },
      reviewers: {
        roles: ['senior_reviewer', 'specialist'],
        specializations: ['fraud_detection', 'document_expert'],
        minimumExperience: 24, // سنتان
        requiredCertifications: ['advanced_verification', 'fraud_detection']
      },
      escalation: {
        autoEscalateAfter: 60,
        escalateOnFailure: true,
        notifyOnTimeout: true,
        requireReason: true
      }
    },
    {
      id: 'admin_final',
      name: 'المراجعة الإدارية النهائية',
      description: 'مراجعة إدارية للحالات الحرجة والاستثنائية',
      order: 4,
      triggers: {
        documentTypes: ['all'],
        riskLevels: ['critical'],
        aiConfidence: { min: 0, max: 70 },
        userCategories: ['flagged', 'high_risk']
      },
      criteria: {
        requiredApprovals: 2, // يتطلب موافقة مديرين
        timeoutMinutes: 240, // 4 ساعات
        escalationThreshold: 100,
        allowSkip: false
      },
      reviewers: {
        roles: ['admin', 'manager'],
        specializations: ['all'],
        minimumExperience: 48, // 4 سنوات
        requiredCertifications: ['management', 'final_decision']
      },
      escalation: {
        autoEscalateAfter: 240,
        escalateOnFailure: false, // لا يوجد إصعاد بعد الإدارة
        notifyOnTimeout: true,
        requireReason: true
      }
    }
  ];

  /**
   * بدء سير عمل المراجعة متعدد المستويات
   */
  async initiateReviewWorkflow(
    verificationRequestId: string,
    driverId: string,
    documentType: string,
    documentData: any
  ): Promise<ReviewWorkflow> {
    
    try {
      console.log(`🔄 بدء سير مراجعة متعدد المستويات للطلب: ${verificationRequestId}`);
      
      // تحديد المستويات المطلوبة
      const requiredLevels = await this.determineRequiredLevels(
        driverId,
        documentType,
        documentData
      );
      
      console.log(`📋 تم تحديد ${requiredLevels.length} مستويات مراجعة`);
      
      // إنشاء سير العمل
      const workflow: ReviewWorkflow = {
        id: `workflow_${Date.now()}`,
        verificationRequestId,
        driverId,
        documentType,
        status: 'pending',
        currentStage: 1,
        totalStages: requiredLevels.length,
        workflow: {
          levels: requiredLevels,
          allowParallel: false, // تتابعي بشكل افتراضي
          requireConsensus: requiredLevels.length > 2,
          majorityThreshold: 60
        },
        startedAt: new Date().toISOString(),
        participants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // حفظ سير العمل
      await this.saveWorkflow(workflow);
      
      // إنشاء مراحل المراجعة
      const stages = await this.createReviewStages(workflow);
      
      // بدء المرحلة الأولى
      await this.startNextStage(workflow.id);
      
      console.log(`✅ تم إنشاء سير المراجعة بنجاح مع ${stages.length} مراحل`);
      
      return workflow;
      
    } catch (error) {
      console.error('خطأ في بدء سير المراجعة:', error);
      throw error;
    }
  }

  /**
   * معالجة مرحلة مراجعة واحدة
   */
  async processReviewStage(
    stageId: string,
    reviewerId: string,
    decision: 'approve' | 'reject' | 'escalate' | 'request_more_info',
    notes?: string,
    confidence?: number
  ): Promise<void> {
    
    try {
      console.log(`🔍 معالجة مرحلة المراجعة: ${stageId} بواسطة ${reviewerId}`);
      
      // الحصول على معلومات المرحلة
      const stage = await this.getReviewStage(stageId);
      if (!stage) {
        throw new Error('مرحلة المراجعة غير موجودة');
      }
      
      // التحقق من صلاحية المراجع
      const canReview = await this.canReviewerHandleStage(reviewerId, stage);
      if (!canReview) {
        throw new Error('المراجع غير مؤهل لهذه المرحلة');
      }
      
      // تحديث المرحلة
      const updatedStage = await this.updateStageResult(
        stageId,
        reviewerId,
        decision,
        notes,
        confidence
      );
      
      // الحصول على سير العمل
      const workflow = await this.getWorkflow(stage.verificationRequestId);
      if (!workflow) return;
      
      // تحديد الخطوة التالية
      const nextAction = await this.determineNextAction(workflow, updatedStage);
      
      await this.executeNextAction(workflow, nextAction);
      
      console.log(`✅ تم معالجة المرحلة بنجاح - القرار: ${decision}`);
      
    } catch (error) {
      console.error('خطأ في معالجة مرحلة المراجعة:', error);
      throw error;
    }
  }

  /**
   * تنفيذ المراجعة الآلية
   */
  async performAutomatedReview(
    stageId: string,
    documentData: any
  ): Promise<void> {
    
    try {
      console.log(`🤖 بدء المراجعة الآلية للمرحلة: ${stageId}`);
      
      const stage = await this.getReviewStage(stageId);
      if (!stage) return;
      
      // تشغيل الذكاء الاصطناعي
      const aiResult = await predictiveReviewAI.predictReviewDecision(
        stage.verificationRequestId,
        await this.getDriverIdFromRequest(stage.verificationRequestId),
        documentData
      );
      
      // تحويل نتيجة الذكاء الاصطناعي إلى قرار
      let decision: 'approve' | 'reject' | 'escalate';
      let notes = '';
      
      switch (aiResult.predictedDecision) {
        case 'auto_approve':
          decision = 'approve';
          notes = `موافقة تلقائية - ثقة: ${Math.round(aiResult.confidence * 100)}%`;
          break;
          
        case 'auto_reject':
          decision = 'reject';
          notes = `رفض تلقائي - أسباب: ${aiResult.analysis.negativeFactors.join(', ')}`;
          break;
          
        case 'manual_review':
        default:
          decision = 'escalate';
          notes = `يتطلب مراجعة بشرية - ثقة: ${Math.round(aiResult.confidence * 100)}%`;
          break;
      }
      
      // حفظ نتيجة المراجعة الآلية
      await this.updateStageResult(
        stageId,
        'ai_system',
        decision,
        notes,
        aiResult.confidence
      );
      
      console.log(`🤖 انتهت المراجعة الآلية: ${decision}`);
      
    } catch (error) {
      console.error('خطأ في المراجعة الآلية:', error);
      
      // تصعيد في حالة فشل النظام الآلي
      await this.updateStageResult(
        stageId,
        'ai_system',
        'escalate',
        'خطأ في النظام الآلي - يتطلب مراجعة بشرية',
        0
      );
    }
  }

  /**
   * تعيين مراجع لمرحلة معينة
   */
  async assignReviewerToStage(
    stageId: string,
    preferredReviewerId?: string
  ): Promise<string | null> {
    
    try {
      const stage = await this.getReviewStage(stageId);
      if (!stage) return null;
      
      const level = this.defaultLevels.find(l => l.id === stage.levelId);
      if (!level) return null;
      
      let reviewerId: string | null = null;
      
      // استخدام المراجع المحدد إذا كان مؤهلاً
      if (preferredReviewerId) {
        const canHandle = await this.canReviewerHandleLevel(preferredReviewerId, level);
        if (canHandle) {
          reviewerId = preferredReviewerId;
        }
      }
      
      // البحث عن مراجع متاح
      if (!reviewerId) {
        reviewerId = await this.findAvailableReviewer(level, stage);
      }
      
      if (reviewerId) {
        // تعيين المراجع
        await this.assignReviewer(stageId, reviewerId);
        
        // إرسال إشعار
        await notificationService.notifyReviewersForManualReview(
          stage.verificationRequestId,
          [await this.getDocumentTypeFromRequest(stage.verificationRequestId)],
          stage.metadata.priority === 'urgent' ? 'high' : 'normal'
        );
        
        console.log(`👤 تم تعيين المراجع ${reviewerId} للمرحلة ${stageId}`);
      }
      
      return reviewerId;
      
    } catch (error) {
      console.error('خطأ في تعيين المراجع:', error);
      return null;
    }
  }

  /**
   * مراقبة انتهاء مهلة المراجعة
   */
  async monitorReviewTimeouts(): Promise<void> {
    try {
      console.log('⏰ فحص انتهاء مهل المراجعة...');
      
      // الحصول على المراحل المتأخرة
      const { data: overdueStages } = await supabase
        .from('review_stages')
        .select(`
          *,
          review_levels(*)
        `)
        .eq('status', 'in_progress')
        .lt('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // 30 دقيقة
      
      if (!overdueStages || overdueStages.length === 0) {
        return;
      }
      
      console.log(`⚠️ وجد ${overdueStages.length} مراحل متأخرة`);
      
      for (const stage of overdueStages) {
        await this.handleStageTimeout(stage);
      }
      
    } catch (error) {
      console.error('خطأ في مراقبة انتهاء المهل:', error);
    }
  }

  /**
   * معالجة انتهاء مهلة مرحلة
   */
  private async handleStageTimeout(stage: any): Promise<void> {
    try {
      const level = stage.review_levels;
      if (!level) return;
      
      const elapsedMinutes = (Date.now() - new Date(stage.started_at).getTime()) / (1000 * 60);
      
      if (elapsedMinutes >= level.escalation.auto_escalate_after) {
        console.log(`⏰ انتهت مهلة المرحلة ${stage.id} - تصعيد تلقائي`);
        
        // تصعيد المرحلة
        await this.escalateStage(stage.id, 'timeout');
        
        // إشعار الإدارة
        if (level.escalation.notify_on_timeout) {
          await notificationService.notifyAdminsForExceptionalCase(
            stage.verification_request_id,
            'system_error',
            {
              reason: 'review_timeout',
              stageId: stage.id,
              reviewerId: stage.reviewer_id,
              elapsedTime: Math.round(elapsedMinutes)
            }
          );
        }
      }
      
    } catch (error) {
      console.error('خطأ في معالجة انتهاء المهلة:', error);
    }
  }

  /**
   * تصعيد مرحلة إلى المستوى التالي
   */
  async escalateStage(stageId: string, reason: string): Promise<void> {
    try {
      // تحديث المرحلة الحالية
      await supabase
        .from('review_stages')
        .update({
          status: 'escalated',
          decision: 'escalate',
          notes: `تم التصعيد: ${reason}`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', stageId);
      
      // الحصول على سير العمل
      const stage = await this.getReviewStage(stageId);
      if (!stage) return;
      
      const workflow = await this.getWorkflow(stage.verificationRequestId);
      if (!workflow) return;
      
      // بدء المرحلة التالية
      await this.startNextStage(workflow.id);
      
      console.log(`📈 تم تصعيد المرحلة ${stageId} بسبب: ${reason}`);
      
    } catch (error) {
      console.error('خطأ في تصعيد المرحلة:', error);
    }
  }

  /**
   * تحديد المستويات المطلوبة للمراجعة
   */
  private async determineRequiredLevels(
    driverId: string,
    documentType: string,
    documentData: any
  ): Promise<ReviewLevel[]> {
    
    const requiredLevels: ReviewLevel[] = [];
    
    // تحديد مستوى مخاطر المستخدم
    const userRiskLevel = await this.getUserRiskLevel(driverId);
    const userCategory = await this.getUserCategory(driverId);
    
    // الحصول على ثقة الذكاء الاصطناعي
    const aiResult = await predictiveReviewAI.predictReviewDecision(
      `temp_${Date.now()}`,
      driverId,
      documentData
    );
    
    const aiConfidence = aiResult.confidence * 100;
    
    // تطبيق المستويات حسب الشروط
    for (const level of this.defaultLevels) {
      const shouldInclude = this.shouldIncludeLevel(
        level,
        documentType,
        userRiskLevel,
        userCategory,
        aiConfidence
      );
      
      if (shouldInclude) {
        requiredLevels.push(level);
      }
    }
    
    // ترتيب المستويات
    requiredLevels.sort((a, b) => a.order - b.order);
    
    return requiredLevels;
  }

  private shouldIncludeLevel(
    level: ReviewLevel,
    documentType: string,
    userRiskLevel: string,
    userCategory: string,
    aiConfidence: number
  ): boolean {
    
    // فحص نوع الوثيقة
    if (!level.triggers.documentTypes.includes('all') && 
        !level.triggers.documentTypes.includes(documentType)) {
      return false;
    }
    
    // فحص مستوى المخاطر
    if (!level.triggers.riskLevels.includes(userRiskLevel)) {
      return false;
    }
    
    // فحص فئة المستخدم
    if (!level.triggers.userCategories.includes('all') && 
        !level.triggers.userCategories.includes(userCategory)) {
      return false;
    }
    
    // فحص ثقة الذكاء الاصطناعي
    if (aiConfidence < level.triggers.aiConfidence.min || 
        aiConfidence > level.triggers.aiConfidence.max) {
      return false;
    }
    
    return true;
  }

  // دوال مساعدة...
  
  private async saveWorkflow(workflow: ReviewWorkflow): Promise<void> {
    await supabase
      .from('review_workflows')
      .insert({
        id: workflow.id,
        verification_request_id: workflow.verificationRequestId,
        driver_id: workflow.driverId,
        document_type: workflow.documentType,
        status: workflow.status,
        current_stage: workflow.currentStage,
        total_stages: workflow.totalStages,
        workflow_config: workflow.workflow,
        started_at: workflow.startedAt,
        created_at: workflow.createdAt
      });
  }
  
  private async createReviewStages(workflow: ReviewWorkflow): Promise<ReviewStage[]> {
    const stages: ReviewStage[] = [];
    
    for (let i = 0; i < workflow.workflow.levels.length; i++) {
      const level = workflow.workflow.levels[i];
      
      const stage: ReviewStage = {
        id: `stage_${workflow.id}_${i + 1}`,
        verificationRequestId: workflow.verificationRequestId,
        levelId: level.id,
        order: i + 1,
        status: 'pending',
        metadata: {
          autoAssigned: level.reviewers.roles.includes('ai_system'),
          priority: 'normal',
          estimatedTime: level.criteria.timeoutMinutes * 60,
          retryCount: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      stages.push(stage);
    }
    
    // حفظ المراحل
    await supabase
      .from('review_stages')
      .insert(stages.map(stage => ({
        id: stage.id,
        verification_request_id: stage.verificationRequestId,
        level_id: stage.levelId,
        order: stage.order,
        status: stage.status,
        metadata: stage.metadata,
        created_at: stage.createdAt
      })));
    
    return stages;
  }
  
  private async startNextStage(workflowId: string): Promise<void> {
    // الحصول على المرحلة التالية
    const { data: nextStage } = await supabase
      .from('review_stages')
      .select('*')
      .eq('verification_request_id', workflowId)
      .eq('status', 'pending')
      .order('order', { ascending: true })
      .limit(1)
      .single();
    
    if (!nextStage) {
      // انتهت جميع المراحل
      await this.completeWorkflow(workflowId);
      return;
    }
    
    // بدء المرحلة
    await supabase
      .from('review_stages')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', nextStage.id);
    
    // تعيين مراجع أو بدء المراجعة الآلية
    const level = this.defaultLevels.find(l => l.id === nextStage.level_id);
    if (level?.reviewers.roles.includes('ai_system')) {
      // مراجعة آلية
      await this.performAutomatedReview(nextStage.id, {});
    } else {
      // تعيين مراجع بشري
      await this.assignReviewerToStage(nextStage.id);
    }
  }
  
  private async completeWorkflow(workflowId: string): Promise<void> {
    // حساب النتيجة النهائية
    const finalResult = await this.calculateFinalResult(workflowId);
    
    // تحديث سير العمل
    await supabase
      .from('review_workflows')
      .update({
        status: 'completed',
        final_decision: finalResult.decision,
        final_confidence: finalResult.confidence,
        actual_completion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId);
    
    console.log(`✅ انتهى سير المراجعة ${workflowId} - النتيجة: ${finalResult.decision}`);
  }
  
  private async calculateFinalResult(workflowId: string): Promise<{
    decision: 'approved' | 'rejected' | 'requires_resubmission';
    confidence: number;
  }> {
    
    const { data: stages } = await supabase
      .from('review_stages')
      .select('decision, confidence')
      .eq('verification_request_id', workflowId)
      .eq('status', 'completed');
    
    if (!stages || stages.length === 0) {
      return { decision: 'requires_resubmission', confidence: 0 };
    }
    
    // حساب الإجماع
    const approvals = stages.filter(s => s.decision === 'approve').length;
    const rejections = stages.filter(s => s.decision === 'reject').length;
    
    const avgConfidence = stages.reduce((sum, s) => sum + (s.confidence || 0), 0) / stages.length;
    
    if (approvals > rejections) {
      return { decision: 'approved', confidence: avgConfidence };
    } else if (rejections > approvals) {
      return { decision: 'rejected', confidence: avgConfidence };
    } else {
      return { decision: 'requires_resubmission', confidence: avgConfidence };
    }
  }
  
  // دوال أخرى للمساعدة...
  
  /**
   * التحقق من قدرة المراجع على التعامل مع مرحلة معينة
   */
  private async canReviewerHandleStage(reviewerId: string, stage: ReviewStage): Promise<boolean> {
    const level = this.defaultLevels.find(l => l.id === stage.levelId);
    if (!level) return false;
    
    return await this.canReviewerHandleLevel(reviewerId, level);
  }

  /**
   * التحقق من قدرة المراجع على التعامل مع مستوى معين
   */
  private async canReviewerHandleLevel(reviewerId: string, level: ReviewLevel): Promise<boolean> {
    if (reviewerId === 'ai_system') {
      return level.reviewers.roles.includes('ai_system');
    }
    
    const { data: reviewer } = await supabase
      .from('profiles')
      .select('role, specializations, experience_months, certifications, is_available')
      .eq('id', reviewerId)
      .single();
    
    if (!reviewer || !reviewer.is_available) return false;
    
    // فحص الدور
    if (!level.reviewers.roles.includes(reviewer.role)) return false;
    
    // فحص التخصص
    if (level.reviewers.specializations.length > 0 && 
        !level.reviewers.specializations.some(spec => 
          reviewer.specializations?.includes(spec) || spec === 'all'
        )) {
      return false;
    }
    
    // فحص الخبرة
    if ((reviewer.experience_months || 0) < level.reviewers.minimumExperience) {
      return false;
    }
    
    // فحص الشهادات
    if (level.reviewers.requiredCertifications.length > 0 && 
        !level.reviewers.requiredCertifications.every(cert => 
          reviewer.certifications?.includes(cert)
        )) {
      return false;
    }
    
    return true;
  }

  /**
   * البحث عن مراجع متاح
   */
  private async findAvailableReviewer(level: ReviewLevel, stage: ReviewStage): Promise<string | null> {
    const { data: reviewers } = await supabase
      .from('profiles')
      .select('id, role, specializations, experience_months, certifications, current_workload')
      .in('role', level.reviewers.roles)
      .eq('is_available', true)
      .gte('experience_months', level.reviewers.minimumExperience)
      .order('current_workload', { ascending: true })
      .limit(10);
    
    if (!reviewers || reviewers.length === 0) return null;
    
    // إيجاد أفضل مراجع مؤهل
    for (const reviewer of reviewers) {
      const canHandle = await this.canReviewerHandleLevel(reviewer.id, level);
      if (canHandle) {
        return reviewer.id;
      }
    }
    
    return null;
  }

  /**
   * تعيين مراجع لمرحلة
   */
  private async assignReviewer(stageId: string, reviewerId: string): Promise<void> {
    await supabase
      .from('review_stages')
      .update({
        assigned_to: reviewerId,
        reviewer_id: reviewerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', stageId);
    
    // تحديث عبء العمل للمراجع
    await supabase.rpc('increment_reviewer_workload', {
      reviewer_id: reviewerId,
      increment: 1
    });
  }

  /**
   * تحديث نتيجة المرحلة
   */
  private async updateStageResult(
    stageId: string,
    reviewerId: string,
    decision: 'approve' | 'reject' | 'escalate' | 'request_more_info',
    notes?: string,
    confidence?: number
  ): Promise<ReviewStage> {
    
    const updateData = {
      reviewer_id: reviewerId,
      decision,
      confidence: confidence || 0,
      notes: notes || '',
      status: 'completed' as const,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data } = await supabase
      .from('review_stages')
      .update(updateData)
      .eq('id', stageId)
      .select()
      .single();
    
    // تقليل عبء العمل للمراجع
    if (reviewerId !== 'ai_system') {
      await supabase.rpc('increment_reviewer_workload', {
        reviewer_id: reviewerId,
        increment: -1
      });
    }
    
    return data;
  }

  /**
   * تحديد الإجراء التالي
   */
  private async determineNextAction(
    workflow: ReviewWorkflow,
    completedStage: ReviewStage
  ): Promise<'continue' | 'complete' | 'escalate' | 'retry'> {
    
    // فحص نتيجة المرحلة
    switch (completedStage.decision) {
      case 'approve':
        // استمرار للمرحلة التالية أو إنهاء
        return workflow.currentStage >= workflow.totalStages ? 'complete' : 'continue';
        
      case 'reject':
        // إنهاء السير مع الرفض
        return 'complete';
        
      case 'escalate':
        // تصعيد للمرحلة التالية
        return workflow.currentStage >= workflow.totalStages ? 'complete' : 'escalate';
        
      case 'request_more_info':
        // طلب معلومات إضافية من السائق
        return 'retry';
        
      default:
        return 'continue';
    }
  }

  /**
   * تنفيذ الإجراء التالي
   */
  private async executeNextAction(
    workflow: ReviewWorkflow,
    action: 'continue' | 'complete' | 'escalate' | 'retry'
  ): Promise<void> {
    
    switch (action) {
      case 'continue':
        // الانتقال للمرحلة التالية
        await this.advanceToNextStage(workflow.id);
        break;
        
      case 'complete':
        // إنهاء سير العمل
        await this.completeWorkflow(workflow.id);
        break;
        
      case 'escalate':
        // تصعيد للمرحلة التالية
        await this.advanceToNextStage(workflow.id);
        break;
        
      case 'retry':
        // إرسال طلب معلومات إضافية
        await this.requestAdditionalInfo(workflow.verificationRequestId);
        break;
    }
  }

  /**
   * الانتقال للمرحلة التالية
   */
  private async advanceToNextStage(workflowId: string): Promise<void> {
    // الحصول على المرحلة الحالية
    const { data: workflow } = await supabase
      .from('review_workflows')
      .select('current_stage')
      .eq('id', workflowId)
      .single();
    
    if (!workflow) return;
    
    // تحديث رقم المرحلة الحالية
    await supabase
      .from('review_workflows')
      .update({
        current_stage: workflow.current_stage + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId);
    
    // بدء المرحلة التالية
    await this.startNextStage(workflowId);
  }

  /**
   * طلب معلومات إضافية
   */
  private async requestAdditionalInfo(verificationRequestId: string): Promise<void> {
    // تحديث حالة طلب التحقق
    await supabase
      .from('verification_requests')
      .update({
        status: 'additional_info_required',
        updated_at: new Date().toISOString()
      })
      .eq('id', verificationRequestId);
    
    // إرسال إشعار للسائق
    const { data: request } = await supabase
      .from('verification_requests')
      .select('driver_id')
      .eq('id', verificationRequestId)
      .single();
    
    if (request) {
      await notificationService.notifyVerificationResult(
        verificationRequestId,
        request.driver_id,
        {
          status: 'manual_review',
          confidence: 0,
          issues: ['معلومات إضافية مطلوبة'],
          recommendations: ['يرجى تقديم وثائق أوضح أو معلومات إضافية']
        }
      );
    }
  }

  /**
   * الحصول على معرف السائق من الطلب
   */
  private async getDriverIdFromRequest(verificationRequestId: string): Promise<string> {
    const { data } = await supabase
      .from('verification_requests')
      .select('driver_id')
      .eq('id', verificationRequestId)
      .single();
    
    return data?.driver_id || '';
  }

  /**
   * الحصول على نوع الوثيقة من الطلب
   */
  private async getDocumentTypeFromRequest(verificationRequestId: string): Promise<string> {
    const { data } = await supabase
      .from('verification_requests')
      .select('document_type')
      .eq('id', verificationRequestId)
      .single();
    
    return data?.document_type || '';
  }
  
  private async getReviewStage(stageId: string): Promise<ReviewStage | null> {
    const { data } = await supabase
      .from('review_stages')
      .select('*')
      .eq('id', stageId)
      .single();
    
    return data;
  }
  
  private async getWorkflow(verificationRequestId: string): Promise<ReviewWorkflow | null> {
    const { data } = await supabase
      .from('review_workflows')
      .select('*')
      .eq('verification_request_id', verificationRequestId)
      .single();
    
    return data;
  }
  
  private async getUserRiskLevel(driverId: string): Promise<string> {
    const { data } = await supabase
      .from('profiles')
      .select('risk_level')
      .eq('id', driverId)
      .single();
    
    return data?.risk_level || 'medium';
  }
  
  private async getUserCategory(driverId: string): Promise<string> {
    const { data } = await supabase
      .from('profiles')
      .select('category, created_at')
      .eq('id', driverId)
      .single();
    
    if (!data) return 'new';
    
    const accountAge = Date.now() - new Date(data.created_at).getTime();
    const ageDays = accountAge / (1000 * 60 * 60 * 24);
    
    if (ageDays < 7) return 'new';
    if (data.category === 'flagged') return 'flagged';
    if (data.category === 'suspicious') return 'suspicious';
    
    return 'regular';
  }
}

// تصدير instance واحد
export const multiLevelReviewSystem = new MultiLevelReviewSystem();
