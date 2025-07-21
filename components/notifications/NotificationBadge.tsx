import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationBadgeProps {
  onPress: () => void;
  size?: number;
  showCount?: boolean;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  onPress, 
  size = 24, 
  showCount = true 
}) => {
  const { theme } = useTheme();
  const { unreadCount } = useNotifications();

  const styles = StyleSheet.create({
    container: {
      position: 'relative',
    },
    button: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: 2,
      right: 2,
      backgroundColor: '#ef4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onPress}>
        <Bell size={size} color={theme.colors.text} />
      </TouchableOpacity>
      
      {showCount && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
};

export default NotificationBadge;
