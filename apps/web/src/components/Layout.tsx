import { useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { ScoresTicker } from './ScoresTicker';

function NavItem({
  to,
  children,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
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
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu on navigation
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-paper-grain text-ink">
      {/* Header negro estilo broadcast */}
      <header className="sticky top-0 z-30 bg-ink text-paper-50">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between gap-4 h-14">
          <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-court flex items-center justify-center font-display text-lg leading-none text-paper-50">
              L
            </div>
            <div className="leading-none min-w-0">
              <div className="font-display text-lg sm:text-xl tracking-wider truncate">
                LIGA ARAUCO
              </div>
              <div className="eyebrow text-paper-300/70 text-[9px]">
                Básquetbol · 2026
              </div>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden sm:flex items-center gap-6">
            <NavItem to="/">Inicio</NavItem>
            <NavItem to="/fixture">Fixture</NavItem>
            <NavItem to="/tabla">Tabla</NavItem>
          </nav>

          {/* Instagram desktop */}
          <a
            href="https://www.instagram.com/lba_2026_/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 eyebrow text-paper-300 hover:text-paper-50 transition-colors"
          >
            @lba_2026_
            <span aria-hidden>↗</span>
          </a>

          {/* Hamburger mobile */}
          <button
            type="button"
            className="sm:hidden -mr-2 p-2 text-paper-50"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="square"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="18" y2="18" />
                  <line x1="18" y1="4" x2="4" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="19" y2="6" />
                  <line x1="3" y1="11" x2="19" y2="11" />
                  <line x1="3" y1="16" x2="19" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <nav
            id="mobile-menu"
            className="sm:hidden border-t border-ink-800 bg-ink animate-fade-up"
          >
            <div className="px-4 py-2 flex flex-col divide-y divide-ink-800">
              {[
                { to: '/', label: 'Inicio' },
                { to: '/fixture', label: 'Fixture' },
                { to: '/tabla', label: 'Tabla' },
              ].map(({ to, label }) => {
                const isActive = location.pathname === to;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={closeMenu}
                    className={cn(
                      'eyebrow py-3 flex items-center justify-between',
                      isActive
                        ? 'text-court'
                        : 'text-paper-300/80 hover:text-paper-50',
                    )}
                  >
                    <span>{label}</span>
                    {isActive && <span className="text-court">●</span>}
                  </NavLink>
                );
              })}
              <a
                href="https://www.instagram.com/lba_2026_/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="eyebrow py-3 flex items-center justify-between text-paper-300/80 hover:text-paper-50"
              >
                <span>@lba_2026_</span>
                <span aria-hidden>↗</span>
              </a>
            </div>
          </nav>
        )}

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
