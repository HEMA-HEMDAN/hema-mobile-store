import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { billRepository } from '../../repositories/billRepository';
import { productRepository } from '../../repositories/productRepository';
import { Bill, Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateArabic, getTodayDateRange } from '../../utils/date';
import { useSettingsStore } from '../../stores/settingsStore';

export default function DashboardScreen() {
  const router = useRouter();
  const currencySymbol = useSettingsStore((state) => state.settings.currency);

  const [refreshing, setRefreshing] = useState(false);
  const [todaySales, setTodaySales] = useState(0);
  const [todayBillsCount, setTodayBillsCount] = useState(0);
  const [todayNetProfit, setTodayNetProfit] = useState(0);
  const [todayDamagedLoss, setTodayDamagedLoss] = useState(0);
  const [inventorySellingValue, setInventorySellingValue] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Today summary
      const todaySummary = await billRepository.getTodaySummary();
      setTodaySales(todaySummary.totalSales);
      setTodayBillsCount(todaySummary.billCount);

      // 2. Today net profit & damaged loss
      const { startISO, endISO } = getTodayDateRange();
      const profitData = await billRepository.getProfitSummary(startISO, endISO);
      setTodayNetProfit(profitData.netProfit);
      setTodayDamagedLoss(profitData.damagedItemsLoss);

      // 3. Inventory totals
      const invTotals = await productRepository.getInventoryTotals();
      setInventorySellingValue(invTotals.totalSellingValue);

      // 4. Low stock and out of stock
      const lowStock = await productRepository.getLowStockProducts();
      const outOfStock = await productRepository.getOutOfStockProducts();
      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);

      // 5. Recent bills
      const recent = await billRepository.getBills(5, 0);
      setRecentBills(recent);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header showSettings showReports showCategories />

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions Header Banner */}
        <View className="bg-gradient-to-r from-sky-900 to-slate-900 p-4 rounded-3xl mb-4 border border-sky-800/40 flex-row justify-between items-center">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/pos')}
            className="bg-sky-500 active:bg-sky-600 px-5 py-3 rounded-2xl flex-row items-center shadow-lg shadow-sky-500/20"
          >
            <Ionicons name="cart" size={20} color="#ffffff" />
            <Text className="text-white text-sm font-extrabold mr-2">بدء عملية بيع جديدة</Text>
          </TouchableOpacity>

          <View className="items-end">
            <Text className="text-slate-300 text-xs font-semibold">مرحباً بك!</Text>
            <Text className="text-sky-400 text-base font-bold">لوحة التحكم</Text>
          </View>
        </View>

        {/* Top Metric Grid */}
        <Text className="text-slate-300 text-base font-bold text-right mb-3">
          ملخص اليوم والمخزون
        </Text>

        <View className="flex-row flex-wrap justify-between mb-2">
          <View className="w-[48%] mb-2.5">
            <StatCard
              title="مبيعات اليوم"
              value={formatCurrency(todaySales, currencySymbol)}
              iconName="cash-outline"
              variant="success"
              density="compact"
              onPress={() => router.push('/(tabs)/bills')}
            />
          </View>

          <View className="w-[48%] mb-2.5">
            <StatCard
              title="صافي ربح اليوم"
              value={formatCurrency(todayNetProfit, currencySymbol)}
              iconName="trending-up-outline"
              variant={todayNetProfit >= 0 ? 'success' : 'warning'}
              density="compact"
              onPress={() => router.push('/reports')}
            />
          </View>

          <View className="w-[48%] mb-2.5">
            <StatCard
              title="خسارة التالف اليوم"
              value={formatCurrency(todayDamagedLoss, currencySymbol)}
              iconName="trash-bin-outline"
              variant="danger"
              density="compact"
              onPress={() => router.push('/reports')}
            />
          </View>

          <View className="w-[48%] mb-2.5">
            <StatCard
              title="عدد الفواتير اليوم"
              value={todayBillsCount}
              subtitle="فاتورة"
              iconName="receipt-outline"
              variant="primary"
              density="compact"
              onPress={() => router.push('/(tabs)/bills')}
            />
          </View>

          <View className="w-[48%] mb-2.5">
            <StatCard
              title="قيمة المخزون الإجمالية"
              value={formatCurrency(inventorySellingValue, currencySymbol)}
              iconName="pie-chart-outline"
              variant="info"
              density="compact"
              onPress={() => router.push('/(tabs)/inventory')}
            />
          </View>

          <View className="w-[48%] mb-2.5">
            <StatCard
              title="منخفض / نافد"
              value={`${lowStockProducts.length} / ${outOfStockProducts.length}`}
              subtitle="منتج للمتابعة"
              iconName="alert-circle-outline"
              variant={lowStockProducts.length + outOfStockProducts.length > 0 ? 'warning' : 'success'}
              density="compact"
              onPress={() => router.push('/(tabs)/inventory')}
            />
          </View>
        </View>

        {/* Low Stock Alerts Section */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <View className="mt-2 mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <TouchableOpacity onPress={() => router.push('/(tabs)/inventory')}>
                <Text className="text-sky-400 text-xs font-bold">عرض الكل في المخزون</Text>
              </TouchableOpacity>
              <Text className="text-amber-400 text-base font-bold text-right">
                تنبيهات المخزون المنخفض والنافد
              </Text>
            </View>

            {[...outOfStockProducts, ...lowStockProducts].slice(0, 4).map((prod) => (
              <TouchableOpacity
                key={prod.id}
                onPress={() => router.push({ pathname: '/inventory/adjust', params: { productId: prod.id } })}
                className="bg-slate-900 border border-amber-900/40 rounded-2xl p-3.5 mb-2.5 flex-row justify-between items-center"
              >
                <View className="bg-sky-600/20 border border-sky-500/30 px-3 py-1.5 rounded-xl">
                  <Text className="text-sky-400 text-xs font-bold">إعادة تزويد</Text>
                </View>

                <View className="items-end flex-1 mr-3">
                  <View className="flex-row items-center mb-1">
                    <Badge
                      stockQuantity={prod.stock_quantity}
                      lowStockThreshold={prod.low_stock_threshold}
                      unit={prod.unit}
                    />
                    <Text className="text-white text-sm font-bold text-right mr-2 flex-1" numberOfLines={1}>
                      {prod.name}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xs text-right">
                    السعر: {formatCurrency(prod.selling_price, currencySymbol)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Bills Section */}
        <View className="mt-2 mb-8">
          <View className="flex-row justify-between items-center mb-3">
            <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
              <Text className="text-sky-400 text-xs font-bold">عرض كل الفواتير</Text>
            </TouchableOpacity>
            <Text className="text-slate-300 text-base font-bold text-right">
              أحدث الفواتير
            </Text>
          </View>

          {recentBills.length === 0 ? (
            <View className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 items-center">
              <Ionicons name="receipt-outline" size={36} color="#64748b" />
              <Text className="text-slate-400 text-sm mt-2 text-center font-semibold">
                لا توجد فواتير صادرة حتى الآن
              </Text>
            </View>
          ) : (
            recentBills.map((bill) => (
              <TouchableOpacity
                key={bill.id}
                onPress={() => router.push({ pathname: '/bill/[id]', params: { id: bill.id } })}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-2.5 flex-row justify-between items-center active:bg-slate-800/80"
              >
                <View className="items-start">
                  <Text className="text-emerald-400 text-base font-extrabold">
                    {formatCurrency(bill.total, currencySymbol)}
                  </Text>
                  {bill.discount > 0 && (
                    <Text className="text-rose-400 text-xs font-semibold">
                      خصم: {formatCurrency(bill.discount, currencySymbol)}
                    </Text>
                  )}
                </View>

                <View className="items-end">
                  <Text className="text-white text-sm font-bold">
                    فاتورة رقم #{bill.invoice_number}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {formatDateArabic(bill.created_at)}
                  </Text>
                  {bill.client_name && (
                    <Text className="text-sky-300 text-xs mt-1">
                      العميل: {bill.client_name}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
