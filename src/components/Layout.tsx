import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calculator,
  ClipboardList,
  Cpu,
  FileText,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  Home,
  LayoutGrid,
  Library,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PencilRuler,
  Plus,
  Settings,
  Trophy,
  Waypoints,
  Zap,
} from 'lucide-react';
import { useProjects } from '../store/projects';
import { NewProjectModal } from './NewProjectModal';

export const NAV = [
  { section: 'Start' },
  { to: '/', label: 'Forside', icon: Home, end: true },
  { action: 'new', label: 'Nytt prosjekt', icon: Plus },
  { to: '/prosjekter', label: 'Mine prosjekter', icon: FolderOpen },
  { section: 'Verktøy' },
  { to: '/tegneverktoy', label: 'Tegneverktøy', icon: PencilRuler },
  { to: '/koblingsskjema', label: 'Koblingsskjema', icon: Waypoints },
  { to: '/installasjon', label: 'Installasjonsplanlegging', icon: LayoutGrid },
  { to: '/simulering', label: 'Simulering', icon: Cpu },
  { to: '/planlegging', label: 'Prosjektplanlegger', icon: ClipboardList },
  { to: '/dokumentasjon', label: 'Dokumentasjon', icon: FileText },
  { section: 'Kunnskap' },
  { to: '/bibliotek', label: 'Komponentbibliotek', icon: Library },
  { to: '/beregninger', label: 'Beregninger', icon: Calculator },
  { to: '/laer', label: 'Lær elektro', icon: GraduationCap },
  { to: '/story', label: 'Story Mode', icon: Trophy },
  { to: '/spill', label: 'Elektrikerspillet', icon: Gamepad2 },
  { section: 'System' },
  { to: '/innstillinger', label: 'Innstillinger', icon: Settings },
] as const;

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Forside'],
  [/^\/prosjekter/, 'Mine prosjekter'],
  [/^\/prosjekt\/[^/]+\/tegning/, 'Tegneområde'],
  [/^\/prosjekt\//, 'Prosjektoversikt'],
  [/^\/tegneverktoy/, 'Tegneverktøy'],
  [/^\/koblingsskjema/, 'Koblingsskjema'],
  [/^\/installasjon/, 'Installasjonsplanlegging'],
  [/^\/simulering/, 'Simulering'],
  [/^\/planlegging/, 'Prosjektplanlegger'],
  [/^\/dokumentasjon/, 'Dokumentasjon og rapporter'],
  [/^\/bibliotek/, 'Komponentbibliotek'],
  [/^\/beregninger/, 'Beregninger'],
  [/^\/laer/, 'Lær elektro'],
  [/^\/spill/, 'Elektrikerspillet'],
  [/^\/story/, 'Story Mode'],
  [/^\/innstillinger/, 'Innstillinger'],
];

function SaveIndicator() {
  const status = useProjects((s) => s.status);
  const current = useProjects((s) => s.current);
  if (!current) return null;
  const map = {
    saved: ['var(--ok)', 'Lagret'],
    dirty: ['var(--warn)', 'Ulagrede endringer'],
    saving: ['var(--accent-2)', 'Lagrer …'],
    error: ['var(--danger)', 'Lagring feilet'],
  } as const;
  const [color, text] = map[status];
  return (
    <span className="save-status" title="Prosjektet lagres automatisk i nettleseren (IndexedDB)">
      <span className="dot" style={{ background: color }} />
      <span className="label">{text}</span>
    </span>
  );
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('es-sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const current = useProjects((s) => s.current);
  const isEditor = /\/tegning\//.test(location.pathname) || location.pathname.startsWith('/spill') || location.pathname.startsWith('/story');
  const title = TITLES.find(([r]) => r.test(location.pathname))?.[1] ?? 'ElektroStudio';

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    localStorage.setItem('es-sidebar', collapsed ? '1' : '0');
  }, [collapsed]);
  useEffect(() => {
    document.title = `${title} – ElektroStudio`;
  }, [title]);

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <Zap size={18} color="#fff" fill="#fff" />
          </div>
          <span className="brand-name">ElektroStudio</span>
        </div>
        <nav className="nav" aria-label="Hovedmeny">
          {NAV.map((item, i) => {
            if ('section' in item) return <div key={i} className="nav-section">{item.section}</div>;
            const Icon = item.icon;
            if ('action' in item) {
              return (
                <a key={i} href="#" className="nav-link" title={item.label} onClick={(e) => (e.preventDefault(), setNewOpen(true))}>
                  <Icon size={18} />
                  <span className="nav-label">{item.label}</span>
                </a>
              );
            }
            return (
              <NavLink key={i} to={item.to} end={'end' in item} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={item.label}>
                <Icon size={18} />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="spacer" />
        <div className="nav" style={{ borderTop: '1px solid var(--border)' }}>
          <a href="#" className="nav-link collapse-btn" onClick={(e) => (e.preventDefault(), setCollapsed((c) => !c))} title={collapsed ? 'Vis meny' : 'Skjul meny'}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className="nav-label">Skjul meny</span>
          </a>
        </div>
      </aside>
      <header className="topbar">
        <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen((o) => !o)} aria-label="Meny">
          <Menu size={20} />
        </button>
        <span className="topbar-title">{title}</span>
        <span className="topbar-spacer" />
        <SaveIndicator />
        {current ? (
          <button className="project-chip btn-ghost" style={{ cursor: 'pointer' }} onClick={() => navigate(`/prosjekt/${current.id}`)} title="Åpne prosjektoversikten">
            <BookOpen size={14} /> {current.name}
          </button>
        ) : (
          <button className="btn btn-sm" onClick={() => setNewOpen(true)}>
            <Plus size={14} /> Nytt prosjekt
          </button>
        )}
      </header>
      <main className={`main ${isEditor ? 'full' : ''}`}>
        <Outlet />
      </main>
      {mobileOpen && <div className="modal-backdrop" style={{ zIndex: 50, background: 'rgba(0,0,0,.4)' }} onClick={() => setMobileOpen(false)} />}
      {newOpen && <NewProjectModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}
