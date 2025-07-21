import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Animated,
  Vibration,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafety } from '@/contexts/SafetyContext';
import { 
  AlertTriangle, 
  Phone, 
  X, 
  MapPin, 
  Clock,
  Users,
  Shield,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SOSButtonProps {
  size?: 'small' | 'medium' | 'large';
  onSOSTriggered?: () => void;
}

const SOSButton: React.FC<SOSButtonProps> = ({ 
  size = 'medium', 
  onSOSTriggered 
}) => {
  const { theme } = useTheme();
  const { 
    emergencySettings, 
    triggerSOS, 
    activeIncident, 
    resolveSOS, 
    reportFalseAlarm 
  } = useSafety();

  const [showSOSModal, setShowSOSModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCountingDown, setIsCountingDown] = useState(false);
  
  // Animation values
  const pulseAnim = new Animated.Value(1);
  const shakeAnim = new Animated.Value(0);

  useEffect(() => {
    if (activeIncident && activeIncident.status === 'active') {
      setShowSOSModal(true);
    } else {
      setShowSOSModal(false);
    }
  }, [activeIncident]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCountingDown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setIsCountingDown(false);
            handleSOSConfirm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCountingDown, countdown]);

  // Pulse animation for active incident
  useEffect(() => {
    if (activeIncident?.status === 'active') {
      const pulse = Animated.loop(
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
      );
      pulse.start();
      
      return () => pulse.stop();
    }
  }, [activeIncident]);

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 60, height: 60 };
      case 'large':
        return { width: 120, height: 120 };
      default:
        return { width: 80, height: 80 };
    }
  };

  const handleSOSPress = () => {
    if (activeIncident?.status === 'active') {
      setShowSOSModal(true);
      return;
    }

    // Vibrate to alert user
    Vibration.vibrate([0, 100, 100, 100]);

    // Show emergency type selection
    Alert.alert(
      '🚨 اختر نوع الطوارئ',
      'حدد نوع الطوارئ لإرسال الإشعار المناسب:',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: '🚑 طوارئ صحية',
          onPress: () => handleEmergencyType('medical'),
        },
        {
          text: '⚠️ أمني / اعتداء',
          onPress: () => handleEmergencyType('security'),
        },
        {
          text: '🚗 حادث مروري',
          onPress: () => handleEmergencyType('accident'),
        },
        {
          text: '😰 حالة ذعر',
          onPress: () => handleEmergencyType('panic'),
        },
      ]
    );
  };

  const handleEmergencyType = (type: 'medical' | 'security' | 'accident' | 'panic') => {
    const emergencyMessages = {
      medical: '🚑 طوارئ صحية - يحتاج الراكب للمساعدة الطبية الفورية',
      security: '⚠️ طوارئ أمنية - الراكب في خطر ويحتاج للمساعدة',
      accident: '🚗 حادث مروري - تم وقوع حادث ويحتاج للمساعدة',
      panic: '😰 حالة ذعر - الراكب يشعر بالخوف ويحتاج للطمأنة',
    };

    if (emergencySettings.autoDialAfterSOS && emergencySettings.sosCountdown > 0) {
      setCountdown(emergencySettings.sosCountdown);
      setIsCountingDown(true);
      setShowSOSModal(true);
    } else {
      Alert.alert(
        '🚨 تأكيد حالة الطوارئ',
        `${emergencyMessages[type]}\n\nسيتم إشعار جهات الاتصال الطارئة فوراً.`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'نعم، إرسال SOS',
            style: 'destructive',
            onPress: () => handleSOSConfirm(type),
          },
        ]
      );
    }
  };

  const handleSOSConfirm = async (type: 'medical' | 'security' | 'accident' | 'panic' = 'medical') => {
    try {
      await triggerSOS(type === 'medical' ? 'sos' : 'panic');
      onSOSTriggered?.();
      
      // Strong vibration pattern
      Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال إشارة الاستغاثة. حاول مرة أخرى.');
    }
  };

  const handleCancelCountdown = () => {
    setIsCountingDown(false);
    setCountdown(0);
    setShowSOSModal(false);
  };

  const handleResolveIncident = () => {
    if (activeIncident) {
      Alert.alert(
        'حل الحادث',
        'هل تريد حل حالة الطوارئ؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'تم الحل',
            onPress: () => resolveSOS(activeIncident.id, 'تم حل الحادث بأمان'),
          },
          {
            text: 'إنذار كاذب',
            style: 'destructive',
            onPress: () => reportFalseAlarm(activeIncident.id),
          },
        ]
      );
    }
  };

  const styles = StyleSheet.create({
    sosButton: {
      ...getSizeStyle(),
      borderRadius: getSizeStyle().width / 2,
      backgroundColor: activeIncident?.status === 'active' ? '#ff4444' : '#ff6b6b',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#ff0000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 3,
      borderColor: '#ffffff',
    },
    activeButton: {
      backgroundColor: '#ff0000',
      shadowOpacity: 0.6,
      shadowRadius: 12,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 24,
      width: width * 0.9,
      maxWidth: 400,
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ff4444',
      textAlign: 'center',
      marginBottom: 16,
    },
    countdownContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    countdownNumber: {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ff4444',
    },
    countdownText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    incidentInfo: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      marginVertical: 16,
      width: '100%',
    },
    incidentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    incidentText: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: 8,
      flex: 1,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
    },
    confirmButton: {
      backgroundColor: '#ff4444',
    },
    resolveButton: {
      backgroundColor: '#4CAF50',
    },
    emergencyButton: {
      backgroundColor: '#ff6b6b',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    confirmButtonText: {
      color: '#ffffff',
    },
    emergencyInfo: {
      backgroundColor: '#fff3cd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    emergencyInfoText: {
      fontSize: 14,
      color: '#856404',
      textAlign: 'center',
    },
  });

  const renderCountdownModal = () => (
    <Modal
      visible={showSOSModal && isCountingDown}
      transparent
      animationType="fade"
    >
      <View style={styles.modal}>
        <View style={styles.modalContent}>
          <AlertTriangle size={48} color="#ff4444" />
          <Text style={styles.modalTitle}>سيتم إرسال SOS خلال</Text>
          
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownText}>
              سيتم إشعار جهات الاتصال الطارئة تلقائياً
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancelCountdown}
            >
              <Text style={[styles.buttonText, styles.cancelButtonText]}>إلغاء</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => handleSOSConfirm()}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>إرسال الآن</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderActiveIncidentModal = () => (
    <Modal
      visible={showSOSModal && activeIncident?.status === 'active'}
      transparent
      animationType="slide"
    >
      <View style={styles.modal}>
        <View style={styles.modalContent}>
          <Shield size={48} color="#ff4444" />
          <Text style={styles.modalTitle}>حالة طوارئ نشطة</Text>
          
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyInfoText}>
              تم إرسال إشارة الاستغاثة. جهات الاتصال الطارئة تم إشعارها.
            </Text>
          </View>

          {activeIncident && (
            <View style={styles.incidentInfo}>
              <View style={styles.incidentRow}>
                <Clock size={16} color={theme.colors.textSecondary} />
                <Text style={styles.incidentText}>
                  {activeIncident.timestamp.toLocaleTimeString('ar')}
                </Text>
              </View>
              
              <View style={styles.incidentRow}>
                <MapPin size={16} color={theme.colors.textSecondary} />
                <Text style={styles.incidentText}>
                  {activeIncident.location.address || 'الموقع الحالي'}
                </Text>
              </View>
              
              <View style={styles.incidentRow}>
                <Users size={16} color={theme.colors.textSecondary} />
                <Text style={styles.incidentText}>
                  تم إشعار {activeIncident.contactsNotified.length} جهة اتصال
                </Text>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowSOSModal(false)}
            >
              <X size={16} color={theme.colors.text} />
              <Text style={[styles.buttonText, styles.cancelButtonText]}>إغلاق</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.emergencyButton]}
              onPress={() => {/* Call emergency services */}}
            >
              <Phone size={16} color="#ffffff" />
              <Text style={[styles.buttonText, styles.confirmButtonText]}>
                اتصال: {emergencySettings.policeHotline}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.resolveButton]}
              onPress={handleResolveIncident}
            >
              <Text style={[styles.buttonText, styles.confirmButtonText]}>تم الحل</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Animated.View
        style={[
          { transform: [{ scale: pulseAnim }, { translateX: shakeAnim }] }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.sosButton,
            activeIncident?.status === 'active' && styles.activeButton,
          ]}
          onPress={handleSOSPress}
          activeOpacity={0.8}
        >
          <AlertTriangle 
            size={size === 'small' ? 24 : size === 'large' ? 40 : 32} 
            color="#ffffff" 
          />
        </TouchableOpacity>
      </Animated.View>

      {renderCountdownModal()}
      {renderActiveIncidentModal()}
    </>
  );
};

export default SOSButton;
