import { useNavigate } from 'react-router-dom';
import { Cpu, Plus } from 'lucide-react';
import { ProjectGate } from '../components/ProjectGate';
import { Empty, PageHeader, SafetyNotice } from '../components/ui';
import { useProjects } from '../store/projects';
import { EXAMPLES, exampleDoc } from '../sim/examples';
import { StaticDrawing } from '../editor/StaticDrawing';
import { DocCard } from './DocLauncherPage';
import { newDoc } from '../store/factories';

export default function SimulatorPage() {
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <ProjectGate purpose="Simuleringer lagres i et prosjekt slik at du kan åpne dem igjen.">{(p) => <SimHome projectId={p.id} projectName={p.name} />}</ProjectGate>
    </div>
  );
}

function SimHome({ projectId, projectName }: { projectId: string; projectName: string }) {
  const navigate = useNavigate();
  const update = useProjects((s) => s.update);
  const docs = useProjects((s) => s.current?.docs.filter((d) => d.kind === 'simulation') ?? []);

  const openNew = (doc: ReturnType<typeof newDoc>) => {
    update((p) => {
      p.docs.push(doc);
    });
    navigate(`/prosjekt/${projectId}/tegning/${doc.id}`);
  };

  return (
    <div className="page">
      <PageHeader
        title="Kretssimulator"
        icon={<Cpu size={26} color="var(--accent-2)" />}
        description="Bygg trygge, virtuelle lavspenningskretser med strømkilde, ledninger, brytere, lamper, motstander og reléer. Trykk «Simuler» og klikk på brytere for å se om kretsen er lukket, hvor det går strøm og om lampene lyser."
        actions={
          <button className="btn btn-primary" onClick={() => openNew(newDoc('simulation', `Simulering ${docs.length + 1}`))}>
            <Plus size={16} /> Ny tom krets
          </button>
        }
      />
      <SafetyNotice variant="simulation" />
      <h2 style={{ marginTop: 20 }}>Eksempelkretser</h2>
      <p className="muted">Eksempelet kopieres inn i prosjektet «{projectName}», så du kan endre det fritt.</p>
      <div className="grid grid-auto">
        {EXAMPLES.map((ex) => {
          const preview = exampleDoc(ex);
          return (
            <button key={ex.id} className="card clickable example-card" onClick={() => openNew(exampleDoc(ex))}>
              <div className="doc-thumb as-div">
                <StaticDrawing doc={preview} projectName="" ink="#d6e4ff" paper="transparent" withBackground={false} style={{ width: '100%', height: '100%' }} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <b>{ex.name}</b>
                <span className="spacer" />
                <span className="badge badge-blue">{ex.level}</span>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {ex.description}
              </div>
            </button>
          );
        })}
      </div>
      <h2 style={{ marginTop: 28 }}>Mine simuleringer i prosjektet</h2>
      {docs.length === 0 ? (
        <Empty icon={<Cpu size={28} />}>Ingen simuleringer ennå. Start med et eksempel eller en tom krets.</Empty>
      ) : (
        <div className="grid grid-auto">
          {docs.map((d) => (
            <DocCard key={d.id} doc={d} projectId={projectId} projectName={projectName} />
          ))}
        </div>
      )}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Slik bruker du simulatoren</div>
        <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Plasser en strømkilde (likespenning), brytere, lamper og motstander fra komponentbiblioteket.</li>
          <li>Tegn ledninger fra terminal til terminal (dra fra en terminal eller bruk ledningsverktøyet W).</li>
          <li>Trykk «Simuler». Klikk på brytere for å slå dem av/på, og hold inne trykknapper.</li>
          <li>Les av spenning i punktene, strøm og tilstand i panelet til høyre. Feilmeldinger vises ved manglende forbindelser eller kortslutning.</li>
          <li>Reléer og kontaktorer: gi kontaktene samme betegnelse som spolen (f.eks. K1).</li>
        </ol>
      </div>
    </div>
  );
}
