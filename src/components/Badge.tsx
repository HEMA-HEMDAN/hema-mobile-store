import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  stockQuantity: number;
  lowStockThreshold: number;
  unit?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  stockQuantity,
  lowStockThreshold,
  unit = 'قطعة',
}) => {
  if (stockQuantity <= 0) {
    return (
      <View className="bg-rose-950/80 border border-rose-800/80 px-2.5 py-1 rounded-full flex-row items-center">
        <View className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
        <Text className="text-rose-400 text-xs font-bold">نافد ({stockQuantity} {unit})</Text>
      </View>
    );
  }

  if (stockQuantity <= lowStockThreshold) {
    return (
      <View className="bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 rounded-full flex-row items-center">
        <View className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
        <Text className="text-amber-400 text-xs font-bold">منخفض ({stockQuantity} {unit})</Text>
      </View>
    );
  }

  return (
    <View className="bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full flex-row items-center">
      <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
      <Text className="text-emerald-400 text-xs font-bold">{stockQuantity} {unit}</Text>
    </View>
  );
};
