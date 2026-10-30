import { forwardRef } from 'react';
import type { DrawingDoc } from '../types';
import type { Box } from '../library/types';
import { contentBounds, elementMap, sheetSize } from './geometry';
import { ElementView, JunctionDots, SheetFrame } from './render';
import { junctionDots } from './netlist';

export interface StaticDrawingProps {
  doc: DrawingDoc;
  projectName: string;
  author?: string;
  ink?: string;
  paper?: string;
  /** Maks bredde i CSS (forhåndsvisning) */
  className?: string;
  style?: React.CSSProperties;
  withBackground?: boolean;
}

export function drawingBounds(doc: DrawingDoc): Box {
  if (doc.sheet.show) {
    const s = sheetSize(doc.sheet.size, doc.sheet.orientation);
    return { x: 0, y: 0, w: s.w, h: s.h };
  }
  const b = contentBounds(doc.elements);
  if (!b || b.w === 0) return { x: 0, y: 0, w: 400, h: 300 };
  const pad = 40;
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

/** Ren SVG-visning av en tegning (brukes til eksport, rapport og forhåndsvisning). */
export const StaticDrawing = forwardRef<SVGSVGElement, StaticDrawingProps>(function StaticDrawing(
  { doc, projectName, author = '', ink = '#111827', paper = '#ffffff', className, style, withBackground = true },
  ref,
) {
  const b = drawingBounds(doc);
  const map = elementMap(doc.elements);
  const order = (t: string) => (t === 'wall' ? 0 : t === 'rect' ? 1 : t === 'wire' ? 2 : t === 'dimension' ? 3 : t === 'component' ? 4 : 5);
  const sorted = [...doc.elements].sort((a, c) => order(a.type) - order(c.type));
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}
      width={b.w}
      height={b.h}
      className={className}
      style={{ color: ink, ...style }}
      color={ink}
    >
      {withBackground && <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={paper} />}
      {doc.sheet.show && <SheetFrame doc={doc} projectName={projectName} author={author} />}
      {sorted.map((el) => (
        <ElementView key={el.id} el={el} map={map} opts={{ paper, showTerminals: doc.showTerminals }} />
      ))}
      <JunctionDots dots={junctionDots(doc.elements)} />
    </svg>
  );
});
