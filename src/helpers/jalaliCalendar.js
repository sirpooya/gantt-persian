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

// Persian weekday first letters (Saturday -> Friday)
export const persianDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function getPersianWeekdayLetter(date) {
  const d = new Date(date);
  const jsDay = d.getDay(); // 0=Sunday .. 6=Saturday
  const persianIndex = jsDay === 6 ? 0 : jsDay + 1;
  return persianDays[persianIndex] || '';
}

export function formatJalaliDate(date, format) {
  const g = new Date(date);
  const j = toJalaali(g.getFullYear(), g.getMonth() + 1, g.getDate());

  if (format === '%F %Y') {
    return `${persianMonths[j.jm - 1]} ${j.jy}`;
  }
  if (format === '%j') {
    return `${getPersianWeekdayLetter(g)} ${j.jd}`;
  }
  if (format === '%Y/%m/%d') {
    const mm = String(j.jm).padStart(2, '0');
    const dd = String(j.jd).padStart(2, '0');
    return `${j.jy}/${mm}/${dd}`;
  }

  return `${getPersianWeekdayLetter(g)} ${j.jd}`;
}

// Used by grid columns which pass value (often Date/string)
export function formatJalaliDateColumn(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return formatJalaliDate(d, '%Y/%m/%d');
}

export function createJalaliScales() {
  return [
    { unit: 'month', step: 1, format: (date) => formatJalaliDate(date, '%F %Y') },
    { unit: 'day', step: 1, format: (date) => formatJalaliDate(date, '%j') },
  ];
}

export function createJalaliHighlightTime() {
  return (date, unit) => {
    if (unit === 'day') {
      const letter = getPersianWeekdayLetter(date);
      if (letter === 'پ' || letter === 'ج') return 'wx-thursday-friday';
    }
    return '';
  };
}


