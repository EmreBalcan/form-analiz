// Android uygulaması için web dosyalarını www/ klasörüne kopyalar: node tools/build-www.mjs
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const out = new URL('www/', root);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const p of ['index.html', 'styles.css', 'manifest.webmanifest', 'src', 'assets']) cpSync(new URL(p, root), new URL(p, out), { recursive: true });
// sürüm etiketi (CI'da commit kısaltması)
const ver = (process.env.APP_VERSION || 'apk').slice(0, 12);
const idx = new URL('index.html', out);
writeFileSync(idx, readFileSync(idx, 'utf8').replace('content="dev"', `content="${ver}"`));
console.log('www hazır:', ver);
