import { EXERCISES, GROUPS, byId } from './exercises/catalog.js';
import { BodyTracker } from './core/body.js';
import { FormEngine } from './core/engine.js';
import { createDetector } from './ui/detector.js';
import { Speaker } from './ui/speech.js';
import { drawPose } from './ui/overlay.js';

const $ = (id) => document.getElementById(id);
const el = {
  video: $('video'), canvas: $('overlay'), stage: $('stage'), empty: $('empty'),
  ok: $('okCount'), bad: $('badCount'), okLabel: $('okLabel'), cue: $('cue'), msg: $('message'),
  bar: $('progressBar'), view: $('viewBadge'), state: $('stateBadge'),
  rules: $('ruleList'), rejects: $('rejectList'), rejectEmpty: $('rejectEmpty'), reps: $('repList'),
  setup: $('setupText'), setupTip: $('setupTip'), viewHint: $('viewHint'), debug: $('debug'),
};
const ctx2d = el.canvas.getContext('2d');
const speaker = new Speaker();
const tracker = new BodyTracker();

let def = byId(localStorage_get('exercise') || 'dumbbell-curl') || EXERCISES[0];
let engine = null;
let detector = null;
let detectorModel = null;
let stream = null;
let running = false;
let lastVideoTime = -1;
let lastPose = null;
let lastSnap = null;
let cueTimer = null;
const recording = [];

function localStorage_get(k) { try { return localStorage.getItem(`fa.${k}`); } catch { return null; } }
function localStorage_set(k, v) { try { localStorage.setItem(`fa.${k}`, v); } catch { /* yok */ } }

const VIEW_TR = { front: 'Önden', side: 'Yandan', oblique: 'Çapraz', unknown: 'Belirsiz' };
const STATE_TR = { waiting: 'Bekleniyor', calibrating: 'Kalibrasyon', ready: 'Hazır', active: 'Tekrar', paused: 'Duraklatıldı' };

// ---------------------------------------------------------------- hareket seçimi
function selectExercise(id) {
  def = byId(id) || def;
  localStorage_set('exercise', def.id);
  $('pickName').textContent = `${def.no}. ${def.tr}`;
  $('pickGroup').textContent = `${def.en} · ${def.group}`;
  $('pickImg').src = def.img;
  el.setup.textContent = def.setup || '';
  el.setupTip.textContent = def.setup || 'Kamerayı başlat.';
  const v = [def.view, ...(def.viewAlt || [])].map((x) => VIEW_TR[x]).join(' veya ');
  el.viewHint.textContent = `Önerilen kamera açısı: ${v}. Başlangıç: ${def.startText}. Kamera açıldıktan sonra başlangıç pozisyonunda 1 sn sabit dur (kalibrasyon).`;
  el.okLabel.textContent = def.mode === 'hold' ? 'Saniye' : (def.counterLabel || 'Geçerli');
  newSet();
  renderRules(null);
}

function newSet() {
  engine = new FormEngine(def, onEngineEvent);
  tracker.reset();
  el.ok.textContent = '0'; el.bad.textContent = '0';
  el.rejects.innerHTML = ''; el.reps.innerHTML = '';
  el.rejectEmpty.classList.remove('hidden');
  hideCue();
}

function buildPicker() {
  const list = $('pickerList');
  const q = $('search').value.trim().toLocaleLowerCase('tr');
  list.innerHTML = '';
  for (const g of GROUPS) {
    const items = EXERCISES.filter((e) => e.group === g && (!q || `${e.tr} ${e.en} ${e.group}`.toLocaleLowerCase('tr').includes(q)));
    if (!items.length) continue;
    const h = document.createElement('h3'); h.textContent = g; list.append(h);
    const grid = document.createElement('div'); grid.className = 'grid';
    for (const e of items) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = `item${e.id === def.id ? ' sel' : ''}`;
      b.innerHTML = `<img loading="lazy" alt="" src="${e.img}"><b>${e.no}. ${e.tr}</b><small>${e.en}</small>`;
      b.onclick = () => { selectExercise(e.id); $('picker').close(); };
      grid.append(b);
    }
    list.append(grid);
  }
}
$('pickBtn').onclick = () => { $('search').value = ''; buildPicker(); $('picker').showModal(); $('search').focus(); };
$('search').oninput = buildPicker;

// ---------------------------------------------------------------- olaylar
function ruleCue(text) {
  const r = def.rules.find((x) => x.text === text);
  return r?.cue || text;
}

function onEngineEvent(e) {
  if (e.type === 'cue') {
    showCue(e.text, e.level);
    if (!e.silent) speaker.say(e.cue, e.level === 'critical' ? 3 : 2);
  } else if (e.type === 'rep') {
    el.ok.textContent = String(e.accepted);
    el.bad.textContent = String(e.rejected);
    addRep(e.rep);
    if (e.rep.ok) {
      if (!e.rep.hold) speaker.say(String(e.accepted), e.rep.warnings.length ? 2 : 1, 0);
      if (e.rep.warnings.length) showCue(e.rep.warnings[0], 'warning');
    } else {
      showCue(`Sayılmadı: ${e.rep.reasons[0]}`, 'critical');
      speaker.say(`Sayılmadı. ${ruleCue(e.rep.reasons[0])}`, 3, 0);
    }
  } else if (e.type === 'calibrated') {
    showCue('Kalibrasyon tamam — başlayabilirsin', 'good');
    speaker.say('Hazır, başlayabilirsin', 1, 0);
  } else if (e.type === 'hold') {
    el.ok.textContent = String(e.seconds);
    speaker.say(`${e.seconds} saniye`, 1, 0);
  }
}

function showCue(text, level) {
  el.cue.textContent = text;
  el.cue.className = `cue ${level === 'critical' ? 'critical' : level === 'good' ? 'good' : ''}`;
  clearTimeout(cueTimer);
  cueTimer = setTimeout(hideCue, 3200);
}
function hideCue() { el.cue.classList.add('hidden'); }

function addRep(rep) {
  const li = document.createElement('li');
  li.className = rep.ok ? 'ok' : '';
  const title = rep.hold ? `Duruş bozuldu (${rep.n})` : `${rep.n}. tekrar — ${rep.ok ? 'geçerli' : 'sayılmadı'}`;
  li.innerHTML = `<b>${title}</b>`;
  const ul = document.createElement('ul');
  rep.reasons.forEach((r) => { const x = document.createElement('li'); x.textContent = r; ul.append(x); });
  rep.warnings.forEach((w) => { const x = document.createElement('li'); x.className = 'w'; x.textContent = `Uyarı: ${w}`; ul.append(x); });
  if (ul.children.length) li.append(ul);
  el.reps.prepend(li);
  if (!rep.ok) {
    const r = li.cloneNode(true);
    el.rejects.prepend(r);
    el.rejectEmpty.classList.add('hidden');
  }
}

const STATUS_TR = { ok: 'doğru', warn: 'uyarı', bad: 'HATA', na: 'ölçülemiyor', idle: '—', view: '' };
function renderRules(snap) {
  const rows0 = (snap?.rules || def.rules.map((r) => ({ id: r.id, text: r.label || r.text, level: r.reject !== undefined ? 'critical' : 'warning', status: 'idle' })));
  // aynı kontrolü yapan kurallar (yedek ölçümler) tek satır: en kötü durum gösterilir
  const RANK = { bad: 5, warn: 4, ok: 3, idle: 2, na: 1, view: 0 };
  const merged = new Map();
  for (const r of rows0) {
    const m = merged.get(r.text);
    if (!m) merged.set(r.text, { ...r });
    else {
      if ((RANK[r.status] ?? 0) > (RANK[m.status] ?? 0)) Object.assign(m, { status: r.status, note: r.note });
      if (r.level === 'critical') m.level = 'critical';
    }
  }
  el.rules.innerHTML = '';
  for (const r of merged.values()) {
    const li = document.createElement('li');
    li.className = r.status;
    const st = r.status === 'view' ? r.note : r.status === 'na' ? (r.note || STATUS_TR.na) : STATUS_TR[r.status] || '';
    li.innerHTML = `<span class="dot ${r.level}"></span><span></span><span class="st"></span>`;
    li.children[1].textContent = r.text;
    li.children[2].textContent = st;
    el.rules.append(li);
  }
}

// ---------------------------------------------------------------- kamera / video
async function ensureDetector() {
  const model = $('modelSelect').value;
  if (detector && detectorModel === model) return;
  el.msg.textContent = 'Poz modeli yükleniyor…';
  detector?.close();
  detector = await createDetector(model);
  detectorModel = model;
}

async function startCamera() {
  try {
    await ensureDetector();
    const deviceId = $('cameraSelect').value;
    stopStream();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    el.video.srcObject = stream;
    el.video.loop = false;
    await el.video.play();
    await listCameras();
    begin();
  } catch (err) {
    console.error(err);
    el.msg.textContent = `Kamera açılamadı: ${err.message || err}`;
  }
}

async function startFile(file) {
  try {
    await ensureDetector();
    stopStream();
    el.video.srcObject = null;
    el.video.src = URL.createObjectURL(file);
    el.video.loop = true;
    $('mirrorToggle').checked = false; applyMirror();
    await el.video.play();
    begin();
  } catch (err) {
    el.msg.textContent = `Video açılamadı: ${err.message || err}`;
  }
}

function begin() {
  running = true;
  el.view.textContent = 'Kamera açık';
  el.empty.classList.add('hidden');
  $('stopBtn').disabled = false;
  newSet();
  requestAnimationFrame(loop);
}

function stopStream() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
}
function stop() {
  running = false;
  stopStream();
  el.video.pause();
  el.empty.classList.remove('hidden');
  $('stopBtn').disabled = true;
  el.view.textContent = 'Kamera kapalı';
  speaker.stop();
}

async function listCameras() {
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    const sel = $('cameraSelect');
    const cur = stream?.getVideoTracks()[0]?.getSettings().deviceId;
    sel.innerHTML = devs.map((d, i) => `<option value="${d.deviceId}">${d.label || `Kamera ${i + 1}`}</option>`).join('');
    if (cur) sel.value = cur;
  } catch { /* yok */ }
}

function applyMirror() { el.stage.classList.toggle('mirror', $('mirrorToggle').checked); }

// ---------------------------------------------------------------- ana döngü
function loop() {
  if (!running) return;
  const v = el.video;
  if (v.readyState >= 2 && v.currentTime !== lastVideoTime && v.videoWidth) {
    lastVideoTime = v.currentTime;
    if (el.canvas.width !== v.videoWidth) { el.canvas.width = v.videoWidth; el.canvas.height = v.videoHeight; }
    const now = performance.now();
    const res = detector.detect(v, now);
    if (res) {
      const P = tracker.process({ ...res, width: v.videoWidth, height: v.videoHeight, t: now, posture: def.posture, allSides: def.allSides });
      const snap = engine.update(P);
      lastPose = P; lastSnap = snap;
      record(res, now);
      render(P, snap);
    } else {
      lastPose = null;
      ctx2d.clearRect(0, 0, el.canvas.width, el.canvas.height);
      el.msg.textContent = 'Kişi algılanmadı — tüm vücudun kadraja girsin';
      el.state.textContent = '';
    }
  }
  requestAnimationFrame(loop);
}

let lastRuleRender = 0;
function render(P, snap) {
  drawPose(ctx2d, P, snap, def);
  const viewOk = snap.viewOk;
  el.view.textContent = `Görüş: ${VIEW_TR[snap.view] || snap.view}${viewOk ? ' ✓' : ` — ${VIEW_TR[def.view]} önerilir`}`;
  el.view.className = `badge ${viewOk ? 'good' : 'badv'}`;
  el.state.textContent = STATE_TR[snap.state] || snap.state;
  el.msg.textContent = snap.message || '';
  const p = Math.max(0, Math.min(1.15, snap.progress || 0));
  el.bar.style.width = `${(p / 1.15) * 100}%`;
  if (def.mode === 'hold') el.ok.textContent = String(Math.floor((snap.hold?.goodMs || 0) / 1000));
  const now = performance.now();
  if (now - lastRuleRender > 150) {
    lastRuleRender = now;
    renderRules(snap);
    if ($('debug').closest('details').open) renderDebug(P, snap);
  }
}

function fmt(v) { return Number.isFinite(v) ? (Math.abs(v) < 3 ? v.toFixed(2) : v.toFixed(0)) : '—'; }
function renderDebug(P, snap) {
  const lines = [];
  const T = P.torso();
  lines.push(`görüş: ${P.view}  yakın taraf: ${P.near}  ölçek: ${fmt(P.scale())}px  gövde ekseni: ${T?.src || '—'}`);
  lines.push(`ana ölçüm (${def.metric.label}): ${fmt(snap.metric)}  ilerleme: ${fmt(snap.progress)}  taraf: ${snap.side || '-'}`);
  for (const s of ['L', 'R']) {
    const a = P.arm(s);
    if (a) lines.push(`${s} kol: yükseklik ${fmt(a.elev)}° öne ${fmt(a.flex)}° yana ${fmt(a.abd)}° (boy oranı ${fmt(a.ratio)})`);
  }
  for (const r of snap.rules) {
    lines.push(`[${r.status}] ${r.id}: ${fmt(r.value)} ${r.side || ''} · ${r.src || r.note || ''}${r.conf ? ` · güven ${r.conf.toFixed(2)}` : ''}`);
  }
  el.debug.textContent = lines.join('\n');
}

function record(res, t) {
  recording.push({ t: Math.round(t), lm: res.landmarks.map((p) => [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4), +(p.visibility ?? 0).toFixed(2)]) });
  while (recording.length && t - recording[0].t > 60000) recording.shift();
}

$('exportBtn').onclick = () => {
  const data = { exercise: def.id, w: el.video.videoWidth, h: el.video.videoHeight, reps: engine.reps, frames: recording };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = `form-${def.id}-${Date.now()}.json`;
  a.click();
};
$('startBtn').onclick = startCamera;
$('stopBtn').onclick = stop;
$('resetBtn').onclick = newSet;
$('fileInput').onchange = (e) => { const f = e.target.files?.[0]; if (f) startFile(f); };
$('soundToggle').onchange = (e) => { speaker.enabled = e.target.checked; if (!speaker.enabled) speaker.stop(); };
$('mirrorToggle').onchange = applyMirror;
$('cameraSelect').onchange = () => { if (running && stream) startCamera(); };
$('modelSelect').onchange = () => { if (running && stream) startCamera(); };

$('appVersion').textContent = `sürüm ${document.querySelector('meta[name="app-version"]')?.content || 'dev'}`;
applyMirror();
selectExercise(def.id);
listCameras();
window.__formAnaliz = { get pose() { return lastPose; }, get snap() { return lastSnap; }, get engine() { return engine; } };
