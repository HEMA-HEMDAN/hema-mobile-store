import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { formatCurrency } from '../utils/currency';
import { Badge } from './Badge';

interface ProductCardProps {
  product: Product;
  onPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  actionVariant?: 'primary' | 'success' | 'secondary';
  currencySymbol?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onActionPress,
  actionIcon = 'add-circle-outline',
  actionLabel,
  actionVariant = 'primary',
  currencySymbol = 'ج.م',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 mb-3 shadow-sm"
    >
      <View className="flex-row justify-between items-start mb-2">
        {product.product_type === 'SERVICE' ? (
          <View className="bg-violet-950/80 border border-violet-800 rounded-full px-3 py-1">
            <Text className="text-violet-300 text-[10px] font-bold">خدمة</Text>
          </View>
        ) : (
          <Badge
            stockQuantity={product.stock_quantity}
            lowStockThreshold={product.low_stock_threshold}
            unit={product.unit}
          />
        )}
        <View className="items-end flex-1 ml-2">
          <Text className="text-white text-base font-bold text-right mb-0.5">
            {product.name}
          </Text>
          {product.category_name && (
            <Text className="text-slate-400 text-xs text-right">
              {product.category_name}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row justify-between items-center mt-3 pt-2.5 border-t border-slate-700/50">
        {onActionPress ? (
          <TouchableOpacity
            onPress={onActionPress}
            activeOpacity={0.8}
            className={`flex-row items-center px-3 py-2 rounded-xl active:opacity-80 ${
              actionVariant === 'success'
                ? 'bg-emerald-600'
                : actionVariant === 'secondary'
                ? 'bg-slate-700'
                : 'bg-sky-600'
            }`}
          >
            <Ionicons name={actionIcon} size={18} color="#ffffff" />
            {actionLabel && (
              <Text className="text-white text-xs font-bold mr-1.5">{actionLabel}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <View className="items-end">
          <Text className="text-slate-400 text-xs">سعر البيع</Text>
          <Text className="text-sky-400 text-lg font-extrabold">
            {formatCurrency(product.selling_price, currencySymbol)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
