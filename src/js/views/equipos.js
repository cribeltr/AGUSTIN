/* Vista: Equipos
   - Búsqueda libre + filtros (Familia, Servicio, Ubicación, Estado, Resultado)
   - Tabla densa en desktop / tarjetas en móvil
   - Click en fila → openEquipoDetail
   - Persistencia de filtros en hash params
*/

import { state, subscribe } from '../state.js';
import { escapeHtml, val, renderIcons, debounce } from '../utils.js';
import { emptyState } from '../ui.js';
import { getEquipoEstadoExtended } from '../data/excel.js';
import { navigate, getRouteParams } from '../router.js';
import { openEquipoDetail } from '../forms/equipo-detail.js';

const ESTADO_LABEL = {
  operativo: 'Operativo',
  'no operativo': 'No operativo',
  fuera_servicio: 'Fuera de servicio',
  baja: 'Dado de baja',
  no_ubicado: 'No ubicado',
  no_registrado: 'Sin registrar'
};
const ESTADO_DOT = {
  operativo: 'dot-ok',
  'no operativo': 'dot-danger',
  fuera_servicio: 'dot-warn',
  baja: 'dot',
  no_ubicado: 'dot-warn',
  no_registrado: 'dot'
};

function uniqueValues(field) {
  const s = new Set();
  state.equipos.forEach(eq => { if (eq[field]) s.add(eq[field]); });
  return [...s].sort();
}

function applyFilters(arr, f) {
  return arr.filter(eq => {
    if (eq.empty) return false;
    if (f.q) {
      const hay = (eq.equipo + ' ' + eq.inv + ' ' + eq.id + ' ' + eq.marca + ' ' + eq.modelo + ' ' + eq.serie + ' ' + eq.servicio).toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    if (f.fam && eq.fam !== f.fam) return false;
    if (f.servicio && eq.servicio !== f.servicio) return false;
    if (f.ubicacion && eq.ubicacion !== f.ubicacion) return false;
    if (f.estado) {
      const ext = getEquipoEstadoExtended(eq, state.eventos);
      if (ext.estado !== f.estado) return false;
    }
    return true;
  });
}

export function renderEquipos(root, params = {}) {
  const filters = {
    q: params.q || '',
    fam: params.fam || '',
    servicio: params.servicio || '',
    ubicacion: params.ubicacion || '',
    estado: params.estado || ''
  };

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>Buscar equipos</h2>
        <p class="muted">${state.equipos.length} equipos en el inventario · ${state.fileName || 'sin archivo cargado'}</p>
      </div>
    </div>

    ${state.equipos.length === 0 ? emptyState({
      icon: 'file-spreadsheet',
      title: 'No hay datos cargados',
      text: 'Cargá el archivo Programacion_MP_2026.xlsm desde el botón superior para empezar.'
    }) : `
      <div class="filter-bar">
        <div class="search-input grow">
          <i data-lucide="search"></i>
          <input class="input" id="f-q" placeholder="Buscar por equipo, inventario, marca, modelo, serie…" value="${escapeHtml(filters.q)}" />
        </div>
        <select class="select" id="f-fam">
          <option value="">Familia (todas)</option>
          ${uniqueValues('fam').map(v => `<option value="${escapeHtml(v)}" ${filters.fam===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}
        </select>
        <select class="select" id="f-srv">
          <option value="">Servicio (todos)</option>
          ${uniqueValues('servicio').map(v => `<option value="${escapeHtml(v)}" ${filters.servicio===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}
        </select>
        <select class="select" id="f-ubi">
          <option value="">Ubicación (todas)</option>
          ${uniqueValues('ubicacion').map(v => `<option value="${escapeHtml(v)}" ${filters.ubicacion===v?'selected':''}>${escapeHtml(v)}</option>`).join('')}
        </select>
        <select class="select" id="f-est">
          <option value="">Estado (todos)</option>
          ${Object.entries(ESTADO_LABEL).map(([k,v])=>`<option value="${k}" ${filters.estado===k?'selected':''}>${v}</option>`).join('')}
        </select>
        <button class="filter-clear btn-ghost btn-sm" id="f-clear">Limpiar</button>
      </div>

      <div id="equipos-results"></div>
    `}
  `;
  renderIcons();

  if (state.equipos.length === 0) return;

  const resultsEl = root.querySelector('#equipos-results');
  const renderResults = () => {
    const list = applyFilters(state.equipos, filters);
    resultsEl.innerHTML = list.length === 0
      ? emptyState({ icon: 'search-x', title: 'Sin coincidencias', text: 'Ajustá los filtros o limpia la búsqueda.' })
      : tableHtml(list) + cardsHtml(list);
    renderIcons();
    bindRowClicks(resultsEl);
  };
  renderResults();

  const debouncedFilter = debounce(() => {
    navigate('equipos', filters);
  }, 200);

  const onChange = () => {
    filters.q = root.querySelector('#f-q').value;
    filters.fam = root.querySelector('#f-fam').value;
    filters.servicio = root.querySelector('#f-srv').value;
    filters.ubicacion = root.querySelector('#f-ubi').value;
    filters.estado = root.querySelector('#f-est').value;
    renderResults();
    debouncedFilter();
  };
  root.querySelector('#f-q').addEventListener('input', onChange);
  ['f-fam','f-srv','f-ubi','f-est'].forEach(id => root.querySelector('#'+id).addEventListener('change', onChange));
  root.querySelector('#f-clear').addEventListener('click', () => {
    Object.keys(filters).forEach(k => filters[k] = '');
    navigate('equipos', {});
  });
}

function tableHtml(list) {
  const rows = list.map(eq => rowHtml(eq)).join('');
  return `
    <div class="table-wrap equipos-table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Familia</th>
            <th>ID / Inv.</th>
            <th>Equipo</th>
            <th>Servicio</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th class="text-xs muted">Últ. resultado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function rowHtml(eq) {
  const ext = getEquipoEstadoExtended(eq, state.eventos);
  const dot = ESTADO_DOT[ext.estado] || 'dot';
  const lbl = ESTADO_LABEL[ext.estado] || ext.estado;
  const lastRes = ext.codigo || '—';
  return `
    <tr class="equipo-row is-selectable" data-key="${escapeHtml(eq.key)}">
      <td>${val(eq.fam)}</td>
      <td class="equipo-id">${val(eq.inv || eq.id)}</td>
      <td>${val(eq.equipo)}</td>
      <td>${val(eq.servicio)}</td>
      <td>${val(eq.ubicacion)}</td>
      <td><span class="est"><span class="dot ${dot}"></span>${escapeHtml(lbl)}</span></td>
      <td><code>${escapeHtml(lastRes)}</code></td>
    </tr>
  `;
}

function cardsHtml(list) {
  return `<div class="equipo-card-list">` + list.map(eq => {
    const ext = getEquipoEstadoExtended(eq, state.eventos);
    return `
      <div class="equipo-card" data-key="${escapeHtml(eq.key)}">
        <div class="ec-title">${val(eq.equipo)}</div>
        <div class="ec-meta">${val(eq.inv || eq.id)} · ${val(eq.fam)} · ${val(eq.servicio)}</div>
        <div class="ec-foot">
          <span class="badge"><span class="dot ${ESTADO_DOT[ext.estado] || 'dot'}"></span>${escapeHtml(ESTADO_LABEL[ext.estado] || ext.estado)}</span>
          <span class="badge badge-mono">${escapeHtml(ext.codigo || '—')}</span>
        </div>
      </div>
    `;
  }).join('') + '</div>';
}

function bindRowClicks(host) {
  host.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.key;
      openEquipoDetail(key);
    });
  });
}
