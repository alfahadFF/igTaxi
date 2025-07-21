import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import ServiceGrid from '@/components/services/ServiceGrid';
import Header from '@/components/layout/Header';
import QuickDatabaseTest from '@/components/test/QuickDatabaseTest';

export default function HomeScreen() {
  const { t } = useTranslation();
  const [showConnectionTest, setShowConnectionTest] = useState(false);

  return (
    <>
      <SafeAreaView style={styles.container}>
        <Header title={t('home.title')} showNotifications={true} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Welcome Section */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>{t('home.welcome')}</Text>
            <Text style={styles.subtitleText}>{t('home.subtitle')}</Text>
          </View>

          {/* Services Grid */}
          <ServiceGrid />
        </ScrollView>
      </SafeAreaView>

      {/* Connection Test Modal */}
      <Modal
        visible={showConnectionTest}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <QuickDatabaseTest />
      </Modal>
    </>
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
  scrollContent: {
    paddingBottom: 40,
  },
  welcomeContainer: {
    padding: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitleText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    lineHeight: 24,
  },
  statusSection: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 12,
  },
  statusCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    marginTop: 4,
    textAlign: 'center',
  },
  successText: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  userSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  userInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  userInfoLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  userInfoValue: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#333',
  },
  vehicleSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  vehicleName: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  vehiclePrice: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#2196F3',
  },
  vehicleDetails: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginTop: 2,
  },
  notificationSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  notificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notificationTestButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: '45%',
    flex: 1,
    margin: 4,
  },
  notificationTestText: {
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    textAlign: 'center',
  },
  authSection: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  authButtons: {
    gap: 12,
  },
  authButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  authButtonText: {
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  authButtonSecondaryText: {
    color: '#FFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
});