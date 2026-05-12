import { useRounds } from '@/lib/api';
import { MatchCard } from '@/components/MatchCard';
import { cn } from '@/lib/cn';

const PHASE_LABEL: Record<string, string | null> = {
  REGULAR: null,
  SEMI: 'Semifinales',
  FINAL: 'Final',
};

export default function Fixture() {
  const { data: rounds, isLoading } = useRounds();
  const now = Date.now();
  const nextRoundNumber = rounds?.find(
    r =>
      r.matches.some(m => m.status === 'SCHEDULED') &&
      new Date(r.date).getTime() >= now - 86_400_000,
  )?.number;

  return (
    <div className="animate-fade-up">
      {/* Hero header */}
      <header className="border-b border-ink-100 pb-6 mb-8">
        <div className="eyebrow text-court mb-2">Temporada 2026</div>
        <h1 className="font-display text-6xl sm:text-8xl tracking-wide leading-[0.85]">
          Fixture
        </h1>
        <p className="text-ink-500 mt-3 text-sm max-w-md">
          32 partidos · 12 fechas · 8 equipos · Del 3 de mayo al 19 de julio.
        </p>
      </header>

      {isLoading && (
        <div className="space-y-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-40 bg-ink-100 animate-pulse" />
          ))}
        </div>
      )}

      <div className="space-y-10">
        {rounds?.map(round => {
          const isNext = round.number === nextRoundNumber;
          const phaseLabel = PHASE_LABEL[round.phase];
          const dateLabel = new Date(round.date)
            .toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' });

          return (
            <section key={round.id}>
              <header
                className={cn(
                  'flex items-baseline justify-between gap-4 mb-3 pb-2 border-b',
                  isNext ? 'border-court' : 'border-ink-100',
                )}
              >
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-3xl sm:text-5xl tracking-wide leading-none">
                    {round.label}
                  </h2>
                  {phaseLabel && (
                    <span className="eyebrow text-court">{phaseLabel}</span>
                  )}
                  {isNext && (
                    <span className="eyebrow bg-court text-paper-50 px-2 py-0.5">Próxima</span>
                  )}
                </div>
                <span className="eyebrow text-ink-500 hidden sm:inline">{dateLabel}</span>
              </header>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {round.matches.map(m => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
