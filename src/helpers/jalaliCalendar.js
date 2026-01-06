import { toJalaali, toGregorian, jalaaliMonthLength } from 'jalaali-js';
import { registerScaleUnit } from '@svar-ui/gantt-store';

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

function toPersianDigits(input) {
  const s = String(input ?? '');
  const map = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return s.replace(/[0-9]/g, (d) => map[d.charCodeAt(0) - 48] || d);
}

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
    return `${getPersianWeekdayLetter(g)} ${toPersianDigits(j.jd)}`;
  }

  // Jalali day-of-month number only (01..31) as Persian digits (used for timescale day row)
  if (format === '%J') {
    return toPersianDigits(j.jd);
  }

  // Minimal token replacements (fallback)
  const pad2 = (n) => String(n).padStart(2, '0');
  return String(format)
    .replaceAll('%Y', String(j.jy))
    .replaceAll('%m', pad2(j.jm))
    .replaceAll('%d', toPersianDigits(j.jd));
}

/**
 * Column helper: date -> "weekdayLetter day"
 * Used for day columns / headers where you want "ش 15".
 */
export function formatJalaliDateColumn(date) {
  return formatJalaliDate(date, '%j');
}

let jalaliUnitsRegistered = false;
function ensureJalaliUnitsRegistered() {
  if (jalaliUnitsRegistered) return;
  jalaliUnitsRegistered = true;

  // A Jalali month unit that aligns boundaries to Persian months (not Gregorian months).
  registerScaleUnit('jmonth', {
    start: (date) => {
      const d = date instanceof Date ? new Date(date) : new Date(date);
      const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const g = toGregorian(j.jy, j.jm, 1);
      return new Date(g.gy, g.gm - 1, g.gd, 0, 0, 0, 0);
    },
    end: (date) => {
      const d = date instanceof Date ? new Date(date) : new Date(date);
      const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const last = jalaaliMonthLength(j.jy, j.jm);
      const g = toGregorian(j.jy, j.jm, last);
      return new Date(g.gy, g.gm - 1, g.gd, 23, 59, 59, 999);
    },
    isSame: (a, b) => {
      const d1 = a instanceof Date ? a : new Date(a);
      const d2 = b instanceof Date ? b : new Date(b);
      const j1 = toJalaali(d1.getFullYear(), d1.getMonth() + 1, d1.getDate());
      const j2 = toJalaali(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
      return j1.jy === j2.jy && j1.jm === j2.jm;
    },
    add: (date, num) => {
      const d = date instanceof Date ? new Date(date) : new Date(date);
      const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      let jm = j.jm + num;
      let jy = j.jy;
      while (jm > 12) {
        jm -= 12;
        jy += 1;
      }
      while (jm < 1) {
        jm += 12;
        jy -= 1;
      }
      const g = toGregorian(jy, jm, 1);
      return new Date(g.gy, g.gm - 1, g.gd, 0, 0, 0, 0);
    },
    diff: (a, b) => {
      const d1 = a instanceof Date ? a : new Date(a);
      const d2 = b instanceof Date ? b : new Date(b);
      const j1 = toJalaali(d1.getFullYear(), d1.getMonth() + 1, d1.getDate());
      const j2 = toJalaali(d2.getFullYear(), d2.getMonth() + 1, d2.getDate());
      return (j1.jy - j2.jy) * 12 + (j1.jm - j2.jm);
    },
    smallerCount: {
      day: (date) => {
        const d = date instanceof Date ? new Date(date) : new Date(date);
        const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return jalaaliMonthLength(j.jy, j.jm);
      },
      hour: (date) => {
        const d = date instanceof Date ? new Date(date) : new Date(date);
        const j = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return jalaaliMonthLength(j.jy, j.jm) * 24;
      },
    },
  });
}

/**
 * Create Jalali scales (month row + day row).
 * This matches the Gantt `scales` prop shape.
 */
export function createJalaliScales() {
  ensureJalaliUnitsRegistered();
  return [
    {
      unit: 'jmonth',
      step: 1,
      format: (date) => formatJalaliDate(date, '%F %Y'),
    },
    {
      unit: 'day',
      step: 1,
      // Weekday first letter + day-of-month (e.g. "پ ۳") under the Persian month header
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

