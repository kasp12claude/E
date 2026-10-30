import { useCallback, useState } from 'react';

const KEY = 'elektrostudio-learn-progress';

export interface Score {
  correct: number;
  total: number;
}

export function loadProgress(): Record<string, Score> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(p: Record<string, Score>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* lagring utilgjengelig – fremgangen gjelder bare denne økten */
  }
}

/** Poengteller per læringsmodul, lagret i nettleseren. */
export function useScore(moduleId: string) {
  const [score, setScore] = useState<Score>(() => loadProgress()[moduleId] ?? { correct: 0, total: 0 });
  const record = useCallback(
    (ok: boolean) => {
      setScore((s) => {
        const next = { correct: s.correct + (ok ? 1 : 0), total: s.total + 1 };
        saveProgress({ ...loadProgress(), [moduleId]: next });
        return next;
      });
    },
    [moduleId],
  );
  const reset = useCallback(() => {
    const p = loadProgress();
    delete p[moduleId];
    saveProgress(p);
    setScore({ correct: 0, total: 0 });
  }, [moduleId]);
  return { score, record, reset };
}

// Tilfeldighet ------------------------------------------------------------
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
