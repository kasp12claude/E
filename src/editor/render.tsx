import type { ReactNode } from 'react';
import type { ComponentEl, DimensionEl, DrawingDoc, Element, LineStyle, Pt, RectEl, TextEl, WallEl, WireEl } from '../types';
import { getSymbol } from '../library/symbols';
import { symbolScale, type SimVisual } from '../library/types';
import { componentTransform, dimensionPoints, dist, type ElementMap, polylineLength, resolveWire, sheetSize, terminalsOf, textSize } from './geometry';
import { modeName, DOC_KIND_LABEL } from '../store/factories';

export function dashArray(style: LineStyle, width = 2): string | undefined {
  const w = Math.max(1, width);
  switch (style) {
    case 'dashed':
      return `${w * 4} ${w * 3}`;
    case 'dotted':
      return `${w} ${w * 2}`;
    case 'dashdot':
      return `${w * 6} ${w * 2} ${w} ${w * 2}`;
    default:
      return undefined;
  }
}

export interface RenderOptions {
  paper: string;
  showTerminals: boolean;
  /** Vis terminalprikker for tilkobling (kun i redigering) */
  interactive?: boolean;
  sim?: Record<string, SimVisual>;
  /** Farge per ledning (simulering) */
  wireColors?: Record<string, string>;
  /** Ekstra etikett under komponenter (simulering) */
  componentNotes?: Record<string, string>;
}

const FONT = 'Inter, "Segoe UI", Arial, sans-serif';

function ComponentView({ el, opts }: { el: ComponentEl; opts: RenderOptions }) {
  const def = getSymbol(el.symbolId);
  if (!def) {
    return (
      <g transform={`translate(${el.x} ${el.y})`}>
        <rect x={-15} y={-15} width={30} height={30} fill="none" stroke="#ef4444" strokeDasharray="3 3" />
        <text fontSize={8} fill="#ef4444" textAnchor="middle" y={3}>
          ?
        </text>
      </g>
    );
  }
  const color = el.color || 'currentColor';
  const terms = terminalsOf(el);
  const bx = typeof def.box === 'function' ? def.box(el.props) : def.box;
  const sc = symbolScale(def);
  // Etikett plasseres til høyre for symbolet (i verdens-koordinater, ikke rotert)
  const r = ((el.rot % 360) + 360) % 360;
  const halfW = ((r === 90 || r === 270 ? bx.h : bx.w) / 2) * sc;
  const labelSize = sc > 1 ? 18 : 11;
  const summary = def.summary?.(el.props);
  const note = opts.componentNotes?.[el.id];
  const showLabel = el.showLabel !== false && (el.label || summary);
  return (
    <g>
      <g transform={componentTransform(el)} style={{ color }} fill="none" stroke="currentColor" strokeWidth={sc > 1 ? 1.4 : 2} strokeLinecap="round" strokeLinejoin="round">
        {def.render({ props: el.props, sim: opts.sim?.[el.id], paper: opts.paper })}
      </g>
      {showLabel && (
        <text x={el.x + halfW + 6} y={el.y - (summary ? 4 : 0)} fontSize={labelSize} fontFamily={FONT} fill={el.color || 'currentColor'} dominantBaseline="middle" fontWeight={600}>
          {el.label}
          {summary && (
            <tspan x={el.x + halfW + 6} dy={el.label ? labelSize * 1.2 : 0} fontSize={labelSize * 0.82} fontWeight={400} opacity={0.8}>
              {summary}
            </tspan>
          )}
        </text>
      )}
      {note && (
        <text x={el.x + halfW + 6} y={el.y + 24} fontSize={9.5} fontFamily={FONT} fill="#38bdf8" fontWeight={600}>
          {note}
        </text>
      )}
      {opts.showTerminals &&
        terms.map((t) =>
          t.name ? (
            <text
              key={t.id}
              x={t.x + (t.vertical ? 4 : 0)}
              y={t.y + (t.vertical ? (t.y < el.y ? 8 : -6) : -5)}
              fontSize={7.5}
              fontFamily={FONT}
              fill="currentColor"
              opacity={0.75}
              textAnchor={t.vertical ? 'start' : 'middle'}
            >
              {t.name}
            </text>
          ) : null,
        )}
    </g>
  );
}

function WireView({ el, map, opts }: { el: WireEl; map: ElementMap; opts: RenderOptions }) {
  const pts = resolveWire(el, map);
  if (pts.length < 2) return null;
  const color = opts.wireColors?.[el.id] || el.color || 'currentColor';
  const d = pts.map((p) => `${p.x},${p.y}`).join(' ');
  let label: ReactNode = null;
  if (el.wireNo) {
    // Ledningsnummer midt på lengste segment
    let best = 0;
    let bi = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = dist(pts[i], pts[i + 1]);
      if (l > best) {
        best = l;
        bi = i;
      }
    }
    const a = pts[bi];
    const b = pts[bi + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const vertical = Math.abs(a.x - b.x) < Math.abs(a.y - b.y);
    label = (
      <text
        x={mx + (vertical ? 5 : 0)}
        y={my + (vertical ? 0 : -5)}
        fontSize={9}
        fontFamily={FONT}
        fill={color}
        stroke="none"
        textAnchor={vertical ? 'start' : 'middle'}
        dominantBaseline={vertical ? 'middle' : 'auto'}
      >
        {el.wireNo}
      </text>
    );
  }
  return (
    <g>
      <polyline
        points={d}
        fill="none"
        stroke={color}
        strokeWidth={el.width}
        strokeDasharray={dashArray(el.lineStyle, el.width)}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {label}
    </g>
  );
}

function TextView({ el }: { el: TextEl }) {
  const lines = el.text.split('\n');
  const color = el.color || 'currentColor';
  const weight = el.bold || el.variant === 'heading' || el.variant === 'room' ? 700 : 400;
  const s = textSize(el.text, el.size);
  return (
    <g>
      {el.variant === 'note' && (
        <rect x={el.x - 6} y={el.y - el.size - 2} width={s.w + 12} height={s.h + 8} fill="rgba(250,204,21,0.12)" stroke="#eab308" strokeWidth={1} rx={3} />
      )}
      <text x={el.x} y={el.y} fontSize={el.size} fontFamily={FONT} fill={color} fontWeight={weight}>
        {lines.map((l, i) => (
          <tspan key={i} x={el.x} dy={i === 0 ? 0 : el.size * 1.3}>
            {l || ' '}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function WallView({ el }: { el: WallEl }) {
  const pts = el.closed ? [...el.points, el.points[0]] : el.points;
  return (
    <polyline
      points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke={el.color || 'currentColor'}
      strokeOpacity={0.85}
      strokeWidth={el.thickness}
      strokeLinejoin="miter"
      strokeLinecap="square"
    />
  );
}

export function formatLength(units: number) {
  // 1 tegneenhet = 1 cm i plantegning
  return `${(units / 100).toFixed(2).replace('.', ',')} m`;
}

function DimensionView({ el }: { el: DimensionEl }) {
  const [a, b] = dimensionPoints(el.a, el.b, el.offset);
  const len = dist(el.a, el.b);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const flipText = ang > 90 || ang < -90;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const color = el.color || 'currentColor';
  const tick = (p: Pt) => {
    const r = ((ang + 45) * Math.PI) / 180;
    return <line x1={p.x - Math.cos(r) * 5} y1={p.y - Math.sin(r) * 5} x2={p.x + Math.cos(r) * 5} y2={p.y + Math.sin(r) * 5} />;
  };
  return (
    <g stroke={color} strokeWidth={1} fill="none">
      <line x1={el.a.x} y1={el.a.y} x2={a.x} y2={a.y} strokeOpacity={0.6} />
      <line x1={el.b.x} y1={el.b.y} x2={b.x} y2={b.y} strokeOpacity={0.6} />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      {tick(a)}
      {tick(b)}
      <text
        x={mx}
        y={my}
        transform={`rotate(${flipText ? ang + 180 : ang} ${mx} ${my}) translate(0 -5)`}
        fontSize={16}
        fontFamily={FONT}
        fill={color}
        stroke="none"
        textAnchor="middle"
      >
        {formatLength(len)}
      </text>
    </g>
  );
}

function RectView({ el }: { el: RectEl }) {
  const x = Math.min(el.x, el.x + el.w);
  const y = Math.min(el.y, el.y + el.h);
  const w = Math.abs(el.w);
  const h = Math.abs(el.h);
  const color = el.color || 'currentColor';
  return (
    <g>
      {el.roomName === undefined && <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray={dashArray(el.lineStyle, 1.5)} />}
      {el.roomName !== undefined && (
        <text x={x + w / 2} y={y + h / 2} fontSize={28} fontFamily={FONT} fill={color} textAnchor="middle" fontWeight={700}>
          {el.roomName}
          <tspan x={x + w / 2} dy={30} fontSize={22} fontWeight={400}>
            {((w * h) / 10000).toFixed(1).replace('.', ',')} m²
          </tspan>
        </text>
      )}
    </g>
  );
}

export function ElementView({ el, map, opts }: { el: Element; map: ElementMap; opts: RenderOptions }) {
  switch (el.type) {
    case 'component':
      return <ComponentView el={el} opts={opts} />;
    case 'wire':
      return <WireView el={el} map={map} opts={opts} />;
    case 'text':
      return <TextView el={el} />;
    case 'wall':
      return <WallView el={el} />;
    case 'dimension':
      return <DimensionView el={el} />;
    case 'rect':
      return <RectView el={el} />;
  }
}

/** Tegningsramme med tittelfelt og rutereferanser. */
export function SheetFrame({ doc, projectName, author }: { doc: DrawingDoc; projectName: string; author: string }) {
  const { w, h } = sheetSize(doc.sheet.size, doc.sheet.orientation);
  const m = 40;
  const cols = doc.sheet.orientation === 'landscape' ? 8 : 6;
  const rows = doc.sheet.orientation === 'landscape' ? 6 : 8;
  const cw = (w - 2 * m) / cols;
  const rh = (h - 2 * m) / rows;
  const tbW = 720;
  const tbH = 150;
  const tx = w - m - tbW;
  const ty = h - m - tbH;
  const type = doc.kind === 'schematic' ? modeName(doc.mode) : DOC_KIND_LABEL[doc.kind];
  const date = new Date(doc.updatedAt).toLocaleDateString('nb-NO');
  const cell = (x: number, y: number, wd: number, ht: number, label: string, value: string, big = false) => (
    <g>
      <rect x={x} y={y} width={wd} height={ht} />
      <text x={x + 8} y={y + 16} fontSize={10} stroke="none" fill="currentColor" opacity={0.65} fontFamily={FONT}>
        {label}
      </text>
      <text x={x + 8} y={y + ht - 12} fontSize={big ? 22 : 15} stroke="none" fill="currentColor" fontWeight={big ? 700 : 500} fontFamily={FONT}>
        {value}
      </text>
    </g>
  );
  return (
    <g fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.9}>
      <rect x={m / 2} y={m / 2} width={w - m} height={h - m} strokeWidth={0.6} />
      <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} strokeWidth={2} />
      {Array.from({ length: cols }).map((_, i) => (
        <g key={`c${i}`}>
          {i > 0 && <line x1={m + i * cw} y1={m / 2} x2={m + i * cw} y2={m} />}
          {i > 0 && <line x1={m + i * cw} y1={h - m} x2={m + i * cw} y2={h - m / 2} />}
          <text x={m + i * cw + cw / 2} y={m * 0.78} fontSize={12} textAnchor="middle" stroke="none" fill="currentColor" fontFamily={FONT}>
            {i + 1}
          </text>
          <text x={m + i * cw + cw / 2} y={h - m * 0.3} fontSize={12} textAnchor="middle" stroke="none" fill="currentColor" fontFamily={FONT}>
            {i + 1}
          </text>
        </g>
      ))}
      {Array.from({ length: rows }).map((_, i) => (
        <g key={`r${i}`}>
          {i > 0 && <line x1={m / 2} y1={m + i * rh} x2={m} y2={m + i * rh} />}
          {i > 0 && <line x1={w - m} y1={m + i * rh} x2={w - m / 2} y2={m + i * rh} />}
          <text x={m * 0.75} y={m + i * rh + rh / 2} fontSize={12} textAnchor="middle" stroke="none" fill="currentColor" fontFamily={FONT}>
            {String.fromCharCode(65 + i)}
          </text>
          <text x={w - m * 0.75} y={m + i * rh + rh / 2} fontSize={12} textAnchor="middle" stroke="none" fill="currentColor" fontFamily={FONT}>
            {String.fromCharCode(65 + i)}
          </text>
        </g>
      ))}
      <g strokeWidth={1.5}>
        {cell(tx, ty, 420, 60, 'Prosjekt', projectName, true)}
        {cell(tx + 420, ty, 300, 60, 'Type', type)}
        {cell(tx, ty + 60, 420, 50, 'Tegning', doc.name)}
        {cell(tx + 420, ty + 60, 150, 50, 'Dato', date)}
        {cell(tx + 570, ty + 60, 150, 50, 'Ark', '1 / 1')}
        {cell(tx, ty + 110, 420, 40, 'Tegnet av', author || '–')}
        {cell(tx + 420, ty + 110, 300, 40, 'Program', 'ElektroStudio')}
      </g>
      {doc.taskText && (
        <g>
          <rect x={m + 20} y={m + 20} width={560} height={Math.max(60, doc.taskText.split('\n').length * 18 + 34)} strokeWidth={1.5} />
          <text x={m + 32} y={m + 42} fontSize={14} stroke="none" fill="currentColor" fontWeight={700} fontFamily={FONT}>
            Øvingsoppgave
          </text>
          <text x={m + 32} y={m + 62} fontSize={12} stroke="none" fill="currentColor" fontFamily={FONT}>
            {doc.taskText.split('\n').map((l, i) => (
              <tspan key={i} x={m + 32} dy={i === 0 ? 0 : 18}>
                {l}
              </tspan>
            ))}
          </text>
        </g>
      )}
    </g>
  );
}

export function JunctionDots({ dots, color }: { dots: Pt[]; color?: string }) {
  return (
    <g fill={color || 'currentColor'}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={3.5} />
      ))}
    </g>
  );
}

export function wireLengthUnits(el: WireEl, map: ElementMap) {
  return polylineLength(resolveWire(el, map));
}
