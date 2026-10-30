import { useEffect, useRef } from 'react';
import { Copy, FlipHorizontal2, RotateCcw, RotateCw, Trash2, Wand2, X } from 'lucide-react';
import type { ComponentEl, DimensionEl, DrawingDoc, Element, LineStyle, RectEl, SchematicMode, TextEl, WallEl, WireEl } from '../types';
import { PREFIX_NOTE, getSymbol } from '../library/symbols';
import { CATEGORY_LABEL } from '../library/types';
import { SCHEMATIC_MODES } from '../store/factories';
import { useSettings } from '../store/settings';
import { dist, elementMap, polylineLength, resolveWire } from './geometry';
import { formatLength } from './render';
import { SymbolIcon } from './SymbolIcon';

export const COLOR_PRESETS: { name: string; value: string }[] = [
  { name: 'Standard', value: '' },
  { name: 'Blå', value: '#3b82f6' },
  { name: 'Rød', value: '#ef4444' },
  { name: 'Grønn', value: '#22c55e' },
  { name: 'Gul', value: '#eab308' },
  { name: 'Oransje', value: '#f97316' },
  { name: 'Brun (fase)', value: '#a0522d' },
  { name: 'Blå (nøytral)', value: '#2563eb' },
  { name: 'Grønn/gul (PE)', value: '#84cc16' },
  { name: 'Grå', value: '#94a3b8' },
  { name: 'Svart', value: '#000000' },
];

const LINE_STYLES: { id: LineStyle; name: string }[] = [
  { id: 'solid', name: 'Heltrukken' },
  { id: 'dashed', name: 'Stiplet' },
  { id: 'dotted', name: 'Prikket' },
  { id: 'dashdot', name: 'Strek-prikk' },
];

interface Props {
  doc: DrawingDoc;
  selection: string[];
  apply: (fn: (d: DrawingDoc) => DrawingDoc) => void;
  patch: (id: string, patch: Partial<Element>) => void;
  patchDoc: (patch: Partial<DrawingDoc>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRotate: (dir: 1 | -1) => void;
  onFlip: () => void;
  onAutoArrange: () => void;
  onClose: () => void;
  focusTextId: string | null;
  setColorAll: (color: string) => void;
}

export function PropertiesPanel(p: Props) {
  const sel = p.selection.map((id) => p.doc.elements.find((e) => e.id === id)).filter((e): e is Element => !!e);
  return (
    <aside className="editor-panel props-panel" aria-label="Egenskaper">
      <div className="panel-head">
        <span>Egenskaper</span>
        <span className="spacer" />
        <button className="icon-btn" onClick={p.onClose} title="Skjul panel">
          <X size={16} />
        </button>
      </div>
      <div className="panel-scroll" style={{ padding: 12 }}>
        {sel.length === 0 && <DocProps {...p} />}
        {sel.length === 1 && <SingleProps el={sel[0]} {...p} />}
        {sel.length > 1 && (
          <>
            <div className="prop-title">{sel.length} elementer valgt</div>
            <ColorPicker value="" onChange={p.setColorAll} />
            <Actions {...p} rotate={sel.some((e) => e.type === 'component')} />
          </>
        )}
      </div>
    </aside>
  );
}

function Actions(p: Props & { rotate: boolean }) {
  return (
    <div className="row" style={{ marginTop: 12 }}>
      {p.rotate && (
        <>
          <button className="icon-btn" onClick={() => p.onRotate(-1)} title="Roter mot klokken (Shift+R)">
            <RotateCcw size={16} />
          </button>
          <button className="icon-btn" onClick={() => p.onRotate(1)} title="Roter med klokken (R)">
            <RotateCw size={16} />
          </button>
          <button className="icon-btn" onClick={p.onFlip} title="Speilvend (F)">
            <FlipHorizontal2 size={16} />
          </button>
        </>
      )}
      <button className="icon-btn" onClick={p.onDuplicate} title="Dupliser (Ctrl+D)">
        <Copy size={16} />
      </button>
      <span className="spacer" />
      <button className="btn btn-danger btn-sm" onClick={p.onDelete} title="Slett (Delete)">
        <Trash2 size={14} /> Slett
      </button>
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>Farge</label>
      <div className="swatches">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.name}
            className={`swatch ${value === c.value ? 'active' : ''}`}
            title={c.name}
            style={{ background: c.value || 'linear-gradient(135deg,#d6e4ff 50%,#1e293b 50%)' }}
            onClick={() => onChange(c.value)}
          />
        ))}
        <input type="color" value={value || '#3b82f6'} onChange={(e) => onChange(e.target.value)} title="Egen farge" />
      </div>
    </div>
  );
}

function LineStyleSelect({ value, onChange }: { value: LineStyle; onChange: (v: LineStyle) => void }) {
  return (
    <div className="field">
      <label>Linjetype</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value as LineStyle)}>
        {LINE_STYLES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function DocProps(p: Props) {
  const { doc } = p;
  const settings = useSettings();
  const comps = doc.elements.filter((e) => e.type === 'component').length;
  const wires = doc.elements.filter((e) => e.type === 'wire').length;
  return (
    <>
      <div className="prop-title">Dokument</div>
      <div className="field">
        <label>Navn</label>
        <input className="input" value={doc.name} onChange={(e) => p.patchDoc({ name: e.target.value })} />
      </div>
      {doc.kind === 'schematic' && (
        <div className="field">
          <label>Skjematype (arbeidsmodus)</label>
          <select className="select" value={doc.mode} onChange={(e) => p.patchDoc({ mode: e.target.value as SchematicMode })}>
            {SCHEMATIC_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <span className="small muted">{SCHEMATIC_MODES.find((m) => m.id === doc.mode)?.description}</span>
        </div>
      )}
      {(doc.kind === 'schematic' || doc.kind === 'drawing' || doc.kind === 'simulation') && (
        <div className="field">
          <label>Plassering av komponenter</label>
          <select className="select" value={doc.placement} onChange={(e) => p.patchDoc({ placement: e.target.value as 'manual' | 'auto' })}>
            <option value="manual">Manuell (der du klikker/slipper)</option>
            <option value="auto">Automatisk (neste ledige plass)</option>
          </select>
          <button className="btn btn-sm" style={{ marginTop: 6 }} onClick={p.onAutoArrange} disabled={comps === 0}>
            <Wand2 size={14} /> Ordne alle komponenter automatisk
          </button>
        </div>
      )}
      {(doc.kind === 'schematic' || doc.mode === 'ovingsoppgave' || doc.taskText !== undefined) && doc.kind !== 'floorplan' && (
        <div className="field">
          <label>Oppgavetekst (vises på arket)</label>
          <textarea
            className="textarea"
            rows={3}
            value={doc.taskText ?? ''}
            placeholder="Valgfritt – f.eks. for øvingsoppgaver"
            onChange={(e) => p.patchDoc({ taskText: e.target.value || undefined })}
          />
        </div>
      )}
      <div className="prop-title">Ark</div>
      <label className="checkbox field">
        <input type="checkbox" checked={doc.sheet.show} onChange={(e) => p.patchDoc({ sheet: { ...doc.sheet, show: e.target.checked } })} />
        Vis tegningsark med ramme og tittelfelt
      </label>
      {doc.sheet.show && (
        <div className="row" style={{ marginBottom: 10 }}>
          <select className="select" style={{ width: 'auto' }} value={doc.sheet.size} onChange={(e) => p.patchDoc({ sheet: { ...doc.sheet, size: e.target.value as 'A3' | 'A4' } })}>
            <option value="A3">A3</option>
            <option value="A4">A4</option>
          </select>
          <select className="select" style={{ width: 'auto' }} value={doc.sheet.orientation} onChange={(e) => p.patchDoc({ sheet: { ...doc.sheet, orientation: e.target.value as 'landscape' | 'portrait' } })}>
            <option value="landscape">Liggende</option>
            <option value="portrait">Stående</option>
          </select>
        </div>
      )}
      {doc.kind !== 'floorplan' && (
        <label className="checkbox field">
          <input type="checkbox" checked={doc.showTerminals} onChange={(e) => p.patchDoc({ showTerminals: e.target.checked })} />
          Vis terminal- og klemmenummer
        </label>
      )}
      <div className="prop-title">Tegnehjelp</div>
      <label className="checkbox field">
        <input type="checkbox" checked={settings.showGrid} onChange={(e) => settings.set({ showGrid: e.target.checked })} /> Vis rutenett <kbd>G</kbd>
      </label>
      <label className="checkbox field">
        <input type="checkbox" checked={settings.snap} onChange={(e) => settings.set({ snap: e.target.checked })} /> Fest til rutenett
      </label>
      <label className="checkbox field">
        <input type="checkbox" checked={settings.orthoWires} onChange={(e) => settings.set({ orthoWires: e.target.checked })} /> Rettvinklede ledninger/vegger
      </label>
      <div className="field">
        <label>Lerret</label>
        <select className="select" value={settings.canvasTheme} onChange={(e) => settings.set({ canvasTheme: e.target.value as 'dark' | 'light' })}>
          <option value="dark">Mørkt</option>
          <option value="light">Lyst (papir)</option>
        </select>
      </div>
      <div className="small muted" style={{ marginTop: 8 }}>
        {comps} komponenter · {wires} ledninger/streker · {doc.elements.length} elementer totalt
      </div>
    </>
  );
}

function SingleProps({ el, ...p }: Props & { el: Element }) {
  switch (el.type) {
    case 'component':
      return <ComponentProps el={el} {...p} />;
    case 'wire':
      return <WireProps el={el} {...p} />;
    case 'text':
      return <TextProps el={el} {...p} />;
    case 'wall':
      return <WallProps el={el} {...p} />;
    case 'dimension':
      return <DimProps el={el} {...p} />;
    case 'rect':
      return <RectProps el={el} {...p} />;
  }
}

function ComponentProps({ el, ...p }: Props & { el: ComponentEl }) {
  const def = getSymbol(el.symbolId);
  if (!def) return <div className="muted">Ukjent symbol: {el.symbolId}</div>;
  const set = (patch: Partial<ComponentEl>) => p.patch(el.id, patch);
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div className="symbol-preview">
          <SymbolIcon symbolId={el.symbolId} size={48} props={el.props} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{def.name}</div>
          <div className="small muted">{CATEGORY_LABEL[def.category]} · {def.group}</div>
        </div>
      </div>
      {def.prefix !== '' || el.label ? (
        <div className="field">
          <label>Referansebetegnelse</label>
          <input className="input mono" value={el.label} placeholder={def.prefix ? `${def.prefix}1` : ''} onChange={(e) => set({ label: e.target.value })} />
          <span className="small muted">
            {def.prefix ? `Foreslått bokstavkode: ${def.prefix}. ` : ''}
            {['relay-no', 'relay-nc', 'contactor-main'].includes(def.id) ? 'Bruk samme betegnelse som spolen (f.eks. K1). ' : ''}
          </span>
        </div>
      ) : null}
      <label className="checkbox field">
        <input type="checkbox" checked={el.showLabel !== false} onChange={(e) => set({ showLabel: e.target.checked })} />
        Vis betegnelse og data
      </label>
      {def.props.map((pd) => (
        <div className="field" key={pd.key}>
          <label>{pd.label}</label>
          {pd.options ? (
            <select className="select" value={el.props[pd.key] ?? pd.default} onChange={(e) => set({ props: { ...el.props, [pd.key]: e.target.value } })}>
              {pd.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <div className="input-unit">
              <input className="input" value={el.props[pd.key] ?? ''} onChange={(e) => set({ props: { ...el.props, [pd.key]: e.target.value } })} />
              {pd.unit && <span>{pd.unit}</span>}
            </div>
          )}
          {pd.hint && <span className="small muted">{pd.hint}</span>}
        </div>
      ))}
      {def.terminals.length > 0 && (
        <details className="field" open={p.doc.kind === 'schematic'}>
          <summary className="label" style={{ cursor: 'pointer' }}>
            Terminaler og klemmenummer
          </summary>
          <div className="terminal-grid">
            {def.terminals.map((t) => (
              <label key={t.id} className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <span className="small muted" style={{ width: 34 }}>{t.name || t.id}</span>
                <input
                  className="input mono"
                  value={el.terminalNumbers?.[t.id] ?? ''}
                  placeholder={t.name || '–'}
                  onChange={(e) => {
                    const tn = { ...(el.terminalNumbers ?? {}) };
                    if (e.target.value) tn[t.id] = e.target.value;
                    else delete tn[t.id];
                    set({ terminalNumbers: tn });
                  }}
                />
              </label>
            ))}
          </div>
        </details>
      )}
      <div className="field">
        <label>Rotasjon</label>
        <div className="row">
          {[0, 90, 180, 270].map((r) => (
            <button key={r} className={`btn btn-sm ${el.rot === r ? 'btn-primary' : ''}`} onClick={() => set({ rot: r })}>
              {r}°
            </button>
          ))}
        </div>
      </div>
      <ColorPicker value={el.color ?? ''} onChange={(c) => set({ color: c || undefined })} />
      <Actions {...p} rotate />
      <hr className="sep" />
      <div className="small">
        <p>{def.description}</p>
        {def.howItWorks && (
          <p>
            <b>Virkemåte:</b> {def.howItWorks}
          </p>
        )}
        <p className="muted">
          <b>Kilde:</b> {def.standard}
        </p>
        {def.prefix && <p className="muted">{PREFIX_NOTE}</p>}
      </div>
    </>
  );
}

function WireProps({ el, ...p }: Props & { el: WireEl }) {
  const map = elementMap(p.doc.elements);
  const pts = resolveWire(el, map);
  const set = (patch: Partial<WireEl>) => p.patch(el.id, patch);
  const endInfo = (ref?: { el: string; t: string }) => {
    if (!ref) return <span className="badge badge-yellow">ikke festet</span>;
    const c = map.get(ref.el) as ComponentEl | undefined;
    const def = c ? getSymbol(c.symbolId) : undefined;
    const t = def?.terminals.find((x) => x.id === ref.t);
    if (!c || !t) return <span className="badge badge-red">mangler</span>;
    return (
      <span className="badge badge-green">
        {c.label || def?.name} : {c.terminalNumbers?.[t.id] ?? t.name ?? t.id}
      </span>
    );
  };
  const title = el.kind === 'wire' ? 'Ledning' : el.kind === 'cable' ? 'Kabelrute' : 'Strek';
  return (
    <>
      <div className="prop-title">{title}</div>
      {el.kind !== 'line' && (
        <div className="field">
          <label>{el.kind === 'cable' ? 'Kabeltype / betegnelse' : 'Ledningsnummer'}</label>
          <input className="input mono" value={el.wireNo ?? ''} placeholder={el.kind === 'cable' ? 'F.eks. W1 PFXP 3G2,5' : 'F.eks. 1, 2, L1 …'} onChange={(e) => set({ wireNo: e.target.value || undefined })} />
        </div>
      )}
      {el.kind === 'wire' && (
        <div className="field">
          <label>Tilkobling</label>
          <div className="col" style={{ gap: 4 }}>
            <div className="row small">Start: {endInfo(el.start)}</div>
            <div className="row small">Slutt: {endInfo(el.end)}</div>
          </div>
        </div>
      )}
      <div className="small muted field">Lengde: {el.kind === 'cable' ? formatLength(polylineLength(pts)) : `${Math.round(polylineLength(pts))} enheter`}</div>
      <ColorPicker value={el.color ?? ''} onChange={(c) => set({ color: c || undefined })} />
      <LineStyleSelect value={el.lineStyle} onChange={(v) => set({ lineStyle: v })} />
      <div className="field">
        <label>Strektykkelse</label>
        <select className="select" value={el.width} onChange={(e) => set({ width: Number(e.target.value) })}>
          {[1, 1.5, 2, 3, 4, 6].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      {el.points.length > 2 && (
        <button className="btn btn-sm" onClick={() => set({ points: [pts[0], pts[pts.length - 1]] })}>
          Fjern knekkpunkter
        </button>
      )}
      <div className="small muted" style={{ marginTop: 8 }}>
        Dra i de firkantede håndtakene for å flytte punkter. Dobbeltklikk på ledningen for nytt knekkpunkt.
      </div>
      <Actions {...p} rotate={false} />
    </>
  );
}

function TextProps({ el, ...p }: Props & { el: TextEl }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (p.focusTextId === el.id) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [p.focusTextId, el.id]);
  const set = (patch: Partial<TextEl>) => p.patch(el.id, patch);
  return (
    <>
      <div className="prop-title">Tekst</div>
      <div className="field">
        <label>Innhold</label>
        <textarea ref={ref} className="textarea" rows={3} value={el.text} onChange={(e) => set({ text: e.target.value })} />
      </div>
      <div className="field">
        <label>Type</label>
        <select className="select" value={el.variant} onChange={(e) => set({ variant: e.target.value as TextEl['variant'] })}>
          <option value="text">Tekst</option>
          <option value="heading">Overskrift</option>
          <option value="note">Forklaring (merknad)</option>
          <option value="room">Romnavn</option>
        </select>
      </div>
      <div className="field">
        <label>Størrelse</label>
        <input className="input" type="number" min={6} max={120} value={el.size} onChange={(e) => set({ size: Math.max(6, Number(e.target.value) || 12) })} />
      </div>
      <label className="checkbox field">
        <input type="checkbox" checked={!!el.bold} onChange={(e) => set({ bold: e.target.checked })} /> Fet skrift
      </label>
      <ColorPicker value={el.color ?? ''} onChange={(c) => set({ color: c || undefined })} />
      <Actions {...p} rotate={false} />
    </>
  );
}

function WallProps({ el, ...p }: Props & { el: WallEl }) {
  const pts = el.closed ? [...el.points, el.points[0]] : el.points;
  const set = (patch: Partial<WallEl>) => p.patch(el.id, patch);
  return (
    <>
      <div className="prop-title">Vegg</div>
      <div className="field">
        <label>Veggtykkelse</label>
        <div className="input-unit">
          <input className="input" type="number" min={2} max={60} value={el.thickness} onChange={(e) => set({ thickness: Math.max(2, Number(e.target.value) || 15) })} />
          <span>cm</span>
        </div>
      </div>
      <label className="checkbox field">
        <input type="checkbox" checked={!!el.closed} onChange={(e) => set({ closed: e.target.checked })} /> Lukket (siste hjørne kobles til første)
      </label>
      <div className="small muted field">Total lengde: {formatLength(polylineLength(pts))}</div>
      <ColorPicker value={el.color ?? ''} onChange={(c) => set({ color: c || undefined })} />
      <Actions {...p} rotate={false} />
    </>
  );
}

function DimProps({ el, ...p }: Props & { el: DimensionEl }) {
  return (
    <>
      <div className="prop-title">Mål</div>
      <div className="field">
        <label>Lengde</label>
        <div style={{ fontWeight: 600 }}>{formatLength(dist(el.a, el.b))}</div>
      </div>
      <div className="field">
        <label>Avstand fra målt linje</label>
        <input className="input" type="number" value={el.offset} onChange={(e) => p.patch(el.id, { offset: Number(e.target.value) || 0 })} />
      </div>
      <ColorPicker value={el.color ?? ''} onChange={(c) => p.patch(el.id, { color: c || undefined })} />
      <Actions {...p} rotate={false} />
    </>
  );
}

function RectProps({ el, ...p }: Props & { el: RectEl }) {
  const isRoom = el.roomName !== undefined;
  return (
    <>
      <div className="prop-title">{isRoom ? 'Rom' : 'Ramme'}</div>
      {isRoom && (
        <div className="field">
          <label>Romnavn</label>
          <input className="input" value={el.roomName} onChange={(e) => p.patch(el.id, { roomName: e.target.value })} />
        </div>
      )}
      <div className="small muted field">
        {isRoom
          ? `${formatLength(Math.abs(el.w))} × ${formatLength(Math.abs(el.h))} = ${((Math.abs(el.w) * Math.abs(el.h)) / 10000).toFixed(1).replace('.', ',')} m² (innvendig mål etter rektangelet)`
          : `${Math.round(Math.abs(el.w))} × ${Math.round(Math.abs(el.h))} enheter`}
      </div>
      {!isRoom && <LineStyleSelect value={el.lineStyle} onChange={(v) => p.patch(el.id, { lineStyle: v })} />}
      <ColorPicker value={el.color ?? ''} onChange={(c) => p.patch(el.id, { color: c || undefined })} />
      <Actions {...p} rotate={false} />
    </>
  );
}
