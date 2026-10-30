import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ComponentEl, DrawingDoc, Element, Pt, TermRef, WallEl, WireEl, WireKind } from '../types';
import { getSymbol } from '../library/symbols';
import { componentTransform, dist, elementBounds, elementMap, resolveWire, sheetSize, snapPt, terminalsOf, type WorldTerminal, distToSeg, onSegmentInterior } from './geometry';
import { ElementView, JunctionDots, SheetFrame, type RenderOptions } from './render';
import { junctionDots } from './netlist';
import { addElements, createComponent, moveElements, nextFreeSlot, orthoPoints, simplifyPoints, updateElement, withElements } from './ops';
import type { ToolId } from './tools';
import { uid } from '../utils/id';

export interface View {
  x: number;
  y: number;
  zoom: number;
}

export interface SimOverlay {
  active: boolean;
  opts: Partial<RenderOptions>;
  extraSvg?: ReactNode;
  onComponentDown: (el: ComponentEl) => void;
  onComponentUp: (el: ComponentEl) => void;
}

export interface CanvasProps {
  doc: DrawingDoc;
  projectName: string;
  author: string;
  apply: (d: DrawingDoc | ((d: DrawingDoc) => DrawingDoc)) => void;
  preview: (d: DrawingDoc) => void;
  endPreview: () => void;
  selection: string[];
  setSelection: (ids: string[]) => void;
  tool: ToolId;
  setTool: (t: ToolId) => void;
  placing: string | null;
  setPlacing: (s: string | null) => void;
  view: View;
  setView: (v: View | ((v: View) => View)) => void;
  grid: number;
  snap: boolean;
  ortho: boolean;
  showGrid: boolean;
  theme: 'dark' | 'light';
  wireColor: string;
  issues: Pt[];
  sim?: SimOverlay;
  onTextCreated: (id: string) => void;
  onCursor: (p: Pt | null) => void;
  onSize: (s: { w: number; h: number }) => void;
  spaceDown: boolean;
  /** Teller som økes for å avbryte pågående tegning (Esc) */
  cancelSignal: number;
  finishSignal: number;
}

type DraftKind = WireKind | 'wall';
interface Draft {
  kind: DraftKind;
  points: Pt[];
  start?: TermRef;
  verticalFirst: boolean;
  returnToSelect?: boolean;
}

type Drag =
  | { type: 'pan'; sx: number; sy: number; view: View }
  | { type: 'move'; start: Pt; base: DrawingDoc; ids: Set<string>; moved: boolean; clickedId: string; wasSelected: boolean; shift: boolean }
  | { type: 'marquee'; a: Pt; add: boolean }
  | { type: 'rect'; a: Pt }
  | { type: 'vertex'; id: string; index: number; base: DrawingDoc };

const THEMES = {
  dark: { bg: '#0b1322', paper: '#0f1a30', ink: '#d6e4ff', minor: 'rgba(130,160,220,0.08)', major: 'rgba(130,160,220,0.2)' },
  light: { bg: '#dfe5ee', paper: '#ffffff', ink: '#1e293b', minor: 'rgba(30,41,59,0.07)', major: 'rgba(30,41,59,0.16)' },
};

const ACCENT = '#3b82f6';

export function Canvas(p: CanvasProps) {
  const { doc, view, grid } = p;
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [marquee, setMarquee] = useState<{ a: Pt; b: Pt } | null>(null);
  const [rectDraft, setRectDraft] = useState<{ a: Pt; b: Pt } | null>(null);
  const [dimA, setDimA] = useState<Pt | null>(null);
  const drag = useRef<Drag | null>(null);
  const pressed = useRef<ComponentEl | null>(null);
  const lastDown = useRef<{ t: number; x: number; y: number } | null>(null);
  const colors = THEMES[p.theme];
  const map = useMemo(() => elementMap(doc.elements), [doc.elements]);
  const terminals = useMemo(() => {
    const out: (WorldTerminal & { el: string })[] = [];
    for (const e of doc.elements) if (e.type === 'component') for (const t of terminalsOf(e)) out.push({ ...t, el: e.id });
    return out;
  }, [doc.elements]);
  const dots = useMemo(() => junctionDots(doc.elements), [doc.elements]);
  const selected = useMemo(() => new Set(p.selection), [p.selection]);
  const simActive = !!p.sim?.active;
  const wiresAllowed = doc.kind !== 'floorplan';

  useLayoutEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      p.onSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avbryt/avslutt fra tastatur (styres av Editor)
  useEffect(() => {
    setDraft(null);
    setDimA(null);
    setRectDraft(null);
  }, [p.cancelSignal]);
  useEffect(() => {
    if (p.finishSignal) finishDraft(draft, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.finishSignal]);
  useEffect(() => {
    if (p.tool !== 'dimension') setDimA(null);
    if (draft && !['wire', 'line', 'cable', 'wall', 'select'].includes(p.tool)) setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.tool]);

  // Zoom med musehjul (ikke-passiv lytter for å kunne hindre siderulling)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      if (e.ctrlKey || !e.shiftKey) {
        p.setView((v) => {
          const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
          const zoom = Math.min(8, Math.max(0.08, v.zoom * factor));
          return { zoom, x: sx - ((sx - v.x) * zoom) / v.zoom, y: sy - ((sy - v.y) * zoom) / v.zoom };
        });
      } else {
        p.setView((v) => ({ ...v, x: v.x - e.deltaY }));
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.zoom, y: (e.clientY - r.top - view.y) / view.zoom };
  };
  const snapP = (pt: Pt) => (p.snap ? snapPt(pt, grid) : pt);
  const nearTerminal = (pt: Pt, exclude?: TermRef) => {
    const radius = Math.max(6, 12 / view.zoom);
    let best: (WorldTerminal & { el: string }) | null = null;
    let bd = radius;
    for (const t of terminals) {
      if (exclude && t.el === exclude.el && t.id === exclude.t) continue;
      const d = dist(t, pt);
      if (d < bd) {
        bd = d;
        best = t;
      }
    }
    return best;
  };
  const wireAt = (pt: Pt, excludeId?: string) => {
    for (const e of doc.elements) {
      if (e.type !== 'wire' || e.kind !== 'wire' || e.id === excludeId) continue;
      const pts = resolveWire(e, map);
      for (let i = 0; i < pts.length - 1; i++) if (distToSeg(pt, pts[i], pts[i + 1]) < 0.5) return e;
    }
    return null;
  };

  // ------------------------------------------------------------------
  // Tegning av ledninger, streker, kabler og vegger
  // ------------------------------------------------------------------
  function finishDraft(d: Draft | null, end?: { pt: Pt; ref?: TermRef }) {
    if (!d) return;
    let pts = [...d.points];
    if (end) {
      const last = pts[pts.length - 1];
      const useOrtho = p.ortho && d.kind !== 'line';
      pts.push(...(useOrtho ? orthoPoints(last, end.pt, d.verticalFirst) : [end.pt]));
    }
    pts = simplifyPoints(pts);
    setDraft(null);
    if (d.returnToSelect) p.setTool('select');
    if (pts.length < 2) return;
    if (d.kind === 'wall') {
      const closed = pts.length > 3 && dist(pts[0], pts[pts.length - 1]) < 1;
      const wall: WallEl = { id: uid('wall'), type: 'wall', points: closed ? pts.slice(0, -1) : pts, thickness: 15, closed };
      p.apply((doc) => addElements(doc, [wall]));
      return;
    }
    if (end?.ref && d.start && end.ref.el === d.start.el && end.ref.t === d.start.t) return;
    const wire: WireEl = {
      id: uid('w'),
      type: 'wire',
      kind: d.kind,
      points: pts,
      start: d.start,
      end: end?.ref,
      lineStyle: d.kind === 'cable' ? 'dashed' : 'solid',
      width: d.kind === 'line' ? 1.5 : 2,
      color: d.kind === 'cable' ? '#f97316' : p.wireColor || undefined,
    };
    p.apply((doc) => addElements(doc, [wire]));
    p.setSelection([wire.id]);
  }

  function draftClick(kind: DraftKind, w: Pt, s: Pt, detail: number, returnToSelect = false) {
    const term = kind === 'wire' || kind === 'cable' ? nearTerminal(w) : null;
    const pt = term ? { x: term.x, y: term.y } : s;
    if (!draft) {
      setDraft({
        kind,
        points: [pt],
        start: term ? { el: term.el, t: term.id } : undefined,
        verticalFirst: term ? term.vertical : false,
        returnToSelect,
      });
      return;
    }
    if (detail >= 2) {
      // Dobbeltklikk: avslutt der vi er (punktet ble lagt inn ved første klikk)
      finishDraft(draft);
      return;
    }
    if (term) {
      finishDraft(draft, { pt, ref: { el: term.el, t: term.id } });
      return;
    }
    if (kind === 'wire' && wireAt(pt)) {
      finishDraft(draft, { pt });
      return;
    }
    if (kind === 'wall' && draft.points.length > 2 && dist(pt, draft.points[0]) < 1) {
      finishDraft(draft, { pt });
      return;
    }
    const last = draft.points[draft.points.length - 1];
    if (dist(last, pt) < 0.5) return;
    const useOrtho = p.ortho && kind !== 'line';
    const add = useOrtho ? orthoPoints(last, pt, draft.verticalFirst) : [pt];
    const all = [...draft.points, ...add];
    const a = all[all.length - 2];
    const b = all[all.length - 1];
    const lastVertical = Math.abs(a.x - b.x) < 0.5;
    setDraft({ ...draft, points: all, verticalFirst: !lastVertical });
  }

  // ------------------------------------------------------------------
  // Pekerhendelser
  // ------------------------------------------------------------------
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const w = toWorld(e);
    const s = snapP(w);
    const target = e.target as globalThis.Element;
    // Egen dobbeltklikk-deteksjon (PointerEvent.detail er ikke pålitelig i alle nettlesere)
    const now = performance.now();
    const ld = lastDown.current;
    const clicks = ld && now - ld.t < 400 && Math.hypot(ld.x - e.clientX, ld.y - e.clientY) < 6 ? 2 : 1;
    lastDown.current = clicks === 2 ? null : { t: now, x: e.clientX, y: e.clientY };
    if (e.button === 1 || (e.button === 0 && (p.spaceDown || p.tool === 'pan'))) {
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);
      drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, view };
      return;
    }
    if (e.button !== 0) return;
    const elG = target.closest('[data-id]');
    const elId = elG?.getAttribute('data-id') ?? null;

    if (simActive) {
      const el = elId ? map.get(elId) : undefined;
      if (el?.type === 'component') {
        pressed.current = el;
        p.sim!.onComponentDown(el);
      } else {
        svgRef.current?.setPointerCapture(e.pointerId);
        drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, view };
      }
      return;
    }

    if (p.placing) {
      const comp = createComponent(p.placing, s, doc.elements);
      if (comp) {
        p.apply((d) => addElements(d, [comp]));
        p.setSelection([comp.id]);
      }
      if (!e.shiftKey) p.setPlacing(null);
      return;
    }

    switch (p.tool) {
      case 'wire':
      case 'line':
      case 'cable':
      case 'wall':
        draftClick(p.tool, w, s, clicks);
        return;
      case 'dimension':
        if (!dimA) setDimA(s);
        else {
          if (dist(dimA, s) > 0.5) {
            const dim = { id: uid('dim'), type: 'dimension' as const, a: dimA, b: s, offset: -30 };
            p.apply((d) => addElements(d, [dim]));
          }
          setDimA(null);
        }
        return;
      case 'rect':
      case 'room':
        svgRef.current?.setPointerCapture(e.pointerId);
        drag.current = { type: 'rect', a: s };
        setRectDraft({ a: s, b: s });
        return;
      case 'text':
      case 'heading':
      case 'note': {
        const t = {
          id: uid('t'),
          type: 'text' as const,
          x: s.x,
          y: s.y,
          text: p.tool === 'heading' ? 'Overskrift' : p.tool === 'note' ? 'Forklaring' : 'Tekst',
          size: p.tool === 'heading' ? 24 : p.tool === 'note' ? 12 : 14,
          variant: p.tool,
        };
        p.apply((d) => addElements(d, [t]));
        p.setSelection([t.id]);
        p.setTool('select');
        p.onTextCreated(t.id);
        return;
      }
      default:
        break;
    }

    // Velg-verktøy
    if (draft) {
      draftClick(draft.kind, w, s, clicks, draft.returnToSelect);
      return;
    }
    const termEl = target.closest('[data-term]');
    if (termEl && wiresAllowed) {
      draftClick('wire', w, s, 1, true);
      return;
    }
    const vertexEl = target.closest('[data-vertex]');
    if (vertexEl) {
      const [id, idx] = vertexEl.getAttribute('data-vertex')!.split(':');
      svgRef.current?.setPointerCapture(e.pointerId);
      drag.current = { type: 'vertex', id, index: Number(idx), base: doc };
      return;
    }
    if (elId) {
      const wasSelected = selected.has(elId);
      let ids: string[];
      if (e.shiftKey) ids = wasSelected ? p.selection.filter((i) => i !== elId) : [...p.selection, elId];
      else ids = wasSelected ? p.selection : [elId];
      p.setSelection(ids);
      svgRef.current?.setPointerCapture(e.pointerId);
      drag.current = { type: 'move', start: w, base: doc, ids: new Set(ids), moved: false, clickedId: elId, wasSelected, shift: e.shiftKey };
      return;
    }
    svgRef.current?.setPointerCapture(e.pointerId);
    drag.current = { type: 'marquee', a: w, add: e.shiftKey };
    setMarquee({ a: w, b: w });
    if (!e.shiftKey) p.setSelection([]);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const w = toWorld(e);
    setCursor(w);
    p.onCursor(w);
    const d = drag.current;
    if (!d) return;
    switch (d.type) {
      case 'pan':
        p.setView({ ...d.view, x: d.view.x + e.clientX - d.sx, y: d.view.y + e.clientY - d.sy });
        break;
      case 'move': {
        let dx = w.x - d.start.x;
        let dy = w.y - d.start.y;
        if (p.snap) {
          dx = Math.round(dx / grid) * grid;
          dy = Math.round(dy / grid) * grid;
        }
        if (!d.moved && Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        d.moved = true;
        p.preview(moveElements(d.base, d.ids, dx, dy));
        break;
      }
      case 'marquee':
        setMarquee({ a: d.a, b: w });
        break;
      case 'rect':
        setRectDraft({ a: d.a, b: snapP(w) });
        break;
      case 'vertex': {
        const el = d.base.elements.find((x) => x.id === d.id);
        if (!el) return;
        let pt = snapP(w);
        if (el.type === 'wire') {
          const isEnd = d.index === 0 || d.index === el.points.length - 1;
          const t = isEnd && el.kind !== 'line' ? nearTerminal(w) : null;
          if (t) pt = { x: t.x, y: t.y };
          const pts = [...resolveWire({ ...el, points: el.points }, elementMap(d.base.elements))];
          // resolveWire kan legge til et knekkpunkt for 2-punkts ledninger; bruk lagrede punkter
          const stored = el.points.map((q, i) => (i === 0 && el.start ? pts[0] : i === el.points.length - 1 && el.end ? pts[pts.length - 1] : q));
          stored[d.index] = pt;
          const patch: Partial<WireEl> = { points: stored };
          if (d.index === 0) patch.start = t ? { el: t.el, t: t.id } : undefined;
          if (d.index === el.points.length - 1) patch.end = t ? { el: t.el, t: t.id } : undefined;
          p.preview(updateElement(d.base, d.id, patch));
        } else if (el.type === 'wall') {
          const pts = [...el.points];
          pts[d.index] = pt;
          p.preview(updateElement(d.base, d.id, { points: pts }));
        } else if (el.type === 'dimension') {
          p.preview(updateElement(d.base, d.id, d.index === 0 ? { a: pt } : { b: pt }));
        }
        break;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (pressed.current) {
      p.sim?.onComponentUp(pressed.current);
      pressed.current = null;
    }
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignorer */
    }
    if (!d) return;
    switch (d.type) {
      case 'move':
        if (d.moved) p.endPreview();
        else if (d.wasSelected && !d.shift && p.selection.length > 1) p.setSelection([d.clickedId]);
        break;
      case 'vertex':
        p.endPreview();
        break;
      case 'marquee': {
        const m = marquee;
        setMarquee(null);
        if (!m) break;
        const box = { x: Math.min(m.a.x, m.b.x), y: Math.min(m.a.y, m.b.y), w: Math.abs(m.a.x - m.b.x), h: Math.abs(m.a.y - m.b.y) };
        if (box.w * view.zoom < 4 && box.h * view.zoom < 4) break;
        const hits = doc.elements
          .filter((el) => {
            const b = elementBounds(el, map);
            return b.x >= box.x && b.y >= box.y && b.x + b.w <= box.x + box.w && b.y + b.h <= box.y + box.h;
          })
          .map((el) => el.id);
        p.setSelection(d.add ? [...new Set([...p.selection, ...hits])] : hits);
        break;
      }
      case 'rect': {
        const r = rectDraft;
        setRectDraft(null);
        if (!r) break;
        const x = Math.min(r.a.x, r.b.x);
        const y = Math.min(r.a.y, r.b.y);
        const w = Math.abs(r.a.x - r.b.x);
        const h = Math.abs(r.a.y - r.b.y);
        if (w < grid || h < grid) break;
        if (p.tool === 'room') {
          const roomNo = doc.elements.filter((el) => el.type === 'rect' && el.roomName !== undefined).length + 1;
          const wall: WallEl = {
            id: uid('wall'),
            type: 'wall',
            points: [
              { x, y },
              { x: x + w, y },
              { x: x + w, y: y + h },
              { x, y: y + h },
            ],
            thickness: 15,
            closed: true,
          };
          const room = { id: uid('room'), type: 'rect' as const, x, y, w, h, lineStyle: 'solid' as const, roomName: `Rom ${roomNo}` };
          p.apply((dd) => addElements(dd, [wall, room]));
          p.setSelection([room.id]);
          p.setTool('select');
        } else {
          const rect = { id: uid('r'), type: 'rect' as const, x, y, w, h, lineStyle: 'dashed' as const };
          p.apply((dd) => addElements(dd, [rect]));
          p.setSelection([rect.id]);
        }
        break;
      }
      default:
        break;
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (simActive || p.tool !== 'select' || draft) return;
    const target = e.target as globalThis.Element;
    const id = target.closest('[data-id]')?.getAttribute('data-id');
    if (!id) return;
    const el = map.get(id);
    if (el?.type === 'text') p.onTextCreated(id);
    if (el?.type === 'wire') {
      // Legg inn nytt knekkpunkt der det ble dobbeltklikket
      const w = snapP(toWorld(e));
      const pts = resolveWire(el, map);
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSeg(w, pts[i], pts[i + 1]) < 8 / view.zoom) {
          const stored = [...pts];
          stored.splice(i + 1, 0, w);
          p.apply((d) => updateElement(d, id, { points: stored }));
          break;
        }
      }
    }
  };

  const onDrop = (e: React.DragEvent) => {
    const symbolId = e.dataTransfer.getData('application/x-elektro-symbol');
    if (!symbolId || simActive) return;
    e.preventDefault();
    const at = doc.placement === 'auto' ? nextFreeSlot(doc, symbolId) : snapP(toWorld(e));
    const comp = createComponent(symbolId, at, doc.elements);
    if (comp) {
      p.apply((d) => addElements(d, [comp]));
      p.setSelection([comp.id]);
    }
  };

  // ------------------------------------------------------------------
  // Tegning
  // ------------------------------------------------------------------
  const vis = { x: -view.x / view.zoom, y: -view.y / view.zoom, w: size.w / view.zoom, h: size.h / view.zoom };
  const sheet = doc.sheet.show ? sheetSize(doc.sheet.size, doc.sheet.orientation) : null;
  const majorEvery = doc.kind === 'floorplan' ? 10 : 5;
  const showMinor = grid * view.zoom >= 6;
  const opts: RenderOptions = {
    paper: sheet ? colors.paper : colors.bg,
    showTerminals: doc.showTerminals,
    ...(p.sim?.opts ?? {}),
  };
  const order = (t: string) => (t === 'wall' ? 0 : t === 'rect' ? 1 : t === 'wire' ? 2 : t === 'dimension' ? 3 : t === 'component' ? 4 : 5);
  const sorted = useMemo(() => [...doc.elements].sort((a, b) => order(a.type) - order(b.type)), [doc.elements]);
  const hs = 1 / view.zoom; // størrelse som skal være konstant på skjermen

  const cursorSnap = cursor ? snapP(cursor) : null;
  const hoverTerm = cursor && (p.tool === 'wire' || p.tool === 'cable' || draft) && !simActive ? nearTerminal(cursor) : null;

  let draftPreview: Pt[] | null = null;
  if (draft && cursorSnap) {
    const last = draft.points[draft.points.length - 1];
    const target = hoverTerm ? { x: hoverTerm.x, y: hoverTerm.y } : cursorSnap;
    draftPreview = [...draft.points, ...(p.ortho && draft.kind !== 'line' ? orthoPoints(last, target, draft.verticalFirst) : [target])];
  }

  const singleSel = p.selection.length === 1 ? map.get(p.selection[0]) : undefined;
  const cursorStyle = simActive
    ? 'pointer'
    : p.spaceDown || p.tool === 'pan'
      ? drag.current?.type === 'pan'
        ? 'grabbing'
        : 'grab'
      : p.placing || ['wire', 'line', 'cable', 'wall', 'dimension', 'rect', 'room', 'text', 'heading', 'note'].includes(p.tool)
        ? 'crosshair'
        : 'default';

  return (
    <svg
      ref={svgRef}
      className="canvas-svg"
      width={size.w}
      height={size.h}
      style={{ background: colors.bg, cursor: cursorStyle, color: colors.ink, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        setCursor(null);
        p.onCursor(null);
      }}
      onDoubleClick={onDoubleClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <pattern id="grid-minor" width={grid} height={grid} patternUnits="userSpaceOnUse">
          <path d={`M ${grid} 0 L 0 0 0 ${grid}`} fill="none" stroke={colors.minor} strokeWidth={hs} />
        </pattern>
        <pattern id="grid-major" width={grid * majorEvery} height={grid * majorEvery} patternUnits="userSpaceOnUse">
          {showMinor && <rect width={grid * majorEvery} height={grid * majorEvery} fill="url(#grid-minor)" />}
          <path d={`M ${grid * majorEvery} 0 L 0 0 0 ${grid * majorEvery}`} fill="none" stroke={colors.major} strokeWidth={hs} />
        </pattern>
      </defs>
      <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
        {sheet && <rect x={0} y={0} width={sheet.w} height={sheet.h} fill={colors.paper} stroke={colors.major} strokeWidth={hs} />}
        {p.showGrid && <rect x={vis.x} y={vis.y} width={vis.w} height={vis.h} fill="url(#grid-major)" pointerEvents="none" />}
        {sheet && (
          <g pointerEvents="none">
            <SheetFrame doc={doc} projectName={p.projectName} author={p.author} />
          </g>
        )}

        {sorted.map((el) => (
          <g key={el.id} data-id={el.id} className="el">
            <HitArea el={el} map={map} hs={hs} />
            <ElementView el={el} map={map} opts={opts} />
          </g>
        ))}
        <g pointerEvents="none">
          <JunctionDots dots={dots} />
        </g>
        {p.sim?.extraSvg}

        {/* Markering av valgte elementer */}
        <g pointerEvents="none">
          {p.selection.map((id) => {
            const el = map.get(id);
            if (!el) return null;
            if (el.type === 'wire') {
              const pts = resolveWire(el, map);
              return <polyline key={id} points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill="none" stroke={ACCENT} strokeOpacity={0.45} strokeWidth={el.width + 5 * hs} />;
            }
            const b = elementBounds(el, map);
            const pad = 4 * hs;
            return <rect key={id} x={b.x - pad} y={b.y - pad} width={b.w + pad * 2} height={b.h + pad * 2} fill="rgba(59,130,246,0.06)" stroke={ACCENT} strokeWidth={1.2 * hs} strokeDasharray={`${4 * hs} ${3 * hs}`} />;
          })}
        </g>

        {/* Håndtak for knekkpunkter */}
        {!simActive && singleSel && (singleSel.type === 'wire' || singleSel.type === 'wall' || singleSel.type === 'dimension') && (
          <g>
            {(singleSel.type === 'wire' ? storedPointsResolved(singleSel, map) : singleSel.type === 'wall' ? singleSel.points : [singleSel.a, singleSel.b]).map((q, i) => (
              <rect
                key={i}
                data-vertex={`${singleSel.id}:${i}`}
                x={q.x - 4 * hs}
                y={q.y - 4 * hs}
                width={8 * hs}
                height={8 * hs}
                fill="#0b1322"
                stroke={ACCENT}
                strokeWidth={1.5 * hs}
                style={{ cursor: 'move' }}
              />
            ))}
          </g>
        )}

        {/* Terminaler */}
        {!simActive && wiresAllowed && (p.tool === 'select' || p.tool === 'wire') && view.zoom > 0.35 && (
          <g>
            {terminals.map((t) => (
              <circle key={`${t.el}:${t.id}`} data-term={`${t.el}:${t.id}`} className="term" cx={t.x} cy={t.y} r={Math.max(3, 4.5 * hs)} />
            ))}
          </g>
        )}
        {hoverTerm && <circle cx={hoverTerm.x} cy={hoverTerm.y} r={7 * hs} fill="none" stroke="#22c55e" strokeWidth={2 * hs} pointerEvents="none" />}

        {/* Problemer fra koblingskontrollen */}
        <g pointerEvents="none">
          {p.issues.map((q, i) => (
            <circle key={i} cx={q.x} cy={q.y} r={9 * hs} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={2 * hs} />
          ))}
        </g>

        {/* Forhåndsvisning av det som tegnes */}
        <g pointerEvents="none">
          {draftPreview && (
            <polyline
              points={draftPreview.map((q) => `${q.x},${q.y}`).join(' ')}
              fill="none"
              stroke={draft!.kind === 'wall' ? colors.ink : ACCENT}
              strokeOpacity={draft!.kind === 'wall' ? 0.5 : 1}
              strokeWidth={draft!.kind === 'wall' ? 15 : 2}
              strokeDasharray={draft!.kind === 'cable' ? '8 6' : undefined}
            />
          )}
          {dimA && cursorSnap && <line x1={dimA.x} y1={dimA.y} x2={cursorSnap.x} y2={cursorSnap.y} stroke={ACCENT} strokeWidth={1.5 * hs} strokeDasharray={`${4 * hs}`} />}
          {rectDraft && (
            <rect
              x={Math.min(rectDraft.a.x, rectDraft.b.x)}
              y={Math.min(rectDraft.a.y, rectDraft.b.y)}
              width={Math.abs(rectDraft.a.x - rectDraft.b.x)}
              height={Math.abs(rectDraft.a.y - rectDraft.b.y)}
              fill="rgba(59,130,246,0.08)"
              stroke={ACCENT}
              strokeWidth={p.tool === 'room' ? 15 : 1.5 * hs}
              strokeOpacity={p.tool === 'room' ? 0.4 : 1}
            />
          )}
          {marquee && (
            <rect
              x={Math.min(marquee.a.x, marquee.b.x)}
              y={Math.min(marquee.a.y, marquee.b.y)}
              width={Math.abs(marquee.a.x - marquee.b.x)}
              height={Math.abs(marquee.a.y - marquee.b.y)}
              fill="rgba(59,130,246,0.08)"
              stroke={ACCENT}
              strokeWidth={hs}
              strokeDasharray={`${4 * hs} ${3 * hs}`}
            />
          )}
          {p.placing && cursorSnap && <GhostSymbol symbolId={p.placing} at={doc.placement === 'auto' ? null : cursorSnap} paper={opts.paper} />}
          {cursorSnap && !simActive && (p.tool !== 'select' || p.placing) && p.tool !== 'pan' && (
            <g stroke={ACCENT} strokeWidth={hs} opacity={0.7}>
              <line x1={cursorSnap.x - 6 * hs} y1={cursorSnap.y} x2={cursorSnap.x + 6 * hs} y2={cursorSnap.y} />
              <line x1={cursorSnap.x} y1={cursorSnap.y - 6 * hs} x2={cursorSnap.x} y2={cursorSnap.y + 6 * hs} />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

/** Lagrede punkter, men med endepunkter flyttet til terminalene de er festet til. */
function storedPointsResolved(w: WireEl, map: Map<string, Element>): Pt[] {
  const r = resolveWire(w, map);
  return w.points.map((q, i) => (i === 0 ? r[0] : i === w.points.length - 1 ? r[r.length - 1] : q));
}

function HitArea({ el, map, hs }: { el: Element; map: Map<string, Element>; hs: number }) {
  if (el.type === 'wire') {
    const pts = resolveWire(el, map);
    return <polyline points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill="none" stroke="transparent" strokeWidth={Math.max(10 * hs, el.width + 6)} />;
  }
  if (el.type === 'wall') {
    const pts = el.closed ? [...el.points, el.points[0]] : el.points;
    return <polyline points={pts.map((q) => `${q.x},${q.y}`).join(' ')} fill="none" stroke="transparent" strokeWidth={el.thickness + 6} />;
  }
  if (el.type === 'rect' && el.roomName === undefined) {
    // Bare kanten av rammer skal kunne velges, slik at man kan klikke på ting inni
    return <rect x={Math.min(el.x, el.x + el.w)} y={Math.min(el.y, el.y + el.h)} width={Math.abs(el.w)} height={Math.abs(el.h)} fill="none" stroke="transparent" strokeWidth={10 * hs} />;
  }
  if (el.type === 'rect') {
    // Rom: velg via navnet i midten
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    return <rect x={cx - 90} y={cy - 32} width={180} height={70} fill="transparent" />;
  }
  const b = elementBounds(el, map);
  return <rect x={b.x - 2} y={b.y - 2} width={b.w + 4} height={b.h + 4} fill="transparent" />;
}

function GhostSymbol({ symbolId, at, paper }: { symbolId: string; at: Pt | null; paper: string }) {
  const def = getSymbol(symbolId);
  if (!def || !at) return null;
  const props = Object.fromEntries(def.props.map((q) => [q.key, q.default]));
  return (
    <g transform={componentTransform({ id: '', type: 'component', symbolId, x: at.x, y: at.y, rot: 0, label: '', props })} opacity={0.55} fill="none" stroke="#60a5fa" strokeWidth={2} style={{ color: '#60a5fa' }}>
      {def.render({ props, paper })}
    </g>
  );
}

export { onSegmentInterior, withElements };
