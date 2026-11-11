import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import { productRepository } from '../../repositories/productRepository';
import { stockRepository } from '../../repositories/stockRepository';
import { Product, StockMovement } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateArabic } from '../../utils/date';
import { useSettingsStore } from '../../stores/settingsStore';

type FilterType = 'all' | 'low' | 'out';

export default function InventoryScreen() {
  const router = useRouter();
  const settings = useSettingsStore((state) => state.settings);

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const loadInventory = useCallback(async () => {
    try {
      if (activeTab === 'stock') {
        if (filterType === 'low') {
          const low = await productRepository.getLowStockProducts();
          setProducts(low);
        } else if (filterType === 'out') {
          const out = await productRepository.getOutOfStockProducts();
          setProducts(out);
        } else {
          const all = await productRepository.getAllProducts({ activeOnly: true });
          setProducts(all.filter((product) => product.product_type !== 'SERVICE'));
        }
      } else {
        const mvs = await stockRepository.getStockMovements(undefined, 100);
        setMovements(mvs);
      }
    } catch (e) {
      console.error('Error loading inventory data:', e);
    }
  }, [activeTab, filterType]);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [loadInventory])
  );

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="إدارة المخزون" showSettings={false} showReports />

      {/* Main Mode Toggle: Products Stock vs Movement Logs */}
      <View className="px-4 pt-3 pb-3 bg-slate-900 border-b border-slate-800 flex-row space-x-2 space-x-reverse">
        <TouchableOpacity
          onPress={() => setActiveTab('stock')}
          className={`flex-1 py-2.5 rounded-xl border items-center ${
            activeTab === 'stock'
              ? 'bg-sky-600 border-sky-500'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === 'stock' ? 'text-white' : 'text-slate-400'
            }`}
          >
            حالة المخزون الحالي
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('movements')}
          className={`flex-1 py-2.5 rounded-xl border items-center ${
            activeTab === 'movements'
              ? 'bg-sky-600 border-sky-500'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              activeTab === 'movements' ? 'text-white' : 'text-slate-400'
            }`}
          >
            سجل حركة المخزون
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs for Stock View */}
      {activeTab === 'stock' && (
        <View className="px-4 py-2.5 bg-slate-900/50 border-b border-slate-800/50">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2 space-x-reverse">
            <TouchableOpacity
              onPress={() => setFilterType('all')}
              className={`px-4 py-1.5 rounded-xl border ${
                filterType === 'all'
                  ? 'bg-slate-800 border-sky-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <Text className={`text-xs font-bold ${filterType === 'all' ? 'text-sky-400' : 'text-slate-400'}`}>
                كل المنتجات
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterType('low')}
              className={`px-4 py-1.5 rounded-xl border ${
                filterType === 'low'
                  ? 'bg-amber-950/80 border-amber-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <Text className={`text-xs font-bold ${filterType === 'low' ? 'text-amber-400' : 'text-slate-400'}`}>
                منخفض المخزون
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterType('out')}
              className={`px-4 py-1.5 rounded-xl border ${
                filterType === 'out'
                  ? 'bg-rose-950/80 border-rose-500'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <Text className={`text-xs font-bold ${filterType === 'out' ? 'text-rose-400' : 'text-slate-400'}`}>
                نافد
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Main Content Area */}
      <View className="flex-1 px-4 pt-3">
        {activeTab === 'stock' ? (
          products.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="layers-outline" size={48} color="#475569" />
              <Text className="text-slate-400 text-sm font-semibold mt-3 text-center">
                لا توجد منتجات مسجلة في التبويب الحالي
              </Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3">
                  <View className="flex-row justify-between items-start mb-2">
                    <Badge
                      stockQuantity={item.stock_quantity}
                      lowStockThreshold={item.low_stock_threshold}
                      unit={item.unit}
                    />
                    <View className="items-end flex-1 ml-2">
                      <Text className="text-white text-base font-bold text-right">
                        {item.name}
                      </Text>
                      <Text className="text-slate-400 text-xs text-right mt-0.5">
                        سعر الشراء: {formatCurrency(item.purchase_price, settings.currency)} | البيع: {formatCurrency(item.selling_price, settings.currency)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center pt-3 mt-2 border-t border-slate-800">
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/inventory/adjust',
                          params: { productId: item.id },
                        })
                      }
                      className="bg-sky-600/20 border border-sky-500/40 px-4 py-2 rounded-xl flex-row items-center active:bg-sky-600/30"
                    >
                      <Ionicons name="create-outline" size={16} color="#38bdf8" />
                      <Text className="text-sky-400 text-xs font-bold mr-1.5">
                        تعديل / إضافة كمية
                      </Text>
                    </TouchableOpacity>

                    <Text className="text-slate-400 text-xs">
                      حد المنخفض: {item.low_stock_threshold} {item.unit}
                    </Text>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          /* Movement Logs List */
          movements.length === 0 ? (
            <View className="flex-1 items-center justify-center py-16">
              <Ionicons name="time-outline" size={48} color="#475569" />
              <Text className="text-slate-400 text-sm font-semibold mt-3 text-center">
                لا توجد حركات مخزون مسجلة
              </Text>
            </View>
          ) : (
            <FlatList
              data={movements}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-2.5 flex-row justify-between items-center">
                  <View className="items-start">
                    <Text
                      className={`text-sm font-extrabold ${
                        item.quantity_change > 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {item.quantity_change > 0 ? `+${item.quantity_change}` : item.quantity_change}
                    </Text>
                    <Text className="text-slate-400 text-[10px] mt-0.5">
                      {formatDateArabic(item.created_at)}
                    </Text>
                  </View>

                  <View className="items-end flex-1 ml-3">
                    <View className="flex-row items-center">
                      <View
                        className={`px-2 py-0.5 rounded-md mr-2 ${
                          item.type === 'SALE'
                            ? 'bg-purple-950/80 border border-purple-800'
                            : item.type === 'RESTOCK'
                            ? 'bg-emerald-950/80 border border-emerald-800'
                            : item.type === 'DAMAGED'
                            ? 'bg-rose-950/80 border border-rose-700'
                            : 'bg-amber-950/80 border border-amber-800'
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            item.type === 'SALE'
                              ? 'text-purple-400'
                              : item.type === 'RESTOCK'
                              ? 'text-emerald-400'
                              : item.type === 'DAMAGED'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {item.type === 'SALE'
                            ? 'بيع'
                            : item.type === 'RESTOCK'
                            ? 'تزويد'
                            : item.type === 'DAMAGED'
                            ? '🔴 تالف'
                            : 'تعديل'}
                        </Text>
                      </View>

                      <Text className="text-white text-sm font-bold text-right flex-1" numberOfLines={1}>
                        {item.product_name}
                      </Text>
                    </View>

                    {item.note && (
                      <Text className="text-slate-400 text-xs text-right mt-1">
                        ملاحظة: {item.note}
                      </Text>
                    )}
                    {item.client_name && (
                      <Text className="text-sky-300 text-xs text-right mt-1">
                        العميل: {item.client_name}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>
    </View>
  );
}
