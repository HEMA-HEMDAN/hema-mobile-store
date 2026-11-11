import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { Category, ProductType } from '../../types';
import { egpToPiastres } from '../../utils/currency';
import { useSettingsStore } from '../../stores/settingsStore';

export default function AddProductScreen() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [productType, setProductType] = useState<ProductType>('PRODUCT');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [stockQuantityInput, setStockQuantityInput] = useState('0');
  const [lowStockThresholdInput, setLowStockThresholdInput] = useState(
    settings.low_stock_threshold_default.toString()
  );
  const [unit, setUnit] = useState('قطعة');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    categoryRepository.getAllCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    });
  }, []);

  const handleCreateProduct = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المنتج');
      return;
    }

    const sellingPiastres = egpToPiastres(sellingPriceInput);
    if (sellingPiastres < 0) {
      Alert.alert('تنبيه', 'سعر البيع يجب أن يكون موجباً');
      return;
    }

    const purchasePiastres = egpToPiastres(purchasePriceInput);
    const stockQty = parseFloat(stockQuantityInput.trim()) || 0;
    const parsedLow = parseFloat(lowStockThresholdInput.trim());
    const lowThreshold = isNaN(parsedLow) ? settings.low_stock_threshold_default : parsedLow;

    try {
      setIsSubmitting(true);
      await productRepository.createProduct({
        category_id: selectedCategoryId,
        product_type: productType,
        name: trimmedName,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        purchase_price: purchasePiastres,
        selling_price: sellingPiastres,
        stock_quantity: productType === 'SERVICE' ? 0 : stockQty,
        low_stock_threshold: productType === 'SERVICE' ? 0 : lowThreshold,
        unit: unit.trim() || (productType === 'SERVICE' ? 'خدمة' : 'قطعة'),
        active: 1,
      });

      Alert.alert('نجاح', 'تم إضافة المنتج بنجاح', [
        {
          text: 'حسناً',
          onPress: () => router.back(),
        },
      ]);
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'حدث خطأ أثناء إضافة المنتج');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="إضافة منتج جديد" showBack showSettings={false} showReports={false} />

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-8 shadow-sm space-y-4">
          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              اسم المنتج *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="مثال: أرز مصري ممتاز 1 كجم"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              نوع العنصر
            </Text>
            <View className="flex-row space-x-2 space-x-reverse">
              {([
                ['PRODUCT', 'منتج بمخزون'],
                ['SERVICE', 'خدمة بدون مخزون'],
              ] as const).map(([type, label]) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setProductType(type);
                    if (type === 'SERVICE') {
                      setUnit('خدمة');
                    } else if (type === 'PRODUCT' && unit === 'خدمة') {
                      setUnit('قطعة');
                    }
                  }}
                  className={`flex-1 py-2.5 rounded-xl border items-center ${
                    productType === type
                      ? 'bg-sky-600 border-sky-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      productType === type ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {productType === 'SERVICE' && (
              <Text className="text-violet-300 text-xs text-right mt-2">
                الخدمات مثل الصيانة لا تخصم كمية من المخزون عند البيع.
              </Text>
            )}
          </View>

          {/* Category Selector */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              الفئة
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 space-x-reverse">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2.5 rounded-xl border ${
                    selectedCategoryId === cat.id
                      ? 'bg-sky-600 border-sky-500'
                      : 'bg-slate-950 border-slate-800'
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

          {/* Price inputs side by side */}
          <View className="flex-row space-x-3 space-x-reverse">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                سعر البيع ({settings.currency}) *
              </Text>
              <TextInput
                value={sellingPriceInput}
                onChangeText={setSellingPriceInput}
                keyboardType="numeric"
                placeholder="15.75"
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-bold text-sm"
              />
            </View>

            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                سعر الشراء ({settings.currency})
              </Text>
              <TextInput
                value={purchasePriceInput}
                onChangeText={setPurchasePriceInput}
                keyboardType="numeric"
                placeholder="12.00"
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>
          </View>

          {productType === 'PRODUCT' && (
            <>
              <View className="flex-row space-x-3 space-x-reverse">
                <View className="flex-1">
                  <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                    الوحدة
                  </Text>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="قطعة / كجم / لتر"
                    placeholderTextColor="#64748b"
                    className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                    الكمية الأولية بالمخزون
                  </Text>
                  <TextInput
                    value={stockQuantityInput}
                    onChangeText={setStockQuantityInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-bold text-sm"
                  />
                </View>
              </View>

              <View>
                <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                  حد المخزون المنخفض للتنبيه
                </Text>
                <TextInput
                  value={lowStockThresholdInput}
                  onChangeText={setLowStockThresholdInput}
                  keyboardType="numeric"
                  placeholder="5"
                  placeholderTextColor="#64748b"
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
                />
              </View>
            </>
          )}

          {/* SKU & Barcode optional inputs */}
          <View className="flex-row space-x-3 space-x-reverse">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                الباركود (اختياري)
              </Text>
              <TextInput
                value={barcode}
                onChangeText={setBarcode}
                placeholder="622100..."
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>

            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                كود المنتج SKU (اختياري)
              </Text>
              <TextInput
                value={sku}
                onChangeText={setSku}
                placeholder="RICE-01"
                placeholderTextColor="#64748b"
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleCreateProduct}
            disabled={isSubmitting}
            className="bg-sky-600 active:bg-sky-500 py-3.5 rounded-2xl items-center flex-row justify-center mt-4 shadow-lg shadow-sky-600/30"
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
            <Text className="text-white text-base font-extrabold mr-2">
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ المنتج'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
