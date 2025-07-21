import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

export default function PrivacyPolicyScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>سياسة الخصوصية</Text>
          <Text style={styles.subtitle}>IGTaxi - خدمات النقل</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مقدمة</Text>
            <Text style={styles.text}>
              نحن في IGTaxi نقدر خصوصيتك ونلتزم بحماية معلوماتك الشخصية. 
              تشرح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك عند استخدام تطبيقنا وخدماتنا.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>المعلومات التي نجمعها</Text>
            <Text style={styles.text}>نجمع الأنواع التالية من المعلومات:</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• معلومات الحساب: الاسم، رقم الهاتف، البريد الإلكتروني</Text>
              <Text style={styles.listItem}>• معلومات الموقع: لتوفير خدمات النقل</Text>
              <Text style={styles.listItem}>• معلومات الرحلات: نقاط الانطلاق والوصول، التوقيت</Text>
              <Text style={styles.listItem}>• معلومات الدفع: تفاصيل وسائل الدفع المحفوظة</Text>
              <Text style={styles.listItem}>• معلومات الجهاز: نوع الجهاز، نظام التشغيل</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>كيفية استخدام المعلومات</Text>
            <Text style={styles.text}>نستخدم معلوماتك لـ:</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• توفير خدمات النقل والتوصيل</Text>
              <Text style={styles.listItem}>• التحقق من هويتك وحماية حسابك</Text>
              <Text style={styles.listItem}>• معالجة المدفوعات</Text>
              <Text style={styles.listItem}>• تحسين خدماتنا</Text>
              <Text style={styles.listItem}>• التواصل معك حول الخدمة</Text>
              <Text style={styles.listItem}>• الامتثال للمتطلبات القانونية</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مشاركة المعلومات</Text>
            <Text style={styles.text}>
              لا نبيع معلوماتك الشخصية لطرف ثالث. قد نشارك معلوماتك في الحالات التالية:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• مع السائقين المعتمدين لإتمام الرحلة</Text>
              <Text style={styles.listItem}>• مع مزودي الخدمات التقنية الموثوقين</Text>
              <Text style={styles.listItem}>• عند الطلب من السلطات القانونية</Text>
              <Text style={styles.listItem}>• لحماية حقوقنا وحقوق المستخدمين</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>حماية البيانات</Text>
            <Text style={styles.text}>
              نستخدم تدابير أمنية متقدمة لحماية معلوماتك:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• تشفير البيانات أثناء النقل والتخزين</Text>
              <Text style={styles.listItem}>• مصادقة متعددة العوامل</Text>
              <Text style={styles.listItem}>• مراقبة أمنية مستمرة</Text>
              <Text style={styles.listItem}>• وصول محدود للموظفين المخولين</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>حقوقك</Text>
            <Text style={styles.text}>يحق لك:</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>• الوصول إلى معلوماتك الشخصية</Text>
              <Text style={styles.listItem}>• تصحيح المعلومات غير الصحيحة</Text>
              <Text style={styles.listItem}>• حذف حسابك ومعلوماتك</Text>
              <Text style={styles.listItem}>• الاعتراض على معالجة معينة</Text>
              <Text style={styles.listItem}>• نقل بياناتك إلى خدمة أخرى</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملفات تعريف الارتباط</Text>
            <Text style={styles.text}>
              نستخدم ملفات تعريف الارتباط وتقنيات مشابهة لتحسين تجربتك، 
              تذكر تفضيلاتك، وتحليل استخدام التطبيق.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الاحتفاظ بالبيانات</Text>
            <Text style={styles.text}>
              نحتفظ بمعلوماتك طالما كان حسابك نشطاً أو حسب الحاجة لتوفير الخدمات. 
              قد نحتفظ ببعض المعلومات لفترة أطول للامتثال القانوني.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>تغييرات السياسة</Text>
            <Text style={styles.text}>
              قد نحدث هذه السياسة من وقت لآخر. سنشعرك بالتغييرات المهمة 
              عبر التطبيق أو البريد الإلكتروني.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>التواصل</Text>
            <Text style={styles.text}>
              لأي استفسارات حول سياسة الخصوصية:
            </Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>البريد الإلكتروني: privacy@igtaxi.com</Text>
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
