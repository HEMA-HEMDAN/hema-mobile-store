import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { ReceiptView } from '../../components/ReceiptView';
import { billRepository } from '../../repositories/billRepository';
import { useSettingsStore } from '../../stores/settingsStore';
import { Bill, BillItem } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDateArabic } from '../../utils/date';

export default function BillsScreen() {
  const settings = useSettingsStore((state) => state.settings);

  const [bills, setBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillDetails, setSelectedBillDetails] = useState<{
    bill: Bill;
    items: BillItem[];
  } | null>(null);

  const loadBills = useCallback(async () => {
    try {
      const fetched = await billRepository.getBills(100, 0, searchQuery);
      setBills(fetched);
    } catch (e) {
      console.error('Error loading bills:', e);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills])
  );

  const handleSelectBill = async (billId: number) => {
    try {
      const details = await billRepository.getBillById(billId);
      if (details) {
        setSelectedBillDetails(details);
      }
    } catch (e) {
      console.error('Error fetching bill detail:', e);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="سجل الفواتير" showReports showSettings={false} />

      {/* Search Bar */}
      <View className="px-4 pt-3 pb-3 bg-slate-900 border-b border-slate-800">
        <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2">
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
            }}
            placeholder="ابحث برقم الفاتورة أو اسم العميل..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white text-right font-semibold mr-2 text-sm"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bills List */}
      <View className="flex-1 px-4 pt-3">
        {bills.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="receipt-outline" size={48} color="#475569" />
            <Text className="text-slate-400 text-sm font-semibold mt-3 text-center">
              لا توجد فواتير صادرة مطابقة للبحث
            </Text>
          </View>
        ) : (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectBill(item.id)}
                activeOpacity={0.7}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 flex-row justify-between items-center active:bg-slate-800"
              >
                <View className="items-start">
                  <Text className="text-emerald-400 text-lg font-extrabold">
                    {formatCurrency(item.total, settings.currency)}
                  </Text>
                  {item.discount > 0 && (
                    <Text className="text-rose-400 text-xs font-semibold">
                      خصم: {formatCurrency(item.discount, settings.currency)}
                    </Text>
                  )}
                </View>

                <View className="items-end flex-1 ml-3">
                  <Text className="text-white text-base font-bold">
                    فاتورة رقم #{item.invoice_number}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-1">
                    {formatDateArabic(item.created_at)}
                  </Text>
                  {item.client_name && (
                    <Text className="text-sky-300 text-xs mt-1">
                      العميل: {item.client_name}
                    </Text>
                  )}
                </View>

                <Ionicons name="chevron-back" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bill Receipt Modal */}
      <Modal
        visible={selectedBillDetails !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedBillDetails(null)}
      >
        {selectedBillDetails && (
          <View className="flex-1 bg-slate-950 pt-8 px-4 pb-4">
            <ReceiptView
              bill={selectedBillDetails.bill}
              items={selectedBillDetails.items}
              settings={settings}
              onClose={() => setSelectedBillDetails(null)}
            />
          </View>
        )}
      </Modal>
    </View>
  );
}
