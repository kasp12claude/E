import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { SYMBOLS } from '../../library/symbols';
import { CATEGORY_LABEL } from '../../library/types';
import { SymbolIcon } from './SymbolIcon';

/** Oppslag: hvordan fungerer komponentene? */
export function HowItWorks() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(SYMBOLS.find((s) => s.howItWorks)?.id ?? SYMBOLS[0].id);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SYMBOLS.filter((s) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).sort(
      (a, b) => Number(!!b.howItWorks) - Number(!!a.howItWorks) || a.name.localeCompare(b.name, 'nb'),
    );
  }, [query]);
  const def = SYMBOLS.find((s) => s.id === selected)!;

  return (
    <div className="learn-how">
      <div className="card learn-how-list">
        <div className="input-unit" style={{ marginBottom: 8 }}>
          <input className="input" placeholder="Søk etter komponent …" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Søk etter komponent" />
          <span>
            <Search size={14} />
          </span>
        </div>
        <div className="learn-how-items">
          {list.map((s) => (
            <button key={s.id} className={`learn-how-item ${s.id === selected ? 'active' : ''}`} onClick={() => setSelected(s.id)}>
              <SymbolIcon id={s.id} size={34} />
              <span>
                {s.name}
                {s.howItWorks && <span className="badge badge-blue" style={{ marginLeft: 6 }}>forklaring</span>}
              </span>
            </button>
          ))}
          {list.length === 0 && <p className="muted small">Ingen treff.</p>}
        </div>
      </div>
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          <div className="learn-symbol-big">
            <SymbolIcon id={def.id} size={120} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2>{def.name}</h2>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="badge">{CATEGORY_LABEL[def.category]}</span>
              <span className="badge">{def.group}</span>
              {def.prefix && <span className="badge badge-blue">Bokstavkode: {def.prefix}</span>}
            </div>
            <p>{def.description}</p>
          </div>
        </div>
        <h3>Slik fungerer den</h3>
        <p>{def.howItWorks ?? 'Det er ikke skrevet en utdypende forklaring for denne komponenten ennå. Se beskrivelsen over og produsentens dokumentasjon.'}</p>
        {def.props.length > 0 && (
          <>
            <h3>Typiske egenskaper</h3>
            <table className="table">
              <tbody>
                {def.props.map((p) => (
                  <tr key={p.key}>
                    <th style={{ width: '45%' }}>{p.label}</th>
                    <td>
                      {p.default}
                      {p.unit ? ` ${p.unit}` : ''} <span className="small muted">(eksempelverdi)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {def.terminals.length > 0 && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Tilkoblinger: {def.terminals.map((t) => t.name || t.id).join(', ')}
          </p>
        )}
        <p className="small muted">Kilde/standard: {def.standard}</p>
      </div>
    </div>
  );
}
