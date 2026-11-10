/** The one number formatter two instruments share: 20.4k-style counts, and the limits that shape them. */
const THOUSAND = 1_000;
const MILLION = 1_000_000;
const DECIMAL_THOUSANDS_LIMIT = 100_000;
const DECIMAL_MILLIONS_LIMIT = 10_000_000;

export function compactCount(count: number): string {
  if (count < THOUSAND) return String(count);
  if (count < DECIMAL_THOUSANDS_LIMIT) return (count / THOUSAND).toFixed(1) + "k";
  if (count < MILLION) return Math.round(count / THOUSAND) + "k";
  if (count < DECIMAL_MILLIONS_LIMIT) return (count / MILLION).toFixed(1) + "M";
  return Math.round(count / MILLION) + "M";
}
