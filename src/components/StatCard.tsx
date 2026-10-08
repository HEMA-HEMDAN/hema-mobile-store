import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  iconName: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  iconName,
  variant = 'primary',
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

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      activeOpacity={0.7}
      className={`${styles.bg} ${styles.border} border rounded-2xl p-4 shadow-sm`}
    >
      <View className="flex-row justify-between items-center mb-2">
        <View className={`${styles.iconBg} p-2.5 rounded-xl`}>
          <Ionicons name={iconName} size={22} color={styles.iconColor} />
        </View>
        <Text className="text-slate-400 text-xs font-semibold text-right">{title}</Text>
      </View>
      <View className="items-end mt-1">
        <Text className={`${styles.valueColor} text-2xl font-extrabold text-right tracking-tight`}>
          {value}
        </Text>
        {subtitle && (
          <Text className="text-slate-500 text-xs mt-1 text-right">{subtitle}</Text>
        )}
      </View>
    </Container>
  );
};
