/**
 * Format numeric amount into Indian Rupee (INR) currency representation.
 * Example: 50000 -> "₹50,000.00"
 * 
 * @param {number|string} amount 
 * @param {boolean} [showDecimals=true]
 * @returns {string}
 */
export function formatCurrency(amount, showDecimals = true) {
  const numeric = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(numeric);
}

/**
 * Parses a currency input or string into a clean float value.
 * 
 * @param {string|number} input 
 * @returns {number}
 */
export function parseCurrencyInput(input) {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  const cleaned = input.toString().replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || 0;
}
