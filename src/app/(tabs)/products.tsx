import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ProductCard } from '../../components/ProductCard';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { Product, Category } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';

export default function ProductsScreen() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const cats = await categoryRepository.getAllCategories();
      setCategories(cats);

      const prods = await productRepository.getAllProducts({
        activeOnly: true,
        categoryId: selectedCategoryId,
        searchQuery,
      });
      setProducts(prods);
    } catch (e) {
      console.error('Error loading products list:', e);
    }
  }, [selectedCategoryId, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="إدارة المنتجات" showCategories showSettings={false} />

      {/* Top Search & Filter Bar */}
      <View className="px-4 pt-3 pb-3 bg-slate-900 border-b border-slate-800">
        <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2">
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث باسم المنتج أو الباركود أو الكود..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white text-right font-semibold mr-2 text-sm"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3 flex-row space-x-2 space-x-reverse"
        >
          <TouchableOpacity
            onPress={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 rounded-xl border ${
              selectedCategoryId === null
                ? 'bg-sky-600 border-sky-500'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedCategoryId === null ? 'text-white' : 'text-slate-300'
              }`}
            >
              الكل ({products.length})
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl border ${
                selectedCategoryId === cat.id
                  ? 'bg-sky-600 border-sky-500'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedCategoryId === cat.id ? 'text-white' : 'text-slate-300'
                }`}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      <View className="flex-1 px-4 pt-3">
        {products.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="cube-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-sm font-semibold mt-3 text-center">
              لا توجد منتجات مسجلة مطابقة
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/product/add')}
              className="mt-4 bg-sky-600 px-5 py-2.5 rounded-xl flex-row items-center"
            >
              <Ionicons name="add" size={20} color="#ffffff" />
              <Text className="text-white text-xs font-bold mr-1.5">إضافة أول منتج</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() =>
                  router.push({ pathname: '/product/[id]', params: { id: item.id } })
                }
                onActionPress={() =>
                  router.push({ pathname: '/product/[id]', params: { id: item.id } })
                }
                actionIcon="create-outline"
                actionLabel="تعديل التفاصيل"
                actionVariant="secondary"
                currencySymbol={settings.currency}
              />
            )}
            contentContainerStyle={{ paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating Add Product Button */}
      <TouchableOpacity
        onPress={() => router.push('/product/add')}
        className="absolute bottom-4 right-4 bg-sky-600 active:bg-sky-500 rounded-full px-5 py-3.5 flex-row items-center shadow-xl shadow-sky-600/40"
      >
        <Ionicons name="add-circle" size={22} color="#ffffff" />
        <Text className="text-white text-sm font-extrabold mr-2">إضافة منتج جديد</Text>
      </TouchableOpacity>
    </View>
  );
}
