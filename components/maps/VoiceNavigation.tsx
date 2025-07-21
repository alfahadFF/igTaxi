import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// import { Audio } from 'expo-av';
// import * as Speech from 'expo-speech';
import Colors from '@/constants/Colors';

interface VoiceNavigationProps {
  isNavigating: boolean;
  currentInstruction?: string;
  nextInstruction?: string;
  distanceToNextTurn?: number;
  estimatedTimeArrival?: string;
  onToggleVoice: (enabled: boolean) => void;
  language?: 'ar' | 'en';
}

interface NavigationInstruction {
  type: 'turn_left' | 'turn_right' | 'continue_straight' | 'arrived' | 'rerouting';
  text: string;
  distance: number;
  streetName?: string;
}

export const VoiceNavigation: React.FC<VoiceNavigationProps> = ({
  isNavigating,
  currentInstruction = '',
  nextInstruction = '',
  distanceToNextTurn = 0,
  estimatedTimeArrival = '',
  onToggleVoice,
  language = 'ar',
}) => {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(0.8);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [lastSpokenInstruction, setLastSpokenInstruction] = useState('');

  // تعليمات الملاحة بالعربية والإنجليزية
  const navigationPhrases = {
    ar: {
      turn_left: 'انعطف يساراً',
      turn_right: 'انعطف يميناً', 
      continue_straight: 'استمر مستقيماً',
      in_meters: 'بعد {distance} متر',
      in_kilometers: 'بعد {distance} كيلومتر',
      arrived: 'وصلت إلى وجهتك',
      rerouting: 'جاري إعادة حساب المسار',
      towards: 'في اتجاه',
      then: 'ثم',
      prepare_to: 'استعد لـ',
    },
    en: {
      turn_left: 'Turn left',
      turn_right: 'Turn right',
      continue_straight: 'Continue straight',
      in_meters: 'in {distance} meters',
      in_kilometers: 'in {distance} kilometers',
      arrived: 'You have arrived at your destination',
      rerouting: 'Rerouting',
      towards: 'towards',
      then: 'then',
      prepare_to: 'Prepare to',
    },
  };

  useEffect(() => {
    if (isNavigating && isVoiceEnabled && currentInstruction) {
      speakInstruction(currentInstruction);
    }
  }, [currentInstruction, isNavigating, isVoiceEnabled]);

  useEffect(() => {
    // تحضير للانعطاف القادم
    if (distanceToNextTurn > 0 && distanceToNextTurn <= 200 && nextInstruction) {
      const prepareMessage = formatPrepareMessage(nextInstruction, distanceToNextTurn);
      if (prepareMessage !== lastSpokenInstruction) {
        speakInstruction(prepareMessage);
        setLastSpokenInstruction(prepareMessage);
      }
    }
  }, [distanceToNextTurn, nextInstruction]);

  const speakInstruction = async (instruction: string) => {
    if (!isVoiceEnabled || isSpeaking) return;

    try {
      setIsSpeaking(true);
      
      // TODO: تطبيق التشغيل الصوتي عند تثبيت expo-speech
      console.log('Voice instruction:', instruction);
      
      // محاكاة وقت التشغيل
      setTimeout(() => {
        setIsSpeaking(false);
      }, 2000);
    } catch (error) {
      console.error('خطأ في التشغيل الصوتي:', error);
      setIsSpeaking(false);
    }
  };

  const formatPrepareMessage = (instruction: string, distance: number): string => {
    const phrases = navigationPhrases[language];
    const distanceText = distance < 1000 
      ? phrases.in_meters.replace('{distance}', distance.toString())
      : phrases.in_kilometers.replace('{distance}', (distance / 1000).toFixed(1));

    return `${phrases.prepare_to} ${instruction} ${distanceText}`;
  };

  const toggleVoice = () => {
    const newState = !isVoiceEnabled;
    setIsVoiceEnabled(newState);
    onToggleVoice(newState);
    
    if (!newState) {
      // TODO: إيقاف التشغيل الصوتي عند تثبيت expo-speech
      setIsSpeaking(false);
    }
  };

  const adjustVoiceSpeed = (speed: number) => {
    setVoiceSpeed(speed);
    // تجربة السرعة الجديدة
    speakInstruction(language === 'ar' ? 'تم تغيير سرعة الصوت' : 'Voice speed changed');
  };

  const adjustVoicePitch = (pitch: number) => {
    setVoicePitch(pitch);
    // تجربة النبرة الجديدة
    speakInstruction(language === 'ar' ? 'تم تغيير نبرة الصوت' : 'Voice pitch changed');
  };

  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)} م`;
    } else {
      return `${(distance / 1000).toFixed(1)} كم`;
    }
  };

  const getInstructionIcon = (instruction: string) => {
    if (instruction.includes('يساراً') || instruction.includes('left')) {
      return 'arrow-back';
    } else if (instruction.includes('يميناً') || instruction.includes('right')) {
      return 'arrow-forward';
    } else if (instruction.includes('مستقيماً') || instruction.includes('straight')) {
      return 'arrow-up';
    } else if (instruction.includes('وصلت') || instruction.includes('arrived')) {
      return 'checkmark-circle';
    } else {
      return 'navigate';
    }
  };

  if (!isNavigating) return null;

  return (
    <>
      <View style={styles.container}>
        {/* التعليمة الحالية */}
        <View style={styles.instructionContainer}>
          <View style={styles.instructionIcon}>
            <Ionicons 
              name={getInstructionIcon(currentInstruction) as any} 
              size={32} 
              color={Colors.light.background} 
            />
          </View>
          <View style={styles.instructionText}>
            <Text style={styles.mainInstruction}>{currentInstruction}</Text>
            {distanceToNextTurn > 0 && (
              <Text style={styles.distanceText}>
                {formatDistance(distanceToNextTurn)}
              </Text>
            )}
          </View>
        </View>

        {/* التعليمة التالية */}
        {nextInstruction && (
          <View style={styles.nextInstruction}>
            <Ionicons 
              name={getInstructionIcon(nextInstruction) as any} 
              size={16} 
              color={Colors.light.secondary} 
            />
            <Text style={styles.nextInstructionText}>
              {language === 'ar' ? 'ثم: ' : 'Then: '}{nextInstruction}
            </Text>
          </View>
        )}

        {/* أزرار التحكم */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[
              styles.voiceButton,
              { backgroundColor: isVoiceEnabled ? Colors.light.primary : Colors.light.secondary }
            ]}
            onPress={toggleVoice}
          >
            <Ionicons 
              name={isVoiceEnabled ? 'volume-high' : 'volume-mute'} 
              size={20} 
              color={Colors.light.background} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowVoiceSettings(true)}
          >
            <Ionicons name="settings" size={20} color={Colors.light.secondary} />
          </TouchableOpacity>

          {isSpeaking && (
            <View style={styles.speakingIndicator}>
              <Ionicons name="radio-outline" size={16} color={Colors.light.primary} />
              <Text style={styles.speakingText}>يتحدث...</Text>
            </View>
          )}
        </View>

        {/* الوقت المتوقع للوصول */}
        {estimatedTimeArrival && (
          <View style={styles.etaContainer}>
            <Ionicons name="time" size={16} color={Colors.light.secondary} />
            <Text style={styles.etaText}>
              {language === 'ar' ? 'الوصول في ' : 'ETA: '}{estimatedTimeArrival}
            </Text>
          </View>
        )}
      </View>

      {/* إعدادات الصوت */}
      <Modal
        visible={showVoiceSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVoiceSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إعدادات الصوت</Text>
              <TouchableOpacity
                onPress={() => setShowVoiceSettings(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {/* سرعة الصوت */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>سرعة الصوت</Text>
              <View style={styles.speedButtons}>
                {[0.5, 0.8, 1.0, 1.2].map(speed => (
                  <TouchableOpacity
                    key={speed}
                    style={[
                      styles.speedButton,
                      voiceSpeed === speed && styles.activeSpeedButton
                    ]}
                    onPress={() => adjustVoiceSpeed(speed)}
                  >
                    <Text style={[
                      styles.speedButtonText,
                      voiceSpeed === speed && styles.activeSpeedButtonText
                    ]}>
                      {speed}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* نبرة الصوت */}
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>نبرة الصوت</Text>
              <View style={styles.speedButtons}>
                {[0.8, 1.0, 1.2].map(pitch => (
                  <TouchableOpacity
                    key={pitch}
                    style={[
                      styles.speedButton,
                      voicePitch === pitch && styles.activeSpeedButton
                    ]}
                    onPress={() => adjustVoicePitch(pitch)}
                  >
                    <Text style={[
                      styles.speedButtonText,
                      voicePitch === pitch && styles.activeSpeedButtonText
                    ]}>
                      {pitch === 0.8 ? 'منخفض' : pitch === 1.0 ? 'عادي' : 'عالي'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* تجربة الصوت */}
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => speakInstruction(
                language === 'ar' 
                  ? 'هذا اختبار للصوت الملاحي' 
                  : 'This is a voice navigation test'
              )}
            >
              <Ionicons name="play" size={20} color={Colors.light.background} />
              <Text style={styles.testButtonText}>تجربة الصوت</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  instructionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  instructionText: {
    flex: 1,
  },
  mainInstruction: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  nextInstruction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 12,
  },
  nextInstructionText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginLeft: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  speakingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  speakingText: {
    fontSize: 12,
    color: Colors.light.primary,
    marginLeft: 6,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 8,
    paddingTop: 12,
  },
  etaText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  settingsModal: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  settingItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeSpeedButton: {
    backgroundColor: Colors.light.primary,
  },
  speedButtonText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  activeSpeedButtonText: {
    color: Colors.light.background,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  testButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
