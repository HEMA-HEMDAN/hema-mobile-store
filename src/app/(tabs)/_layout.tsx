import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../../stores/cartStore';

export default function TabsLayout() {
  const cartItemsCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const insets = useSafeAreaInsets();

  // On phones with gesture navigation insets.bottom = 0, on phones with nav buttons it's > 0
  const tabBarHeight = 65 + insets.bottom;
  const tabBarPaddingBottom = Math.max(8, insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          title: 'البيع',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons
                name={focused ? 'cart' : 'cart-outline'}
                size={24}
                color={color}
              />
              {cartItemsCount > 0 && (
                <View className="absolute -top-1 -right-2.5 bg-sky-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-extrabold">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'الفواتير',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'المنتجات',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'pricetags' : 'pricetags-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'المخزون',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'layers' : 'layers-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
