/**
 * Carga la nómina oficial 2026 de los 8 equipos desde file-space/Nomina_oficial.docx.
 *
 * Idempotente: upsert por (rut) — si el jugador ya existe, actualiza nombre,
 * jersey y teamId. Si el RUT no existe aún, lo crea.
 *
 * Uso:
 *   pnpm --filter @liga/api exec tsx prisma/seed-players.ts
 *
 * Asume que los 8 equipos ya están seedados (slugs basket-arauco, buffalos, etc).
 */
import { promises as fs } from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';

const execP = promisify(exec);
const prisma = new PrismaClient();

const DOCX_PATH = '/home/ruben/projects/personal/liga-arauco/file-space/Nomina_oficial.docx';

// Mapping del nombre que aparece en el docx → slug en DB.
const TEAM_HEADER_TO_SLUG: Record<string, string> = {
  BasketArauco: 'basket-arauco',
  LARAQUETE:    'laraquete',
  RAGKO:        'ragko',
  BUFFALOS:     'buffalos',
  HUILLINES:    'huillines',
  NAVIDAD:      'navidad',
  LAFKEN:       'lafken',
  LAUTARO:      'lautaro',
};

interface ParsedPlayer {
  jersey: number;
  name: string;
  rut: string;
}

async function parseDocx(path: string): Promise<Record<string, ParsedPlayer[]>> {
  // Extraemos el text content del docx (es un zip) leyendo word/document.xml.
  const tmpDir = `/tmp/lba-nomina-${Date.now()}`;
  await fs.mkdir(tmpDir, { recursive: true });
  await execP(`unzip -o -q "${path}" -d "${tmpDir}"`);
  const xml = await fs.readFile(`${tmpDir}/word/document.xml`, 'utf-8');
  await fs.rm(tmpDir, { recursive: true, force: true });

  // Cada <w:p> es un párrafo (línea); su texto está en <w:t> nested.
  const paragraphs: string[] = [];
  const paraRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const textRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = paraRe.exec(xml)) !== null) {
    let line = '';
    let t: RegExpExecArray | null;
    while ((t = textRe.exec(m[1])) !== null) {
      line += t[1];
    }
    if (line.trim()) paragraphs.push(line.trim());
  }

  const result: Record<string, ParsedPlayer[]> = {};
  let currentSlug: string | null = null;
  let i = 0;
  const headerRe = /^NOMINA T\.C VARONES (\S+) 2026$/;
  const rutRe = /^[\d.]+-[\dkK]$/;

  while (i < paragraphs.length) {
    const line = paragraphs[i];
    const headerMatch = line.match(headerRe);
    if (headerMatch) {
      const teamHeader = headerMatch[1];
      const slug = TEAM_HEADER_TO_SLUG[teamHeader];
      if (!slug) throw new Error(`Header de equipo no mapeado: "${teamHeader}"`);
      currentSlug = slug;
      result[slug] = [];
      i += 1;
      continue;
    }
    if (currentSlug && /^\d+$/.test(line) && i + 2 < paragraphs.length) {
      const jerseyNum = parseInt(line, 10);
      const name = paragraphs[i + 1].trim();
      const rut = paragraphs[i + 2].trim();
      if (rutRe.test(rut)) {
        result[currentSlug].push({ jersey: jerseyNum, name, rut });
        i += 3;
        continue;
      }
    }
    i += 1;
  }
  return result;
}

async function main() {
  console.log(`📋 Parseando ${DOCX_PATH}...`);
  const rosterBySlug = await parseDocx(DOCX_PATH);
  const totalPlayers = Object.values(rosterBySlug).reduce((acc, p) => acc + p.length, 0);
  console.log(`✓ ${Object.keys(rosterBySlug).length} equipos, ${totalPlayers} jugadores parseados`);

  const teams = await prisma.team.findMany();
  const idBySlug = Object.fromEntries(teams.map(t => [t.slug, t.id]));

  let created = 0;
  let updated = 0;
  for (const [slug, players] of Object.entries(rosterBySlug)) {
    const teamId = idBySlug[slug];
    if (!teamId) {
      console.warn(`⚠ Slug "${slug}" no existe en DB, skip ${players.length} jugadores`);
      continue;
    }
    for (const p of players) {
      const result = await prisma.player.upsert({
        where: { rut: p.rut },
        create: { teamId, name: p.name, rut: p.rut, jersey: p.jersey },
        update: { teamId, name: p.name, jersey: p.jersey },
      });
      // upsert no nos dice si creó o actualizó. Conteo aproximado por createdAt.
      const justCreated = result.createdAt.getTime() > Date.now() - 1000;
      if (justCreated) created++;
      else updated++;
    }
    console.log(`  ${slug.padEnd(15)} ${players.length} jugadores`);
  }

  console.log(`\n✓ Total: ${created} creados, ${updated} actualizados.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
