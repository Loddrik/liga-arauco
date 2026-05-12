/**
 * One-shot: descarga logos de @lba_2026_ desde los posts "EQUIPO CONFIRMADO",
 * recorta y guarda como PNG, extrae color dominante con node-vibrant,
 * actualiza Team.logoUrl, primaryColor, instagramHandle.
 *
 * Los logos quedan en apps/web/public/teams/<slug>.png
 * El campo logoUrl apunta a /teams/<slug>.png (servido como asset estático).
 */
import { PrismaClient } from '@prisma/client';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import sharp from 'sharp';

const prisma = new PrismaClient();

interface TeamPost {
  slug: string;
  postId: string;
  instagramHandle: string | null;
  // Crop window observado manualmente sobre el raw 1080x{h} de cada post,
  // ajustado para encerrar tight el logo del equipo (sin header ni footer LBA).
  crop: { left: number; top: number; size: number };
  // Color primario hardcoded por observación del logo real (vibrant detecta el
  // background gold sparkly del template, no el color del equipo).
  primaryColor: string;
}

const posts: TeamPost[] = [
  { slug: 'ragko',        postId: 'DXr5_i8kbsp', instagramHandle: 'atletico_ragko',     crop: { left: 200, top: 240, size: 680 }, primaryColor: '#1E4E8C' },
  { slug: 'lafken',       postId: 'DXfBo-sEcmO', instagramHandle: 'cds_lafken_lota',    crop: { left: 250, top: 200, size: 580 }, primaryColor: '#1A2A45' },
  { slug: 'basket-arauco',postId: 'DXZ5druEXuF', instagramHandle: 'basket_arauco',      crop: { left: 200, top: 240, size: 460 }, primaryColor: '#5C2A6E' },
  { slug: 'lautaro',      postId: 'DXYTYmhDvzr', instagramHandle: 'lautarobasket_lota', crop: { left: 260, top: 210, size: 560 }, primaryColor: '#2A4D8C' },
  { slug: 'buffalos',     postId: 'DXYAXOJETOV', instagramHandle: 'buffalos.basquet',   crop: { left: 270, top: 215, size: 540 }, primaryColor: '#1F1F1F' },
  { slug: 'huillines',    postId: 'DXUzjDeEQI5', instagramHandle: 'cdhuillines',        crop: { left: 240, top: 175, size: 600 }, primaryColor: '#6B1F26' },
  { slug: 'navidad',      postId: 'DXRjfr-kZ9v', instagramHandle: 'cdn.navidad',        crop: { left: 180, top: 250, size: 720 }, primaryColor: '#1A2E5C' },
  { slug: 'laraquete',    postId: 'DXca5IMEZ6-', instagramHandle: null,                 crop: { left: 270, top: 210, size: 540 }, primaryColor: '#1F5B8A' },
];

const OUT_DIR = path.resolve(__dirname, '../../web/public/teams');
const RAW_DIR = '/tmp/lba-logos';

async function fetchPostImage(postId: string): Promise<string> {
  // El /embed/ devuelve la imagen completa 1080x1080 sin recortes laterales,
  // a diferencia de og:image que recorta para preview de redes sociales.
  const r = await fetch(`https://www.instagram.com/p/${postId}/embed/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
  });
  const html = await r.text();
  // Primera opción: imagen explícita 1080x1080 (p1080x1080 o s1080x1080).
  // Fallback: src de t51.82787-15 sin marcador de tamaño (que es la imagen original).
  // Evitamos t51.82787-19 que son profile pics.
  const m1080 = html.match(/src="([^"]+[ps]1080x1080[^"]+)"/);
  if (m1080) return m1080[1].replaceAll('&amp;', '&');
  const mOrig = html.match(/src="(https:\/\/[^"]+t51\.82787-15\/[^"]+)"/);
  if (mOrig) return mOrig[1].replaceAll('&amp;', '&');
  throw new Error(`no embed image for ${postId}`);
}

async function downloadTo(url: string, dest: string) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`download failed: ${r.status} ${r.statusText}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.writeFile(dest, buf);
}

async function processOne(p: TeamPost) {
  const rawPath = path.join(RAW_DIR, `${p.slug}-raw.jpg`);
  const outPath = path.join(OUT_DIR, `${p.slug}.png`);

  console.log(`→ ${p.slug}`);
  // Cache: si ya existe el raw, no re-descargar (IG cambia URLs y reduce reqs).
  try {
    await fs.access(rawPath);
  } catch {
    const imgUrl = await fetchPostImage(p.postId);
    await downloadTo(imgUrl, rawPath);
  }

  // Crop específico por equipo según lo observado en el raw image.
  const { width = 1080, height = 1080 } = await sharp(rawPath).metadata();
  const { left, top, size: cropSize } = p.crop;
  // Validación de bounds
  if (left + cropSize > width || top + cropSize > height) {
    throw new Error(`crop fuera de bounds para ${p.slug}: ${left}+${cropSize}>${width} o ${top}+${cropSize}>${height}`);
  }

  await sharp(rawPath)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(outPath);

  await prisma.team.update({
    where: { slug: p.slug },
    data: {
      logoUrl: `/teams/${p.slug}.png`,
      primaryColor: p.primaryColor,
      ...(p.instagramHandle ? { instagramHandle: p.instagramHandle } : {}),
    },
  });

  console.log(`   ✓ logo + color ${p.primaryColor}${p.instagramHandle ? ` + handle @${p.instagramHandle}` : ''}`);
}

async function main() {
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const p of posts) {
    try {
      await processOne(p);
    } catch (e) {
      console.error(`   ✗ ${p.slug}: ${(e as Error).message}`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
