import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button, Chip, ProgressBar, DataTable } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { supabase } from '../../utils/supabase';

/**
 * شاشة معاينة نتائج التحقق
 * للاختبار والمراجعة في بيئة التطوير
 */

interface VerificationPreviewProps {
  navigation: any;
}

interface VerificationRecord {
  id: string;
  driver_id: string;
  request_type: string;
  status: string;
  submitted_data: any;
  extracted_data: any;
  verification_results: any;
  ocr_confidence_score: number;
  face_match_confidence: number;
  overall_confidence: number;
  created_at: string;
  processed_at: string;
}

export default function VerificationPreviewScreen({ navigation }: VerificationPreviewProps) {
  const [verificationRecords, setVerificationRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    manualReview: 0,
    avgConfidence: 0
  });

  useEffect(() => {
    loadVerificationRecords();
    loadStatistics();
  }, []);

  /**
   * تحميل سجلات التحقق
   */
  const loadVerificationRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          id,
          driver_id,
          request_type,
          status,
          submitted_data,
          extracted_data,
          verification_results,
          ocr_confidence_score,
          face_match_confidence,
          overall_confidence,
          created_at,
          processed_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setVerificationRecords(data || []);
    } catch (error) {
      console.error('خطأ في تحميل السجلات:', error);
      Alert.alert('خطأ', 'فشل في تحميل بيانات التحقق');
    } finally {
      setLoading(false);
    }
  };

  /**
   * تحميل الإحصائيات
   */
  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('status, overall_confidence');

      if (error) {
        throw error;
      }

      if (data) {
        const total = data.length;
        const approved = data.filter(r => r.status === 'verified').length;
        const rejected = data.filter(r => r.status === 'rejected').length;
        const manualReview = data.filter(r => r.status === 'manual_review').length;
        const avgConfidence = data.reduce((sum, r) => sum + (r.overall_confidence || 0), 0) / total;

        setStatistics({
          total,
          approved,
          rejected,
          manualReview,
          avgConfidence: Math.round(avgConfidence)
        });
      }
    } catch (error) {
      console.error('خطأ في تحميل الإحصائيات:', error);
    }
  };

  /**
   * محاكاة اختبار OCR
   */
  const simulateOCRTest = async () => {
    Alert.alert(
      'اختبار OCR',
      'سيتم إنشاء بيانات اختبارية لمحاكاة عملية OCR',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'تشغيل الاختبار', 
          onPress: async () => {
            setLoading(true);
            
            // إنشاء بيانات اختبارية
            const testData = {
              driver_id: 'test-driver-' + Date.now(),
              request_type: 'taxi_driver',
              status: 'processing',
              submitted_data: {
                fullName: 'أحمد محمد الاختبار',
                nationalId: '123456789012345',
                birthDate: '01/01/1990',
                phoneNumber: '+971501234567'
              },
              extracted_data: {
                nationalId: {
                  number: '123456789012345',
                  name: 'أحمد محمد الاختبار',
                  birthDate: '01/01/1990',
                  confidence: 95
                }
              },
              verification_results: {
                dataMatches: {
                  nameMatch: true,
                  idMatch: true,
                  dateMatch: true
                },
                issues: [],
                recommendations: []
              },
              ocr_confidence_score: 92,
              overall_confidence: 94
            };

            try {
              const { error } = await supabase
                .from('verification_requests')
                .insert(testData);

              if (error) {
                throw error;
              }

              Alert.alert('نجح', 'تم إنشاء بيانات اختبارية بنجاح');
              loadVerificationRecords();
              loadStatistics();
            } catch (error) {
              console.error('خطأ في إنشاء البيانات الاختبارية:', error);
              Alert.alert('خطأ', 'فشل في إنشاء البيانات الاختبارية');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  /**
   * عرض تفاصيل السجل
   */
  const showRecordDetails = (record: VerificationRecord) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };

  /**
   * تصدير البيانات للتحليل
   */
  const exportData = () => {
    Alert.alert('تصدير البيانات', 'سيتم تصدير البيانات قريباً');
  };

  /**
   * الحصول على لون الحالة
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return Colors.success;
      case 'rejected': return Colors.error;
      case 'manual_review': return Colors.warning;
      case 'processing': return Colors.primary;
      default: return Colors.text;
    }
  };

  /**
   * الحصول على نص الحالة
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'تم التحقق';
      case 'rejected': return 'مرفوض';
      case 'manual_review': return 'مراجعة يدوية';
      case 'processing': return 'قيد المعالجة';
      default: return status;
    }
  };

  /**
   * عرض بطاقة الإحصائيات
   */
  const renderStatisticsCard = () => (
    <Card style={styles.statisticsCard}>
      <Card.Content>
        <Text style={styles.cardTitle}>📊 إحصائيات التحقق</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.total}</Text>
            <Text style={styles.statLabel}>إجمالي الطلبات</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.success }]}>
              {statistics.approved}
            </Text>
            <Text style={styles.statLabel}>موافق عليها</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.error }]}>
              {statistics.rejected}
            </Text>
            <Text style={styles.statLabel}>مرفوضة</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Colors.warning }]}>
              {statistics.manualReview}
            </Text>
            <Text style={styles.statLabel}>مراجعة يدوية</Text>
          </View>
        </View>
        
        <View style={styles.avgConfidenceContainer}>
          <Text style={styles.avgConfidenceLabel}>متوسط الثقة</Text>
          <ProgressBar 
            progress={statistics.avgConfidence / 100} 
            color={Colors.primary}
            style={styles.confidenceBar}
          />
          <Text style={styles.avgConfidenceValue}>{statistics.avgConfidence}%</Text>
        </View>
      </Card.Content>
    </Card>
  );

  /**
   * عرض قائمة السجلات
   */
  const renderRecordsList = () => (
    <Card style={styles.recordsCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📋 سجلات التحقق</Text>
          <TouchableOpacity onPress={simulateOCRTest} style={styles.testButton}>
            <MaterialIcons name="science" size={20} color={Colors.primary} />
            <Text style={styles.testButtonText}>اختبار</Text>
          </TouchableOpacity>
        </View>
        
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>الحالة</DataTable.Title>
            <DataTable.Title>النوع</DataTable.Title>
            <DataTable.Title numeric>الثقة</DataTable.Title>
            <DataTable.Title>التاريخ</DataTable.Title>
          </DataTable.Header>

          {verificationRecords.slice(0, 10).map((record) => (
            <DataTable.Row 
              key={record.id}
              onPress={() => showRecordDetails(record)}
            >
              <DataTable.Cell>
                <Chip 
                  mode="flat"
                  textStyle={{ 
                    color: getStatusColor(record.status),
                    fontSize: 12
                  }}
                >
                  {getStatusText(record.status)}
                </Chip>
              </DataTable.Cell>
              
              <DataTable.Cell>
                <Text style={styles.cellText}>
                  {record.request_type === 'taxi_driver' ? 'سائق تاكسي' :
                   record.request_type === 'transporter' ? 'ناقل' : 'سائق فعاليات'}
                </Text>
              </DataTable.Cell>
              
              <DataTable.Cell numeric>
                <Text style={[
                  styles.confidenceText,
                  { color: record.overall_confidence > 80 ? Colors.success : 
                           record.overall_confidence > 60 ? Colors.warning : Colors.error }
                ]}>
                  {record.overall_confidence || 0}%
                </Text>
              </DataTable.Cell>
              
              <DataTable.Cell>
                <Text style={styles.dateText}>
                  {new Date(record.created_at).toLocaleDateString('ar-AE')}
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card.Content>
    </Card>
  );

  /**
   * عرض تفاصيل السجل المحدد
   */
  const renderRecordDetails = () => {
    if (!selectedRecord) return null;

    return (
      <Card style={styles.detailsCard}>
        <Card.Content>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>تفاصيل التحقق</Text>
            <TouchableOpacity 
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsScroll}>
            {/* البيانات المرسلة */}
            <Text style={styles.sectionTitle}>البيانات المرسلة:</Text>
            <View style={styles.dataContainer}>
              <Text style={styles.dataText}>
                الاسم: {selectedRecord.submitted_data?.fullName || 'غير محدد'}
              </Text>
              <Text style={styles.dataText}>
                الهوية: {selectedRecord.submitted_data?.nationalId || 'غير محدد'}
              </Text>
              <Text style={styles.dataText}>
                تاريخ الميلاد: {selectedRecord.submitted_data?.birthDate || 'غير محدد'}
              </Text>
            </View>

            {/* البيانات المستخرجة */}
            <Text style={styles.sectionTitle}>البيانات المستخرجة:</Text>
            <View style={styles.dataContainer}>
              {selectedRecord.extracted_data?.nationalId && (
                <>
                  <Text style={styles.dataText}>
                    الاسم المستخرج: {selectedRecord.extracted_data.nationalId.name}
                  </Text>
                  <Text style={styles.dataText}>
                    الهوية المستخرجة: {selectedRecord.extracted_data.nationalId.number}
                  </Text>
                  <Text style={styles.dataText}>
                    ثقة الاستخراج: {selectedRecord.extracted_data.nationalId.confidence}%
                  </Text>
                </>
              )}
            </View>

            {/* نتائج المطابقة */}
            <Text style={styles.sectionTitle}>نتائج المطابقة:</Text>
            <View style={styles.matchesContainer}>
              {selectedRecord.verification_results?.dataMatches && (
                <>
                  <Chip 
                    mode={selectedRecord.verification_results.dataMatches.nameMatch ? 'flat' : 'outlined'}
                    style={styles.matchChip}
                  >
                    الاسم: {selectedRecord.verification_results.dataMatches.nameMatch ? '✓' : '✗'}
                  </Chip>
                  <Chip 
                    mode={selectedRecord.verification_results.dataMatches.idMatch ? 'flat' : 'outlined'}
                    style={styles.matchChip}
                  >
                    الهوية: {selectedRecord.verification_results.dataMatches.idMatch ? '✓' : '✗'}
                  </Chip>
                </>
              )}
            </View>

            {/* الملاحظات */}
            {selectedRecord.verification_results?.issues && 
             selectedRecord.verification_results.issues.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>الملاحظات:</Text>
                <View style={styles.issuesContainer}>
                  {selectedRecord.verification_results.issues.map((issue: string, index: number) => (
                    <Text key={index} style={styles.issueText}>• {issue}</Text>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color={Colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل البيانات...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>🔍 معاينة نتائج التحقق</Text>
      
      {renderStatisticsCard()}
      {renderRecordsList()}
      
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={exportData}
          icon="download"
          style={styles.actionButton}
        >
          تصدير البيانات
        </Button>
        
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          العودة
        </Button>
      </View>

      {showDetails && renderRecordDetails()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.text,
  },
  statisticsCard: {
    marginBottom: 16,
  },
  recordsCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  testButtonText: {
    marginLeft: 4,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  avgConfidenceContainer: {
    marginTop: 16,
  },
  avgConfidenceLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 8,
    borderRadius: 4,
  },
  avgConfidenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  cellText: {
    fontSize: 12,
    color: Colors.text,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailsCard: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: Colors.surface,
    elevation: 8,
    zIndex: 1000,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  detailsScroll: {
    maxHeight: 500,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  dataContainer: {
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dataText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  matchesContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  matchChip: {
    marginBottom: 4,
  },
  issuesContainer: {
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
});
