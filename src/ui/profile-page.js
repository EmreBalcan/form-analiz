// Profil sekmesi: kullanıcı bilgileri formu, kişiye özel program, gün gün antrenman geçmişi.
import { byId } from '../exercises/catalog.js';
import { EXPERIENCE, GOALS, LEVELS, nextDayIndex } from '../program/generator.js';
import { currentProgram, loadHistory, loadUser, saveUser, setLevel } from '../program/store.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let onStart = () => {};

export function rxText(it) {
  if (it.minutes) return `${it.minutes} dk`;
  if (it.hold) return `${it.sets} × ${it.hold} sn`;
  return `${it.sets} × ${it.reps}${it.perSide ? ' (her taraf)' : ''}`;
}

export function initProfilePage({ onStartDay }) {
  onStart = onStartDay;
  $('expSelect').innerHTML = EXPERIENCE.map((e) => `<option value="${e.id}">${e.tr}</option>`).join('');
  $('goalSelect').innerHTML = `<option value="auto">Sistem önersin (bilgilerime göre)</option>`
    + Object.entries(GOALS).map(([k, g]) => `<option value="${k}">${g.tr}</option>`).join('');
  const f = $('userForm');
  const u = loadUser();
  if (u) {
    f.sex.value = u.sex; f.age.value = u.age; f.height.value = u.height; f.weight.value = u.weight;
    f.experience.value = u.experience; f.days.value = u.days || ''; f.goal.value = u.goal || 'auto'; f.equipment.value = u.equipment || 'gym';
  }
  f.onsubmit = (ev) => {
    ev.preventDefault();
    saveUser({
      sex: f.sex.value, age: +f.age.value, height: +f.height.value, weight: +f.weight.value,
      experience: f.experience.value, days: f.days.value ? +f.days.value : null, goal: f.goal.value, equipment: f.equipment.value,
    });
    $('userSaved').textContent = `Kaydedildi (${new Date().toLocaleString('tr-TR')}). Bilgilerini istediğin zaman güncelleyebilirsin.`;
    refreshProfilePage();
    $('programCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  refreshProfilePage();
}

export function refreshProfilePage() {
  renderProgram();
  renderHistory();
}

function renderProgram() {
  const box = $('programBox');
  const cur = currentProgram();
  if (!cur.user) { box.innerHTML = '<p class="muted">Bilgilerini girip kaydedince sana uygun program burada oluşur.</p>'; return; }
  const { program: p, state: st } = cur;
  const next = nextDayIndex(p, st.lastDay);
  const ev = (st.events || []).filter((e) => Date.now() - e.t < 7 * 86400000).slice(-2);
  const lvlBar = [1, 2, 3, 4, 5, 6].map((i) => `<span class="${i <= p.level ? 'on' : ''}"></span>`).join('');
  box.innerHTML = `
    ${ev.map((e) => `<div class="event">${e.type === 'up' ? '⬆️' : '⬇️'} ${esc(e.text)}</div>`).join('')}
    <div class="psum">
      <span class="chip g">${esc(GOALS[p.goal].tr)}${p.goalAuto ? ' (önerilen)' : ''}</span>
      <span class="chip">${esc(p.split)}</span>
      <span class="chip">Blok haftası ${p.week}/4${p.deload ? ' · hafif hafta' : ''}</span>
      ${p.bmi ? `<span class="chip">VKİ ${p.bmi.toFixed(1)}</span>` : ''}
    </div>
    <p class="why">${esc(p.goalWhy)}</p>
    <div class="lvl"><span>Seviye <b>${p.level}/6 · ${esc(p.levelName)}</b></span>
      <div class="lvl-bar">${lvlBar}</div>
      <button type="button" id="lvlDown" aria-label="Seviyeyi düşür" ${p.level <= 1 ? 'disabled' : ''}>−</button>
      <button type="button" id="lvlUp" aria-label="Seviyeyi artır" ${p.level >= 6 ? 'disabled' : ''}>+</button>
    </div>
    <p class="muted small">${esc(p.levelDesc)}. Düzenli antrenman yaptıkça program kendiliğinden ağırlaşır (seviye atlar). Programa uymak zorunlu değil.</p>
    <button type="button" class="primary startday" id="startNext">Bugünün antrenmanına başla — ${esc(p.days[next].name)}</button>
    ${p.days.map((d, i) => `
      <div class="day${i === next ? ' next' : ''}">
        <div class="day-head"><div><small>Gün ${i + 1}${i === next ? ' · sıradaki' : ''}</small><b>${esc(d.name)}</b></div>
          <button type="button" data-day="${i}">Başlat</button></div>
        <ol>${d.items.map((it) => `<li>${esc(byId(it.id)?.tr || it.id)} <span class="rx">— ${rxText(it)}${it.rest ? ` · ${it.rest} sn dinlenme` : ''}</span></li>`).join('')}</ol>
      </div>`).join('')}
    <ul class="notes">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}<li>Her antrenmandan önce 5 dk hafif kardiyo ve ilk harekette 1-2 hafif ısınma seti yap.</li><li>Sağlık sorunun, sakatlığın veya hamileliğin varsa programa başlamadan önce hekime danış.</li></ul>`;
  $('startNext').onclick = () => onStart(p, next);
  box.querySelectorAll('[data-day]').forEach((b) => { b.onclick = () => onStart(p, +b.dataset.day); });
  $('lvlDown').onclick = () => { setLevel(p.level - 1); renderProgram(); };
  $('lvlUp').onclick = () => { setLevel(p.level + 1); renderProgram(); };
}

const DAY_FMT = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function renderHistory() {
  const box = $('historyBox');
  const h = loadHistory();
  if (!h.length) { box.innerHTML = '<p class="muted">Henüz antrenman kaydı yok. Kamerayla yaptığın her set burada gün gün listelenir.</p>'; return; }
  const byDay = new Map();
  for (const e of h) { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); }
  const days = [...byDay.keys()].sort().reverse().slice(0, 60);
  box.innerHTML = days.map((d) => {
    const list = byDay.get(d).sort((a, b) => a.t - b.t);
    let ok = 0, bad = 0, sets = 0;
    for (const e of list) for (const s of e.sets) { ok += s.accepted || 0; bad += s.rejected || 0; sets++; }
    const prog = list.find((e) => e.program)?.program;
    const [y, m, dd] = d.split('-').map(Number);
    return `<div class="hday">
      <div class="hday-head"><span>${esc(DAY_FMT.format(new Date(y, m - 1, dd)))}</span><small>${sets} set · ${ok} geçerli${bad ? ` · ${bad} sayılmadı` : ''}</small></div>
      ${prog ? `<small class="muted">Program: ${esc(prog.name)}</small>` : ''}
      <ul>${list.map((e) => {
        const badN = e.sets.reduce((a, s) => a + (s.rejected || 0), 0);
        const sec = e.sets.reduce((a, s) => a + (s.seconds || 0), 0);
        const val = sec ? `${e.sets.length} set · ${Math.round(sec)} sn` : `${e.sets.length} set · ${e.sets.map((s) => s.accepted).join('/')} tekrar${badN ? ` (${badN} sayılmadı)` : ''}`;
        return `<li><span>${esc(byId(e.exerciseId)?.tr || e.exerciseId)}</span><span>${val}</span></li>`;
      }).join('')}</ul></div>`;
  }).join('');
}
