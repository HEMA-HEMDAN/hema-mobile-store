import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { reportService } from '../services/reportService';
import { ReportSummary } from '../types';
import { formatCurrency } from '../utils/currency';
import { useSettingsStore } from '../stores/settingsStore';

type PeriodType = 'today' | 'week' | 'month';

export default function ReportsScreen() {
  const currencySymbol = useSettingsStore((state) => state.settings.currency);
  const [period, setPeriod] = useState<PeriodType>('today');
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  const loadReport = useCallback(async () => {
    try {
      const res = await reportService.getReportSummary(period);
      setSummary(res);
    } catch (e) {
      console.error('Error loading report summary:', e);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="التقارير والإحصائيات" showBack showReports={false} showSettings={false} />

      {/* Period Filter Tabs */}
      <View className="px-4 pt-3 pb-3 bg-slate-900 border-b border-slate-800 flex-row space-x-2 space-x-reverse">
        <TouchableOpacity
          onPress={() => setPeriod('today')}
          className={`flex-1 py-2.5 rounded-xl border items-center ${
            period === 'today'
              ? 'bg-sky-600 border-sky-500'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              period === 'today' ? 'text-white' : 'text-slate-400'
            }`}
          >
            اليوم
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPeriod('week')}
          className={`flex-1 py-2.5 rounded-xl border items-center ${
            period === 'week'
              ? 'bg-sky-600 border-sky-500'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              period === 'week' ? 'text-white' : 'text-slate-400'
            }`}
          >
            هذا الأسبوع
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPeriod('month')}
          className={`flex-1 py-2.5 rounded-xl border items-center ${
            period === 'month'
              ? 'bg-sky-600 border-sky-500'
              : 'bg-slate-950 border-slate-800'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              period === 'month' ? 'text-white' : 'text-slate-400'
            }`}
          >
            هذا الشهر
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {summary && (
          <>
            {/* Sales Highlights Grid */}
            <Text className="text-slate-300 text-base font-bold text-right mb-3">
              ملخص المبيعات (
              {period === 'today'
                ? 'اليوم'
                : period === 'week'
                ? 'هذا الأسبوع'
                : 'هذا الشهر'}
              )
            </Text>

            <View className="flex-row flex-wrap justify-between mb-4">
              <View className="w-[48%] mb-3">
                <StatCard
                  title="إجمالي المبيعات"
                  value={formatCurrency(summary.totalSales, currencySymbol)}
                  iconName="cash-outline"
                  variant="success"
                />
              </View>

              <View className="w-[48%] mb-3">
                <StatCard
                  title="عدد الفواتير"
                  value={summary.billsCount}
                  subtitle="فاتورة"
                  iconName="document-text-outline"
                  variant="primary"
                />
              </View>

              <View className="w-[48%] mb-3">
                <StatCard
                  title="متوسط قيمة الفاتورة"
                  value={formatCurrency(summary.averageBillValue, currencySymbol)}
                  iconName="calculator-outline"
                  variant="info"
                />
              </View>

              <View className="w-[48%] mb-3">
                <StatCard
                  title="قيمة المخزون (بيع)"
                  value={formatCurrency(summary.inventoryValueSelling, currencySymbol)}
                  iconName="pricetag-outline"
                  variant="warning"
                />
              </View>
            </View>

            {/* Inventory Valuation Breakdown */}
            <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 space-y-3">
              <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
                تقييم المخزون الحالي
              </Text>
              
              <View className="flex-row justify-between">
                <Text className="text-emerald-400 text-sm font-bold">
                  {formatCurrency(summary.inventoryValueSelling, currencySymbol)}
                </Text>

                <Text className="text-slate-300 text-sm font-semibold">
                  القيمة الإجمالية بسعر البيع:
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-slate-300 text-sm font-bold">
                  {formatCurrency(summary.inventoryValuePurchase, currencySymbol)}
                </Text>
                <Text className="text-slate-400 text-sm font-semibold">
                  التكلفة الإجمالية بسعر الشراء:
                </Text>
              </View>
            </View>

            {/* Top Selling Products */}
            <View className="mb-6">
              <Text className="text-slate-300 text-base font-bold text-right mb-3">
                الأكثر مبيعاً
              </Text>

              {summary.topSellingProducts.length === 0 ? (
                <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center">
                  <Text className="text-slate-400 text-xs font-semibold text-center">
                    لا توجد بيانات مبيعات كافية لهذه الفترة
                  </Text>
                </View>
              ) : (
                summary.topSellingProducts.map((prod, idx) => (
                  <View
                    key={prod.product_id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-2 flex-row justify-between items-center"
                  >
                    <View className="items-start">
                      <Text className="text-emerald-400 font-extrabold text-sm">
                        {formatCurrency(prod.total_revenue, currencySymbol)}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        الكمية: {prod.total_quantity}
                      </Text>
                    </View>

                    <View className="items-end flex-1 ml-3">
                      <View className="flex-row items-center">
                        <Text className="text-white text-sm font-bold text-right mr-2 flex-1" numberOfLines={1}>
                          {prod.product_name}
                        </Text>
                        <View className="bg-sky-600/30 w-6 h-6 rounded-full items-center justify-center">
                          <Text className="text-sky-400 text-xs font-bold">
                            {idx + 1}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
