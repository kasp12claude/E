import { useCallback, useRef, useState } from 'react';

const LIMIT = 200;

/**
 * Angre/gjør om for et dokument.
 * - apply(): fullført endring (legges i historikken)
 * - preview(): midlertidig endring under dra-operasjoner
 * - endPreview(): avslutter dra; legger utgangspunktet i historikken hvis noe endret seg
 */
export function useHistory<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const base = useRef<T | null>(null);
  const presentRef = useRef(present);
  presentRef.current = present;
  const [, force] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  const push = (snapshot: T) => {
    past.current.push(snapshot);
    if (past.current.length > LIMIT) past.current.shift();
    future.current = [];
  };

  const apply = useCallback((next: T | ((cur: T) => T)) => {
    const cur = base.current ?? presentRef.current;
    const value = typeof next === 'function' ? (next as (c: T) => T)(presentRef.current) : next;
    if (value === presentRef.current) return;
    push(cur);
    base.current = null;
    setPreviewing(false);
    presentRef.current = value;
    setPresent(value);
  }, []);

  const preview = useCallback((value: T) => {
    if (base.current === null) base.current = presentRef.current;
    setPreviewing(true);
    presentRef.current = value;
    setPresent(value);
  }, []);

  const endPreview = useCallback(() => {
    if (base.current !== null && base.current !== presentRef.current) push(base.current);
    base.current = null;
    setPreviewing(false);
    force((n) => n + 1);
  }, []);

  const cancelPreview = useCallback(() => {
    if (base.current !== null) {
      presentRef.current = base.current;
      setPresent(base.current);
    }
    base.current = null;
    setPreviewing(false);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(presentRef.current);
    presentRef.current = prev;
    setPresent(prev);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(presentRef.current);
    presentRef.current = next;
    setPresent(next);
  }, []);

  /** Bytter dokument helt (f.eks. når et annet dokument åpnes) */
  const reset = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    base.current = null;
    presentRef.current = value;
    setPresent(value);
  }, []);

  return {
    present,
    presentRef,
    previewing,
    apply,
    preview,
    endPreview,
    cancelPreview,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
