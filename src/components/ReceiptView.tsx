import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Bill, BillItem, ShopSettings } from '../types';
import { formatCurrency } from '../utils/currency';
import { formatDateArabic } from '../utils/date';

interface ReceiptViewProps {
  bill: Bill;
  items: BillItem[];
  settings: ShopSettings;
  onClose?: () => void;
}

export const ReceiptView: React.FC<ReceiptViewProps> = ({
  bill,
  items,
  settings,
  onClose,
}) => {
  const generateHtml = () => {
    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 6px; border-bottom: 1px dashed #e2e8f0; text-align: right;">${item.product_name}</td>
        <td style="padding: 6px; border-bottom: 1px dashed #e2e8f0; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px; border-bottom: 1px dashed #e2e8f0; text-align: center;">${(item.unit_price / 100).toFixed(2)}</td>
        <td style="padding: 6px; border-bottom: 1px dashed #e2e8f0; text-align: left;">${(item.total / 100).toFixed(2)}</td>
      </tr>
    `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            color: #1e293b;
            direction: rtl;
          }
          .receipt {
            max-width: 380px;
            margin: 0 auto;
            border: 1px solid #cbd5e1;
            padding: 16px;
            border-radius: 8px;
          }
          .header { text-align: center; margin-bottom: 16px; }
          .shop-name { font-size: 20px; font-weight: bold; margin: 0; }
          .shop-phone { font-size: 12px; color: #64748b; margin-top: 4px; }
          .info { font-size: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; border-bottom: 2px solid #334155; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
          th { padding: 6px; border-bottom: 2px solid #334155; font-size: 12px; color: #475569; }
          .totals { font-size: 13px; border-top: 2px solid #334155; padding-top: 8px; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .final-total { font-size: 16px; font-weight: bold; color: #0284c7; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h2 class="shop-name">${settings.shop_name}</h2>
            ${settings.shop_phone ? `<div class="shop-phone">هاتف: ${settings.shop_phone}</div>` : ''}
          </div>
          
          <div class="info">
            <span>فاتورة رقم #${bill.invoice_number}</span>
            <span>${formatDateArabic(bill.created_at)}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: right;">المنتج</th>
                <th style="text-align: center;">الكمية</th>
                <th style="text-align: center;">السعر</th>
                <th style="text-align: left;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="row">
              <span>المجموع الفرعي:</span>
              <span>${(bill.subtotal / 100).toFixed(2)} ${settings.currency}</span>
            </div>
            ${
              bill.discount > 0
                ? `
            <div class="row" style="color: #dc2626;">
              <span>الخصم:</span>
              <span>-${(bill.discount / 100).toFixed(2)} ${settings.currency}</span>
            </div>
            `
                : ''
            }
            <div class="row final-total">
              <span>الإجمالي النهائي:</span>
              <span>${(bill.total / 100).toFixed(2)} ${settings.currency}</span>
            </div>
          </div>

          <div class="footer">
            ${settings.receipt_footer || 'شكراً لزيارتكم!'}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateHtml();
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('خطأ', 'تعذر طباعة الفاتورة');
    }
  };

  const handleShare = async () => {
    try {
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `فاتورة رقم #${bill.invoice_number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('خطأ', 'المشاركة غير متاحة على هذا الجهاز');
      }
    } catch (e: any) {
      Alert.alert('خطأ', 'تعذر مشاركة الفاتورة');
    }
  };

  return (
    <View className="bg-slate-900 flex-1 p-4 rounded-3xl">
      <View className="flex-row justify-between items-center pb-4 border-b border-slate-800">
        <View className="flex-row space-x-2 space-x-reverse">
          <TouchableOpacity
            onPress={handlePrint}
            className="bg-sky-600 px-3 py-2 rounded-xl flex-row items-center"
          >
            <Ionicons name="print-outline" size={18} color="#ffffff" />
            <Text className="text-white text-xs font-bold mr-1.5">طباعة</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            className="bg-slate-800 px-3 py-2 rounded-xl flex-row items-center border border-slate-700"
          >
            <Ionicons name="share-social-outline" size={18} color="#38bdf8" />
            <Text className="text-sky-400 text-xs font-bold mr-1.5">مشاركة</Text>
          </TouchableOpacity>
        </View>

        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            className="bg-slate-800 p-2 rounded-xl border border-slate-700"
          >
            <Ionicons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 my-4 px-2" showsVerticalScrollIndicator={false}>
        {/* Receipt Container */}
        <View className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-lg">
          {/* Shop Header */}
          <View className="items-center pb-4 mb-4 border-b border-dashed border-slate-800">
            <Ionicons name="storefront-outline" size={32} color="#38bdf8" />
            <Text className="text-white text-xl font-extrabold mt-2 text-center">
              {settings.shop_name}
            </Text>
            {settings.shop_phone ? (
              <Text className="text-slate-400 text-xs mt-1 text-center">
                هاتف: {settings.shop_phone}
              </Text>
            ) : null}
          </View>

          {/* Bill Meta */}
          <View className="flex-row justify-between items-center mb-4 bg-slate-900 p-3 rounded-xl">
            <Text className="text-slate-300 text-xs">
              {formatDateArabic(bill.created_at)}
            </Text>
            <Text className="text-sky-400 font-bold text-sm">
              فاتورة رقم #{bill.invoice_number}
            </Text>
          </View>

          {/* Items Header */}
          <View className="flex-row justify-between py-2 border-b border-slate-800 mb-2">
            <Text className="text-slate-400 text-xs font-bold text-right flex-1">
              المنتج
            </Text>
            <Text className="text-slate-400 text-xs font-bold text-center w-12">
              الكمية
            </Text>
            <Text className="text-slate-400 text-xs font-bold text-center w-16">
              السعر
            </Text>
            <Text className="text-slate-400 text-xs font-bold text-left w-20">
              الإجمالي
            </Text>
          </View>

          {/* Items List */}
          {items.map((item) => (
            <View
              key={item.id}
              className="flex-row justify-between items-center py-2.5 border-b border-slate-900"
            >
              <Text className="text-white text-xs font-semibold text-right flex-1 mr-1" numberOfLines={2}>
                {item.product_name}
              </Text>
              <Text className="text-slate-300 text-xs font-bold text-center w-12">
                {item.quantity}
              </Text>
              <Text className="text-slate-400 text-xs text-center w-16">
                {(item.unit_price / 100).toFixed(2)}
              </Text>
              <Text className="text-white text-xs font-bold text-left w-20">
                {formatCurrency(item.total, settings.currency)}
              </Text>
            </View>
          ))}

          {/* Totals Section */}
          <View className="mt-4 pt-3 border-t border-dashed border-slate-800 space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-slate-300 text-xs">
                {formatCurrency(bill.subtotal, settings.currency)}
              </Text>
              <Text className="text-slate-400 text-xs">المجموع الفرعي:</Text>
            </View>

            {bill.discount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-rose-400 text-xs font-bold">
                  -{formatCurrency(bill.discount, settings.currency)}
                </Text>
                <Text className="text-rose-400 text-xs">الخصم:</Text>
              </View>
            )}

            <View className="flex-row justify-between items-center pt-2 border-t border-slate-800 mt-2">
              <Text className="text-sky-400 text-xl font-extrabold">
                {formatCurrency(bill.total, settings.currency)}
              </Text>
              <Text className="text-white font-bold text-sm">الإجمالي النهائي:</Text>
            </View>
          </View>

          {/* Footer Note */}
          <View className="items-center mt-6 pt-4 border-t border-slate-900">
            <Text className="text-slate-400 text-xs text-center">
              {settings.receipt_footer || 'شكراً لزيارتكم!'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
