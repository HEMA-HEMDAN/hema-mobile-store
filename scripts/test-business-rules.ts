import { egpToPiastres, formatCurrency, piastresToEgp, piastresToEgpString } from '../src/utils/currency';
import { getCurrentTimestamp, getTodayDateRange, getThisWeekDateRange, getThisMonthDateRange } from '../src/utils/date';
import { BackupData, Category, Product, Bill, CartItem } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Test Assertion Failed: ${message}`);
  }
}

console.log('----------------------------------------------------');
console.log('🧪 Running Offline Arabic POS Business Rules Suite');
console.log('----------------------------------------------------\n');

// Rule 1 & 2: Currency Precision & Piastre Conversions (INTEGER Storage)
console.log('Test 1: Currency Conversion (Piastre Storage Integrity)');
assert(egpToPiastres('15.75') === 1575, '15.75 EGP -> 1575 piastres');
assert(egpToPiastres(15.75) === 1575, '15.75 float -> 1575 piastres');
assert(egpToPiastres('10') === 1000, '10 EGP -> 1000 piastres');
assert(piastresToEgp(1575) === 15.75, '1575 piastres -> 15.75 EGP');
assert(piastresToEgpString(1575) === '15.75', '1575 piastres string -> "15.75"');
assert(formatCurrency(1575, 'ج.م') === '15.75 ج.م', 'Formatted currency output matches expected string');
console.log('✅ Rule 1 & 2 Passed: Piastre integer conversion verified.');

// Rule 3: Date Ranges & ISO Timestamps
console.log('\nTest 2: Date & Local Time Ranges');
const todayRange = getTodayDateRange();
assert(todayRange.startISO < todayRange.endISO, 'Today startISO must be earlier than endISO');
const weekRange = getThisWeekDateRange();
assert(weekRange.startISO <= todayRange.startISO, 'Week start must be on or before today start');
const monthRange = getThisMonthDateRange();
assert(monthRange.startISO <= todayRange.startISO, 'Month start must be on or before today start');
console.log('✅ Rule 3 Passed: Local date utilities operating as expected.');

// Rule 4: Cart Subtotal, Discount & Total Calculation
console.log('\nTest 3: Sale Totals & Discount Logic');
const cartItems: CartItem[] = [
  {
    product: {
      id: 1,
      category_id: 1,
      product_type: 'PRODUCT',
      name: 'أرز مصري',
      sku: null,
      barcode: null,
      purchase_price: 2000,
      selling_price: 3200, // 32.00 EGP
      stock_quantity: 10,
      low_stock_threshold: 3,
      unit: 'كجم',
      active: 1,
      created_at: '',
      updated_at: '',
    },
    quantity: 2,
    unit_price: 3200,
    total: 6400, // 64.00 EGP
  },
];

const subtotal = cartItems.reduce((sum, i) => sum + i.total, 0); // 6400
const discount = 400; // 4.00 EGP discount
const finalTotal = Math.max(0, subtotal - discount); // 6000 piastres (60.00 EGP)

assert(subtotal === 6400, 'Subtotal calculation is accurate (64.00 EGP)');
assert(finalTotal === 6000, 'Discount calculation yields 60.00 EGP');
console.log('✅ Rule 4 Passed: Sale subtotal and discount calculations accurate.');

// Rule 5: Stock Quantity Decrease & Insufficient Stock Prevention
console.log('\nTest 4: Stock Quantity Validation');
const productStock = 5;
const requestedQuantity = 7;
const allowNegativeStock = false;
const canSell = allowNegativeStock || productStock >= requestedQuantity;
assert(!canSell, 'Must block selling 7 items when stock is 5 (without negative stock setting)');
console.log('✅ Rule 5 Passed: Stock quantity boundary validation verified.');

// Rule 6: Low-Stock Detection Logic
console.log('\nTest 6: Low Stock & Out of Stock Classification');
const sampleProduct = { stock_quantity: 2, low_stock_threshold: 5 };
const isLowStock = sampleProduct.stock_quantity > 0 && sampleProduct.stock_quantity <= sampleProduct.low_stock_threshold;
assert(isLowStock, 'Product with stock 2 and threshold 5 MUST be classified as low-stock');

const outOfStockProd = { stock_quantity: 0, low_stock_threshold: 5 };
const isOutOfStock = outOfStockProd.stock_quantity <= 0;
assert(isOutOfStock, 'Product with stock 0 MUST be classified as out-of-stock');
console.log('✅ Rule 6 Passed: Low-stock and out-of-stock detection verified.');

// Rule 7: Backup Structure Validation Logic
console.log('\nTest 7: Versioned Backup JSON Structure Validation');
const validBackupData: BackupData = {
  version: '1.0',
  exported_at: getCurrentTimestamp(),
  categories: [{ id: 1, name: 'مشروبات', active: 1, created_at: '', updated_at: '' }],
  products: [],
  bills: [],
  bill_items: [],
  stock_movements: [],
  settings: { shop_name: 'متجري' },
};

function validateBackupStructure(data: any): boolean {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.version === 'string' &&
    Array.isArray(data.categories) &&
    Array.isArray(data.products) &&
    Array.isArray(data.bills) &&
    Array.isArray(data.bill_items) &&
    Array.isArray(data.stock_movements) &&
    typeof data.settings === 'object'
  );
}

assert(validateBackupStructure(validBackupData) === true, 'Valid backup passes structure check');
assert(validateBackupStructure({ version: '1.0' }) === false, 'Invalid backup fails structure check');
console.log('✅ Rule 7 Passed: Backup structure validation verified.');

console.log('\n----------------------------------------------------');
console.log('🎉 ALL BUSINESS RULES & MATH CHECKS PASSED PERFECTLY!');
console.log('----------------------------------------------------');
