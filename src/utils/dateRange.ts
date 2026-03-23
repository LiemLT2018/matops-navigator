import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import type { DatePresetKey } from '@/types/api';

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export function getDateRange(preset: DatePresetKey): DateRange {
  const now = new Date();

  const toUTC = (d: Date, end: boolean = false): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return end
      ? `${y}-${m}-${day}T23:59:59.999Z`
      : `${y}-${m}-${day}T00:00:00.000Z`;
  };

  switch (preset) {
    case 'today':
      return { fromDate: toUTC(now), toDate: toUTC(now, true) };
    case 'yesterday': {
      const d = subDays(now, 1);
      return { fromDate: toUTC(d), toDate: toUTC(d, true) };
    }
    case 'this_week':
      return { fromDate: toUTC(startOfWeek(now, { weekStartsOn: 1 })), toDate: toUTC(endOfWeek(now, { weekStartsOn: 1 }), true) };
    case 'last_week': {
      const lw = subWeeks(now, 1);
      return { fromDate: toUTC(startOfWeek(lw, { weekStartsOn: 1 })), toDate: toUTC(endOfWeek(lw, { weekStartsOn: 1 }), true) };
    }
    case '7_days':
      return { fromDate: toUTC(subDays(now, 6)), toDate: toUTC(now, true) };
    case 'this_month':
      return { fromDate: toUTC(startOfMonth(now)), toDate: toUTC(endOfMonth(now), true) };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { fromDate: toUTC(startOfMonth(lm)), toDate: toUTC(endOfMonth(lm), true) };
    }
    case 'this_year':
      return { fromDate: toUTC(startOfYear(now)), toDate: toUTC(endOfYear(now), true) };
    case 'last_year': {
      const ly = subYears(now, 1);
      return { fromDate: toUTC(startOfYear(ly)), toDate: toUTC(endOfYear(ly), true) };
    }
  }
}
