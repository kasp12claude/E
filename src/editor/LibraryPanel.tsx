import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { DocKind, SchematicMode } from '../types';
import { MODE_RECOMMENDED, getSymbol, symbolsForKind } from '../library/symbols';
import { CATEGORY_LABEL, type SymbolCategory, type SymbolDef } from '../library/types';
import { SymbolIcon } from './SymbolIcon';

interface Props {
  kind: DocKind;
  mode?: SchematicMode;
  placing: string | null;
  onPick: (symbolId: string) => void;
  onClose: () => void;
}

const CAT_ORDER: SymbolCategory[] = ['elektrisk', 'installasjon', 'plan', 'dokumentasjon'];

export function LibraryPanel({ kind, mode, placing, onPick, onClose }: Props) {
  const [q, setQ] = useState('');
  const all = useMemo(() => symbolsForKind(kind), [kind]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter((d) => `${d.name} ${d.description} ${d.group} ${d.prefix}`.toLowerCase().includes(s));
  }, [all, q]);
  const recommended = !q && mode ? (MODE_RECOMMENDED[mode] ?? []).map(getSymbol).filter((d): d is SymbolDef => !!d && all.includes(d)) : [];

  const item = (d: SymbolDef) => (
    <button
      key={d.id}
      className={`lib-item ${placing === d.id ? 'active' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-elektro-symbol', d.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => onPick(d.id)}
      title={`${d.name}\n${d.description}`}
    >
      <SymbolIcon symbolId={d.id} size={34} />
      <span>{d.name}</span>
    </button>
  );

  return (
    <aside className="editor-panel library-panel" aria-label="Komponentbibliotek">
      <div className="panel-head">
        <span>Komponenter</span>
        <span className="spacer" />
        <button className="icon-btn" onClick={onClose} title="Lukk biblioteket">
          <X size={16} />
        </button>
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div className="search-box">
          <Search size={14} />
          <input className="input" placeholder="Søk komponent …" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          Dra inn på arket, eller klikk og plasser. Hold Shift for å plassere flere.
        </div>
      </div>
      <div className="panel-scroll">
        {recommended.length > 0 && (
          <div className="lib-group">
            <div className="lib-group-title">Anbefalt for skjematypen</div>
            <div className="lib-grid">{recommended.map(item)}</div>
          </div>
        )}
        {CAT_ORDER.map((cat) => {
          const list = filtered.filter((d) => d.category === cat);
          if (list.length === 0) return null;
          return (
            <div key={cat} className="lib-group">
              <div className="lib-group-title">{CATEGORY_LABEL[cat]}</div>
              <div className="lib-grid">{list.map(item)}</div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="muted small" style={{ padding: 12 }}>Ingen treff.</div>}
      </div>
    </aside>
  );
}
