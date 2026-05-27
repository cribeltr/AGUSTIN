/* Entry point — bootstrap del app */

import { state, loadDataCache, loadPersisted, loadSyncMarked, loadPrefs, savePrefs, runMigrationV4, resetAllData, savePersisted, saveSyncMarked, ensureAgendaShape } from './state.js';
import { toast, showLoading, hideLoading, confirmDialog, openModal } from './ui.js';
import { renderIcons, fmtDate, fmtRelative, todayISO } from './utils.js';
import { initRouter, registerRoute, navigate, refreshActiveView } from './router.js';
import { initGas, gas, onGasStatus, getMasterMeta, fetchMaster, uploadMaster, schedulePush } from './data/gas.js';
import { loadFile, loadFromBytes, reconcileOficial } from './data/excel.js';
import { exportXLSX } from './export.js';
import { mountRecChip, toggleRecording, isRecording, tryResumeRecording, startRecording } from './recording.js';
import { renderHoy } from './views/hoy.js';
import { renderEquipos } from './views/equipos.js';
import { renderPendientes } from './views/pendientes.js';
import { renderVerificacion } from './views/verificacion.js';
import { renderAgenda } from './views/agenda.js';
import { renderHistorial } from './views/historial.js';
import { openGasSettings } from './forms/gas-settings.js';

/* ---------- Boot ---------- */
async function boot() {
  loadPrefs();
  loadSyncMarked();
  loadPersisted();
  loadDataCache();
  initGas();

  /* Migración v4.0 (extrae pendientes de observación legacy) */
  const migrated = runMigrationV4();
  if (migrated) toast({ message: `Migración: ${migrated} pendientes creados desde observaciones antiguas.`, kind: 'info', durationMs: 6000 });

  /* Registrar rutas */
  registerRoute('hoy',          renderHoy);
  registerRoute('equipos',      renderEquipos);
  registerRoute('pendientes',   renderPendientes);
  registerRoute('verificacion', renderVerificacion);
  registerRoute('agenda',       renderAgenda);
  registerRoute('historial',    renderHistorial);

  bindHeader();
  bindSidebar();
  initRouter();

  /* Grabador: chip en el header + botón. Si había sesión interrumpida, ofrecer retomar. */
  const recBtn = document.getElementById('btn-rec');
  const recHost = document.querySelector('.header-actions');
  if (recBtn && recHost) mountRecChip(recHost, recBtn);
  if (tryResumeRecording()) {
    toast({
      message: 'Había una grabación en curso interrumpida. ¿Continuar?',
      kind: 'info', durationMs: 10000,
      action: { label: 'Continuar grabando', onClick: () => startRecording() }
    });
  }

  /* Intento de restaurar maestro desde Drive si no hay datos locales */
  if (!state.loaded && gas.url) await tryRestoreMaster();

  /* Refrescar badges periódicamente */
  setInterval(updateBadges, 60_000);
  updateBadges();
  updateSyncDot();
  onGasStatus(updateSyncDot);

  renderIcons();
}

async function tryRestoreMaster() {
  try {
    const meta = await getMasterMeta();
    if (!meta || !meta.fileId) return;
    showLoading('Bajando archivo maestro desde Drive…', meta.name || '');
    const m = await fetchMaster();
    if (!m) { hideLoading(); return; }
    await loadFromBytes(m.bytes, m.name || meta.name || 'Maestro');
    hideLoading();
    toast({ message: 'Maestro restaurado desde Drive.', kind: 'ok' });
    refreshActiveView();
  } catch (err) {
    hideLoading();
    console.warn('restore master failed', err);
  }
}

/* ---------- Header & Sidebar ---------- */
function bindHeader() {
  document.getElementById('btn-upload')?.addEventListener('click', () => document.getElementById('file-input')?.click());
  document.getElementById('file-input')?.addEventListener('change', onFileChosen);
  document.getElementById('btn-menu')?.addEventListener('click', toggleMenu);
  document.getElementById('btn-sidebar')?.addEventListener('click', toggleSidebarMobile);

  document.getElementById('menu-gas')?.addEventListener('click', () => { closeMenu(); openGasSettings(); });
  document.getElementById('menu-user')?.addEventListener('click', () => { closeMenu(); openUserPref(); });
  document.getElementById('menu-export-xlsx')?.addEventListener('click', () => {
    closeMenu();
    try { exportXLSX(); toast({ message: 'Excel exportado.', kind: 'ok' }); }
    catch (err) { toast({ message: 'No se pudo exportar: ' + err.message, kind: 'danger' }); }
  });
  document.getElementById('menu-export-json')?.addEventListener('click', () => { closeMenu(); exportJSON(); });
  document.getElementById('menu-import-json')?.addEventListener('click', () => { closeMenu(); document.getElementById('import-json-input')?.click(); });
  document.getElementById('import-json-input')?.addEventListener('change', onImportJsonChosen);
  document.getElementById('menu-reset')?.addEventListener('click', async () => {
    closeMenu();
    const ok = await confirmDialog({ title: 'Eliminar TODOS los datos', message: 'Esto borra eventos, pendientes, agenda, archivo cargado y configuración. No se puede deshacer.', danger: true, confirmLabel: 'Eliminar todo' });
    if (!ok) return;
    resetAllData();
    location.reload();
  });

  document.addEventListener('click', e => {
    const menu = document.getElementById('header-menu-pop');
    if (!menu) return;
    if (!menu.contains(e.target) && e.target !== document.getElementById('btn-menu')) closeMenu();
  });
}

function bindSidebar() {
  document.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => {
      navigate(el.dataset.route);
      document.body.classList.remove('is-mobile-drawer');
      document.querySelector('.app')?.classList.remove('is-mobile-drawer');
    });
  });
  document.getElementById('sync-status')?.addEventListener('click', openGasSettings);
  document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
    state.prefs.sidebarCollapsed = !state.prefs.sidebarCollapsed;
    savePrefs();
    applySidebarCollapsed();
  });
  applySidebarCollapsed();
}

function applySidebarCollapsed() {
  document.querySelector('.app')?.classList.toggle('is-sidebar-collapsed', !!state.prefs.sidebarCollapsed);
}

function toggleSidebarMobile() {
  document.querySelector('.app')?.classList.toggle('is-mobile-drawer');
}

function toggleMenu() {
  const m = document.getElementById('header-menu-pop');
  m?.classList.toggle('hidden');
}
function closeMenu() {
  document.getElementById('header-menu-pop')?.classList.add('hidden');
}

async function onFileChosen(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    showLoading('Procesando archivo…', file.name);
    const parsed = await loadFile(file);
    /* Si hay backend, subir maestro a Drive para restaurar en otros dispositivos */
    if (gas.url) {
      try { await uploadMaster(file); }
      catch (err) { console.warn('uploadMaster failed', err); }
    }
    hideLoading();
    if (parsed.warnings.length) toast({ message: `Archivo cargado con ${parsed.warnings.length} advertencias. Revisá "Verificación".`, kind: 'warn', durationMs: 6000 });
    else toast({ message: 'Archivo cargado.', kind: 'ok' });
    /* Reconciliación: si había eventos "no oficiales" que ahora aparecen en el maestro, promoverlos */
    const rec = parsed.reconciled;
    if (rec && rec.promoted > 0) {
      toast({
        message: `${rec.promoted} ${rec.promoted === 1 ? 'evento promovido a oficial' : 'eventos promovidos a oficiales'} (aparecen en el nuevo maestro).`,
        kind: 'ok', durationMs: 7000
      });
      schedulePush();
    } else if (rec && rec.total > 0) {
      toast({ message: `${rec.total} eventos siguen como no oficiales (no aparecen aún en el maestro).`, kind: 'info', durationMs: 5000 });
    }
    refreshActiveView();
    updateBadges();
  } catch (err) {
    hideLoading();
    toast({ message: 'No se pudo cargar el archivo: ' + err.message, kind: 'danger', durationMs: 8000 });
  }
}

function openUserPref() {
  const footer = `<button class="btn cancel">Cancelar</button><button class="btn btn-primary" id="u-save">Guardar</button>`;
  const modal = openModal({
    title: 'Mi usuario',
    size: 'sm',
    body: `
      <p class="muted mb-3">Tu nombre aparece como ejecutor por defecto al crear eventos y pendientes.</p>
      <div class="field"><label class="field-label">Nombre</label><input class="input" id="u-nombre" value="${(state.prefs.miUsuario || '').replace(/"/g,'&quot;')}" /></div>
    `,
    footer
  });
  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#u-save').addEventListener('click', () => {
    state.prefs.miUsuario = modal.modalEl.querySelector('#u-nombre').value.trim();
    savePrefs();
    toast({ message: 'Guardado.', kind: 'ok' });
    modal.close();
  });
}

async function onImportJsonChosen(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  try {
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); }
    catch { toast({ message: 'El archivo no es un JSON válido.', kind: 'danger' }); return; }
    if (!data || (!data.eventos && !data.pendientes && !data.agenda)) {
      toast({ message: 'El archivo no contiene datos de Gestión MP.', kind: 'danger' });
      return;
    }
    /* Resumen previo a confirmar — para que el usuario sepa qué entra */
    const evCount = countItems(data.eventos);
    const peCount = countItems(data.pendientes);
    const srvCount = data.agenda?.servicios ? Object.keys(data.agenda.servicios).length : 0;
    const empCount = data.agenda?.empresas?.length || 0;
    const currentEv = countItems(state.eventos);
    const currentPe = countItems(state.pendientes);
    const ok = await confirmDialog({
      title: 'Importar datos JSON',
      message: `Vas a reemplazar tus datos locales con:\n• ${evCount} eventos (actual: ${currentEv})\n• ${peCount} pendientes (actual: ${currentPe})\n• ${srvCount} servicios, ${empCount} empresas en agenda\n\nEsta acción no se puede deshacer. ¿Continuar?`,
      confirmLabel: 'Importar y reemplazar', danger: true
    });
    if (!ok) return;
    /* Normalización legacy: observacion ← comentario, asegurar shape */
    normalizeImport(data);
    state.eventos = data.eventos || {};
    state.pendientes = data.pendientes || {};
    state.agenda = data.agenda || { servicios:{}, centros:[], directorio:[], empresas:[] };
    ensureAgendaShape();
    if (Array.isArray(data.syncMarked)) {
      state.syncMarked = new Set(data.syncMarked);
      saveSyncMarked();
    }
    savePersisted();
    toast({ message: `Datos importados: ${evCount} eventos, ${peCount} pendientes.`, kind: 'ok', durationMs: 6000 });
    /* Si hay equipos cargados (Excel ya leído), correr reconciliación para
       detectar eventos que ya aparecen en el maestro actual y promoverlos. */
    if (state.loaded) {
      const r = reconcileOficial();
      if (r.promoted) toast({ message: `${r.promoted} eventos promovidos a oficiales tras importar.`, kind: 'ok' });
    }
    setTimeout(() => location.reload(), 800);
  } catch (err) {
    toast({ message: 'Error al importar: ' + err.message, kind: 'danger', durationMs: 8000 });
  }
}

function countItems(byKey) {
  if (!byKey) return 0;
  return Object.values(byKey).reduce((n, arr) => n + (arr?.length || 0), 0);
}

function normalizeImport(data) {
  /* Eventos: legacy "comentario" → "observacion"; defaults defensivos */
  Object.values(data.eventos || {}).forEach(arr => {
    (arr || []).forEach(ev => {
      if (!ev.observacion && ev.comentario) ev.observacion = ev.comentario;
      if (!ev.archivos) ev.archivos = [];
      if (!ev.creadoEn && ev.fecha) ev.creadoEn = ev.fecha;
      /* Eventos legacy sin campo `oficial` quedan como oficiales (true por omisión) */
    });
  });
  /* Pendientes: defaults */
  Object.values(data.pendientes || {}).forEach(arr => {
    (arr || []).forEach(p => {
      if (!p.tareas) p.tareas = [];
      if (!p.actualizaciones) p.actualizaciones = [];
      if (!p.archivos) p.archivos = [];
      if (!p.estado) p.estado = 'abierto';
    });
  });
}

function exportJSON() {
  const blob = new Blob([JSON.stringify({
    eventos: state.eventos,
    pendientes: state.pendientes,
    agenda: state.agenda,
    syncMarked: [...state.syncMarked],
    exportedAt: new Date().toISOString()
  }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gestion_mp_${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Badges ---------- */
function updateBadges() {
  const today = todayISO();
  let vencidos = 0, abiertos = 0;
  Object.values(state.pendientes).forEach(arr => (arr||[]).forEach(p => {
    if (p.estado === 'cerrado') return;
    abiertos++;
    const due = p.fechaCompromiso || p.proximoRecordatorio;
    if (due && due < today) vencidos++;
  }));
  setBadge('badge-hoy', vencidos, 'is-danger');
  setBadge('badge-pendientes', abiertos, 'is-warn');
}

function setBadge(id, n, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n;
  el.classList.toggle('is-zero', n === 0);
  if (cls) { el.classList.remove('is-danger','is-warn','is-info'); el.classList.add(cls); }
}

function updateSyncDot() {
  const dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.className = 'dot';
  if (gas.status === 'ok') dot.classList.add('dot-ok');
  else if (gas.status === 'error') dot.classList.add('dot-danger');
  else if (gas.status === 'syncing') dot.classList.add('dot-info', 'dot-pulse');
  else if (gas.status === 'pending') dot.classList.add('dot-warn');
  const lbl = document.getElementById('sync-label');
  if (lbl) {
    if (!gas.url) lbl.textContent = 'Sin backend';
    else if (gas.status === 'ok' && gas.lastSync) lbl.textContent = 'Sincronizado ' + fmtRelative(gas.lastSync.slice(0,10));
    else if (gas.status === 'syncing') lbl.textContent = 'Sincronizando…';
    else if (gas.status === 'error') lbl.textContent = 'Error de sync';
    else if (gas.status === 'pending') lbl.textContent = 'Esperando sync';
    else lbl.textContent = 'Sin sync';
  }
}

document.addEventListener('DOMContentLoaded', boot);
