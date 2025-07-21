import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../hooks/useAuth';

interface MenuCategory {
  id?: number;
  name: string;
  name_ar: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface MenuItem {
  id?: number;
  category_id?: number;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  image_url?: string;
  preparation_time: number;
  is_available: boolean;
  is_popular: boolean;
  ingredients: string[];
  allergens: string[];
  display_order: number;
}

export const MenuManagement: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // نماذج البيانات
  const [newCategory, setNewCategory] = useState<MenuCategory>({
    name: '',
    name_ar: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  const [newItem, setNewItem] = useState<MenuItem>({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    price: 0,
    preparation_time: 15,
    is_available: true,
    is_popular: false,
    ingredients: [],
    allergens: [],
    display_order: 0,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryItems(selectedCategory);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('business_id', user?.id)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
      
      if (data && data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل الفئات');
    }
  };

  const fetchCategoryItems = async (categoryId: number) => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      Alert.alert('خطأ', 'حدث خطأ في تحميل العناصر');
    }
  };

  const saveCategory = async () => {
    try {
      const categoryData = {
        ...newCategory,
        business_id: user?.id,
      };

      if (editingCategory?.id) {
        // تحديث فئة موجودة
        const { error } = await supabase
          .from('menu_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        // إضافة فئة جديدة
        const { error } = await supabase
          .from('menu_categories')
          .insert([categoryData]);

        if (error) throw error;
      }

      resetCategoryForm();
      fetchCategories();
      Alert.alert('نجح', 'تم حفظ الفئة بنجاح');
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ الفئة');
    }
  };

  const saveItem = async () => {
    try {
      const itemData = {
        ...newItem,
        category_id: selectedCategory,
        business_id: user?.id,
      };

      if (editingItem?.id) {
        // تحديث عنصر موجود
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        // إضافة عنصر جديد
        const { error } = await supabase
          .from('menu_items')
          .insert([itemData]);

        if (error) throw error;
      }

      resetItemForm();
      if (selectedCategory) {
        fetchCategoryItems(selectedCategory);
      }
      Alert.alert('نجح', 'تم حفظ العنصر بنجاح');
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('خطأ', 'حدث خطأ في حفظ العنصر');
    }
  };

  const deleteCategory = async (categoryId: number) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع العناصر المرتبطة بها.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('menu_categories')
                .delete()
                .eq('id', categoryId);

              if (error) throw error;
              fetchCategories();
              Alert.alert('نجح', 'تم حذف الفئة بنجاح');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف الفئة');
            }
          },
        },
      ]
    );
  };

  const deleteItem = async (itemId: number) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا العنصر؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('menu_items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;
              if (selectedCategory) {
                fetchCategoryItems(selectedCategory);
              }
              Alert.alert('نجح', 'تم حذف العنصر بنجاح');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('خطأ', 'حدث خطأ في حذف العنصر');
            }
          },
        },
      ]
    );
  };

  const resetCategoryForm = () => {
    setNewCategory({
      name: '',
      name_ar: '',
      description: '',
      display_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
    setShowAddCategory(false);
  };

  const resetItemForm = () => {
    setNewItem({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      price: 0,
      preparation_time: 15,
      is_available: true,
      is_popular: false,
      ingredients: [],
      allergens: [],
      display_order: 0,
    });
    setEditingItem(null);
    setShowAddItem(false);
  };

  const editCategory = (category: MenuCategory) => {
    setNewCategory(category);
    setEditingCategory(category);
    setShowAddCategory(true);
  };

  const editItem = (item: MenuItem) => {
    setNewItem(item);
    setEditingItem(item);
    setShowAddItem(true);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>إدارة القائمة</Text>
      </View>

      {/* إدارة الفئات */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>الفئات</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddCategory(true)}
          >
            <Text style={styles.addButtonText}>+ إضافة فئة</Text>
          </TouchableOpacity>
        </View>

        {categories.map((category) => (
          <View key={category.id} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>
                {category.name_ar || category.name}
              </Text>
              <Text style={styles.categoryStatus}>
                {category.is_active ? 'نشط' : 'غير نشط'}
              </Text>
            </View>
            <View style={styles.categoryActions}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => editCategory(category)}
              >
                <Text style={styles.actionButtonText}>تعديل</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => category.id && deleteCategory(category.id)}
              >
                <Text style={styles.actionButtonText}>حذف</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setSelectedCategory(category.id || null)}
              >
                <Text style={styles.actionButtonText}>اختيار</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* إدارة العناصر */}
      {selectedCategory && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>عناصر القائمة</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddItem(true)}
            >
              <Text style={styles.addButtonText}>+ إضافة عنصر</Text>
            </TouchableOpacity>
          </View>

          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.name_ar || item.name}
                </Text>
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {item.description_ar || item.description}
                </Text>
                <Text style={styles.itemPrice}>{item.price} ر.س</Text>
                <Text style={styles.itemStatus}>
                  {item.is_available ? 'متوفر' : 'غير متوفر'}
                  {item.is_popular ? ' • شائع' : ''}
                </Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => editItem(item)}
                >
                  <Text style={styles.actionButtonText}>تعديل</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => item.id && deleteItem(item.id)}
                >
                  <Text style={styles.actionButtonText}>حذف</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* نموذج إضافة/تعديل فئة */}
      {showAddCategory && (
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>
            {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="اسم الفئة (بالإنجليزية)"
            value={newCategory.name}
            onChangeText={(text) => setNewCategory({ ...newCategory, name: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="اسم الفئة (بالعربية)"
            value={newCategory.name_ar}
            onChangeText={(text) => setNewCategory({ ...newCategory, name_ar: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="الوصف (اختياري)"
            value={newCategory.description}
            onChangeText={(text) => setNewCategory({ ...newCategory, description: text })}
            multiline
          />
          
          <View style={styles.switchRow}>
            <Text>نشط</Text>
            <Switch
              value={newCategory.is_active}
              onValueChange={(value) => setNewCategory({ ...newCategory, is_active: value })}
            />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.saveButton} onPress={saveCategory}>
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={resetCategoryForm}>
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* نموذج إضافة/تعديل عنصر */}
      {showAddItem && (
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>
            {editingItem ? 'تعديل العنصر' : 'إضافة عنصر جديد'}
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="اسم العنصر (بالإنجليزية)"
            value={newItem.name}
            onChangeText={(text) => setNewItem({ ...newItem, name: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="اسم العنصر (بالعربية)"
            value={newItem.name_ar}
            onChangeText={(text) => setNewItem({ ...newItem, name_ar: text })}
          />
          
          <TextInput
            style={styles.input}
            placeholder="الوصف (بالإنجليزية)"
            value={newItem.description}
            onChangeText={(text) => setNewItem({ ...newItem, description: text })}
            multiline
          />
          
          <TextInput
            style={styles.input}
            placeholder="الوصف (بالعربية)"
            value={newItem.description_ar}
            onChangeText={(text) => setNewItem({ ...newItem, description_ar: text })}
            multiline
          />
          
          <TextInput
            style={styles.input}
            placeholder="السعر"
            value={newItem.price.toString()}
            onChangeText={(text) => setNewItem({ ...newItem, price: parseFloat(text) || 0 })}
            keyboardType="numeric"
          />
          
          <TextInput
            style={styles.input}
            placeholder="وقت التحضير (بالدقائق)"
            value={newItem.preparation_time.toString()}
            onChangeText={(text) => setNewItem({ ...newItem, preparation_time: parseInt(text) || 15 })}
            keyboardType="numeric"
          />
          
          <View style={styles.switchRow}>
            <Text>متوفر</Text>
            <Switch
              value={newItem.is_available}
              onValueChange={(value) => setNewItem({ ...newItem, is_available: value })}
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text>شائع</Text>
            <Switch
              value={newItem.is_popular}
              onValueChange={(value) => setNewItem({ ...newItem, is_popular: value })}
            />
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.saveButton} onPress={saveItem}>
              <Text style={styles.saveButtonText}>حفظ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={resetItemForm}>
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
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
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryStatus: {
    fontSize: 14,
    color: '#666',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  selectButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  itemStatus: {
    fontSize: 12,
    color: '#999',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  formSection: {
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MenuManagement;
