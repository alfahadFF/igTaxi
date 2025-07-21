import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

interface MenuItem {
  id: number;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  image_url: string;
  preparation_time: number;
  is_available: boolean;
  is_popular: boolean;
  category_id: number;
}

interface MenuCategory {
  id: number;
  name: string;
  name_ar: string;
  display_order: number;
  items: MenuItem[];
}

interface BusinessMenuProps {
  businessId: string;
  onItemSelect?: (item: MenuItem, quantity: number, options: any[]) => void;
  showAddToCart?: boolean;
}

export const BusinessMenu: React.FC<BusinessMenuProps> = ({
  businessId,
  onItemSelect,
  showAddToCart = true,
}) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [itemOptions, setItemOptions] = useState<any[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);

  useEffect(() => {
    fetchMenu();
  }, [businessId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);

      // جلب الفئات
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;

      // جلب العناصر لكل فئة
      const categoriesWithItems = await Promise.all(
        categoriesData.map(async (category) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('category_id', category.id)
            .eq('is_available', true)
            .order('display_order');

          if (itemsError) throw itemsError;

          return {
            ...category,
            items: itemsData || [],
          };
        })
      );

      setCategories(categoriesWithItems);
      if (categoriesWithItems.length > 0) {
        setSelectedCategory(categoriesWithItems[0].id);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل القائمة');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemOptions = async (itemId: number) => {
    try {
      const { data: optionsData, error } = await supabase
        .from('menu_item_options')
        .select(`
          *,
          menu_item_option_values (*)
        `)
        .eq('menu_item_id', itemId);

      if (error) throw error;
      return optionsData || [];
    } catch (error) {
      console.error('Error fetching item options:', error);
      return [];
    }
  };

  const handleItemPress = async (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    
    const options = await fetchItemOptions(item.id);
    setItemOptions(options);
    setShowItemModal(true);
  };

  const handleAddToCart = () => {
    if (selectedItem && onItemSelect) {
      onItemSelect(selectedItem, quantity, itemOptions);
      setShowItemModal(false);
      setSelectedItem(null);
    }
  };

  const renderCategoryTab = ({ item }: { item: MenuCategory }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.id && styles.selectedCategoryTab,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        style={[
          styles.categoryTabText,
          selectedCategory === item.id && styles.selectedCategoryTabText,
        ]}
      >
        {item.name_ar || item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => handleItemPress(item)}
    >
      <View style={styles.menuItemContent}>
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
        )}
        <View style={styles.menuItemInfo}>
          <View style={styles.menuItemHeader}>
            <Text style={styles.menuItemName}>
              {item.name_ar || item.name}
            </Text>
            {item.is_popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>الأكثر طلباً</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.menuItemDescription} numberOfLines={2}>
            {item.description_ar || item.description}
          </Text>
          
          <View style={styles.menuItemFooter}>
            <Text style={styles.menuItemPrice}>{item.price} ر.س</Text>
            <Text style={styles.preparationTime}>
              ⏱ {item.preparation_time} دقيقة
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري تحميل القائمة...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* تبويبات الفئات */}
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderCategoryTab}
        keyExtractor={(item) => item.id.toString()}
        style={styles.categoriesList}
      />

      {/* عناصر القائمة */}
      {selectedCategoryData && (
        <FlatList
          data={selectedCategoryData.items}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.menuItemsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* مودال تفاصيل العنصر */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalContent}>
            {selectedItem && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowItemModal(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {selectedItem.image_url && (
                  <Image
                    source={{ uri: selectedItem.image_url }}
                    style={styles.modalItemImage}
                  />
                )}

                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemName}>
                    {selectedItem.name_ar || selectedItem.name}
                  </Text>
                  <Text style={styles.modalItemDescription}>
                    {selectedItem.description_ar || selectedItem.description}
                  </Text>
                  <Text style={styles.modalItemPrice}>
                    {selectedItem.price} ر.س
                  </Text>
                </View>

                {/* خيارات التخصيص */}
                {itemOptions.map((option) => (
                  <View key={option.id} style={styles.optionSection}>
                    <Text style={styles.optionTitle}>
                      {option.name_ar || option.name}
                      {option.is_required && (
                        <Text style={styles.requiredMark}> *</Text>
                      )}
                    </Text>
                    {/* هنا يمكن إضافة اختيارات الخيارات */}
                  </View>
                ))}

                {/* محدد الكمية */}
                <View style={styles.quantitySection}>
                  <Text style={styles.quantityLabel}>الكمية</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Text style={styles.quantityButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(quantity + 1)}
                    >
                      <Text style={styles.quantityButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showAddToCart && (
                  <TouchableOpacity
                    style={styles.addToCartButton}
                    onPress={handleAddToCart}
                  >
                    <Text style={styles.addToCartButtonText}>
                      إضافة للسلة - {(selectedItem.price * quantity).toFixed(2)} ر.س
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  categoriesList: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryTab: {
    backgroundColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedCategoryTabText: {
    color: 'white',
  },
  menuItemsList: {
    flex: 1,
    padding: 10,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    padding: 15,
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  popularBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  preparationTime: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
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
    fontSize: 18,
    color: '#666',
  },
  modalItemImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  modalItemInfo: {
    padding: 20,
  },
  modalItemName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalItemDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  modalItemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  optionSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  requiredMark: {
    color: '#FF3B30',
  },
  quantitySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quantityLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    color: '#333',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BusinessMenu;
