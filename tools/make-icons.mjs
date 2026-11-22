// assets/icon.svg → PWA ve Android simgeleri (Edge ile çizdirilir): node tools/make-icons.mjs
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
const require = createRequire('C:/Users/EMRE/gida-analiz/package.json');
const { chromium } = require('playwright-core');
const root = new URL('../', import.meta.url);
const svg = readFileSync(new URL('assets/icon.svg', root), 'utf8');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
async function render(size, out, { pad = 0, round = false, bg = null } = {}) {
  const inner = size - pad * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:${bg || 'transparent'}"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${round ? 'border-radius:50%;overflow:hidden;' : ''}"><div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></div></body></html>`);
  mkdirSync(new URL('.', out), { recursive: true });
  await page.screenshot({ path: out.pathname.replace(/^\/([A-Z]:)/, '$1'), omitBackground: !bg });
}
// PWA
for (const s of [192, 512]) await render(s, new URL(`assets/icons/icon-${s}.png`, root));
await render(512, new URL('assets/icons/icon-maskable-512.png', root), { pad: 52, bg: '#0f1512' });
await render(180, new URL('assets/icons/apple-touch-icon.png', root), { bg: '#0f1512' });
// Android mipmap (android/ klasörü varsa)
const res = new URL('android/app/src/main/res/', root);
if (existsSync(res)) {
  const dens = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [d, s] of Object.entries(dens)) {
    await render(s, new URL(`mipmap-${d}/ic_launcher.png`, res));
    await render(s, new URL(`mipmap-${d}/ic_launcher_round.png`, res), { round: true });
    // uyarlanabilir simge ön planı: 108dp tuval, içerik ortada güvenli bölgede
    await render(Math.round(s * 2.25), new URL(`mipmap-${d}/ic_launcher_foreground.png`, res), { pad: Math.round(s * 2.25 * 0.2) });
  }
}
await browser.close();
console.log('simgeler üretildi');
