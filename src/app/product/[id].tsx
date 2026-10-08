import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { Product, Category } from '../../types';
import {
  egpToPiastres,
  piastresToEgpString,
  formatCurrency,
} from '../../utils/currency';
import { useSettingsStore } from '../../stores/settingsStore';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettingsStore((state) => state.settings);

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [purchasePriceInput, setPurchasePriceInput] = useState('');
  const [sellingPriceInput, setSellingPriceInput] = useState('');
  const [lowStockThresholdInput, setLowStockThresholdInput] = useState('');
  const [unit, setUnit] = useState('قطعة');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const prodId = parseInt(id, 10);
      categoryRepository.getAllCategories().then(setCategories);
      productRepository.getProductById(prodId).then((prod) => {
        if (prod) {
          setProduct(prod);
          setName(prod.name);
          setSelectedCategoryId(prod.category_id);
          setSku(prod.sku || '');
          setBarcode(prod.barcode || '');
          setPurchasePriceInput(piastresToEgpString(prod.purchase_price));
          setSellingPriceInput(piastresToEgpString(prod.selling_price));
          setLowStockThresholdInput(prod.low_stock_threshold.toString());
          setUnit(prod.unit);
        }
      });
    }
  }, [id]);

  const handleUpdateProduct = async () => {
    if (!product) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم المنتج');
      return;
    }

    try {
      setIsSaving(true);
      const sellingPiastres = egpToPiastres(sellingPriceInput);
      const purchasePiastres = egpToPiastres(purchasePriceInput);
      const lowThreshold = parseFloat(lowStockThresholdInput.trim()) || 0;

      await productRepository.updateProduct(product.id, {
        category_id: selectedCategoryId,
        name: trimmedName,
        sku: sku.trim() || null,
        barcode: barcode.trim() || null,
        purchase_price: purchasePiastres,
        selling_price: sellingPiastres,
        low_stock_threshold: lowThreshold,
        unit: unit.trim() || 'قطعة',
      });

      Alert.alert('نجاح', 'تم تحديث بيانات المنتج بنجاح', [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!product) return;
    Alert.alert(
      'تأكيد إلغاء التفعيل',
      `هل تريد إلغاء تفعيل المنتج (${product.name})؟ سيتم إخفاؤه من السلسلة دون حذف الفواتير القديمة المرتبطة به.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إلغاء التفعيل',
          style: 'destructive',
          onPress: async () => {
            await productRepository.deactivateProduct(product.id);
            router.back();
          },
        },
      ]
    );
  };

  if (!product) {
    return (
      <View className="flex-1 bg-slate-950">
        <Header title="تفاصيل المنتج" showBack showSettings={false} showReports={false} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 text-sm font-semibold">جاري تحميل البيانات...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <Header title={`تعديل: ${product.name}`} showBack showSettings={false} showReports={false} />

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Stock Badge Bar */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-4 mb-4 flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/inventory/adjust',
                params: { productId: product.id },
              })
            }
            className="bg-sky-600/20 border border-sky-500/40 px-3.5 py-2 rounded-xl flex-row items-center"
          >
            <Ionicons name="swap-vertical" size={16} color="#38bdf8" />
            <Text className="text-sky-400 text-xs font-bold mr-1.5">تعديل المخزون</Text>
          </TouchableOpacity>

          <Badge
            stockQuantity={product.stock_quantity}
            lowStockThreshold={product.low_stock_threshold}
            unit={product.unit}
          />
        </View>

        {/* Product Form Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-sm space-y-4">
          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              اسم المنتج *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          {/* Category Picker */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              الفئة
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 space-x-reverse">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2 rounded-xl border ${
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

          {/* Price inputs */}
          <View className="flex-row space-x-3 space-x-reverse">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                سعر البيع ({settings.currency})
              </Text>
              <TextInput
                value={sellingPriceInput}
                onChangeText={setSellingPriceInput}
                keyboardType="numeric"
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
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>
          </View>

          <View className="flex-row space-x-3 space-x-reverse">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                الوحدة
              </Text>
              <TextInput
                value={unit}
                onChangeText={setUnit}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>

            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                حد المنخفض للتنبيه
              </Text>
              <TextInput
                value={lowStockThresholdInput}
                onChangeText={setLowStockThresholdInput}
                keyboardType="numeric"
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>
          </View>

          <View className="flex-row space-x-3 space-x-reverse">
            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                الباركود
              </Text>
              <TextInput
                value={barcode}
                onChangeText={setBarcode}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>

            <View className="flex-1">
              <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
                كود SKU
              </Text>
              <TextInput
                value={sku}
                onChangeText={setSku}
                className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={handleUpdateProduct}
            disabled={isSaving}
            className="bg-sky-600 active:bg-sky-500 py-3.5 rounded-2xl items-center flex-row justify-center mt-4 shadow-lg shadow-sky-600/30"
          >
            <Ionicons name="save-outline" size={20} color="#ffffff" />
            <Text className="text-white text-base font-extrabold mr-2">
              {isSaving ? 'جاري الحفظ...' : 'تحديث البيانات'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeactivate}
            className="bg-rose-950/60 border border-rose-800/60 py-3 rounded-2xl items-center flex-row justify-center mt-2"
          >
            <Ionicons name="eye-off-outline" size={18} color="#f87171" />
            <Text className="text-rose-400 text-xs font-bold mr-1.5">
              إلغاء تفعيل المنتج (إخفاء)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
