/* Grabador de sesión.
   Captura: cambios de ruta/vista, clicks, submits de formulario, cambios de input,
   teclas accionables (Esc, Enter, Ctrl+S, Ctrl+F), aperturas/cierres de modal,
   toasts emitidos, errores en consola.
   Persistencia: en memoria mientras graba; al parar, descarga JSON.
   Estado: indicador visible (dot rojo pulsando + contador) en el header.
*/

import { toast } from './ui.js';
import { todayISO } from './utils.js';

const STORAGE_KEY = 'mp_app_rec_v1';

const recState = {
  active: false,
  startedAt: null,
  events: [],
  view: null,
  listeners: [],
  metaPrev: null
};

/* Devuelve la sección visible/actual */
function currentView() {
  const h = (location.hash || '#hoy').slice(1);
  return h.split('?')[0] || 'hoy';
}

/* Resumen de un elemento clicable (sin volcar HTML entero) */
function describe(el) {
  if (!el) return null;
  const out = { tag: el.tagName?.toLowerCase() || '' };
  if (el.id) out.id = el.id;
  if (el.name) out.name = el.name;
  if (el.dataset && Object.keys(el.dataset).length) out.data = { ...el.dataset };
  const role = el.getAttribute && el.getAttribute('role');
  if (role) out.role = role;
  const aria = el.getAttribute && el.getAttribute('aria-label');
  if (aria) out.ariaLabel = aria;
  /* Texto truncado: el textContent del botón es lo que el usuario lee */
  const txt = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  if (txt && txt.length <= 80) out.text = txt;
  else if (txt) out.text = txt.slice(0, 77) + '…';
  /* Breadcrumb de ancestros con id o data-route */
  const path = [];
  let cur = el.parentElement;
  while (cur && path.length < 6) {
    const sig = cur.id ? '#' + cur.id : (cur.dataset?.route ? '[route=' + cur.dataset.route + ']' : (cur.tagName?.toLowerCase() || ''));
    if (sig) path.push(sig);
    cur = cur.parentElement;
  }
  if (path.length) out.path = path.reverse().join(' › ');
  return out;
}

function push(kind, payload) {
  if (!recState.active) return;
  recState.events.push({
    t: Date.now() - recState.startedAt,
    view: currentView(),
    kind,
    ...payload
  });
  updateChip();
  /* Persiste a localStorage cada 5 eventos para no perder ante un reload accidental */
  if (recState.events.length % 5 === 0) flush();
}

function flush() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      active: recState.active,
      startedAt: recState.startedAt,
      events: recState.events.slice(-2000)   // mantén las últimas 2000 (cubre sesiones largas sin reventar storage)
    }));
  } catch(_){ /* storage lleno: silencioso */ }
}

/* ---------- Event handlers ---------- */
function onClick(e) {
  const t = e.target.closest('button, a, [data-route], [data-tab], [data-edit-ev], [data-edit-pe], [data-pend-from-ev], [data-marker], .nav-item, .tab, .list-item, .equipo-row, .equipo-card');
  if (!t) return;
  push('click', { target: describe(t), button: e.button, ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
}

function onChange(e) {
  const t = e.target;
  if (!t || !t.tagName) return;
  if (t.type === 'file' || t.type === 'password') return; /* nunca capturar files o passwords */
  const tag = t.tagName.toLowerCase();
  if (!['input', 'select', 'textarea'].includes(tag)) return;
  const desc = describe(t);
  /* Valor truncado, sólo si no es campo sensible aparente */
  const looksSensitive = /pass|token|secret|key|email/i.test((t.id || '') + ' ' + (t.name || ''));
  const value = looksSensitive ? '[oculto]' : String(t.value || '').slice(0, 120);
  push('change', { target: desc, value, kind: t.type || tag });
}

function onSubmit(e) {
  const f = e.target;
  if (!f || f.tagName?.toLowerCase() !== 'form') return;
  push('submit', { target: describe(f) });
}

function onKey(e) {
  /* Sólo teclas accionables */
  const interesting = e.key === 'Escape' || e.key === 'Enter' ||
                      (e.ctrlKey && (e.key === 's' || e.key === 'k' || e.key === 'f')) ||
                      (e.metaKey && (e.key === 's' || e.key === 'k' || e.key === 'f'));
  if (!interesting) return;
  push('key', { key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, alt: e.altKey });
}

function onHashChange() {
  const v = currentView();
  push('navigate', { to: v, hash: location.hash });
  recState.view = v;
}

/* Captura errores de runtime mientras grabamos */
function onError(e) {
  push('error', { message: e.message, source: e.filename, line: e.lineno });
}

/* ---------- Public API ---------- */
export function isRecording() { return recState.active; }

export function startRecording() {
  if (recState.active) return;
  recState.active = true;
  recState.startedAt = Date.now();
  recState.events = [];
  recState.view = currentView();
  push('start', { url: location.href, userAgent: navigator.userAgent, viewport: { w: innerWidth, h: innerHeight } });
  /* Bind listeners en bubble phase */
  document.addEventListener('click', onClick, true);
  document.addEventListener('change', onChange, true);
  document.addEventListener('submit', onSubmit, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('error', onError);
  recState.listeners = [
    ['click', onClick, true], ['change', onChange, true], ['submit', onSubmit, true], ['keydown', onKey, true],
    ['hashchange', onHashChange, false], ['error', onError, false]
  ];
  flush();
  updateChip();
  toast({ message: '🔴 Grabando sesión — todos tus clicks y navegación quedan en el log.', kind: 'info', durationMs: 5000 });
}

export function stopRecording() {
  if (!recState.active) return null;
  push('stop', {});
  recState.active = false;
  /* Unbind */
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('change', onChange, true);
  document.removeEventListener('submit', onSubmit, true);
  document.removeEventListener('keydown', onKey, true);
  window.removeEventListener('hashchange', onHashChange);
  window.removeEventListener('error', onError);
  recState.listeners = [];

  const payload = {
    version: 1,
    recordedAt: new Date(recState.startedAt).toISOString(),
    durationMs: Date.now() - recState.startedAt,
    eventsCount: recState.events.length,
    events: recState.events
  };
  /* Descarga JSON */
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mp_session_${todayISO()}_${new Date().getTime()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  /* Limpieza */
  localStorage.removeItem(STORAGE_KEY);
  updateChip();
  toast({
    message: `Sesión guardada: ${payload.eventsCount} eventos en ${Math.round(payload.durationMs/1000)} s.`,
    kind: 'ok', durationMs: 6000
  });
  return payload;
}

export function toggleRecording() {
  if (recState.active) stopRecording();
  else startRecording();
}

/* ---------- Chip indicador en el header ---------- */
export function mountRecChip(hostEl, buttonEl) {
  if (!hostEl) return;
  if (!hostEl.querySelector('.rec-chip')) {
    const chip = document.createElement('span');
    chip.className = 'rec-chip';
    chip.innerHTML = `<span class="dot dot-danger dot-pulse"></span><span class="rec-chip-label">REC</span><span class="rec-chip-count">0</span>`;
    hostEl.appendChild(chip);
  }
  if (buttonEl && !buttonEl.dataset.recBound) {
    buttonEl.dataset.recBound = '1';
    buttonEl.addEventListener('click', toggleRecording);
  }
  updateChip();
}

function updateChip() {
  const chip = document.querySelector('.rec-chip');
  if (!chip) return;
  if (recState.active) {
    chip.classList.add('is-active');
    const cnt = chip.querySelector('.rec-chip-count');
    if (cnt) cnt.textContent = String(recState.events.length);
  } else {
    chip.classList.remove('is-active');
  }
  /* Actualizar el botón */
  const btn = document.getElementById('btn-rec');
  if (btn) {
    btn.title = recState.active ? 'Detener grabación y descargar JSON' : 'Grabar sesión (clicks, navegación, formularios)';
    btn.setAttribute('aria-pressed', recState.active ? 'true' : 'false');
    btn.classList.toggle('is-active', recState.active);
  }
}

/* Recupera grabación interrumpida (si se cargó la página con el flag activo) */
export function tryResumeRecording() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    if (!saved.active) { localStorage.removeItem(STORAGE_KEY); return false; }
    /* Restaurar y seguir grabando */
    recState.startedAt = saved.startedAt || Date.now();
    recState.events = saved.events || [];
    /* No re-arrancamos automáticamente — preguntamos al usuario */
    return true;
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

/* Para depuración rápida desde consola */
if (typeof window !== 'undefined') {
  window.__mpRec = { start: startRecording, stop: stopRecording, state: recState };
}
