import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ComponentEl, DrawingDoc, Pt } from '../types';
import { getSymbol } from '../library/symbols';
import { buildNetlist } from './netlist';
import { elementMap, resolveWire } from './geometry';

export interface CheckIssue {
  level: 'error' | 'warning' | 'info';
  text: string;
  ids: string[];
  pt?: Pt;
}

/** Teknisk kontroll av tegningen: løse ender, ikke-tilkoblede terminaler, doble betegnelser m.m. */
export function checkDrawing(doc: DrawingDoc): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const net = buildNetlist(doc.elements);
  const map = elementMap(doc.elements);
  const name = (id: string) => {
    const c = map.get(id) as ComponentEl | undefined;
    return c ? c.label || getSymbol(c.symbolId)?.name || 'komponent' : 'komponent';
  };
  for (const b of net.brokenRefs) {
    issues.push({ level: 'error', text: 'Ledningen er festet til en terminal som ikke finnes lenger.', ids: [b.wireId] });
  }
  for (const d of net.dangling) {
    issues.push({ level: 'error', text: 'Løs ledningsende – ledningen er ikke koblet til en terminal eller annen ledning.', ids: [d.wireId], pt: d.pt });
  }
  for (const e of doc.elements) {
    if (e.type !== 'wire' || e.kind !== 'wire') continue;
    const pts = resolveWire(e, map);
    if (pts.length >= 2 && pts.every((q) => Math.abs(q.x - pts[0].x) < 0.5 && Math.abs(q.y - pts[0].y) < 0.5)) {
      issues.push({ level: 'warning', text: 'Ledning med null lengde.', ids: [e.id], pt: pts[0] });
    }
  }
  for (const u of net.unconnected) {
    const c = map.get(u.elId) as ComponentEl | undefined;
    const def = c ? getSymbol(c.symbolId) : undefined;
    if (!c || def?.id === 'ground' || def?.id === 'protective-earth' || def?.id === 'connection-point') continue;
    issues.push({ level: 'warning', text: `Terminal ${u.name || u.tid} på ${name(u.elId)} er ikke tilkoblet.`, ids: [u.elId], pt: u.pt });
  }
  // Doble betegnelser (kontakter kan dele betegnelse med spolen)
  const shared = new Set(['relay-no', 'relay-nc', 'contactor-main', 'overload-nc', 'motor-protection']);
  const byLabel = new Map<string, ComponentEl[]>();
  for (const e of doc.elements) {
    if (e.type !== 'component' || !e.label) continue;
    if (shared.has(e.symbolId)) continue;
    const l = byLabel.get(e.label) ?? [];
    l.push(e);
    byLabel.set(e.label, l);
  }
  for (const [label, list] of byLabel) {
    if (list.length > 1) {
      const coilTypes = new Set(['relay-coil', 'contactor-coil', 'timer-on', 'timer-off']);
      // En spole og et motorvern kan ha samme nummer i ulike bokstavkoder, men identisk betegnelse på to «hoved»-komponenter er mistenkelig
      if (list.every((c) => coilTypes.has(c.symbolId)) || list.length > 1)
        issues.push({ level: 'warning', text: `Betegnelsen ${label} er brukt på ${list.length} komponenter.`, ids: list.map((c) => c.id) });
    }
  }
  const coilLabels = new Set(doc.elements.filter((e): e is ComponentEl => e.type === 'component' && ['relay-coil', 'contactor-coil', 'timer-on', 'timer-off'].includes(e.symbolId)).map((e) => e.label));
  for (const e of doc.elements) {
    if (e.type === 'component' && ['relay-no', 'relay-nc', 'contactor-main'].includes(e.symbolId) && !coilLabels.has(e.label)) {
      issues.push({ level: 'info', text: `Kontakten ${e.label || '(uten betegnelse)'} har ingen spole med samme betegnelse på dette arket.`, ids: [e.id] });
    }
  }
  for (const e of doc.elements) {
    if (e.type === 'component' && getSymbol(e.symbolId)?.prefix && !e.label) {
      issues.push({ level: 'info', text: `${getSymbol(e.symbolId)?.name} mangler referansebetegnelse.`, ids: [e.id] });
    }
  }
  return issues;
}

export function CheckPanel({ doc, onSelect, onClose }: { doc: DrawingDoc; onSelect: (ids: string[], pt?: Pt) => void; onClose: () => void }) {
  const issues = useMemo(() => checkDrawing(doc), [doc]);
  const errors = issues.filter((i) => i.level === 'error').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  return (
    <div className="check-panel">
      <div className="panel-head">
        <span>Koblingskontroll</span>
        <span className="spacer" />
        <span className={`badge ${errors ? 'badge-red' : 'badge-green'}`}>{errors} feil</span>
        <span className={`badge ${warnings ? 'badge-yellow' : ''}`}>{warnings} advarsler</span>
        <button className="icon-btn" onClick={onClose} title="Lukk">
          <X size={16} />
        </button>
      </div>
      <div className="panel-scroll" style={{ maxHeight: 220 }}>
        {issues.length === 0 ? (
          <div className="check-item">
            <CheckCircle2 size={16} color="var(--ok)" /> Ingen tekniske feil funnet: alle ledninger er koblet til tilkoblingspunkter.
          </div>
        ) : (
          issues.map((i, k) => (
            <button key={k} className="check-item" onClick={() => onSelect(i.ids, i.pt)}>
              {i.level === 'error' ? <AlertTriangle size={16} color="var(--danger)" /> : i.level === 'warning' ? <AlertTriangle size={16} color="var(--warn)" /> : <Info size={16} color="var(--accent-2)" />}
              <span>{i.text}</span>
            </button>
          ))
        )}
        <div className="check-item small muted" style={{ cursor: 'default' }}>
          Kontrollen sjekker bare at tegningen henger sammen teknisk. Den vurderer ikke om kretsen er riktig dimensjonert eller i samsvar med regelverket – det krever kvalifisert faglig vurdering.
        </div>
      </div>
    </div>
  );
}
