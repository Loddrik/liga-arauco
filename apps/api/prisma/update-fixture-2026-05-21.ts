/**
 * Migración del fixture al "Fixtura_final.docx" (entregado 2026-05-21).
 *
 * Reglas:
 *  - UPDATE in-place sobre los 32 Match existentes — no se borra ni recrea
 *    ningún row, así se preservan `Match.id` (clave del external_id en NM).
 *  - Preserva los resultados ya cargados (9 PLAYED + 1 POSTPONED reagendado).
 *  - Para evitar choques con el UNIQUE de `Match.number` durante el reshuffle,
 *    primero todos los partidos afectados se mueven a `number = -oldNumber`
 *    (Phase A) y luego se asignan los nuevos números/datos finales (Phase B),
 *    todo dentro de una transacción.
 *
 * Cambios cubiertos:
 *  - Renumeración de 20 partidos por reordenamiento de fechas.
 *  - Match #5 old (NAV-BAS 103-71) → #4 new (BAS-NAV 71-103): swap home/away
 *    y swap del marcador.
 *  - Match #4 old (LAF-LAU POSTPONED en F2) → #23 new (LAU-LAF SCHEDULED en F9):
 *    swap home/away, status pasa a SCHEDULED, ronda y fecha nuevas.
 *  - Match #16 old (LAR-BUF en F6) → #24 new (BUF-LAR en F9): swap home/away.
 *  - Match #21 old (BAS-NAV duplicado en F7) → #25 new (BAS-HUI en F9): cambio
 *    completo de teams (corrige duplicado + agrega par faltante BAS-HUI).
 *  - Playoffs F11/F12: hora = 00:00 como marcador "Por definir" (el render
 *    en frontend lo interpreta como tal).
 *
 * IMPORTANTE: NO es idempotente. Tras correrlo una vez, vuelve a correrlo y
 * el swap de marcador volvería atrás. El script aborta con error si detecta
 * que la DB ya está en estado nuevo.
 *
 * Uso:
 *   pnpm --filter @liga/api exec tsx prisma/update-fixture-2026-05-21.ts
 */
import { PrismaClient, MatchStatus } from '@prisma/client';

const prisma = new PrismaClient();

const CL = '-04:00'; // Chile invierno 2026 (sábados liga)

type Op = {
  oldNumber: number;
  newNumber: number;
  newRoundNumber: number;
  newHomeSlug: string | null;
  newAwaySlug: string | null;
  newHomePlaceholder?: string;
  newAwayPlaceholder?: string;
  newTime: string; // 'HH:mm' — usar '00:00' para "Por definir"
  newDate: string; // 'YYYY-MM-DD'
  swapScore?: boolean;
  forceStatus?: MatchStatus;
  notes?: string;
};

const ops: Op[] = [
  // ---- Fecha 1 (sin cambios) ----
  { oldNumber: 1, newNumber: 1, newRoundNumber: 1, newHomeSlug: 'basket-arauco', newAwaySlug: 'buffalos',     newTime: '11:00', newDate: '2026-05-03' },
  { oldNumber: 2, newNumber: 2, newRoundNumber: 1, newHomeSlug: 'huillines',     newAwaySlug: 'navidad',      newTime: '12:30', newDate: '2026-05-03' },
  { oldNumber: 3, newNumber: 3, newRoundNumber: 1, newHomeSlug: 'ragko',         newAwaySlug: 'laraquete',    newTime: '14:00', newDate: '2026-05-03' },

  // ---- Fecha 2 (2 partidos, sin LAF-LAU) ----
  // M4 old NAV-BAS 103-71 → M4 new BAS-NAV con swap de marcador.
  { oldNumber: 5, newNumber: 4, newRoundNumber: 2, newHomeSlug: 'basket-arauco', newAwaySlug: 'navidad',      newTime: '11:00', newDate: '2026-05-10', swapScore: true,
    notes: 'Swap home/away aplicado tras fixture final 2026-05-21: marcador invertido (NAV ganó 103-71 como visita).' },
  { oldNumber: 6, newNumber: 5, newRoundNumber: 2, newHomeSlug: 'buffalos',      newAwaySlug: 'ragko',        newTime: '14:00', newDate: '2026-05-10' },

  // ---- Fecha 3 ----
  { oldNumber: 7, newNumber: 6, newRoundNumber: 3, newHomeSlug: 'navidad',       newAwaySlug: 'laraquete',    newTime: '11:00', newDate: '2026-05-17' },
  { oldNumber: 8, newNumber: 7, newRoundNumber: 3, newHomeSlug: 'lafken',        newAwaySlug: 'basket-arauco',newTime: '12:30', newDate: '2026-05-17' },
  { oldNumber: 9, newNumber: 8, newRoundNumber: 3, newHomeSlug: 'lautaro',       newAwaySlug: 'buffalos',     newTime: '14:00', newDate: '2026-05-17' },

  // ---- Fecha 4 ----
  { oldNumber: 10, newNumber: 9,  newRoundNumber: 4, newHomeSlug: 'huillines',   newAwaySlug: 'ragko',        newTime: '11:00', newDate: '2026-05-24' },
  { oldNumber: 11, newNumber: 10, newRoundNumber: 4, newHomeSlug: 'navidad',     newAwaySlug: 'lafken',       newTime: '12:30', newDate: '2026-05-24' },
  { oldNumber: 12, newNumber: 11, newRoundNumber: 4, newHomeSlug: 'laraquete',   newAwaySlug: 'basket-arauco',newTime: '14:00', newDate: '2026-05-24' },

  // ---- Fecha 5 ----
  { oldNumber: 13, newNumber: 12, newRoundNumber: 5, newHomeSlug: 'buffalos',    newAwaySlug: 'huillines',    newTime: '11:00', newDate: '2026-05-31' },
  { oldNumber: 14, newNumber: 13, newRoundNumber: 5, newHomeSlug: 'lautaro',     newAwaySlug: 'navidad',      newTime: '12:30', newDate: '2026-05-31' },
  { oldNumber: 15, newNumber: 14, newRoundNumber: 5, newHomeSlug: 'lafken',      newAwaySlug: 'ragko',        newTime: '14:00', newDate: '2026-05-31' },

  // ---- Fecha 6 ----
  // LAR-LAF se mueve de F9 (old #25) a F6 (new #15).
  { oldNumber: 25, newNumber: 15, newRoundNumber: 6, newHomeSlug: 'laraquete',   newAwaySlug: 'lafken',       newTime: '11:00', newDate: '2026-06-07' },
  { oldNumber: 17, newNumber: 16, newRoundNumber: 6, newHomeSlug: 'basket-arauco',newAwaySlug: 'lautaro',     newTime: '12:30', newDate: '2026-06-07' },
  { oldNumber: 18, newNumber: 17, newRoundNumber: 6, newHomeSlug: 'navidad',     newAwaySlug: 'ragko',        newTime: '14:00', newDate: '2026-06-07' },

  // ---- Fecha 7 ----
  { oldNumber: 19, newNumber: 18, newRoundNumber: 7, newHomeSlug: 'lafken',      newAwaySlug: 'huillines',    newTime: '11:00', newDate: '2026-06-14' },
  { oldNumber: 20, newNumber: 19, newRoundNumber: 7, newHomeSlug: 'laraquete',   newAwaySlug: 'lautaro',      newTime: '12:30', newDate: '2026-06-14' },
  // BUF-NAV viene de F9 old (#26).
  { oldNumber: 26, newNumber: 20, newRoundNumber: 7, newHomeSlug: 'buffalos',    newAwaySlug: 'navidad',      newTime: '14:00', newDate: '2026-06-14' },

  // ---- Fecha 8 (2 partidos) ----
  { oldNumber: 23, newNumber: 21, newRoundNumber: 8, newHomeSlug: 'lautaro',     newAwaySlug: 'huillines',    newTime: '12:30', newDate: '2026-06-21' },
  { oldNumber: 24, newNumber: 22, newRoundNumber: 8, newHomeSlug: 'ragko',       newAwaySlug: 'basket-arauco',newTime: '14:00', newDate: '2026-06-21' },

  // ---- Fecha 9 (3 partidos) ----
  // LAF-LAU postponed de F2 (old #4) reaparece aquí como LAU-LAF.
  { oldNumber: 4,  newNumber: 23, newRoundNumber: 9, newHomeSlug: 'lautaro',     newAwaySlug: 'lafken',       newTime: '11:00', newDate: '2026-06-28', forceStatus: MatchStatus.SCHEDULED,
    notes: 'Reprogramado desde F2 (estaba POSTPONED) según fixture final 2026-05-21.' },
  // LAR-BUF de F6 (old #16) viene aquí como BUF-LAR.
  { oldNumber: 16, newNumber: 24, newRoundNumber: 9, newHomeSlug: 'buffalos',    newAwaySlug: 'laraquete',    newTime: '12:30', newDate: '2026-06-28',
    notes: 'Movido desde F6 con swap home/away según fixture final 2026-05-21.' },
  // BAS-NAV duplicado de F7 (old #21) se reemplaza por BAS-HUI (par faltante en fixture viejo).
  { oldNumber: 21, newNumber: 25, newRoundNumber: 9, newHomeSlug: 'basket-arauco',newAwaySlug: 'huillines',   newTime: '14:00', newDate: '2026-06-28',
    notes: 'Reasignado: era BAS-NAV duplicado en F7, ahora BAS-HUI (par faltante en fixture viejo). Re-sincronizar evento en NM.' },

  // ---- Fecha 10 ----
  { oldNumber: 27, newNumber: 26, newRoundNumber: 10, newHomeSlug: 'lautaro',    newAwaySlug: 'ragko',        newTime: '11:00', newDate: '2026-07-05' },
  { oldNumber: 28, newNumber: 27, newRoundNumber: 10, newHomeSlug: 'huillines',  newAwaySlug: 'laraquete',    newTime: '12:30', newDate: '2026-07-05' },
  // BUF-LAF viene de F8 old (#22).
  { oldNumber: 22, newNumber: 28, newRoundNumber: 10, newHomeSlug: 'buffalos',   newAwaySlug: 'lafken',       newTime: '14:00', newDate: '2026-07-05' },

  // ---- Fecha 11 (semis) — hora 00:00 = "Por definir" ----
  { oldNumber: 29, newNumber: 29, newRoundNumber: 11, newHomeSlug: null, newAwaySlug: null,
    newHomePlaceholder: '2° lugar regular', newAwayPlaceholder: '3° lugar regular',
    newTime: '00:00', newDate: '2026-07-12' },
  { oldNumber: 30, newNumber: 30, newRoundNumber: 11, newHomeSlug: null, newAwaySlug: null,
    newHomePlaceholder: '1° lugar regular', newAwayPlaceholder: '4° lugar regular',
    newTime: '00:00', newDate: '2026-07-12' },

  // ---- Fecha 12 (finales) — hora 00:00 = "Por definir" ----
  { oldNumber: 31, newNumber: 31, newRoundNumber: 12, newHomeSlug: null, newAwaySlug: null,
    newHomePlaceholder: 'Perdedor partido 30', newAwayPlaceholder: 'Perdedor partido 29',
    newTime: '00:00', newDate: '2026-07-19' },
  { oldNumber: 32, newNumber: 32, newRoundNumber: 12, newHomeSlug: null, newAwaySlug: null,
    newHomePlaceholder: 'Ganador partido 30', newAwayPlaceholder: 'Ganador partido 29',
    newTime: '00:00', newDate: '2026-07-19' },
];

async function main() {
  const teams = await prisma.team.findMany();
  const teamIdBySlug = Object.fromEntries(teams.map(t => [t.slug, t.id]));
  const slugByTeamId = Object.fromEntries(teams.map(t => [t.id, t.slug]));

  const rounds = await prisma.round.findMany();
  const roundIdByNumber = Object.fromEntries(rounds.map(r => [r.number, r.id]));

  const matches = await prisma.match.findMany();
  const matchByNumber = new Map(matches.map(m => [m.number, m]));

  // Sanity check 1: que existan los 32 numbers que el script espera
  for (const op of ops) {
    if (!matchByNumber.has(op.oldNumber)) {
      throw new Error(`Falta Match number=${op.oldNumber} en la DB. ¿Ya migraste?`);
    }
  }

  // Sanity check 2: huella del estado viejo — si M5 ya está como BAS-NAV con score 71-103, ya migramos.
  const m5 = matchByNumber.get(5)!;
  if (m5.homeTeamId === teamIdBySlug['basket-arauco'] && m5.awayTeamId === teamIdBySlug['navidad']) {
    throw new Error(
      'Match #5 ya luce BAS-NAV: la DB parece estar en estado nuevo (post-migración). ' +
        'Abortando para no re-invertir el marcador.',
    );
  }
  if (m5.homeTeamId !== teamIdBySlug['navidad'] || m5.awayTeamId !== teamIdBySlug['basket-arauco']) {
    throw new Error(
      `Match #5 no coincide con el estado viejo esperado (NAV-BAS). ` +
        `Tiene home=${slugByTeamId[m5.homeTeamId!]} away=${slugByTeamId[m5.awayTeamId!]}. Abortando.`,
    );
  }
  if (m5.homeScore !== 103 || m5.awayScore !== 71) {
    throw new Error(
      `Match #5 no tiene el marcador esperado 103-71. Tiene ${m5.homeScore}-${m5.awayScore}. Abortando.`,
    );
  }

  console.log('✓ Sanity checks OK. Aplicando migración en transacción...');

  await prisma.$transaction(
    async tx => {
    // Phase A — mover cada partido afectado a number temporal negativo
    for (const op of ops) {
      await tx.match.update({
        where: { number: op.oldNumber },
        data: { number: -op.oldNumber },
      });
    }

    // Phase B — asignar valores finales (lookup por number temporal negativo)
    for (const op of ops) {
      const old = matchByNumber.get(op.oldNumber)!;
      const scheduledAt = new Date(`${op.newDate}T${op.newTime}:00${CL}`);
      const newHomeTeamId = op.newHomeSlug ? teamIdBySlug[op.newHomeSlug] : null;
      const newAwayTeamId = op.newAwaySlug ? teamIdBySlug[op.newAwaySlug] : null;

      const data: Record<string, unknown> = {
        number: op.newNumber,
        roundId: roundIdByNumber[op.newRoundNumber],
        scheduledAt,
        homeTeamId: newHomeTeamId,
        awayTeamId: newAwayTeamId,
        homePlaceholder: op.newHomePlaceholder ?? null,
        awayPlaceholder: op.newAwayPlaceholder ?? null,
      };

      // Detección de cambio de par de teams → si es par totalmente distinto,
      // limpiar score y status (caso old #21 BAS-NAV → new #25 BAS-HUI).
      const oldPair = [old.homeTeamId, old.awayTeamId].sort().join('|');
      const newPair = [newHomeTeamId, newAwayTeamId].sort().join('|');
      const pairChanged = oldPair !== newPair;

      if (pairChanged && newHomeTeamId && newAwayTeamId) {
        data.homeScore = null;
        data.awayScore = null;
        data.status = MatchStatus.SCHEDULED;
      } else if (op.swapScore) {
        data.homeScore = old.awayScore;
        data.awayScore = old.homeScore;
      }

      if (op.forceStatus) data.status = op.forceStatus;
      if (op.notes !== undefined) data.notes = op.notes;

      await tx.match.update({
        where: { number: -op.oldNumber },
        data,
      });
    }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  console.log('✓ Migración aplicada.');

  // Verificación post
  const after = await prisma.match.findMany({
    orderBy: { number: 'asc' },
    include: { homeTeam: true, awayTeam: true, round: true },
  });
  console.log(`\nEstado final (${after.length} partidos):`);
  for (const m of after) {
    const home = m.homeTeam?.shortName ?? m.homePlaceholder ?? '?';
    const away = m.awayTeam?.shortName ?? m.awayPlaceholder ?? '?';
    const score =
      m.homeScore != null && m.awayScore != null ? ` ${m.homeScore}-${m.awayScore}` : '';
    const tm = m.scheduledAt.toISOString().slice(11, 16);
    const dt = m.scheduledAt.toISOString().slice(0, 10);
    console.log(
      `  #${String(m.number).padStart(2)} F${m.round.number} ${dt} ${tm} ${home.padEnd(3)}-${away.padEnd(3)}${score} ${m.status}`,
    );
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
