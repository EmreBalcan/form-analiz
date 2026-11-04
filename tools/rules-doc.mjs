// docs/KURALLAR.md'yi katalogdan üretir: node tools/rules-doc.mjs
import { writeFileSync } from 'node:fs';
import { EXERCISES } from '../src/exercises/catalog.js';

const DEG = new Set(['elbowAngle', 'kneeAngle', 'hipAngle', 'armElev', 'armFlex', 'armAbd', 'armPlane', 'torsoPitch', 'torsoLean', 'torsoRoll', 'forearmTilt', 'footAngle', 'neckFlex', 'torsoFromVertical', 'thighTilt', 'thighExt', 'elbowUnderShoulder', 'legTorso', 'frontKnee', 'backKnee', 'stepKnee', 'armElevDiff', 'bodyLine']);
const VIEW = { side: 'yandan', front: 'önden', oblique: 'çapraz' };
const PHASE = { active: 'tüm tekrar', out: 'hedefe giderken', peak: 'tepe/dip noktası', back: 'dönüşte', always: 'sürekli' };
const unit = (m) => (DEG.has(m) ? '°' : m === 'shrug' ? ' üst kol boyu' : ' (vücut ölçeği)');
const fmt = (x, m) => (typeof x === 'function' ? `${x.toString().includes('allowance') ? '' : ''}değişken` : `${x}${unit(m)}`);

function thr(r) {
  const m = typeof r.measure === 'string' ? r.measure : 'özel';
  const sym = r.op === '<' ? '<' : '>';
  const rel = r.relative === 'range' ? 'tekrar içindeki hareket aralığı ' : r.relative === 'rep' ? 'tekrar başına göre değişim ' : r.relative === 'calib' ? 'kalibrasyona göre ' : '';
  const ex = r.agg === 'extreme' ? 'fazdaki en iyi değer ' : '';
  const w = r.warn !== undefined ? `uyarı ${sym} ${fmt(r.warn, m)}` : '';
  const j = r.reject !== undefined ? `ret ${sym} ${fmt(r.reject, m)}` : '';
  return `${ex}${rel}${[w, j].filter(Boolean).join(' · ')}`;
}

let md = `# Form kuralları (72 hareket)

Bu belge \`src/exercises/catalog.js\` dosyasından otomatik üretilir (\`node tools/rules-doc.mjs\`). Elle düzenleme.

## Nasıl karar verilir

- **Tekrar sayımı:** her hareketin bir ana ölçümü vardır (ör. dirsek açısı). Tekrar, başlangıç değerinden
  hedef değere ulaşıp başlangıca **geri dönünce** biter. Hedefe ulaşılmazsa veya başlangıca dönülmezse tekrar
  **sayılmaz** (hareket açıklığı kritik kuraldır).
- **Kritik kural (ret):** eşik, en az ~150–250 ms boyunca aşılırsa tekrar sayılmaz ve nedeni listeye yazılır.
- **Uyarı:** tekrar sayılır; yazılı ve sesli uyarı verilir.
- **Güven:** bir kural yalnızca ölçüm güveni yeterliyse ve kamera kuralın en iyi ölçüldüğü açıdaysa
  (\`bestView\`) tekrarı reddedebilir. Diğer durumlarda yalnızca ret eşiği aşılınca uyarır. Böylece yanlış
  açıdan bakan kamera doğru tekrarı reddetmez.
- **Yedek zincirleri:** omuz silkme kulak → göz → ağız → burun; gövde ekseni kalça → omuz hattı → yerçekimi;
  gövde salınımı kalça-omuz açısı → omuz yatay kayması → dünya modeli. Kullanılan kaynak arayüzde gösterilir.
- **Derinlik:** kameraya doğru/kameradan uzağa hareketler (ör. önden çekimde dirseğin öne kaçması) MediaPipe'ın
  z değeriyle değil, kemiğin ekranda kısalmasıyla (Taylor yöntemi) ölçülür; z yalnızca yön için kullanılır.
- **Birimler:** "üst kol boyu" ≈ 30 cm (0,10 ≈ 3 cm). "vücut ölçeği" = üst kol boyu.

## Kaynaklar (eşiklerin dayanağı)

- Biceps curl: üst kol sabit, dirsek gövde yanında, gövde salınımı/momentum yok, kontrollü indirme —
  [Wikipedia: Bicep curl](https://en.wikipedia.org/wiki/Bicep_curl), [LiveStrong](https://livestrong.com/article/13722123-biceps-curl-mistakes), [Built With Science](https://builtwithscience.com/fitness-tips/fix-bicep-curls-mistakes)
- Yana açış: dirsek hafif ve sabit bükük, omuz hizası, omuz silkme ve salınım yok, dirsekle yönet —
  [Peloton](https://www.onepeloton.com/blog/lateral-raises), [Origym](https://www.origym.co.uk/blog/lateral-raise/), [Speediance](https://www.speediance.com/blogs/fitness/how-to-do-lateral-raise-guide)
- Bench press: dirsek gövdeyle 45–75°, kürek kemikleri geri-aşağı, bar göğüs ortasına, bilek dirsek üstünde —
  [StrengthLog](https://www.strengthlog.com/common-bench-press-mistakes/), [Built With Science](https://builtwithscience.com/fitness-tips/shoulder-pain-bench-press/)
- Squat: en az paralel derinlik, diz içe kaçmaması, topuk yerde, aşırı öne eğilmeme —
  [Wikipedia: Squat](https://en.wikipedia.org/wiki/Squat_(exercise)), [NSCA: Squat depth](https://www.nsca.com/education/articles/nsca-coach/considerations-for-squat-depth)
- Triceps itiş: üst kol gövde yanında kilitli, en fazla ~10–20° öne eğilme, gövdeyle bastırmama —
  [Gravitus](https://gravitus.com/guides/exercises/pushdown), [SQUATWOLF](https://squatwolf.com/blogs/fitness/triceps-pushdown)
- MediaPipe noktaları, görünürlük ve z ölçeği — [Pose Landmarker (Web)](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js)

Eşikler bu kaynaklardaki koçluk değerlerine ve MediaPipe ölçüm gürültüsüne göre seçildi. Gerçek salon
videolarıyla kalibre edilmeleri gerekir (bkz. README: "Kayıt verisini indir").
`;

let group = '';
for (const e of EXERCISES) {
  if (e.group !== group) { group = e.group; md += `\n## ${group}\n`; }
  const m = e.metric;
  md += `\n### ${e.no}. ${e.tr} (${e.en})\n\n`;
  md += `- **Kamera:** ${[e.view, ...(e.viewAlt || [])].map((v) => VIEW[v] || v).join(' / ')} — ${e.setup || ''}\n`;
  md += `- **Başlangıç:** ${e.startText}\n`;
  if (e.mode === 'hold') md += `- **Mod:** süre tutma (form bozulunca süre durur, olay listeye yazılır)\n`;
  else md += `- **Tekrar:** ${m.label}: ${m.start} → ${m.target}${m.romCritical === false ? ' (döngü sayımı, açıklık ret sebebi değil)' : ` · hedefe ulaşmazsa: "${m.romText}" · dönmezse: "${m.returnText}"`}\n`;
  if (e.tempo) {
    const t = e.tempo;
    const parts = [];
    if (t.minOutMs) parts.push(`hedefe gidiş ≥ ${t.minOutMs} ms`);
    if (t.minBackMs) parts.push(`dönüş ≥ ${t.minBackMs} ms`);
    if (t.minPeakMs) parts.push(`tepede bekleme ≥ ${t.minPeakMs} ms`);
    if (parts.length) md += `- **Tempo (uyarı):** ${parts.join(', ')}\n`;
  }
  md += `\n| Kural | Tür | Eşik | Ne zaman | Açı |\n|---|---|---|---|---|\n`;
  for (const r of e.rules) {
    const lvl = r.reject !== undefined ? '**Kritik**' : 'Uyarı';
    const ph = (Array.isArray(r.phase) ? r.phase : [r.phase || 'active']).map((p) => PHASE[p] || p).join(', ');
    const vw = r.views ? r.views.map((v) => VIEW[v]).join('/') : r.bestView ? `ret: ${VIEW[r.bestView]}` : 'tümü';
    md += `| ${r.text} | ${lvl} | ${thr(r)} | ${ph} | ${vw} |\n`;
  }
}
writeFileSync(new URL('../docs/KURALLAR.md', import.meta.url), md);
console.log(`docs/KURALLAR.md yazıldı (${EXERCISES.length} hareket, ${EXERCISES.reduce((a, e) => a + e.rules.length, 0)} kural)`);
