import { Route, Routes } from 'react-router-dom';
import { ProjectGate } from '../../components/ProjectGate';
import { ReportList } from './ReportList';
import { ReportEditor } from './ReportEditor';
import './docs.css';

export default function DocumentationPage() {
  return (
    <ProjectGate purpose="Rapporter og dokumentasjon lagres i et prosjekt, sammen med tegninger og vedlegg.">
      {(project) => (
        <Routes>
          <Route index element={<ReportList project={project} />} />
          <Route path=":rid" element={<ReportEditor project={project} />} />
        </Routes>
      )}
    </ProjectGate>
  );
}
