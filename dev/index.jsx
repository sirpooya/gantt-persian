import React, { useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { toJalaali } from 'jalaali-js';

// Base styles from SVAR UI packages
import '@svar-ui/react-core/style.css';
import '@svar-ui/react-grid/style.css';
import '@svar-ui/react-editor/style.css';
import '@svar-ui/react-menu/style.css';
import '@svar-ui/react-toolbar/style.css';
import '@svar-ui/react-comments/style.css';
import '@svar-ui/react-tasklist/style.css';

// Custom Jalali calendar styles
import './jalali-styles.css';

// Import directly from SOURCE (no dist build)
import { Gantt, Willow, defaultColumns } from '../src/index.js';

// Persian month names
const persianMonths = [
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
const persianDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

// Get Persian weekday first letter from JavaScript date
function getPersianWeekdayLetter(date) {
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  // Map JS weekday to Persian weekday
  // JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Per: 0=Sat(ش), 1=Sun(ی), 2=Mon(د), 3=Tue(س), 4=Wed(چ), 5=Thu(پ), 6=Fri(ج)
  // Formula: Saturday (6) -> 0, others -> jsDay + 1
  const persianDayIndex = jsDay === 6 ? 0 : jsDay + 1;
  return persianDays[persianDayIndex];
}

// Convert Gregorian date to Jalali and format
function formatJalaliDate(date, format) {
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

// Format Jalali date for columns (e.g., "1405/01/15")
function formatJalaliDateColumn(date) {
  const gregorianDate = new Date(date);
  const jalali = toJalaali(
    gregorianDate.getFullYear(),
    gregorianDate.getMonth() + 1,
    gregorianDate.getDate()
  );
  return `${jalali.jy}/${String(jalali.jm).padStart(2, '0')}/${String(jalali.jd).padStart(2, '0')}`;
}

const tasks = [
  {
    id: 1,
    text: 'My Project',
    start: new Date(2026, 0, 5),
    duration: 10,
    progress: 30,
    parent: 0,
    type: 'summary',
    open: true,
  },
  {
    id: 2,
    text: 'Task A',
    start: new Date(2026, 0, 5),
    duration: 4,
    progress: 60,
    parent: 1,
    type: 'task',
  },
  {
    id: 3,
    text: 'Milestone',
    start: new Date(2026, 0, 10),
    progress: 0,
    parent: 1,
    type: 'milestone',
  },
  {
    id: 4,
    text: 'Task B',
    start: new Date(2026, 0, 11),
    duration: 4,
    progress: 10,
    parent: 1,
    type: 'task',
  },
];

const links = [
  { id: 1, source: 2, target: 3, type: 'e2s' },
  { id: 2, source: 3, target: 4, type: 'e2s' },
];

// Custom scales with Jalali formatting
const scales = [
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

function App() {
  // Custom columns with Jalali date formatting
  const columns = useMemo(() => {
    return defaultColumns.map((col) => {
      if (col.id === 'start' || col.id === 'end') {
        return {
          ...col,
          template: (date) => formatJalaliDateColumn(date),
        };
      }
      return col;
    });
  }, []);

  // Highlight Thursday (پ) and Friday (ج) columns with red tone
  const highlightTime = useCallback((date, unit) => {
    if (unit === 'day') {
      const weekdayLetter = getPersianWeekdayLetter(date);
      // Thursday = پ, Friday = ج
      if (weekdayLetter === 'پ' || weekdayLetter === 'ج') {
        return 'wx-thursday-friday';
      }
    }
    return '';
  }, []);

  // Calculate the end date: one month after the latest task end date
  const endDate = useMemo(() => {
    let maxEndDate = null;

    tasks.forEach((task) => {
      let taskEndDate;
      
      if (task.end) {
        // If task has explicit end date
        taskEndDate = new Date(task.end);
      } else if (task.start && task.duration) {
        // Calculate end from start + duration (in days)
        taskEndDate = new Date(task.start);
        taskEndDate.setDate(taskEndDate.getDate() + task.duration);
      } else if (task.start) {
        // For milestones or tasks without duration, use start date
        taskEndDate = new Date(task.start);
      }

      if (taskEndDate && (!maxEndDate || taskEndDate > maxEndDate)) {
        maxEndDate = taskEndDate;
      }
    });

    if (maxEndDate) {
      // Add one month to the latest end date
      const oneMonthLater = new Date(maxEndDate);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      return oneMonthLater;
    }

    return null;
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      <Willow>
        <Gantt 
          tasks={tasks} 
          links={links} 
          scales={scales}
          columns={columns}
          end={endDate}
          highlightTime={highlightTime}
        />
      </Willow>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


