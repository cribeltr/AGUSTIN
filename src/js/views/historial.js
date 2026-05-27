/* Vista: Historial — eventos de un equipo, filtrable y exportable */

import { state } from '../state.js';
import { escapeHtml, val, fmtDate, renderIcons, todayISO } from '../utils.js';
import { emptyState } from '../ui.js';
import { navigate } from '../router.js';
import { exportHistorialXLSX } from '../export.js';

const TIPO_LABEL = {
  mp:'MP', reporte_servicio:'Reporte', visita_tecnica:'Visita',
  cotizacion:'Cotización', oc:'OC', envio:'Envío', solicitud:'Solicitud',
  recepcion:'Recepción', reparacion:'Reparación'
};

export function renderHistorial(root, params = {}) {
  const key = params.key;
  if (!key) {
    root.innerHTML = emptyState({ icon: 'history', title: 'Selecciona un equipo', text: 'Abrí un equipo desde "Equipos" para ver su historial.' });
    renderIcons();
    return;
  }
  const eq = state.equipos.find(e => e.key === key);
  if (!eq) {
    root.innerHTML = emptyState({ icon: 'search-x', title: 'Equipo no encontrado', text: key });
    renderIcons();
    return;
  }
  /* Orden cronológico ASC para que el ID correlativo coincida con el export y con GAS */
  const eventos = (state.eventos[key] || []).slice().sort((a,b)=> String(a.creadoEn || a.fecha || '').localeCompare(b.creadoEn || b.fecha || ''));
  const q = (params.q || '').toLowerCase();
  const tipo = params.tipo || '';
  const desde = params.desde || '';
  const hasta = params.hasta || '';
  const onlyNoOficial = params.no_oficial === '1';
  let list = eventos.filter(ev => {
    if (q) {
      const hay = ((ev.observacion||'') + ' ' + (ev.ejecutor||'') + ' ' + (ev.empresa||'')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (tipo && ev.tipo !== tipo) return false;
    if (desde && ev.fecha < desde) return false;
    if (hasta && ev.fecha > hasta) return false;
    if (onlyNoOficial && !(ev.tipo === 'mp' && ev.oficial === false)) return false;
    return true;
  });

  /* Mapa id → correlativo (1..N) según el orden cronológico de TODOS los eventos del equipo */
  const corr = new Map();
  eventos.forEach((ev, i) => corr.set(ev.id, i + 1));

  const noOficCount = eventos.filter(ev => ev.tipo === 'mp' && ev.oficial === false).length;

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>${escapeHtml(eq.equipo || '—')} · Historial</h2>
        <p class="muted">${escapeHtml(eq.inv || eq.id || '')} · ${escapeHtml(eq.servicio || '')} · ${eventos.length} eventos totales${noOficCount ? ` · <span style="color:var(--c-warn)">${noOficCount} no oficiales</span>` : ''}</p>
      </div>
      <div class="row">
        <button class="btn" id="btn-back"><i data-lucide="arrow-left"></i> Volver</button>
        <button class="btn" id="btn-export"><i data-lucide="download"></i> Exportar</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="search-input grow"><i data-lucide="search"></i><input class="input" id="h-q" placeholder="Buscar en observaciones, ejecutor, empresa…" value="${escapeHtml(params.q || '')}" /></div>
      <select class="select" id="h-tipo">
        <option value="">Tipo (todos)</option>
        ${Object.entries(TIPO_LABEL).map(([k,l]) => `<option value="${k}" ${tipo===k?'selected':''}>${l}</option>`).join('')}
      </select>
      <input class="input" type="date" id="h-desde" value="${escapeHtml(desde)}" title="Desde" />
      <input class="input" type="date" id="h-hasta" value="${escapeHtml(hasta)}" title="Hasta" />
      <label class="check"><input type="checkbox" id="h-noofic" ${onlyNoOficial ? 'checked' : ''} /> Solo no oficiales</label>
    </div>

    ${list.length === 0 ? emptyState({ icon: 'inbox', title: 'Sin eventos para esos filtros', text: '' }) : `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th title="ID correlativo (igual al que usa la hoja Sheets)">ID</th>
              <th>Fecha</th>
              <th>Fecha registro</th>
              <th>Tipo</th>
              <th>Resultado</th>
              <th>Oficial</th>
              <th>Ejecutor</th>
              <th>Empresa</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>${list.map(ev => {
            const isMp = ev.tipo === 'mp';
            const isOf = ev.oficial !== false;
            return `
            <tr>
              <td class="mono">${corr.get(ev.id) || '—'}</td>
              <td class="mono">${fmtDate(ev.fecha)}</td>
              <td class="mono">${ev.creadoEn ? escapeHtml(new Date(ev.creadoEn).toLocaleString('es-CL', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })) : '—'}</td>
              <td>${escapeHtml(TIPO_LABEL[ev.tipo] || ev.tipo || '—')}</td>
              <td><code>${escapeHtml(ev.resultado || '—')}</code></td>
              <td>${isMp ? (isOf ? '<span class="badge badge-ok">Sí</span>' : '<span class="badge badge-warn">No</span>') : '<span class="muted">—</span>'}</td>
              <td>${val(ev.ejecutor)}</td>
              <td>${val(ev.empresa)}</td>
              <td style="max-width:380px">${escapeHtml(ev.observacion || '').replace(/\n/g,'<br>')}</td>
            </tr>
            `;
          }).join('')}</tbody>
        </table>
      </div>
    `}
  `;
  renderIcons();
  root.querySelector('#btn-back').addEventListener('click', () => history.back());
  root.querySelector('#btn-export').addEventListener('click', () => exportHistorialXLSX(eq, list));
  const sync = () => navigate('historial', {
    key,
    q: root.querySelector('#h-q').value,
    tipo: root.querySelector('#h-tipo').value,
    desde: root.querySelector('#h-desde').value,
    hasta: root.querySelector('#h-hasta').value,
    no_oficial: root.querySelector('#h-noofic').checked ? '1' : ''
  });
  root.querySelector('#h-q').addEventListener('input', () => { clearTimeout(window.__hq); window.__hq = setTimeout(sync, 200); });
  ['h-tipo','h-desde','h-hasta','h-noofic'].forEach(id => root.querySelector('#'+id).addEventListener('change', sync));
}
