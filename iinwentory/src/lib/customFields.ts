// Custom Fields data model.
//
// The server already stores `items.custom_fields` as a flat JSON object and
// uses the top-level `unit` key for the item's unit-of-measure. To stay
// backward-compatible with both that contract AND with rows the Android app
// writes directly via Supabase, we keep the flat shape and store optional
// type metadata in a sidecar `_fieldTypes` object:
//
//   {
//     "unit": "units",                              // server-managed
//     "_fieldTypes": { "Color": "small_text", "Width": "number" },
//     "Color": "Red",
//     "Width": 10
//   }
//
// Fields written by the mobile app without type metadata still render
// correctly — the parser infers the type from the value's runtime shape.

export const FIELD_TYPES = [
  'small_text',
  'large_text',
  'number',
  'checkbox',
  'date',
  'phone',
  'web_link',
  'email',
] as const;

export type CustomFieldType = typeof FIELD_TYPES[number];

export interface CustomField {
  key: string;
  type: CustomFieldType;
  value: string | number | boolean | null;
}

const RESERVED_KEYS = new Set(['unit', '_fieldTypes', '_fieldOrder']);

/**
 * Infer a sensible field type from a runtime value (used when the app wrote
 * a key without recording its type).
 */
function inferType(v: unknown): CustomFieldType {
  if (typeof v === 'boolean') return 'checkbox';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') {
    if (/^https?:\/\//i.test(v)) return 'web_link';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'email';
    if (/^\+?[\d\s\-()]{7,}$/.test(v)) return 'phone';
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
    if (v.length > 80 || v.includes('\n')) return 'large_text';
  }
  return 'small_text';
}

/**
 * Parse the raw customFields JSON blob into an ordered, typed list ready
 * for rendering. Reserved keys (`unit`, `_fieldTypes`, `_fieldOrder`) are
 * stripped out — only user-visible fields are returned.
 */
export function parseCustomFields(raw: unknown): CustomField[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;
  const typesRaw = (obj._fieldTypes && typeof obj._fieldTypes === 'object')
    ? (obj._fieldTypes as Record<string, unknown>)
    : {};
  const orderRaw = Array.isArray(obj._fieldOrder)
    ? (obj._fieldOrder as unknown[]).filter((s): s is string => typeof s === 'string')
    : null;

  const userKeys = Object.keys(obj).filter(k => !RESERVED_KEYS.has(k));
  const orderedKeys = orderRaw
    ? [...orderRaw.filter(k => userKeys.includes(k)), ...userKeys.filter(k => !orderRaw.includes(k))]
    : userKeys;

  return orderedKeys.map(key => {
    const value = obj[key];
    const declaredType = typesRaw[key];
    const type: CustomFieldType =
      typeof declaredType === 'string' && (FIELD_TYPES as readonly string[]).includes(declaredType)
        ? (declaredType as CustomFieldType)
        : inferType(value);
    return {
      key,
      type,
      value: (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        ? value
        : value == null ? null : String(value),
    };
  });
}

/**
 * Serialize an editor's working list back to the storage shape, preserving
 * any reserved keys (especially `unit`) that were on the original blob.
 */
export function serializeCustomFields(
  fields: ReadonlyArray<CustomField>,
  existing: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // preserve reserved keys from the existing blob
  if (existing) {
    for (const k of Object.keys(existing)) {
      if (RESERVED_KEYS.has(k)) out[k] = existing[k];
    }
  }
  const types: Record<string, CustomFieldType> = {};
  for (const f of fields) {
    if (!f.key.trim()) continue;
    if (RESERVED_KEYS.has(f.key)) continue;
    out[f.key] = coerce(f.value, f.type);
    types[f.key] = f.type;
  }
  if (Object.keys(types).length > 0) {
    out._fieldTypes = types;
    out._fieldOrder = fields.map(f => f.key).filter(k => k.trim() && !RESERVED_KEYS.has(k));
  } else if ('_fieldTypes' in out) {
    delete out._fieldTypes;
    delete out._fieldOrder;
  }
  return out;
}

function coerce(value: CustomField['value'], type: CustomFieldType): string | number | boolean | null {
  if (value == null || value === '') return type === 'checkbox' ? false : null;
  if (type === 'checkbox') return Boolean(value);
  if (type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return String(value);
}

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  small_text: 'Small Text',
  large_text: 'Large Text',
  number: 'Number',
  checkbox: 'Checkbox',
  date: 'Date',
  phone: 'Phone Number',
  web_link: 'Web Link',
  email: 'Email',
};
