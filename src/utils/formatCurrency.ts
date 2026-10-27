/**
 * Formats a monetary number into Indian Rupee format according to standard Indian grouping.
 * Shows no decimal digits unless fractional paise exist.
 * e.g., 1780 => "₹1,780", 1980.5 => "₹1,980.50"
 */
export function formatINR(amount: number): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const hasPaise = Math.abs(num % 1) >= 0.005;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(num);
}
