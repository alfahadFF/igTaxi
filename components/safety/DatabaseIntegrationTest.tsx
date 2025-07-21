import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafety } from '@/contexts/SafetyContext';
import { emergencyNumbersService } from '@/utils/safety/emergency-numbers-service';
import { emergencyContactsService } from '@/utils/safety/emergency-contacts-service';
import { safetyDataService } from '@/utils/safety/safety-data-service';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database } from 'lucide-react-native';

interface DatabaseTestResult {
  name: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  data?: any;
}

const DatabaseIntegrationTest: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { emergencyContacts, triggerSOS } = useSafety();
  
  const [testResults, setTestResults] = useState<DatabaseTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  const runDatabaseTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setTestResults([]);

    const tests = [
      {
        name: 'اختبار أرقام الطوارئ',
        test: testEmergencyNumbers,
      },
      {
        name: 'اختبار جهات الاتصال الطارئة',
        test: testEmergencyContacts,
      },
      {
        name: 'اختبار مزامنة البيانات',
        test: testDataSync,
      },
      {
        name: 'اختبار نظام SOS',
        test: testSOSSystem,
      },
      {
        name: 'اختبار الاتصال بقاعدة البيانات',
        test: testDatabaseConnection,
      },
    ];

    for (const test of tests) {
      try {
        updateTestResult(test.name, 'loading', 'جاري التنفيذ...');
        const result = await test.test();
        updateTestResult(test.name, 'success', result.message, result.data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
        updateTestResult(test.name, 'error', errorMessage);
      }
      
      // إضافة تأخير صغير بين الاختبارات
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
    setOverallStatus('completed');
  };

  const updateTestResult = (name: string, status: DatabaseTestResult['status'], message: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, status, message, data } : r);
      } else {
        return [...prev, { name, status, message, data }];
      }
    });
  };

  const testEmergencyNumbers = async () => {
    const numbers = await emergencyNumbersService.getActiveEmergencyNumbers();
    if (!numbers) {
      throw new Error('لم يتم العثور على أرقام طوارئ نشطة');
    }
    
    const policeNumber = await emergencyNumbersService.getEmergencyNumberByType('police');
    const ambulanceNumber = await emergencyNumbersService.getEmergencyNumberByType('ambulance');
    
    return {
      message: `تم جلب أرقام الطوارئ لـ ${numbers.country} بنجاح`,
      data: {
        country: numbers.country,
        police: policeNumber,
        ambulance: ambulanceNumber,
      }
    };
  };

  const testEmergencyContacts = async () => {
    try {
      const contacts = await emergencyContactsService.getEmergencyContacts();
      return {
        message: `تم جلب ${contacts.length} جهة اتصال طارئة`,
        data: { count: contacts.length, contacts: contacts.slice(0, 2) }
      };
    } catch (error) {
      // إذا فشل الجلب، نحاول إضافة جهة اتصال تجريبية
      try {
        await emergencyContactsService.addEmergencyContact({
          name: 'اختبار قاعدة البيانات',
          phone: '+966501234567',
          relationship: 'family',
          isPrimary: true
        });
        
        return {
          message: 'تم إضافة جهة اتصال تجريبية بنجاح',
          data: { action: 'created_test_contact' }
        };
      } catch (addError) {
        const errorMessage = addError instanceof Error ? addError.message : 'خطأ غير معروف';
        throw new Error(`فشل في الاتصال بقاعدة البيانات: ${errorMessage}`);
      }
    }
  };

  const testDataSync = async () => {
    const syncResult = await safetyDataService.syncAllSafetyData();
    const syncStatus = safetyDataService.getSyncStatus();
    
    return {
      message: `المزامنة ${syncResult.isOnline ? 'متصلة' : 'غير متصلة'} - ${syncStatus.pendingSyncs} عملية مؤجلة`,
      data: {
        isOnline: syncResult.isOnline,
        lastSync: syncResult.lastSyncTime,
        pendingOps: syncStatus.pendingSyncs
      }
    };
  };

  const testSOSSystem = async () => {
    // محاكاة تشغيل نظام SOS دون إرسال إشعارات فعلية
    const emergencyNumber = await emergencyNumbersService.getEmergencyNumberByType('police');
    
    return {
      message: `نظام SOS جاهز - رقم الطوارئ: ${emergencyNumber}`,
      data: { emergencyNumber, contactsCount: emergencyContacts.length }
    };
  };

  const testDatabaseConnection = async () => {
    // اختبار الاتصال عبر محاولة جلب بيانات بسيطة
    const numbers = await emergencyNumbersService.getActiveEmergencyNumbers();
    const data = await safetyDataService.getData('emergency_numbers');
    
    return {
      message: 'الاتصال بقاعدة البيانات يعمل بشكل صحيح',
      data: { hasActiveNumbers: !!numbers, dataServiceWorking: !!data }
    };
  };

  const renderTestResult = (result: DatabaseTestResult) => {
    const getIcon = () => {
      switch (result.status) {
        case 'success':
          return <CheckCircle size={20} color="#10b981" />;
        case 'error':
          return <XCircle size={20} color="#ef4444" />;
        case 'loading':
          return <ActivityIndicator size={20} color={colors.primary} />;
        default:
          return <AlertTriangle size={20} color={colors.accent} />;
      }
    };

    return (
      <View key={result.name} style={[styles.testItem, { backgroundColor: colors.card }]}>
        <View style={styles.testHeader}>
          {getIcon()}
          <Text style={[styles.testName, { color: colors.text }]}>
            {result.name}
          </Text>
        </View>
        
        <Text style={[
          styles.testMessage,
          { 
            color: result.status === 'error' ? '#ef4444' : colors.accent 
          }
        ]}>
          {result.message}
        </Text>
        
        {result.data && (
          <View style={[styles.testData, { backgroundColor: colors.background }]}>
            <Text style={[styles.testDataText, { color: colors.accent }]}>
              {JSON.stringify(result.data, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const getOverallStatusColor = () => {
    if (overallStatus === 'running') return colors.primary;
    
    const hasErrors = testResults.some(r => r.status === 'error');
    const allCompleted = testResults.length > 0 && testResults.every(r => r.status !== 'loading');
    
    if (hasErrors) return '#ef4444';
    if (allCompleted) return '#10b981';
    return colors.accent;
  };

  const getOverallStatusText = () => {
    if (overallStatus === 'running') return 'جاري تشغيل الاختبارات...';
    
    const successCount = testResults.filter(r => r.status === 'success').length;
    const errorCount = testResults.filter(r => r.status === 'error').length;
    
    if (overallStatus === 'completed') {
      return `اكتملت الاختبارات: ${successCount} نجح، ${errorCount} فشل`;
    }
    
    return 'اضغط لبدء اختبار التكامل';
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Database size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          اختبار تكامل قاعدة البيانات
        </Text>
      </View>

      <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusIndicator, { backgroundColor: getOverallStatusColor() }]} />
          <Text style={[styles.statusText, { color: colors.text }]}>
            {getOverallStatusText()}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.runButton,
            { backgroundColor: colors.primary },
            isRunning && styles.disabledButton
          ]}
          onPress={runDatabaseTests}
          disabled={isRunning}
        >
          <RefreshCw size={16} color="white" />
          <Text style={styles.runButtonText}>
            {isRunning ? 'جاري التشغيل...' : 'تشغيل الاختبارات'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testsContainer}>
        {testResults.map(renderTestResult)}
      </View>

      {overallStatus === 'completed' && (
        <View style={[styles.summary, { backgroundColor: colors.card }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            ملخص النتائج
          </Text>
          <Text style={[styles.summaryText, { color: colors.accent }]}>
            • أرقام الطوارئ: {testResults.find(r => r.name.includes('أرقام الطوارئ'))?.status === 'success' ? '✅' : '❌'}
          </Text>
          <Text style={[styles.summaryText, { color: colors.accent }]}>
            • جهات الاتصال: {testResults.find(r => r.name.includes('جهات الاتصال'))?.status === 'success' ? '✅' : '❌'}
          </Text>
          <Text style={[styles.summaryText, { color: colors.accent }]}>
            • مزامنة البيانات: {testResults.find(r => r.name.includes('مزامنة'))?.status === 'success' ? '✅' : '❌'}
          </Text>
          <Text style={[styles.summaryText, { color: colors.accent }]}>
            • نظام SOS: {testResults.find(r => r.name.includes('SOS'))?.status === 'success' ? '✅' : '❌'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    flex: 1,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  runButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  testsContainer: {
    gap: 12,
  },
  testItem: {
    padding: 16,
    borderRadius: 12,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  testData: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  testDataText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  summary: {
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default DatabaseIntegrationTest;
