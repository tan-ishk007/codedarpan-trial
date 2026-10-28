import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WorkspacePage from './pages/WorkspacePage';
import { NotFoundPage, PrivacyPage, TermsPage } from './pages/LegalPages';
import { setPageMeta } from './lib/pageMeta';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import AccountPage from './pages/AccountPage';

export type RouteMetaEntry = { title: string; description: string; noIndex?: boolean };

export const routeMeta: Record<string, RouteMetaEntry> = {
  '/': {
    title: 'CodeDarpan | Understand the code behind the code',
    description: 'Explore a repository’s real structure, dependencies, source and returned evidence in a clear, interactive code atlas.',
  },
  '/workspace': {
    title: 'CodeDarpan Atlas | Explore repository structure',
    description: 'Inspect a repository dependency atlas, source and returned analysis evidence.',
    noIndex: true,
  },
  '/workspace/explore': { title: 'Explore | CodeDarpan Atlas', description: 'Explore the returned repository graph, files, and source.', noIndex: true },
  '/workspace/diagnose': { title: 'Diagnose | CodeDarpan Atlas', description: 'Review returned repository health factors and evidence.', noIndex: true },
  '/workspace/onboard': { title: 'Onboard | CodeDarpan Atlas', description: 'Review the returned contributor route and related issues.', noIndex: true },
  '/workspace/impact': { title: 'Impact | CodeDarpan Atlas', description: 'Review returned file and pull-request impact evidence.', noIndex: true },
  '/privacy': {
    title: 'Privacy draft | CodeDarpan',
    description: 'Review draft describing what is known and still unresolved about the CodeDarpan frontend.',
  },
  '/terms': {
    title: 'Terms draft | CodeDarpan',
    description: 'Provisional CodeDarpan terms for an evidence-first repository atlas frontend.',
  },
  '/account': { title: 'Account access | CodeDarpan', description: 'Sign in to your private CodeDarpan analysis workspace.', noIndex: true },
};

function RouteMeta() {
  const location = useLocation();
  useEffect(() => {
    const meta = routeMeta[location.pathname];
    if (meta) setPageMeta(meta.title, meta.description, meta.noIndex);
    else setPageMeta('Page not found | CodeDarpan', 'This address does not match a CodeDarpan page.', true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  return null;
}

export function AppRoutes() {
  return (
    <>
      <RouteMeta />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/workspace/explore" element={<WorkspacePage />} />
        <Route path="/workspace/diagnose" element={<WorkspacePage />} />
        <Route path="/workspace/onboard" element={<WorkspacePage />} />
        <Route path="/workspace/impact" element={<WorkspacePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppErrorBoundary><AppRoutes /></AppErrorBoundary></BrowserRouter>;
}
