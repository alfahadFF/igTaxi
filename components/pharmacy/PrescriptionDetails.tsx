import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import Colors from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

const colors = {
  ...Colors.light,
  textSecondary: '#6c757d'
};

interface PrescriptionItem {
  id: number;
  medication_name: string;
  dosage: string;
  quantity: number;
  unit: string;
  is_available: boolean;
  price_per_unit: number;
  total_price: number;
  alternative_medication?: string;
  alternative_price?: number;
  pharmacist_notes?: string;
}

interface PrescriptionMessage {
  id: number;
  sender_type: 'customer' | 'pharmacist';
  message_text: string;
  message_type: 'text' | 'image' | 'voice';
  attachment_url?: string;
  created_at: string;
  is_read: boolean;
}

interface PrescriptionOrder {
  id: number;
  order_number: string;
  pharmacy_name: string;
  pharmacy_phone: string;
  prescription_image_url: string;
  customer_notes?: string;
  delivery_address: string;
  delivery_phone: string;
  patient_name: string;
  patient_age?: number;
  patient_gender: string;
  urgent_order: boolean;
  status: string;
  pharmacist_notes?: string;
  total_amount: number;
  delivery_fee: number;
  estimated_preparation_time?: number;
  quoted_at?: string;
  approved_at?: string;
  prepared_at?: string;
  delivered_at?: string;
  created_at: string;
}

interface PrescriptionDetailsProps {
  orderId: number;
  onBack: () => void;
}

export default function PrescriptionDetails({ orderId, onBack }: PrescriptionDetailsProps) {
  const [order, setOrder] = useState<PrescriptionOrder | null>(null);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [messages, setMessages] = useState<PrescriptionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrderDetails();
    fetchMessages();
    
    // اشتراك في التحديثات المباشرة للرسائل
    const messagesSubscription = supabase
      .channel(`prescription_messages_${orderId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'prescription_messages',
          filter: `prescription_order_id=eq.${orderId}`
        }, 
        fetchMessages
      )
      .subscribe();

    // اشتراك في تحديثات الطلب
    const orderSubscription = supabase
      .channel(`prescription_order_${orderId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'prescription_orders',
          filter: `id=eq.${orderId}`
        }, 
        () => {
          fetchOrderDetails();
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      orderSubscription.unsubscribe();
    };
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('prescription_orders_detailed')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل تفاصيل الطلب');
    }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('prescription_items')
        .select('*')
        .eq('prescription_order_id', orderId);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('prescription_messages')
        .select('*')
        .eq('prescription_order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // تحديد الرسائل كمقروءة
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('prescription_messages')
        .update({ is_read: true })
        .eq('prescription_order_id', orderId)
        .neq('sender_id', user?.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('prescription_messages')
        .insert({
          prescription_order_id: orderId,
          sender_id: user.id,
          sender_type: 'customer',
          message_text: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('خطأ', 'حدث خطأ في إرسال الرسالة');
    } finally {
      setSendingMessage(false);
    }
  };

  const approveQuote = async () => {
    try {
      const { error } = await supabase
        .from('prescription_orders')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      Alert.alert('تم الموافقة', 'تم الموافقة على العرض. ستقوم الصيدلية بتحضير الطلب.');
    } catch (error) {
      console.error('Error approving quote:', error);
      Alert.alert('خطأ', 'حدث خطأ في الموافقة على العرض');
    }
  };

  const callPharmacy = () => {
    if (order?.pharmacy_phone) {
      Linking.openURL(`tel:${order.pharmacy_phone}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'reviewed': return '#17a2b8';
      case 'quoted': return '#6f42c1';
      case 'approved': return '#28a745';
      case 'preparing': return '#fd7e14';
      case 'ready': return '#20c997';
      case 'delivering': return '#007bff';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'rejected': return '#dc3545';
      default: return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'reviewed': return 'تم المراجعة';
      case 'quoted': return 'تم التسعير';
      case 'approved': return 'تم الموافقة';
      case 'preparing': return 'قيد التحضير';
      case 'ready': return 'جاهز للتوصيل';
      case 'delivering': return 'قيد التوصيل';
      case 'delivered': return 'تم التوصيل';
      case 'cancelled': return 'ملغي';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const renderMessage = ({ item }: { item: PrescriptionMessage }) => (
    <View style={[
      styles.messageContainer,
      item.sender_type === 'customer' ? styles.customerMessage : styles.pharmacistMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender_type === 'customer' ? styles.customerMessageText : styles.pharmacistMessageText
      ]}>
        {item.message_text}
      </Text>
      <Text style={[
        styles.messageTime,
        item.sender_type === 'customer' ? styles.customerMessageTime : styles.pharmacistMessageTime
      ]}>
        {new Date(item.created_at).toLocaleTimeString('ar-AE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: PrescriptionItem }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.medicationName}>{item.medication_name}</Text>
        <View style={[
          styles.availabilityBadge,
          { backgroundColor: item.is_available ? colors.success + '20' : colors.error + '20' }
        ]}>
          <Text style={[
            styles.availabilityText,
            { color: item.is_available ? colors.success : colors.error }
          ]}>
            {item.is_available ? 'متوفر' : 'غير متوفر'}
          </Text>
        </View>
      </View>

      {item.dosage && (
        <Text style={styles.itemDetail}>الجرعة: {item.dosage}</Text>
      )}
      
      <Text style={styles.itemDetail}>
        الكمية: {item.quantity} {item.unit}
      </Text>

      {item.is_available && item.price_per_unit > 0 && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>السعر:</Text>
          <Text style={styles.priceValue}>
            {item.total_price} درهم ({item.price_per_unit} درهم/{item.unit})
          </Text>
        </View>
      )}

      {item.alternative_medication && (
        <View style={styles.alternativeContainer}>
          <Text style={styles.alternativeTitle}>بديل مقترح:</Text>
          <Text style={styles.alternativeText}>
            {item.alternative_medication}
            {item.alternative_price && ` - ${item.alternative_price} درهم`}
          </Text>
        </View>
      )}

      {item.pharmacist_notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesTitle}>ملاحظات الصيدلي:</Text>
          <Text style={styles.notesText}>{item.pharmacist_notes}</Text>
        </View>
      )}
    </View>
  );

  if (loading || !order) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل الطلب...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>طلب رقم {order.order_number}</Text>
        <TouchableOpacity style={styles.callButton} onPress={callPharmacy}>
          <Ionicons name="call" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={styles.statusContainer}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>حالة الطلب</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
            </View>
          </View>
          
          {order.urgent_order && (
            <View style={styles.urgentBadge}>
              <Ionicons name="flash" size={16} color={colors.error} />
              <Text style={styles.urgentText}>طلب عاجل</Text>
            </View>
          )}
        </View>

        {/* Prescription Image */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>صورة الوصفة</Text>
          <Image 
            source={{ uri: order.prescription_image_url }} 
            style={styles.prescriptionImage}
            resizeMode="contain"
          />
        </View>

        {/* Patient Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات المريض</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>الاسم:</Text>
            <Text style={styles.infoValue}>{order.patient_name}</Text>
          </View>
          {order.patient_age && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>العمر:</Text>
              <Text style={styles.infoValue}>{order.patient_age} سنة</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>الجنس:</Text>
            <Text style={styles.infoValue}>
              {order.patient_gender === 'male' ? 'ذكر' : 'أنثى'}
            </Text>
          </View>
        </View>

        {/* Pharmacy Response */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>رد الصيدلية</Text>
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
            
            {order.total_amount > 0 && (
              <View style={styles.totalContainer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>المجموع الفرعي:</Text>
                  <Text style={styles.totalValue}>
                    {(order.total_amount - order.delivery_fee).toFixed(2)} درهم
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>رسوم التوصيل:</Text>
                  <Text style={styles.totalValue}>
                    {order.delivery_fee === 0 ? 'مجاني' : `${order.delivery_fee} درهم`}
                  </Text>
                </View>
                <View style={[styles.totalRow, styles.finalTotal]}>
                  <Text style={styles.finalTotalLabel}>المجموع الكلي:</Text>
                  <Text style={styles.finalTotalValue}>{order.total_amount} درهم</Text>
                </View>
              </View>
            )}

            {order.status === 'quoted' && (
              <TouchableOpacity style={styles.approveButton} onPress={approveQuote}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.approveButtonText}>موافقة على العرض</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pharmacist Notes */}
        {order.pharmacist_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملاحظات الصيدلي</Text>
            <Text style={styles.pharmacistNotes}>{order.pharmacist_notes}</Text>
          </View>
        )}

        {/* Messages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المحادثة</Text>
          {messages.length > 0 ? (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              style={styles.messagesList}
            />
          ) : (
            <Text style={styles.noMessagesText}>لا توجد رسائل بعد</Text>
          )}
        </View>
      </ScrollView>

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="اكتب رسالة..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  callButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  urgentText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  prescriptionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  alternativeContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  alternativeTitle: {
    fontSize: 14,
    color: '#856404',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  alternativeText: {
    fontSize: 14,
    color: '#856404',
  },
  notesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#d1ecf1',
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 14,
    color: '#0c5460',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#0c5460',
  },
  totalContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  finalTotal: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 5,
  },
  finalTotalLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  finalTotalValue: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pharmacistNotes: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  messagesList: {
    maxHeight: 300,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  customerMessage: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  pharmacistMessage: {
    backgroundColor: '#e9ecef',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  customerMessageText: {
    color: '#fff',
  },
  pharmacistMessageText: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 5,
  },
  customerMessageTime: {
    color: '#fff',
    opacity: 0.8,
  },
  pharmacistMessageTime: {
    color: colors.textSecondary,
  },
  noMessagesText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  messageInputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
});
