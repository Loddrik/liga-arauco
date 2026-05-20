import { Link } from 'react-router-dom';

/**
 * Anuncio en home: "ahora podés subir fotos del partido vía Nuestro Momento".
 * Estética editorial broadcast — corte rojo cancha + cinta de halftone, badge
 * tipo "BREAKING" en cabecera, CTA dorado.
 *
 * Pensado para vivir justo encima del HeroNextGame: contraste light↔dark.
 */
export function PhotosAnnouncement() {
  return (
    <Link
      to="/fixture"
      aria-label="Ver partidos para subir fotos"
      className="group relative block overflow-hidden bg-court text-paper-50 ring-1 ring-court-700/30 animate-fade-up"
    >
      {/* Stripe de halftone — sutil grain de prensa */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            'radial-gradient(rgba(250,250,247,0.6) 1px, transparent 1px)',
          backgroundSize: '7px 7px',
        }}
      />
      {/* Acento diagonal — referencia a cinta broadcast */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[35%] opacity-20 sm:block"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,184,28,0.5) 0px, rgba(255,184,28,0.5) 2px, transparent 2px, transparent 14px)',
        }}
      />
      {/* Glow dorado superior */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent"
      />

      <div className="relative grid items-center gap-5 px-5 py-5 sm:grid-cols-[auto_1fr_auto] sm:gap-8 sm:px-8 sm:py-6">
        {/* Columna 1: Badge "NUEVO" tipo broadcast lower-third */}
        <div className="flex items-center gap-3">
          <span className="relative inline-flex items-center justify-center bg-gold px-3 py-1.5 font-display text-base leading-none tracking-wider text-ink shadow-[0_2px_0_rgba(0,0,0,0.2)]">
            NUEVO
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold animate-pulse"
            />
          </span>
          <CameraGlyph className="hidden h-6 w-6 text-paper-300 sm:block" />
        </div>

        {/* Columna 2: Headline + sub */}
        <div className="min-w-0">
          <div className="eyebrow text-gold mb-1">
            Fotos del partido · ahora abierto
          </div>
          <h2 className="font-display text-2xl leading-[0.92] tracking-wide sm:text-3xl md:text-4xl">
            Subí tus fotos de cada partido,
            <br className="hidden sm:block" />
            <span className="text-gold"> miralas con la liga.</span>
          </h2>
          <p className="mt-2 text-sm text-paper-50/85 max-w-prose">
            Escaneá el QR del partido o entrá desde la web. Sin app, sin
            crear cuenta. Las fotos quedan disponibles para todos.
          </p>
        </div>

        {/* Columna 3: CTA + wordmark NM */}
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className="eyebrow inline-flex items-center gap-2 border border-gold/70 bg-ink/0 px-4 py-2 text-gold transition-all group-hover:bg-gold group-hover:text-ink">
            Ver partidos
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </span>
          <NmWordmark className="text-paper-300/80" />
        </div>
      </div>
    </Link>
  );
}

function CameraGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden
    >
      <path d="M3 7h3l1.5-2h9L18 7h3v12H3z" />
      <circle cx="12" cy="13" r="3.5" />
      <circle cx="17.5" cy="9.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function NmWordmark({ className }: { className?: string }) {
  return (
    <span
      className={`eyebrow inline-flex items-center gap-1.5 text-[10px] ${className ?? ''}`}
    >
      <span className="opacity-70">hosteado en</span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-paper-50/90 text-court font-display text-[10px] leading-none"
        aria-hidden
      >
        nm
      </span>
      <span className="font-display tracking-wider text-paper-50">
        nuestro momento
      </span>
    </span>
  );
}
