import { useState } from 'react';
import { Download, Plus, Trash2, Wand2 } from 'lucide-react';
import type { MaterialItem, Project } from '../../types';
import { Empty, Notice, confirmAction, toast } from '../../components/ui';
import { downloadBlob, safeFilename, uid } from '../../utils/id';
import { AUTO_NOTE, materialsFromDocs } from './plannerUtils';
import type { PlanUpdater } from './PlannerPage';

const UNITS = ['stk', 'm', 'pk', 'rull', 'sett', 'kg'];

export function MaterialsTab({ project, upd }: { project: Project; upd: PlanUpdater }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('stk');
  const items = project.plan.materials;

  const set = (id: string, patch: Partial<MaterialItem>) =>
    upd((pl) => {
      const m = pl.materials.find((x) => x.id === id);
      if (m) Object.assign(m, patch);
    });

  const fromDrawings = () => {
    const found = materialsFromDocs(project.docs);
    if (found.length === 0) {
      toast('Fant ingen komponenter eller kabler i prosjektets tegninger', true);
      return;
    }
    const hadAuto = items.some((m) => m.note === AUTO_NOTE);
    if (hadAuto && !confirmAction('Linjer som er hentet fra tegningene tidligere blir erstattet. Linjer du har lagt inn selv beholdes. Fortsette?')) return;
    upd((pl) => {
      pl.materials = [...pl.materials.filter((m) => m.note !== AUTO_NOTE), ...found.map((f) => ({ id: uid('mat'), name: f.name, qty: f.qty, unit: f.unit, note: AUTO_NOTE }))];
    });
    toast(`${found.length} materiallinjer hentet fra tegningene`);
  };

  const exportCsv = () => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = ['Materiale;Antall;Enhet;Merknad', ...items.map((m) => [esc(m.name), String(m.qty).replace('.', ','), esc(m.unit), esc(m.note ?? '')].join(';'))];
    downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${safeFilename(project.name)}-materialliste.csv`);
  };

  return (
    <div className="col" style={{ gap: 14 }}>
      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const q = Number(qty.replace(',', '.'));
          upd((pl) => void pl.materials.push({ id: uid('mat'), name: name.trim(), qty: Number.isFinite(q) ? q : 1, unit }));
          setName('');
          setQty('1');
        }}
      >
        <input className="input" style={{ flex: 2, minWidth: 180 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Materiale, f.eks. «Stikkontakt 2-veis»" />
        <input className="input" style={{ width: 80 }} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" aria-label="Antall" />
        <select className="select" style={{ width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Enhet">
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit" disabled={!name.trim()}>
          <Plus size={16} /> Legg til
        </button>
      </form>

      <div className="row">
        <button className="btn" onClick={fromDrawings}>
          <Wand2 size={16} /> Hent fra plantegninger/skjema
        </button>
        <button className="btn" onClick={exportCsv} disabled={items.length === 0}>
          <Download size={16} /> Eksporter CSV
        </button>
        <span className="spacer" />
        <span className="small muted">{items.length} linjer</span>
      </div>

      <Notice kind="info">
        «Hent fra tegninger» teller komponentene i prosjektets tegninger og summerer kabellengder som er tegnet med kabelverktøyet i plantegninger (1 rute = 10 cm). Lengdene er
        tegnede lengder uten tillegg for høyder, oppkoblinger og kapp – kontroller mengdene før bestilling.
      </Notice>

      {items.length === 0 ? (
        <Empty>Materiallisten er tom.</Empty>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Materiale</th>
                <th style={{ width: 100 }}>Antall</th>
                <th style={{ width: 100 }}>Enhet</th>
                <th>Merknad</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <input className="input" value={m.name} onChange={(e) => set(m.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      min={0}
                      value={Number.isFinite(m.qty) ? m.qty : 0}
                      onChange={(e) => set(m.id, { qty: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input className="input" value={m.unit} onChange={(e) => set(m.id, { unit: e.target.value })} list="es-units" />
                  </td>
                  <td>
                    <input className="input" value={m.note ?? ''} onChange={(e) => set(m.id, { note: e.target.value })} />
                  </td>
                  <td>
                    <button className="icon-btn" title="Fjern" onClick={() => upd((pl) => void (pl.materials = pl.materials.filter((x) => x.id !== m.id)))}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="es-units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
