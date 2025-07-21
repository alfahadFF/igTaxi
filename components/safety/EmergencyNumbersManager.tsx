import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { emergencyNumbersService, EMERGENCY_NUMBERS_BY_COUNTRY, EmergencyNumbers } from '@/utils/safety/emergency-numbers-service';
import { CheckCircle, Globe, Phone, AlertTriangle, Settings } from 'lucide-react-native';

interface EmergencyNumbersManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

const EmergencyNumbersManager: React.FC<EmergencyNumbersManagerProps> = ({
  isVisible,
  onClose,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [currentNumbers, setCurrentNumbers] = useState<EmergencyNumbers | null>(null);
  const [availableCountries, setAvailableCountries] = useState<EmergencyNumbers[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadCurrentNumbers();
      loadAvailableCountries();
    }
  }, [isVisible]);

  const loadCurrentNumbers = async () => {
    try {
      const numbers = await emergencyNumbersService.getActiveEmergencyNumbers();
      setCurrentNumbers(numbers);
    } catch (error) {
      console.error('Error loading emergency numbers:', error);
    }
  };

  const loadAvailableCountries = () => {
    const countries = emergencyNumbersService.getAvailableCountries();
    setAvailableCountries(countries);
  };

  const handleCountrySelect = async (countryCode: string) => {
    Alert.alert(
      'تأكيد التغيير',
      `هل تريد تفعيل أرقام الطوارئ لـ ${EMERGENCY_NUMBERS_BY_COUNTRY[countryCode]?.country}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: 'destructive',
          onPress: () => updateEmergencyNumbers(countryCode),
        },
      ]
    );
  };

  const updateEmergencyNumbers = async (countryCode: string) => {
    setIsLoading(true);
    try {
      const success = await emergencyNumbersService.updateEmergencyNumbers(countryCode);
      if (success) {
        Alert.alert('نجح التحديث', 'تم تحديث أرقام الطوارئ بنجاح');
        await loadCurrentNumbers();
      } else {
        Alert.alert('خطأ', 'فشل في تحديث أرقام الطوارئ');
      }
    } catch (error) {
      console.error('Error updating emergency numbers:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء التحديث');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentNumbers = () => {
    if (!currentNumbers) {
      return (
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            أرقام الطوارئ الحالية
          </Text>
          <Text style={[styles.noData, { color: colors.accent }]}>
            لا توجد أرقام طوارئ مفعلة
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <CheckCircle size={20} color="#10b981" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            أرقام الطوارئ الحالية
          </Text>
        </View>
        
        <View style={[styles.countryCard, { backgroundColor: colors.background }]}>
          <View style={styles.countryHeader}>
            <Globe size={16} color={colors.primary} />
            <Text style={[styles.countryName, { color: colors.text }]}>
              {currentNumbers.country}
            </Text>
            <Text style={[styles.countryCode, { color: colors.accent }]}>
              ({currentNumbers.countryCode})
            </Text>
          </View>
          
          <View style={styles.numbersGrid}>
            <EmergencyNumberCard
              icon={<Phone size={16} color="#dc3545" />}
              label="الشرطة"
              number={currentNumbers.police}
              colors={colors}
            />
            <EmergencyNumberCard
              icon={<AlertTriangle size={16} color="#f59e0b" />}
              label="الإسعاف"
              number={currentNumbers.ambulance}
              colors={colors}
            />
            <EmergencyNumberCard
              icon={<AlertTriangle size={16} color="#ef4444" />}
              label="الإطفاء"
              number={currentNumbers.fire}
              colors={colors}
            />
            {currentNumbers.generalEmergency && (
              <EmergencyNumberCard
                icon={<Phone size={16} color="#6366f1" />}
                label="طوارئ عام"
                number={currentNumbers.generalEmergency}
                colors={colors}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderAvailableCountries = () => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Settings size={20} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          تغيير الدولة
        </Text>
      </View>
      
      <ScrollView style={styles.countriesList} showsVerticalScrollIndicator={false}>
        {availableCountries.map((country) => (
          <TouchableOpacity
            key={country.countryCode}
            style={[
              styles.countryItem,
              { 
                backgroundColor: colors.background,
                borderColor: currentNumbers?.countryCode === country.countryCode 
                  ? colors.primary 
                  : colors.border
              }
            ]}
            onPress={() => handleCountrySelect(country.countryCode)}
            disabled={isLoading || currentNumbers?.countryCode === country.countryCode}
          >
            <View style={styles.countryItemHeader}>
              <Text style={[styles.countryItemName, { color: colors.text }]}>
                {country.country}
              </Text>
              <Text style={[styles.countryItemCode, { color: colors.accent }]}>
                {country.countryCode}
              </Text>
              {currentNumbers?.countryCode === country.countryCode && (
                <CheckCircle size={16} color="#10b981" />
              )}
            </View>
            
            <View style={styles.countryItemNumbers}>
              <Text style={[styles.numberPreview, { color: colors.accent }]}>
                شرطة: {country.police} | إسعاف: {country.ambulance} | إطفاء: {country.fire}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            إدارة أرقام الطوارئ
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.primary }]}>
              إغلاق
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderCurrentNumbers()}
          {renderAvailableCountries()}
          
          <View style={[styles.warning, { backgroundColor: '#fef3c7' }]}>
            <AlertTriangle size={16} color="#d97706" />
            <Text style={[styles.warningText, { color: '#92400e' }]}>
              تحذير: تغيير أرقام الطوارئ يؤثر على جميع المستخدمين في التطبيق. 
              تأكد من صحة الأرقام قبل التفعيل.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

interface EmergencyNumberCardProps {
  icon: React.ReactNode;
  label: string;
  number: string;
  colors: any;
}

const EmergencyNumberCard: React.FC<EmergencyNumberCardProps> = ({
  icon,
  label,
  number,
  colors,
}) => (
  <View style={[styles.numberCard, { backgroundColor: colors.card }]}>
    <View style={styles.numberCardHeader}>
      {icon}
      <Text style={[styles.numberLabel, { color: colors.accent }]}>
        {label}
      </Text>
    </View>
    <Text style={[styles.numberValue, { color: colors.text }]}>
      {number}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  countryCard: {
    borderRadius: 8,
    padding: 16,
  },
  countryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  countryCode: {
    fontSize: 14,
    marginLeft: 8,
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 8,
    padding: 12,
  },
  numberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  numberLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  numberValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countriesList: {
    maxHeight: 300,
  },
  countryItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  countryItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  countryItemName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  countryItemCode: {
    fontSize: 12,
    marginRight: 8,
  },
  countryItemNumbers: {
    marginTop: 4,
  },
  numberPreview: {
    fontSize: 11,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
});

export default EmergencyNumbersManager;
