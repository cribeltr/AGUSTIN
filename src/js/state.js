/* Estado global + persistencia local + bus de eventos
   ============================================================
   - state: objeto único accesible
   - load / save funciones leen y escriben localStorage (formato v4 original)
   - subscribe(key, fn): notificación reactiva mínima
*/

import { uid } from './utils.js';

const STORAGE_KEY = 'mp_app_state_v1';
const DATA_KEY    = 'mp_app_data_v1';
const SYNC_KEY    = 'mp_app_sync_v1';
const PREF_KEY    = 'mp_app_prefs_v1';
const GAS_KEY     = 'mp_app_gas_v1';
const MIG_KEY     = 'mp_app_mig_v40';

export const state = {
  equipos: [],
  loaded: false,
  fileName: '',
  loadedAt: null,
  verif: null,
  eventos: {},      // { equipoKey: [evento, ...] }
  pendientes: {},   // { equipoKey: [pendiente, ...] }
  agenda: { servicios: {}, centros: [], directorio: [], empresas: [] },
  syncMarked: new Set(),
  masterMeta: null,
  prefs: { miUsuario: '', sidebarCollapsed: false }
};

/* ----- Pub/sub minimal ----- */
const listeners = new Map();
export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}
export function emit(key, payload) {
  listeners.get(key)?.forEach(fn => { try { fn(payload); } catch(e) { console.error(e); } });
  listeners.get('*')?.forEach(fn => { try { fn({ key, payload }); } catch(e) {} });
}

/* ----- Persistencia: datos del Excel (caché) ----- */
export function loadDataCache() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    state.equipos = obj.equipos || [];
    state.fileName = obj.fileName || '';
    state.loadedAt = obj.loadedAt || null;
    state.verif = obj.verif || null;
    state.loaded = state.equipos.length > 0;
    return state.loaded;
  } catch { return false; }
}
export function saveDataCache() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify({
      equipos: state.equipos,
      fileName: state.fileName,
      loadedAt: state.loadedAt,
      verif: state.verif
    }));
  } catch (err) { console.warn('saveDataCache failed', err); }
}
export function clearDataCache() {
  localStorage.removeItem(DATA_KEY);
  state.equipos = [];
  state.loaded = false;
  state.fileName = '';
  state.loadedAt = null;
  state.verif = null;
  emit('data:cleared');
}

/* ----- Persistencia: estado de usuario (eventos/pendientes/agenda) ----- */
export function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    state.eventos    = obj.eventos    || {};
    state.pendientes = obj.pendientes || {};
    state.agenda     = obj.agenda     || { servicios: {}, centros: [], directorio: [], empresas: [] };
    ensureAgendaShape();
  } catch (err) { console.warn('loadPersisted failed', err); }
}
export function savePersisted() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      eventos: state.eventos,
      pendientes: state.pendientes,
      agenda: state.agenda
    }));
    emit('state:saved');
  } catch (err) { console.warn('savePersisted failed', err); }
}

/* ----- Sync markers (ocultar discrepancias resueltas) ----- */
export function loadSyncMarked() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    state.syncMarked = new Set(raw ? JSON.parse(raw) : []);
  } catch { state.syncMarked = new Set(); }
}
export function saveSyncMarked() {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify([...state.syncMarked])); }
  catch (err) { console.warn('saveSyncMarked failed', err); }
  emit('sync:changed');
}

/* ----- Preferencias ----- */
export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) Object.assign(state.prefs, JSON.parse(raw));
  } catch {}
}
export function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(state.prefs)); }
  catch {}
}

/* ----- GAS config (backend) ----- */
export function loadGasConfig() {
  try {
    const raw = localStorage.getItem(GAS_KEY);
    return raw ? JSON.parse(raw) : { url: '', autoSync: true, status: 'off', lastSync: null };
  } catch { return { url: '', autoSync: true, status: 'off', lastSync: null }; }
}
export function saveGasConfig(cfg) {
  try { localStorage.setItem(GAS_KEY, JSON.stringify(cfg)); } catch {}
}

/* ----- Asegura forma de agenda (estructura mínima) ----- */
export function ensureAgendaShape() {
  if (!state.agenda) state.agenda = { servicios: {}, centros: [], directorio: [], empresas: [] };
  if (!state.agenda.servicios)  state.agenda.servicios  = {};
  if (!state.agenda.centros)    state.agenda.centros    = [];
  if (!state.agenda.directorio) state.agenda.directorio = [];
  if (!state.agenda.empresas)   state.agenda.empresas   = [];
  Object.keys(state.agenda.servicios).forEach(srv => {
    const s = state.agenda.servicios[srv];
    if (!s.otros) s.otros = [];
  });
}

/* ----- Wipe total ----- */
export function resetAllData() {
  [STORAGE_KEY, DATA_KEY, SYNC_KEY, PREF_KEY, MIG_KEY].forEach(k => localStorage.removeItem(k));
  state.equipos = [];
  state.eventos = {};
  state.pendientes = {};
  state.agenda = { servicios: {}, centros: [], directorio: [], empresas: [] };
  state.syncMarked = new Set();
  state.loaded = false;
  state.fileName = '';
  state.loadedAt = null;
  state.verif = null;
}

/* ----- Sets de IDs (evita choques) ----- */
export function allEventoIds() {
  const s = new Set();
  Object.values(state.eventos).forEach(arr => (arr || []).forEach(e => e.id && s.add(e.id)));
  return s;
}
export function allPendienteIds() {
  const s = new Set();
  Object.values(state.pendientes).forEach(arr => (arr || []).forEach(p => p.id && s.add(p.id)));
  return s;
}

/* ----- CRUD eventos ----- */
export function upsertEvento(key, evento) {
  if (!state.eventos[key]) state.eventos[key] = [];
  const arr = state.eventos[key];
  const idx = arr.findIndex(e => e.id === evento.id);
  if (idx >= 0) arr[idx] = evento; else arr.push(evento);
  savePersisted();
  emit('evento:changed', { key, evento });
}
export function deleteEvento(key, id) {
  const arr = state.eventos[key];
  if (!arr) return null;
  const idx = arr.findIndex(e => e.id === id);
  if (idx < 0) return null;
  const removed = arr.splice(idx, 1)[0];
  if (!arr.length) delete state.eventos[key];
  savePersisted();
  emit('evento:deleted', { key, id });
  return removed;
}
export function restoreEvento(key, evento, atIdx) {
  if (!state.eventos[key]) state.eventos[key] = [];
  if (typeof atIdx === 'number') state.eventos[key].splice(atIdx, 0, evento);
  else state.eventos[key].push(evento);
  savePersisted();
  emit('evento:restored', { key, evento });
}

/* ----- CRUD pendientes ----- */
export function upsertPendiente(key, pendiente) {
  if (!state.pendientes[key]) state.pendientes[key] = [];
  const arr = state.pendientes[key];
  const idx = arr.findIndex(p => p.id === pendiente.id);
  if (idx >= 0) arr[idx] = pendiente; else arr.push(pendiente);
  savePersisted();
  emit('pendiente:changed', { key, pendiente });
}
export function deletePendiente(key, id) {
  const arr = state.pendientes[key];
  if (!arr) return null;
  const idx = arr.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const removed = arr.splice(idx, 1)[0];
  if (!arr.length) delete state.pendientes[key];
  savePersisted();
  emit('pendiente:deleted', { key, id });
  return removed;
}
export function findPendiente(key, pid) {
  const arr = state.pendientes[key];
  if (!arr) return null;
  return arr.find(p => p.id === pid) || null;
}
export function findEvento(key, eid) {
  const arr = state.eventos[key];
  if (!arr) return null;
  return arr.find(e => e.id === eid) || null;
}

/* ----- Iteración con migración v4.0: extrae pendientes de texto legacy ----- */
export function runMigrationV4() {
  if (localStorage.getItem(MIG_KEY) === '1') return 0;
  let count = 0;
  Object.entries(state.eventos).forEach(([key, arr]) => {
    (arr || []).forEach(ev => {
      const txt = ev.observacion || '';
      const m = txt.match(/PENDIENTES?\s*:\s*([\s\S]+)$/i);
      if (!m) return;
      const lines = m[1].split(/\n+/).map(s => s.trim()).filter(Boolean);
      lines.forEach(line => {
        const desc = line.replace(/^[-•*\d.\)]+\s*/, '').trim();
        if (!desc) return;
        const pid = uid();
        if (!state.pendientes[key]) state.pendientes[key] = [];
        state.pendientes[key].push({
          id: pid,
          descripcion: desc,
          fecha: ev.fecha || '',
          fechaCompromiso: '',
          proximoRecordatorio: '',
          fechaCierre: '',
          ejecutor: ev.ejecutor || '',
          estado: 'creado',
          tareas: [],
          actualizaciones: [],
          archivos: []
        });
        count++;
      });
    });
  });
  if (count) savePersisted();
  localStorage.setItem(MIG_KEY, '1');
  return count;
}
