import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, LayoutGrid, PencilRuler, Plus, Trash2, Waypoints } from 'lucide-react';
import type { DocKind, DrawingDoc, SchematicMode } from '../types';
import { ProjectGate } from '../components/ProjectGate';
import { Empty, PageHeader, SafetyNotice, toast } from '../components/ui';
import { DOC_KIND_LABEL, SCHEMATIC_MODES, modeName } from '../store/factories';
import { useProjects } from '../store/projects';
import { StaticDrawing } from '../editor/StaticDrawing';
import { formatDateTime, uid } from '../utils/id';

const INFO: Record<DocKind, { title: string; description: string; icon: typeof PencilRuler; newName: string }> = {
  drawing: {
    title: 'Tegneverktøy',
    description: 'Fri tegning med alle symboler, ledninger, tekst og mål. Passer for skisser, prinsipptegninger og annet som ikke er et rent koblingsskjema.',
    icon: PencilRuler,
    newName: 'Tegning',
  },
  schematic: {
    title: 'Koblingsskjema',
    description: 'Lag ryddige koblingsskjema med referansebetegnelser, klemmenummer og ledningsnummer. Velg type skjema under.',
    icon: Waypoints,
    newName: 'Koblingsskjema',
  },
  floorplan: {
    title: 'Installasjonsplanlegging',
    description: 'Tegn rom og vegger ovenfra, og plasser lamper, brytere, stikkontakter, koblingsbokser og kabelruter. Plantegningen holdes adskilt fra koblingsskjemaet, men ligger i samme prosjekt.',
    icon: LayoutGrid,
    newName: 'Plantegning',
  },
  simulation: {
    title: 'Simulering',
    description: '',
    icon: Waypoints,
    newName: 'Simulering',
  },
};

export function DocCard({ doc, projectId, projectName }: { doc: DrawingDoc; projectId: string; projectName: string }) {
  const navigate = useNavigate();
  const { update, removeDoc } = useProjects();
  return (
    <div className="card doc-card">
      <button className="doc-thumb" onClick={() => navigate(`/prosjekt/${projectId}/tegning/${doc.id}`)} title="Åpne">
        {doc.elements.length ? (
          <StaticDrawing doc={{ ...doc, sheet: { ...doc.sheet, show: false } }} projectName={projectName} ink="#d6e4ff" paper="transparent" withBackground={false} style={{ width: '100%', height: '100%' }} />
        ) : (
          <span className="muted small">Tom tegning</span>
        )}
      </button>
      <div className="row" style={{ marginTop: 10, flexWrap: 'nowrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
          <div className="small muted">
            {doc.kind === 'schematic' ? modeName(doc.mode) : DOC_KIND_LABEL[doc.kind]} · {formatDateTime(doc.updatedAt)}
          </div>
        </div>
        <button
          className="icon-btn"
          title="Dupliser"
          onClick={() => {
            update((p) => {
              const src = p.docs.find((d) => d.id === doc.id);
              if (src) p.docs.push({ ...structuredClone(src), id: uid('doc'), name: `${src.name} (kopi)`, createdAt: Date.now(), updatedAt: Date.now() });
            });
            toast('Tegningen er duplisert');
          }}
        >
          <Copy size={16} />
        </button>
        <button
          className="icon-btn"
          title="Slett"
          onClick={() => {
            if (window.confirm(`Slette «${doc.name}»? Dette kan ikke angres.`)) removeDoc(doc.id);
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function DocLauncherPage({ kind }: { kind: DocKind }) {
  const info = INFO[kind];
  return (
    <ProjectGate purpose={`${info.title} lagres i et prosjekt.`}>
      {(project) => <Launcher kind={kind} projectId={project.id} projectName={project.name} docs={project.docs.filter((d) => d.kind === kind)} />}
    </ProjectGate>
  );
}

function Launcher({ kind, projectId, projectName, docs }: { kind: DocKind; projectId: string; projectName: string; docs: DrawingDoc[] }) {
  const info = INFO[kind];
  const Icon = info.icon;
  const navigate = useNavigate();
  const addDoc = useProjects((s) => s.addDoc);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<SchematicMode>('prinsipp');

  const create = () => {
    const doc = addDoc(kind, name.trim() || `${info.newName} ${docs.length + 1}`, kind === 'schematic' ? mode : undefined);
    if (doc) navigate(`/prosjekt/${projectId}/tegning/${doc.id}`);
  };

  return (
    <div className="page">
      <PageHeader title={info.title} icon={<Icon size={26} color="var(--accent-2)" />} description={info.description} />
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">
          <Plus size={18} /> Ny {info.newName.toLowerCase()} i «{projectName}»
        </div>
        {kind === 'schematic' && (
          <div className="mode-grid">
            {SCHEMATIC_MODES.map((m) => (
              <button key={m.id} className={`mode-card ${mode === m.id ? 'active' : ''}`} onClick={() => setMode(m.id)}>
                <b>{m.name}</b>
                <span>{m.description}</span>
              </button>
            ))}
          </div>
        )}
        <form
          className="row"
          style={{ marginTop: kind === 'schematic' ? 14 : 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <input className="input" style={{ maxWidth: 360 }} placeholder={`Navn, f.eks. ${info.newName} ${docs.length + 1}`} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            <Plus size={16} /> Opprett og åpne
          </button>
        </form>
      </div>
      <h2>I dette prosjektet</h2>
      {docs.length === 0 ? (
        <Empty icon={<Icon size={28} />}>Ingen {DOC_KIND_LABEL[kind].toLowerCase()}er ennå. Opprett en over.</Empty>
      ) : (
        <div className="grid grid-auto">
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} projectId={projectId} projectName={projectName} />
          ))}
        </div>
      )}
      <div style={{ marginTop: 20 }}>
        <SafetyNotice variant="drawing" />
      </div>
    </div>
  );
}
