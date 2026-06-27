import { useState } from 'react';
import {
  Type as TypeIcon, AlignLeft, Hash, CheckSquare, Calendar as CalIcon,
  Phone, Link as LinkIcon, AtSign, Plus, X, Trash2,
} from 'lucide-react';
import {
  FIELD_TYPES, FIELD_TYPE_LABELS,
  type CustomField, type CustomFieldType,
} from '../lib/customFields';

const TYPE_ICON: Record<CustomFieldType, typeof TypeIcon> = {
  small_text: TypeIcon,
  large_text: AlignLeft,
  number: Hash,
  checkbox: CheckSquare,
  date: CalIcon,
  phone: Phone,
  web_link: LinkIcon,
  email: AtSign,
};

interface Props {
  fields: ReadonlyArray<CustomField>;
  onChange: (next: CustomField[]) => void;
  /** Maximum number of fields allowed (plan limit). 0 / undefined = unlimited. */
  max?: number;
}

export default function CustomFieldsEditor({ fields, onChange, max }: Props) {
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [namingType, setNamingType] = useState<CustomFieldType | null>(null);
  const [newName, setNewName] = useState('');
  const atLimit = !!max && fields.length >= max;

  const update = (idx: number, patch: Partial<CustomField>) => {
    const next = fields.map((f, i) => i === idx ? { ...f, ...patch } : f);
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(fields.filter((_, i) => i !== idx));
  };

  const startAdd = (type: CustomFieldType) => {
    setTypePickerOpen(false);
    setNamingType(type);
    setNewName('');
  };

  const confirmAdd = () => {
    if (!namingType || !newName.trim()) return;
    if (fields.some(f => f.key.toLowerCase() === newName.trim().toLowerCase())) {
      alert('A field with that name already exists.');
      return;
    }
    const initial: CustomField = {
      key: newName.trim(),
      type: namingType,
      value: namingType === 'checkbox' ? false : '',
    };
    onChange([...fields, initial]);
    setNamingType(null);
    setNewName('');
  };

  return (
    <div className="cf-editor">
      {fields.length === 0 && !atLimit && (
        <div className="cf-empty">
          No custom fields yet. Add one to capture details specific to this item.
        </div>
      )}

      {fields.map((f, idx) => {
        const Icon = TYPE_ICON[f.type];
        return (
          <div key={`${f.key}-${idx}`} className="cf-row">
            <div className="cf-row-head">
              <Icon size={13} strokeWidth={2.0} className="cf-row-icon" />
              <span className="cf-row-label" title={FIELD_TYPE_LABELS[f.type]}>{f.key}</span>
              <button type="button" className="cf-row-remove" onClick={() => remove(idx)} title="Remove field" aria-label={`Remove ${f.key}`}>
                <Trash2 size={13} strokeWidth={2.0} />
              </button>
            </div>
            <FieldValueInput field={f} onChange={v => update(idx, { value: v })} />
          </div>
        );
      })}

      <button
        type="button"
        className="cf-add"
        onClick={() => setTypePickerOpen(true)}
        disabled={atLimit}
        title={atLimit ? `Plan limit: ${max} custom fields per item` : undefined}
      >
        <Plus size={14} strokeWidth={2.2} /> Add Custom Field
        {max ? <span className="cf-add-count">{fields.length}/{max}</span> : null}
      </button>

      {/* Type picker — matches the app's "Choose Field Type" sheet */}
      {typePickerOpen && (
        <div className="cf-modal-overlay" onClick={() => setTypePickerOpen(false)}>
          <div className="cf-modal" onClick={e => e.stopPropagation()}>
            <div className="cf-modal-head">
              <h3>Choose Field Type</h3>
              <button type="button" onClick={() => setTypePickerOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="cf-type-list">
              {FIELD_TYPES.map(t => {
                const Icon = TYPE_ICON[t];
                return (
                  <button key={t} type="button" className="cf-type-row" onClick={() => startAdd(t)}>
                    <Icon size={16} strokeWidth={2.0} className="cf-type-icon" />
                    <span>{FIELD_TYPE_LABELS[t]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Name prompt after type is chosen */}
      {namingType && (
        <div className="cf-modal-overlay" onClick={() => setNamingType(null)}>
          <div className="cf-modal cf-modal-small" onClick={e => e.stopPropagation()}>
            <div className="cf-modal-head">
              <h3>Name this {FIELD_TYPE_LABELS[namingType]} field</h3>
              <button type="button" onClick={() => setNamingType(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <input
              autoFocus
              className="input"
              placeholder="e.g. Colour, Supplier, Warranty"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); }}
              style={{ marginBottom: 12 }}
            />
            <div className="cf-modal-actions">
              <button type="button" className="btn-outline" onClick={() => setNamingType(null)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={confirmAdd} disabled={!newName.trim()}>
                <Plus size={14} /> Add field
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cf-editor { display: flex; flex-direction: column; gap: 10px; }
        .cf-empty {
          padding: 12px 14px;
          background: var(--surface-raised);
          border: 1px dashed var(--border-color);
          border-radius: 10px;
          color: var(--text-muted);
          font-size: 12.5px;
        }

        .cf-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px 12px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          animation: cf-row-in .22s var(--ease) both;
        }
        @keyframes cf-row-in {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cf-row-head {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cf-row-icon { color: var(--primary); flex-shrink: 0; }
        .cf-row-label {
          flex: 1;
          font-weight: 700;
          font-size: 12.5px;
          color: var(--text-dark);
          letter-spacing: -0.005em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cf-row-remove {
          width: 26px; height: 26px;
          display: inline-flex;
          align-items: center; justify-content: center;
          background: transparent;
          border: 0;
          border-radius: 6px;
          color: var(--text-faint);
          cursor: pointer;
          transition: background .15s var(--ease), color .15s var(--ease);
        }
        .cf-row-remove:hover { background: rgba(220,38,38,0.10); color: #B91C1C; }

        .cf-add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: color-mix(in srgb, var(--primary) 8%, transparent);
          border: 1.5px dashed color-mix(in srgb, var(--primary) 40%, var(--border-color));
          border-radius: 10px;
          color: var(--primary);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background .15s var(--ease), border-color .15s var(--ease);
        }
        .cf-add:hover:not(:disabled) {
          background: color-mix(in srgb, var(--primary) 14%, transparent);
          border-color: var(--primary);
        }
        .cf-add:disabled { opacity: 0.5; cursor: not-allowed; }
        .cf-add-count {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-faint);
          margin-left: 4px;
        }

        .cf-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: cf-fade-in .18s var(--ease) both;
        }
        @keyframes cf-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .cf-modal {
          width: min(420px, 92vw);
          background: var(--card-bg);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 24px 60px -16px rgba(15, 23, 42, 0.4);
          animation: cf-pop .22s var(--ease-spring) both;
        }
        .cf-modal-small { width: min(360px, 92vw); }
        @keyframes cf-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cf-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .cf-modal-head h3 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -0.015em; }
        .cf-modal-head button {
          background: transparent; border: 0; color: var(--text-muted); cursor: pointer;
          padding: 4px; border-radius: 6px;
        }
        .cf-modal-head button:hover { background: var(--surface-raised); color: var(--text-dark); }

        .cf-type-list { display: flex; flex-direction: column; gap: 4px; }
        .cf-type-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px;
          background: var(--surface-raised);
          border: 1px solid transparent;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-dark);
          text-align: left;
          cursor: pointer;
          transition: background .12s var(--ease), border-color .12s var(--ease);
        }
        .cf-type-row:hover {
          background: color-mix(in srgb, var(--primary) 8%, var(--surface-raised));
          border-color: color-mix(in srgb, var(--primary) 30%, var(--border-color));
        }
        .cf-type-icon { color: var(--primary); }

        .cf-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
      `}</style>
    </div>
  );
}

interface ValueInputProps {
  field: CustomField;
  onChange: (v: CustomField['value']) => void;
}

function FieldValueInput({ field, onChange }: ValueInputProps) {
  const val = field.value;
  if (field.type === 'large_text') {
    return (
      <textarea
        className="input"
        rows={3}
        placeholder="Value"
        value={typeof val === 'string' ? val : ''}
        onChange={e => onChange(e.target.value)}
        style={{ resize: 'vertical' }}
      />
    );
  }
  if (field.type === 'checkbox') {
    const checked = !!val;
    return (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-medium)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
        />
        {checked ? 'Yes' : 'No'}
      </label>
    );
  }
  if (field.type === 'number') {
    return (
      <input
        className="input"
        type="number"
        placeholder="0"
        value={val == null ? '' : String(val)}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    );
  }
  const htmlType =
    field.type === 'date' ? 'date'
    : field.type === 'phone' ? 'tel'
    : field.type === 'web_link' ? 'url'
    : field.type === 'email' ? 'email'
    : 'text';
  const placeholder =
    field.type === 'date'     ? 'YYYY-MM-DD'
    : field.type === 'phone'    ? '+44 7700 900000'
    : field.type === 'web_link' ? 'https://example.com'
    : field.type === 'email'    ? 'name@example.com'
    : 'Value';
  return (
    <input
      className="input"
      type={htmlType}
      placeholder={placeholder}
      value={typeof val === 'string' ? val : val == null ? '' : String(val)}
      onChange={e => onChange(e.target.value)}
    />
  );
}
