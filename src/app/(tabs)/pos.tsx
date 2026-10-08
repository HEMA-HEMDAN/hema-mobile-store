import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ProductCard } from '../../components/ProductCard';
import { ReceiptView } from '../../components/ReceiptView';
import { productRepository } from '../../repositories/productRepository';
import { categoryRepository } from '../../repositories/categoryRepository';
import { billRepository } from '../../repositories/billRepository';
import { useCartStore } from '../../stores/cartStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { Product, Category, Bill, BillItem } from '../../types';
import {
  formatCurrency,
  egpToPiastres,
  piastresToEgpString,
} from '../../utils/currency';

export default function PosScreen() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);

  const {
    items: cartItems,
    discount,
    addItem,
    removeItem,
    updateQuantity,
    setDiscount,
    clearCart,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart Modal & Checkout state
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [isSavingBill, setIsSavingBill] = useState(false);

  // Saved Bill Receipt Modal state
  const [savedBillData, setSavedBillData] = useState<{
    bill: Bill;
    items: BillItem[];
  } | null>(null);

  const loadProductsAndCategories = useCallback(async () => {
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
      console.error('Error loading POS products:', e);
    }
  }, [selectedCategoryId, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadProductsAndCategories();
    }, [loadProductsAndCategories])
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // If text matches exact barcode, auto-add to cart!
    if (text.trim().length > 3) {
      productRepository.getProductByBarcode(text.trim()).then((found) => {
        if (found) {
          handleAddToCart(found);
          setSearchQuery('');
        }
      });
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity <= 0 && !settings.allow_negative_stock) {
      Alert.alert('تنبيه المخزون', 'المنتج نافد من المخزون، لا يمكن إضافته للسلة');
      return;
    }

    const currentInCart = cartItems.find((i) => i.product.id === product.id)?.quantity || 0;
    if (
      !settings.allow_negative_stock &&
      currentInCart + 1 > product.stock_quantity
    ) {
      Alert.alert('تنبيه المخزون', 'لا يمكن بيع كمية أكبر من المخزون المتاح');
      return;
    }

    addItem(product, 1);
  };

  const handleApplyDiscount = (text: string) => {
    setDiscountInput(text);
    const piastres = egpToPiastres(text);
    setDiscount(piastres);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('خطأ', 'السلة فارغة، أضف منتجات للبيع أولاً');
      return;
    }

    try {
      setIsSavingBill(true);
      const bill = await billRepository.saveBillTransaction(
        cartItems,
        discount,
        settings.allow_negative_stock
      );

      const fullBill = await billRepository.getBillById(bill.id);
      if (fullBill) {
        setSavedBillData(fullBill);
      }

      clearCart();
      setDiscountInput('');
      setIsCartModalVisible(false);
      await loadProductsAndCategories();
    } catch (err: any) {
      Alert.alert('خطأ في العملية', err.message || 'حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setIsSavingBill(false);
    }
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="نقطة البيع (POS)" showSettings={false} showReports={false} />

      {/* Top Search & Filter Bar */}
      <View className="px-4 pt-3 pb-2 bg-slate-900 border-b border-slate-800">
        <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2">
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="ابحث باسم المنتج أو الباركود..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white text-right font-semibold mr-2 text-sm"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Horizontal Pills */}
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
              الكل
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

      {/* Main Products Grid */}
      <View className="flex-1 px-4 pt-3">
        {products.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <Ionicons name="bag-remove-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-sm font-semibold mt-3 text-center">
              لا توجد منتجات مطابقة للبحث
            </Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                onPress={() => handleAddToCart(item)}
                onActionPress={() => handleAddToCart(item)}
                actionIcon="cart-outline"
                actionLabel="إضافة للسلة"
                actionVariant={item.stock_quantity > 0 ? 'primary' : 'secondary'}
                currencySymbol={settings.currency}
              />
            )}
            contentContainerStyle={{ paddingBottom: 90 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <View className="absolute bottom-3 left-4 right-4 bg-slate-900 border border-sky-500/50 rounded-3xl p-4 shadow-2xl flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => setIsCartModalVisible(true)}
            className="bg-emerald-600 active:bg-emerald-500 px-5 py-3 rounded-2xl flex-row items-center flex-1 mr-3 justify-center"
          >
            <Ionicons name="checkmark-done" size={20} color="#ffffff" />
            <Text className="text-white text-base font-extrabold mr-2">
              تأكيد الفاتورة ({formatCurrency(getTotal(), settings.currency)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsCartModalVisible(true)}
            className="bg-slate-800 border border-slate-700 p-3 rounded-2xl flex-row items-center"
          >
            <Ionicons name="cart" size={22} color="#38bdf8" />
            <View className="bg-sky-500 rounded-full px-2 py-0.5 mr-2">
              <Text className="text-white text-xs font-bold">{totalCartCount}</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Cart Drawer Modal */}
      <Modal
        visible={isCartModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <View className="flex-1 bg-slate-950 pt-10 px-4 pb-4">
          <View className="flex-row justify-between items-center pb-4 border-b border-slate-800">
            <TouchableOpacity
              onPress={() => setIsCartModalVisible(false)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800"
            >
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>

            <Text className="text-white text-xl font-bold text-right">
              سلة المبيعات ({cartItems.length} عناصر)
            </Text>

            {cartItems.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('تأكيد', 'هل تريد تفريغ السلة بالكامل؟', [
                    { text: 'إلغاء', style: 'cancel' },
                    { text: 'تفريغ', style: 'destructive', onPress: clearCart },
                  ]);
                }}
              >
                <Text className="text-rose-400 text-xs font-bold">تفريغ السلة</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cart Items List */}
          <ScrollView className="flex-1 my-3" showsVerticalScrollIndicator={false}>
            {cartItems.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Ionicons name="cart-outline" size={48} color="#475569" />
                <Text className="text-slate-400 text-sm font-semibold mt-3">
                  السلة فارغة حالياً
                </Text>
              </View>
            ) : (
              cartItems.map((item) => (
                <View
                  key={item.product.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <TouchableOpacity onPress={() => removeItem(item.product.id)}>
                      <Ionicons name="trash-outline" size={20} color="#f87171" />
                    </TouchableOpacity>

                    <View className="items-end flex-1 ml-2">
                      <Text className="text-white font-bold text-base text-right">
                        {item.product.name}
                      </Text>
                      <Text className="text-slate-400 text-xs text-right mt-0.5">
                        سعر الوحدة: {formatCurrency(item.unit_price, settings.currency)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center pt-3 border-t border-slate-800">
                    <Text className="text-emerald-400 font-extrabold text-base">
                      {formatCurrency(item.total, settings.currency)}
                    </Text>

                    {/* Quantity Controls */}
                    <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1.5 bg-slate-800 rounded-lg active:bg-slate-700"
                      >
                        <Ionicons name="add" size={16} color="#38bdf8" />
                      </TouchableOpacity>

                      <Text className="text-white font-bold text-sm px-3">
                        {item.quantity}
                      </Text>

                      <TouchableOpacity
                        onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1.5 bg-slate-800 rounded-lg active:bg-slate-700"
                      >
                        <Ionicons name="remove" size={16} color="#f87171" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Cart Totals & Discount Panel */}
          {cartItems.length > 0 && (
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
              {/* Discount Input */}
              <View className="flex-row justify-between items-center">
                <View className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex-row items-center">
                  <Text className="text-slate-400 text-xs ml-1">{settings.currency}</Text>
                  <TextInput
                    value={discountInput}
                    onChangeText={handleApplyDiscount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    className="flex-1 text-white text-right font-bold text-sm"
                  />
                </View>
                <Text className="text-slate-300 text-sm font-semibold">خصم إضافي:</Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-slate-300 font-semibold text-sm">
                  {formatCurrency(getSubtotal(), settings.currency)}
                </Text>
                <Text className="text-slate-400 text-sm">المجموع الفرعي:</Text>
              </View>

              {discount > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-rose-400 font-semibold text-sm">
                    -{formatCurrency(discount, settings.currency)}
                  </Text>
                  <Text className="text-rose-400 text-sm">الخصم:</Text>
                </View>
              )}

              <View className="flex-row justify-between items-center pt-2 border-t border-slate-800">
                <Text className="text-sky-400 text-2xl font-extrabold">
                  {formatCurrency(getTotal(), settings.currency)}
                </Text>
                <Text className="text-white font-bold text-base">الإجمالي النهائي:</Text>
              </View>

              {/* Confirm Sale Button */}
              <TouchableOpacity
                onPress={handleCheckout}
                disabled={isSavingBill}
                className="bg-emerald-600 active:bg-emerald-500 py-3.5 rounded-2xl items-center flex-row justify-center mt-2 shadow-lg shadow-emerald-600/30"
              >
                <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                <Text className="text-white text-base font-extrabold mr-2">
                  {isSavingBill ? 'جاري الحفظ...' : 'حفظ وإصدار الفاتورة'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Receipt Modal on Successful Sale */}
      <Modal
        visible={savedBillData !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setSavedBillData(null)}
      >
        {savedBillData && (
          <View className="flex-1 bg-slate-950 pt-8 px-4 pb-4">
            <ReceiptView
              bill={savedBillData.bill}
              items={savedBillData.items}
              settings={settings}
              onClose={() => setSavedBillData(null)}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}
