import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ClipboardCheck,
  ClipboardPaste,
  Copy,
  Download,
  FileImage,
  FileText,
  Grid3x3,
  Keyboard,
  Library,
  ListChecks,
  Magnet,
  Maximize,
  PanelRight,
  Printer,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  FileCode2,
} from 'lucide-react';
import type { DrawingDoc, Element, Pt } from '../types';
import { useHistory } from './history';
import { Canvas, type SimOverlay, type View } from './Canvas';
import { LibraryPanel } from './LibraryPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { CheckPanel, checkDrawing } from './CheckPanel';
import { MaterialsModal } from './MaterialsModal';
import { KIND_TOOLS, TOOLS, type ToolId } from './tools';
import { autoArrange, cloneElements, deleteElements, flipElements, moveElements, nextFreeSlot, createComponent, addElements, rotateElements, updateElement, withElements } from './ops';
import { contentBounds, elementBounds, elementMap, sheetSize } from './geometry';
import { exportPdf, exportPng, exportSvg, printDrawing } from './exporters';
import { useSettings } from '../store/settings';
import { useProjects } from '../store/projects';
import { Modal, toast } from '../components/ui';
import { DOC_KIND_LABEL, modeName } from '../store/factories';
import './editor.css';

let clipboard: Element[] = [];

export interface EditorProps {
  doc: DrawingDoc;
  projectName: string;
  onCommit: (doc: DrawingDoc) => void;
  sim?: SimOverlay;
  /** Ekstra knapper i verktøylinjen (f.eks. simulering) */
  toolbarExtra?: ReactNode;
  /** Panel som erstatter egenskapspanelet (f.eks. simuleringsresultat) */
  sidePanel?: ReactNode;
  headerLeft?: ReactNode;
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
}

export function Editor({ doc: initialDoc, projectName, onCommit, sim, toolbarExtra, sidePanel, headerLeft }: EditorProps) {
  const settings = useSettings();
  const flush = useProjects((s) => s.flush);
  const h = useHistory<DrawingDoc>(initialDoc);
  const doc = h.present;
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setToolState] = useState<ToolId>('select');
  const [placing, setPlacing] = useState<string | null>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, zoom: 0.6 });
  const [showLibrary, setShowLibrary] = useState(() => window.innerWidth > 900);
  const [showProps, setShowProps] = useState(() => window.innerWidth > 1100);
  const [showCheck, setShowCheck] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [focusTextId, setFocusTextId] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [cancelSignal, setCancelSignal] = useState(0);
  const [finishSignal, setFinishSignal] = useState(0);
  const size = useRef({ w: 800, h: 600 });
  const fitted = useRef(false);
  const simActive = !!sim?.active;

  // Nytt dokument åpnet
  useEffect(() => {
    if (initialDoc.id !== h.presentRef.current.id) {
      h.reset(initialDoc);
      setSelection([]);
      fitted.current = false;
      fit(initialDoc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDoc.id]);

  // Lagre når et dokument er endret (ikke under dra-operasjoner)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!h.previewing) onCommit(doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, h.previewing]);

  // Fjern valgte id-er som ikke finnes lenger (etter angre o.l.)
  useEffect(() => {
    const ids = new Set(doc.elements.map((e) => e.id));
    setSelection((s) => (s.every((id) => ids.has(id)) ? s : s.filter((id) => ids.has(id))));
  }, [doc.elements]);

  const tools = KIND_TOOLS[doc.kind];
  const setTool = useCallback((t: ToolId) => {
    setToolState(t);
    setPlacing(null);
  }, []);

  const fit = useCallback((d: DrawingDoc = h.presentRef.current) => {
    const s = size.current;
    let b = d.sheet.show ? { x: 0, y: 0, ...sheetSize(d.sheet.size, d.sheet.orientation) } : contentBounds(d.elements);
    if (!b || b.w < 10) b = { x: 0, y: 0, w: 800, h: 600 };
    const pad = 40;
    const zoom = Math.max(0.08, Math.min(3, Math.min((s.w - pad * 2) / b.w, (s.h - pad * 2) / b.h)));
    setView({ zoom, x: (s.w - b.w * zoom) / 2 - b.x * zoom, y: (s.h - b.h * zoom) / 2 - b.y * zoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (f: number) =>
    setView((v) => {
      const zoom = Math.min(8, Math.max(0.08, v.zoom * f));
      const cx = size.current.w / 2;
      const cy = size.current.h / 2;
      return { zoom, x: cx - ((cx - v.x) * zoom) / v.zoom, y: cy - ((cy - v.y) * zoom) / v.zoom };
    });

  // ------------------------------------------------------------------
  // Handlinger
  // ------------------------------------------------------------------
  const selSet = () => new Set(selection);
  const del = () => {
    if (!selection.length) return;
    h.apply((d) => deleteElements(d, selSet()));
    setSelection([]);
  };
  const copy = () => {
    if (!selection.length) return;
    const s = selSet();
    clipboard = structuredClone(doc.elements.filter((e) => s.has(e.id)));
    toast(`${clipboard.length} element(er) kopiert`);
  };
  const paste = (offset = settings.gridSize * 2) => {
    if (!clipboard.length) return;
    const clones = cloneElements(clipboard, doc.elements, offset);
    h.apply((d) => addElements(d, clones));
    setSelection(clones.map((c) => c.id));
    clipboard = structuredClone(clones);
  };
  const duplicate = () => {
    if (!selection.length) return;
    const s = selSet();
    const clones = cloneElements(doc.elements.filter((e) => s.has(e.id)), doc.elements, settings.gridSize * 2);
    h.apply((d) => addElements(d, clones));
    setSelection(clones.map((c) => c.id));
  };
  const rotate = (dir: 1 | -1) => selection.length && h.apply((d) => rotateElements(d, selSet(), dir));
  const flip = () => selection.length && h.apply((d) => flipElements(d, selSet()));
  const patch = (id: string, p: Partial<Element>) => h.apply((d) => updateElement(d, id, p));
  const patchDoc = (p: Partial<DrawingDoc>) => h.apply((d) => ({ ...d, ...p, updatedAt: Date.now() }));
  const setColorAll = (color: string) => {
    const s = selSet();
    h.apply((d) => withElements(d, d.elements.map((e) => (s.has(e.id) ? ({ ...e, color: color || undefined } as Element) : e))));
  };
  const pickSymbol = (symbolId: string) => {
    if (simActive) return;
    if (doc.placement === 'auto') {
      const comp = createComponent(symbolId, nextFreeSlot(doc, symbolId), doc.elements);
      if (comp) {
        h.apply((d) => addElements(d, [comp]));
        setSelection([comp.id]);
      }
      return;
    }
    setToolState('select');
    setPlacing((cur) => (cur === symbolId ? null : symbolId));
  };
  const selectAndShow = (ids: string[], pt?: Pt) => {
    setSelection(ids.filter((id) => doc.elements.some((e) => e.id === id)));
    const map = elementMap(doc.elements);
    let c = pt;
    if (!c && ids[0]) {
      const el = map.get(ids[0]);
      if (el) {
        const b = elementBounds(el, map);
        c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      }
    }
    if (c) setView((v) => ({ ...v, x: size.current.w / 2 - c!.x * v.zoom, y: size.current.h / 2 - c!.y * v.zoom }));
  };

  const author = settings.userName;
  const doExport = async (type: 'png' | 'svg' | 'pdf' | 'print') => {
    setExportOpen(false);
    try {
      if (type === 'png') await exportPng(doc, projectName, author, settings.exportScale);
      if (type === 'svg') exportSvg(doc, projectName, author);
      if (type === 'pdf') await exportPdf(doc, projectName, author);
      if (type === 'print') printDrawing(doc, projectName, author);
    } catch (e) {
      console.error(e);
      toast('Eksporten feilet. Se konsollen for detaljer.', true);
    }
  };

  // ------------------------------------------------------------------
  // Hurtigtaster
  // ------------------------------------------------------------------
  const handlers = useRef<(e: KeyboardEvent) => void>(() => {});
  handlers.current = (e: KeyboardEvent) => {
    if (isTyping(e)) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (k === ' ' && !e.repeat) {
      setSpaceDown(true);
      e.preventDefault();
      return;
    }
    if (ctrl && k === 'z' && !e.shiftKey) return e.preventDefault(), h.undo();
    if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) return e.preventDefault(), h.redo();
    if (ctrl && k === 's') {
      e.preventDefault();
      void flush().then(() => toast('Prosjektet er lagret'));
      return;
    }
    if (ctrl && k === 'p') return e.preventDefault(), void doExport('print');
    if (simActive) {
      if (k === 'escape') setSelection([]);
      return;
    }
    if (ctrl && k === 'c') return e.preventDefault(), copy();
    if (ctrl && k === 'x') {
      e.preventDefault();
      copy();
      del();
      return;
    }
    if (ctrl && k === 'v') return e.preventDefault(), paste();
    if (ctrl && k === 'd') return e.preventDefault(), duplicate();
    if (ctrl && k === 'a') return e.preventDefault(), setSelection(doc.elements.map((x) => x.id));
    if (ctrl) return;
    if (k === 'delete' || k === 'backspace') return e.preventDefault(), del();
    if (k === 'escape') {
      setCancelSignal((n) => n + 1);
      setPlacing(null);
      if (tool !== 'select') setToolState('select');
      else setSelection([]);
      return;
    }
    if (k === 'enter') return setFinishSignal((n) => n + 1);
    if (k === 'r') return rotate(e.shiftKey ? -1 : 1);
    if (k === 'f') return flip();
    if (k === 'g') return settings.set({ showGrid: !settings.showGrid });
    if (k === '+' || k === '=') return zoomBy(1.2);
    if (k === '-') return zoomBy(1 / 1.2);
    if (k === '0') return fit();
    if (k === '?') return setShowKeys(true);
    if (k.startsWith('arrow') && selection.length) {
      e.preventDefault();
      const step = settings.gridSize * (e.shiftKey ? 10 : 1);
      const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0;
      const dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
      h.apply((d) => moveElements(d, selSet(), dx, dy));
      return;
    }
    const t = tools.find((id) => TOOLS[id].key.toLowerCase() === k);
    if (t) setTool(t);
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => handlers.current(e);
    const up = (e: KeyboardEvent) => e.key === ' ' && setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const issues = useMemo(() => (showCheck ? checkDrawing(doc).flatMap((i) => (i.pt ? [i.pt] : [])) : []), [showCheck, doc]);
  const typeLabel = doc.kind === 'schematic' ? modeName(doc.mode) : DOC_KIND_LABEL[doc.kind];
  const unitLabel = (v: number) => (doc.kind === 'floorplan' ? `${(v / 100).toFixed(2).replace('.', ',')} m` : `${Math.round(v)}`);
  const hint = simActive
    ? 'Simulering: klikk på brytere for å slå av/på. Hold inne trykknapper. Klikk på sikringer for å tilbakestille.'
    : placing
      ? 'Klikk for å plassere komponenten. Hold Shift for å plassere flere. Esc avbryter. R roterer etter plassering.'
      : TOOLS[tool].hint;

  return (
    <div className="editor">
      <div className="editor-toolbar" role="toolbar" aria-label="Verktøylinje">
        {headerLeft}
        <button className={`icon-btn ${showLibrary ? 'active' : ''}`} onClick={() => setShowLibrary((s) => !s)} title="Komponentbibliotek" disabled={simActive}>
          <Library size={18} />
        </button>
        <span className="tb-sep" />
        {tools.map((id) => {
          const T = TOOLS[id];
          const Icon = T.icon;
          return (
            <button key={id} className={`icon-btn ${tool === id && !placing ? 'active' : ''}`} onClick={() => setTool(id)} title={`${T.label} (${T.key})`} disabled={simActive && id !== 'select' && id !== 'pan'}>
              <Icon size={18} />
            </button>
          );
        })}
        <span className="tb-sep" />
        <button className="icon-btn" onClick={h.undo} disabled={!h.canUndo} title="Angre (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <button className="icon-btn" onClick={h.redo} disabled={!h.canRedo} title="Gjør om (Ctrl+Y)">
          <Redo2 size={18} />
        </button>
        <span className="tb-sep hide-sm" />
        <button className="icon-btn hide-sm" onClick={copy} disabled={!selection.length || simActive} title="Kopier (Ctrl+C)">
          <Copy size={18} />
        </button>
        <button className="icon-btn hide-sm" onClick={() => paste()} disabled={simActive} title="Lim inn (Ctrl+V)">
          <ClipboardPaste size={18} />
        </button>
        <button className="icon-btn hide-sm" onClick={() => rotate(1)} disabled={!selection.length || simActive} title="Roter (R)">
          <RotateCw size={18} />
        </button>
        <button className="icon-btn" onClick={del} disabled={!selection.length || simActive} title="Slett (Delete)">
          <Trash2 size={18} />
        </button>
        <span className="tb-sep" />
        <button className="icon-btn hide-sm" onClick={() => zoomBy(1 / 1.2)} title="Zoom ut (−)">
          <ZoomOut size={18} />
        </button>
        <button className="btn btn-ghost btn-sm zoom-label" onClick={() => setView((v) => ({ ...v, zoom: 1 }))} title="Tilbakestill zoom til 100 %">
          {Math.round(view.zoom * 100)} %
        </button>
        <button className="icon-btn hide-sm" onClick={() => zoomBy(1.2)} title="Zoom inn (+)">
          <ZoomIn size={18} />
        </button>
        <button className="icon-btn" onClick={() => fit()} title="Tilpass til vindu (0)">
          <Maximize size={18} />
        </button>
        <button className={`icon-btn hide-sm ${settings.showGrid ? 'active' : ''}`} onClick={() => settings.set({ showGrid: !settings.showGrid })} title="Vis rutenett (G)">
          <Grid3x3 size={18} />
        </button>
        <button className={`icon-btn hide-sm ${settings.snap ? 'active' : ''}`} onClick={() => settings.set({ snap: !settings.snap })} title="Fest til rutenett">
          <Magnet size={18} />
        </button>
        <span className="tb-sep" />
        {doc.kind !== 'floorplan' && (
          <button className={`btn btn-sm ${showCheck ? 'btn-primary' : ''}`} onClick={() => setShowCheck((s) => !s)} title="Kontroller at ledninger er koblet til tilkoblingspunkter">
            <ClipboardCheck size={16} /> <span className="hide-sm">Kontroller</span>
          </button>
        )}
        <button className="btn btn-sm" onClick={() => setShowMaterials(true)} title="Materialliste og komponentoversikt">
          <ListChecks size={16} /> <span className="hide-sm">Materialliste</span>
        </button>
        {toolbarExtra}
        <div className="dropdown">
          <button className="btn btn-sm" onClick={() => setExportOpen((o) => !o)}>
            <Download size={16} /> <span className="hide-sm">Eksporter</span>
          </button>
          {exportOpen && (
            <>
              <div className="dropdown-backdrop" onClick={() => setExportOpen(false)} />
              <div className="dropdown-menu">
                <button onClick={() => doExport('pdf')}>
                  <FileText size={16} /> PDF (vektor)
                </button>
                <button onClick={() => doExport('png')}>
                  <FileImage size={16} /> PNG-bilde
                </button>
                <button onClick={() => doExport('svg')}>
                  <FileCode2 size={16} /> SVG (vektor)
                </button>
                <button onClick={() => doExport('print')}>
                  <Printer size={16} /> Skriv ut … <kbd>Ctrl+P</kbd>
                </button>
              </div>
            </>
          )}
        </div>
        <button className="icon-btn hide-sm" onClick={() => void flush().then(() => toast('Prosjektet er lagret'))} title="Lagre nå (Ctrl+S). Lagring skjer også automatisk.">
          <Save size={18} />
        </button>
        <button className="icon-btn hide-sm" onClick={() => setShowKeys(true)} title="Hurtigtaster (?)">
          <Keyboard size={18} />
        </button>
        <span className="spacer" />
        <button className={`icon-btn ${showProps ? 'active' : ''}`} onClick={() => setShowProps((s) => !s)} title="Egenskapspanel">
          <PanelRight size={18} />
        </button>
      </div>

      <div className="editor-body">
        {showLibrary && !simActive && <LibraryPanel kind={doc.kind} mode={doc.mode} placing={placing} onPick={pickSymbol} onClose={() => setShowLibrary(false)} />}
        <div className="canvas-wrap">
          <Canvas
            doc={doc}
            projectName={projectName}
            author={author}
            apply={h.apply}
            preview={h.preview}
            endPreview={h.endPreview}
            selection={selection}
            setSelection={setSelection}
            tool={tool}
            setTool={setTool}
            placing={placing}
            setPlacing={setPlacing}
            view={view}
            setView={setView}
            grid={settings.gridSize}
            snap={settings.snap}
            ortho={settings.orthoWires}
            showGrid={settings.showGrid}
            theme={settings.canvasTheme}
            wireColor={settings.defaultWireColor}
            issues={issues}
            sim={sim}
            onTextCreated={(id) => {
              setShowProps(true);
              setFocusTextId(id);
              setTimeout(() => setFocusTextId(null), 50);
            }}
            onCursor={setCursor}
            onSize={(s) => {
              size.current = s;
              if (!fitted.current && s.w > 50) {
                fitted.current = true;
                fit();
              }
            }}
            spaceDown={spaceDown}
            cancelSignal={cancelSignal}
            finishSignal={finishSignal}
          />
          <div className="canvas-badge">
            {DOC_KIND_LABEL[doc.kind]}
            {doc.kind === 'schematic' && ` · ${typeLabel}`}
          </div>
          {showCheck && <CheckPanel doc={doc} onSelect={selectAndShow} onClose={() => setShowCheck(false)} />}
        </div>
        {sidePanel && simActive
          ? sidePanel
          : showProps && (
              <PropertiesPanel
                doc={doc}
                selection={selection}
                apply={h.apply}
                patch={patch}
                patchDoc={patchDoc}
                onDelete={del}
                onDuplicate={duplicate}
                onRotate={rotate}
                onFlip={flip}
                onAutoArrange={() => {
                  h.apply((d) => autoArrange(d, settings.gridSize));
                  toast('Komponentene er ordnet automatisk');
                }}
                onClose={() => setShowProps(false)}
                focusTextId={focusTextId}
                setColorAll={setColorAll}
              />
            )}
      </div>
      <div className="editor-status">
        <span>{cursor ? `x ${unitLabel(cursor.x)} · y ${unitLabel(cursor.y)}` : '–'}</span>
        <span>{selection.length ? `${selection.length} valgt` : `${doc.elements.length} elementer`}</span>
        {settings.showHints && <span className="status-hint">{hint}</span>}
      </div>
      {showMaterials && <MaterialsModal doc={doc} onClose={() => setShowMaterials(false)} />}
      {showKeys && <ShortcutsModal onClose={() => setShowKeys(false)} />}
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['V / H', 'Velg / panorer'],
    ['W', 'Ledning'],
    ['L', 'Fri strek'],
    ['M / U / K', 'Vegg / rom / kabelrute (plantegning)'],
    ['B', 'Ramme'],
    ['T / O / N', 'Tekst / overskrift / forklaring'],
    ['D', 'Mål'],
    ['Mellomrom + dra', 'Panorer i alle verktøy'],
    ['Musehjul', 'Zoom inn/ut rundt pekeren'],
    ['+ / − / 0', 'Zoom inn / ut / tilpass'],
    ['G', 'Vis/skjul rutenett'],
    ['R / Shift+R', 'Roter valgte komponenter'],
    ['F', 'Speilvend valgte komponenter'],
    ['Piltaster', 'Flytt valgte (Shift = 10 ruter)'],
    ['Delete', 'Slett valgte'],
    ['Ctrl+Z / Ctrl+Y', 'Angre / gjør om'],
    ['Ctrl+C / Ctrl+V / Ctrl+X', 'Kopier / lim inn / klipp ut'],
    ['Ctrl+D', 'Dupliser'],
    ['Ctrl+A', 'Velg alt'],
    ['Ctrl+S', 'Lagre nå'],
    ['Ctrl+P', 'Skriv ut tegningen'],
    ['Enter / dobbeltklikk', 'Avslutt ledning/vegg'],
    ['Esc', 'Avbryt / fjern markering'],
  ];
  return (
    <Modal title="Hurtigtaster" onClose={onClose}>
      <table className="table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ width: 200 }}>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
