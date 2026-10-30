import { defaultProps, getSymbol, symbolBox } from '../library/symbols';

/** Lite ikon av et symbol (bibliotek, læring, lister). */
export function SymbolIcon({ symbolId, size = 40, props, color = 'currentColor' }: { symbolId: string; size?: number; props?: Record<string, string>; color?: string }) {
  const def = getSymbol(symbolId);
  if (!def) return null;
  const pr = props ?? defaultProps(def);
  const b = symbolBox(def, pr);
  const pad = 4;
  const side = Math.max(36, Math.max(b.w, b.h) + pad * 2);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return (
    <svg width={size} height={size} viewBox={`${cx - side / 2} ${cy - side / 2} ${side} ${side}`} style={{ color, flex: 'none' }} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {def.render({ props: pr, paper: 'transparent' })}
      </g>
    </svg>
  );
}
