/* Sincronización con backend Google Apps Script.
   Acciones soportadas (ver Code.gs original):
     - replaceAll, upsertContacto, upsertCR, deleteCR
     - markSynced, unmarkAllSynced
     - uploadFile, deleteFile
     - uploadMaster, getMaster, getMasterMeta, ping
*/

import { state, saveGasConfig, loadGasConfig, savePersisted, ensureAgendaShape } from '../state.js';
import { debounce, bytesToBase64, base64ToBytes } from '../utils.js';

export const gas = {
  url: '',
  autoSync: true,
  status: 'off',       // off | ok | syncing | error | pending
  lastSync: null,
  lastError: null,
  masterMeta: null,
  _statusListeners: new Set()
};

export function onGasStatus(fn) { gas._statusListeners.add(fn); return () => gas._statusListeners.delete(fn); }
function setStatus(s, err = null) {
  gas.status = s;
  gas.lastError = err;
  gas._statusListeners.forEach(fn => { try { fn(s, err); } catch(_){} });
}

export function initGas() {
  const cfg = loadGasConfig();
  gas.url = cfg.url || '';
  gas.autoSync = cfg.autoSync !== false;
  gas.lastSync = cfg.lastSync || null;
  setStatus(gas.url ? 'pending' : 'off');
}

export function configureGas({ url, autoSync }) {
  if (typeof url === 'string') gas.url = url.trim();
  if (typeof autoSync === 'boolean') gas.autoSync = autoSync;
  saveGasConfig({ url: gas.url, autoSync: gas.autoSync, lastSync: gas.lastSync });
  setStatus(gas.url ? 'pending' : 'off');
}

async function gasRequest(body) {
  if (!gas.url) throw new Error('Backend no configurado');
  const res = await fetch(gas.url, {
    method: 'POST',
    /* IMPORTANTE: text/plain evita preflight CORS (GAS no envía cabeceras CORS) */
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Respuesta inválida del backend'); }
  if (data && data.ok === false) throw new Error(data.error || 'Error backend');
  return data;
}

export async function pingGas(url) {
  const prev = gas.url;
  gas.url = url || gas.url;
  try {
    const r = await gasRequest({ action: 'ping' });
    gas.url = prev || gas.url;
    return r.result || r;
  } catch (err) {
    gas.url = prev;
    throw err;
  }
}

/* Construye lookup: { 'inv:XXX': { nInv, equipo, servicio, fam, marca, modelo, serie, ... } } */
function buildEquiposLookup() {
  const out = {};
  state.equipos.forEach(eq => {
    if (!eq.key || eq.empty) return;
    out[eq.key] = {
      nInv: eq.inv || ('ID-' + eq.id),
      equipo: eq.equipo,
      servicio: eq.servicio,
      fam: eq.fam,
      marca: eq.marca,
      modelo: eq.modelo,
      serie: eq.serie
    };
  });
  return out;
}

/* Push completo de eventos/pendientes/agenda/syncMarked al backend */
export async function pushAll() {
  if (!gas.url) return null;
  setStatus('syncing');
  try {
    const payload = {
      eventos: state.eventos,
      pendientes: state.pendientes,
      agenda: state.agenda,
      syncMarked: [...state.syncMarked],
      equiposLookup: buildEquiposLookup()
    };
    const r = await gasRequest({ action: 'replaceAll', payload });
    gas.lastSync = new Date().toISOString();
    saveGasConfig({ url: gas.url, autoSync: gas.autoSync, lastSync: gas.lastSync });
    setStatus('ok');
    return r.result;
  } catch (err) {
    setStatus('error', err.message);
    throw err;
  }
}

export const pushAllDebounced = debounce(() => pushAll().catch(err => console.warn('push fail', err)), 1500);

export function schedulePush() {
  if (!gas.url || !gas.autoSync) return;
  setStatus('pending');
  pushAllDebounced();
}

/* Pull: descarga estado completo del backend (replace local) */
export async function pullAll() {
  if (!gas.url) return null;
  setStatus('syncing');
  try {
    const res = await fetch(gas.url + '?action=read');
    const data = await res.json();
    state.eventos    = data.eventos    || {};
    state.pendientes = data.pendientes || {};
    state.agenda     = data.agenda     || { servicios: {}, centros: [], directorio: [], empresas: [] };
    ensureAgendaShape();
    state.syncMarked = new Set(data.syncMarked || []);
    savePersisted();
    gas.lastSync = new Date().toISOString();
    saveGasConfig({ url: gas.url, autoSync: gas.autoSync, lastSync: gas.lastSync });
    setStatus('ok');
    return data;
  } catch (err) {
    setStatus('error', err.message);
    throw err;
  }
}

/* Adjuntos */
export async function uploadFile(inv, prefix, file) {
  if (!gas.url) throw new Error('Backend requerido para adjuntos');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = bytesToBase64(bytes);
  const r = await gasRequest({
    action: 'uploadFile',
    payload: { inv, prefix, name: file.name, mime: file.type || 'application/octet-stream', base64 }
  });
  return r.result;
}
export async function deleteFile(id) {
  if (!gas.url) throw new Error('Backend requerido');
  return (await gasRequest({ action: 'deleteFile', payload: { id } })).result;
}

/* Maestro */
export async function uploadMaster(file) {
  if (!gas.url) throw new Error('Backend requerido');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = bytesToBase64(bytes);
  const r = await gasRequest({
    action: 'uploadMaster',
    payload: { name: file.name, mime: file.type, base64 }
  });
  return r.result;
}

export async function getMasterMeta() {
  if (!gas.url) return null;
  try {
    const res = await fetch(gas.url + '?action=getMasterMeta');
    const data = await res.json();
    if (data && data.ok) {
      gas.masterMeta = data.result;
      return data.result;
    }
  } catch(_){ }
  return null;
}

export async function fetchMaster() {
  if (!gas.url) return null;
  const res = await fetch(gas.url + '?action=getMaster');
  const data = await res.json();
  const obj = data.result || data;
  if (!obj || !obj.hasMaster) return null;
  if (obj.error) throw new Error(obj.error);
  return { name: obj.name, mime: obj.mime, bytes: base64ToBytes(obj.base64), uploadedAt: obj.uploadedAt };
}
