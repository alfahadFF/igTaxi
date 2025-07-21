import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafety } from '@/contexts/SafetyContext';
import SOSButton from '@/components/safety/SOSButton';
import DriverEmergencyButton from '@/components/safety/DriverEmergencyButton';
import TripSharingControls from '@/components/safety/TripSharingControls';
import EmergencyContactsManager from '@/components/safety/EmergencyContactsManager';
import MedicalCardManager from '@/components/safety/MedicalCardManager';
import DatabaseIntegrationTest from '@/components/safety/DatabaseIntegrationTest';
import EmergencyNumbersDemo from '@/components/safety/EmergencyNumbersDemo';
import {
  Shield,
  AlertTriangle,
  Users,
  Heart,
  Share2,
  Settings,
  TestTube,
  ChevronRight,
  Database,
  Globe,
} from 'lucide-react-native';

const SafetyDemo: React.FC = () => {
  const { theme } = useTheme();
  const { emergencyContacts, activeIncident, activeTripShare } = useSafety();
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const demoSections = [
    {
      id: 'sos-passenger',
      title: 'زر طوارئ الراكب',
      description: 'زر SOS للراكب مع خيارات متعددة للطوارئ',
      icon: <AlertTriangle size={20} color="#dc3545" />,
      color: '#dc3545',
      component: <SOSButton size="large" onSOSTriggered={() => Alert.alert('تم تشغيل طوارئ الراكب')} />,
    },
    {
      id: 'emergency-driver',
      title: 'زر طوارئ السائق',
      description: 'زر طوارئ السائق لعرض البطاقة الصحية للراكب',
      icon: <Heart size={20} color="#dc3545" />,
      color: '#dc3545',
      component: (
        <DriverEmergencyButton 
          passengerName="أحمد محمد"
          passengerPhone="+966501234567"
          onEmergencyTriggered={() => Alert.alert('تم عرض البطاقة الصحية')}
        />
      ),
    },
    {
      id: 'trip-sharing',
      title: 'مشاركة الرحلة',
      description: 'نظام مشاركة الرحلة مع جهات الاتصال',
      icon: <Share2 size={20} color={theme.colors.primary} />,
      color: theme.colors.primary,
      component: (
        <TripSharingControls 
          tripId="demo_trip_123"
          destination="مطار الكويت الدولي"
          onTripShared={(code) => Alert.alert('تم إنشاء كود المشاركة', code)}
        />
      ),
    },
    {
      id: 'emergency-contacts',
      title: 'جهات الاتصال الطارئة',
      description: 'إدارة قائمة جهات الاتصال في حالات الطوارئ',
      icon: <Users size={20} color={theme.colors.primary} />,
      color: theme.colors.primary,
      component: <EmergencyContactsManager />,
    },
    {
      id: 'medical-card',
      title: 'البطاقة الصحية الطارئة',
      description: 'إدارة المعلومات الصحية للطوارئ',
      icon: <Heart size={20} color={theme.colors.primary} />,
      color: theme.colors.primary,
      component: <MedicalCardManager />,
    },
    {
      id: 'emergency-numbers',
      title: 'إدارة أرقام الطوارئ',
      description: 'تخصيص أرقام الطوارئ حسب الدولة',
      icon: <Globe size={20} color="#3b82f6" />,
      color: '#3b82f6',
      component: <EmergencyNumbersDemo />,
    },
    {
      id: 'database-test',
      title: 'اختبار تكامل قاعدة البيانات',
      description: 'التحقق من ربط المكونات بقاعدة البيانات',
      icon: <Database size={20} color="#8b5cf6" />,
      color: '#8b5cf6',
      component: <DatabaseIntegrationTest />,
    },
  ];

  const renderDemoCard = (demo: typeof demoSections[0]) => (
    <TouchableOpacity
      key={demo.id}
      style={styles.demoCard}
      onPress={() => setSelectedDemo(selectedDemo === demo.id ? null : demo.id)}
    >
      <View style={styles.demoHeader}>
        <View style={[styles.demoIcon, { backgroundColor: demo.color + '20' }]}>
          {demo.icon}
        </View>
        <View style={styles.demoInfo}>
          <Text style={styles.demoTitle}>{demo.title}</Text>
          <Text style={styles.demoDescription}>{demo.description}</Text>
        </View>
        <ChevronRight 
          size={20} 
          color={theme.colors.textSecondary}
          style={{ 
            transform: [{ rotate: selectedDemo === demo.id ? '90deg' : '0deg' }] 
          }}
        />
      </View>
      
      {selectedDemo === demo.id && (
        <View style={styles.demoContent}>
          {demo.component}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatusBar = () => (
    <View style={styles.statusBar}>
      <Text style={styles.statusTitle}>حالة النظام</Text>
      <View style={styles.statusGrid}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>جهات الاتصال</Text>
          <Text style={[
            styles.statusValue,
            { color: emergencyContacts.length >= 2 ? '#4CAF50' : '#ff9800' }
          ]}>
            {emergencyContacts.length}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>حالة طوارئ نشطة</Text>
          <Text style={[
            styles.statusValue,
            { color: activeIncident ? '#dc3545' : '#4CAF50' }
          ]}>
            {activeIncident ? 'نشط' : 'لا يوجد'}
          </Text>
        </View>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>مشاركة رحلة</Text>
          <Text style={[
            styles.statusValue,
            { color: activeTripShare ? '#4CAF50' : theme.colors.textSecondary }
          ]}>
            {activeTripShare ? 'نشط' : 'غير نشط'}
          </Text>
        </View>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    statusBar: {
      backgroundColor: theme.colors.surface,
      margin: 16,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statusTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    statusGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    statusItem: {
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 4,
    },
    statusValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    demoCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 12,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    demoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    demoIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    demoInfo: {
      flex: 1,
    },
    demoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 2,
    },
    demoDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
    demoContent: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      padding: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          <TestTube size={24} color={theme.colors.primary} /> اختبار نظام الأمان
        </Text>
        <Text style={styles.headerSubtitle}>
          تجربة واختبار جميع مكونات نظام الأمان والطوارئ
        </Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {renderStatusBar()}
        
        {demoSections.map(renderDemoCard)}
      </ScrollView>
    </View>
  );
};

export default SafetyDemo;
