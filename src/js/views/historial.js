/* Vista: Historial — eventos de un equipo, filtrable y exportable */

import { state } from '../state.js';
import { escapeHtml, val, fmtDate, renderIcons, todayISO } from '../utils.js';
import { emptyState } from '../ui.js';
import { navigate } from '../router.js';

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
  let eventos = (state.eventos[key] || []).slice().sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||''));
  const q = (params.q || '').toLowerCase();
  const tipo = params.tipo || '';
  const desde = params.desde || '';
  const hasta = params.hasta || '';
  let list = eventos.filter(ev => {
    if (q) {
      const hay = (ev.observacion + ' ' + ev.ejecutor + ' ' + ev.empresa).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (tipo && ev.tipo !== tipo) return false;
    if (desde && ev.fecha < desde) return false;
    if (hasta && ev.fecha > hasta) return false;
    return true;
  });

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>${escapeHtml(eq.equipo || '—')} · Historial</h2>
        <p class="muted">${escapeHtml(eq.inv || eq.id || '')} · ${escapeHtml(eq.servicio || '')} · ${eventos.length} eventos totales</p>
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
      <input class="input" type="date" id="h-desde" value="${escapeHtml(desde)}" />
      <input class="input" type="date" id="h-hasta" value="${escapeHtml(hasta)}" />
    </div>

    ${list.length === 0 ? emptyState({ icon: 'inbox', title: 'Sin eventos para esos filtros', text: '' }) : `
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Resultado</th><th>Ejecutor</th><th>Empresa</th><th>Observación</th></tr></thead>
          <tbody>${list.map(ev => `
            <tr>
              <td class="mono">${fmtDate(ev.fecha)}</td>
              <td>${escapeHtml(TIPO_LABEL[ev.tipo] || ev.tipo || '—')}</td>
              <td><code>${escapeHtml(ev.resultado || '—')}</code></td>
              <td>${val(ev.ejecutor)}</td>
              <td>${val(ev.empresa)}</td>
              <td style="max-width:380px">${escapeHtml(ev.observacion || '').replace(/\n/g,'<br>')}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    `}
  `;
  renderIcons();
  root.querySelector('#btn-back').addEventListener('click', () => history.back());
  root.querySelector('#btn-export').addEventListener('click', () => exportXLSX(eq, list));
  const sync = () => navigate('historial', {
    key,
    q: root.querySelector('#h-q').value,
    tipo: root.querySelector('#h-tipo').value,
    desde: root.querySelector('#h-desde').value,
    hasta: root.querySelector('#h-hasta').value
  });
  root.querySelector('#h-q').addEventListener('input', () => { clearTimeout(window.__hq); window.__hq = setTimeout(sync, 200); });
  ['h-tipo','h-desde','h-hasta'].forEach(id => root.querySelector('#'+id).addEventListener('change', sync));
}

function exportXLSX(eq, list) {
  if (!window.XLSX) return;
  const wb = window.XLSX.utils.book_new();
  const rows = [['Fecha','Tipo','Resultado','Ejecutor','Empresa','N° OC','N° Cotización','Observación']];
  list.forEach(ev => rows.push([
    ev.fecha, TIPO_LABEL[ev.tipo] || ev.tipo, ev.resultado || '',
    ev.ejecutor || '', ev.empresa || '', ev.nOC || '', ev.nCotizacion || '', ev.observacion || ''
  ]));
  const ws = window.XLSX.utils.aoa_to_sheet(rows);
  window.XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  const name = (eq.equipo || eq.key).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  window.XLSX.writeFile(wb, `historial_${name}_${todayISO()}.xlsx`);
}
