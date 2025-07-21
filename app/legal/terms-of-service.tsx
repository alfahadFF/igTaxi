import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

export default function TermsOfServiceScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>شروط الخدمة</Text>
          <Text style={styles.subtitle}>IGTaxi - خدمات النقل</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الموافقة على الشروط</Text>
            <Text style={styles.text}>
              باستخدام تطبيق IGTaxi، فإنك توافق على هذه الشروط والأحكام. 
              إذا لم توافق على أي من هذه الشروط، يرجى عدم استخدام التطبيق.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الخدمات المقدمة</Text>
            <Text style={styles.text}>IGTaxi يوفر:</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• خدمات النقل بالتاكسي</Text>
              <Text style={styles.listItem}>• خدمات التوصيل</Text>
              <Text style={styles.listItem}>• طلب الطعام والأدوية</Text>
              <Text style={styles.listItem}>• خدمات التسوق</Text>
              <Text style={styles.listItem}>• حجز مواقف السيارات</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التسجيل واستخدام الحساب</Text>
            <Text style={styles.text}>
              يجب عليك تقديم معلومات صحيحة وكاملة عند التسجيل. 
              أنت مسؤول عن الحفاظ على سرية كلمة المرور وجميع الأنشطة في حسابك.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>قواعد السلوك</Text>
            <Text style={styles.text}>يُمنع عليك:</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• استخدام التطبيق لأنشطة غير قانونية</Text>
              <Text style={styles.listItem}>• التعامل بطريقة غير لائقة مع السائقين</Text>
              <Text style={styles.listItem}>• تقديم معلومات خاطئة أو مضللة</Text>
              <Text style={styles.listItem}>• إنشاء حسابات متعددة</Text>
              <Text style={styles.listItem}>• استخدام التطبيق لأغراض تجارية غير مصرح بها</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الدفع والرسوم</Text>
            <Text style={styles.text}>
              الأسعار محددة في التطبيق وقابلة للتغيير. تتضمن الرسوم:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• تكلفة الخدمة الأساسية</Text>
              <Text style={styles.listItem}>• رسوم إضافية حسب المسافة والوقت</Text>
              <Text style={styles.listItem}>• رسوم الخدمات الإضافية</Text>
              <Text style={styles.listItem}>• الضرائب المطبقة</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الإلغاء والاسترداد</Text>
            <Text style={styles.text}>
              يمكن إلغاء الطلبات حسب سياسة الإلغاء المحددة لكل خدمة. 
              قد تطبق رسوم إلغاء في بعض الحالات.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المسؤولية والضمان</Text>
            <Text style={styles.text}>
              IGTaxi يعمل كوسيط بين المستخدمين ومقدمي الخدمات. 
              نحن غير مسؤولين عن أعمال أو تقصير مقدمي الخدمات المستقلين.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>حقوق الملكية الفكرية</Text>
            <Text style={styles.text}>
              جميع المحتويات والعلامات التجارية في التطبيق مملوكة لـ IGTaxi 
              أو مرخصة لها. يُمنع النسخ أو التوزيع دون إذن.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>إنهاء الخدمة</Text>
            <Text style={styles.text}>
              يحق لنا إنهاء أو تعليق حسابك في حالة انتهاك هذه الشروط 
              أو سوء استخدام الخدمة.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>القانون الحاكم</Text>
            <Text style={styles.text}>
              تحكم هذه الشروط قوانين المملكة الأردنية الهاشمية. 
              أي نزاع يُحل أمام المحاكم المختصة في عمان.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تغيير الشروط</Text>
            <Text style={styles.text}>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. 
              التغييرات تدخل حيز التنفيذ عند نشرها في التطبيق.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التواصل</Text>
            <Text style={styles.text}>
              لأي استفسارات حول شروط الخدمة:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>البريد الإلكتروني: legal@igtaxi.com</Text>
              <Text style={styles.listItem}>الهاتف: +962-6-1234567</Text>
              <Text style={styles.listItem}>العنوان: عمان، الأردن</Text>
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
