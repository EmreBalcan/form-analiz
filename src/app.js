import { EXERCISES, GROUPS, byId } from './exercises/catalog.js';
import { BodyTracker } from './core/body.js';
import { FormEngine } from './core/engine.js';
import { createDetector } from './ui/detector.js';
import { Speaker, keepScreenOn, isNativeApp } from './ui/speech.js';
import { drawPose } from './ui/overlay.js';
import { ProfileCapture, loadProfile, saveProfile } from './core/profile.js';
import { initProfilePage, refreshProfilePage, rxText } from './ui/profile-page.js';
import { logSet, markDayDone } from './program/store.js';

// Kalıcı vücut ölçümü: omuz silkme her harekette kişinin RAHAT duruşuna göre ölçülür.
let profile = loadProfile();
let profileCap = null; // ölçüm sırasında ProfileCapture

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
let run = null; // günlük program akışı (aşağıda)
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

/** Programsız (serbest) çalışmada biten seti geçmişe yaz. */
function flushFreeSet() {
  if (run || !engine) return;
  const seconds = def.mode === 'hold' ? Math.floor((engine.hold?.goodMs || 0) / 1000) : null;
  if (engine.accepted || engine.rejected || seconds) logSet({ exerciseId: def.id, accepted: engine.accepted, rejected: engine.rejected, seconds });
}

function newSet() {
  flushFreeSet();
  engine = new FormEngine(def, onEngineEvent, { profile });
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
    // sesli komut yalnızca kırmızı (tekrarı reddeden) hatalar için; uyarılar yalnızca ekranda yazılır
    if (!e.silent && e.level === 'critical') speaker.say(e.cue, 3);
  } else if (e.type === 'rep') {
    if (run?.phase === 'rest') return; // dinlenmede yapılan hareket sayılmaz
    el.ok.textContent = String(e.accepted);
    el.bad.textContent = String(e.rejected);
    addRep(e.rep);
    if (e.rep.ok) {
      if (!e.rep.hold) speaker.say(String(e.accepted), 1, 0);
      if (e.rep.warnings.length) showCue(e.rep.warnings[0], 'warning');
      else if (e.rep.notes?.length) showCue(e.rep.notes[0], 'warning'); // görülemeyen kontroller: sessiz not
    } else {
      showCue(`Sayılmadı: ${e.rep.reasons[0]}`, 'critical');
      speaker.say(`Sayılmadı. ${ruleCue(e.rep.reasons[0])}`, 3, 0);
    }
    if (run) programRep(e.accepted, e.rejected);
  } else if (e.type === 'calibrated') {
    showCue('Kalibrasyon tamam — başlayabilirsin', 'good');
    speaker.say('Hazır, başlayabilirsin', 1, 0);
  } else if (e.type === 'hold') {
    if (run?.phase === 'rest') return;
    el.ok.textContent = String(e.seconds);
    speaker.say(`${e.seconds} saniye`, 1, 0);
    if (run) programHold(e.seconds);
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
  (rep.notes || []).forEach((n) => { const x = document.createElement('li'); x.className = 'w'; x.textContent = `Not: ${n}`; ul.append(x); });
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
  keepScreenOn(true); // set sırasında ekran kapanmasın
  if (!profile) startProfile();
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
  flushFreeSet();
  running = false;
  keepScreenOn(false);
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
      const P = tracker.process({ ...res, width: v.videoWidth, height: v.videoHeight, t: now, posture: profileCap ? 'upright' : def.posture, allSides: def.allSides });
      if (profileCap) {
        const r = profileCap.update(P);
        drawPose(ctx2d, P, null, def);
        el.msg.textContent = r.message; el.state.textContent = 'Vücut ölçümü';
        el.bar.style.width = `${Math.round((r.progress || 0) * 100 / 1.15)}%`;
        if (r.done) {
          profile = r.profile; saveProfile(profile); profileCap = null;
          renderProfileStatus(); newSet();
          showCue('Vücut ölçümü kaydedildi — şimdi harekete başlayabilirsin', 'good');
          speaker.say('Vücut ölçümü kaydedildi', 1, 0);
        }
        requestAnimationFrame(loop);
        return;
      }
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
  // kısmi görünürlük notu: yalnızca yazılı (sesli değil)
  el.msg.textContent = [snap.message, snap.partialNote].filter(Boolean).join(' · ');
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

function startProfile() {
  profileCap = new ProfileCapture();
  showCue('Vücut ölçümü: kameraya dönük dik dur, kolların yanda, omuzların rahat', 'good');
  speaker.say('Vücut ölçümü. Kameraya dönük dik dur, kolların yanda, omuzların rahat olsun', 1, 0);
}
function renderProfileStatus() {
  const s = $('profileStatus');
  if (!s) return;
  s.textContent = profile ? `Vücut ölçümü kayıtlı (${new Date(profile.t).toLocaleDateString('tr-TR')}). Omuz silkme bu rahat duruşa göre ölçülür.` : 'Vücut ölçümü yok — kamera açılınca önce dik durup ölçüm alınacak.';
}
$('profileBtn').onclick = () => { if (running) startProfile(); else { profile = null; renderProfileStatus(); } };
renderProfileStatus();
// Ana ekrana eklenen uygulama (PWA) için hizmet çalışanı — Android uygulamasında (APK) gerekmez
if (!isNativeApp() && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// sekme/uygulama arka plandan dönünce ekran kilidini yeniden al
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && running) keepScreenOn(true); });
$('appVersion').textContent = `sürüm ${document.querySelector('meta[name="app-version"]')?.content || 'dev'}`;
applyMirror();
selectExercise(def.id);
listCameras();
window.__formAnaliz = { get pose() { return lastPose; }, get snap() { return lastSnap; }, get engine() { return engine; }, get run() { return run; }, programRep: (a, r) => programRep(a, r), endRest: () => endRest() };

// ================================================================ sekmeler
function showTab(name) {
  for (const t of ['train', 'food', 'profile']) $(`tab-${t}`).classList.toggle('hidden', t !== name);
  $('pickbar').classList.toggle('hidden', name !== 'train');
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  if (name === 'profile') refreshProfilePage();
  localStorage_set('tab', name);
  window.scrollTo(0, 0);
}
document.querySelectorAll('#tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
$('settingsBtn').onclick = () => {
  const box = $('settingsBox');
  box.classList.toggle('hidden');
  $('settingsBtn').setAttribute('aria-expanded', String(!box.classList.contains('hidden')));
};

// ================================================================ günlük program akışı
// run: { program, dayIdx, items, i (hareket), set (1..), phase: 'set'|'rest'|'done', restEnd, lastRepT, setStart, results }
let runTimer = null;
const targetOf = (it) => (it.reps ? it.reps * (it.perSide ? 2 : 1) : 0);
const needOf = (it) => Math.floor(targetOf(it) / 2) + 1; // yarısından fazlası yeterli

function startProgramDay(program, dayIdx) {
  if (run) finishProgram(false);
  const day = program.days[dayIdx];
  run = { program, dayIdx, day, items: day.items, i: 0, set: 1, phase: 'set', results: [], setStart: Date.now(), lastRepT: 0, warnedShort: 0 };
  showTab('train');
  $('progPanel').classList.remove('hidden');
  enterExercise(true);
  clearInterval(runTimer);
  runTimer = setInterval(programTick, 500);
  if (!running) el.setupTip.textContent = `${day.name} — ${day.items.length} hareket. Kamerayı başlat; ilk hareket: ${byId(day.items[0].id).tr}.`;
}

function curItem() { return run.items[run.i]; }

function enterExercise(first = false) {
  const it = curItem();
  selectExercise(it.id); // newSet() dahil
  run.set = 1; run.phase = 'set'; run.setStart = Date.now(); run.lastRepT = 0; run.warnedShort = 0;
  renderProg();
  if (!first) speaker.say(`Sıradaki hareket: ${byId(it.id).tr}`, 2, 0);
}

function renderProg() {
  if (!run) return;
  const it = curItem();
  const d = byId(it.id);
  $('progDay').textContent = `${run.day.name} · hareket ${run.i + 1}/${run.items.length}`;
  $('progEx').textContent = d.tr;
  const sets = it.minutes ? 1 : it.sets;
  $('progSets').innerHTML = Array.from({ length: sets }, (_, k) => `<span class="${k + 1 < run.set ? 'done' : k + 1 === run.set ? (run.phase === 'set' ? 'cur' : 'done') : ''}"></span>`).join('');
  let t;
  if (it.minutes) t = `Süre hedefi: ${it.minutes} dk`;
  else if (it.hold) t = `Set ${run.set}/${it.sets} · hedef ${it.hold} sn`;
  else t = `Set ${run.set}/${it.sets} · hedef ${targetOf(it)} tekrar${it.perSide ? ` (her taraf ${it.reps})` : ''} · en az ${needOf(it)} geçerli`;
  $('progTarget').textContent = t;
  $('progSetDone').textContent = it.minutes ? 'Bitir' : 'Seti bitir';
}

function programRep(accepted, rejected) {
  if (!run || run.phase !== 'set') return;
  const it = curItem();
  if (!it.reps) return;
  run.lastRepT = Date.now();
  const T = targetOf(it), need = needOf(it);
  if (accepted >= T || (accepted + rejected >= T && accepted >= need)) { completeSet(); return; }
  if (accepted + rejected >= T && accepted < need && run.warnedShort !== accepted + rejected) {
    run.warnedShort = accepted + rejected;
    showCue(`Seti tamamlamak için ${need - accepted} geçerli tekrar daha`, 'warning');
  }
}

function programHold(seconds) {
  const it = run && curItem();
  if (!it?.hold || run.phase !== 'set') return;
  if (seconds >= it.hold) completeSet();
}

function programTick() {
  if (!run) return;
  const it = curItem();
  const now = Date.now();
  if (run.phase === 'rest') {
    const left = Math.max(0, Math.ceil((run.restEnd - now) / 1000));
    $('restTime').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    if (left === 3 && !run.said3) { run.said3 = true; speaker.say('Hazırlan', 1, 0); }
    if (left <= 0) endRest();
    return;
  }
  if (run.phase !== 'set') return;
  if (it.minutes) {
    const el2 = Math.floor((now - run.setStart) / 1000);
    $('progTarget').textContent = `Süre: ${Math.floor(el2 / 60)}:${String(el2 % 60).padStart(2, '0')} / ${it.minutes}:00`;
    if (running && el2 >= it.minutes * 60) completeSet();
    return;
  }
  // yeterli geçerli tekrar yapıldı ve 12 sn yeni tekrar yok → set bitti kabul edilir
  if (it.reps && engine && engine.accepted >= needOf(it) && run.lastRepT && now - run.lastRepT > 12000) completeSet();
}

function completeSet(manual = false) {
  if (!run || run.phase !== 'set') return;
  const it = curItem();
  const seconds = it.hold ? Math.floor((engine.hold?.goodMs || 0) / 1000) : it.minutes ? Math.floor((Date.now() - run.setStart) / 1000) : null;
  const res = { exerciseId: it.id, accepted: engine.accepted, rejected: engine.rejected, target: it.reps ? targetOf(it) : it.hold || it.minutes * 60, seconds, manual };
  if (res.accepted || res.rejected || seconds) logSet({ ...res, program: { day: run.dayIdx, name: run.day.name } });
  run.results.push(res);
  const sets = it.minutes ? 1 : it.sets;
  if (run.set < sets) {
    startRest(it.rest || 60, `Sıradaki: ${byId(it.id).tr} — set ${run.set + 1}/${sets}`);
    speaker.say(`Set tamam. ${it.rest || 60} saniye dinlen`, 2, 0);
  } else if (run.i + 1 < run.items.length) {
    const nx = run.items[run.i + 1];
    startRest(Math.max(it.rest || 60, 60), `Sıradaki hareket: ${byId(nx.id).tr} (${rxText(nx)}). ${byId(nx.id).setup || ''}`, true);
    speaker.say(`Hareket tamam. Sıradaki: ${byId(nx.id).tr}`, 2, 0);
  } else {
    finishProgram(true);
  }
}

function startRest(sec, nextText, nextExercise = false) {
  run.phase = 'rest'; run.restEnd = Date.now() + sec * 1000; run.said3 = false; run.nextExercise = nextExercise;
  $('restTitle').textContent = nextExercise ? 'Hareket tamamlandı — dinlen' : `Set ${run.set} tamamlandı — dinlen`;
  $('restNext').textContent = nextText;
  $('restBox').classList.remove('hidden');
  hideCue();
  renderProg();
  programTick();
}

function endRest() {
  if (!run || run.phase !== 'rest') return;
  $('restBox').classList.add('hidden');
  if (run.nextExercise) { run.i += 1; enterExercise(); }
  else {
    run.set += 1; run.phase = 'set'; run.setStart = Date.now(); run.lastRepT = 0; run.warnedShort = 0;
    newSet();
    renderProg();
    speaker.say(`Set ${run.set}. Başla`, 2, 0);
  }
}

function skipExercise() {
  if (!run) return;
  if (run.phase === 'set' && engine && (engine.accepted || engine.rejected)) {
    const it = curItem();
    logSet({ exerciseId: it.id, accepted: engine.accepted, rejected: engine.rejected, target: targetOf(it) || null, program: { day: run.dayIdx, name: run.day.name } });
  }
  $('restBox').classList.add('hidden');
  if (run.i + 1 < run.items.length) { run.i += 1; enterExercise(); }
  else finishProgram(true);
}

function finishProgram(completed) {
  if (!run) return;
  clearInterval(runTimer);
  const r = run;
  run = null;
  $('restBox').classList.add('hidden');
  $('progPanel').classList.add('hidden');
  if (completed) {
    markDayDone(r.dayIdx);
    const ok = r.results.reduce((a, x) => a + (x.accepted || 0), 0);
    const bad = r.results.reduce((a, x) => a + (x.rejected || 0), 0);
    const exN = new Set(r.results.map((x) => x.exerciseId)).size;
    $('doneSum').innerHTML = `${r.day.name}<br>${exN} hareket · ${r.results.length} set<br>${ok} geçerli tekrar${bad ? ` · ${bad} sayılmadı` : ''}`;
    $('doneBox').classList.remove('hidden');
    speaker.say('Tebrikler, antrenman tamamlandı', 2, 0);
  }
  newSet();
}

$('progSetDone').onclick = () => completeSet(true);
$('progSkip').onclick = skipExercise;
$('progEnd').onclick = () => { if (confirm('Günlük programı bitirmek istiyor musun? Yapılan setler geçmişe kaydedildi.')) finishProgram(false); };
$('restSkip').onclick = endRest;
$('doneClose').onclick = () => { $('doneBox').classList.add('hidden'); showTab('profile'); };
window.addEventListener('pagehide', flushFreeSet);

initProfilePage({ onStartDay: startProgramDay });
showTab(localStorage_get('tab') === 'profile' ? 'profile' : 'train');
