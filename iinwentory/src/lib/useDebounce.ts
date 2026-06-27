import { useEffect, useState } from 'react';

/**
 * Returns a value that only updates after `delay` ms of stillness.
 * Use for search/filter inputs to avoid recomputing on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
