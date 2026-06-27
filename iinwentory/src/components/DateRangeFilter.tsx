import { Calendar } from 'lucide-react';
import { PRESET_LABELS } from '../lib/dateRange';
import type { DatePreset, DateRangeValue } from '../lib/dateRange';

/**
 * Compact date-range filter — a preset dropdown plus inline start/end date
 * inputs that appear only when "Custom date" is selected. Reused across every
 * Reports subsection. Range helpers live in ../lib/dateRange.
 */
export default function DateRangeFilter({ value, onChange }: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <Calendar size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
        <select
          className="input"
          value={value.preset}
          onChange={e => onChange({ ...value, preset: e.target.value as DatePreset })}
          style={{ paddingLeft: 32, paddingRight: 24, fontSize: 12.5, width: 'auto', cursor: 'pointer' }}
        >
          {(Object.keys(PRESET_LABELS) as DatePreset[]).map(p => (
            <option key={p} value={p}>{PRESET_LABELS[p]}</option>
          ))}
        </select>
      </div>
      {value.preset === 'custom' && (
        <>
          <input
            type="date"
            className="input"
            value={value.customStart ?? ''}
            max={value.customEnd || undefined}
            onChange={e => onChange({ ...value, customStart: e.target.value })}
            style={{ fontSize: 12.5, width: 'auto' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
          <input
            type="date"
            className="input"
            value={value.customEnd ?? ''}
            min={value.customStart || undefined}
            onChange={e => onChange({ ...value, customEnd: e.target.value })}
            style={{ fontSize: 12.5, width: 'auto' }}
          />
        </>
      )}
    </div>
  );
}
