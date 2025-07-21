import { supabase } from './supabase';

/**
 * نظام الإشعارات التلقائية الذكي
 * يدعم Push Notifications و Email و SMS
 */

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'push' | 'sms' | 'in_app';
  trigger: 'verification_complete' | 'manual_review_needed' | 'document_rejected' | 
           'approval_granted' | 'additional_documents_required' | 'quality_check_failed';
  
  // محتوى الإشعار
  content: {
    subject?: string;
    title: string;
    body: string;
    actionButton?: {
      text: string;
      url: string;
    };
  };
  
  // إعدادات الإرسال
  settings: {
    priority: 'low' | 'normal' | 'high' | 'urgent';
    retryCount: number;
    delayMinutes?: number;
    recipients: {
      driver: boolean;
      reviewer: boolean;
      admin: boolean;
      custom?: string[];
    };
  };
  
  // متغيرات ديناميكية
  variables: string[]; // ['driverName', 'documentType', 'rejectionReason', etc.]
}

export interface NotificationQueue {
  id?: string;
  verificationRequestId: string;
  templateId: string;
  recipientId: string;
  recipientType: 'driver' | 'reviewer' | 'admin';
  
  // بيانات الإشعار
  data: {
    type: NotificationTemplate['type'];
    priority: NotificationTemplate['settings']['priority'];
    content: {
      title: string;
      body: string;
      subject?: string;
      actionUrl?: string;
    };
    variables: Record<string, any>;
  };
  
  // حالة الإرسال
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  lastAttempt?: string;
  sentAt?: string;
  failureReason?: string;
  
  // جدولة الإرسال
  scheduledFor: string;
  createdAt: string;
}

export class NotificationService {
  
  /**
   * إرسال إشعار للسائق بنتيجة التحقق
   */
  async notifyVerificationResult(
    verificationRequestId: string,
    driverId: string,
    result: {
      status: 'approved' | 'rejected' | 'manual_review';
      confidence: number;
      issues: string[];
      recommendations?: string[];
    }
  ): Promise<void> {
    
    try {
      console.log(`📤 إرسال إشعار نتيجة التحقق للسائق: ${driverId}`);
      
      // تحديد نوع الإشعار حسب النتيجة
      let templateName: string;
      let priority: NotificationTemplate['settings']['priority'] = 'normal';
      
      switch (result.status) {
        case 'approved':
          templateName = 'verification_approved';
          priority = 'high';
          break;
        case 'rejected':
          templateName = 'verification_rejected';
          priority = 'high';
          break;
        case 'manual_review':
          templateName = 'manual_review_needed';
          priority = 'normal';
          break;
      }
      
      // الحصول على قالب الإشعار
      const template = await this.getNotificationTemplate(templateName);
      if (!template) {
        console.warn(`قالب الإشعار غير موجود: ${templateName}`);
        return;
      }
      
      // إعداد متغيرات الإشعار
      const variables = {
        driverName: await this.getDriverName(driverId),
        status: this.getStatusText(result.status),
        confidence: result.confidence,
        issuesCount: result.issues.length,
        mainIssue: result.issues[0] || 'لا توجد ملاحظات',
        actionRequired: result.status === 'rejected' ? 'إعادة تقديم الوثائق' : 'لا يوجد إجراء مطلوب'
      };
      
      // إضافة إلى طابور الإشعارات
      await this.queueNotification(
        verificationRequestId,
        template.id,
        driverId,
        'driver',
        variables,
        priority
      );
      
      // إرسال إشعار فوري للحالات الهامة
      if (priority === 'high') {
        await this.sendImmediateNotification(driverId, template, variables);
      }
      
      console.log(`✅ تم جدولة إشعار السائق بنجاح`);
      
    } catch (error) {
      console.error('خطأ في إرسال إشعار السائق:', error);
    }
  }

  /**
   * إشعار المراجعين بطلب مراجعة يدوية
   */
  async notifyReviewersForManualReview(
    verificationRequestId: string,
    documentTypes: string[],
    urgencyLevel: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<void> {
    
    try {
      console.log(`👥 إشعار المراجعين لطلب المراجعة: ${verificationRequestId}`);
      
      // الحصول على قائمة المراجعين المتاحين
      const availableReviewers = await this.getAvailableReviewers(urgencyLevel);
      
      if (availableReviewers.length === 0) {
        console.warn('لا يوجد مراجعين متاحين');
        // إشعار الإدارة بعدم توفر مراجعين
        await this.notifyAdminsNoReviewersAvailable(verificationRequestId);
        return;
      }
      
      // الحصول على قالب إشعار المراجعة
      const template = await this.getNotificationTemplate('manual_review_needed');
      if (!template) return;
      
      // إعداد متغيرات الإشعار
      const variables = {
        requestId: verificationRequestId.slice(-8), // آخر 8 أرقام
        documentTypes: documentTypes.join(', '),
        urgencyLevel: this.getUrgencyText(urgencyLevel),
        estimatedTime: this.getEstimatedReviewTime(documentTypes),
        reviewUrl: `${process.env.EXPO_PUBLIC_WEB_URL}/review/${verificationRequestId}`
      };
      
      // إرسال إشعار لجميع المراجعين المتاحين
      for (const reviewer of availableReviewers) {
        await this.queueNotification(
          verificationRequestId,
          template.id,
          reviewer.id,
          'reviewer',
          variables,
          urgencyLevel === 'high' ? 'urgent' : 'normal'
        );
      }
      
      // إرسال إشعار فوري للحالات العاجلة
      if (urgencyLevel === 'high') {
        await this.sendUrgentReviewAlert(availableReviewers, verificationRequestId);
      }
      
      console.log(`✅ تم إشعار ${availableReviewers.length} مراجع`);
      
    } catch (error) {
      console.error('خطأ في إشعار المراجعين:', error);
    }
  }

  /**
   * إشعار الإدارة بالحالات الاستثنائية
   */
  async notifyAdminsForExceptionalCase(
    verificationRequestId: string,
    caseType: 'fraud_detected' | 'system_error' | 'quality_threshold_exceeded' | 'unusual_pattern',
    details: any
  ): Promise<void> {
    
    try {
      console.log(`🚨 إشعار الإدارة بحالة استثنائية: ${caseType}`);
      
      const template = await this.getNotificationTemplate('admin_alert');
      if (!template) return;
      
      const variables = {
        caseType: this.getCaseTypeText(caseType),
        requestId: verificationRequestId,
        severity: this.getCaseSeverity(caseType),
        details: JSON.stringify(details, null, 2),
        timestamp: new Date().toLocaleString('ar-AE'),
        actionUrl: `${process.env.EXPO_PUBLIC_WEB_URL}/admin/cases/${verificationRequestId}`
      };
      
      // الحصول على قائمة الإدارة
      const admins = await this.getAdminUsers();
      
      for (const admin of admins) {
        await this.queueNotification(
          verificationRequestId,
          template.id,
          admin.id,
          'admin',
          variables,
          'urgent'
        );
        
        // إرسال فوري للحالات الحرجة
        if (caseType === 'fraud_detected' || caseType === 'system_error') {
          await this.sendImmediateNotification(admin.id, template, variables);
        }
      }
      
    } catch (error) {
      console.error('خطأ في إشعار الإدارة:', error);
    }
  }

  /**
   * معالجة طابور الإشعارات
   */
  async processNotificationQueue(): Promise<void> {
    try {
      console.log('🔄 معالجة طابور الإشعارات...');
      
      // الحصول على الإشعارات المجدولة
      const { data: pendingNotifications } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(50);
      
      if (!pendingNotifications || pendingNotifications.length === 0) {
        return;
      }
      
      console.log(`📨 معالجة ${pendingNotifications.length} إشعار`);
      
      for (const notification of pendingNotifications) {
        await this.processNotification(notification);
      }
      
    } catch (error) {
      console.error('خطأ في معالجة طابور الإشعارات:', error);
    }
  }

  /**
   * معالجة إشعار واحد
   */
  private async processNotification(notification: any): Promise<void> {
    try {
      // تحديث حالة الإشعار إلى "قيد الإرسال"
      await this.updateNotificationStatus(notification.id, 'processing');
      
      let success = false;
      
      // إرسال حسب النوع
      switch (notification.data.type) {
        case 'email':
          success = await this.sendEmail(notification);
          break;
        case 'push':
          success = await this.sendPushNotification(notification);
          break;
        case 'sms':
          success = await this.sendSMS(notification);
          break;
        case 'in_app':
          success = await this.sendInAppNotification(notification);
          break;
      }
      
      if (success) {
        await this.updateNotificationStatus(notification.id, 'sent');
        console.log(`✅ تم إرسال الإشعار: ${notification.id}`);
      } else {
        await this.handleNotificationFailure(notification);
      }
      
    } catch (error) {
      console.error(`خطأ في معالجة الإشعار ${notification.id}:`, error);
      await this.handleNotificationFailure(notification, (error as Error).message);
    }
  }

  /**
   * إرسال بريد إلكتروني
   */
  private async sendEmail(notification: any): Promise<boolean> {
    try {
      // هنا يمكن دمج مع خدمة بريد إلكتروني مثل SendGrid أو AWS SES
      console.log(`📧 إرسال بريد إلكتروني إلى: ${notification.recipient_id}`);
      
      // محاكاة إرسال البريد
      const emailData = {
        to: await this.getRecipientEmail(notification.recipient_id),
        subject: notification.data.content.subject,
        html: this.generateEmailHTML(notification.data.content),
        priority: notification.data.priority
      };
      
      // استخدام خدمة البريد الإلكتروني
      // const result = await emailService.send(emailData);
      
      // للآن نحاكي النجاح
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
      
    } catch (error) {
      console.error('خطأ في إرسال البريد الإلكتروني:', error);
      return false;
    }
  }

  /**
   * إرسال Push Notification
   */
  private async sendPushNotification(notification: any): Promise<boolean> {
    try {
      console.log(`📱 إرسال push notification إلى: ${notification.recipient_id}`);
      
      // الحصول على device token
      const deviceToken = await this.getDeviceToken(notification.recipient_id);
      if (!deviceToken) {
        console.warn('لا يوجد device token للمستخدم');
        return false;
      }
      
      // إعداد الإشعار
      const pushData = {
        to: deviceToken,
        title: notification.data.content.title,
        body: notification.data.content.body,
        data: {
          verificationRequestId: notification.verification_request_id,
          actionUrl: notification.data.content.actionUrl
        },
        priority: notification.data.priority === 'urgent' ? 'high' : 'normal'
      };
      
      // إرسال عبر Expo Push API
      // const result = await expoPushService.send(pushData);
      
      // محاكاة النجاح
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
      
    } catch (error) {
      console.error('خطأ في إرسال push notification:', error);
      return false;
    }
  }

  /**
   * إرسال SMS
   */
  private async sendSMS(notification: any): Promise<boolean> {
    try {
      console.log(`📱 إرسال SMS إلى: ${notification.recipient_id}`);
      
      const phoneNumber = await this.getRecipientPhone(notification.recipient_id);
      if (!phoneNumber) {
        console.warn('لا يوجد رقم هاتف للمستخدم');
        return false;
      }
      
      const smsData = {
        to: phoneNumber,
        message: `${notification.data.content.title}\n${notification.data.content.body}`,
        priority: notification.data.priority
      };
      
      // استخدام خدمة SMS مثل Twilio
      // const result = await smsService.send(smsData);
      
      // محاكاة النجاح
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
      
    } catch (error) {
      console.error('خطأ في إرسال SMS:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار داخل التطبيق
   */
  private async sendInAppNotification(notification: any): Promise<boolean> {
    try {
      console.log(`🔔 إرسال إشعار داخل التطبيق إلى: ${notification.recipient_id}`);
      
      // حفظ الإشعار في قاعدة البيانات ليظهر داخل التطبيق
      const { error } = await supabase
        .from('in_app_notifications')
        .insert({
          user_id: notification.recipient_id,
          title: notification.data.content.title,
          body: notification.data.content.body,
          action_url: notification.data.content.actionUrl,
          priority: notification.data.priority,
          verification_request_id: notification.verification_request_id,
          read: false,
          created_at: new Date().toISOString()
        });
      
      return !error;
      
    } catch (error) {
      console.error('خطأ في إرسال الإشعار داخل التطبيق:', error);
      return false;
    }
  }

  /**
   * إضافة إشعار إلى الطابور
   */
  private async queueNotification(
    verificationRequestId: string,
    templateId: string,
    recipientId: string,
    recipientType: 'driver' | 'reviewer' | 'admin',
    variables: Record<string, any>,
    priority: NotificationTemplate['settings']['priority'] = 'normal'
  ): Promise<void> {
    
    try {
      const template = await this.getNotificationTemplate(templateId);
      if (!template) return;
      
      // معالجة المتغيرات في المحتوى
      const processedContent = this.processTemplateVariables(template.content, variables);
      
      const notification: Omit<NotificationQueue, 'id'> = {
        verificationRequestId,
        templateId,
        recipientId,
        recipientType,
        data: {
          type: template.type,
          priority,
          content: {
            title: processedContent.title,
            body: processedContent.body,
            subject: processedContent.subject,
            actionUrl: processedContent.actionButton?.url
          },
          variables
        },
        status: 'pending',
        attempts: 0,
        scheduledFor: template.settings.delayMinutes ? 
          new Date(Date.now() + template.settings.delayMinutes * 60000).toISOString() :
          new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('notification_queue')
        .insert(notification);
      
      if (error) {
        console.error('خطأ في إضافة الإشعار للطابور:', error);
      }
      
    } catch (error) {
      console.error('خطأ في جدولة الإشعار:', error);
    }
  }

  // دوال مساعدة أخرى...
  
  /**
   * إرسال إشعار فوري
   */
  private async sendImmediateNotification(
    recipientId: string, 
    template: NotificationTemplate, 
    variables: Record<string, any>
  ): Promise<void> {
    try {
      const processedContent = this.processTemplateVariables(template.content, variables);
      
      // إرسال push notification فوري
      if (template.type === 'push') {
        await this.sendPushNotification({
          recipient_id: recipientId,
          data: {
            type: 'push',
            priority: 'urgent',
            content: processedContent
          }
        });
      }
      
      // إرسال in-app notification
      await this.sendInAppNotification({
        recipient_id: recipientId,
        verification_request_id: '',
        data: {
          type: 'in_app',
          priority: 'urgent',
          content: processedContent
        }
      });
      
    } catch (error) {
      console.error('خطأ في الإرسال الفوري:', error);
    }
  }

  /**
   * الحصول على المراجعين المتاحين
   */
  private async getAvailableReviewers(urgencyLevel: string): Promise<any[]> {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'reviewer')
      .eq('is_active', true)
      .eq('is_available', true);
    
    return data || [];
  }

  /**
   * إشعار الإدارة بعدم توفر مراجعين
   */
  private async notifyAdminsNoReviewersAvailable(verificationRequestId: string): Promise<void> {
    const admins = await this.getAdminUsers();
    
    for (const admin of admins) {
      await this.sendInAppNotification({
        recipient_id: admin.id,
        verification_request_id: verificationRequestId,
        data: {
          type: 'in_app',
          priority: 'urgent',
          content: {
            title: '⚠️ لا يوجد مراجعين متاحين',
            body: `طلب المراجعة ${verificationRequestId} يحتاج مراجع فوري`
          }
        }
      });
    }
  }

  /**
   * الحصول على نص مستوى الأولوية
   */
  private getUrgencyText(urgencyLevel: string): string {
    switch (urgencyLevel) {
      case 'low': return 'منخفض';
      case 'normal': return 'عادي';
      case 'high': return 'عالي';
      default: return urgencyLevel;
    }
  }

  /**
   * تقدير وقت المراجعة
   */
  private getEstimatedReviewTime(documentTypes: string[]): string {
    const baseTime = documentTypes.length * 3; // 3 دقائق لكل وثيقة
    return `${baseTime} دقيقة`;
  }

  /**
   * إرسال تنبيه عاجل للمراجعين
   */
  private async sendUrgentReviewAlert(reviewers: any[], verificationRequestId: string): Promise<void> {
    for (const reviewer of reviewers) {
      await this.sendImmediateNotification(
        reviewer.id,
        {
          id: 'urgent_review',
          name: 'urgent_review',
          type: 'push',
          trigger: 'manual_review_needed',
          content: {
            title: '🚨 مراجعة عاجلة مطلوبة',
            body: `طلب التحقق ${verificationRequestId.slice(-8)} يحتاج مراجعة فورية`
          },
          settings: {
            priority: 'urgent',
            retryCount: 3,
            recipients: {
              driver: false,
              reviewer: true,
              admin: false
            }
          },
          variables: []
        },
        { requestId: verificationRequestId }
      );
    }
  }

  /**
   * الحصول على نص نوع الحالة
   */
  private getCaseTypeText(caseType: string): string {
    switch (caseType) {
      case 'fraud_detected': return 'احتيال محتمل';
      case 'system_error': return 'خطأ في النظام';
      case 'quality_threshold_exceeded': return 'تجاوز حد الجودة';
      case 'unusual_pattern': return 'نمط غير عادي';
      default: return caseType;
    }
  }

  /**
   * تحديد شدة الحالة
   */
  private getCaseSeverity(caseType: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (caseType) {
      case 'fraud_detected': return 'critical';
      case 'system_error': return 'high';
      case 'quality_threshold_exceeded': return 'medium';
      case 'unusual_pattern': return 'medium';
      default: return 'low';
    }
  }

  /**
   * الحصول على المدراء
   */
  private async getAdminUsers(): Promise<any[]> {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    return data || [];
  }

  /**
   * الحصول على بريد المستقبل
   */
  private async getRecipientEmail(recipientId: string): Promise<string> {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', recipientId)
      .single();
    
    return data?.email || '';
  }

  /**
   * توليد HTML للبريد الإلكتروني
   */
  private generateEmailHTML(content: any): string {
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f5f5f5; }
              .footer { padding: 10px; text-align: center; font-size: 12px; color: #666; }
              .button { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${content.title}</h1>
              </div>
              <div class="content">
                  <p>${content.body}</p>
                  ${content.actionUrl ? `<a href="${content.actionUrl}" class="button">اتخاذ إجراء</a>` : ''}
              </div>
              <div class="footer">
                  <p>تطبيق آي جي تاكسي - نظام التحقق الذكي</p>
              </div>
          </div>
      </body>
      </html>
    `;
  }

  /**
   * الحصول على device token
   */
  private async getDeviceToken(recipientId: string): Promise<string | null> {
    const { data } = await supabase
      .from('user_devices')
      .select('push_token')
      .eq('user_id', recipientId)
      .eq('is_active', true)
      .order('last_seen', { ascending: false })
      .limit(1)
      .single();
    
    return data?.push_token || null;
  }

  /**
   * الحصول على رقم هاتف المستقبل
   */
  private async getRecipientPhone(recipientId: string): Promise<string> {
    const { data } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', recipientId)
      .single();
    
    return data?.phone || '';
  }
  
  private async getNotificationTemplate(name: string): Promise<NotificationTemplate | null> {
    const { data } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('name', name)
      .single();
    
    return data;
  }
  
  private async getDriverName(driverId: string): Promise<string> {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', driverId)
      .single();
    
    return data?.full_name || 'السائق';
  }
  
  private getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'تمت الموافقة';
      case 'rejected': return 'مرفوض';
      case 'manual_review': return 'قيد المراجعة';
      default: return status;
    }
  }
  
  private processTemplateVariables(content: any, variables: Record<string, any>): any {
    let processedContent = JSON.parse(JSON.stringify(content));
    
    // استبدال المتغيرات في جميع النصوص
    const replaceVariables = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] !== undefined ? variables[key] : match;
      });
    };
    
    if (processedContent.title) {
      processedContent.title = replaceVariables(processedContent.title);
    }
    if (processedContent.body) {
      processedContent.body = replaceVariables(processedContent.body);
    }
    if (processedContent.subject) {
      processedContent.subject = replaceVariables(processedContent.subject);
    }
    
    return processedContent;
  }
  
  private async updateNotificationStatus(
    notificationId: string, 
    status: 'processing' | 'sent' | 'failed'
  ): Promise<void> {
    await supabase
      .from('notification_queue')
      .update({ 
        status,
        last_attempt: new Date().toISOString(),
        sent_at: status === 'sent' ? new Date().toISOString() : undefined
      })
      .eq('id', notificationId);
  }
  
  private async handleNotificationFailure(notification: any, reason?: string): Promise<void> {
    const attempts = notification.attempts + 1;
    const maxRetries = 3;
    
    if (attempts < maxRetries) {
      // إعادة جدولة للمحاولة مرة أخرى
      const retryDelay = Math.pow(2, attempts) * 5; // 5, 10, 20 دقيقة
      
      await supabase
        .from('notification_queue')
        .update({
          status: 'pending',
          attempts,
          scheduled_for: new Date(Date.now() + retryDelay * 60000).toISOString(),
          failure_reason: reason
        })
        .eq('id', notification.id);
    } else {
      // فشل نهائي
      await supabase
        .from('notification_queue')
        .update({
          status: 'failed',
          attempts,
          failure_reason: reason || 'Max retries exceeded'
        })
        .eq('id', notification.id);
    }
  }
}

// تصدير instance واحد
export const notificationService = new NotificationService();
