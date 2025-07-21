import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

interface BusinessOffer {
  id: number;
  business_id: string;
  category_id?: number;
  title: string;
  description?: string;
  original_price?: number;
  sale_price: number;
  discount_percentage: number;
  image_urls?: string[];
  stock_quantity?: number;
  is_available: boolean;
  is_featured: boolean;
  valid_from: string;
  valid_until?: string;
  specifications?: any;
  category_name?: string;
  business_name?: string;
  business_type?: string;
}

interface OfferCategory {
  id: number;
  business_id: string;
  name: string;
  description?: string;
  icon_url?: string;
  display_order: number;
  is_active: boolean;
}

interface CartItem {
  offer: BusinessOffer;
  quantity: number;
  special_requests?: string;
}

interface BusinessOffersProps {
  businessId?: string;
}

export const BusinessOffers: React.FC<BusinessOffersProps> = ({ businessId }) => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<BusinessOffer | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    fetchOffersAndCategories();
  }, [businessId, selectedCategory]);

  const fetchOffersAndCategories = async () => {
    try {
      // جلب الفئات
      let categoriesQuery = supabase
        .from('offer_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (businessId) {
        categoriesQuery = categoriesQuery.eq('business_id', businessId);
      }

      const { data: categoriesData, error: categoriesError } = await categoriesQuery;
      if (categoriesError) throw categoriesError;

      setCategories(categoriesData || []);

      // جلب العروض
      let offersQuery = supabase
        .from('business_offers_view')
        .select('*')
        .eq('is_available', true)
        .order('display_order');

      if (businessId) {
        offersQuery = offersQuery.eq('business_id', businessId);
      }

      if (selectedCategory) {
        offersQuery = offersQuery.eq('category_id', selectedCategory);
      }

      const { data: offersData, error: offersError } = await offersQuery;
      if (offersError) throw offersError;

      setOffers(offersData || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل العروض');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addToCart = (offer: BusinessOffer, qty: number, requests?: string) => {
    const existingItem = cart.find(item => item.offer.id === offer.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.offer.id === offer.id 
          ? { ...item, quantity: item.quantity + qty, special_requests: requests }
          : item
      ));
    } else {
      setCart([...cart, { offer, quantity: qty, special_requests: requests }]);
    }

    Alert.alert('تم الإضافة', `تم إضافة ${offer.title} إلى السلة`);
    setShowOfferModal(false);
    setQuantity(1);
    setSpecialRequests('');
  };

  const removeFromCart = (offerId: number) => {
    setCart(cart.filter(item => item.offer.id !== offerId));
  };

  const updateCartQuantity = (offerId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(offerId);
      return;
    }

    setCart(cart.map(item => 
      item.offer.id === offerId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.offer.sale_price * item.quantity), 0);
  };

  const renderOfferItem = ({ item }: { item: BusinessOffer }) => (
    <TouchableOpacity
      style={styles.offerCard}
      onPress={() => {
        setSelectedOffer(item);
        setShowOfferModal(true);
      }}
    >
      {item.image_urls && item.image_urls.length > 0 && (
        <Image source={{ uri: item.image_urls[0] }} style={styles.offerImage} />
      )}
      
      <View style={styles.offerContent}>
        <View style={styles.offerHeader}>
          <Text style={styles.offerTitle} numberOfLines={2}>{item.title}</Text>
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>مميز</Text>
            </View>
          )}
        </View>
        
        {item.description && (
          <Text style={styles.offerDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.priceContainer}>
          {item.original_price && item.original_price > item.sale_price && (
            <Text style={styles.originalPrice}>{item.original_price.toFixed(2)} ر.س</Text>
          )}
          <Text style={styles.salePrice}>{item.sale_price.toFixed(2)} ر.س</Text>
          {item.discount_percentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{item.discount_percentage}%</Text>
            </View>
          )}
        </View>
        
        {item.stock_quantity !== undefined && item.stock_quantity !== null && (
          <Text style={styles.stockInfo}>
            متوفر: {item.stock_quantity} قطعة
          </Text>
        )}
        
        <Text style={styles.businessName}>{item.business_name}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === null && styles.categoryButtonActive
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryText,
            selectedCategory === null && styles.categoryTextActive
          ]}>
            الكل
          </Text>
        </TouchableOpacity>
        
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderOfferModal = () => {
    if (!selectedOffer) return null;

    return (
      <Modal
        visible={showOfferModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedOffer.title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOfferModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOffer.image_urls && selectedOffer.image_urls.length > 0 && (
              <ScrollView horizontal pagingEnabled style={styles.imageGallery}>
                {selectedOffer.image_urls.map((imageUrl, index) => (
                  <Image key={index} source={{ uri: imageUrl }} style={styles.galleryImage} />
                ))}
              </ScrollView>
            )}

            <View style={styles.offerDetails}>
              <Text style={styles.detailTitle}>{selectedOffer.title}</Text>
              
              {selectedOffer.description && (
                <Text style={styles.detailDescription}>{selectedOffer.description}</Text>
              )}

              <View style={styles.priceSection}>
                {selectedOffer.original_price && selectedOffer.original_price > selectedOffer.sale_price && (
                  <Text style={styles.originalPriceModal}>{selectedOffer.original_price.toFixed(2)} ر.س</Text>
                )}
                <Text style={styles.salePriceModal}>{selectedOffer.sale_price.toFixed(2)} ر.س</Text>
                {selectedOffer.discount_percentage > 0 && (
                  <View style={styles.discountBadgeModal}>
                    <Text style={styles.discountTextModal}>خصم {selectedOffer.discount_percentage}%</Text>
                  </View>
                )}
              </View>

              {selectedOffer.specifications && (
                <View style={styles.specificationsSection}>
                  <Text style={styles.sectionTitle}>المواصفات:</Text>
                  <Text style={styles.specificationsText}>
                    {JSON.stringify(selectedOffer.specifications, null, 2)}
                  </Text>
                </View>
              )}

              <View style={styles.quantitySection}>
                <Text style={styles.sectionTitle}>الكمية:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityDisplay}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.requestsSection}>
                <Text style={styles.sectionTitle}>طلبات خاصة:</Text>
                <TextInput
                  style={styles.requestsInput}
                  placeholder="أي طلبات خاصة أو تعديلات..."
                  value={specialRequests}
                  onChangeText={setSpecialRequests}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={() => addToCart(selectedOffer, quantity, specialRequests)}
              >
                <Text style={styles.addToCartButtonText}>
                  إضافة للسلة - {(selectedOffer.sale_price * quantity).toFixed(2)} ر.س
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderCartModal = () => (
    <Modal
      visible={showCart}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>السلة ({cart.length} عنصر)</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCart(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {cart.map((item, index) => (
            <View key={index} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemTitle}>{item.offer.title}</Text>
                <Text style={styles.cartItemPrice}>
                  {item.offer.sale_price.toFixed(2)} ر.س × {item.quantity} = {(item.offer.sale_price * item.quantity).toFixed(2)} ر.س
                </Text>
                {item.special_requests && (
                  <Text style={styles.cartItemRequests}>
                    طلبات خاصة: {item.special_requests}
                  </Text>
                )}
              </View>
              
              <View style={styles.cartItemActions}>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButtonSmall}
                    onPress={() => updateCartQuantity(item.offer.id, item.quantity - 1)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityDisplaySmall}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButtonSmall}
                    onPress={() => updateCartQuantity(item.offer.id, item.quantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCart(item.offer.id)}
                >
                  <Text style={styles.removeButtonText}>حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {cart.length > 0 && (
            <View style={styles.cartSummary}>
              <Text style={styles.cartTotal}>
                المجموع: {calculateTotal().toFixed(2)} ر.س
              </Text>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() => {
                  // سيتم تطوير نموذج الطلب لاحقاً
                  Alert.alert('قريباً', 'سيتم إضافة نموذج إتمام الطلب');
                }}
              >
                <Text style={styles.checkoutButtonText}>إتمام الطلب</Text>
              </TouchableOpacity>
            </View>
          )}

          {cart.length === 0 && (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>السلة فارغة</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffersAndCategories();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل العروض...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>العروض التجارية</Text>
        {cart.length > 0 && (
          <TouchableOpacity
            style={styles.cartIcon}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.cartIconText}>🛒 {cart.length}</Text>
          </TouchableOpacity>
        )}
      </View>

      {categories.length > 0 && renderCategoryFilter()}

      <FlatList
        data={offers}
        renderItem={renderOfferItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.offersList}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>لا توجد عروض متاحة حالياً</Text>
          </View>
        }
      />

      {renderOfferModal()}
      {renderCartModal()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cartIcon: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  cartIconText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  offersList: {
    flex: 1,
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: '48%',
  },
  offerImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  offerContent: {
    padding: 10,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  featuredBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 5,
  },
  featuredText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  offerDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 5,
  },
  salePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 5,
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  stockInfo: {
    fontSize: 11,
    color: '#999',
    marginBottom: 5,
  },
  businessName: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    flex: 1,
  },
  imageGallery: {
    height: 250,
  },
  galleryImage: {
    width: 300,
    height: 250,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  offerDetails: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  originalPriceModal: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  salePriceModal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 10,
  },
  discountBadgeModal: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountTextModal: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  specificationsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  specificationsText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  quantitySection: {
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  requestsSection: {
    marginBottom: 20,
  },
  requestsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addToCartButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  cartItemRequests: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  cartItemActions: {
    alignItems: 'center',
    marginLeft: 10,
  },
  quantityButtonSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplaySmall: {
    fontSize: 14,
    fontWeight: 'bold',
    marginVertical: 5,
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cartSummary: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCart: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyCartText: {
    fontSize: 16,
    color: '#999',
  },
});

export default BusinessOffers;
