/**
 * Clash Display, self-hosted without being committed.
 *
 * Its licence (ITF Free Font License 2.0, fontshare.com/licenses/itf-ffl)
 * allows self-hosting on our own site but forbids modifying, subsetting or
 * converting it, and forbids making it available through a public
 * repository. This repo is public, so the files are fetched here, at build
 * time, exactly as Fontshare ships them, into public/fonts/clash/ (ignored
 * by git) and deployed with the site.
 *
 * Never fails the build: if Fontshare can't be reached, src/styles/clash.css
 * falls back to Fontshare's own servers for the same files.
 *
 * Runs automatically before `npm run build` (the "prebuild" script).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'fonts', 'clash');
const CSS = 'https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

async function main() {
  const css = await (await fetch(CSS, { headers: { 'User-Agent': UA } })).text();
  const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(([, body]) => ({
    weight: body.match(/font-weight:\s*(\d+)/)?.[1],
    url: body.match(/url\('?([^')]+\.woff2)'?\)/)?.[1],
  })).filter((f) => f.weight && f.url);
  if (faces.length < 3) throw new Error(`expected 3 weights, got ${faces.length}`);

  await mkdir(OUT, { recursive: true });
  for (const { weight, url } of faces) {
    const res = await fetch(url.startsWith('//') ? `https:${url}` : url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${weight}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(OUT, `clash-display-${weight}.woff2`), buf);
    console.log(`clash: ${weight} ${(buf.length / 1024).toFixed(1)} KB`);
  }
}

main().catch((err) => {
  console.warn(`clash: not self-hosted this build (${err.message}); the CSS falls back to Fontshare.`);
});
