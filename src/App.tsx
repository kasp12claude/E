import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Toasts } from './components/ui';
import { useProjects } from './store/projects';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectOverviewPage from './pages/ProjectOverviewPage';
import EditorPage from './pages/EditorPage';
import DocLauncherPage from './pages/DocLauncherPage';
import LibraryPage from './pages/LibraryPage';
import SettingsPage from './pages/SettingsPage';
import SimulatorPage from './pages/SimulatorPage';
import CalculatorsPage from './pages/calculators/CalculatorsPage';
import LearnPage from './pages/learn/LearnPage';
import DocumentationPage from './pages/docs/DocumentationPage';
import PlannerPage from './pages/planner/PlannerPage';

// 3D-spillet lastes bare når det åpnes (three.js er stort)
const GamePage = lazy(() => import('./pages/game/GamePage'));
const StoryPage = lazy(() => import('./pages/story/StoryPage'));

export default function App() {
  const refresh = useProjects((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="prosjekter" element={<ProjectsPage />} />
          <Route path="prosjekt/:pid" element={<ProjectOverviewPage />} />
          <Route path="prosjekt/:pid/tegning/:docId" element={<EditorPage />} />
          <Route path="tegneverktoy" element={<DocLauncherPage kind="drawing" />} />
          <Route path="koblingsskjema" element={<DocLauncherPage kind="schematic" />} />
          <Route path="installasjon" element={<DocLauncherPage kind="floorplan" />} />
          <Route path="simulering" element={<SimulatorPage />} />
          <Route path="planlegging" element={<PlannerPage />} />
          <Route path="dokumentasjon/*" element={<DocumentationPage />} />
          <Route path="bibliotek" element={<LibraryPage />} />
          <Route path="beregninger" element={<CalculatorsPage />} />
          <Route path="laer" element={<LearnPage />} />
          <Route
            path="spill"
            element={
              <Suspense fallback={<div className="page muted">Laster spillet …</div>}>
                <GamePage />
              </Suspense>
            }
          />
          <Route
            path="story"
            element={
              <Suspense fallback={<div className="page muted">Laster Story Mode …</div>}>
                <StoryPage />
              </Suspense>
            }
          />
          <Route path="innstillinger" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toasts />
    </>
  );
}
