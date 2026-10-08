import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useSettingsStore } from '../stores/settingsStore';
import { backupService } from '../services/backupService';

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

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopPhone(settings.shop_phone);
    setCurrency(settings.currency);
    setReceiptFooter(settings.receipt_footer);
    setLowStockThreshold(settings.low_stock_threshold_default.toString());
    setAllowNegativeStock(settings.allow_negative_stock);
  }, [settings]);

  const handleSaveSettings = async () => {
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

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      await backupService.shareBackupFile();
    } catch (e: any) {
      Alert.alert('خطأ التصدير', e.message || 'حدث خطأ أثناء تصدير النسخة الاحتياطية');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreBackup = async () => {
    Alert.alert(
      'تحذير الاستعادة',
      'استعادة النسخة الاحتياطية ستستبدل كافة البيانات الحالية بالبيانات الموجودة في الملف. هل تريد الاستمرار؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، استعادة',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsRestoring(true);
              await backupService.pickAndRestoreBackup();
              await loadSettings();
              Alert.alert('تمت الاستعادة بنجاح', 'تمت استعادة كافة بيانات المحل بنجاح.');
            } catch (e: any) {
              Alert.alert(
                'تعذر استعادة النسخة الاحتياطية',
                e.message || 'حدث خطأ أثناء استعادة البيانات'
              );
            } finally {
              setIsRestoring(false);
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
        {/* Shop Information Section */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-sm space-y-4">
          <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            بيانات المحل والفاتورة
          </Text>

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              اسم المحل *
            </Text>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              placeholder="مثال: سوبر ماركت الأمانة"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              رقم هاتف المحل (اختياري)
            </Text>
            <TextInput
              value={shopPhone}
              onChangeText={setShopPhone}
              placeholder="01000000000"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              رمز العملة العادي
            </Text>
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              placeholder="ج.م"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              نص تذييل الفاتورة
            </Text>
            <TextInput
              value={receiptFooter}
              onChangeText={setReceiptFooter}
              placeholder="شكراً لزيارتكم!"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>
        </View>

        {/* Inventory Preferences Section */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-5 shadow-sm space-y-4">
          <Text className="text-sky-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            تفضيلات المخزون
          </Text>

          <View>
            <Text className="text-slate-300 text-xs font-semibold text-right mb-1.5">
              حد المخزون المنخفض الافتراضي للمنتجات الجديدة
            </Text>
            <TextInput
              value={lowStockThreshold}
              onChangeText={setLowStockThreshold}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#64748b"
              className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white text-right font-semibold text-sm"
            />
          </View>

          <View className="flex-row justify-between items-center pt-2">
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
              <Text className="text-slate-400 text-xs text-right mt-0.5">
                عند تفعيله، يمكن إتمام البيع حتى لو كان المنتج غير متوفر بالمخزون.
              </Text>
            </View>
          </View>
        </View>

        {/* Save Settings Button */}
        <TouchableOpacity
          onPress={handleSaveSettings}
          disabled={isSaving}
          className="bg-sky-600 active:bg-sky-500 py-3.5 rounded-2xl items-center flex-row justify-center mb-6 shadow-lg shadow-sky-600/30"
        >
          <Ionicons name="save-outline" size={20} color="#ffffff" />
          <Text className="text-white text-base font-extrabold mr-2">
            {isSaving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Text>
        </TouchableOpacity>

        {/* Backup & Restore Mandatory Section */}
        <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-10 shadow-sm space-y-4">
          <Text className="text-emerald-400 text-base font-bold text-right border-b border-slate-800 pb-2">
            النسخ الاحتياطي والاستعادة (سحابي / محلي)
          </Text>

          <Text className="text-slate-400 text-xs text-right leading-5">
            احفظ نسخة احتياطية من جميع فواتيرك ومنتجاتك ومخزونك للرجوع إليها في أي وقت أو نقلها لجهاز آخر.
          </Text>

          {/* Export Button */}
          <TouchableOpacity
            onPress={handleExportBackup}
            disabled={isExporting}
            className="bg-emerald-600 active:bg-emerald-500 py-3.5 rounded-2xl items-center flex-row justify-center shadow-lg shadow-emerald-600/20"
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
            <Text className="text-white text-sm font-bold mr-2">
              {isExporting ? 'جاري التصدير...' : 'تصدير نسخة احتياطية (JSON)'}
            </Text>
          </TouchableOpacity>

          {/* Restore Button */}
          <TouchableOpacity
            onPress={handleRestoreBackup}
            disabled={isRestoring}
            className="bg-slate-950 border border-slate-800 active:bg-slate-800 py-3.5 rounded-2xl items-center flex-row justify-center"
          >
            <Ionicons name="cloud-download-outline" size={20} color="#38bdf8" />
            <Text className="text-sky-400 text-sm font-bold mr-2">
              {isRestoring ? 'جاري الاستعادة...' : 'استعادة نسخة احتياطية من ملف'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
