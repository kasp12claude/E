import type { ReactNode } from 'react';
import type { Element, Pt } from '../../types';
import type { SimVisual } from '../../library/types';
import { contentBounds, elementMap } from '../../editor/geometry';
import { ElementView, JunctionDots } from '../../editor/render';
import { junctionDots } from '../../editor/netlist';

export interface TestPoint {
  id: string;
  label: string;
  pt: Pt;
}

/**
 * Viser en krets (som StaticDrawing), men med simuleringstilstand
 * (lamper som lyser, kontakter som er lukket) og valgfrie målepunkter.
 */
export function SimDrawing({
  elements,
  sim,
  showTerminals = false,
  testPoints,
  highlight,
  maxHeight = 320,
  onTestPointClick,
  children,
}: {
  onTestPointClick?: (id: string) => void;
  elements: Element[];
  sim?: Record<string, SimVisual>;
  showTerminals?: boolean;
  testPoints?: TestPoint[];
  highlight?: string[];
  maxHeight?: number;
  children?: ReactNode;
}) {
  const b = contentBounds(elements) ?? { x: 0, y: 0, w: 300, h: 200 };
  const pad = 36;
  const vb = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2 + 40, h: b.h + pad * 2 };
  const map = elementMap(elements);
  const order = (t: string) => (t === 'wire' ? 0 : t === 'component' ? 1 : 2);
  const sorted = [...elements].sort((a, c) => order(a.type) - order(c.type));
  return (
    <svg
      className="learn-drawing"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      style={{ color: '#d6e4ff', maxHeight, width: '100%' }}
      role="img"
      aria-label="Kretsskjema"
    >
      {sorted.map((el) => (
        <ElementView key={el.id} el={el} map={map} opts={{ paper: 'transparent', showTerminals, sim }} />
      ))}
      <JunctionDots dots={junctionDots(elements)} />
      {testPoints?.map((tp) => {
        const on = highlight?.includes(tp.id);
        return (
          <g
            key={tp.id}
            onClick={onTestPointClick ? () => onTestPointClick(tp.id) : undefined}
            style={onTestPointClick ? { cursor: 'pointer' } : undefined}
          >
            {onTestPointClick && <circle cx={tp.pt.x} cy={tp.pt.y} r={11} fill="transparent" />}
            <circle cx={tp.pt.x} cy={tp.pt.y} r={5} fill={on ? '#f59e0b' : '#3b82f6'} stroke="#0a1020" strokeWidth={1.5} />
            <text x={tp.pt.x - 8} y={tp.pt.y - 8} fontSize={11} fontWeight={700} fill={on ? '#fbbf24' : '#93c5fd'} textAnchor="end">
              {tp.label}
            </text>
          </g>
        );
      })}
      {children}
    </svg>
  );
}
