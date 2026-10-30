import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, FolderOpen, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useProjects } from '../store/projects';
import { NewProjectModal } from '../components/NewProjectModal';
import { Empty, PageHeader, toast } from '../components/ui';
import { downloadBlob, formatDateTime, safeFilename } from '../utils/id';
import { projectRepo } from '../storage';

export default function ProjectsPage() {
  const { summaries, open, remove, duplicate, exportProject, importProject, current, update } = useProjects();
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const list = summaries.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(q.toLowerCase()));

  const rename = async (id: string, oldName: string) => {
    const name = window.prompt('Nytt navn på prosjektet:', oldName);
    if (!name || name === oldName) return;
    if (current?.id === id) update((p) => void (p.name = name));
    else {
      const p = await projectRepo.get(id);
      if (p) {
        await projectRepo.save({ ...p, name, updatedAt: Date.now() });
        await useProjects.getState().refresh();
      }
    }
    toast('Prosjektet har fått nytt navn');
  };

  return (
    <div className="page">
      <PageHeader
        title="Mine prosjekter"
        description="Prosjektene lagres lokalt i denne nettleseren (IndexedDB). Ta sikkerhetskopi ved å eksportere prosjektet som fil."
        actions={
          <>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Importer
            </button>
            <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
              <Plus size={16} /> Nytt prosjekt
            </button>
          </>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept=".json,.elektro.json,application/json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const p = await importProject(await f.text());
            toast(`Importerte «${p.name}»`);
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Import feilet', true);
          }
        }}
      />
      <div className="search-box" style={{ maxWidth: 360, marginBottom: 16, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
        <input className="input" style={{ paddingLeft: 28 }} placeholder="Søk i prosjekter …" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {list.length === 0 ? (
        <Empty icon={<FolderOpen size={28} />}>{summaries.length ? 'Ingen treff.' : 'Ingen prosjekter ennå. Trykk «Nytt prosjekt» for å starte.'}</Empty>
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Prosjekt</th>
                <th className="hide-sm">Tegninger</th>
                <th className="hide-sm">Sist endret</th>
                <th style={{ width: 200 }} />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: 0, height: 'auto', fontWeight: 600, justifyContent: 'flex-start' }}
                      onClick={async () => {
                        await open(s.id);
                        navigate(`/prosjekt/${s.id}`);
                      }}
                    >
                      {s.name}
                    </button>
                    {current?.id === s.id && <span className="badge badge-blue" style={{ marginLeft: 8 }}>Åpent</span>}
                    {s.description && <div className="small muted">{s.description}</div>}
                  </td>
                  <td className="hide-sm">{s.docCount}</td>
                  <td className="hide-sm">{formatDateTime(s.updatedAt)}</td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <button className="icon-btn" title="Gi nytt navn" onClick={() => rename(s.id, s.name)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Dupliser"
                        onClick={async () => {
                          await duplicate(s.id);
                          toast('Prosjektet er duplisert');
                        }}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Eksporter som fil (sikkerhetskopi)"
                        onClick={async () => {
                          const blob = await exportProject(s.id);
                          if (blob) downloadBlob(blob, `${safeFilename(s.name)}.elektro.json`);
                        }}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Slett"
                        onClick={async () => {
                          if (window.confirm(`Slette prosjektet «${s.name}» med alle tegninger, rapporter og vedlegg? Dette kan ikke angres.`)) {
                            await remove(s.id);
                            toast('Prosjektet er slettet');
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {newOpen && <NewProjectModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}
