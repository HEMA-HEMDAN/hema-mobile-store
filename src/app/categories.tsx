import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { categoryRepository } from '../repositories/categoryRepository';
import { Category } from '../types';

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryRepository.getAllCategories();
      setCategories(cats);
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [loadCategories])
  );

  const handleSaveCategory = async () => {
    const trimmed = categoryNameInput.trim();
    if (!trimmed) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم الفئة');
      return;
    }

    try {
      if (editingCategory) {
        await categoryRepository.updateCategory(editingCategory.id, trimmed);
      } else {
        await categoryRepository.createCategory(trimmed);
      }

      setCategoryNameInput('');
      setEditingCategory(null);
      setIsAddModalVisible(false);
      await loadCategories();
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'حدث خطأ أثناء حفظ الفئة');
    }
  };

  const handleDeactivateCategory = async (cat: Category) => {
    try {
      const isReferenced = await categoryRepository.isCategoryReferencedByActiveProducts(cat.id);
      if (isReferenced) {
        Alert.alert(
          'لا يمكن إلغاء التفعيل',
          `توجد منتجات نشطة تابعة لفئة (${cat.name}). يرجى تغيير فئة تلك المنتجات أولاً.`
        );
        return;
      }

      Alert.alert(
        'تأكيد إلغاء التفعيل',
        `هل تريد إخفاء الفئة (${cat.name})؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إلغاء التفعيل',
            style: 'destructive',
            onPress: async () => {
              await categoryRepository.deactivateCategory(cat.id);
              await loadCategories();
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'تعذر إلغاء تفعيل الفئة');
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="إدارة الفئات" showBack showCategories={false} showSettings={false} />

      <View className="flex-1 px-4 pt-4">
        {categories.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="grid-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-sm font-semibold mt-3 text-center">
              لا توجد فئات مسجلة حالياً
            </Text>
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 flex-row justify-between items-center">
                <View className="flex-row items-center space-x-2 space-x-reverse">
                  <TouchableOpacity
                    onPress={() => {
                      setEditingCategory(item);
                      setCategoryNameInput(item.name);
                      setIsAddModalVisible(true);
                    }}
                    className="p-2 bg-slate-800 rounded-xl border border-slate-700"
                  >
                    <Ionicons name="create-outline" size={18} color="#38bdf8" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeactivateCategory(item)}
                    className="p-2 bg-slate-800 rounded-xl border border-slate-700"
                  >
                    <Ionicons name="trash-outline" size={18} color="#f87171" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center flex-1 justify-end ml-3">
                  <Text className="text-white text-base font-bold text-right mr-2">
                    {item.name}
                  </Text>
                  <View className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating Add Category Button */}
      <TouchableOpacity
        onPress={() => {
          setEditingCategory(null);
          setCategoryNameInput('');
          setIsAddModalVisible(true);
        }}
        className="absolute bottom-4 right-4 bg-sky-600 active:bg-sky-500 rounded-full px-5 py-3.5 flex-row items-center shadow-xl shadow-sky-600/40"
      >
        <Ionicons name="add-circle" size={22} color="#ffffff" />
        <Text className="text-white text-sm font-extrabold mr-2">إضافة فئة جديدة</Text>
      </TouchableOpacity>

      {/* Add / Edit Category Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
          <View className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl">
            <Text className="text-white text-lg font-bold text-right mb-4">
              {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
            </Text>

            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              اسم الفئة *
            </Text>
            <TextInput
              value={categoryNameInput}
              onChangeText={setCategoryNameInput}
              placeholder="مثال: مشروبات"
              placeholderTextColor="#64748b"
              autoFocus
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm mb-5"
            />

            <View className="flex-row space-x-2 space-x-reverse justify-end">
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                className="px-4 py-2.5 bg-slate-800 rounded-xl"
              >
                <Text className="text-slate-300 text-xs font-bold">إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveCategory}
                className="px-5 py-2.5 bg-sky-600 rounded-xl"
              >
                <Text className="text-white text-xs font-bold">حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
