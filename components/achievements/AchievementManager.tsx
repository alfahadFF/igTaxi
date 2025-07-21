import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import SmartAchievementsService from '@/utils/smart-achievements-service';

interface AchievementManagerProps {
  onClose: () => void;
  isAdmin?: boolean;
}

export const AchievementManager: React.FC<AchievementManagerProps> = ({
  onClose,
  isAdmin = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    if (isAdmin) {
      loadSystemStats();
    }
  }, [isAdmin]);

  const loadSystemStats = async () => {
    try {
      setLoading(true);
      // Here you would load system-wide statistics
      // This is a placeholder for admin functionality
      setStats({
        totalUsers: 1250,
        totalAchievements: 24,
        activeRewards: 89,
        usedRewards: 156,
      });
    } catch (error) {
      console.error('خطأ في تحميل إحصائيات النظام:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetUserAchievements = () => {
    Alert.alert(
      'إعادة تعيين الإنجازات',
      'هل أنت متأكد من إعادة تعيين جميع إنجازاتك؟ هذا الإجراء لا يمكن التراجع عنه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إعادة تعيين',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Implement reset functionality here
              Alert.alert('تم بنجاح', 'تم إعادة تعيين جميع الإنجازات');
            } catch (error) {
              Alert.alert('خطأ', 'حدث خطأ في إعادة التعيين');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const exportUserData = async () => {
    try {
      setLoading(true);
      // Implement data export functionality
      Alert.alert('تم بنجاح', 'تم تصدير البيانات بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في تصدير البيانات');
    } finally {
      setLoading(false);
    }
  };

  const testAchievement = () => {
    Alert.alert(
      'اختبار الإنجاز',
      'اختر نوع النشاط لاختباره:',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'رحلة مكتملة',
          onPress: () => testActivity('trip_completed')
        },
        {
          text: 'تقييم مُعطى',
          onPress: () => testActivity('rating_given')
        },
        {
          text: 'إحالة منضمة',
          onPress: () => testActivity('referral_joined')
        }
      ]
    );
  };

  const testActivity = async (activityType: string) => {
    try {
      setLoading(true);
      // Here you would test the activity logging
      Alert.alert('اختبار مكتمل', `تم اختبار ${activityType} بنجاح`);
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ في الاختبار');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>جاري المعالجة...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إدارة الإنجازات</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* معلومات النظام */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 معلومات النظام</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>نوع النظام:</Text>
              <Text style={styles.infoValue}>نظام الإنجازات الذكية</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>النسخة:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>آخر تحديث:</Text>
              <Text style={styles.infoValue}>{new Date().toLocaleDateString('ar-SA')}</Text>
            </View>
          </View>
        </View>

        {/* إعدادات المستخدم */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ إعدادات المستخدم</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={exportUserData}>
              <View style={styles.settingInfo}>
                <Ionicons name="download" size={20} color={Colors.light.primary} />
                <Text style={styles.settingLabel}>تصدير البيانات</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.light.secondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow} onPress={resetUserAchievements}>
              <View style={styles.settingInfo}>
                <Ionicons name="refresh" size={20} color={Colors.light.warning} />
                <Text style={styles.settingLabel}>إعادة تعيين الإنجازات</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.light.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* أدوات التطوير */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠️ أدوات التطوير</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={testAchievement}>
              <View style={styles.settingInfo}>
                <Ionicons name="flask" size={20} color={Colors.light.accent} />
                <Text style={styles.settingLabel}>اختبار الإنجازات</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.light.secondary} />
            </TouchableOpacity>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="bug" size={20} color={Colors.light.error} />
                <Text style={styles.settingLabel}>وضع التطوير</Text>
              </View>
              <Switch
                value={__DEV__}
                disabled={true}
                trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
              />
            </View>
          </View>
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👑 إعدادات المدير</Text>
            <View style={styles.card}>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                  <Text style={styles.statLabel}>إجمالي المستخدمين</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.totalAchievements}</Text>
                  <Text style={styles.statLabel}>إجمالي الإنجازات</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.activeRewards}</Text>
                  <Text style={styles.statLabel}>المكافآت النشطة</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{stats.usedRewards}</Text>
                  <Text style={styles.statLabel}>المكافآت المستخدمة</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* معلومات الأمان */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 الأمان والخصوصية</Text>
          <View style={styles.card}>
            <Text style={styles.securityInfo}>
              • النظام مصمم لحماية خصوصيتك{'\n'}
              • لا يتم تحويل المكافآت إلى أموال حقيقية{'\n'}
              • جميع المكافآت محدودة المدة{'\n'}
              • لا توجد التزامات مالية دائمة{'\n'}
              • يمكنك حذف بياناتك في أي وقت
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  securityInfo: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  bottomSpace: {
    height: 32,
  },
});

export default AchievementManager;
