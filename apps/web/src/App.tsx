import { Routes, Route } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import Home from './pages/Home';
import Fixture from './pages/Fixture';
import Standings from './pages/Standings';
import TeamDetail from './pages/TeamDetail';
import MatchDetail from './pages/MatchDetail';
import Login from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import MatchEditor from './pages/admin/MatchEditor';
import TeamsAdmin from './pages/admin/TeamsAdmin';
import NmSync from './pages/admin/NmSync';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Sitio público */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/fixture" element={<Fixture />} />
          <Route path="/tabla" element={<Standings />} />
          <Route path="/equipos/:slug" element={<TeamDetail />} />
          <Route path="/partidos/:id" element={<MatchDetail />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/partidos/:id" element={<MatchEditor />} />
          <Route path="/admin/equipos" element={<TeamsAdmin />} />
          <Route path="/admin/nm-sync" element={<NmSync />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <h1 className="text-6xl font-bold text-brand">404</h1>
      <p className="text-slate-600 mt-2">No encontramos esta página.</p>
    </div>
  );
}
