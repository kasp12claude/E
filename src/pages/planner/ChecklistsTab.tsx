import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Checklist, Project } from '../../types';
import { Empty, Progress, confirmAction } from '../../components/ui';
import { uid } from '../../utils/id';
import type { PlanUpdater } from './PlannerPage';

export function ChecklistsTab({ project, upd }: { project: Project; upd: PlanUpdater }) {
  const [title, setTitle] = useState('');
  const lists = project.plan.checklists;
  return (
    <div className="col" style={{ gap: 14 }}>
      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          upd((pl) => void pl.checklists.push({ id: uid('cl'), title: title.trim(), items: [] }));
          setTitle('');
        }}
      >
        <input className="input" style={{ flex: 1, minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ny sjekkliste, f.eks. «Før spenningssetting»" />
        <button className="btn btn-primary" type="submit" disabled={!title.trim()}>
          <Plus size={16} /> Ny sjekkliste
        </button>
      </form>
      {lists.length === 0 ? (
        <Empty>Ingen sjekklister. Lag en liste for faste kontrollpunkter i prosjektet.</Empty>
      ) : (
        <div className="grid grid-2">
          {lists.map((l) => (
            <ChecklistCard key={l.id} list={l} upd={upd} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistCard({ list, upd }: { list: Checklist; upd: PlanUpdater }) {
  const [text, setText] = useState('');
  const done = list.items.filter((i) => i.done).length;
  const mut = (fn: (l: Checklist) => void) =>
    upd((pl) => {
      const l = pl.checklists.find((x) => x.id === list.id);
      if (l) fn(l);
    });
  return (
    <div className="card">
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input className="input list-title" value={list.title} onChange={(e) => mut((l) => void (l.title = e.target.value))} aria-label="Navn på sjekkliste" />
        <button
          className="icon-btn"
          title="Slett sjekkliste"
          onClick={() => confirmAction(`Slette sjekklisten «${list.title}»?`) && upd((pl) => void (pl.checklists = pl.checklists.filter((x) => x.id !== list.id)))}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="row small muted" style={{ margin: '6px 0' }}>
        {done} av {list.items.length} utført
      </div>
      <Progress value={list.items.length ? done / list.items.length : 0} />
      <div className="col" style={{ gap: 2, marginTop: 10 }}>
        {list.items.map((it, i) => (
          <div key={it.id} className={`row check-line ${it.done ? 'done' : ''}`} style={{ flexWrap: 'nowrap' }}>
            <input type="checkbox" checked={it.done} onChange={(e) => mut((l) => void (l.items[i].done = e.target.checked))} aria-label="Utført" />
            <input className="input plain-input" value={it.text} onChange={(e) => mut((l) => void (l.items[i].text = e.target.value))} />
            <button className="icon-btn" title="Fjern punkt" onClick={() => mut((l) => void l.items.splice(i, 1))}>
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
      <form
        className="row"
        style={{ marginTop: 8, flexWrap: 'nowrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          mut((l) => void l.items.push({ id: uid('ci'), text: text.trim(), done: false }));
          setText('');
        }}
      >
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nytt punkt …" />
        <button className="btn btn-sm" type="submit" disabled={!text.trim()}>
          <Plus size={14} />
        </button>
      </form>
    </div>
  );
}
