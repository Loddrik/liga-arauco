import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';

function AdminNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) =>
        cn(
          'px-3 py-2 text-sm font-medium rounded-md',
          isActive ? 'bg-accent text-brand' : 'text-white/90 hover:bg-white/10',
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function AdminLayout() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/admin" className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center font-bold text-brand">
              LBA
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="font-bold text-sm">Admin LBA</div>
              <div className="text-[10px] uppercase tracking-wider text-white/70">Panel privado</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <AdminNavItem to="/admin">Partidos</AdminNavItem>
            <AdminNavItem to="/admin/equipos">Equipos</AdminNavItem>
            <AdminNavItem to="/admin/nm-sync">NM Sync</AdminNavItem>
            <Link to="/" className="px-3 py-2 text-sm text-white/70 hover:text-white">
              Sitio público ↗
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline text-white/70">{email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
