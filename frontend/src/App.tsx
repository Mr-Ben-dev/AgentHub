// ============================================================================
// AgentHub Frontend - App Component with Routing
// ============================================================================

import { Routes, Route } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import ExplorePage from './pages/ExplorePage';
import AgentDetailPage from './pages/AgentDetailPage';
import LiveFeedPage from './pages/LiveFeedPage';
import MyAgentsPage from './pages/MyAgentsPage';
import RankingsPage from './pages/RankingsPage';

function App() {
  return (
    <RootLayout>
      <Routes>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/agent/:id" element={<AgentDetailPage />} />
        <Route path="/feed" element={<LiveFeedPage />} />
        <Route path="/my-agents" element={<MyAgentsPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
      </Routes>
    </RootLayout>
  );
}

export default App;
