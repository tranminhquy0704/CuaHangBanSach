// Utilities for robust Vietnamese Dong parsing and formatting

// Parse various price formats (e.g. "119.00", "119,00", "119000", "119.000 đ") to integer VND
export function parseVND(val) {
  if (val === null || val === undefined) return 0;
  const raw = String(val).trim();
  // patterns like "119.00" or "119,00" often mean 119k in scraped data
  const shortDecMatch = raw.match(/^(\d{1,3})[\.,](\d{2})$/);
  if (shortDecMatch) {
    const i = parseInt(shortDecMatch[1], 10);
    return i * 1000;
  }
  // patterns like "475.500,00" or "1.234.000,00" => remove fraction
  const euroMatch = raw.match(/^([\d\.]+),(\d{2})$/);
  if (euroMatch) {
    const intPart = euroMatch[1].replace(/\./g, '');
    if (intPart) return parseInt(intPart, 10);
  }
  // decimal with dot as separator (e.g. "475500.00") => treat as true decimal not thousands
  const decimalDotMatch = raw.match(/^\d+\.\d{1,2}$/);
  if (decimalDotMatch) {
    return Math.round(parseFloat(decimalDotMatch[0]));
  }
  // remove all non-digits
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  let num = parseInt(digits, 10);
  return num;
}

// Format number to "119.000 đ"
export function formatVND(n) {
  const amount = typeof n === 'number' ? n : parseVND(n);
  return new Intl.NumberFormat('vi-VN').format(amount) + '\u00A0đ';
}
