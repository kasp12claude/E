import { useMemo, useState } from 'react';
import { Library, Search } from 'lucide-react';
import { PREFIX_NOTE, SYMBOLS, defaultProps } from '../library/symbols';
import { CATEGORY_LABEL, type SymbolCategory } from '../library/types';
import { SymbolIcon } from '../editor/SymbolIcon';
import { PageHeader, Notice } from '../components/ui';
import { DOC_KIND_LABEL } from '../store/factories';
import './pages.css';

const CATS: (SymbolCategory | 'alle')[] = ['alle', 'elektrisk', 'installasjon', 'plan', 'dokumentasjon'];

export default function LibraryPage() {
  const [cat, setCat] = useState<SymbolCategory | 'alle'>('alle');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(SYMBOLS[0].id);
  const list = useMemo(
    () =>
      SYMBOLS.filter((s) => (cat === 'alle' || s.category === cat) && `${s.name} ${s.description} ${s.group}`.toLowerCase().includes(q.trim().toLowerCase())),
    [cat, q],
  );
  const def = SYMBOLS.find((s) => s.id === sel) ?? SYMBOLS[0];
  const groups = [...new Set(list.map((s) => `${s.category}|${s.group}`))];

  return (
    <div className="page">
      <PageHeader
        title="Komponentbibliotek"
        icon={<Library size={26} color="var(--accent-2)" />}
        description="Alle symboler som kan brukes i tegneverktøyet, koblingsskjema og installasjonsplanleggeren. Velg et symbol for å se beskrivelse, tekniske egenskaper, terminaler og kilde."
      />
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="search-box" style={{ position: 'relative', width: 300 }}>
          <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
          <input className="input" style={{ paddingLeft: 28 }} placeholder="Søk …" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="chips">
        {CATS.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c === 'alle' ? 'Alle' : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <div className="lib-page">
        <div>
          {groups.map((g) => {
            const [c, group] = g.split('|');
            const items = list.filter((s) => s.category === c && s.group === group);
            return (
              <div key={g} style={{ marginBottom: 16 }}>
                <div className="lib-group-title" style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                  {CATEGORY_LABEL[c as SymbolCategory]} · {group}
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                  {items.map((s) => (
                    <button key={s.id} className={`lib-card ${sel === s.id ? 'active' : ''}`} onClick={() => setSel(s.id)}>
                      <SymbolIcon symbolId={s.id} size={48} />
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {list.length === 0 && <div className="muted">Ingen treff.</div>}
        </div>
        <div className="card lib-detail">
          <div className="big-symbol">
            <SymbolIcon symbolId={def.id} size={130} />
          </div>
          <h2 style={{ marginBottom: 2 }}>{def.name}</h2>
          <div className="small muted" style={{ marginBottom: 10 }}>
            {CATEGORY_LABEL[def.category]} · {def.group}
          </div>
          <p>{def.description}</p>
          {def.howItWorks && (
            <p>
              <b>Slik virker den:</b> {def.howItWorks}
            </p>
          )}
          <table className="table" style={{ marginBottom: 12 }}>
            <tbody>
              <tr>
                <th style={{ width: 150 }}>Bokstavkode</th>
                <td>{def.prefix || '–'}</td>
              </tr>
              <tr>
                <th>Terminaler</th>
                <td className="mono">{def.terminals.length ? def.terminals.map((t) => t.name || t.id).join(', ') : 'Ingen (plansymbol)'}</td>
              </tr>
              {def.props.map((pd) => (
                <tr key={pd.key}>
                  <th>{pd.label}</th>
                  <td>
                    {defaultProps(def)[pd.key]} {pd.unit}
                    {pd.options && <span className="muted small"> ({pd.options.join(' / ')})</span>}
                  </td>
                </tr>
              ))}
              <tr>
                <th>Brukes i</th>
                <td>{def.kinds.map((k) => DOC_KIND_LABEL[k]).join(', ')}</td>
              </tr>
              <tr>
                <th>Simulering</th>
                <td>{def.sim ? 'Ja' : 'Nei'}</td>
              </tr>
            </tbody>
          </table>
          <Notice kind="info" title="Kilde og standard">
            {def.standard}
            {def.prefix && <div style={{ marginTop: 4 }}>{PREFIX_NOTE}</div>}
          </Notice>
        </div>
      </div>
    </div>
  );
}
