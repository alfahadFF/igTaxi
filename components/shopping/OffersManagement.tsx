import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

interface OfferCategory {
  id?: number;
  name: string;
  name_ar?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface BusinessOffer {
  id?: number;
  category_id?: number;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  original_price?: number;
  sale_price: number;
  discount_percentage: number;
  image_urls?: string[];
  stock_quantity?: number;
  min_order_quantity: number;
  max_order_quantity?: number;
  is_available: boolean;
  is_featured: boolean;
  valid_from: string;
  valid_until?: string;
  brand?: string;
  model?: string;
  specifications?: any;
  warranty_info?: string;
  display_order: number;
}

export const OffersManagement: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<OfferCategory | null>(null);
  const [editingOffer, setEditingOffer] = useState<BusinessOffer | null>(null);
  const [activeTab, setActiveTab] = useState<'categories' | 'offers'>('categories');

  // نماذج الفئات
  const [categoryForm, setCategoryForm] = useState<OfferCategory>({
    name: '',
    name_ar: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  // نماذج العروض
  const [offerForm, setOfferForm] = useState<BusinessOffer>({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    sale_price: 0,
    discount_percentage: 0,
    min_order_quantity: 1,
    is_available: true,
    is_featured: false,
    valid_from: new Date().toISOString().split('T')[0],
    display_order: 0,
  });

  useEffect(() => {
    fetchCategories();
    fetchOffers();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('offer_categories')
        .select('*')
        .eq('business_id', user?.id)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('business_offers')
        .select('*')
        .eq('business_id', user?.id)
        .order('display_order');

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const saveCategoryAsync = async () => {
    try {
      const categoryData = {
        ...categoryForm,
        business_id: user?.id,
      };

      let result;
      if (editingCategory?.id) {
        result = await supabase
          .from('offer_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
      } else {
        result = await supabase
          .from('offer_categories')
          .insert([categoryData]);
      }

      if (result.error) throw result.error;

      Alert.alert('تم الحفظ', 'تم حفظ الفئة بنجاح');
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ الفئة');
    }
  };

  const saveOfferAsync = async () => {
    try {
      if (!offerForm.title || offerForm.sale_price <= 0) {
        Alert.alert('خطأ', 'يرجى ملء العنوان والسعر');
        return;
      }

      const offerData = {
        ...offerForm,
        business_id: user?.id,
        valid_from: new Date(offerForm.valid_from).toISOString(),
        valid_until: offerForm.valid_until ? new Date(offerForm.valid_until).toISOString() : null,
      };

      let result;
      if (editingOffer?.id) {
        result = await supabase
          .from('business_offers')
          .update(offerData)
          .eq('id', editingOffer.id);
      } else {
        result = await supabase
          .from('business_offers')
          .insert([offerData]);
      }

      if (result.error) throw result.error;

      Alert.alert('تم الحفظ', 'تم حفظ العرض بنجاح');
      setShowOfferModal(false);
      resetOfferForm();
      fetchOffers();
    } catch (error) {
      console.error('Error saving offer:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ العرض');
    }
  };

  const deleteCategory = async (categoryId: number) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الفئة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('offer_categories')
                .delete()
                .eq('id', categoryId);

              if (error) throw error;
              fetchCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف الفئة');
            }
          },
        },
      ]
    );
  };

  const deleteOffer = async (offerId: number) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا العرض؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('business_offers')
                .delete()
                .eq('id', offerId);

              if (error) throw error;
              fetchOffers();
            } catch (error) {
              console.error('Error deleting offer:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف العرض');
            }
          },
        },
      ]
    );
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      name_ar: '',
      description: '',
      display_order: categories.length,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const resetOfferForm = () => {
    setOfferForm({
      title: '',
      title_ar: '',
      description: '',
      description_ar: '',
      sale_price: 0,
      discount_percentage: 0,
      min_order_quantity: 1,
      is_available: true,
      is_featured: false,
      valid_from: new Date().toISOString().split('T')[0],
      display_order: offers.length,
    });
    setEditingOffer(null);
  };

  const editCategory = (category: OfferCategory) => {
    setEditingCategory(category);
    setCategoryForm(category);
    setShowCategoryModal(true);
  };

  const editOffer = (offer: BusinessOffer) => {
    setEditingOffer(offer);
    setOfferForm({
      ...offer,
      valid_from: offer.valid_from.split('T')[0],
      valid_until: offer.valid_until ? offer.valid_until.split('T')[0] : '',
    });
    setShowOfferModal(true);
  };

  const renderCategoryItem = ({ item }: { item: OfferCategory }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.name}</Text>
        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}
        <Text style={styles.itemStatus}>
          الحالة: {item.is_active ? 'نشط' : 'غير نشط'}
        </Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editCategory(item)}
        >
          <Text style={styles.editButtonText}>تعديل</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteCategory(item.id!)}
        >
          <Text style={styles.deleteButtonText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOfferItem = ({ item }: { item: BusinessOffer }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text style={styles.itemPrice}>
          السعر: {item.sale_price.toFixed(2)} ر.س
          {item.original_price && (
            <Text style={styles.originalPrice}> (كان: {item.original_price.toFixed(2)} ر.س)</Text>
          )}
        </Text>
        <Text style={styles.itemStatus}>
          الحالة: {item.is_available ? 'متاح' : 'غير متاح'}
          {item.is_featured && ' • مميز'}
        </Text>
        {item.stock_quantity !== undefined && item.stock_quantity !== null && (
          <Text style={styles.stockInfo}>المخزون: {item.stock_quantity}</Text>
        )}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => editOffer(item)}
        >
          <Text style={styles.editButtonText}>تعديل</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteOffer(item.id!)}
        >
          <Text style={styles.deleteButtonText}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowCategoryModal(false);
              resetCategoryForm();
            }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>اسم الفئة *</Text>
            <TextInput
              style={styles.input}
              value={categoryForm.name}
              onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
              placeholder="أدخل اسم الفئة"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الاسم بالعربية</Text>
            <TextInput
              style={styles.input}
              value={categoryForm.name_ar}
              onChangeText={(text) => setCategoryForm({ ...categoryForm, name_ar: text })}
              placeholder="أدخل الاسم بالعربية"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الوصف</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={categoryForm.description}
              onChangeText={(text) => setCategoryForm({ ...categoryForm, description: text })}
              placeholder="أدخل وصف الفئة"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>ترتيب العرض</Text>
            <TextInput
              style={styles.input}
              value={categoryForm.display_order.toString()}
              onChangeText={(text) => 
                setCategoryForm({ ...categoryForm, display_order: parseInt(text) || 0 })
              }
              placeholder="ترتيب العرض"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>فعال</Text>
              <Switch
                value={categoryForm.is_active}
                onValueChange={(value) => setCategoryForm({ ...categoryForm, is_active: value })}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveCategoryAsync}>
            <Text style={styles.saveButtonText}>
              {editingCategory ? 'حفظ التعديلات' : 'إضافة الفئة'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderOfferModal = () => (
    <Modal
      visible={showOfferModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingOffer ? 'تعديل العرض' : 'إضافة عرض جديد'}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setShowOfferModal(false);
              resetOfferForm();
            }}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>الفئة</Text>
            <View style={styles.pickerContainer}>
              {/* سيتم تطوير اختيار الفئة لاحقاً */}
              <Text style={styles.pickerPlaceholder}>اختر الفئة</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>عنوان العرض *</Text>
            <TextInput
              style={styles.input}
              value={offerForm.title}
              onChangeText={(text) => setOfferForm({ ...offerForm, title: text })}
              placeholder="أدخل عنوان العرض"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الوصف</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={offerForm.description}
              onChangeText={(text) => setOfferForm({ ...offerForm, description: text })}
              placeholder="أدخل وصف العرض"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>السعر الأصلي</Text>
              <TextInput
                style={styles.input}
                value={offerForm.original_price?.toString() || ''}
                onChangeText={(text) => 
                  setOfferForm({ ...offerForm, original_price: parseFloat(text) || undefined })
                }
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>سعر البيع *</Text>
              <TextInput
                style={styles.input}
                value={offerForm.sale_price.toString()}
                onChangeText={(text) => 
                  setOfferForm({ ...offerForm, sale_price: parseFloat(text) || 0 })
                }
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>نسبة الخصم (%)</Text>
            <TextInput
              style={styles.input}
              value={offerForm.discount_percentage.toString()}
              onChangeText={(text) => 
                setOfferForm({ ...offerForm, discount_percentage: parseInt(text) || 0 })
              }
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>الكمية المتوفرة</Text>
              <TextInput
                style={styles.input}
                value={offerForm.stock_quantity?.toString() || ''}
                onChangeText={(text) => 
                  setOfferForm({ ...offerForm, stock_quantity: parseInt(text) || undefined })
                }
                placeholder="غير محدود"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>الحد الأدنى للطلب</Text>
              <TextInput
                style={styles.input}
                value={offerForm.min_order_quantity.toString()}
                onChangeText={(text) => 
                  setOfferForm({ ...offerForm, min_order_quantity: parseInt(text) || 1 })
                }
                placeholder="1"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>صالح من</Text>
              <TextInput
                style={styles.input}
                value={offerForm.valid_from}
                onChangeText={(text) => setOfferForm({ ...offerForm, valid_from: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>صالح حتى</Text>
              <TextInput
                style={styles.input}
                value={offerForm.valid_until || ''}
                onChangeText={(text) => setOfferForm({ ...offerForm, valid_until: text || undefined })}
                placeholder="YYYY-MM-DD (اختياري)"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>العلامة التجارية</Text>
            <TextInput
              style={styles.input}
              value={offerForm.brand || ''}
              onChangeText={(text) => setOfferForm({ ...offerForm, brand: text })}
              placeholder="أدخل العلامة التجارية"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>الموديل</Text>
            <TextInput
              style={styles.input}
              value={offerForm.model || ''}
              onChangeText={(text) => setOfferForm({ ...offerForm, model: text })}
              placeholder="أدخل الموديل"
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>متاح</Text>
              <Switch
                value={offerForm.is_available}
                onValueChange={(value) => setOfferForm({ ...offerForm, is_available: value })}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>عرض مميز</Text>
              <Switch
                value={offerForm.is_featured}
                onValueChange={(value) => setOfferForm({ ...offerForm, is_featured: value })}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={saveOfferAsync}>
            <Text style={styles.saveButtonText}>
              {editingOffer ? 'حفظ التعديلات' : 'إضافة العرض'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إدارة العروض</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            if (activeTab === 'categories') {
              resetCategoryForm();
              setShowCategoryModal(true);
            } else {
              resetOfferForm();
              setShowOfferModal(true);
            }
          }}
        >
          <Text style={styles.addButtonText}>+ إضافة</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.activeTab]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.activeTabText]}>
            الفئات ({categories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            العروض ({offers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'categories' ? (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          style={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد فئات. أضف فئة جديدة للبدء.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOfferItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          style={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد عروض. أضف عرض جديد للبدء.</Text>
            </View>
          }
        />
      )}

      {renderCategoryModal()}
      {renderOfferModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
    padding: 10,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  itemStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  stockInfo: {
    fontSize: 12,
    color: '#FF9500',
  },
  itemActions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  editButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    marginBottom: 5,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OffersManagement;
