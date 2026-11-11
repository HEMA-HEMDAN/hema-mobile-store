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
import { stockRepository } from '../../repositories/stockRepository';
import { Product, StockMovementType } from '../../types';

type MovementOption = {
  type: StockMovementType;
  label: string;
  description: string;
  activeClass: string;
  activeTextClass: string;
  iconName: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  quantitySign: 1 | -1;
};

const MOVEMENT_OPTIONS: MovementOption[] = [
  {
    type: 'RESTOCK',
    label: 'إضافة تزويد (+)',
    description: 'شحنة وافدة أو مخزون جديد',
    activeClass: 'bg-emerald-600 border-emerald-500',
    activeTextClass: 'text-white',
    iconName: 'add-circle-outline',
    quantitySign: 1,
  },
  {
    type: 'ADJUSTMENT',
    label: 'تعديل يدوي',
    description: 'تصحيح كمية المخزون',
    activeClass: 'bg-amber-600 border-amber-500',
    activeTextClass: 'text-white',
    iconName: 'create-outline',
    quantitySign: -1,
  },
  {
    type: 'DAMAGED',
    label: 'بضاعة تالفة 🔴',
    description: 'خصم كمية تالفة / مكسورة',
    activeClass: 'bg-rose-700 border-rose-500',
    activeTextClass: 'text-white',
    iconName: 'alert-circle-outline',
    quantitySign: -1,
  },
];

export default function AdjustStockScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [movementType, setMovementType] = useState<StockMovementType>('RESTOCK');
  const [quantityInput, setQuantityInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    productRepository.getAllProducts({ activeOnly: true }).then((allProducts) => {
      const prods = allProducts.filter((product) => product.product_type !== 'SERVICE');
      setProducts(prods);
      if (productId) {
        const pId = parseInt(productId, 10);
        const found = prods.find((p) => p.id === pId);
        if (found) setSelectedProduct(found);
      } else if (prods.length > 0) {
        setSelectedProduct(prods[0]);
      }
    });
  }, [productId]);

  const selectedOption = MOVEMENT_OPTIONS.find((o) => o.type === movementType)!;

  const handleSubmitStockChange = async () => {
    if (!selectedProduct) {
      Alert.alert('تنبيه', 'يرجى اختيار المنتج أولاً');
      return;
    }

    const qty = parseFloat(quantityInput.trim());
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال كمية صالحة أكبر من الصفر');
      return;
    }

    // For DAMAGED items: confirm before proceeding
    if (movementType === 'DAMAGED') {
      Alert.alert(
        '⚠️ تأكيد تسجيل بضاعة تالفة',
        `سيتم خصم ${qty} ${selectedProduct.unit} من مخزون "${selectedProduct.name}" وتسجيلها كخسارة. هل أنت متأكد؟`,
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'تأكيد', style: 'destructive', onPress: () => submitChange(qty) },
        ]
      );
      return;
    }

    await submitChange(qty);
  };

  const submitChange = async (qty: number) => {
    const actualChange = selectedOption.quantitySign * qty;
    const defaultNote =
      movementType === 'RESTOCK'
        ? 'تزويد شحنة جديدة'
        : movementType === 'DAMAGED'
        ? 'بضاعة تالفة / مكسورة'
        : 'تعديل يدوي للمخزون';
    const note = noteInput.trim() || defaultNote;

    try {
      setIsSubmitting(true);
      await stockRepository.updateStockAndRecordMovement(
        selectedProduct!.id,
        movementType,
        actualChange,
        note
      );

      const successMsg =
        movementType === 'DAMAGED'
          ? 'تم تسجيل البضاعة التالفة وخصمها من المخزون'
          : 'تم تسجيل حركة المخزون وتحديث الكمية المتاحة بنجاح';

      Alert.alert('نجاح', successMsg, [
        { text: 'حسناً', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'حدث خطأ أثناء تحديث المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="إضافة / تعديل كمية المخزون" showBack showSettings={false} showReports={false} />

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* Product Selector */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 space-y-4">
          <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
            اختر المنتج للمتابعة *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 space-x-reverse">
            {products.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedProduct(p)}
                className={`px-4 py-2.5 rounded-xl border ${
                  selectedProduct?.id === p.id
                    ? 'bg-sky-600 border-sky-500'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedProduct?.id === p.id ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {p.name} ({p.stock_quantity})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedProduct && (
            <View className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mt-2 flex-row justify-between items-center">
              <Badge
                stockQuantity={selectedProduct.stock_quantity}
                lowStockThreshold={selectedProduct.low_stock_threshold}
                unit={selectedProduct.unit}
              />

              <View className="items-end">
                <Text className="text-white text-base font-bold text-right">
                  {selectedProduct.name}
                </Text>
                <Text className="text-slate-400 text-xs text-right mt-0.5">
                  الوحدة: {selectedProduct.unit}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Type Selector */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 space-y-4">
          <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            تفاصيل حركة المخزون
          </Text>

          {/* Movement type buttons */}
          <View className="space-y-2">
            {MOVEMENT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                onPress={() => setMovementType(option.type)}
                className={`py-3 px-4 rounded-2xl border flex-row items-center justify-between ${
                  movementType === option.type
                    ? option.activeClass
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <Ionicons
                  name={option.iconName}
                  size={18}
                  color={movementType === option.type ? '#fff' : '#64748b'}
                />
                <View className="items-end flex-1 mr-2">
                  <Text
                    className={`text-sm font-bold ${
                      movementType === option.type ? option.activeTextClass : 'text-slate-400'
                    }`}
                  >
                    {option.label}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      movementType === option.type ? 'text-white/80' : 'text-slate-500'
                    }`}
                  >
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Warning banner for DAMAGED */}
          {movementType === 'DAMAGED' && (
            <View className="bg-rose-950/60 border border-rose-800/60 rounded-2xl p-3">
              <Text className="text-rose-300 text-xs font-semibold text-right">
                ⚠️ سيتم خصم الكمية من المخزون وتسجيلها كـ خسارة بضاعة تالفة في تقارير الربح
              </Text>
            </View>
          )}

          {/* Quantity Input */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              الكمية ({selectedProduct?.unit || 'قطعة'}) *
            </Text>
            <TextInput
              value={quantityInput}
              onChangeText={setQuantityInput}
              keyboardType="numeric"
              placeholder="مثال: 10"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-bold text-base"
            />
          </View>

          {/* Note Input */}
          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              {movementType === 'DAMAGED'
                ? 'سبب التلف (كسر / انتهاء صلاحية / ...)'
                : 'ملاحظة الحركة (سبب التعديل / رقم البضاعة)'}
            </Text>
            <TextInput
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder={
                movementType === 'DAMAGED'
                  ? 'مثال: بضاعة مكسورة / منتهية الصلاحية'
                  : 'مثال: شحنة جديدة من المورد'
              }
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmitStockChange}
            disabled={isSubmitting}
            className={`py-3.5 rounded-2xl items-center flex-row justify-center mt-3 shadow-lg ${
              movementType === 'DAMAGED'
                ? 'bg-rose-700 active:bg-rose-600 shadow-rose-700/30'
                : 'bg-sky-600 active:bg-sky-500 shadow-sky-600/30'
            }`}
          >
            <Ionicons
              name={movementType === 'DAMAGED' ? 'alert-circle' : 'checkmark-done-circle'}
              size={22}
              color="#ffffff"
            />
            <Text className="text-white text-base font-extrabold mr-2">
              {isSubmitting
                ? 'جاري التحديث...'
                : movementType === 'DAMAGED'
                ? 'تسجيل البضاعة التالفة'
                : 'تسجيل التغيير بالمخزون'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
