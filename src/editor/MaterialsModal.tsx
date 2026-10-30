import { useMemo } from 'react';
import { Download, ListPlus } from 'lucide-react';
import type { DrawingDoc } from '../types';
import { Modal, Notice, toast } from '../components/ui';
import { materialsCsv, materialsFromDoc } from './materials';
import { downloadBlob, safeFilename, uid } from '../utils/id';
import { useProjects } from '../store/projects';

export function MaterialsModal({ doc, onClose }: { doc: DrawingDoc; onClose: () => void }) {
  const rows = useMemo(() => materialsFromDoc(doc), [doc]);
  const update = useProjects((s) => s.update);
  const toPlan = () => {
    update((p) => {
      for (const r of rows) {
        if (r.key === 'wire') continue;
        const name = r.spec ? `${r.name} (${r.spec})` : r.name;
        const existing = p.plan.materials.find((m) => m.name === name && m.unit === r.unit);
        const qty = r.unit === 'm' ? Math.ceil(r.qty * 10) / 10 : r.qty;
        if (existing) existing.qty = qty;
        else p.plan.materials.push({ id: uid('mat'), name, qty, unit: r.unit, note: `Fra «${doc.name}»` });
      }
    });
    toast('Materiallisten er overført til prosjektplanen');
  };
  return (
    <Modal
      wide
      title={`Materialliste og komponentoversikt – ${doc.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={() => downloadBlob(new Blob([materialsCsv(rows)], { type: 'text/csv;charset=utf-8' }), `${safeFilename(doc.name)}-materialliste.csv`)} disabled={rows.length === 0}>
            <Download size={16} /> Last ned CSV
          </button>
          <button className="btn btn-primary" onClick={toPlan} disabled={rows.length === 0}>
            <ListPlus size={16} /> Overfør til prosjektplanen
          </button>
        </>
      }
    >
      <Notice kind="info">
        Listen er laget automatisk fra symbolene og kabelrutene i tegningen. Kabellengder måles langs tegnet rute (1 rute = 10 cm) og inkluderer ikke tillegg for
        tilkobling, høydeforskjeller eller kapp – kontroller og juster før bestilling.
      </Notice>
      {rows.length === 0 ? (
        <div className="empty">Tegningen inneholder ingen komponenter ennå.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Komponent</th>
                <th>Spesifikasjon</th>
                <th style={{ textAlign: 'right' }}>Antall</th>
                <th>Enhet</th>
                <th>Betegnelser</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.name}</td>
                  <td className="muted">{r.spec}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.unit === 'm' ? r.qty.toFixed(1).replace('.', ',') : r.qty}</td>
                  <td>{r.unit}</td>
                  <td className="mono small">{r.labels.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
