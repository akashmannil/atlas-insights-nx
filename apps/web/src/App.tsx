import { AppProviders } from '@/providers/AppProviders';
import { DashboardPage } from '@/pages/DashboardPage';

const App = () => (
  <AppProviders>
    <DashboardPage />
  </AppProviders>
);

export default App;
