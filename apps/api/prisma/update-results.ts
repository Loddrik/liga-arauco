/**
 * Carga los resultados confirmados desde Instagram para Fechas 1 y 2.
 * Fuente: @lba_2026_ (extraído 2026-05-11).
 *
 * Discrepancia con el PDF: Fecha 2 match 5 cambia de "BAS vs HUI" a "NAV vs BAS"
 * según lo que efectivamente se jugó (post IG "RESULTADOS DOMINGO 10 MAYO").
 * Match 4 (LAF vs LAU) no aparece en IG → se marca POSTPONED hasta confirmar.
 */
import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany();
  const bySlug = Object.fromEntries(teams.map(t => [t.slug, t.id]));

  // ---- Fecha 1 ----
  await prisma.match.update({
    where: { number: 1 }, // BAS vs BUF
    data: { homeScore: 69, awayScore: 55, status: MatchStatus.PLAYED },
  });
  await prisma.match.update({
    where: { number: 2 }, // HUI vs NAV
    data: { homeScore: 77, awayScore: 110, status: MatchStatus.PLAYED },
  });
  await prisma.match.update({
    where: { number: 3 }, // RAG vs LAR
    data: { homeScore: 86, awayScore: 41, status: MatchStatus.PLAYED },
  });
  console.log('✓ Fecha 1 (3 resultados)');

  // ---- Fecha 2 ----
  // Match 4 (LAF vs LAU) — sin info en IG, se posterga
  await prisma.match.update({
    where: { number: 4 },
    data: { status: MatchStatus.POSTPONED, notes: 'Sin info en IG @lba_2026_ tras Fecha 2. Confirmar con organizadores.' },
  });

  // Match 5 — el PDF decía BAS vs HUI, pero en IG se jugó NAV vs BAS (103-71)
  // Reasignamos los equipos a este partido según lo realmente jugado.
  await prisma.match.update({
    where: { number: 5 },
    data: {
      homeTeamId: bySlug['navidad'],
      awayTeamId: bySlug['basket-arauco'],
      homeScore: 103,
      awayScore: 71,
      status: MatchStatus.PLAYED,
      notes: 'Reasignado desde fixture original (BAS vs HUI) según resultado publicado en IG. Confirmar local/visita.',
    },
  });

  // Match 6 (BUF vs RAG) — coincide con el fixture
  await prisma.match.update({
    where: { number: 6 },
    data: { homeScore: 75, awayScore: 57, status: MatchStatus.PLAYED },
  });
  console.log('✓ Fecha 2 (3 actualizaciones: 1 PLAYED reasignado, 1 PLAYED match, 1 POSTPONED)');

  console.log('Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
