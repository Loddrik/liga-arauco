import { NavLink, Outlet, Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ScoresTicker } from './ScoresTicker';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'eyebrow px-1 py-4 border-b-2 transition-colors',
          isActive
            ? 'border-court text-paper-50'
            : 'border-transparent text-paper-300/80 hover:text-paper-50',
        )
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-paper-grain text-ink">
      {/* Header negro estilo broadcast */}
      <header className="sticky top-0 z-30 bg-ink text-paper-50">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-6 h-14">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="h-9 w-9 rounded-full bg-court flex items-center justify-center font-display text-lg leading-none text-paper-50">
              L
            </div>
            <div className="leading-none">
              <div className="font-display text-xl tracking-wider">LIGA ARAUCO</div>
              <div className="eyebrow text-paper-300/70 text-[9px]">Básquetbol · 2026</div>
            </div>
          </Link>
          <nav className="flex items-center gap-6">
            <NavItem to="/">Inicio</NavItem>
            <NavItem to="/fixture">Fixture</NavItem>
            <NavItem to="/tabla">Tabla</NavItem>
          </nav>
          <a
            href="https://www.instagram.com/lba_2026_/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 eyebrow text-paper-300 hover:text-paper-50 transition-colors"
          >
            @lba_2026_
            <span aria-hidden>↗</span>
          </a>
        </div>
        <ScoresTicker />
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-ink-100 bg-paper-100 mt-12">
        <div className="mx-auto max-w-6xl px-4 py-8 grid sm:grid-cols-3 gap-6">
          <div>
            <div className="font-display text-2xl tracking-wider">LIGA ARAUCO</div>
            <p className="text-sm text-ink-500 mt-1">
              Liga de básquetbol comunal · Arauco, Chile · Temporada 2026.
            </p>
          </div>
          <div>
            <div className="eyebrow text-ink-500 mb-2">Sede</div>
            <p className="text-sm">Gimnasio Liceo San Felipe</p>
            <p className="text-sm text-ink-500">Caupolicán 121, Arauco</p>
          </div>
          <div>
            <div className="eyebrow text-ink-500 mb-2">Síguenos</div>
            <a
              href="https://www.instagram.com/lba_2026_/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:text-court transition-colors"
            >
              @lba_2026_ en Instagram ↗
            </a>
          </div>
        </div>
        <div className="border-t border-ink-100 py-4">
          <div className="mx-auto max-w-6xl px-4 eyebrow text-ink-500">
            © 2026 Liga de Básquetbol Arauco · Sitio no oficial
          </div>
        </div>
      </footer>
    </div>
  );
}
