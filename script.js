/* ===== Datos de ejemplo ===== */
const MATS = { vidrio: 'Vidrio', carton: 'Cartón', aluminio: 'Aluminio', pet: 'Plástico PET' };
const COUPONS = [
  { id: 1, partner: 'KFC', title: '30% de descuento', mat: 'vidrio', kg: 5 },
  { id: 2, partner: 'McDonald\'s', title: '20% de descuento', mat: 'carton', kg: 3 },
  { id: 3, partner: 'Pestañas', title: '1 servicio gratis', mat: 'vidrio', kg: 5 },
  { id: 4, partner: 'Barbería', title: '1 corte de pelo gratis', mat: 'carton', kg: 3 },
  { id: 5, partner: 'Teknologik', title: '50% en mantención de PC', mat: 'vidrio', kg: 5 },
  { id: 6, partner: 'Café del Cerro', title: 'Café + kuchen gratis', mat: 'aluminio', kg: 2 },
];

/* ===== Almacenamiento (localStorage, solo prototipo) ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get users() { return JSON.parse(localStorage.getItem('ciclo_users') || '{}'); },
  set users(v) { localStorage.setItem('ciclo_users', JSON.stringify(v)); },
  get session() { return localStorage.getItem('ciclo_session'); },
  set session(v) { v ? localStorage.setItem('ciclo_session', v) : localStorage.removeItem('ciclo_session'); },
};
const me = () => store.users[store.session];
const save = u => { const all = store.users; all[u.email] = u; store.users = all; };
const fmt = n => String(+n.toFixed(1)).replace('.', ',');
const newId = () => {
  const ids = Object.values(store.users).map(u => u.id);
  let id; do { id = 'CIC-' + (10000 + Math.floor(Math.random() * 90000)); } while (ids.includes(id));
  return id;
};
const findById = id => Object.values(store.users).find(u => u.id === id.trim().toUpperCase());
const today = () => new Date().toLocaleDateString('es-CL');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2500);
}

/* ===== Navegación ===== */
function screen(id) {
  $$('.screen').forEach(s => s.hidden = s.id !== id);
  window.scrollTo(0, 0);
}
function auth(mode) {
  screen('auth');
  $('#loginForm').hidden = mode !== 'login';
  $('#registerForm').hidden = mode !== 'register';
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.auth === mode));
  $$('.error').forEach(e => e.textContent = '');
}
function go(view) {
  $$('[data-view]').forEach(v => v.hidden = v.dataset.view !== view);
  $$('.menu button').forEach(b => b.classList.toggle('on', b.dataset.go === view));
  window.scrollTo(0, 0);
}
function enterApp() {
  screen('app'); renderAll(); go('resumen');
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-auth]'); if (a) return auth(a.dataset.auth);
  const s = e.target.closest('[data-screen]'); if (s) { e.preventDefault(); return screen(s.dataset.screen); }
  if (e.target.closest('[data-staff]')) { e.preventDefault(); return screen('staff'); }
  const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
});

/* ===== Registro / login ===== */
$('#registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const err = $('.error', e.target);
  f.email = f.email.trim().toLowerCase();
  if (!f.name.trim() || !f.email.includes('@')) return err.textContent = 'Revisa tu nombre y tu correo.';
  if (f.password.length < 6) return err.textContent = 'La contraseña necesita al menos 6 caracteres.';
  if (store.users[f.email]) return err.textContent = 'Ese correo ya tiene una cuenta. Prueba ingresando.';
  save({ ...f, id: newId(), name: f.name.trim(), address: '', joined: today(),
    kg: { vidrio: 0, carton: 0, aluminio: 0, pet: 0 }, total: 0, history: [], coupons: [], pickups: [] });
  store.session = f.email; e.target.reset(); enterApp();
});

$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const u = store.users[f.email.trim().toLowerCase()];
  if (!u || u.password !== f.password) return $('.error', e.target).textContent = 'Correo o contraseña incorrectos.';
  store.session = u.email; e.target.reset(); enterApp();
});

$('#logout').addEventListener('click', () => { store.session = null; screen('landing'); });

/* ===== Render del panel ===== */
function couponCard(c, u) {
  const have = u ? u.kg[c.mat] : 0, ok = have >= c.kg;
  return `<article class="coupon ${ok ? 'ok' : ''}">
    <div><p class="partner">${c.partner}</p><h3>${c.title}</h3></div>
    <p class="need">${c.kg} kg de ${MATS[c.mat].toLowerCase()}${u && !ok ? ` · te faltan ${fmt(c.kg - have)} kg` : ''}</p>
    ${u ? `<button class="btn" data-redeem="${c.id}" ${ok ? '' : 'disabled'}>${ok ? 'Canjear' : 'Aún no alcanza'}</button>` : ''}
  </article>`;
}

function renderAll() {
  const u = me(); if (!u) return;
  const avail = COUPONS.filter(c => u.kg[c.mat] >= c.kg).length;
  $('#hello').textContent = `Hola, ${u.name.split(' ')[0]}`;
  $('#myId').textContent = u.id;
  $('#sTotal').textContent = fmt(u.total) + ' kg';
  $('#sAvail').textContent = avail;
  $('#sUsed').textContent = u.coupons.length;

  $('#balances').innerHTML = Object.entries(MATS).map(([k, n]) => {
    const goal = Math.max(...COUPONS.filter(c => c.mat === k).map(c => c.kg), 5);
    return `<div class="bal"><span>${n}</span><div class="bar"><i style="width:${Math.min(100, u.kg[k] / goal * 100)}%"></i></div><b>${fmt(u.kg[k])} kg</b></div>`;
  }).join('');

  const hist = $('#history'); hist.dataset.empty = 'Todavía no tienes movimientos. Aparecerán aquí cuando registremos tus entregas.';
  hist.innerHTML = u.history.slice(0, 6).map(h => `<li><div>${h.text}<small>${h.date}</small></div><b>${h.kg ? '+' + fmt(h.kg) + ' kg' : ''}</b></li>`).join('');

  $('#coupons').innerHTML = COUPONS.map(c => couponCard(c, u)).join('');
  const mc = $('#myCoupons'); mc.dataset.empty = 'Aún no has canjeado cupones.';
  mc.innerHTML = u.coupons.map(c => `<li><div>${c.partner} · ${c.title}<small>${c.date}</small></div><b>${c.code}</b></li>`).join('');

  const pk = $('#pickups'); pk.dataset.empty = 'No tienes solicitudes de retiro.';
  pk.innerHTML = u.pickups.map(p => `<li><div>${p.kg} kg de ${MATS[p.mat].toLowerCase()}<small>${p.address} · ${p.date}</small></div>${p.status === 'Retirado' ? '<span class="pill done">Retirado</span>' : '<span class="pill">Pendiente</span>'}</li>`).join('');

  $('#avatar').textContent = u.name[0].toUpperCase();
  $('#pName').textContent = u.name; $('#pMail').textContent = u.email;
  $('#pView').innerHTML = `<dl class="kv">
    <dt>ID de usuario</dt><dd>${u.id}</dd>
    <dt>Teléfono</dt><dd>${u.phone || 'Sin agregar'}</dd>
    <dt>Comuna</dt><dd>${u.comuna || 'Sin agregar'}</dd>
    <dt>Dirección</dt><dd>${u.address || 'Sin agregar'}</dd>
    <dt>Miembro desde</dt><dd>${u.joined}</dd></dl>`;
}

/* selects de material */
$$('select[name=mat]').forEach(s => s.innerHTML = Object.entries(MATS).map(([k, n]) => `<option value="${k}">${n}</option>`).join(''));

/* ===== Acciones ===== */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-redeem]'); if (!b) return;
  const u = me(), c = COUPONS.find(x => x.id == b.dataset.redeem);
  if (u.kg[c.mat] < c.kg) return;
  u.kg[c.mat] -= c.kg;
  const code = 'CIC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  u.coupons.unshift({ partner: c.partner, title: c.title, code, date: today() });
  u.history.unshift({ text: `Canje: ${c.partner}, ${c.title}`, kg: 0, date: today() });
  save(u); renderAll(); toast(`Cupón canjeado. Tu código es ${code}`);
});

$('#pickupForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = me(), f = Object.fromEntries(new FormData(e.target)), err = $('.error', e.target);
  if (+f.kg < 10) return err.textContent = 'El retiro es desde 10 kg.';
  err.textContent = '';
  u.pickups.unshift({ ...f, kg: +f.kg, pid: Date.now(), status: 'Pendiente' });
  save(u); e.target.reset(); renderAll(); toast('Solicitud enviada');
});

const pf = $('#profileForm');
$('#editBtn').addEventListener('click', () => {
  const u = me();
  ['name', 'phone', 'comuna', 'address'].forEach(k => pf.elements[k].value = u[k] || '');
  pf.hidden = false; $('#pView').hidden = true;
});
const closeEdit = () => { pf.hidden = true; $('#pView').hidden = false; };
$('#cancelEdit').addEventListener('click', closeEdit);
pf.addEventListener('submit', e => {
  e.preventDefault();
  const u = me(); Object.assign(u, Object.fromEntries(new FormData(pf)));
  save(u); closeEdit(); renderAll(); toast('Cambios guardados');
});

/* ===== Panel del equipo (PIN de prueba: 1234) ===== */
const STAFF_PIN = '1234';
function renderStaff() {
  const rows = [];
  Object.values(store.users).forEach(u => (u.pickups || []).forEach(p => {
    if (p.status !== 'Retirado') rows.push(`<li><div>${u.name} · ${u.id}<small>${p.kg} kg de ${MATS[p.mat].toLowerCase()} · ${p.address} · ${p.date}</small></div><button class="btn" data-done="${u.email}|${p.pid}">Retirado</button></li>`);
  }));
  const l = $('#staffPickups'); l.dataset.empty = 'No hay retiros pendientes.'; l.innerHTML = rows.join('');
}
$('#pinForm').addEventListener('submit', e => {
  e.preventDefault();
  if (new FormData(e.target).get('pin') !== STAFF_PIN) return $('.error', e.target).textContent = 'PIN incorrecto.';
  e.target.reset(); $('.error', e.target).textContent = '';
  e.target.hidden = true; $('#staffPanel').hidden = false; renderStaff();
});
$('#staffExit').addEventListener('click', () => {
  $('#pinForm').hidden = false; $('#staffPanel').hidden = true; screen('landing');
});
$('#staffForm').elements.id.addEventListener('input', e => {
  const u = findById(e.target.value);
  $('#staffUser').textContent = !e.target.value.trim() ? '' : u ? `Usuario: ${u.name}` : 'No encontramos ese ID.';
});
$('#staffForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target)), err = $('.error', e.target), kg = parseFloat(f.kg);
  const u = findById(f.id);
  if (!u) return err.textContent = 'No existe un usuario con ese ID. Revisa que esté bien escrito.';
  if (!(kg > 0)) return err.textContent = 'Ingresa los kilos recibidos.';
  err.textContent = '';
  u.kg[f.mat] += kg; u.total += kg;
  u.history.unshift({ text: `Entrega de ${MATS[f.mat].toLowerCase()}`, kg, date: today() });
  save(u); e.target.reset(); $('#staffUser').textContent = '';
  const n = COUPONS.filter(c => u.kg[c.mat] >= c.kg).length;
  toast(`Listo: ${fmt(kg)} kg para ${u.name}. Tiene ${n} cupón(es) disponible(s).`);
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-done]'); if (!b) return;
  const [email, pid] = b.dataset.done.split('|');
  const u = store.users[email], p = u.pickups.find(x => String(x.pid) === pid);
  const kg = parseFloat(prompt('¿Cuántos kilos se retiraron realmente?', p.kg));
  if (!(kg > 0)) return;
  p.status = 'Retirado'; u.kg[p.mat] += kg; u.total += kg;
  u.history.unshift({ text: `Retiro a domicilio de ${MATS[p.mat].toLowerCase()}`, kg, date: today() });
  save(u); renderStaff(); toast(`Retiro registrado: ${fmt(kg)} kg para ${u.name}`);
});

/* ===== Inicio ===== */
// usuarios creados antes de existir los ID
(() => {
  const all = store.users, ids = Object.values(all).map(u => u.id).filter(Boolean);
  Object.values(all).forEach(u => {
    if (!u.id) { let id; do { id = 'CIC-' + (10000 + Math.floor(Math.random() * 90000)); } while (ids.includes(id)); u.id = id; ids.push(id); }
    (u.pickups || []).forEach((p, i) => { p.pid = p.pid || Date.now() + i; p.status = p.status || 'Pendiente'; });
  });
  store.users = all;
})();
$('#landingCoupons').innerHTML = COUPONS.slice(0, 4).map(c => couponCard(c, null)).join('');
/* ===== Demo animada del hero ===== */
const DEMOS = [
  { mat: 'Vidrio', kg: 5, title: '30% de descuento', partner: 'en tu comida favorita' },
  { mat: 'Cartón', kg: 3, title: '1 corte de pelo gratis', partner: 'en una barbería local' },
];
function heroDemo() {
  const kg = $('#heroKg'); if (!kg) return;
  const card = $('#heroCoupon'), state = $('#heroState'), bar = $('#heroBar');
  let i = 0;
  const show = d => { $('#heroMat').textContent = d.mat; $('#heroTitle').textContent = d.title; $('#heroPartner').textContent = d.partner; };

  // si la persona prefiere sin movimiento, se muestra el estado final fijo
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    show(DEMOS[0]); kg.textContent = DEMOS[0].kg; bar.style.width = '100%';
    card.classList.add('on'); state.textContent = 'Desbloqueado'; return;
  }

  (function run() {
    const d = DEMOS[i++ % DEMOS.length], steps = d.kg * 2; let n = 0;
    show(d); card.classList.remove('on'); state.textContent = 'Bloqueado';
    kg.textContent = '0'; bar.style.width = '0';
    const t = setInterval(() => {
      n++; kg.textContent = fmt(n / 2); bar.style.width = (n / steps * 100) + '%';
      if (n >= steps) {
        clearInterval(t); card.classList.add('on'); state.textContent = 'Desbloqueado';
        setTimeout(run, 3000);
      }
    }, 450);
  })();
}
heroDemo();
store.session && me() ? enterApp() : screen('landing');