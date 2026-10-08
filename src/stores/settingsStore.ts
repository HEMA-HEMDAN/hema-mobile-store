import { create } from 'zustand';
import { ShopSettings } from '../types';
import { settingsRepository } from '../repositories/settingsRepository';

interface SettingsState {
  settings: ShopSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
}

const defaultSettings: ShopSettings = {
  shop_name: 'القبطان',
  shop_phone: '',
  currency: 'ج.م',
  receipt_footer: 'شكراً لزيارتكم!',
  low_stock_threshold_default: 5,
  allow_negative_stock: false,
  device_id: 'DEVICE-DEFAULT',
  last_sync_at: null,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoading: true,

  loadSettings: async () => {
    try {
      set({ isLoading: true });
      const settings = await settingsRepository.getSettings();
      set({ settings, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings: Partial<ShopSettings>) => {
    await settingsRepository.updateSettings(newSettings);
    const updated = await settingsRepository.getSettings();
    set({ settings: updated });
  },
}));
