import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafety } from '../../contexts/SafetyContext';
import { emergencyAudioService } from '../../utils/safety/emergency-audio-service';

interface EmergencyAudioRecorderProps {
  isVisible: boolean;
  onClose: () => void;
  onRecordingComplete?: (recordingInfo: any) => void;
  emergencyType?: 'manual' | 'auto' | 'sos';
  tripId?: string;
}

export const EmergencyAudioRecorder: React.FC<EmergencyAudioRecorderProps> = ({
  isVisible,
  onClose,
  onRecordingComplete,
  emergencyType = 'manual',
  tripId,
}) => {
  const { emergencyContacts, currentLocation } = useSafety();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingCompleted, setRecordingCompleted] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // رسوم متحركة للتسجيل
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // موجات الصوت
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      // عداد المدة
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // طلب صلاحيات الموقع والميكروفون
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('تنبيه', 'يحتاج التطبيق إلى صلاحية الموقع لحفظ موقع التسجيل');
      }

      // الحصول على الموقع الحالي
      let currentLocationData = null;
      try {
        const location = await Location.getCurrentPositionAsync({});
        currentLocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || undefined
        };
      } catch (error) {
        console.log('لم يتم الحصول على الموقع:', error);
      }

      // إنشاء معرف التسجيل
      const newRecordingId = `emergency_${Date.now()}`;
      
      // إنشاء التسجيل في قاعدة البيانات
      await emergencyAudioService.createRecording({
        recording_id: newRecordingId,
        trip_id: tripId,
        recording_type: emergencyType as any,
        emergency_level: emergencyType === 'sos' ? 'critical' : 
                       emergencyType === 'auto' ? 'high' : 'medium',
        location: currentLocationData || undefined,
        metadata: {
          started_at: new Date().toISOString(),
          device_info: Platform.OS,
          app_version: '1.0.0'
        }
      });

      setRecordingId(newRecordingId);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingCompleted(false);
      
      console.log('بدء التسجيل الصوتي للطوارئ:', newRecordingId);

    } catch (error) {
      console.error('خطأ في بدء التسجيل:', error);
      Alert.alert('خطأ', 'حدث خطأ في بدء التسجيل الصوتي');
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      
      if (!recordingId) {
        Alert.alert('خطأ', 'لم يتم العثور على معرف التسجيل');
        return;
      }

      // تحديث التسجيل في قاعدة البيانات
      await emergencyAudioService.updateRecording(recordingId, {
        duration_seconds: recordingDuration,
        status: 'active',
        metadata: {
          completed_at: new Date().toISOString(),
          final_duration: recordingDuration,
          device_info: Platform.OS,
        }
      });
      
      const recordingData = {
        id: recordingId,
        duration: recordingDuration,
        timestamp: new Date().toISOString(),
        emergencyType,
        tripId,
        location: currentLocation ? {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        } : null,
        path: `emergency_audio/${recordingId}.m4a`,
      };
      
      setRecordingCompleted(true);
      
      if (onRecordingComplete) {
        onRecordingComplete(recordingData);
      }

      console.log('تم حفظ التسجيل:', recordingData);
      
    } catch (error) {
      console.error('خطأ في إيقاف التسجيل:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ التسجيل');
    }
  };

  const shareRecording = async () => {
    if (!recordingId) return;

    Alert.alert(
      'مشاركة التسجيل',
      'هل تريد مشاركة هذا التسجيل مع جهات الاتصال الطارئة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'مشاركة', 
          onPress: async () => {
            try {
              // مشاركة التسجيل مع جميع جهات الاتصال الطارئة
              let sharedCount = 0;
              for (const contact of emergencyContacts) {
                try {
                  await emergencyAudioService.shareRecording({
                    recording_id: recordingId,
                    contact_id: contact.id,
                    share_method: 'whatsapp',
                    share_message: `تسجيل صوتي طارئ من ${emergencyType === 'sos' ? 'زر الطوارئ' : 'النظام الآلي'}`
                  });
                  sharedCount++;
                } catch (error) {
                  console.error('خطأ في مشاركة التسجيل مع:', contact.name, error);
                }
              }

              // تحديث حالة التسجيل
              await emergencyAudioService.updateRecording(recordingId, {
                is_shared: true,
                shared_at: new Date().toISOString(),
                shared_with_contacts: emergencyContacts.map(c => c.id)
              });

              Alert.alert('تم الإرسال', `تم إرسال التسجيل الصوتي إلى ${sharedCount} جهة اتصال`);
              onClose();
            } catch (error) {
              console.error('خطأ في مشاركة التسجيل:', error);
              Alert.alert('خطأ', 'حدث خطأ في مشاركة التسجيل');
            }
          }
        }
      ]
    );
  };

  const deleteRecording = async () => {
    Alert.alert(
      'حذف التسجيل',
      'هل تريد حذف هذا التسجيل؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (recordingId) {
                await emergencyAudioService.deleteRecording(recordingId);
              }
              setRecordingId(null);
              setRecordingCompleted(false);
              setRecordingDuration(0);
            } catch (error) {
              console.error('خطأ في حذف التسجيل:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف التسجيل');
            }
          }
        }
      ]
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingTypeText = () => {
    switch (emergencyType) {
      case 'auto':
        return 'تسجيل تلقائي للطوارئ';
      case 'sos':
        return 'تسجيل SOS';
      default:
        return 'تسجيل يدوي للطوارئ';
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>{getRecordingTypeText()}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Recording Interface */}
          <View style={styles.recordingContainer}>
            
            {/* Visual Feedback */}
            {isRecording && (
              <View style={styles.waveContainer}>
                {[...Array(5)].map((_, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveBar,
                      {
                        opacity: waveAnim,
                        transform: [{
                          scaleY: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1 + (index * 0.2)],
                          })
                        }]
                      }
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Record Button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingButton
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={32}
                  color="#fff"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* Duration Display */}
            <Text style={styles.durationText}>
              {formatDuration(recordingDuration)}
            </Text>

            {/* Status Text */}
            <Text style={styles.statusText}>
              {isRecording ? 'جاري التسجيل...' : 
               recordingCompleted ? 'تم حفظ التسجيل' : 'اضغط للبدء'}
            </Text>

          </View>

          {/* Recording Controls */}
          {recordingCompleted && !isRecording && (
            <View style={styles.controlsContainer}>
              
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => {
                  Alert.alert('تشغيل التسجيل', 'سيتم تشغيل التسجيل الصوتي');
                }}
              >
                <Ionicons name="play" size={20} color="#007AFF" />
                <Text style={styles.playButtonText}>تشغيل</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareButton}
                onPress={shareRecording}
              >
                <Ionicons name="share-outline" size={20} color="#4CAF50" />
                <Text style={styles.shareButtonText}>مشاركة</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={deleteRecording}
              >
                <Ionicons name="trash-outline" size={20} color="#FF4444" />
                <Text style={styles.deleteButtonText}>حذف</Text>
              </TouchableOpacity>

            </View>
          )}

          {/* Emergency Info */}
          <View style={styles.emergencyInfo}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.emergencyInfoText}>
              {emergencyContacts.length > 0 ? 
                `سيتم إرسال التسجيل إلى ${emergencyContacts.length} جهة اتصال` :
                'أضف جهات اتصال طارئة لمشاركة التسجيل'
              }
            </Text>
          </View>

          {/* Emergency Actions */}
          {recordingCompleted && (
            <View style={styles.emergencyActions}>
              <TouchableOpacity
                style={styles.emergencyCallButton}
                onPress={() => {
                  Alert.alert(
                    'اتصال طارئ',
                    'هل تريد الاتصال بخدمات الطوارئ؟',
                    [
                      { text: 'إلغاء', style: 'cancel' },
                      { 
                        text: 'اتصال', 
                        onPress: () => {
                          // هنا سيتم الاتصال برقم الطوارئ
                          Alert.alert('جاري الاتصال', 'جاري الاتصال بخدمات الطوارئ...');
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.emergencyCallText}>اتصال طارئ</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    marginBottom: 24,
    gap: 4,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    height: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 16,
  },
  recordingButton: {
    backgroundColor: '#FF4444',
  },
  durationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  playButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  shareButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  emergencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  emergencyInfoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right',
    lineHeight: 16,
  },
  emergencyActions: {
    marginTop: 16,
    alignItems: 'center',
  },
  emergencyCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  emergencyCallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EmergencyAudioRecorder;
