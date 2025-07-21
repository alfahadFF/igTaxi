import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  MapPin,
  Car,
  Shield,
  Zap,
  Droplets,
  Star,
  Clock,
  Calendar,
  CreditCard,
  X,
} from 'lucide-react-native';

interface ParkingLot {
  id: number;
  name: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  available_spots: number;
  price_per_hour: number;
  price_per_day: number;
  price_per_month: number;
  image_url: string;
  features: string[];
  contact_phone: string;
  is_covered: boolean;
  has_security: boolean;
  has_valet: boolean;
  has_ev_charging: boolean;
  has_car_wash: boolean;
  average_rating: number;
  total_reviews: number;
}

interface BookingData {
  parkingLotId: number;
  durationType: 'hourly' | 'daily' | 'monthly';
  duration: number;
  vehiclePlate: string;
  vehicleType: string;
  specialRequests: string;
}

export const ParkingList: React.FC = () => {
  const { user } = useAuth();
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<'hourly' | 'daily' | 'monthly'>('hourly');
  const [bookingData, setBookingData] = useState<BookingData>({
    parkingLotId: 0,
    durationType: 'hourly',
    duration: 1,
    vehiclePlate: '',
    vehicleType: 'car',
    specialRequests: '',
  });

  useEffect(() => {
    fetchParkingLots();
  }, []);

  const fetchParkingLots = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_lots_with_ratings')
        .select('*')
        .eq('is_active', true)
        .order('available_spots', { ascending: false });

      if (error) throw error;
      setParkingLots(data || []);
    } catch (error) {
      console.error('Error fetching parking lots:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل المواقف');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateTotal = (lot: ParkingLot, durationType: string, duration: number) => {
    let rate = 0;
    switch (durationType) {
      case 'hourly':
        rate = lot.price_per_hour;
        break;
      case 'daily':
        rate = lot.price_per_day || lot.price_per_hour * 24;
        break;
      case 'monthly':
        rate = lot.price_per_month || lot.price_per_day * 30 || lot.price_per_hour * 24 * 30;
        break;
    }
    return rate * duration;
  };

  const handleBooking = async () => {
    if (!user) {
      Alert.alert('تسجيل الدخول مطلوب', 'يرجى تسجيل الدخول لحجز موقف');
      return;
    }

    if (!bookingData.vehiclePlate.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال رقم لوحة السيارة');
      return;
    }

    if (!selectedLot || selectedLot.available_spots <= 0) {
      Alert.alert('غير متوفر', 'هذا الموقف غير متوفر حالياً');
      return;
    }

    try {
      const startTime = new Date();
      const endTime = new Date();
      
      switch (bookingData.durationType) {
        case 'hourly':
          endTime.setHours(endTime.getHours() + bookingData.duration);
          break;
        case 'daily':
          endTime.setDate(endTime.getDate() + bookingData.duration);
          break;
        case 'monthly':
          endTime.setMonth(endTime.getMonth() + bookingData.duration);
          break;
      }

      const totalAmount = calculateTotal(selectedLot, bookingData.durationType, bookingData.duration);
      const durationHours = 
        bookingData.durationType === 'hourly' ? bookingData.duration :
        bookingData.durationType === 'daily' ? bookingData.duration * 24 :
        bookingData.duration * 24 * 30;

      const reservationData = {
        parking_lot_id: selectedLot.id,
        customer_id: user.id,
        vehicle_plate_number: bookingData.vehiclePlate.toUpperCase(),
        vehicle_type: bookingData.vehicleType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_type: bookingData.durationType,
        duration_hours: durationHours,
        hourly_rate: selectedLot.price_per_hour,
        total_amount: totalAmount,
        parking_fee: totalAmount,
        service_fee: 0, // لا توجد نسبة للتطبيق
        special_requests: bookingData.specialRequests,
        status: 'confirmed', // تأكيد فوري
      };

      const { data: reservation, error } = await supabase
        .from('parking_reservations')
        .insert([reservationData])
        .select()
        .single();

      if (error) throw error;

      // إنشاء دفعة وهمية (في التطبيق الحقيقي ستكون من خلال بوابة دفع)
      const paymentData = {
        reservation_id: reservation.id,
        payment_method: 'credit_card',
        amount: totalAmount,
        status: 'completed',
        paid_at: new Date().toISOString(),
      };

      const { error: paymentError } = await supabase
        .from('parking_payments')
        .insert([paymentData]);

      if (paymentError) throw paymentError;

      Alert.alert(
        'تم الحجز بنجاح! 🎉',
        `رقم الحجز: ${reservation.reservation_number}\nالمبلغ: ${totalAmount.toFixed(2)} ر.س\n\nستحصل على رسالة تأكيد قريباً`,
        [
          {
            text: 'حسناً',
            onPress: () => {
              setShowBookingModal(false);
              fetchParkingLots(); // تحديث قائمة المواقف
              resetBookingData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('خطأ', 'حدث خطأ في إنشاء الحجز. يرجى المحاولة مرة أخرى');
    }
  };

  const resetBookingData = () => {
    setBookingData({
      parkingLotId: 0,
      durationType: 'hourly',
      duration: 1,
      vehiclePlate: '',
      vehicleType: 'car',
      specialRequests: '',
    });
    setSelectedDuration('hourly');
  };

  const openBookingModal = (lot: ParkingLot) => {
    setSelectedLot(lot);
    setBookingData(prev => ({ ...prev, parkingLotId: lot.id }));
    setShowBookingModal(true);
  };

  const renderFeatureIcon = (feature: string, lot: ParkingLot) => {
    switch (feature) {
      case 'مغطى':
        return lot.is_covered ? <Car size={16} color="#34C759" /> : null;
      case 'أمان':
        return lot.has_security ? <Shield size={16} color="#34C759" /> : null;
      case 'خدمة صف السيارات':
        return lot.has_valet ? <Car size={16} color="#34C759" /> : null;
      case 'شحن السيارات الكهربائية':
        return lot.has_ev_charging ? <Zap size={16} color="#34C759" /> : null;
      case 'غسيل السيارات':
        return lot.has_car_wash ? <Droplets size={16} color="#34C759" /> : null;
      default:
        return <Car size={16} color="#34C759" />;
    }
  };

  const renderParkingLot = ({ item }: { item: ParkingLot }) => (
    <View style={styles.parkingCard}>
      <Image source={{ uri: item.image_url }} style={styles.parkingImage} />
      
      <View style={styles.parkingInfo}>
        <View style={styles.header}>
          <Text style={styles.parkingName}>{item.name}</Text>
          {item.average_rating > 0 && (
            <View style={styles.ratingContainer}>
              <Star size={16} color="#F5B800" fill="#F5B800" />
              <Text style={styles.rating}>{item.average_rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.total_reviews})</Text>
            </View>
          )}
        </View>

        <View style={styles.locationContainer}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.detailsContainer}>
          <View style={styles.availabilityContainer}>
            <Car size={18} color={item.available_spots > 0 ? "#34C759" : "#FF3B30"} />
            <Text style={[
              styles.availabilityText,
              { color: item.available_spots > 0 ? "#34C759" : "#FF3B30" }
            ]}>
              {item.available_spots > 0 
                ? `${item.available_spots} موقف متاح` 
                : 'غير متوفر'
              }
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{item.price_per_hour} ر.س/ساعة</Text>
            {item.price_per_day && (
              <Text style={styles.priceSubText}>{item.price_per_day} ر.س/يوم</Text>
            )}
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {item.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              {renderFeatureIcon(feature, item)}
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            item.available_spots <= 0 && styles.disabledButton
          ]}
          onPress={() => openBookingModal(item)}
          disabled={item.available_spots <= 0}
        >
          <Text style={[
            styles.bookButtonText,
            item.available_spots <= 0 && styles.disabledButtonText
          ]}>
            {item.available_spots > 0 ? 'احجز الآن' : 'غير متوفر'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBookingModal = () => {
    if (!selectedLot) return null;

    const total = calculateTotal(selectedLot, selectedDuration, bookingData.duration);

    return (
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>حجز موقف - {selectedLot.name}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowBookingModal(false);
                resetBookingData();
              }}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* نوع المدة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>نوع الحجز</Text>
              <View style={styles.durationContainer}>
                {[
                  { id: 'hourly', label: 'ساعي', icon: <Clock size={20} color="#333" /> },
                  { id: 'daily', label: 'يومي', icon: <Calendar size={20} color="#333" /> },
                  { id: 'monthly', label: 'شهري', icon: <CreditCard size={20} color="#333" /> },
                ].map((duration) => (
                  <TouchableOpacity
                    key={duration.id}
                    style={[
                      styles.durationButton,
                      selectedDuration === duration.id && styles.selectedDuration,
                    ]}
                    onPress={() => {
                      setSelectedDuration(duration.id as any);
                      setBookingData(prev => ({ ...prev, durationType: duration.id as any }));
                    }}
                  >
                    {duration.icon}
                    <Text
                      style={[
                        styles.durationText,
                        selectedDuration === duration.id && styles.selectedDurationText,
                      ]}
                    >
                      {duration.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* المدة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                المدة ({selectedDuration === 'hourly' ? 'ساعات' : selectedDuration === 'daily' ? 'أيام' : 'أشهر'})
              </Text>
              <TextInput
                style={styles.textInput}
                value={bookingData.duration.toString()}
                onChangeText={(text) => {
                  const duration = parseInt(text) || 1;
                  setBookingData(prev => ({ ...prev, duration }));
                }}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>

            {/* رقم اللوحة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>رقم لوحة السيارة *</Text>
              <TextInput
                style={styles.textInput}
                value={bookingData.vehiclePlate}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, vehiclePlate: text }))}
                placeholder="مثل: ABC 123"
                autoCapitalize="characters"
              />
            </View>

            {/* نوع المركبة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>نوع المركبة</Text>
              <View style={styles.vehicleTypeContainer}>
                {[
                  { id: 'car', label: 'سيارة' },
                  { id: 'suv', label: 'سيارة دفع رباعي' },
                  { id: 'truck', label: 'شاحنة' },
                  { id: 'motorcycle', label: 'دراجة نارية' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.vehicleTypeButton,
                      bookingData.vehicleType === type.id && styles.selectedVehicleType,
                    ]}
                    onPress={() => setBookingData(prev => ({ ...prev, vehicleType: type.id }))}
                  >
                    <Text style={[
                      styles.vehicleTypeText,
                      bookingData.vehicleType === type.id && styles.selectedVehicleTypeText,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* طلبات خاصة */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>طلبات خاصة (اختياري)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={bookingData.specialRequests}
                onChangeText={(text) => setBookingData(prev => ({ ...prev, specialRequests: text }))}
                placeholder="أي طلبات خاصة أو ملاحظات..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* ملخص التكلفة */}
            <View style={styles.costSummary}>
              <Text style={styles.costTitle}>ملخص التكلفة</Text>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>
                  {bookingData.duration} {selectedDuration === 'hourly' ? 'ساعة' : selectedDuration === 'daily' ? 'يوم' : 'شهر'}
                </Text>
                <Text style={styles.costValue}>{total.toFixed(2)} ر.س</Text>
              </View>
              <View style={styles.costRow}>
                <Text style={styles.costLabel}>رسوم الخدمة</Text>
                <Text style={styles.costValue}>0.00 ر.س</Text>
              </View>
              <View style={[styles.costRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>المجموع</Text>
                <Text style={styles.totalValue}>{total.toFixed(2)} ر.س</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleBooking}
              disabled={!bookingData.vehiclePlate.trim()}
            >
              <Text style={styles.confirmButtonText}>تأكيد الحجز</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchParkingLots();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={parkingLots}
        renderItem={renderParkingLot}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد مواقف متاحة حالياً</Text>
          </View>
        }
      />
      {renderBookingModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  parkingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  parkingImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  parkingInfo: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  parkingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5B800',
  },
  priceSubText: {
    fontSize: 12,
    color: '#999',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  featureText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  selectedDuration: {
    backgroundColor: '#F5B800',
  },
  durationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedDurationText: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleTypeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedVehicleType: {
    backgroundColor: '#F5B800',
  },
  vehicleTypeText: {
    fontSize: 14,
    color: '#333',
  },
  selectedVehicleTypeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  costSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  costTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  costLabel: {
    fontSize: 14,
    color: '#666',
  },
  costValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5B800',
  },
  confirmButton: {
    backgroundColor: '#F5B800',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ParkingList;
