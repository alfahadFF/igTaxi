import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

export default function ConsentPolicyScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>سياسة الموافقة على الرسائل النصية</Text>
          <Text style={styles.subtitle}>IGTaxi - خدمات النقل</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الموافقة على استلام الرسائل النصية</Text>
            <Text style={styles.text}>
              بإنشاء حساب في تطبيق IGTaxi، فإنك توافق على استلام الرسائل النصية التالية:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• رموز التحقق الأمنية (OTP)</Text>
              <Text style={styles.listItem}>• تأكيدات الحجز</Text>
              <Text style={styles.listItem}>• تحديثات حالة الرحلة</Text>
              <Text style={styles.listItem}>• إشعارات السائق</Text>
              <Text style={styles.listItem}>• رسائل إدارية مهمة متعلقة بحسابك</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>كيفية إعطاء الموافقة</Text>
            <Text style={styles.text}>
              تتم الموافقة على استلام الرسائل النصية من خلال:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                1. إدخال رقم هاتفك في صفحة التسجيل
              </Text>
              <Text style={styles.listItem}>
                2. النقر على زر "إرسال رمز التحقق"
              </Text>
              <Text style={styles.listItem}>
                3. إتمام عملية التحقق من رقم الهاتف
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تكرار الرسائل</Text>
            <Text style={styles.text}>
              قد تستلم ما يصل إلى 10 رسائل نصية شهرياً حسب استخدامك للتطبيق.
              الرسائل الأمنية ورموز التحقق قد ترسل في أي وقت حسب الحاجة.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إلغاء الاشتراك</Text>
            <Text style={styles.text}>
              يمكنك إلغاء اشتراكك في الرسائل النصية في أي وقت من خلال:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                • إرسال كلمة "STOP" إلى الرقم المرسل
              </Text>
              <Text style={styles.listItem}>
                • تعديل إعدادات الحساب في التطبيق
              </Text>
              <Text style={styles.listItem}>
                • التواصل مع دعم العملاء
              </Text>
            </View>
            <Text style={styles.warningText}>
              تنبيه: إلغاء الاشتراك قد يؤثر على أمان حسابك وقدرتك على استخدام الخدمة.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الرسوم</Text>
            <Text style={styles.text}>
              قد تطبق رسوم الرسائل النصية والبيانات من مزود الخدمة الخاص بك.
              IGTaxi غير مسؤولة عن هذه الرسوم.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>معلومات الاتصال</Text>
            <Text style={styles.text}>
              للاستفسارات حول سياسة الرسائل النصية:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                البريد الإلكتروني: support@igtaxi.com
              </Text>
              <Text style={styles.listItem}>
                الهاتف: +962-6-1234567
              </Text>
              <Text style={styles.listItem}>
                العنوان: عمان، الأردن
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              آخر تحديث: يناير 2025
            </Text>
            <Text style={styles.footerText}>
              IGTaxi © 2025 جميع الحقوق محفوظة
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: Colors.light.primary,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 10,
  },
  text: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
    textAlign: 'right',
  },
  list: {
    marginTop: 10,
    marginLeft: 10,
  },
  listItem: {
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: 5,
    textAlign: 'right',
  },
  warningText: {
    fontSize: 14,
    color: Colors.light.error,
    lineHeight: 22,
    marginTop: 10,
    fontWeight: '500',
    textAlign: 'right',
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    marginBottom: 5,
  },
});
