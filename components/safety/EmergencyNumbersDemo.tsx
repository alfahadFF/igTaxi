import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import EmergencyNumbersManager from './EmergencyNumbersManager';
import { Globe, Settings } from 'lucide-react-native';

const EmergencyNumbersDemo: React.FC = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [showManager, setShowManager] = useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Globe size={24} color="#3b82f6" />
          <Text style={[styles.title, { color: colors.text }]}>
            إدارة أرقام الطوارئ
          </Text>
        </View>
        
        <Text style={[styles.description, { color: colors.accent }]}>
          تخصيص أرقام الطوارئ (الشرطة، الإسعاف، الإطفاء) حسب الدولة.
          يمكن للمطورين والمدراء تغيير الأرقام المفعلة في التطبيق.
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#3b82f6' }]}
          onPress={() => setShowManager(true)}
        >
          <Settings size={16} color="white" />
          <Text style={styles.buttonText}>
            فتح إدارة أرقام الطوارئ
          </Text>
        </TouchableOpacity>
      </View>

      <EmergencyNumbersManager
        isVisible={showManager}
        onClose={() => setShowManager(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EmergencyNumbersDemo;
