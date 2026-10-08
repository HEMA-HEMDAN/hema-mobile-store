import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../db/database';
import { useSettingsStore } from '../stores/settingsStore';
import '../../global.css';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        await useSettingsStore.getState().loadSettings();
        setIsReady(true);
      } catch (err: any) {
        console.error('Failed to initialize application:', err);
        setError('حدث خطأ أثناء تحميل قاعدة البيانات');
      }
    }
    prepare();
  }, []);

  if (error) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center p-6">
        <Text className="text-rose-500 text-lg font-bold text-center mb-2">
          {error}
        </Text>
        <Text className="text-slate-400 text-sm text-center">
          يرجى إغلاق التطبيق وإعادة فتحه.
        </Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="text-slate-400 text-sm font-semibold mt-4">
          جاري تحميل قاعدة البيانات...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}
