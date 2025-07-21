// ===================================================================
// Database Connection Test Component
// ===================================================================

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { supabase } from '../../utils/supabase'
import { useApp } from '../../contexts/AppContext'
import { useVehicleTypes, useAuth } from '../../hooks/useSupabase'

interface ConnectionTestProps {
  onClose?: () => void
}

export const DatabaseConnectionTest: React.FC<ConnectionTestProps> = ({ onClose }) => {
  const { state } = useApp()
  const { vehicleTypes, loading: vehicleLoading, error: vehicleError } = useVehicleTypes()
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'failed'>('testing')
  const [testResults, setTestResults] = useState<Array<{ test: string; status: 'success' | 'error' | 'pending'; message: string }>>([])

  useEffect(() => {
    runConnectionTests()
  }, [])

  const addTestResult = (test: string, status: 'success' | 'error' | 'pending', message: string) => {
    setTestResults(prev => {
      const existingIndex = prev.findIndex(r => r.test === test)
      const newResult = { test, status, message }
      
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = newResult
        return updated
      } else {
        return [...prev, newResult]
      }
    })
  }

  const runConnectionTests = async () => {
    try {
      // Test 1: Basic Supabase Connection
      addTestResult('اتصال Supabase', 'pending', 'جاري الاختبار...')
      
      const { data: healthCheck, error: healthError } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1)

      if (healthError) {
        addTestResult('اتصال Supabase', 'error', `فشل الاتصال: ${healthError.message}`)
        setConnectionStatus('failed')
        return
      } else {
        addTestResult('اتصال Supabase', 'success', 'تم الاتصال بنجاح ✅')
      }

      // Test 2: Vehicle Types Table
      addTestResult('جدول أنواع المركبات', 'pending', 'جاري الاختبار...')
      
      const { data: vehicleTypesData, error: vehicleTypesError } = await supabase
        .from('vehicle_types')
        .select('*')
        .limit(5)

      if (vehicleTypesError) {
        addTestResult('جدول أنواع المركبات', 'error', `خطأ: ${vehicleTypesError.message}`)
      } else {
        addTestResult('جدول أنواع المركبات', 'success', `تم العثور على ${vehicleTypesData?.length || 0} نوع مركبة ✅`)
      }

      // Test 3: Profiles Table
      addTestResult('جدول الملفات الشخصية', 'pending', 'جاري الاختبار...')
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('count(*)')

      if (profilesError) {
        addTestResult('جدول الملفات الشخصية', 'error', `خطأ: ${profilesError.message}`)
      } else {
        addTestResult('جدول الملفات الشخصية', 'success', 'الجدول متاح ✅')
      }

      // Test 4: Authentication Status
      addTestResult('حالة المصادقة', 'pending', 'جاري الاختبار...')
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        addTestResult('حالة المصادقة', 'success', `مسجل دخول: ${session.user.email} ✅`)
      } else {
        addTestResult('حالة المصادقة', 'error', 'غير مسجل دخول')
      }

      // Test 5: Real-time Connection
      addTestResult('الاتصال المباشر', 'pending', 'جاري الاختبار...')
      
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles' }, 
          () => {
            addTestResult('الاتصال المباشر', 'success', 'الاتصال المباشر يعمل ✅')
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            addTestResult('الاتصال المباشر', 'success', 'تم الاشتراك في التحديثات المباشرة ✅')
          } else if (status === 'CHANNEL_ERROR') {
            addTestResult('الاتصال المباشر', 'error', 'فشل في الاتصال المباشر')
          }
        })

      // Clean up after 3 seconds
      setTimeout(() => {
        channel.unsubscribe()
      }, 3000)

      setConnectionStatus('connected')

    } catch (error) {
      addTestResult('اختبار شامل', 'error', `خطأ عام: ${error}`)
      setConnectionStatus('failed')
    }
  }

  const getStatusColor = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success': return '#4CAF50'
      case 'error': return '#F44336'
      case 'pending': return '#FF9800'
      default: return '#9E9E9E'
    }
  }

  const getStatusIcon = (status: 'success' | 'error' | 'pending') => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'pending': return '⏳'
      default: return '❓'
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>اختبار الاتصال بقاعدة البيانات</Text>
        <Text style={styles.subtitle}>IGTaxi - Supabase Connection Test</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Connection Status */}
        <View style={[styles.statusCard, { backgroundColor: connectionStatus === 'connected' ? '#E8F5E8' : connectionStatus === 'failed' ? '#FFE8E8' : '#FFF8E1' }]}>
          <Text style={styles.statusTitle}>
            حالة الاتصال: {connectionStatus === 'connected' ? 'متصل ✅' : connectionStatus === 'failed' ? 'فشل الاتصال ❌' : 'جاري الاختبار ⏳'}
          </Text>
        </View>

        {/* Test Results */}
        <View style={styles.testsContainer}>
          <Text style={styles.sectionTitle}>نتائج الاختبارات:</Text>
          
          {testResults.map((result, index) => (
            <View key={index} style={styles.testItem}>
              <View style={styles.testHeader}>
                <Text style={styles.testName}>
                  {getStatusIcon(result.status)} {result.test}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
                  <Text style={styles.statusText}>
                    {result.status === 'success' ? 'نجح' : result.status === 'error' ? 'فشل' : 'قيد التنفيذ'}
                  </Text>
                </View>
              </View>
              <Text style={styles.testMessage}>{result.message}</Text>
            </View>
          ))}
        </View>

        {/* Vehicle Types Preview */}
        {vehicleTypes.length > 0 && (
          <View style={styles.dataPreview}>
            <Text style={styles.sectionTitle}>معاينة أنواع المركبات:</Text>
            {vehicleTypes.slice(0, 3).map((vehicle, index) => (
              <View key={index} style={styles.vehicleItem}>
                <Text style={styles.vehicleName}>{vehicle.name_ar || vehicle.name}</Text>
                <Text style={styles.vehiclePrice}>السعر الأساسي: {vehicle.base_fare} درهم</Text>
              </View>
            ))}
          </View>
        )}

        {/* App State Preview */}
        <View style={styles.appStateContainer}>
          <Text style={styles.sectionTitle}>حالة التطبيق:</Text>
          <View style={styles.stateItem}>
            <Text style={styles.stateLabel}>المستخدم:</Text>
            <Text style={styles.stateValue}>
              {state.isAuthenticated ? `${state.user?.email || 'مسجل دخول'}` : 'غير مسجل دخول'}
            </Text>
          </View>
          <View style={styles.stateItem}>
            <Text style={styles.stateLabel}>اللغة:</Text>
            <Text style={styles.stateValue}>{state.language === 'ar' ? 'العربية' : 'English'}</Text>
          </View>
          <View style={styles.stateItem}>
            <Text style={styles.stateLabel}>الحالة:</Text>
            <Text style={styles.stateValue}>{state.isOnline ? 'متصل' : 'غير متصل'}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.retestButton} onPress={runConnectionTests}>
            <Text style={styles.buttonText}>إعادة الاختبار</Text>
          </TouchableOpacity>
          
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.buttonText}>إغلاق</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  testsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  testItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  testMessage: {
    fontSize: 12,
    color: '#666',
  },
  dataPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  vehicleItem: {
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  vehiclePrice: {
    fontSize: 12,
    color: '#666',
  },
  appStateContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  stateLabel: {
    fontSize: 14,
    color: '#666',
  },
  stateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retestButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
})

export default DatabaseConnectionTest
