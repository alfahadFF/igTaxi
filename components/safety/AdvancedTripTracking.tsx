import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  FlatList,
  Modal,
  TextInput,
  Linking,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSafety } from '../../contexts/SafetyContext';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  priority: number;
}

interface TripTrackingProps {
  tripId: string;
  driverInfo: {
    name: string;
    phone: string;
    photo?: string;
    vehicleInfo: string;
    plateNumber: string;
  };
  routeInfo: {
    pickup: string;
    destination: string;
    estimatedDuration: number;
    distance: number;
  };
  onEmergencyTriggered?: () => void;
}

export const AdvancedTripTracking: React.FC<TripTrackingProps> = ({
  tripId,
  driverInfo,
  routeInfo,
  onEmergencyTriggered,
}) => {
  const { emergencyContacts, createTripShare, updateLocationShare, stopTripShare } = useSafety();
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shareSettings, setShareSettings] = useState({
    shareLocation: true,
    shareDriverInfo: true,
    shareRoute: true,
    alertOnDelay: true,
    alertOnRouteChange: true,
  });
  
  // Animation values
  const pulseAnim = new Animated.Value(1);
  const [statusText, setStatusText] = useState('جاهز للمشاركة');

  useEffect(() => {
    // رسوم متحركة للحالة النشطة
    if (isTrackingActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTrackingActive]);

  useEffect(() => {
    // تحديث الموقع كل 30 ثانية عند التفعيل
    let locationInterval: NodeJS.Timeout;
    
    if (isTrackingActive) {
      locationInterval = setInterval(async () => {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
        await updateLocationShare(tripId, location);
      }, 30000);
    }

    return () => {
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [isTrackingActive, tripId]);

  const generateTrackingMessage = () => {
    const baseMessage = `🚗 مشاركة رحلة IGTaxi - مباشر

👤 السائق: ${driverInfo.name}
📱 هاتف السائق: ${driverInfo.phone}
🚙 السيارة: ${driverInfo.vehicleInfo}
🔢 اللوحة: ${driverInfo.plateNumber}

📍 من: ${routeInfo.pickup}
📍 إلى: ${routeInfo.destination}
⏱️ المدة المتوقعة: ${Math.round(routeInfo.estimatedDuration)} دقيقة
📏 المسافة: ${routeInfo.distance.toFixed(1)} كم

🔗 تتبع مباشر: ${trackingUrl}

تم إرسالها من تطبيق IGTaxi 🛡️`;

    return customMessage || baseMessage;
  };

  const startAdvancedTracking = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert('تنبيه', 'يرجى اختيار جهة اتصال واحدة على الأقل');
      return;
    }

    try {
      // طلب إذن الموقع
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('خطأ', 'يحتاج التطبيق إلى إذن الموقع لمشاركة الرحلة');
        return;
      }

      // الحصول على الموقع الحالي
      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);

      // إنشاء مشاركة الرحلة
      const shareId = await createTripShare(tripId, routeInfo.destination);
      setTrackingUrl(`https://igtaxi.app/track/${shareId}`);
      setIsTrackingActive(true);
      setStatusText('الرحلة مشتركة - نشط');

      // إرسال الرسائل
      await sendTrackingMessages();

      Alert.alert(
        'تم تفعيل التتبع',
        `تم إرسال تفاصيل رحلتك إلى ${selectedContacts.length} جهة اتصال`
      );

    } catch (error) {
      console.error('خطأ في بدء التتبع:', error);
      Alert.alert('خطأ', 'حدث خطأ في تفعيل مشاركة الرحلة');
    }
  };

  const sendTrackingMessages = async () => {
    const message = generateTrackingMessage();
    
    for (const contactId of selectedContacts) {
      const contact = emergencyContacts.find(c => c.id === contactId);
      if (!contact) continue;

      try {
        // محاولة WhatsApp أولاً
        const whatsappUrl = `whatsapp://send?phone=${contact.phone}&text=${encodeURIComponent(message)}`;
        const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
        
        if (canOpenWhatsApp) {
          await Linking.openURL(whatsappUrl);
        } else {
          // SMS كبديل
          const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
          await Linking.openURL(smsUrl);
        }
        
        // تأخير قصير بين الرسائل
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`خطأ في إرسال الرسالة إلى ${contact.name}:`, error);
      }
    }
  };

  const stopTracking = async () => {
    try {
      setIsTrackingActive(false);
      setStatusText('تم إيقاف المشاركة');
      
      // إرسال رسالة الانتهاء
      const endMessage = `✅ انتهت الرحلة بأمان!

📍 وصلت إلى: ${routeInfo.destination}
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}

شكراً لمتابعتكم 🙏
تطبيق IGTaxi - وصول آمن 🏠`;

      await sendEndMessages(endMessage);
      await stopTripShare(trackingUrl); // استخدام trackingUrl بدلاً من tripId

      Alert.alert('تم الإيقاف', 'تم إيقاف مشاركة الرحلة وإرسال تأكيد الوصول');
      
    } catch (error) {
      console.error('خطأ في إيقاف التتبع:', error);
    }
  };

  const sendEndMessages = async (message: string) => {
    for (const contactId of selectedContacts) {
      const contact = emergencyContacts.find(c => c.id === contactId);
      if (!contact) continue;

      try {
        const whatsappUrl = `whatsapp://send?phone=${contact.phone}&text=${encodeURIComponent(message)}`;
        const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
        
        if (canOpenWhatsApp) {
          await Linking.openURL(whatsappUrl);
        } else {
          const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
          await Linking.openURL(smsUrl);
        }
      } catch (error) {
        console.error('خطأ في إرسال رسالة النهاية:', error);
      }
    }
  };

  const sendEmergencyAlert = async () => {
    const emergencyMessage = `🚨🚨 تنبيه طارئ من IGTaxi! 🚨🚨

أحتاج المساعدة الفورية!

👤 اسمي: [اسم المستخدم]
📍 موقعي الحالي: ${trackingUrl}
🚕 السائق: ${driverInfo.name} (${driverInfo.phone})
🚙 السيارة: ${driverInfo.vehicleInfo} - ${driverInfo.plateNumber}
⏰ الوقت: ${new Date().toLocaleString('ar-SA')}

يرجى الاتصال بي فوراً أو بالشرطة!
هاتف الطوارئ: 911

هذا تنبيه تلقائي من تطبيق IGTaxi`;

    // إرسال لجميع جهات الاتصال
    for (const contact of emergencyContacts) {
      try {
        const whatsappUrl = `whatsapp://send?phone=${contact.phone}&text=${encodeURIComponent(emergencyMessage)}`;
        const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
        
        if (canOpenWhatsApp) {
          await Linking.openURL(whatsappUrl);
        } else {
          const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(emergencyMessage)}`;
          await Linking.openURL(smsUrl);
        }
      } catch (error) {
        console.error('خطأ في إرسال تنبيه الطوارئ:', error);
      }
    }

    if (onEmergencyTriggered) {
      onEmergencyTriggered();
    }
  };

  const renderContactSelection = () => (
    <Modal
      visible={showContactsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowContactsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>اختر جهات الاتصال</Text>
            <TouchableOpacity
              onPress={() => setShowContactsModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={emergencyContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.contactItem,
                  selectedContacts.includes(item.id) && styles.selectedContact
                ]}
                onPress={() => {
                  if (selectedContacts.includes(item.id)) {
                    setSelectedContacts(prev => prev.filter(id => id !== item.id));
                  } else {
                    setSelectedContacts(prev => [...prev, item.id]);
                  }
                }}
              >
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactDetails}>
                    {item.relationship} • {item.phone}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  selectedContacts.includes(item.id) && styles.checkedBox
                ]}>
                  {selectedContacts.includes(item.id) && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => setShowContactsModal(false)}
          >
            <Text style={styles.confirmButtonText}>
              تأكيد ({selectedContacts.length} محدد)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* الحالة الرئيسية */}
      <Animated.View style={[
        styles.statusCard,
        { transform: [{ scale: pulseAnim }] },
        isTrackingActive && styles.activeStatusCard
      ]}>
        <Ionicons 
          name={isTrackingActive ? "radio-outline" : "share-outline"} 
          size={32} 
          color={isTrackingActive ? "#4CAF50" : "#007AFF"} 
        />
        <Text style={[
          styles.statusTitle,
          isTrackingActive && styles.activeStatusTitle
        ]}>
          {statusText}
        </Text>
        <Text style={styles.statusSubtitle}>
          {isTrackingActive ? 
            `${selectedContacts.length} جهة اتصال تتابع رحلتك` :
            'اضغط لبدء مشاركة رحلتك'
          }
        </Text>
      </Animated.View>

      {/* أزرار التحكم */}
      <View style={styles.controlsContainer}>
        {!isTrackingActive ? (
          <>
            <TouchableOpacity
              style={styles.selectContactsButton}
              onPress={() => setShowContactsModal(true)}
            >
              <Ionicons name="people-outline" size={20} color="#007AFF" />
              <Text style={styles.selectContactsText}>
                اختر جهات الاتصال ({selectedContacts.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                selectedContacts.length === 0 && styles.disabledButton
              ]}
              onPress={startAdvancedTracking}
              disabled={selectedContacts.length === 0}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startButtonText}>بدء المشاركة</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                Linking.openURL(trackingUrl);
              }}
            >
              <Ionicons name="link-outline" size={20} color="#007AFF" />
              <Text style={styles.shareButtonText}>فتح رابط التتبع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={() => {
                Alert.alert(
                  'تنبيه طارئ',
                  'سيتم إرسال تنبيه طوارئ لجميع جهات الاتصال. هل أنت متأكد؟',
                  [
                    { text: 'إلغاء', style: 'cancel' },
                    { 
                      text: 'إرسال', 
                      style: 'destructive',
                      onPress: sendEmergencyAlert
                    }
                  ]
                );
              }}
            >
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.emergencyButtonText}>تنبيه طارئ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopTracking}
            >
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.stopButtonText}>إيقاف المشاركة</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* معلومات الرحلة */}
      <View style={styles.tripInfoCard}>
        <Text style={styles.tripInfoTitle}>تفاصيل الرحلة</Text>
        <View style={styles.tripInfoRow}>
          <Text style={styles.tripInfoLabel}>السائق:</Text>
          <Text style={styles.tripInfoValue}>{driverInfo.name}</Text>
        </View>
        <View style={styles.tripInfoRow}>
          <Text style={styles.tripInfoLabel}>السيارة:</Text>
          <Text style={styles.tripInfoValue}>{driverInfo.vehicleInfo}</Text>
        </View>
        <View style={styles.tripInfoRow}>
          <Text style={styles.tripInfoLabel}>المسافة:</Text>
          <Text style={styles.tripInfoValue}>{routeInfo.distance.toFixed(1)} كم</Text>
        </View>
      </View>

      {renderContactSelection()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  activeStatusCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  activeStatusTitle: {
    color: '#4CAF50',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  controlsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  selectContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  selectContactsText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  shareButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#666',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tripInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tripInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'right',
  },
  tripInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tripInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tripInfoValue: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedContact: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  contactInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  contactDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdvancedTripTracking;
