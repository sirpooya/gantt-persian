import { toJalaali } from 'jalaali-js';

// Persian month names
export const persianMonths = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Persian weekday first letters (Shanbeh..Jomeh)
// شنبه، یکشنبه، دوشنبه، سه‌شنبه، چهارشنبه، پنجشنبه، جمعه
export const persianDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Map JS Date.getDay() (0=Sun..6=Sat) into Persian weekday index:
 * - Saturday -> 0 (ش)
 * - Sunday   -> 1 (ی)
 * - Monday   -> 2 (د)
 * - Tuesday  -> 3 (س)
 * - Wednesday-> 4 (چ)
 * - Thursday -> 5 (پ)
 * - Friday   -> 6 (ج)
 */
export function getPersianWeekdayLetter(date) {
  const d = date instanceof Date ? date : new Date(date);
  const jsDay = d.getDay();
  const persianIndex = jsDay === 6 ? 0 : jsDay + 1;
  return persianDays[persianIndex] || '';
}

/**
 * Internal: format a Date with a small subset of strftime-like tokens used by the gantt timescale.
 * Supported:
 * - %F %Y : "MonthName Year" (Jalali)
 * - %j    : "weekdayLetter dayNumber" (e.g. "ش 15")
 * - %d    : day number
 * - %m    : month number (01-12)
 * - %Y    : year
 */
export function formatJalaliDate(date, format) {
  const g = date instanceof Date ? new Date(date) : new Date(date);
  if (Number.isNaN(g.getTime())) return '';

  const j = toJalaali(g.getFullYear(), g.getMonth() + 1, g.getDate());

  if (format === '%F %Y') {
    return `${persianMonths[j.jm - 1]} ${j.jy}`;
  }

  if (format === '%j') {
    return `${getPersianWeekdayLetter(g)} ${j.jd}`;
  }

  // Minimal token replacements (fallback)
  const pad2 = (n) => String(n).padStart(2, '0');
  return String(format)
    .replaceAll('%Y', String(j.jy))
    .replaceAll('%m', pad2(j.jm))
    .replaceAll('%d', String(j.jd));
}

/**
 * Column helper: date -> "weekdayLetter day"
 * Used for day columns / headers where you want "ش 15".
 */
export function formatJalaliDateColumn(date) {
  return formatJalaliDate(date, '%j');
}

/**
 * Create Jalali scales (month row + day row).
 * This matches the Gantt `scales` prop shape.
 */
export function createJalaliScales() {
  return [
    {
      unit: 'month',
      step: 1,
      format: (date) => formatJalaliDate(date, '%F %Y'),
    },
    {
      unit: 'day',
      step: 1,
      format: (date) => formatJalaliDate(date, '%j'),
    },
  ];
}

/**
 * Highlight Thursday (پ) and Friday (ج) columns with a CSS class.
 * Hooked via Gantt `highlightTime` prop.
 */
export function createJalaliHighlightTime() {
  return (date, unit) => {
    if (unit !== 'day') return '';
    const w = getPersianWeekdayLetter(date);
    if (w === 'پ' || w === 'ج') return 'wx-thursday-friday';
    return '';
  };
}

