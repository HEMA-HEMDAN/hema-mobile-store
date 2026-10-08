/**
 * Formats piastres (integer) to Egyptian Pound currency string with Arabic currency symbol.
 * Example: 1575 -> "15.75 ج.م"
 */
export function formatCurrency(piastres: number, symbol: string = 'ج.م'): string {
  const safePiastres = isNaN(piastres) ? 0 : Math.round(piastres);
  const egp = (safePiastres / 100).toFixed(2);
  return `${egp} ${symbol}`;
}

/**
 * Converts EGP float or input string (e.g. "15.75" or 15.75) to Piastres integer (1575).
 */
export function egpToPiastres(egpInput: string | number): number {
  if (typeof egpInput === 'number') {
    if (isNaN(egpInput)) return 0;
    return Math.round(egpInput * 100);
  }
  if (!egpInput || typeof egpInput !== 'string') return 0;

  // Replace Arabic digits with ASCII digits if typed
  const sanitized = convertArabicToAsciiDigits(egpInput.trim().replace(/,/g, '.'));
  const parsed = parseFloat(sanitized);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Converts Piastres (integer) to EGP number (e.g. 1575 -> 15.75) for inputs.
 */
export function piastresToEgp(piastres: number): number {
  if (isNaN(piastres)) return 0;
  return piastres / 100;
}

/**
 * Converts EGP piastres to string representation for form fields (e.g., 1575 -> "15.75" or 1500 -> "15.00" or "15").
 */
export function piastresToEgpString(piastres: number): string {
  if (isNaN(piastres) || piastres === 0) return '0';
  const val = piastres / 100;
  // If whole integer, return without decimals or with trimmed zero
  return Number.isInteger(val) ? val.toString() : val.toFixed(2);
}

/**
 * Utility to convert Arabic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII numbers (0123456789).
 */
export function convertArabicToAsciiDigits(str: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
}
