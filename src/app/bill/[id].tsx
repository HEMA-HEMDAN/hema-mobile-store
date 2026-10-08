import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { ReceiptView } from '../../components/ReceiptView';
import { billRepository } from '../../repositories/billRepository';
import { useSettingsStore } from '../../stores/settingsStore';
import { Bill, BillItem } from '../../types';

export default function BillDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettingsStore((state) => state.settings);

  const [billData, setBillData] = useState<{
    bill: Bill;
    items: BillItem[];
  } | null>(null);

  useEffect(() => {
    if (id) {
      const billId = parseInt(id, 10);
      billRepository.getBillById(billId).then(setBillData);
    }
  }, [id]);

  if (!billData) {
    return (
      <View className="flex-1 bg-slate-950">
        <Header title="تفاصيل الفاتورة" showBack showSettings={false} showReports={false} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-400 text-sm font-semibold">جاري تحميل الفاتورة...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <Header
        title={`فاتورة رقم #${billData.bill.invoice_number}`}
        showBack
        showSettings={false}
        showReports={false}
      />
      <View className="flex-1 p-4">
        <ReceiptView
          bill={billData.bill}
          items={billData.items}
          settings={settings}
          onClose={() => router.back()}
        />
      </View>
    </View>
  );
}
