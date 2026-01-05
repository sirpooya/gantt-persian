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

// Persian day names (abbreviated - first letter)
// Saturday=0, Sunday=1, Monday=2, Tuesday=3, Wednesday=4, Thursday=5, Friday=6
export const persianDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/**
 * Get Persian weekday first letter from JavaScript date
 * @param {Date} date - JavaScript Date object
 * @returns {string} Persian weekday letter (ش, ی, د, س, چ, پ, ج)
 */
export function getPersianWeekdayLetter(date) {
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  // Map JS weekday to Persian weekday
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Per: 0=Sat(ش), 1=Sun(ی), 2=Mon(د), 3=Tue(س), 4=Wed(چ), 5=Thu(پ), 6=Fri(ج)
  // Formula: Saturday (6) -> 0, others -> jsDay + 1
  const persianDayIndex = jsDay === 6 ? 0 : jsDay + 1;
  return persianDays[persianDayIndex];
}

/**
 * Convert Gregorian date to Jalali and format
 * @param {Date} date - JavaScript Date object
 * @param {string} format - Format string (%F %Y, %j, %M %j)
 * @returns {string} Formatted Jalali date string
 */
export function formatJalaliDate(date, format) {
  const gregorianDate = new Date(date);
  const jalali = toJalaali(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );

  // Format: %F %Y -> Month Name Year (e.g., "فروردین 1405")
  if (format === '%F %Y') {
    return `${persianMonths[jalali.jm - 1]} ${jalali.jy}`;
  }

  // Format: %j -> Day number with weekday letter (e.g., "ش 15")
  if (format === '%j') {
    const weekdayLetter = getPersianWeekdayLetter(gregorianDate);
    return `${weekdayLetter} ${jalali.jd}`;
  }

  // Format: %M %j -> Month Day (e.g., "فروردین 15")
  if (format === '%M %j') {
    return `${persianMonths[jalali.jm - 1]} ${jalali.jd}`;
  }

  // Default: return day number with weekday letter
  const weekdayLetter = getPersianWeekdayLetter(gregorianDate);
  return `${weekdayLetter} ${jalali.jd}`;
}

/**
 * Format Jalali date for columns (e.g., "1405/01/15")
 * @param {Date} date - JavaScript Date object
 * @returns {string} Formatted Jalali date string (YYYY/MM/DD)
 */
export function formatJalaliDateColumn(date) {
  const gregorianDate = new Date(date);
  const jalali = toJalaali(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
  return `${jalali.jy}/${String(jalali.jm).padStart(2, '0')}/${String(jalali.jd).padStart(2, '0')}`;
}

/**
 * Create Jalali scales configuration for Gantt chart
 * @returns {Array} Scales array with Jalali formatting
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
 * Create highlightTime function for Thursday and Friday columns
 * @returns {Function} highlightTime function
 */
export function createJalaliHighlightTime() {
  return (date, unit) => {
    if (unit === 'day') {
      const weekdayLetter = getPersianWeekdayLetter(date);
      // Thursday = پ, Friday = ج
      if (weekdayLetter === 'پ' || weekdayLetter === 'ج') {
        return 'wx-thursday-friday';
      }
    }
    return '';
  };
}

