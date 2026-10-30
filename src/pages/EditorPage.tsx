import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProjects } from '../store/projects';
import { Editor } from '../editor/Editor';
import { useSimulation } from '../sim/useSimulation';
import type { DrawingDoc } from '../types';
import { DOC_KIND_LABEL } from '../store/factories';
import { StoryBanner, readBanner } from './story/StoryBanner';

export default function EditorPage() {
  const { pid, docId } = useParams();
  const { current, open } = useProjects();
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (pid && current?.id !== pid) {
      void open(pid).then((p) => setMissing(!p));
    }
  }, [pid, current?.id, open]);

  if (missing) {
    return (
      <div className="page">
        <h2>Fant ikke prosjektet</h2>
        <Link to="/prosjekter">Til Mine prosjekter</Link>
      </div>
    );
  }
  if (!current || current.id !== pid) return <div className="page muted">Laster …</div>;
  const doc = current.docs.find((d) => d.id === docId);
  if (!doc) {
    return (
      <div className="page">
        <h2>Fant ikke tegningen</h2>
        <Link to={`/prosjekt/${current.id}`}>Til prosjektoversikten</Link>
      </div>
    );
  }
  return <EditorWithSim key={doc.id} doc={doc} projectName={current.name} docs={current.docs} projectId={current.id} />;
}

function EditorWithSim({ doc, projectName, docs, projectId }: { doc: DrawingDoc; projectName: string; docs: DrawingDoc[]; projectId: string }) {
  const replaceDoc = useProjects((s) => s.replaceDoc);
  const navigate = useNavigate();
  // Simuleringen bruker siste lagrede versjon av dokumentet fra prosjektet
  const live = useProjects((s) => s.current?.docs.find((d) => d.id === doc.id)) ?? doc;
  const canSim = doc.kind === 'simulation' || doc.kind === 'schematic';
  const sim = useSimulation(live, doc.kind === 'simulation' && doc.elements.length > 0);

  const header = (
    <>
      <button className="icon-btn" onClick={() => navigate(`/prosjekt/${projectId}`)} title="Tilbake til prosjektet">
        <ArrowLeft size={18} />
      </button>
      <select
        className="select"
        style={{ width: 'auto', maxWidth: 220, height: 32, padding: '4px 8px' }}
        value={doc.id}
        onChange={(e) => navigate(`/prosjekt/${projectId}/tegning/${e.target.value}`)}
        title="Bytt mellom tegninger i prosjektet"
      >
        {docs.map((d) => (
          <option key={d.id} value={d.id}>
            {DOC_KIND_LABEL[d.kind]}: {d.name}
          </option>
        ))}
      </select>
      <span className="tb-sep" />
    </>
  );

  const editor = (
    <Editor
      doc={doc}
      projectName={projectName}
      onCommit={replaceDoc}
      headerLeft={header}
      sim={canSim ? sim.overlay : undefined}
      toolbarExtra={canSim ? sim.toolbarButtons : undefined}
      sidePanel={canSim ? sim.panel : undefined}
    />
  );
  // Tegning som hører til et Story Mode-oppdrag: vis oppdraget og en knapp tilbake
  const story = readBanner(doc.id);
  if (!story) return editor;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <StoryBanner info={story} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{editor}</div>
    </div>
  );
}
