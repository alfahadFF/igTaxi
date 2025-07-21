import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Share,
  Clipboard,
  Linking,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafety, TripShare } from '@/contexts/SafetyContext';
import {
  Share as ShareIcon,
  Copy,
  MessageCircle,
  MapPin,
  Clock,
  User,
  X,
  Eye,
  EyeOff,
  Phone,
  ExternalLink,
  QrCode,
  Users,
} from 'lucide-react-native';

interface TripSharingControlsProps {
  tripId?: string;
  destination?: string;
  onTripShared?: (shareCode: string) => void;
}

const TripSharingControls: React.FC<TripSharingControlsProps> = ({
  tripId,
  destination,
  onTripShared,
}) => {
  const { theme } = useTheme();
  const { 
    activeTripShare, 
    createTripShare, 
    stopTripShare, 
    emergencyContacts,
    shareLocation 
  } = useSafety();
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  useEffect(() => {
    if (activeTripShare) {
      generateShareMessage();
    }
  }, [activeTripShare]);

  const generateShareMessage = () => {
    if (!activeTripShare) return;
    
    const message = `🚗 مشاركة رحلة من IGTaxi

📍 الوجهة: ${destination || 'غير محدد'}
🕒 بدء الرحلة: ${activeTripShare.startTime.toLocaleTimeString('ar')}
👤 الراكب: ${activeTripShare.passengerName}

يمكنك تتبع موقعي المباشر من خلال الرابط:
${activeTripShare.shareUrl}

أو استخدم الكود: ${activeTripShare.shareCode}

سيتم إشعارك عند وصولي بأمان 🛡️`;
    
    setShareMessage(message);
  };

  const handleCreateTripShare = async () => {
    if (!tripId) {
      Alert.alert('خطأ', 'معرف الرحلة غير متوفر');
      return;
    }

    setIsCreatingShare(true);
    try {
      const shareCode = await createTripShare(tripId, destination);
      onTripShared?.(shareCode);
      generateShareMessage();
      setShowShareModal(true);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إنشاء مشاركة الرحلة');
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleStopTripShare = () => {
    Alert.alert(
      'إيقاف المشاركة',
      'هل أنت متأكد من إيقاف مشاركة الرحلة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إيقاف',
          style: 'destructive',
          onPress: () => {
            if (activeTripShare) {
              stopTripShare(activeTripShare.id);
            }
          },
        },
      ]
    );
  };

  const handleShareToContact = async (contactId: string) => {
    const contact = emergencyContacts.find(c => c.id === contactId);
    if (!contact || !activeTripShare) return;

    try {
      // Send via SMS
      const smsUrl = `sms:${contact.phone}?body=${encodeURIComponent(shareMessage)}`;
      await Linking.openURL(smsUrl);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إرسال الرسالة');
    }
  };

  const handleCopyShareLink = async () => {
    if (activeTripShare) {
      await Clipboard.setString(activeTripShare.shareUrl);
      Alert.alert('تم النسخ', 'تم نسخ رابط المشاركة');
    }
  };

  const handleCopyShareCode = async () => {
    if (activeTripShare) {
      await Clipboard.setString(activeTripShare.shareCode);
      Alert.alert('تم النسخ', 'تم نسخ كود المشاركة');
    }
  };

  const handleShareViaSystem = async () => {
    try {
      await Share.share({
        message: shareMessage,
        title: 'مشاركة رحلة IGTaxi',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderActiveShare = () => {
    if (!activeTripShare) return null;

    const elapsedTime = Math.floor((Date.now() - activeTripShare.startTime.getTime()) / 1000 / 60);

    return (
      <View style={styles.activeShareContainer}>
        <View style={styles.activeShareHeader}>
          <View style={styles.shareStatusBadge}>
            <Eye size={16} color="#4CAF50" />
            <Text style={styles.shareStatusText}>مشاركة نشطة</Text>
          </View>
          <TouchableOpacity
            style={styles.stopShareButton}
            onPress={handleStopTripShare}
          >
            <EyeOff size={16} color="#ffffff" />
            <Text style={styles.stopShareText}>إيقاف</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shareInfo}>
          <View style={styles.shareInfoRow}>
            <MapPin size={16} color={theme.colors.textSecondary} />
            <Text style={styles.shareInfoText}>
              {destination || 'الوجهة غير محددة'}
            </Text>
          </View>
          
          <View style={styles.shareInfoRow}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={styles.shareInfoText}>
              {elapsedTime} دقيقة منذ البداية
            </Text>
          </View>
          
          <View style={styles.shareInfoRow}>
            <Users size={16} color={theme.colors.textSecondary} />
            <Text style={styles.shareInfoText}>
              {activeTripShare.sharedWith.length} شخص يتتبع الرحلة
            </Text>
          </View>
        </View>

        <View style={styles.shareActions}>
          <TouchableOpacity
            style={styles.shareActionButton}
            onPress={() => setShowShareModal(true)}
          >
            <ShareIcon size={16} color={theme.colors.primary} />
            <Text style={styles.shareActionText}>مشاركة إضافية</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.shareActionButton}
            onPress={handleCopyShareLink}
          >
            <Copy size={16} color={theme.colors.primary} />
            <Text style={styles.shareActionText}>نسخ الرابط</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderShareModal = () => (
    <Modal
      visible={showShareModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>مشاركة الرحلة</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowShareModal(false)}
            >
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {activeTripShare && (
              <>
                <View style={styles.shareCodeSection}>
                  <Text style={styles.sectionTitle}>كود المشاركة</Text>
                  <View style={styles.shareCodeContainer}>
                    <Text style={styles.shareCodeText}>
                      {activeTripShare.shareCode}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyShareCode}
                    >
                      <Copy size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.shareLinkSection}>
                  <Text style={styles.sectionTitle}>رابط التتبع</Text>
                  <View style={styles.shareLinkContainer}>
                    <Text style={styles.shareLinkText} numberOfLines={1}>
                      {activeTripShare.shareUrl}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={handleCopyShareLink}
                    >
                      <Copy size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.quickShareSection}>
                  <Text style={styles.sectionTitle}>مشاركة سريعة</Text>
                  <View style={styles.quickShareButtons}>
                    <TouchableOpacity
                      style={styles.quickShareButton}
                      onPress={handleShareViaSystem}
                    >
                      <ShareIcon size={20} color="#ffffff" />
                      <Text style={styles.quickShareButtonText}>مشاركة عامة</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.quickShareButton, styles.whatsappButton]}
                      onPress={() => {
                        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
                        Linking.openURL(whatsappUrl).catch(() => {
                          Alert.alert('خطأ', 'WhatsApp غير متوفر');
                        });
                      }}
                    >
                      <MessageCircle size={20} color="#ffffff" />
                      <Text style={styles.quickShareButtonText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {emergencyContacts.length > 0 && (
                  <View style={styles.contactsSection}>
                    <Text style={styles.sectionTitle}>إرسال لجهات الاتصال</Text>
                    {emergencyContacts.map((contact) => (
                      <TouchableOpacity
                        key={contact.id}
                        style={styles.contactItem}
                        onPress={() => handleShareToContact(contact.id)}
                      >
                        <View style={styles.contactInfo}>
                          <User size={16} color={theme.colors.text} />
                          <Text style={styles.contactName}>{contact.name}</Text>
                          <Text style={styles.contactPhone}>{contact.phone}</Text>
                        </View>
                        <MessageCircle size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.messagePreview}>
                  <Text style={styles.sectionTitle}>معاينة الرسالة</Text>
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>{shareMessage}</Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const styles = StyleSheet.create({
    container: {
      padding: 16,
    },
    startShareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 16,
    },
    startShareButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    activeShareContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#4CAF50',
    },
    activeShareHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    shareStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#e8f5e8',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    shareStatusText: {
      color: '#4CAF50',
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    stopShareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#ff4444',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    stopShareText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    shareInfo: {
      marginBottom: 12,
    },
    shareInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    shareInfoText: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: 8,
    },
    shareActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
    },
    shareActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
    },
    shareActionText: {
      fontSize: 12,
      color: theme.colors.primary,
      marginLeft: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    modalBody: {
      flex: 1,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    shareCodeSection: {
      marginBottom: 24,
    },
    shareCodeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    shareCodeText: {
      flex: 1,
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: 2,
    },
    copyButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    shareLinkSection: {
      marginBottom: 24,
    },
    shareLinkContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    shareLinkText: {
      flex: 1,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    quickShareSection: {
      marginBottom: 24,
    },
    quickShareButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    quickShareButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
    },
    whatsappButton: {
      backgroundColor: '#25D366',
    },
    quickShareButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    contactsSection: {
      marginBottom: 24,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    contactInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contactName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 8,
    },
    contactPhone: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 8,
    },
    messagePreview: {
      marginBottom: 24,
    },
    messageContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    messageText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      {activeTripShare ? (
        renderActiveShare()
      ) : (
        <TouchableOpacity
          style={styles.startShareButton}
          onPress={handleCreateTripShare}
          disabled={isCreatingShare}
        >
          <ShareIcon size={20} color="#ffffff" />
          <Text style={styles.startShareButtonText}>
            {isCreatingShare ? 'جاري الإنشاء...' : 'مشاركة الرحلة'}
          </Text>
        </TouchableOpacity>
      )}

      {renderShareModal()}
    </View>
  );
};

export default TripSharingControls;
