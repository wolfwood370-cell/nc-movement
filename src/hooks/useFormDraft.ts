import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight per-field auto-save into localStorage.
 *
 * - Reads any existing draft once on mount and exposes it through `draft`.
 * - On every change of `value` writes a JSON snapshot under the given key.
 * - Provides `clear()` to wipe the draft (call after a successful submit).
 *
 * Keys should be unique per (form-type, client-id) to avoid cross-leak,
 * e.g. `nc:fms:<clientId>` or `nc:fcs:new:<clientId>`.
 */
export function useFormDraft<T>(key: string | null, value: T, options?: { debounceMs?: number; enabled?: boolean }) {
  const debounceMs = options?.debounceMs ?? 250;
  const enabled = options?.enabled ?? true;
  const [draft, setDraft] = useState<T | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const loadedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing draft once.
  useEffect(() => {
    if (!key || !enabled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setDraft(JSON.parse(raw) as T);
        setHasDraft(true);
      }
    } catch {
      /* corrupted draft — ignore */
    }
    loadedRef.current = true;
  }, [key, enabled]);

  // Debounced write on every value change.
  useEffect(() => {
    if (!key || !enabled || !loadedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* quota exceeded — silently drop */
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value, debounceMs, enabled]);

  const clear = () => {
    if (!key) return;
    try { localStorage.removeItem(key); } catch { /* noop */ }
    setHasDraft(false);
    setDraft(null);
  };

  const dismiss = () => {
    setHasDraft(false);
    setDraft(null);
  };

  return { draft, hasDraft, clear, dismiss };
}
