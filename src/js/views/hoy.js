/* Vista: Hoy — dashboard de pendientes por urgencia */

import { state, savePersisted } from '../state.js';
import { escapeHtml, todayISO, addDaysISO, diffDays, val, fmtDate, fmtRelative, renderIcons } from '../utils.js';
import { emptyState, toast } from '../ui.js';
import { openEquipoDetail } from '../forms/equipo-detail.js';
import { openPendienteForm } from '../forms/pendiente.js';
import { schedulePush } from '../data/gas.js';
import { navigate } from '../router.js';

function flattenPendientes() {
  const out = [];
  Object.entries(state.pendientes).forEach(([key, arr]) => {
    (arr || []).forEach(p => out.push({ key, p }));
  });
  return out;
}

function pendientesEnPeriodo(periodo) {
  const today = todayISO();
  const t = new Date(today + 'T00:00:00').getTime();
  const ms = 86400000;
  const all = flattenPendientes();
  return all.filter(({ p }) => {
    if (p.estado === 'cerrado') return false;
    const due = p.fechaCompromiso || p.proximoRecordatorio || p.fecha;
    if (!due) return false;
    const d = (new Date(due + 'T00:00:00').getTime() - t) / ms;
    if (periodo === 'vencido') return d < 0;
    if (periodo === 'hoy')     return d === 0;
    if (periodo === '7')       return d > 0 && d <= 7;
    if (periodo === '30')      return d > 7 && d <= 30;
    return false;
  });
}

export function renderHoy(root) {
  const today = todayISO();
  const todosAbiertos = flattenPendientes().filter(({ p }) => p.estado !== 'cerrado');
  const vencidos = pendientesEnPeriodo('vencido');
  const hoy      = pendientesEnPeriodo('hoy');
  const prox7    = pendientesEnPeriodo('7');
  const prox30   = pendientesEnPeriodo('30');

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>Hoy · ${fmtDate(today)}</h2>
        <p class="muted">${todosAbiertos.length} pendientes abiertos · ${state.equipos.length} equipos</p>
      </div>
      <div class="row">
        <button class="btn btn-primary" id="btn-new-pend"><i data-lucide="plus"></i> Nuevo pendiente</button>
      </div>
    </div>

    <div class="grid grid-3 mb-4">
      ${kpi('Vencidos',      vencidos.length, 'danger', 'alert-octagon')}
      ${kpi('Para hoy',      hoy.length,      'warn',   'calendar-clock')}
      ${kpi('Próximos 7 d',  prox7.length,    'info',   'calendar-days')}
    </div>

    ${section('Vencidos',  vencidos,  'danger',  'alert-octagon', today, true)}
    ${section('Para hoy',  hoy,       'warn',    'calendar-clock',today, true)}
    ${section('Próximos 7 días',  prox7,  'info', 'calendar-days', today, prox7.length > 0)}
    ${section('Próximos 8–30 días', prox30, '',   'calendar', today, false)}
  `;

  renderIcons();
  bindCardActions(root);
  root.querySelector('#btn-new-pend')?.addEventListener('click', () => {
    const key = state.equipos[0]?.key || null;
    if (!key) { toast({ message: 'Cargá equipos primero para crear un pendiente.', kind: 'warn' }); return; }
    openPendienteForm(key, null, () => navigate('hoy'));
  });
}

function kpi(label, n, kind = '', icon = 'circle') {
  return `
    <div class="kpi ${kind ? 'kpi-' + kind : ''}">
      <div class="row-between">
        <div class="kpi-label">${escapeHtml(label)}</div>
        <i data-lucide="${icon}" class="muted"></i>
      </div>
      <div class="kpi-value">${n}</div>
    </div>
  `;
}

function section(title, items, kind, icon, today, openDefault) {
  if (!items.length) {
    return `
      <details class="section" ${openDefault ? 'open' : ''}>
        <summary class="section-header">
          <span class="row"><i data-lucide="${icon}" class="muted"></i> <h3>${escapeHtml(title)}</h3> <span class="badge">0</span></span>
          <i data-lucide="chevron-down" class="muted"></i>
        </summary>
        <div class="section-body"><div class="empty"><div class="empty-text">Nada aquí. Buen trabajo.</div></div></div>
      </details>
    `;
  }
  const rows = items.map(({ key, p }) => itemHtml(key, p, today)).join('');
  return `
    <details class="section" ${openDefault ? 'open' : ''}>
      <summary class="section-header">
        <span class="row"><i data-lucide="${icon}" class="muted"></i> <h3>${escapeHtml(title)}</h3> <span class="badge ${kind === 'danger' ? 'badge-danger' : kind === 'warn' ? 'badge-warn' : ''}">${items.length}</span></span>
        <i data-lucide="chevron-down" class="muted"></i>
      </summary>
      <div class="section-body" style="padding:0">
        ${rows}
      </div>
    </details>
  `;
}

function itemHtml(key, p, today) {
  const eq = state.equipos.find(e => e.key === key);
  const due = p.fechaCompromiso || p.proximoRecordatorio;
  const rel = due ? fmtRelative(due) : '';
  const dueClass = due && due < today ? 'badge-danger' : (due === today ? 'badge-warn' : 'badge');
  return `
    <div class="list-item" data-key="${escapeHtml(key)}" data-pid="${escapeHtml(p.id)}">
      <div class="item-main">
        <div class="item-title">${escapeHtml(p.descripcion || '(sin descripción)')}</div>
        <div class="item-meta">
          ${eq ? `<a href="#" class="open-equipo">${escapeHtml(eq.equipo || '')}</a> · ${val(eq.inv || eq.id)}` : escapeHtml(key)}
          ${p.ejecutor ? ' · ' + escapeHtml(p.ejecutor) : ''}
        </div>
      </div>
      <div class="item-actions">
        ${due ? `<span class="badge ${dueClass}" title="${escapeHtml(fmtDate(due))}">${escapeHtml(rel || fmtDate(due))}</span>` : ''}
        <button class="btn btn-sm act-snooze" title="Posponer 7 días"><i data-lucide="clock"></i></button>
        <button class="btn btn-sm act-edit" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn btn-sm act-close" title="Marcar cerrado"><i data-lucide="check"></i></button>
      </div>
    </div>
  `;
}

function bindCardActions(root) {
  root.querySelectorAll('.list-item').forEach(el => {
    const key = el.dataset.key, pid = el.dataset.pid;
    el.querySelector('.open-equipo')?.addEventListener('click', e => { e.preventDefault(); openEquipoDetail(key); });
    el.querySelector('.act-edit')?.addEventListener('click', e => { e.stopPropagation(); openPendienteForm(key, pid, () => location.reload()); });
    el.querySelector('.act-snooze')?.addEventListener('click', e => {
      e.stopPropagation();
      const arr = st.pendientes[key] || [];
      const p = arr.find(x => x.id === pid);
      if (!p) return;
      const prev = p.proximoRecordatorio || p.fechaCompromiso || todayISO();
      p.proximoRecordatorio = addDaysISO(prev, 7);
      savePersisted(); schedulePush();
      toast({
        message: 'Pospuesto 7 días.',
        kind: 'ok',
        action: { label: 'Deshacer', onClick: () => {
          p.proximoRecordatorio = prev === addDaysISO(prev, 7) ? '' : prev;
          savePersisted(); schedulePush();
          renderHoy(root.parentElement?.firstElementChild || root);
        }}
      });
      renderHoy(root);
    });
    el.querySelector('.act-close')?.addEventListener('click', e => {
      e.stopPropagation();
      const arr = st.pendientes[key] || [];
      const p = arr.find(x => x.id === pid);
      if (!p) return;
      const prevEstado = p.estado;
      const prevCierre = p.fechaCierre;
      p.estado = 'cerrado';
      p.fechaCierre = todayISO();
      savePersisted(); schedulePush();
      toast({
        message: 'Pendiente cerrado.',
        kind: 'ok',
        action: { label: 'Deshacer', onClick: () => {
          p.estado = prevEstado; p.fechaCierre = prevCierre;
          savePersisted(); schedulePush();
          renderHoy(root);
        }}
      });
      renderHoy(root);
    });
  });
}
