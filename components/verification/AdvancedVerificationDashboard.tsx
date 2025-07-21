import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Chip, 
  ProgressBar, 
  Badge,
  Surface,
  Divider,
  List,
  IconButton,
  DataTable,
  Dialog,
  Portal,
  Text
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { notificationService } from '../../utils/notification-service';
import { predictiveReviewAI } from '../../utils/predictive-ai';
import { preSubmissionValidator } from '../../utils/pre-submission-validator';
import { multiLevelReviewSystem } from '../../utils/multi-level-review';
import { violationAnalyzer } from '../../utils/violation-analyzer';

/**
 * شاشة إدارة التحقق المتقدمة
 * تجمع جميع الأنظمة الجديدة في واجهة واحدة
 */

interface AdvancedVerificationDashboardProps {
  route: { params: { verificationRequestId?: string } };
  navigation: any;
}

interface DashboardData {
  notifications: any[];
  predictions: any[];
  validations: any[];
  workflows: any[];
  violations: any[];
  systemStats: {
    totalRequests: number;
    pendingReviews: number;
    aiAccuracy: number;
    averageProcessingTime: number;
  };
}

export default function AdvancedVerificationDashboard({ 
  route, 
  navigation 
}: AdvancedVerificationDashboardProps) {
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'notifications' | 'predictions' | 'workflows' | 'violations'>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    notifications: [],
    predictions: [],
    validations: [],
    workflows: [],
    violations: [],
    systemStats: {
      totalRequests: 0,
      pendingReviews: 0,
      aiAccuracy: 0,
      averageProcessingTime: 0
    }
  });
  
  const [selectedRequest, setSelectedRequest] = useState<string | null>(
    route.params?.verificationRequestId || null
  );
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // تحميل البيانات من جميع الأنظمة
      const [
        notificationsData,
        predictionsData,
        validationsData,
        workflowsData,
        violationsData,
        statsData
      ] = await Promise.all([
        loadNotificationsData(),
        loadPredictionsData(),
        loadValidationsData(),
        loadWorkflowsData(),
        loadViolationsData(),
        loadSystemStats()
      ]);
      
      setDashboardData({
        notifications: notificationsData,
        predictions: predictionsData,
        validations: validationsData,
        workflows: workflowsData,
        violations: violationsData,
        systemStats: statsData
      });
      
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationsData = async () => {
    const { data } = await supabase
      .from('notification_queue')
      .select(`
        *,
        notification_templates(name, type, priority)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return data || [];
  };

  const loadPredictionsData = async () => {
    const { data } = await supabase
      .from('prediction_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return data || [];
  };

  const loadValidationsData = async () => {
    const { data } = await supabase
      .from('validation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return data || [];
  };

  const loadWorkflowsData = async () => {
    const { data } = await supabase
      .from('review_workflows')
      .select(`
        *,
        review_stages(*)
      `)
      .order('started_at', { ascending: false })
      .limit(10);
    
    return data || [];
  };

  const loadViolationsData = async () => {
    const { data } = await supabase
      .from('violation_analysis_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    return data || [];
  };

  const loadSystemStats = async () => {
    try {
      // حساب الإحصائيات المختلفة
      const [totalRequestsResult, pendingReviewsResult, accuracyResult] = await Promise.all([
        supabase.from('verification_requests').select('id', { count: 'exact' }),
        supabase.from('review_stages').select('id', { count: 'exact' }).eq('status', 'in_progress'),
        supabase.rpc('calculate_prediction_accuracy')
      ]);
      
      return {
        totalRequests: totalRequestsResult.count || 0,
        pendingReviews: pendingReviewsResult.count || 0,
        aiAccuracy: accuracyResult.data?.[0]?.accuracy_rate || 0,
        averageProcessingTime: 185 // محاكاة - يمكن حسابها من البيانات الفعلية
      };
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
      return {
        totalRequests: 0,
        pendingReviews: 0,
        aiAccuracy: 0,
        averageProcessingTime: 0
      };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const showRequestDetails = async (requestId: string) => {
    try {
      setLoading(true);
      
      // جمع جميع البيانات المتعلقة بالطلب
      const [
        requestData,
        predictionData,
        validationData,
        workflowData,
        violationData
      ] = await Promise.all([
        supabase.from('verification_requests').select('*').eq('id', requestId).single(),
        supabase.from('prediction_results').select('*').eq('verification_request_id', requestId).single(),
        supabase.from('validation_logs').select('*').eq('driver_id', requestId).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('review_workflows').select('*, review_stages(*)').eq('verification_request_id', requestId).single(),
        supabase.from('violation_analysis_reports').select('*').eq('verification_request_id', requestId).single()
      ]);
      
      setDetailsData({
        request: requestData.data,
        prediction: predictionData.data,
        validation: validationData.data,
        workflow: workflowData.data,
        violations: violationData.data
      });
      
      setShowDetailsDialog(true);
      
    } catch (error) {
      console.error('خطأ في تحميل تفاصيل الطلب:', error);
      Alert.alert('خطأ', 'فشل في تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const triggerNotificationTest = async () => {
    try {
      await notificationService.notifyVerificationResult(
        'test_request_123',
        'test_driver_123',
        {
          status: 'approved',
          confidence: 95,
          issues: [],
          recommendations: ['تهانينا على الموافقة']
        }
      );
      
      Alert.alert('نجح', 'تم إرسال إشعار تجريبي');
      
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال الإشعار التجريبي');
    }
  };

  const runPredictionTest = async () => {
    try {
      const result = await predictiveReviewAI.predictReviewDecision(
        'test_request_456',
        'test_driver_456',
        {
          documentType: 'national_id',
          imageQuality: { clarity: 85, brightness: 120, contrast: 95 },
          ocrResults: { confidence: 0.9, extractedFields: 6, expectedFields: 6 },
          extractedData: { name: 'أحمد محمد', nationalId: '1234567890' }
        }
      );
      
      Alert.alert(
        'نتيجة التنبؤ',
        `القرار المتوقع: ${result.predictedDecision}\nالثقة: ${Math.round(result.confidence * 100)}%`
      );
      
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تشغيل التنبؤ التجريبي');
    }
  };

  const runValidationTest = async () => {
    try {
      const result = await preSubmissionValidator.validateBeforeSubmission(
        'test_driver_789',
        {
          documentType: 'national_id',
          extractedData: { name: 'سارة أحمد', nationalId: '2345678901' },
          imageQuality: { clarity: 78, brightness: 110, contrast: 88 }
        },
        {
          fileSize: 1024000,
          mimeType: 'image/jpeg'
        }
      );
      
      Alert.alert(
        'نتيجة التحقق',
        `حالة التحقق: ${result.isValid ? 'مقبول' : 'مرفوض'}\nنقاط الثقة: ${result.trustScore}`
      );
      
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تشغيل التحقق التجريبي');
    }
  };

  const renderOverview = () => (
    <ScrollView style={{ padding: 16 }}>
      {/* إحصائيات النظام */}
      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <Title>📊 إحصائيات النظام</Title>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{dashboardData.systemStats.totalRequests}</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>إجمالي الطلبات</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{dashboardData.systemStats.pendingReviews}</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>قيد المراجعة</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{dashboardData.systemStats.aiAccuracy}%</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>دقة الذكاء الاصطناعي</Text>
            </View>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{dashboardData.systemStats.averageProcessingTime}s</Text>
              <Text style={{ fontSize: 12, opacity: 0.7 }}>متوسط وقت المعالجة</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* الأنظمة المتاحة */}
      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <Title>🛠️ الأنظمة المتاحة</Title>
          <View style={{ marginTop: 16 }}>
            <SystemCard
              icon="bell-outline"
              title="نظام الإشعارات التلقائية"
              description="إرسال إشعارات ذكية للمراجعين والسائقين"
              status="نشط"
              onTest={triggerNotificationTest}
            />
            <SystemCard
              icon="brain"
              title="الذكاء التنبؤي للمراجعة"
              description="اقتراح قرارات بناءً على التاريخ والجودة"
              status="نشط"
              onTest={runPredictionTest}
            />
            <SystemCard
              icon="shield-check-outline"
              title="التحقق اللحظي قبل النشر"
              description="حجب التقديمات غير الموثوقة تلقائياً"
              status="نشط"
              onTest={runValidationTest}
            />
            <SystemCard
              icon="account-group-outline"
              title="المراجعة متعددة المستويات"
              description="آلي ← بشري ← إداري"
              status="نشط"
              onTest={() => Alert.alert('اختبار', 'سيتم تطبيق هذا على الطلبات الفعلية')}
            />
            <SystemCard
              icon="alert-circle-outline"
              title="تحليل المخالفات والتناقضات"
              description="كشف التزوير والأخطاء تلقائياً"
              status="نشط"
              onTest={() => Alert.alert('اختبار', 'سيتم تطبيق هذا على الوثائق المرفوعة')}
            />
          </View>
        </Card.Content>
      </Card>

      {/* الطلبات الحديثة */}
      <Card>
        <Card.Content>
          <Title>📋 الطلبات الحديثة</Title>
          {dashboardData.workflows.slice(0, 5).map((workflow, index) => (
            <Surface key={workflow.id} style={{ padding: 12, marginTop: 8, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>طلب #{workflow.id.slice(-8)}</Text>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>{workflow.document_type}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Chip 
                    mode="outlined" 
                    style={{ marginBottom: 4 }}
                    textStyle={{ fontSize: 10 }}
                  >
                    {getStatusText(workflow.status)}
                  </Chip>
                  <Text style={{ fontSize: 10, opacity: 0.7 }}>
                    المرحلة {workflow.current_stage}/{workflow.total_stages}
                  </Text>
                </View>
                <IconButton
                  icon="eye-outline"
                  size={20}
                  onPress={() => showRequestDetails(workflow.verification_request_id)}
                />
              </View>
              <ProgressBar 
                progress={workflow.current_stage / workflow.total_stages} 
                style={{ marginTop: 8 }}
              />
            </Surface>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderNotifications = () => (
    <ScrollView style={{ padding: 16 }}>
      <Card>
        <Card.Content>
          <Title>🔔 طابور الإشعارات</Title>
          {dashboardData.notifications.map((notification, index) => (
            <Surface key={notification.id} style={{ padding: 12, marginTop: 8, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>{notification.title}</Text>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>{notification.body}</Text>
                  <Text style={{ fontSize: 10, opacity: 0.5 }}>
                    إلى: {notification.recipient_type} | {notification.notification_type}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Chip 
                    mode="outlined" 
                    style={{ marginBottom: 4 }}
                    textStyle={{ fontSize: 10 }}
                  >
                    {getNotificationStatusText(notification.status)}
                  </Chip>
                  <Badge style={{ backgroundColor: getPriorityColor(notification.priority) }}>
                    {notification.priority}
                  </Badge>
                </View>
              </View>
            </Surface>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderPredictions = () => (
    <ScrollView style={{ padding: 16 }}>
      <Card>
        <Card.Content>
          <Title>🤖 نتائج التنبؤات</Title>
          {dashboardData.predictions.map((prediction, index) => (
            <Surface key={prediction.id} style={{ padding: 12, marginTop: 8, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>{getPredictionDecisionText(prediction.predicted_decision)}</Text>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>ثقة: {Math.round(prediction.confidence * 100)}%</Text>
                  <Text style={{ fontSize: 10, opacity: 0.5 }}>
                    طلب #{prediction.verification_request_id.slice(-8)}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  {prediction.actual_decision && (
                    <Chip 
                      mode="outlined" 
                      style={{ marginBottom: 4 }}
                      textStyle={{ fontSize: 10 }}
                    >
                      {prediction.prediction_accuracy ? '✅ صحيح' : '❌ خاطئ'}
                    </Chip>
                  )}
                  <Text style={{ fontSize: 10, opacity: 0.7 }}>
                    {new Date(prediction.created_at).toLocaleDateString('ar-AE')}
                  </Text>
                </View>
              </View>
            </Surface>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderWorkflows = () => (
    <ScrollView style={{ padding: 16 }}>
      <Card>
        <Card.Content>
          <Title>🔄 سير عمل المراجعة</Title>
          {dashboardData.workflows.map((workflow, index) => (
            <Surface key={workflow.id} style={{ padding: 12, marginTop: 8, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>سير العمل #{workflow.id.slice(-8)}</Text>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>{workflow.document_type}</Text>
                  <Text style={{ fontSize: 10, opacity: 0.5 }}>
                    المرحلة {workflow.current_stage} من {workflow.total_stages}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Chip 
                    mode="outlined" 
                    style={{ marginBottom: 4 }}
                    textStyle={{ fontSize: 10 }}
                  >
                    {getStatusText(workflow.status)}
                  </Chip>
                  <Text style={{ fontSize: 10, opacity: 0.7 }}>
                    {workflow.final_decision && `النتيجة: ${workflow.final_decision}`}
                  </Text>
                </View>
              </View>
              <ProgressBar 
                progress={workflow.current_stage / workflow.total_stages} 
                style={{ marginTop: 8 }}
              />
              
              {/* عرض المراحل */}
              {workflow.review_stages && workflow.review_stages.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>المراحل:</Text>
                  {workflow.review_stages.map((stage: any, stageIndex: number) => (
                    <View key={stage.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <MaterialCommunityIcons 
                        name={getStageIcon(stage.status) as any} 
                        size={16} 
                        color={getStageColor(stage.status)}
                      />
                      <Text style={{ fontSize: 10, marginLeft: 4 }}>
                        {stage.level_id} - {getStatusText(stage.status)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Surface>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  const renderViolations = () => (
    <ScrollView style={{ padding: 16 }}>
      <Card>
        <Card.Content>
          <Title>⚠️ تقارير المخالفات</Title>
          {dashboardData.violations.map((report, index) => (
            <Surface key={report.id} style={{ padding: 12, marginTop: 8, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>تقرير #{report.id.slice(-8)}</Text>
                  <Text style={{ fontSize: 12, opacity: 0.7 }}>{report.document_type}</Text>
                  <Text style={{ fontSize: 10, opacity: 0.5 }}>
                    المخالفات: {report.summary?.violationsFound || 0} | 
                    النتيجة: {report.summary?.overallScore || 0}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Badge 
                    style={{ 
                      backgroundColor: getRiskLevelColor(report.summary?.riskLevel || 'low'),
                      marginBottom: 4 
                    }}
                  >
                    {getRiskLevelText(report.summary?.riskLevel || 'low')}
                  </Badge>
                  <Text style={{ fontSize: 10, opacity: 0.7 }}>
                    {new Date(report.created_at).toLocaleDateString('ar-AE')}
                  </Text>
                </View>
              </View>
            </Surface>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  // مكونات مساعدة
  const SystemCard = ({ icon, title, description, status, onTest }: {
    icon: string;
    title: string;
    description: string;
    status: string;
    onTest: () => void;
  }) => (
    <Surface style={{ padding: 12, marginBottom: 8, borderRadius: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MaterialCommunityIcons name={icon as any} size={24} color="#2196F3" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{title}</Text>
            <Text style={{ fontSize: 12, opacity: 0.7 }}>{description}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Chip mode="outlined" style={{ marginBottom: 4 }} textStyle={{ fontSize: 10 }}>
            {status}
          </Chip>
          <Button mode="text" onPress={onTest} style={{ padding: 0 }}>
            اختبار
          </Button>
        </View>
      </View>
    </Surface>
  );

  // دوال مساعدة للنصوص والألوان
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'in_progress': 'قيد المعالجة',
      'completed': 'مكتمل',
      'failed': 'فشل',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getNotificationStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'في الانتظار',
      'processing': 'قيد الإرسال',
      'sent': 'تم الإرسال',
      'failed': 'فشل',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  const getPredictionDecisionText = (decision: string) => {
    const decisionMap: Record<string, string> = {
      'auto_approve': '✅ موافقة تلقائية',
      'auto_reject': '❌ رفض تلقائي',
      'manual_review': '👥 مراجعة يدوية'
    };
    return decisionMap[decision] || decision;
  };

  const getRiskLevelText = (level: string) => {
    const levelMap: Record<string, string> = {
      'low': 'منخفض',
      'medium': 'متوسط',
      'high': 'عالي',
      'critical': 'حرج'
    };
    return levelMap[level] || level;
  };

  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      'low': '#4CAF50',
      'normal': '#2196F3',
      'high': '#FF9800',
      'urgent': '#F44336'
    };
    return colorMap[priority] || '#2196F3';
  };

  const getRiskLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#FF5722',
      'critical': '#F44336'
    };
    return colorMap[level] || '#4CAF50';
  };

  const getStageIcon = (status: string) => {
    const iconMap: Record<string, string> = {
      'pending': 'clock-outline',
      'in_progress': 'progress-clock',
      'completed': 'check-circle',
      'skipped': 'skip-forward',
      'escalated': 'arrow-up-circle',
      'failed': 'close-circle'
    };
    return iconMap[status] || 'help-circle';
  };

  const getStageColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': '#FF9800',
      'in_progress': '#2196F3',
      'completed': '#4CAF50',
      'skipped': '#9E9E9E',
      'escalated': '#FF5722',
      'failed': '#F44336'
    };
    return colorMap[status] || '#9E9E9E';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* شريط التبويب */}
      <Surface style={{ padding: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {[
              { key: 'overview', label: 'نظرة عامة', icon: 'view-dashboard' },
              { key: 'notifications', label: 'الإشعارات', icon: 'bell' },
              { key: 'predictions', label: 'التنبؤات', icon: 'brain' },
              { key: 'workflows', label: 'سير العمل', icon: 'account-group' },
              { key: 'violations', label: 'المخالفات', icon: 'alert-circle' }
            ].map((tab) => (
              <Button
                key={tab.key}
                mode={selectedTab === tab.key ? 'contained' : 'text'}
                onPress={() => setSelectedTab(tab.key as any)}
                icon={tab.icon}
                style={{ marginRight: 8 }}
              >
                {tab.label}
              </Button>
            ))}
          </View>
        </ScrollView>
      </Surface>

      {/* المحتوى */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'notifications' && renderNotifications()}
        {selectedTab === 'predictions' && renderPredictions()}
        {selectedTab === 'workflows' && renderWorkflows()}
        {selectedTab === 'violations' && renderViolations()}
      </ScrollView>

      {/* نافذة التفاصيل */}
      <Portal>
        <Dialog visible={showDetailsDialog} onDismiss={() => setShowDetailsDialog(false)}>
          <Dialog.Title>تفاصيل الطلب</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              {detailsData && (
                <View style={{ padding: 16 }}>
                  {/* بيانات الطلب الأساسية */}
                  {detailsData.request && (
                    <Card style={{ marginBottom: 16 }}>
                      <Card.Content>
                        <Title>📋 بيانات الطلب</Title>
                        <Text>المعرف: {detailsData.request.id}</Text>
                        <Text>نوع الوثيقة: {detailsData.request.document_type}</Text>
                        <Text>الحالة: {getStatusText(detailsData.request.status)}</Text>
                      </Card.Content>
                    </Card>
                  )}

                  {/* نتائج التنبؤ */}
                  {detailsData.prediction && (
                    <Card style={{ marginBottom: 16 }}>
                      <Card.Content>
                        <Title>🤖 نتائج التنبؤ</Title>
                        <Text>القرار المتوقع: {getPredictionDecisionText(detailsData.prediction.predicted_decision)}</Text>
                        <Text>الثقة: {Math.round(detailsData.prediction.confidence * 100)}%</Text>
                      </Card.Content>
                    </Card>
                  )}

                  {/* نتائج التحقق */}
                  {detailsData.validation && (
                    <Card style={{ marginBottom: 16 }}>
                      <Card.Content>
                        <Title>🛡️ نتائج التحقق</Title>
                        <Text>صالح: {detailsData.validation.is_valid ? 'نعم' : 'لا'}</Text>
                        <Text>نقاط الثقة: {detailsData.validation.trust_score}</Text>
                      </Card.Content>
                    </Card>
                  )}
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowDetailsDialog(false)}>إغلاق</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
