import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  density?: 'normal' | 'compact';
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  iconName,
  variant = 'primary',
  density = 'compact',
  onPress,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-emerald-950/40',
          border: 'border-emerald-800/50',
          iconBg: 'bg-emerald-900/60',
          iconColor: '#34d399',
          valueColor: 'text-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/40',
          border: 'border-amber-800/50',
          iconBg: 'bg-amber-900/60',
          iconColor: '#fbbf24',
          valueColor: 'text-amber-400',
        };
      case 'danger':
        return {
          bg: 'bg-rose-950/40',
          border: 'border-rose-800/50',
          iconBg: 'bg-rose-900/60',
          iconColor: '#f87171',
          valueColor: 'text-rose-400',
        };
      case 'info':
        return {
          bg: 'bg-purple-950/40',
          border: 'border-purple-800/50',
          iconBg: 'bg-purple-900/60',
          iconColor: '#c084fc',
          valueColor: 'text-purple-400',
        };
      default:
        return {
          bg: 'bg-sky-950/40',
          border: 'border-sky-800/50',
          iconBg: 'bg-sky-900/60',
          iconColor: '#38bdf8',
          valueColor: 'text-sky-400',
        };
    }
  };

  const styles = getVariantStyles();
  const isCompact = density === 'compact';

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.7}
      className={`${styles.bg} ${styles.border} border rounded-2xl ${isCompact ? 'p-3' : 'p-4'} shadow-sm`}
    >
      <View className={`flex-row justify-between items-center ${isCompact ? 'mb-1.5' : 'mb-2'}`}>
        <View className={`${styles.iconBg} ${isCompact ? 'p-1.5 rounded-lg' : 'p-2.5 rounded-xl'}`}>
          <Ionicons name={iconName} size={isCompact ? 18 : 22} color={styles.iconColor} />
        </View>
        <Text
          className={`text-slate-400 font-semibold text-right ${isCompact ? 'text-[11px] flex-1 ml-1.5' : 'text-xs'}`}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      <View className="items-end mt-0.5">
        <Text
          className={`${styles.valueColor} font-extrabold text-right tracking-tight ${isCompact ? 'text-lg' : 'text-2xl'}`}
          numberOfLines={1}
        >
          {value}
        </Text>
        {subtitle && (
          <Text className={`text-slate-500 text-right ${isCompact ? 'text-[10px] mt-0.5' : 'text-xs mt-1'}`}>
            {subtitle}
          </Text>
        )}
      </View>
    </Container>
  );
};
