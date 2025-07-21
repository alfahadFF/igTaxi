import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { emergencyAudioService, EmergencyAudioRecording } from '@/utils/safety/emergency-audio-service';

interface AudioRecordingsListProps {
  isVisible: boolean;
  onClose: () => void;
  recordingType?: string;
  onRecordingSelect?: (recording: EmergencyAudioRecording) => void;
}

export const AudioRecordingsList: React.FC<AudioRecordingsListProps> = ({
  isVisible,
  onClose,
  recordingType,
  onRecordingSelect,
}) => {
  const [recordings, setRecordings] = useState<EmergencyAudioRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<EmergencyAudioRecording | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (isVisible) {
      loadRecordings();
    }
  }, [isVisible, filterType]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: 50,
        offset: 0,
      };

      if (filterType !== 'all') {
        params.recording_type = filterType;
      }

      const data = await emergencyAudioService.getUserRecordings(params);
      setRecordings(data);
    } catch (error) {
      console.error('خطأ في تحميل التسجيلات:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل التسجيلات');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecordingTypeIcon = (type: string) => {
    switch (type) {
      case 'sos':
        return 'warning';
      case 'auto':
        return 'radio-button-on';
      case 'manual':
        return 'mic';
      case 'incident':
        return 'alert-circle';
      case 'evidence':
        return 'document';
      default:
        return 'musical-notes';
    }
  };

  const getRecordingTypeLabel = (type: string) => {
    switch (type) {
      case 'sos':
        return 'طوارئ SOS';
      case 'auto':
        return 'تلقائي';
      case 'manual':
        return 'يدوي';
      case 'incident':
        return 'حادث';
      case 'evidence':
        return 'دليل';
      default:
        return 'غير محدد';
    }
  };

  const getEmergencyLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return Colors.light.error;
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFB347';
      case 'low':
        return '#98D8C8';
      default:
        return Colors.light.text;
    }
  };

  const handleRecordingPress = (recording: EmergencyAudioRecording) => {
    setSelectedRecording(recording);
    if (onRecordingSelect) {
      onRecordingSelect(recording);
    }
  };

  const handleShare = async (recording: EmergencyAudioRecording) => {
    try {
      Alert.alert(
        'مشاركة التسجيل',
        'هل تريد مشاركة هذا التسجيل؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'مشاركة',
            onPress: async () => {
              // في التطبيق الحقيقي، ستظهر قائمة جهات الاتصال
              Alert.alert('تم', 'تم مشاركة التسجيل');
            }
          }
        ]
      );
    } catch (error) {
      console.error('خطأ في مشاركة التسجيل:', error);
      Alert.alert('خطأ', 'حدث خطأ في مشاركة التسجيل');
    }
  };

  const handleDelete = async (recording: EmergencyAudioRecording) => {
    Alert.alert(
      'حذف التسجيل',
      'هل تريد حذف هذا التسجيل نهائياً؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await emergencyAudioService.deleteRecording(recording.id);
              if (success) {
                setRecordings(prev => prev.filter(r => r.id !== recording.id));
                Alert.alert('تم', 'تم حذف التسجيل');
              }
            } catch (error) {
              console.error('خطأ في حذف التسجيل:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف التسجيل');
            }
          }
        }
      ]
    );
  };

  const renderRecordingItem = ({ item }: { item: EmergencyAudioRecording }) => (
    <TouchableOpacity
      style={styles.recordingItem}
      onPress={() => handleRecordingPress(item)}
    >
      <View style={styles.recordingHeader}>
        <View style={styles.recordingInfo}>
          <View style={styles.typeContainer}>
            <Ionicons
              name={getRecordingTypeIcon(item.recording_type) as any}
              size={20}
              color={getEmergencyLevelColor(item.emergency_level)}
            />
            <Text style={[
              styles.recordingType,
              { color: getEmergencyLevelColor(item.emergency_level) }
            ]}>
              {getRecordingTypeLabel(item.recording_type)}
            </Text>
          </View>
          <Text style={styles.recordingDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={styles.recordingActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Ionicons name="share-outline" size={20} color={Colors.light.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recordingDetails}>
        <View style={styles.durationContainer}>
          <Ionicons name="time-outline" size={16} color={Colors.light.secondary} />
          <Text style={styles.duration}>
            {formatDuration(item.duration_seconds)}
          </Text>
        </View>

        {item.location_address && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color={Colors.light.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location_address}
            </Text>
          </View>
        )}

        {item.is_shared && (
          <View style={styles.sharedContainer}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.light.success} />
            <Text style={styles.sharedText}>تم المشاركة</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {item.notes}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderFilterButton = (type: string, label: string, icon: any) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && styles.filterButtonActive
      ]}
      onPress={() => setFilterType(type)}
    >
      <Ionicons
        name={icon}
        size={16}
        color={filterType === type ? Colors.light.background : Colors.light.secondary}
      />
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>التسجيلات الصوتية</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh" size={24} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          {renderFilterButton('all', 'الكل', 'list')}
          {renderFilterButton('sos', 'طوارئ', 'warning')}
          {renderFilterButton('manual', 'يدوي', 'mic')}
          {renderFilterButton('auto', 'تلقائي', 'radio-button-on')}
          {renderFilterButton('incident', 'حوادث', 'alert-circle')}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>جاري تحميل التسجيلات...</Text>
          </View>
        ) : (
          <FlatList
            data={recordings}
            renderItem={renderRecordingItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.light.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={64} color={Colors.light.secondary} />
                <Text style={styles.emptyText}>لا توجد تسجيلات صوتية</Text>
                <Text style={styles.emptySubtext}>
                  ستظهر هنا جميع تسجيلاتك الصوتية للطوارئ
                </Text>
              </View>
            }
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.light.card,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterButtonText: {
    fontSize: 12,
    marginLeft: 4,
    color: Colors.light.secondary,
  },
  filterButtonTextActive: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  recordingItem: {
    backgroundColor: Colors.light.background,
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordingInfo: {
    flex: 1,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordingType: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  recordingDate: {
    fontSize: 12,
    color: Colors.light.secondary,
  },
  recordingActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  recordingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  duration: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginLeft: 4,
    flex: 1,
  },
  sharedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sharedText: {
    fontSize: 12,
    color: Colors.light.success,
    marginLeft: 4,
  },
  notes: {
    fontSize: 12,
    color: Colors.light.text,
    fontStyle: 'italic',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.secondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
