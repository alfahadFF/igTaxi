import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications, NotificationItem, NotificationType } from '@/contexts/NotificationContext';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Clock,
  Car,
  CreditCard,
  DollarSign,
  FileText,
  Gift,
  AlertTriangle,
  Star,
  Settings,
} from 'lucide-react-native';
import { AnimatedView } from '@/components/ui/AnimatedComponents';

const { width } = Dimensions.get('window');

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll 
  } = useNotifications();
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');

  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { size: 20, color: theme.colors.primary };
    
    switch (type) {
      case 'trip_request':
      case 'trip_accepted':
      case 'trip_started':
      case 'trip_completed':
      case 'driver_arrived':
        return <Car {...iconProps} />;
      
      case 'payment_received':
        return <CreditCard {...iconProps} />;
      
      case 'earning_update':
        return <DollarSign {...iconProps} />;
      
      case 'document_expire':
        return <FileText {...iconProps} />;
      
      case 'promo_offer':
        return <Gift {...iconProps} />;
      
      case 'rating_request':
        return <Star {...iconProps} />;
      
      case 'system_update':
      case 'maintenance':
        return <AlertTriangle {...iconProps} />;
      
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.isRead;
      case 'important':
        return notif.isImportant;
      default:
        return true;
    }
  });

  const handleMarkAsRead = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const handleRemove = (notification: NotificationItem) => {
    Alert.alert(
      'حذف الإشعار',
      'هل تريد حذف هذا الإشعار؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'حذف', 
          style: 'destructive',
          onPress: () => removeNotification(notification.id)
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'مسح جميع الإشعارات',
      'هل تريد مسح جميع الإشعارات؟ لا يمكن التراجع عن هذا الإجراء.',
      [
        { text: 'إلغاء', style: 'cancel' },
        { 
          text: 'مسح الكل', 
          style: 'destructive',
          onPress: clearAll
        },
      ]
    );
  };

  const renderNotificationItem = ({ item, index }: { item: NotificationItem; index: number }) => (
    <AnimatedView
      animation="fadeIn"
      delay={index * 100}
      style={[
        styles.notificationItem,
        {
          backgroundColor: item.isRead ? theme.colors.surface : theme.colors.surface + 'F0',
          borderColor: theme.colors.border,
          borderRightColor: item.isImportant ? '#ef4444' : theme.colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            {getNotificationIcon(item.type)}
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          
          <View style={styles.notificationText}>
            <Text 
              style={[
                styles.notificationTitle, 
                { color: theme.colors.text },
                !item.isRead && styles.unreadTitle
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text 
              style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
          </View>
          
          <View style={styles.notificationMeta}>
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
              {getTimeAgo(item.timestamp)}
            </Text>
            {item.isImportant && (
              <View style={styles.importantBadge}>
                <Text style={styles.importantText}>مهم</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      
      <View style={styles.notificationActions}>
        {!item.isRead && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary + '20' }]}
            onPress={() => markAsRead(item.id)}
          >
            <Check size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444' + '20' }]}
          onPress={() => handleRemove(item)}
        >
          <Trash2 size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </AnimatedView>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bell size={64} color={theme.colors.textSecondary} style={styles.emptyIcon} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        لا توجد إشعارات
      </Text>
      <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
        {filter === 'unread' 
          ? 'جميع الإشعارات مقروءة' 
          : filter === 'important'
          ? 'لا توجد إشعارات مهمة'
          : 'لم تصلك أي إشعارات بعد'
        }
      </Text>
    </View>
  );

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '50%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    filterText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    filterTextActive: {
      color: '#fff',
      fontWeight: '500',
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    actionText: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: 6,
    },
    notificationsList: {
      flex: 1,
    },
    notificationItem: {
      marginHorizontal: 16,
      marginVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderRightWidth: 4,
      overflow: 'hidden',
    },
    notificationContent: {
      padding: 16,
    },
    notificationHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      position: 'relative',
      marginRight: 12,
      marginTop: 2,
    },
    unreadDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ef4444',
    },
    notificationText: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
    },
    unreadTitle: {
      fontWeight: '600',
    },
    notificationMessage: {
      fontSize: 14,
      lineHeight: 20,
    },
    notificationMeta: {
      alignItems: 'flex-end',
      marginLeft: 12,
    },
    timestamp: {
      fontSize: 12,
      marginBottom: 4,
    },
    importantBadge: {
      backgroundColor: '#ef4444',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    importantText: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '500',
    },
    notificationActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      opacity: 0.3,
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>الإشعارات</Text>
              {unreadCount > 0 && (
                <Text style={styles.headerSubtitle}>
                  {unreadCount} إشعار غير مقروء
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filterContainer}>
            {[
              { key: 'all', label: 'الكل' },
              { key: 'unread', label: 'غير مقروء' },
              { key: 'important', label: 'مهم' },
            ].map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterButton,
                  filter === key && styles.filterButtonActive,
                ]}
                onPress={() => setFilter(key as any)}
              >
                <Text 
                  style={[
                    styles.filterText,
                    filter === key && styles.filterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          {notifications.length > 0 && (
            <View style={styles.actionsContainer}>
              {unreadCount > 0 && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={markAllAsRead}
                >
                  <Check size={16} color={theme.colors.primary} />
                  <Text style={styles.actionText}>قراءة الكل</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleClearAll}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>مسح الكل</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notifications List */}
          <FlatList
            style={styles.notificationsList}
            data={filteredNotifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              filteredNotifications.length === 0 ? { flex: 1 } : { paddingVertical: 8 }
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default NotificationCenter;
