import { PrismaClient, RoundPhase, MatchStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Hora local Chile (UTC-4 en invierno 2026). Los partidos se juegan los sábados.
const CL = '-04:00';

const teams = [
  { slug: 'basket-arauco', name: 'BasketArauco', shortName: 'BAS', instagramHandle: 'basket_arauco', primaryColor: '#1A4D8F' },
  { slug: 'buffalos',      name: 'Buffalos',     shortName: 'BUF', instagramHandle: 'buffalos.basquet', primaryColor: '#7A2A2A' },
  { slug: 'huillines',     name: 'Huillines',    shortName: 'HUI', instagramHandle: 'cdhuillines',     primaryColor: '#0E6B3A' },
  { slug: 'navidad',       name: 'Navidad',      shortName: 'NAV', instagramHandle: null,              primaryColor: '#C0392B' },
  { slug: 'ragko',         name: 'Ragko',        shortName: 'RAG', instagramHandle: 'atletico_ragko',  primaryColor: '#1B1B1B' },
  { slug: 'laraquete',     name: 'Laraquete',    shortName: 'LAR', instagramHandle: null,              primaryColor: '#1F5B8A' },
  { slug: 'lafken',        name: 'Lafken',       shortName: 'LAF', instagramHandle: null,              primaryColor: '#2E86AB' },
  { slug: 'lautaro',       name: 'Lautaro',      shortName: 'LAU', instagramHandle: null,              primaryColor: '#B8860B' },
];

const rounds = [
  { number: 1,  label: 'Fecha 1',       phase: RoundPhase.REGULAR, date: '2026-05-03' },
  { number: 2,  label: 'Fecha 2',       phase: RoundPhase.REGULAR, date: '2026-05-10' },
  { number: 3,  label: 'Fecha 3',       phase: RoundPhase.REGULAR, date: '2026-05-17' },
  { number: 4,  label: 'Fecha 4',       phase: RoundPhase.REGULAR, date: '2026-05-24' },
  { number: 5,  label: 'Fecha 5',       phase: RoundPhase.REGULAR, date: '2026-05-31' },
  { number: 6,  label: 'Fecha 6',       phase: RoundPhase.REGULAR, date: '2026-06-07' },
  { number: 7,  label: 'Fecha 7',       phase: RoundPhase.REGULAR, date: '2026-06-14' },
  { number: 8,  label: 'Fecha 8',       phase: RoundPhase.REGULAR, date: '2026-06-21' },
  { number: 9,  label: 'Fecha 9',       phase: RoundPhase.REGULAR, date: '2026-06-28' },
  { number: 10, label: 'Fecha 10',      phase: RoundPhase.REGULAR, date: '2026-07-05' },
  { number: 11, label: 'Semifinales',   phase: RoundPhase.SEMI,    date: '2026-07-12' },
  { number: 12, label: 'Finales',       phase: RoundPhase.FINAL,   date: '2026-07-19' },
];

type FixtureRow =
  | { n: number; round: number; time: string; home: string; away: string }
  | { n: number; round: number; time: string | null; homePlaceholder: string; awayPlaceholder: string };

const fixture: FixtureRow[] = [
  // Fecha 1
  { n: 1,  round: 1, time: '11:00', home: 'basket-arauco', away: 'buffalos' },
  { n: 2,  round: 1, time: '12:30', home: 'huillines',    away: 'navidad' },
  { n: 3,  round: 1, time: '14:00', home: 'ragko',        away: 'laraquete' },
  // Fecha 2
  { n: 4,  round: 2, time: '11:00', home: 'lafken',       away: 'lautaro' },
  { n: 5,  round: 2, time: '12:30', home: 'basket-arauco',away: 'huillines' },
  { n: 6,  round: 2, time: '14:00', home: 'buffalos',     away: 'ragko' },
  // Fecha 3
  { n: 7,  round: 3, time: '11:00', home: 'navidad',      away: 'laraquete' },
  { n: 8,  round: 3, time: '12:30', home: 'lafken',       away: 'basket-arauco' },
  { n: 9,  round: 3, time: '14:00', home: 'lautaro',      away: 'buffalos' },
  // Fecha 4
  { n: 10, round: 4, time: '11:00', home: 'huillines',    away: 'ragko' },
  { n: 11, round: 4, time: '12:30', home: 'navidad',      away: 'lafken' },
  { n: 12, round: 4, time: '14:00', home: 'laraquete',    away: 'basket-arauco' },
  // Fecha 5
  { n: 13, round: 5, time: '11:00', home: 'buffalos',     away: 'huillines' },
  { n: 14, round: 5, time: '12:30', home: 'lautaro',      away: 'navidad' },
  { n: 15, round: 5, time: '14:00', home: 'lafken',       away: 'ragko' },
  // Fecha 6
  { n: 16, round: 6, time: '11:00', home: 'laraquete',    away: 'buffalos' },
  { n: 17, round: 6, time: '12:30', home: 'basket-arauco',away: 'lautaro' },
  { n: 18, round: 6, time: '14:00', home: 'navidad',      away: 'ragko' },
  // Fecha 7
  { n: 19, round: 7, time: '11:00', home: 'lafken',       away: 'huillines' },
  { n: 20, round: 7, time: '12:30', home: 'laraquete',    away: 'lautaro' },
  { n: 21, round: 7, time: '14:00', home: 'basket-arauco',away: 'navidad' },
  // Fecha 8
  { n: 22, round: 8, time: '11:00', home: 'buffalos',     away: 'lafken' },
  { n: 23, round: 8, time: '12:30', home: 'lautaro',      away: 'huillines' },
  { n: 24, round: 8, time: '14:00', home: 'ragko',        away: 'basket-arauco' },
  // Fecha 9 (solo 2 partidos)
  { n: 25, round: 9, time: '11:00', home: 'laraquete',    away: 'lafken' },
  { n: 26, round: 9, time: '12:30', home: 'buffalos',     away: 'navidad' },
  // Fecha 10 (solo 2 partidos)
  { n: 27, round: 10, time: '11:00', home: 'lautaro',     away: 'ragko' },
  { n: 28, round: 10, time: '12:30', home: 'huillines',   away: 'laraquete' },
  // Fecha 11 — Semifinales (sin hora confirmada en PDF)
  { n: 29, round: 11, time: '11:00', homePlaceholder: '2° lugar regular', awayPlaceholder: '3° lugar regular' },
  { n: 30, round: 11, time: '12:30', homePlaceholder: '1° lugar regular', awayPlaceholder: '4° lugar regular' },
  // Fecha 12 — Finales
  { n: 31, round: 12, time: '11:00', homePlaceholder: 'Perdedor partido 30', awayPlaceholder: 'Perdedor partido 29' },
  { n: 32, round: 12, time: '12:30', homePlaceholder: 'Ganador partido 30',  awayPlaceholder: 'Ganador partido 29' },
];

async function main() {
  console.log('🏀 Seeding Liga de Básquetbol Arauco 2026...');

  // Teams
  for (const t of teams) {
    await prisma.team.upsert({
      where: { slug: t.slug },
      create: t,
      update: t,
    });
  }
  console.log(`✓ ${teams.length} teams`);

  // Rounds
  for (const r of rounds) {
    await prisma.round.upsert({
      where: { number: r.number },
      create: { ...r, date: new Date(`${r.date}T00:00:00${CL}`) },
      update: { ...r, date: new Date(`${r.date}T00:00:00${CL}`) },
    });
  }
  console.log(`✓ ${rounds.length} rounds`);

  // Matches
  const allTeams = await prisma.team.findMany();
  const teamBySlug = Object.fromEntries(allTeams.map(t => [t.slug, t]));
  const allRounds = await prisma.round.findMany();
  const roundByNumber = Object.fromEntries(allRounds.map(r => [r.number, r]));

  for (const m of fixture) {
    const round = roundByNumber[m.round];
    const roundDate = round.date.toISOString().slice(0, 10);
    const scheduledAt = m.time
      ? new Date(`${roundDate}T${m.time}:00${CL}`)
      : new Date(`${roundDate}T11:00:00${CL}`);

    const hasTeams = 'home' in m;
    await prisma.match.upsert({
      where: { number: m.n },
      create: {
        number: m.n,
        roundId: round.id,
        scheduledAt,
        homeTeamId: hasTeams ? teamBySlug[m.home].id : null,
        awayTeamId: hasTeams ? teamBySlug[m.away].id : null,
        homePlaceholder: hasTeams ? null : m.homePlaceholder,
        awayPlaceholder: hasTeams ? null : m.awayPlaceholder,
        status: MatchStatus.SCHEDULED,
      },
      update: {
        roundId: round.id,
        scheduledAt,
        homeTeamId: hasTeams ? teamBySlug[m.home].id : null,
        awayTeamId: hasTeams ? teamBySlug[m.away].id : null,
        homePlaceholder: hasTeams ? null : m.homePlaceholder,
        awayPlaceholder: hasTeams ? null : m.awayPlaceholder,
      },
    });
  }
  console.log(`✓ ${fixture.length} matches`);

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@liga-arauco.cl';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, passwordHash },
    update: { passwordHash },
  });
  console.log(`✓ admin user: ${adminEmail}`);

  console.log('Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
