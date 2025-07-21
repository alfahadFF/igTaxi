import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { TextInput, Button, ProgressBar, Card, Chip } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { DriverVerificationSystem, VerificationRequest } from '../../utils/driver-verification';

/**
 * شاشة التحقق من هوية السائق
 * تدعم رفع الوثائق والتحقق الذكي
 */

interface DocumentUpload {
  uri: string;
  name: string;
  type: string;
  size: number;
}

interface DriverVerificationScreenProps {
  route: {
    params: {
      driverId: string;
      requestType: 'taxi_driver' | 'transporter' | 'event_driver';
      countryCode: string;
    };
  };
  navigation: any;
}

export default function DriverVerificationScreen({ route, navigation }: DriverVerificationScreenProps) {
  const { driverId, requestType, countryCode } = route.params;
  
  // حالة النموذج
  const [formData, setFormData] = useState({
    fullName: '',
    nationalId: '',
    birthDate: '',
    licenseNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
    vehicleInfo: {
      make: '',
      model: '',
      year: '',
      color: '',
      plateNumber: ''
    }
  });
  
  // حالة الملفات
  const [documents, setDocuments] = useState<{[key: string]: DocumentUpload | null}>({
    nationalIdFront: null,
    nationalIdBack: null,
    drivingLicenseFront: null,
    drivingLicenseBack: null,
    vehicleRegistration: null,
    profilePhoto: null
  });
  
  // حالة المعالجة
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [progress, setProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // حالة متطلبات الدولة
  const [countryRequirements, setCountryRequirements] = useState<any>(null);

  useEffect(() => {
    loadCountryRequirements();
  }, [countryCode, requestType]);

  /**
   * تحميل متطلبات الدولة
   */
  const loadCountryRequirements = async () => {
    try {
      // هنا يمكن جلب المتطلبات من قاعدة البيانات
      // للآن نستخدم متطلبات افتراضية
      const defaultRequirements = {
        required_docs: ['national_id', 'driving_license'],
        optional_docs: requestType === 'transporter' ? ['vehicle_registration'] : [],
        transport_license_required: requestType === 'transporter' && countryCode === 'SA'
      };
      
      setCountryRequirements(defaultRequirements);
    } catch (error) {
      console.error('خطأ في تحميل متطلبات الدولة:', error);
    }
  };

  /**
   * اختيار صورة من المعرض أو الكاميرا
   */
  const pickImage = async (documentType: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        setDocuments(prev => ({
          ...prev,
          [documentType]: {
            uri: asset.uri,
            name: `${documentType}.jpg`,
            type: 'image/jpeg',
            size: asset.fileSize || 0
          }
        }));
      }
    } catch (error) {
      console.error('خطأ في اختيار الصورة:', error);
      Alert.alert('خطأ', 'فشل في اختيار الصورة');
    }
  };

  /**
   * التقاط صورة بالكاميرا
   */
  const takePhoto = async (documentType: string) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        setDocuments(prev => ({
          ...prev,
          [documentType]: {
            uri: asset.uri,
            name: `${documentType}.jpg`,
            type: 'image/jpeg',
            size: asset.fileSize || 0
          }
        }));
      }
    } catch (error) {
      console.error('خطأ في التقاط الصورة:', error);
      Alert.alert('خطأ', 'فشل في التقاط الصورة');
    }
  };

  /**
   * عرض خيارات تحديد الصورة
   */
  const showImageOptions = (documentType: string) => {
    Alert.alert(
      'اختيار الصورة',
      'كيف تريد إضافة الصورة؟',
      [
        { text: 'الكاميرا', onPress: () => takePhoto(documentType) },
        { text: 'المعرض', onPress: () => pickImage(documentType) },
        { text: 'إلغاء', style: 'cancel' }
      ]
    );
  };

  /**
   * تحديث بيانات النموذج
   */
  const updateFormData = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  /**
   * التحقق من صحة البيانات
   */
  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال الاسم الكامل');
      return false;
    }
    
    if (!formData.nationalId.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم الهوية الوطنية');
      return false;
    }
    
    if (!formData.birthDate.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال تاريخ الميلاد');
      return false;
    }
    
    if (!documents.nationalIdFront) {
      Alert.alert('خطأ', 'يرجى رفع صورة الهوية الوطنية (الوجه الأمامي)');
      return false;
    }
    
    if (!documents.drivingLicenseFront) {
      Alert.alert('خطأ', 'يرجى رفع صورة رخصة القيادة (الوجه الأمامي)');
      return false;
    }
    
    if (requestType === 'transporter' && !documents.vehicleRegistration) {
      Alert.alert('خطأ', 'يرجى رفع صورة تسجيل المركبة');
      return false;
    }
    
    return true;
  };

  /**
   * تحويل DocumentUpload إلى File
   */
  const documentToFile = (doc: DocumentUpload): File => {
    // في البيئة الحقيقية، ستحتاج لتحويل أفضل
    // هذا مثال مبسط
    return new File([], doc.name, { type: doc.type });
  };

  /**
   * إرسال طلب التحقق
   */
  const submitVerification = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // إعداد طلب التحقق
      const verificationRequest: VerificationRequest = {
        driverId,
        requestType,
        countryCode,
        documents: {
          nationalIdFront: documents.nationalIdFront ? documentToFile(documents.nationalIdFront) : undefined,
          nationalIdBack: documents.nationalIdBack ? documentToFile(documents.nationalIdBack) : undefined,
          drivingLicenseFront: documents.drivingLicenseFront ? documentToFile(documents.drivingLicenseFront) : undefined,
          drivingLicenseBack: documents.drivingLicenseBack ? documentToFile(documents.drivingLicenseBack) : undefined,
          vehicleRegistration: documents.vehicleRegistration ? documentToFile(documents.vehicleRegistration) : undefined,
          profilePhoto: documents.profilePhoto ? documentToFile(documents.profilePhoto) : undefined
        },
        submittedData: formData
      };

      // بدء عملية التحقق
      const verificationSystem = new DriverVerificationSystem(countryCode);
      
      // محاكاة تقدم المعالجة
      setProcessingStep('رفع الملفات...');
      setProgress(0.2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStep('استخراج البيانات من الوثائق...');
      setProgress(0.4);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProcessingStep('التحقق من صحة البيانات...');
      setProgress(0.6);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStep('تطبيق قواعد التحقق...');
      setProgress(0.8);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProcessingStep('إنهاء المعالجة...');
      setProgress(1.0);
      
      // معالجة الطلب
      const result = await verificationSystem.processVerificationRequest(verificationRequest);
      
      setVerificationResult(result);
      setProcessingStep('تم الانتهاء!');
      
      // تنظيف الموارد
      await verificationSystem.cleanup();
      
    } catch (error) {
      console.error('خطأ في التحقق:', error);
      Alert.alert('خطأ', 'فشل في معالجة طلب التحقق');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * عرض نتيجة التحقق
   */
  const renderVerificationResult = () => {
    if (!verificationResult) return null;
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved': return Colors.success;
        case 'rejected': return Colors.error;
        case 'manual_review': return Colors.warning;
        default: return Colors.text;
      }
    };
    
    const getStatusText = (status: string) => {
      switch (status) {
        case 'approved': return 'تم الموافقة';
        case 'rejected': return 'مرفوض';
        case 'manual_review': return 'يحتاج مراجعة يدوية';
        default: return status;
      }
    };

    return (
      <Card style={styles.resultCard}>
        <Card.Content>
          <View style={styles.resultHeader}>
            <MaterialIcons 
              name={verificationResult.status === 'approved' ? 'check-circle' : 
                    verificationResult.status === 'rejected' ? 'error' : 'schedule'} 
              size={32} 
              color={getStatusColor(verificationResult.status)} 
            />
            <Text style={[styles.resultTitle, { color: getStatusColor(verificationResult.status) }]}>
              {getStatusText(verificationResult.status)}
            </Text>
          </View>
          
          <Text style={styles.confidenceText}>
            درجة الثقة: {Math.round(verificationResult.confidence)}%
          </Text>
          
          {verificationResult.issues.length > 0 && (
            <View style={styles.issuesContainer}>
              <Text style={styles.issuesTitle}>الملاحظات:</Text>
              {verificationResult.issues.map((issue: string, index: number) => (
                <Text key={index} style={styles.issueText}>• {issue}</Text>
              ))}
            </View>
          )}
          
          {verificationResult.recommendations && verificationResult.recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>التوصيات:</Text>
              {verificationResult.recommendations.map((rec: string, index: number) => (
                <Text key={index} style={styles.recommendationText}>• {rec}</Text>
              ))}
            </View>
          )}
          
          <View style={styles.matchesContainer}>
            <Text style={styles.matchesTitle}>نتائج المطابقة:</Text>
            <View style={styles.matchRow}>
              <Chip 
                mode={verificationResult.dataMatches.nameMatch ? 'flat' : 'outlined'}
                textStyle={{ color: verificationResult.dataMatches.nameMatch ? Colors.success : Colors.error }}
              >
                الاسم: {verificationResult.dataMatches.nameMatch ? '✓' : '✗'}
              </Chip>
              <Chip 
                mode={verificationResult.dataMatches.idMatch ? 'flat' : 'outlined'}
                textStyle={{ color: verificationResult.dataMatches.idMatch ? Colors.success : Colors.error }}
              >
                الهوية: {verificationResult.dataMatches.idMatch ? '✓' : '✗'}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  /**
   * عرض مربع رفع الوثيقة
   */
  const renderDocumentUpload = (
    documentType: string, 
    title: string, 
    isRequired: boolean = true
  ) => {
    const document = documents[documentType];
    
    return (
      <Card style={styles.documentCard}>
        <Card.Content>
          <View style={styles.documentHeader}>
            <Text style={styles.documentTitle}>{title}</Text>
            {isRequired && <Text style={styles.requiredText}>*</Text>}
          </View>
          
          {document ? (
            <View style={styles.uploadedDocument}>
              <Image source={{ uri: document.uri }} style={styles.documentImage} />
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{document.name}</Text>
                <Text style={styles.documentSize}>
                  {(document.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setDocuments(prev => ({ ...prev, [documentType]: null }))}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => showImageOptions(documentType)}
            >
              <MaterialIcons name="add-a-photo" size={32} color={Colors.primary} />
              <Text style={styles.uploadText}>اضغط لرفع الصورة</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (verificationResult) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {renderVerificationResult()}
        
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          العودة
        </Button>
      </ScrollView>
    );
  }

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <MaterialIcons name="verified-user" size={64} color={Colors.primary} />
        <Text style={styles.processingTitle}>جاري التحقق من الهوية</Text>
        <Text style={styles.processingStep}>{processingStep}</Text>
        <ProgressBar progress={progress} color={Colors.primary} style={styles.progressBar} />
        <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>التحقق من هوية السائق</Text>
      <Text style={styles.subtitle}>
        نوع السائق: {requestType} | الدولة: {countryCode}
      </Text>
      
      {/* النموذج */}
      <Card style={styles.formCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>البيانات الشخصية</Text>
          
          <TextInput
            label="الاسم الكامل *"
            value={formData.fullName}
            onChangeText={(text) => updateFormData('fullName', text)}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="رقم الهوية الوطنية *"
            value={formData.nationalId}
            onChangeText={(text) => updateFormData('nationalId', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />
          
          <TextInput
            label="تاريخ الميلاد (DD/MM/YYYY) *"
            value={formData.birthDate}
            onChangeText={(text) => updateFormData('birthDate', text)}
            style={styles.input}
            mode="outlined"
            placeholder="01/01/1990"
          />
          
          <TextInput
            label="رقم رخصة القيادة"
            value={formData.licenseNumber}
            onChangeText={(text) => updateFormData('licenseNumber', text)}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="رقم الهاتف *"
            value={formData.phoneNumber}
            onChangeText={(text) => updateFormData('phoneNumber', text)}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          {requestType === 'transporter' && (
            <>
              <Text style={styles.sectionTitle}>معلومات المركبة</Text>
              
              <TextInput
                label="نوع المركبة"
                value={formData.vehicleInfo.make}
                onChangeText={(text) => updateFormData('vehicleInfo.make', text)}
                style={styles.input}
                mode="outlined"
              />
              
              <TextInput
                label="موديل المركبة"
                value={formData.vehicleInfo.model}
                onChangeText={(text) => updateFormData('vehicleInfo.model', text)}
                style={styles.input}
                mode="outlined"
              />
              
              <TextInput
                label="رقم اللوحة"
                value={formData.vehicleInfo.plateNumber}
                onChangeText={(text) => updateFormData('vehicleInfo.plateNumber', text)}
                style={styles.input}
                mode="outlined"
              />
            </>
          )}
        </Card.Content>
      </Card>

      {/* رفع الوثائق */}
      <Text style={styles.sectionTitle}>الوثائق المطلوبة</Text>
      
      {renderDocumentUpload('nationalIdFront', 'الهوية الوطنية (الوجه الأمامي)', true)}
      {renderDocumentUpload('nationalIdBack', 'الهوية الوطنية (الوجه الخلفي)', false)}
      {renderDocumentUpload('drivingLicenseFront', 'رخصة القيادة (الوجه الأمامي)', true)}
      {renderDocumentUpload('drivingLicenseBack', 'رخصة القيادة (الوجه الخلفي)', false)}
      
      {requestType === 'transporter' && 
        renderDocumentUpload('vehicleRegistration', 'تسجيل المركبة', true)
      }
      
      {renderDocumentUpload('profilePhoto', 'الصورة الشخصية', false)}

      {/* زر الإرسال */}
      <Button
        mode="contained"
        onPress={submitVerification}
        style={styles.submitButton}
        contentStyle={styles.submitButtonContent}
      >
        بدء التحقق
      </Button>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  formCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  documentCard: {
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  requiredText: {
    color: Colors.error,
    marginLeft: 4,
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: Colors.backgroundLight,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    color: Colors.primary,
    fontSize: 14,
  },
  uploadedDocument: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
  },
  documentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  documentSize: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  processingStep: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  resultCard: {
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  confidenceText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  issuesContainer: {
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 8,
  },
  issueText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 4,
  },
  recommendationsContainer: {
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.warning,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: Colors.warning,
    marginBottom: 4,
  },
  matchesContainer: {
    marginTop: 16,
  },
  matchesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  matchRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    marginTop: 16,
  },
});
