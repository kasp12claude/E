import { useState } from 'react';
import { ListPlus, Plus, Trash2 } from 'lucide-react';
import type { Project } from '../../types';
import { Empty, toast } from '../../components/ui';
import { uid } from '../../utils/id';
import { COMMON_TOOLS } from './plannerUtils';
import type { PlanUpdater } from './PlannerPage';

export function ToolsTab({ project, upd }: { project: Project; upd: PlanUpdater }) {
  const [name, setName] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const tools = project.plan.tools;
  const shown = onlyMissing ? tools.filter((t) => !t.have) : tools;
  const missing = tools.filter((t) => !t.have).length;

  const addCommon = () => {
    const existing = new Set(tools.map((t) => t.name.toLowerCase()));
    const add = COMMON_TOOLS.filter((t) => !existing.has(t.toLowerCase()));
    if (add.length === 0) {
      toast('Alle vanlige verktøy er allerede i listen');
      return;
    }
    upd((pl) => void pl.tools.push(...add.map((n) => ({ id: uid('tool'), name: n, have: false }))));
    toast(`${add.length} verktøy lagt til`);
  };

  return (
    <div className="col" style={{ gap: 14 }}>
      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          upd((pl) => void pl.tools.push({ id: uid('tool'), name: name.trim(), have: false }));
          setName('');
        }}
      >
        <input className="input" style={{ flex: 1, minWidth: 200 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Verktøy, f.eks. «Multimeter»" />
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          <Plus size={16} /> Legg til
        </button>
        <button className="btn" type="button" onClick={addCommon}>
          <ListPlus size={16} /> Legg til vanlige verktøy
        </button>
      </form>
      <div className="row">
        <label className="checkbox small">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} /> Vis bare det som mangler
        </label>
        <span className="spacer" />
        <span className={`badge ${missing ? 'badge-yellow' : 'badge-green'}`}>{missing ? `${missing} mangler` : 'Alt er på plass'}</span>
      </div>
      {tools.length === 0 ? (
        <Empty>Verktøylisten er tom.</Empty>
      ) : (
        <div className="card col" style={{ gap: 2 }}>
          {shown.map((t) => (
            <div key={t.id} className={`row check-line ${t.have ? 'done' : ''}`} style={{ flexWrap: 'nowrap' }}>
              <input
                type="checkbox"
                checked={t.have}
                title="Har verktøyet"
                onChange={(e) =>
                  upd((pl) => {
                    const x = pl.tools.find((y) => y.id === t.id);
                    if (x) x.have = e.target.checked;
                  })
                }
              />
              <input
                className="input plain-input"
                value={t.name}
                onChange={(e) =>
                  upd((pl) => {
                    const x = pl.tools.find((y) => y.id === t.id);
                    if (x) x.name = e.target.value;
                  })
                }
              />
              <span className={`badge ${t.have ? 'badge-green' : 'badge-yellow'}`}>{t.have ? 'Har' : 'Mangler'}</span>
              <button className="icon-btn" title="Fjern" onClick={() => upd((pl) => void (pl.tools = pl.tools.filter((x) => x.id !== t.id)))}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
