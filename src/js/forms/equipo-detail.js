/* Modal "Detalle de equipo" con tabs Eventos / Pendientes / Info */

import { state } from '../state.js';
import { escapeHtml, val, fmtDate, renderIcons } from '../utils.js';
import { openModal } from '../ui.js';
import { getEquipoEstadoExtended } from '../data/excel.js';
import { openEventoForm } from './evento.js';
import { openPendienteForm } from './pendiente.js';
import { navigate } from '../router.js';

const TIPO_LABEL = {
  mp:'Mantención preventiva', reporte_servicio:'Reporte de servicio',
  visita_tecnica:'Visita técnica', cotizacion:'Cotización', oc:'Orden de Compra',
  envio:'Envío a Serv. Técnico', solicitud:'Solicitud de trabajo',
  recepcion:'Recepción', reparacion:'Reparación'
};

export function openEquipoDetail(key) {
  const eq = state.equipos.find(e => e.key === key);
  if (!eq) return;
  const ext = getEquipoEstadoExtended(eq, state.eventos);

  let activeTab = 'eventos';
  let modal;

  const renderBody = () => {
    const eventos = (state.eventos[key] || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const pendientes = (state.pendientes[key] || []).slice();
    const html = `
      <div class="mb-3">
        <div class="row" style="gap:8px; flex-wrap:wrap; margin-bottom:8px;">
          <span class="badge"><span class="dot ${ext.estado === 'operativo' ? 'dot-ok' : ext.estado === 'no operativo' ? 'dot-danger' : 'dot'}"></span>${escapeHtml(ext.estado || '—')}</span>
          ${eq.fam ? `<span class="badge badge-accent">${escapeHtml(eq.fam)}</span>` : ''}
          ${eq.servicio ? `<span class="badge">${escapeHtml(eq.servicio)}</span>` : ''}
        </div>
        <div class="muted text-sm">${val(eq.marca)} · ${val(eq.modelo)} · Serie ${val(eq.serie)}</div>
      </div>

      <div class="tabs" role="tablist">
        <button class="tab" role="tab" aria-selected="${activeTab==='eventos'}" data-tab="eventos">Eventos (${eventos.length})</button>
        <button class="tab" role="tab" aria-selected="${activeTab==='pendientes'}" data-tab="pendientes">Pendientes (${pendientes.length})</button>
        <button class="tab" role="tab" aria-selected="${activeTab==='info'}" data-tab="info">Información</button>
      </div>

      <div class="tab-panel" id="tab-content">
        ${activeTab === 'eventos' ? eventosPanel(key, eventos) : ''}
        ${activeTab === 'pendientes' ? pendientesPanel(key, pendientes) : ''}
        ${activeTab === 'info' ? infoPanel(eq) : ''}
      </div>
    `;
    modal.bodyEl.innerHTML = html;
    renderIcons();
    bindTabs();
    bindActions(key);
  };

  const bindTabs = () => {
    modal.modalEl.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        activeTab = t.dataset.tab;
        renderBody();
      });
    });
  };

  const bindActions = (key) => {
    modal.modalEl.querySelector('#btn-new-ev')?.addEventListener('click', () => openEventoForm(key, null, renderBody));
    modal.modalEl.querySelector('#btn-new-pe')?.addEventListener('click', () => openPendienteForm(key, null, renderBody));
    modal.modalEl.querySelector('#btn-historial')?.addEventListener('click', () => { modal.close(); navigate('historial', { key }); });
    modal.modalEl.querySelectorAll('[data-edit-ev]').forEach(el => el.addEventListener('click', () => openEventoForm(key, el.dataset.editEv, renderBody)));
    modal.modalEl.querySelectorAll('[data-edit-pe]').forEach(el => el.addEventListener('click', () => openPendienteForm(key, el.dataset.editPe, renderBody)));
    modal.modalEl.querySelectorAll('[data-pend-from-ev]').forEach(el => el.addEventListener('click', () => {
      const eid = el.dataset.pendFromEv;
      const ev = (state.eventos[key] || []).find(x => x.id === eid);
      if (!ev) return;
      const tipoLbl = ({mp:'MP',reporte_servicio:'Reporte',visita_tecnica:'Visita',cotizacion:'Cotización',oc:'OC',envio:'Envío',solicitud:'Solicitud',recepcion:'Recepción',reparacion:'Reparación'}[ev.tipo]) || ev.tipo;
      const preset = {
        descripcion: ev.observacion && ev.observacion.length <= 120 ? ev.observacion : `Seguimiento de ${tipoLbl}${ev.fecha ? ' del '+ev.fecha : ''}`,
        ejecutor: ev.ejecutor || '',
        eventoId: ev.id
      };
      openPendienteForm(key, null, renderBody, preset);
    }));
  };

  modal = openModal({
    title: `${eq.equipo || '(sin nombre)'} · ${eq.inv || eq.id || ''}`,
    size: 'lg',
    body: '<div class="muted">Cargando…</div>'
  });
  renderBody();
}

function eventosPanel(key, eventos) {
  if (!eventos.length) return `
    <div class="empty">
      <i data-lucide="history"></i>
      <div class="empty-title">Sin eventos registrados</div>
      <div class="empty-text">Registrá MP, reportes, cotizaciones, envíos a servicio técnico y reparaciones.</div>
      <button class="btn btn-primary" id="btn-new-ev"><i data-lucide="plus"></i> Registrar evento</button>
    </div>
  `;
  return `
    <div class="row-between mb-3">
      <span class="muted text-sm">${eventos.length} eventos</span>
      <div class="row">
        <button class="btn btn-sm" id="btn-historial"><i data-lucide="history"></i> Ver historial</button>
        <button class="btn btn-primary btn-sm" id="btn-new-ev"><i data-lucide="plus"></i> Nuevo evento</button>
      </div>
    </div>
    <div class="col">
      ${eventos.map(ev => {
        const isMp = ev.tipo === 'mp';
        const isOficial = ev.oficial !== false;
        const oficialBadge = isMp
          ? (isOficial
              ? `<span class="badge badge-ok" title="Reflejado en el archivo maestro"><i data-lucide="badge-check" style="width:12px;height:12px"></i> Oficial</span>`
              : `<span class="badge badge-warn" title="Aún no aparece en el archivo maestro"><i data-lucide="clock" style="width:12px;height:12px"></i> No oficial</span>`)
          : '';
        const creado = ev.creadoEn ? new Date(ev.creadoEn).toLocaleString('es-CL') : '';
        return `
        <div class="card" style="padding:12px">
          <div class="row-between" style="flex-wrap:wrap;gap:8px">
            <div>
              <div class="row" style="gap:6px;flex-wrap:wrap">
                <span class="semibold">${escapeHtml(TIPO_LABEL[ev.tipo] || ev.tipo || '—')}</span>
                ${oficialBadge}
                ${ev.resultado ? `<span class="badge badge-mono">${escapeHtml(ev.resultado)}</span>` : ''}
              </div>
              <div class="text-xs muted mt-1">${fmtDate(ev.fecha)} ${ev.ejecutor ? '· ' + escapeHtml(ev.ejecutor) : ''} ${creado ? '· registrado ' + escapeHtml(creado) : ''}</div>
            </div>
            <div class="row">
              <button class="btn btn-sm" data-pend-from-ev="${escapeHtml(ev.id)}" title="Crear pendiente desde este evento"><i data-lucide="check-square"></i> Pendiente</button>
              <button class="btn btn-sm" data-edit-ev="${escapeHtml(ev.id)}" title="Editar"><i data-lucide="pencil"></i></button>
            </div>
          </div>
          ${ev.observacion ? `<div class="mt-2 text-sm">${escapeHtml(ev.observacion).replace(/\n/g, '<br>')}</div>` : ''}
        </div>
        `;
      }).join('')}
    </div>
  `;
}

function pendientesPanel(key, pendientes) {
  if (!pendientes.length) return `
    <div class="empty">
      <i data-lucide="check-square"></i>
      <div class="empty-title">Sin pendientes</div>
      <button class="btn btn-primary" id="btn-new-pe"><i data-lucide="plus"></i> Crear pendiente</button>
    </div>
  `;
  return `
    <div class="row-between mb-3">
      <span class="muted text-sm">${pendientes.length} pendientes</span>
      <button class="btn btn-primary btn-sm" id="btn-new-pe"><i data-lucide="plus"></i> Nuevo</button>
    </div>
    <div class="col">
      ${pendientes.map(p => `
        <div class="card" style="padding:12px">
          <div class="row-between">
            <div>
              <div class="semibold">${escapeHtml(p.descripcion || '—')}</div>
              <div class="text-xs muted">
                ${p.estado || 'abierto'}
                ${p.fechaCompromiso ? ' · vence ' + fmtDate(p.fechaCompromiso) : ''}
                ${p.ejecutor ? ' · ' + escapeHtml(p.ejecutor) : ''}
              </div>
            </div>
            <button class="btn btn-sm" data-edit-pe="${escapeHtml(p.id)}"><i data-lucide="pencil"></i></button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function infoPanel(eq) {
  const rows = [
    ['Familia', eq.fam], ['ID', eq.id], ['Carpeta', eq.carpeta], ['N° Inventario', eq.inv],
    ['Servicio', eq.servicio], ['Unidad', eq.unidad], ['Ubicación', eq.ubicacion], ['Procedencia', eq.procedencia],
    ['Marca', eq.marca], ['Modelo', eq.modelo], ['N° Serie', eq.serie], ['Año', eq.anio],
    ['VUR', eq.vur], ['Clasificación', eq.clas], ['Frecuencia', eq.frecuencia]
  ];
  return `
    <div class="grid grid-2">
      ${rows.map(([k, v]) => `
        <div>
          <div class="text-xs muted">${escapeHtml(k)}</div>
          <div>${val(v)}</div>
        </div>
      `).join('')}
    </div>
  `;
}
