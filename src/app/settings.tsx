import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useSettingsStore } from '../stores/settingsStore';
import { backupService } from '../services/backupService';
import { syncService } from '../services/syncService';
import { syncRepository } from '../repositories/syncRepository';
import { formatDateArabic } from '../utils/date';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings, loadSettings } = useSettingsStore();

  const [shopName, setShopName] = useState(settings.shop_name);
  const [shopPhone, setShopPhone] = useState(settings.shop_phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    settings.low_stock_threshold_default.toString()
  );
  const [allowNegativeStock, setAllowNegativeStock] = useState(
    settings.allow_negative_stock
  );
  const [pendingOpsCount, setPendingOpsCount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingExport, setIsSyncingExport] = useState(false);
  const [isSyncingImport, setIsSyncingImport] = useState(false);
  const [isBackupExport, setIsBackupExport] = useState(false);
  const [isBackupRestore, setIsBackupRestore] = useState(false);

  const refreshSyncInfo = useCallback(async () => {
    try {
      const count = await syncRepository.getSyncOperationsCount();
      setPendingOpsCount(count);
    } catch (e) {
      console.error('Error fetching pending sync ops count:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSyncInfo();
    }, [refreshSyncInfo])
  );

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopPhone(settings.shop_phone);
    setCurrency(settings.currency);
    setReceiptFooter(settings.receipt_footer);
    setLowStockThreshold(settings.low_stock_threshold_default.toString());
    setAllowNegativeStock(settings.allow_negative_stock);
  }, [settings]);

  const handleSaveShopSettings = async () => {
    try {
      setIsSaving(true);
      const parsedThreshold = parseInt(lowStockThreshold, 10);
      await updateSettings({
        shop_name: shopName,
        shop_phone: shopPhone,
        currency,
        receipt_footer: receiptFooter,
        low_stock_threshold_default: isNaN(parsedThreshold) ? 5 : parsedThreshold,
        allow_negative_stock: allowNegativeStock,
      });
      Alert.alert('نجاح', 'تم حفظ إعدادات المحل بنجاح');
    } catch (e: any) {
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSync = async () => {
    try {
      setIsSyncingExport(true);
      const msg = await syncService.exportSyncFileToDevice();
      await refreshSyncInfo();
      await loadSettings();
      Alert.alert('تصدير التغييرات', msg);
    } catch (e: any) {
      Alert.alert('خطأ التصدير', e.message || 'حدث خطأ أثناء تصدير ملف التغييرات');
    } finally {
      setIsSyncingExport(false);
    }
  };

  const handleImportSync = async () => {
    try {
      setIsSyncingImport(true);
      const result = await syncService.pickAndImportSyncFile();
      await refreshSyncInfo();
      await loadSettings();

      if (result.importedCount === 0 && result.skippedCount === 0 && result.errors.length === 0) {
        return; // User canceled picker
      }

      Alert.alert(
        'نتيجة المزامنة',
        `تمت المزامنة بنجاح\n\nتم استيراد: ${result.importedCount} عملية\nتم تخطي مكرر: ${result.skippedCount} عملية\nتعارضات: ${result.conflictCount}`
      );
    } catch (e: any) {
      Alert.alert('خطأ الاستيراد', e.message || 'حدث خطأ أثناء استيراد التغييرات');
    } finally {
      setIsSyncingImport(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsBackupExport(true);
      const msg = await backupService.saveBackupFileToDevice();
      Alert.alert('تصدير النسخة الاحتياطية', msg);
    } catch (e: any) {
      Alert.alert('خطأ التصدير', e.message || 'حدث خطأ أثناء تصدير النسخة الاحتياطية');
    } finally {
      setIsBackupExport(false);
    }
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      'تحذير الاستعادة الكاملة',
      'استعادة النسخة الاحتياطية ستستبدل كافة البيانات الحالية بالكامل بالبيانات الموجودة في الملف. هل تريد الاستمرار؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، استعادة',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBackupRestore(true);
              await backupService.pickAndRestoreBackup();
              await loadSettings();
              await refreshSyncInfo();
              Alert.alert('تمت الاستعادة بنجاح', 'تمت استعادة كافة بيانات المحل بالكامل بنجاح.');
            } catch (e: any) {
              Alert.alert(
                'تعذر استعادة النسخة الاحتياطية',
                e.message || 'حدث خطأ أثناء استعادة البيانات'
              );
            } finally {
              setIsBackupRestore(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-950">
      <Header title="إعدادات المحل" showBack showSettings={false} showReports={false} />

      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
        {/* SECTION 1: Shop Metadata */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-sm space-y-4">
          <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            بيانات المحل
          </Text>

          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              اسم المحل *
            </Text>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              placeholder="اسم المحل"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              رقم الهاتف (اختياري)
            </Text>
            <TextInput
              value={shopPhone}
              onChangeText={setShopPhone}
              keyboardType="phone-pad"
              placeholder="01000000000"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              العملة
            </Text>
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder="ج.م"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              نص أسفل الفاتورة
            </Text>
            <TextInput
              value={receiptFooter}
              onChangeText={setReceiptFooter}
              placeholder="شكراً لزيارتكم!"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <TouchableOpacity
            onPress={handleSaveShopSettings}
            disabled={isSaving}
            className="bg-sky-600 active:bg-sky-500 py-3 rounded-2xl items-center flex-row justify-center mt-2 shadow-sm"
          >
            <Ionicons name="save-outline" size={18} color="#ffffff" />
            <Text className="text-white text-sm font-bold mr-2">
              {isSaving ? 'جاري الحفظ...' : 'حفظ بيانات المحل'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: Inventory Preferences */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-sm space-y-4">
          <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            تفضيلات المخزون
          </Text>

          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              حد المخزون المنخفض الافتراضي للمنتجات
            </Text>
            <TextInput
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              keyboardType="numeric"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View className="flex-row justify-between items-center pt-1">
            <Switch
              value={allowNegativeStock}
              onValueChange={setAllowNegativeStock}
              trackColor={{ false: '#334155', true: '#0284c7' }}
              thumbColor={allowNegativeStock ? '#38bdf8' : '#cbd5e1'}
            />
            <View className="items-end flex-1 mr-3">
              <Text className="text-white text-sm font-bold text-right">
                السماح بالبيع بالسالب (بدون رصيد)
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: Event-Based Synchronization */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-sm space-y-4">
          <Text className="text-purple-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            المزامنة (تغييرات الأحداث)
          </Text>

          <View className="bg-slate-950 p-3.5 rounded-2xl space-y-2 mb-3 border border-slate-800">
            <View className="flex-row justify-between">
              <Text className="text-white text-xs font-bold">{settings.device_id}</Text>
              <Text className="text-slate-400 text-xs">الجهاز الحالي:</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-purple-400 text-xs font-extrabold">
                {pendingOpsCount} عملية
              </Text>
              <Text className="text-slate-400 text-xs">عدد التغييرات المسجلة:</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-400 text-xs">
                {settings.last_sync_at ? formatDateArabic(settings.last_sync_at) : 'لم تتم بعد'}
              </Text>
              <Text className="text-slate-400 text-xs">آخر مزامنة:</Text>
            </View>
          </View>

          {/* Action Buttons for Sync */}
          <View className="flex-row space-x-3 space-x-reverse">
            <TouchableOpacity
              onPress={handleExportSync}
              disabled={isSyncingExport}
              className="flex-1 bg-purple-600 active:bg-purple-700 py-3 rounded-2xl items-center flex-row justify-center shadow-sm"
            >
              <Ionicons name="swap-horizontal" size={18} color="#ffffff" />
              <Text className="text-white text-xs font-bold mr-1.5">
                {isSyncingExport ? 'جاري التصدير...' : 'تصدير التغييرات'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleImportSync}
              disabled={isSyncingImport}
              className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-2xl items-center flex-row justify-center active:bg-slate-700"
            >
              <Ionicons name="download-outline" size={18} color="#38bdf8" />
              <Text className="text-sky-400 text-xs font-bold mr-1.5">
                {isSyncingImport ? 'جاري الاستيراد...' : 'استيراد التغييرات'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 4: Full Backup & Restore */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-sm space-y-4">
          <Text className="text-emerald-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            النسخ الاحتياطي الكامل
          </Text>

          <View className="flex-row space-x-3 space-x-reverse">
            <TouchableOpacity
              onPress={handleExportBackup}
              disabled={isBackupExport}
              className="flex-1 bg-emerald-600 active:bg-emerald-700 py-3 rounded-2xl items-center flex-row justify-center shadow-sm"
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" />
              <Text className="text-white text-xs font-bold mr-1.5">
                {isBackupExport ? 'جاري الحفظ...' : 'تصدير نسخة كاملة'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleRestoreBackup}
              disabled={isBackupRestore}
              className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-2xl items-center flex-row justify-center active:bg-slate-700"
            >
              <Ionicons name="cloud-download-outline" size={18} color="#f8fafc" />
              <Text className="text-white text-xs font-bold mr-1.5">
                {isBackupRestore ? 'جاري الاستعادة...' : 'استعادة نسخة كاملة'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 5: App Info */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-10 shadow-sm items-center space-y-1">
          <Ionicons name="boat-outline" size={28} color="#38bdf8" />
          <Text className="text-white text-base font-bold mt-1">
            القبطان - إدارة المحلات والمبيعات
          </Text>
          <Text className="text-slate-400 text-xs">
            إصدار التطبيق v1.0.0 (عمل بدون إنترنت 100%)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
