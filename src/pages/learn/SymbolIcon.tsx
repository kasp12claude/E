import { defaultProps, getSymbol, symbolBox } from '../../library/symbols';

/** Viser et symbol fra biblioteket i en liten SVG. */
export function SymbolIcon({ id, size = 72, props }: { id: string; size?: number; props?: Record<string, string> }) {
  const def = getSymbol(id);
  if (!def) return null;
  const pr = { ...defaultProps(def), ...props };
  const b = symbolBox(def, pr);
  const pad = 8;
  const vb = `${b.x - pad} ${b.y - pad} ${b.w + pad * 2} ${b.h + pad * 2}`;
  return (
    <svg viewBox={vb} width={size} height={size} style={{ color: 'var(--canvas-ink)', display: 'block' }} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {def.render({ props: pr, paper: 'transparent' })}
      </g>
    </svg>
  );
}
