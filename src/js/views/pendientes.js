/* Vista: Pendientes — lista completa agrupada por estado */

import { state, savePersisted } from '../state.js';
import { escapeHtml, val, todayISO, fmtDate, fmtRelative, renderIcons } from '../utils.js';
import { emptyState, toast, confirmDialog } from '../ui.js';
import { openPendienteForm } from '../forms/pendiente.js';
import { openEquipoDetail } from '../forms/equipo-detail.js';
import { schedulePush } from '../data/gas.js';
import { navigate, refreshActiveView } from '../router.js';

function flatten() {
  const out = [];
  Object.entries(state.pendientes).forEach(([key, arr]) => (arr || []).forEach(p => out.push({ key, p })));
  return out;
}

export function renderPendientes(root, params = {}) {
  const q = params.q || '';
  const estado = params.estado || ''; // '', creado, abierto, cerrado
  const responsable = params.resp || '';
  let all = flatten();
  if (q) {
    const ql = q.toLowerCase();
    all = all.filter(({ p }) => (p.descripcion || '').toLowerCase().includes(ql) || (p.ejecutor || '').toLowerCase().includes(ql));
  }
  if (responsable) all = all.filter(({ p }) => p.ejecutor === responsable);

  const responsables = [...new Set(all.map(x => x.p.ejecutor).filter(Boolean))].sort();
  const buckets = {
    abierto: all.filter(x => x.p.estado === 'abierto' || !x.p.estado),
    creado:  all.filter(x => x.p.estado === 'creado'),
    cerrado: all.filter(x => x.p.estado === 'cerrado')
  };

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>Pendientes</h2>
        <p class="muted">${all.length} pendientes</p>
      </div>
      <div class="row">
        <button class="btn btn-primary" id="btn-new"><i data-lucide="plus"></i> Nuevo</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input grow">
        <i data-lucide="search"></i>
        <input class="input" id="f-q" placeholder="Buscar descripción o responsable…" value="${escapeHtml(q)}" />
      </div>
      <select class="select" id="f-estado">
        <option value="">Estado (todos)</option>
        <option value="abierto" ${estado==='abierto'?'selected':''}>Abierto</option>
        <option value="creado"  ${estado==='creado' ?'selected':''}>Creado</option>
        <option value="cerrado" ${estado==='cerrado'?'selected':''}>Cerrado</option>
      </select>
      <select class="select" id="f-resp">
        <option value="">Responsable (todos)</option>
        ${responsables.map(r => `<option value="${escapeHtml(r)}" ${r===responsable?'selected':''}>${escapeHtml(r)}</option>`).join('')}
      </select>
      <button class="filter-clear btn-ghost btn-sm" id="f-clear">Limpiar</button>
    </div>

    ${all.length === 0 ? emptyState({
      icon: 'check-square',
      title: 'No hay pendientes',
      text: 'Creá uno desde un equipo o usando el botón "Nuevo".'
    }) : `
      ${(!estado || estado === 'abierto') ? bucketSection('Abiertos', buckets.abierto, 'warn', 'circle-dot', true) : ''}
      ${(!estado || estado === 'creado')  ? bucketSection('Por iniciar', buckets.creado, 'info', 'inbox', false) : ''}
      ${(!estado || estado === 'cerrado') ? bucketSection('Cerrados', buckets.cerrado, '', 'check-circle-2', false) : ''}
    `}
  `;
  renderIcons();
  bindUI(root);
}

function bucketSection(title, items, kind, icon, openDefault) {
  if (!items.length) return '';
  const today = todayISO();
  const rows = items.map(({ key, p }) => itemHtml(key, p, today)).join('');
  return `
    <details class="section" ${openDefault ? 'open' : ''}>
      <summary class="section-header">
        <span class="row"><i data-lucide="${icon}" class="muted"></i> <h3>${escapeHtml(title)}</h3> <span class="badge ${kind === 'warn' ? 'badge-warn' : kind === 'info' ? 'badge-accent' : ''}">${items.length}</span></span>
        <i data-lucide="chevron-down" class="muted"></i>
      </summary>
      <div class="section-body" style="padding:0">${rows}</div>
    </details>
  `;
}

function itemHtml(key, p, today) {
  const eq = state.equipos.find(e => e.key === key);
  const due = p.fechaCompromiso;
  const rec = p.proximoRecordatorio;
  const overdue = due && due < today && p.estado !== 'cerrado';
  const tareaPend = (p.tareas || []).filter(t => t.estado !== 'cerrado').length;
  return `
    <div class="list-item" data-key="${escapeHtml(key)}" data-pid="${escapeHtml(p.id)}">
      <div class="item-main">
        <div class="item-title">${escapeHtml(p.descripcion || '(sin descripción)')}</div>
        <div class="item-meta">
          ${eq ? `<a href="#" class="open-equipo">${escapeHtml(eq.equipo || '')}</a> · ${val(eq.inv || eq.id)} · ${escapeHtml(eq.servicio || '')}` : escapeHtml(key)}
          ${p.ejecutor ? ' · ' + escapeHtml(p.ejecutor) : ''}
          ${tareaPend ? ` · <span class="badge">${tareaPend} tareas pend.</span>` : ''}
        </div>
      </div>
      <div class="item-actions">
        ${due ? `<span class="badge ${overdue ? 'badge-danger' : 'badge'}" title="Vence ${escapeHtml(fmtDate(due))}">⏱ ${escapeHtml(fmtRelative(due))}</span>` : ''}
        <button class="btn btn-sm act-edit" title="Editar"><i data-lucide="pencil"></i></button>
        <button class="btn btn-sm act-delete btn-danger" title="Eliminar"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `;
}

function bindUI(root) {
  const sync = () => {
    const params = {
      q: root.querySelector('#f-q').value,
      estado: root.querySelector('#f-estado').value,
      resp: root.querySelector('#f-resp').value
    };
    navigate('pendientes', params);
  };
  root.querySelector('#f-q').addEventListener('input', sync);
  root.querySelector('#f-estado').addEventListener('change', sync);
  root.querySelector('#f-resp').addEventListener('change', sync);
  root.querySelector('#f-clear').addEventListener('click', () => navigate('pendientes', {}));
  root.querySelector('#btn-new')?.addEventListener('click', () => {
    const key = state.equipos[0]?.key;
    if (!key) { toast({ message: 'Cargá equipos primero.', kind: 'warn' }); return; }
    openPendienteForm(key, null, refreshActiveView);
  });

  root.querySelectorAll('.list-item').forEach(el => {
    const key = el.dataset.key, pid = el.dataset.pid;
    el.querySelector('.open-equipo')?.addEventListener('click', e => { e.preventDefault(); openEquipoDetail(key); });
    el.querySelector('.act-edit')?.addEventListener('click', () => openPendienteForm(key, pid, refreshActiveView));
    el.querySelector('.act-delete')?.addEventListener('click', async () => {
      const arr = state.pendientes[key] || [];
      const idx = arr.findIndex(x => x.id === pid);
      if (idx < 0) return;
      const removed = arr.splice(idx, 1)[0];
      if (!arr.length) delete state.pendientes[key];
      savePersisted(); schedulePush();
      refreshActiveView();
      toast({
        message: 'Pendiente eliminado.',
        kind: 'ok',
        durationMs: 6500,
        action: { label: 'Deshacer', onClick: () => {
          if (!state.pendientes[key]) state.pendientes[key] = [];
          state.pendientes[key].splice(idx, 0, removed);
          savePersisted(); schedulePush();
          refreshActiveView();
        }}
      });
    });
  });
}
