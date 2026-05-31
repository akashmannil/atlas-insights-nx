import { AppProviders } from '@/providers/AppProviders';
import { DashboardPage } from '@/pages/DashboardPage';
import { KnowledgeGraphPage } from '@/pages/KnowledgeGraphPage';
import { useViewRoute } from '@/hooks/useViewRoute';

const Router = () => {
  const { view, setView } = useViewRoute();
  return view === 'graph' ? (
    <KnowledgeGraphPage onBack={() => setView('dashboard')} />
  ) : (
    <DashboardPage onOpenGraph={() => setView('graph')} />
  );
};

const App = () => (
  <AppProviders>
    <Router />
  </AppProviders>
);

export default App;
