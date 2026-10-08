import { create } from 'zustand';
import { CartItem, Product } from '../types';

interface CartState {
  items: CartItem[];
  discount: number; // in piastres
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  setDiscount: (piastres: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,

  addItem: (product: Product, quantity = 1) => {
    if (quantity <= 0) return;
    const items = get().items;
    const existingIndex = items.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + quantity;
      const unitPrice = updated[existingIndex].unit_price;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        total: Math.round(unitPrice * newQty),
      };
      set({ items: updated });
    } else {
      const unitPrice = product.selling_price;
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            unit_price: unitPrice,
            total: Math.round(unitPrice * quantity),
          },
        ],
      });
    }
  },

  removeItem: (productId: number) => {
    set({ items: get().items.filter((i) => i.product.id !== productId) });
  },

  updateQuantity: (productId: number, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const items = get().items.map((item) => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity,
          total: Math.round(item.unit_price * quantity),
        };
      }
      return item;
    });

    set({ items });
  },

  setDiscount: (piastres: number) => {
    set({ discount: Math.max(0, Math.round(piastres)) });
  },

  clearCart: () => {
    set({ items: [], discount: 0 });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.total, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().discount;
    return Math.max(0, subtotal - discount);
  },
}));
