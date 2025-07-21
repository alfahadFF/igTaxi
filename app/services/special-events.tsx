import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Header from '@/components/layout/Header';
import { Users, Car, Calendar, Music, Bus, Route, MapPin, Search, UserPlus, Plus } from 'lucide-react-native';

type EventType = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  color: string;
};

export default function SpecialEventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const eventTypes: EventType[] = [
    {
      id: 'family',
      nameKey: 'specialEvents.family.name',
      descriptionKey: 'specialEvents.family.description',
      icon: <Users size={24} color="#fff" />,
      color: '#4CAF50',
    },
    {
      id: 'tourism',
      nameKey: 'specialEvents.tourism.name',
      descriptionKey: 'specialEvents.tourism.description',
      icon: <Route size={24} color="#fff" />,
      color: '#2196F3',
    },
    {
      id: 'field',
      nameKey: 'specialEvents.field.name',
      descriptionKey: 'specialEvents.field.description',
      icon: <Bus size={24} color="#fff" />,
      color: '#FF9800',
    },
    {
      id: 'wedding',
      nameKey: 'specialEvents.wedding.name',
      descriptionKey: 'specialEvents.wedding.description',
      icon: <Car size={24} color="#fff" />,
      color: '#E91E63',
    },
    {
      id: 'sports',
      nameKey: 'specialEvents.sports.name',
      descriptionKey: 'specialEvents.sports.description',
      icon: <Calendar size={24} color="#fff" />,
      color: '#9C27B0',
    },
    {
      id: 'concert',
      nameKey: 'specialEvents.concert.name',
      descriptionKey: 'specialEvents.concert.description',
      icon: <Music size={24} color="#fff" />,
      color: '#673AB7',
    },
  ];

  const handleEventSelection = (eventId: string) => {
    // التوجه مباشرة لنموذج الحجز بدلاً من صفحة البحث
    router.push({
      pathname: '/services/event-booking-form',
      params: { eventType: eventId }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('services.specialEvents')} showBackButton />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>
              ابحث عن سائقين للمناسبات الخاصة
            </Text>
            <Text style={styles.sectionSubtitle}>
              اختر نوع المناسبة لبدء عملية الحجز وتلقي عروض الأسعار
            </Text>
          </View>
          
          <View style={styles.eventsGrid}>
            {eventTypes.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventSelection(event.id)}
              >
                <View style={[styles.eventIconContainer, { backgroundColor: event.color }]}>
                  {event.icon}
                </View>
                <Text style={styles.eventName}>{t(event.nameKey)}</Text>
                <Text style={styles.eventDescription}>
                  {t(event.descriptionKey)}
                </Text>
                <View style={styles.eventAction}>
                  <Text style={styles.eventActionText}>
                    احجز الآن
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
                      <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>كيف يعمل النظام؟</Text>
            <View style={styles.stepContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>اختر نوع المناسبة</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>املأ تفاصيل الحجز</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>استقبل عروض الأسعار</Text>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepText}>اختر العرض المناسب</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  userTypeContainer: {
    padding: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  userTypeButton: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  providerButton: {
    backgroundColor: '#4CAF50',
  },
  seekerButton: {
    backgroundColor: '#2196F3',
  },
  userTypeButtonContent: {
    alignItems: 'center',
  },
  userTypeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginTop: 8,
    marginBottom: 4,
  },
  userTypeButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerSection: {
    marginBottom: 20,
  },
  backToSelection: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  quickRegisterButton: {
    backgroundColor: '#F5B800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  quickRegisterText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    marginLeft: 8,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventIconContainer: {
    padding: 12,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  eventAction: {
    backgroundColor: 'rgba(245, 184, 0, 0.1)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  eventActionText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#F5B800',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepContainer: {
    marginTop: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#333',
  },
});