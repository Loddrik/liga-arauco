import { Link } from 'react-router-dom';
import { useUpcoming, useRecent, useStandings } from '@/lib/api';
import { MatchCard } from '@/components/MatchCard';
import { StandingsTable } from '@/components/StandingsTable';
import { TeamBadge } from '@/components/TeamBadge';
import { PhotosAnnouncement } from '@/components/PhotosAnnouncement';
import type { MatchDto } from '@liga/shared';
import { matchTimeOrTbd } from '@/lib/match-time';

function SectionHeader({ children, link }: { children: React.ReactNode; link?: { to: string; label: string } }) {
  return (
    <div className="flex items-end justify-between mb-4 border-b border-ink-100 pb-2">
      <h2 className="font-display text-3xl sm:text-4xl tracking-wide leading-none">{children}</h2>
      {link && (
        <Link
          to={link.to}
          className="eyebrow text-ink-500 hover:text-court transition-colors flex items-center gap-1"
        >
          {link.label}
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

function HeroNextGame({ match }: { match: MatchDto }) {
  const dt = new Date(match.scheduledAt);
  const dateLong = dt.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const time = matchTimeOrTbd(dt);

  return (
    <Link
      to="/fixture"
      className="group relative block bg-ink text-paper-50 overflow-hidden"
    >
      {/* Background atmospheric */}
      <div
        className="absolute inset-0 opacity-30 group-hover:opacity-40 transition-opacity"
        style={{
          background: `radial-gradient(ellipse at 25% 50%, ${match.homeTeam?.primaryColor ?? '#C8102E'}33 0%, transparent 60%), radial-gradient(ellipse at 75% 50%, ${match.awayTeam?.primaryColor ?? '#C8102E'}33 0%, transparent 60%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(250,250,247,0.04)_1px,transparent_1px)] bg-[length:6px_6px]" />

      <div className="relative px-6 sm:px-12 py-10 sm:py-16">
        <div className="flex items-center gap-3 mb-4">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
          <span className="eyebrow text-gold">Próximo partido · Fecha {match.roundNumber}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-12 max-w-4xl">
          {/* Home */}
          <div className="flex flex-col items-center sm:items-end gap-3 text-center sm:text-right">
            <TeamBadge team={match.homeTeam} placeholder={match.homePlaceholder} size="xl" ring />
            <div>
              <div className="eyebrow text-paper-300/60 mb-1">Local</div>
              <div className="font-display text-3xl sm:text-5xl tracking-wide leading-none">
                {match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD'}
              </div>
            </div>
          </div>

          {/* VS */}
          <div className="flex flex-col items-center text-center self-center">
            <div className="font-display text-2xl sm:text-4xl text-paper-300/40 leading-none">VS</div>
            <div className="my-3 h-12 w-px bg-paper-300/20" />
            <div className="eyebrow text-paper-300/60 leading-tight">
              <div>{dateLong}</div>
              <div className="text-paper-50 mt-1 text-base font-display tracking-wide normal-case">
                {time} hrs
              </div>
            </div>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center sm:items-start gap-3 text-center sm:text-left">
            <TeamBadge team={match.awayTeam} placeholder={match.awayPlaceholder} size="xl" ring />
            <div>
              <div className="eyebrow text-paper-300/60 mb-1">Visita</div>
              <div className="font-display text-3xl sm:text-5xl tracking-wide leading-none">
                {match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD'}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-6">
          <span className="eyebrow border border-paper-300/40 px-4 py-2 group-hover:bg-court group-hover:border-court transition">
            Ver fixture completo →
          </span>
          <span className="eyebrow text-paper-300/60">Gimnasio Liceo San Felipe, Arauco</span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const upcoming = useUpcoming(3);
  const recent = useRecent(3);
  const standings = useStandings();
  const top4 = standings.data?.slice(0, 4);
  const heroMatch = upcoming.data?.[0];
  const restOfUpcoming = upcoming.data?.slice(1) ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Anuncio: fotos del partido vía Nuestro Momento */}
      <PhotosAnnouncement />

      <div className="space-y-12">
      {/* Hero */}
      {heroMatch ? (
        <HeroNextGame match={heroMatch} />
      ) : upcoming.isLoading ? (
        <div className="h-72 bg-ink-100 animate-pulse" />
      ) : (
        <div className="bg-ink text-paper-50 px-8 py-12">
          <div className="eyebrow text-gold mb-2">Temporada</div>
          <h1 className="font-display text-5xl sm:text-7xl tracking-wide leading-[0.9]">
            La cancha
            <br />
            espera.
          </h1>
        </div>
      )}

      {/* Próximos partidos secundarios + Resultados */}
      <div className="grid gap-10 lg:grid-cols-2">
        {restOfUpcoming.length > 0 && (
          <section>
            <SectionHeader link={{ to: '/fixture', label: 'Fixture' }}>Próximos</SectionHeader>
            <div className="space-y-3">
              {restOfUpcoming.map(m => (
                <MatchCard key={m.id} match={m} showRound />
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader link={{ to: '/fixture', label: 'Todos los resultados' }}>
            Resultados
          </SectionHeader>
          {recent.isLoading && <div className="h-40 bg-ink-100 animate-pulse" />}
          <div className="space-y-3">
            {recent.data?.map(m => (
              <MatchCard key={m.id} match={m} showRound />
            ))}
          </div>
        </section>
      </div>

      {/* Tabla preview */}
      <section>
        <SectionHeader link={{ to: '/tabla', label: 'Tabla completa' }}>
          Top 4 · Clasifican
        </SectionHeader>
        {standings.isLoading && <div className="h-60 bg-ink-100 animate-pulse" />}
        {top4 && <StandingsTable rows={top4} />}
        <p className="eyebrow text-ink-500 mt-3">
          Los 4 primeros clasifican a semifinales · Fecha 11, 12 julio
        </p>
      </section>
      </div>
    </div>
  );
}
