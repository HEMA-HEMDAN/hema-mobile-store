import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '../stores/settingsStore';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showSettings?: boolean;
  showReports?: boolean;
  showCategories?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  showSettings = true,
  showReports = true,
  showCategories = false,
}) => {
  const router = useRouter();
  const shopName = useSettingsStore((state) => state.settings.shop_name);

  return (
    <View className="bg-slate-900 pt-12 pb-4 px-4 flex-row justify-between items-center border-b border-slate-800">
      <View className="flex-row items-center space-x-3 space-x-reverse">
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 rounded-lg bg-slate-800 active:bg-slate-700"
          >
            <Ionicons name="arrow-forward" size={24} color="#f8fafc" />
          </TouchableOpacity>
        )}
        <View>
          <Text className="text-white text-xl font-bold text-right">
            {title || shopName}
          </Text>
          {title && (
            <Text className="text-slate-400 text-xs text-right mt-0.5">
              {shopName}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row items-center space-x-2 space-x-reverse">
        {showCategories && (
          <TouchableOpacity
            onPress={() => router.push('/categories' as any)}
            className="p-2.5 rounded-xl bg-slate-800 active:bg-slate-700 flex-row items-center"
          >
            <Ionicons name="grid-outline" size={20} color="#38bdf8" />
            <Text className="text-sky-400 text-xs font-bold mr-1.5">الفئات</Text>
          </TouchableOpacity>
        )}

        {showReports && (
          <TouchableOpacity
            onPress={() => router.push('/reports' as any)}
            className="p-2.5 rounded-xl bg-slate-800 active:bg-slate-700"
          >
            <Ionicons name="bar-chart-outline" size={20} color="#38bdf8" />
          </TouchableOpacity>
        )}

        {showSettings && (
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            className="p-2.5 rounded-xl bg-slate-800 active:bg-slate-700"
          >
            <Ionicons name="settings-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
