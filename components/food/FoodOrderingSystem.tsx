import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import BusinessMenu from '../food/BusinessMenu';
import MenuManagement from '../food/MenuManagement';
import OrderForm from '../food/OrderForm';
import BusinessOrdersManager from '../orders/BusinessOrdersManager';
import CustomerOrderTracking from '../orders/CustomerOrderTracking';
import DriverDeliveryRequests from '../delivery/DriverDeliveryRequests';

export const FoodOrderingSystem: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id || '');
  const [activeView, setActiveView] = useState<string>('');

  useEffect(() => {
    // تحديد العرض الافتراضي بناءً على نوع المستخدم
    if (profile) {
      // للتحقق من نوع الملف الشخصي، نحتاج لفحص البيانات المتاحة
      // سنعتمد على البيانات المتوفرة في قاعدة البيانات
      setActiveView('customer_orders'); // القيمة الافتراضية
    }
  }, [profile]);

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل المعلومات...</Text>
      </View>
    );
  }

  const getAvailableViews = () => {
    const views = [];
    
    // جميع المستخدمين يمكنهم الوصول للميزات الأساسية
    views.push(
      { id: 'browse_menus', label: 'تصفح القوائم', icon: '🍽️' },
      { id: 'place_order', label: 'إضافة طلب', icon: '📝' },
      { id: 'customer_orders', label: 'طلباتي', icon: '📋' },
      { id: 'menu_management', label: 'إدارة القائمة', icon: '📋' },
      { id: 'business_orders', label: 'إدارة الطلبات', icon: '📦' },
      { id: 'delivery_requests', label: 'طلبات التوصيل', icon: '🚗' },
    );

    return views;
  };

  const renderContent = () => {
    switch (activeView) {
      case 'browse_menus':
        return <BusinessMenu businessId="" />; // سيتم تعديلها لاحقاً لعرض كل المنشآت
      
      case 'place_order':
        return <OrderForm businessId="" businessName="" />; // سيتم تعديلها لاحقاً
      
      case 'customer_orders':
        return <CustomerOrderTracking />;
      
      case 'menu_management':
        return <MenuManagement />;
      
      case 'business_orders':
        return <BusinessOrdersManager />;
      
      case 'delivery_requests':
        return <DriverDeliveryRequests />;
      
      default:
        return (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>مرحباً بك في نظام الطعام</Text>
            <Text style={styles.welcomeSubtitle}>
              اختر من القائمة أدناه للبدء
            </Text>
          </View>
        );
    }
  };

  const availableViews = getAvailableViews();

  return (
    <View style={styles.container}>
      {/* شريط التنقل */}
      <View style={styles.navigationContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.navigationScroll}>
          {availableViews.map((view) => (
            <TouchableOpacity
              key={view.id}
              style={[
                styles.navButton,
                activeView === view.id && styles.navButtonActive
              ]}
              onPress={() => setActiveView(view.id)}
            >
              <Text style={styles.navIcon}>{view.icon}</Text>
              <Text style={[
                styles.navLabel,
                activeView === view.id && styles.navLabelActive
              ]}>
                {view.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* المحتوى */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 10,
  },
  navigationScroll: {
    paddingHorizontal: 10,
  },
  navButton: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    minWidth: 80,
  },
  navButtonActive: {
    backgroundColor: '#007AFF',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  navLabelActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FoodOrderingSystem;
