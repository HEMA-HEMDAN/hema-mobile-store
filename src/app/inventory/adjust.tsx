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
    productRepository.getAllProducts({ activeOnly: true }).then((prods) => {
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

    // Determine direction (+ for RESTOCK, +/- for ADJUSTMENT)
    const quantityChange = movementType === 'RESTOCK' ? qty : qty; // User will choose type or direction
    const note = noteInput.trim() || (movementType === 'RESTOCK' ? 'تزويد شحنة جديدة' : 'تعديل مخزون');

    try {
      setIsSubmitting(true);
      const actualChange = movementType === 'RESTOCK' ? qty : (movementType === 'SALE' ? -qty : qty);
      await stockRepository.updateStockAndRecordMovement(
        selectedProduct.id,
        movementType,
        actualChange,
        note
      );

      Alert.alert('نجاح', 'تم تسجيل حركة المخزون وتحديث الكمية المتاحة بنجاح', [
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

        {/* Action Type Toggle */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 space-y-4">
          <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            تفاصيل حركة المخزون
          </Text>

          <View className="flex-row space-x-2 space-x-reverse">
            <TouchableOpacity
              onPress={() => setMovementType('RESTOCK')}
              className={`flex-1 py-3 rounded-2xl border items-center ${
                movementType === 'RESTOCK'
                  ? 'bg-emerald-600 border-emerald-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  movementType === 'RESTOCK' ? 'text-white' : 'text-slate-400'
                }`}
              >
                إضافة تزويد مخزون (+)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMovementType('ADJUSTMENT')}
              className={`flex-1 py-3 rounded-2xl border items-center ${
                movementType === 'ADJUSTMENT'
                  ? 'bg-amber-600 border-amber-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  movementType === 'ADJUSTMENT' ? 'text-white' : 'text-slate-400'
                }`}
              >
                تعديل يدوي للمخزون
              </Text>
            </TouchableOpacity>
          </View>

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

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              ملاحظة الحركة (سبب التعديل / رقم البضاعة)
            </Text>
            <TextInput
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="مثال: شحنة جديدة من المورد"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmitStockChange}
            disabled={isSubmitting}
            className="bg-sky-600 active:bg-sky-500 py-3.5 rounded-2xl items-center flex-row justify-center mt-3 shadow-lg shadow-sky-600/30"
          >
            <Ionicons name="checkmark-done-circle" size={22} color="#ffffff" />
            <Text className="text-white text-base font-extrabold mr-2">
              {isSubmitting ? 'جاري التحديث...' : 'تسجيل التغيير بالمخزون'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
