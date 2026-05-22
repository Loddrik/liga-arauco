import { Link, useParams } from 'react-router-dom';
import type { MatchDto } from '@liga/shared';
import { useRounds } from '@/lib/api';
import { TeamBadge } from '@/components/TeamBadge';
import { MatchPhotosSection } from '@/components/match/MatchPhotosSection';
import { cn } from '@/lib/cn';
import { matchTimeOrTbd } from '@/lib/match-time';

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const hora = matchTimeOrTbd(d);
  return { fecha, hora };
}

export default function MatchDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: rounds, isLoading } = useRounds();

  // Reusamos el endpoint de rounds (que ya está en cache) en lugar de
  // crear un nuevo endpoint GET /matches/:id. Más simple para el caso.
  const match = rounds?.flatMap(r => r.matches).find(m => m.id === id);

  if (isLoading) {
    return <div className="h-96 bg-ink-100 animate-pulse animate-fade-up" />;
  }

  if (!match) {
    return (
      <div className="text-center py-24 animate-fade-up">
        <div className="font-display text-7xl text-ink-300 tracking-wide">404</div>
        <p className="text-ink-700 mt-2">No encontramos ese partido.</p>
        <Link to="/fixture" className="eyebrow text-court mt-4 inline-block hover:underline">
          ← Volver al fixture
        </Link>
      </div>
    );
  }

  const { fecha, hora } = formatDateTime(match.scheduledAt);
  const played = match.status === 'PLAYED';
  const homeName = match.homeTeam?.name ?? match.homePlaceholder ?? 'TBD';
  const awayName = match.awayTeam?.name ?? match.awayPlaceholder ?? 'TBD';

  return (
    <div className="animate-fade-up space-y-8">
      <Link
        to="/fixture"
        className="eyebrow text-ink-500 hover:text-court transition-colors inline-flex items-center gap-2"
      >
        ← Fixture
      </Link>

      <header className="space-y-3">
        <div className="eyebrow text-court">
          Fecha {match.roundNumber} · Partido #{match.number}
        </div>
        <div className="eyebrow text-ink-500">
          {fecha} · {hora}
        </div>
      </header>

      <section className="border border-ink-100 bg-paper-50 p-6 sm:p-10">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
          <TeamSide
            name={homeName}
            team={match.homeTeam}
            placeholder={match.homePlaceholder}
            score={match.homeScore}
            played={played}
          />
          <div className="font-display text-3xl sm:text-5xl text-ink-300 tabular-nums">
            {played ? '' : 'vs'}
          </div>
          <TeamSide
            name={awayName}
            team={match.awayTeam}
            placeholder={match.awayPlaceholder}
            score={match.awayScore}
            played={played}
          />
        </div>
        {match.status === 'POSTPONED' && (
          <p className="mt-6 eyebrow text-gold text-center">
            Partido postergado
          </p>
        )}
      </section>

      <MatchPhotosSection matchId={match.id} />
    </div>
  );
}

interface TeamSideProps {
  name: string;
  team: MatchDto['homeTeam'];
  placeholder: string | null;
  score: number | null;
  played: boolean;
}

function TeamSide({ name, team, placeholder, score, played }: TeamSideProps) {
  const inner = (
    <div className="flex flex-col items-center gap-3 text-center">
      <TeamBadge team={team} placeholder={placeholder} size="xl" />
      <div className="font-display text-2xl sm:text-3xl tracking-wide leading-tight">
        {name}
      </div>
      {played && score != null && (
        <div className="font-display text-5xl sm:text-7xl tabular-nums leading-none">
          {score}
        </div>
      )}
    </div>
  );
  if (team) {
    return (
      <Link to={`/equipos/${team.slug}`} className={cn('block hover:opacity-80 transition-opacity')}>
        {inner}
      </Link>
    );
  }
  return inner;
}
