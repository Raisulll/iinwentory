export type DatePreset =
  | 'all' | 'today' | 'yesterday' | 'this-week' | 'last-week'
  | 'this-month' | 'last-3-months' | 'last-year' | 'custom';

export interface DateRangeValue {
  preset: DatePreset;
  /** yyyy-mm-dd, only used when preset === 'custom' */
  customStart?: string;
  /** yyyy-mm-dd, only used when preset === 'custom' */
  customEnd?: string;
}

export const DEFAULT_DATE_RANGE: DateRangeValue = { preset: 'all' };

export const PRESET_LABELS: Record<DatePreset, string> = {
  all: 'All time',
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  'last-week': 'Last week',
  'this-month': 'This month',
  'last-3-months': 'Last 3 months',
  'last-year': 'Last year',
  custom: 'Custom date',
};

const DAY = 86400000;

/**
 * Resolve a date range to half-open [startMs, endMs) bounds, or null for
 * "all time" (no filtering). Weeks are Monday-based.
 */
export function dateRangeBounds(value: DateRangeValue): [number, number] | null {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  switch (value.preset) {
    case 'today':
      return [startOfToday, startOfToday + DAY];
    case 'yesterday':
      return [startOfToday - DAY, startOfToday];
    case 'this-week': {
      const diff = (now.getDay() + 6) % 7; // days since Monday
      const start = startOfToday - diff * DAY;
      return [start, start + 7 * DAY];
    }
    case 'last-week': {
      const diff = (now.getDay() + 6) % 7;
      const thisWeekStart = startOfToday - diff * DAY;
      return [thisWeekStart - 7 * DAY, thisWeekStart];
    }
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
      return [start, end];
    }
    case 'last-3-months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).getTime();
      return [start, startOfToday + DAY];
    }
    case 'last-year': {
      const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
      return [start, startOfToday + DAY];
    }
    case 'custom': {
      if (!value.customStart && !value.customEnd) return null;
      const start = value.customStart ? new Date(value.customStart + 'T00:00:00').getTime() : 0;
      // end is inclusive of the chosen day → add a full day to the half-open bound
      const end = value.customEnd ? new Date(value.customEnd + 'T00:00:00').getTime() + DAY : Date.now() + DAY;
      return [start, end];
    }
    case 'all':
    default:
      return null;
  }
}

/** True when `iso` falls inside the selected range (always true for "all time"). */
export function isInDateRange(iso: string | null | undefined, value: DateRangeValue): boolean {
  const bounds = dateRangeBounds(value);
  if (!bounds) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t >= bounds[0] && t < bounds[1];
}
