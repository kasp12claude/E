import { useState } from 'react';
import { CalendarRange, ClipboardList, LayoutDashboard, ListChecks, Package, Paperclip, StickyNote, Wrench, CheckSquare } from 'lucide-react';
import { ProjectGate } from '../../components/ProjectGate';
import { PageHeader, Tabs } from '../../components/ui';
import { useProjects } from '../../store/projects';
import type { PlanData, Project } from '../../types';
import { OverviewTab } from './OverviewTab';
import { TasksTab } from './TasksTab';
import { GanttTab } from './GanttTab';
import { ChecklistsTab } from './ChecklistsTab';
import { MaterialsTab } from './MaterialsTab';
import { ToolsTab } from './ToolsTab';
import { AttachmentsTab } from './AttachmentsTab';
import './planner.css';

export type TabId = 'oversikt' | 'oppgaver' | 'fremdrift' | 'sjekklister' | 'materialer' | 'verktoy' | 'notater' | 'vedlegg';

export type PlanUpdater = (fn: (plan: PlanData, project: Project) => void) => void;

export default function PlannerPage() {
  return (
    <ProjectGate purpose="Prosjektplanen lagres i prosjektet sammen med tegninger og dokumentasjon.">
      {(project) => <Planner project={project} />}
    </ProjectGate>
  );
}

function Planner({ project }: { project: Project }) {
  const [tab, setTab] = useState<TabId>(() => (sessionStorage.getItem('es-planner-tab') as TabId) || 'oversikt');
  const update = useProjects((s) => s.update);
  const upd: PlanUpdater = (fn) => update((p) => fn(p.plan, p));
  const select = (t: TabId) => {
    setTab(t);
    sessionStorage.setItem('es-planner-tab', t);
  };
  const plan = project.plan;
  const openTasks = plan.tasks.filter((t) => t.status !== 'ferdig').length;

  return (
    <div className="page planner">
      <PageHeader
        icon={<ClipboardList size={26} color="var(--accent-2)" />}
        title="Prosjektplanlegger"
        description={`Planlegg «${project.name}» fra start til slutt: oppgaver, sjekklister, materialer, verktøy, fremdrift og vedlegg.`}
      />
      <Tabs<TabId>
        value={tab}
        onChange={select}
        tabs={[
          { id: 'oversikt', label: <span className="tab-l"><LayoutDashboard size={15} /> Oversikt</span> },
          { id: 'oppgaver', label: <span className="tab-l"><CheckSquare size={15} /> Oppgaver {openTasks > 0 && <span className="badge">{openTasks}</span>}</span> },
          { id: 'fremdrift', label: <span className="tab-l"><CalendarRange size={15} /> Fremdriftsplan</span> },
          { id: 'sjekklister', label: <span className="tab-l"><ListChecks size={15} /> Sjekklister</span> },
          { id: 'materialer', label: <span className="tab-l"><Package size={15} /> Materialer</span> },
          { id: 'verktoy', label: <span className="tab-l"><Wrench size={15} /> Verktøy</span> },
          { id: 'notater', label: <span className="tab-l"><StickyNote size={15} /> Notater</span> },
          { id: 'vedlegg', label: <span className="tab-l"><Paperclip size={15} /> Bilder og vedlegg {project.attachments.length > 0 && <span className="badge">{project.attachments.length}</span>}</span> },
        ]}
      />
      {tab === 'oversikt' && <OverviewTab project={project} upd={upd} goTo={select} />}
      {tab === 'oppgaver' && <TasksTab project={project} upd={upd} />}
      {tab === 'fremdrift' && <GanttTab project={project} upd={upd} />}
      {tab === 'sjekklister' && <ChecklistsTab project={project} upd={upd} />}
      {tab === 'materialer' && <MaterialsTab project={project} upd={upd} />}
      {tab === 'verktoy' && <ToolsTab project={project} upd={upd} />}
      {tab === 'notater' && (
        <div className="card">
          <div className="card-title">
            <StickyNote size={18} /> Notater
          </div>
          <textarea
            className="textarea"
            rows={16}
            value={plan.notes}
            placeholder="Notater om prosjektet: avklaringer, mål, spørsmål til lærer, erfaringer …"
            onChange={(e) => upd((pl) => void (pl.notes = e.target.value))}
          />
          <div className="small muted" style={{ marginTop: 6 }}>
            Lagres automatisk.
          </div>
        </div>
      )}
      {tab === 'vedlegg' && <AttachmentsTab project={project} />}
    </div>
  );
}
