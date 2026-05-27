/* Form: crear / editar Evento */

import { state, upsertEvento, findEvento, allEventoIds } from '../state.js';
import { escapeHtml, todayISO, timestampUid, renderIcons, val } from '../utils.js';
import { openModal, toast, confirmDialog } from '../ui.js';
import { schedulePush } from '../data/gas.js';
import { openPendienteForm } from './pendiente.js';

const TIPOS = [
  ['mp', 'Mantención preventiva (MP)'],
  ['reporte_servicio', 'Reporte de servicio'],
  ['visita_tecnica', 'Visita técnica'],
  ['cotizacion', 'Cotización'],
  ['oc', 'Orden de compra'],
  ['envio', 'Envío a servicio técnico'],
  ['solicitud', 'Solicitud de trabajo'],
  ['recepcion', 'Recepción'],
  ['reparacion', 'Reparación']
];

const RESULTADOS = ['Si', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'FS', 'Baja', 'NU'];
const ESTADOS = ['operativo', 'no operativo', 'fuera_servicio'];
const TIPO_LABEL = Object.fromEntries(TIPOS);

export function openEventoForm(key, editId, onSaved) {
  const eq = state.equipos.find(e => e.key === key);
  const existing = editId ? findEvento(key, editId) : null;
  /* Nuevos eventos MP arrancan como "no oficial". Otros tipos: oficial por defecto. */
  const ev = existing || {
    id: timestampUid(allEventoIds()),
    tipo: 'mp',
    fecha: todayISO(),
    creadoEn: new Date().toISOString(),
    resultado: '',
    ejecutor: state.prefs.miUsuario || '',
    estado: '',
    empresa: '', empresaId: '', contactoId: '',
    nEnvio: '', nCotizacion: '', nOC: '', folio: '', folioGuia: '',
    observacion: '',
    archivos: [],
    oficial: false   // por defecto al crear MP. Para otros tipos, save() lo fuerza a true.
  };

  const isOficial = (ev.oficial !== false);

  const footer = `
    ${editId ? '<button class="btn btn-danger" id="btn-del" type="button"><i data-lucide="trash-2"></i> Eliminar</button>' : ''}
    <button class="btn" id="btn-pend" type="button" title="Crear pendiente vinculado a este evento"><i data-lucide="check-square"></i> Crear pendiente</button>
    <span class="grow"></span>
    <button class="btn cancel" type="button">Cancelar</button>
    <button class="btn btn-primary" id="btn-save" type="submit">Guardar</button>
  `;

  const modal = openModal({
    title: editId ? 'Editar evento' : 'Nuevo evento',
    size: 'lg',
    body: bodyHTML(ev, eq, isOficial, editId),
    footer
  });
  renderIcons();
  bindFields(modal.modalEl, ev);

  modal.footer.querySelector('.cancel')?.addEventListener('click', modal.close);
  modal.footer.querySelector('#btn-save').addEventListener('click', () => {
    collect(modal.modalEl, ev);
    if (!validate(ev)) return;
    /* Tipos != mp no participan del flujo "oficial" */
    if (ev.tipo !== 'mp') ev.oficial = true;
    /* Si no era oficial y el usuario cambió manualmente al checkbox, respetar */
    upsertEvento(key, ev);
    schedulePush();
    toast({ message: editId ? 'Evento actualizado.' : 'Evento registrado.', kind: 'ok' });
    modal.close();
    onSaved?.();
  });
  modal.footer.querySelector('#btn-pend').addEventListener('click', () => {
    /* Si el evento es nuevo y todavía no se guardó, guardarlo primero */
    collect(modal.modalEl, ev);
    if (!editId) {
      if (ev.tipo !== 'mp') ev.oficial = true;
      upsertEvento(key, ev);
      schedulePush();
    } else {
      if (ev.tipo !== 'mp') ev.oficial = true;
      upsertEvento(key, ev);
    }
    modal.close();
    const preset = {
      descripcion: presetDescripcionFromEvento(ev),
      ejecutor: ev.ejecutor || '',
      eventoId: ev.id,
      fecha: todayISO()
    };
    openPendienteForm(key, null, () => { onSaved?.(); }, preset);
  });
  modal.footer.querySelector('#btn-del')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar evento', message: '¿Eliminar este evento?', danger: true, confirmLabel: 'Eliminar' });
    if (!ok) return;
    const arr = state.eventos[key] || [];
    const idx = arr.findIndex(x => x.id === ev.id);
    if (idx < 0) return;
    const removed = arr.splice(idx, 1)[0];
    if (!arr.length) delete state.eventos[key];
    schedulePush();
    modal.close();
    toast({
      message: 'Evento eliminado.', kind: 'ok', durationMs: 6500,
      action: { label: 'Deshacer', onClick: () => {
        if (!state.eventos[key]) state.eventos[key] = [];
        state.eventos[key].splice(idx, 0, removed);
        schedulePush();
        onSaved?.();
      }}
    });
    onSaved?.();
  });
}

function presetDescripcionFromEvento(ev) {
  const tipoLbl = TIPO_LABEL[ev.tipo] || ev.tipo || 'evento';
  const fecha = ev.fecha ? ` del ${ev.fecha}` : '';
  if (ev.observacion && ev.observacion.length <= 120) return ev.observacion;
  return `Seguimiento de ${tipoLbl}${fecha}`;
}

function bodyHTML(ev, eq, isOficial, editId) {
  const oficialBadge = (ev.tipo === 'mp')
    ? (isOficial
        ? `<span class="badge badge-ok" title="Reflejado en el archivo maestro"><i data-lucide="badge-check" style="width:12px;height:12px"></i> Oficial</span>`
        : `<span class="badge badge-warn" title="Aún no aparece en el archivo maestro; se promoverá al cargar un maestro que lo refleje"><i data-lucide="clock" style="width:12px;height:12px"></i> No oficial</span>`)
    : '';
  return `
    ${eq ? `<div class="row mb-3" style="gap:8px;flex-wrap:wrap">
      <span class="muted text-sm">Equipo: <strong>${escapeHtml(eq.equipo || '—')}</strong> · ${escapeHtml(eq.inv || eq.id || '')}</span>
      ${oficialBadge}
    </div>` : ''}

    <div class="grid grid-2">
      <div class="field">
        <label class="field-label" for="ev-tipo">Tipo de evento</label>
        <select class="select" id="ev-tipo">
          ${TIPOS.map(([k, l]) => `<option value="${k}" ${ev.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="ev-fecha">Fecha</label>
        <input class="input" type="date" id="ev-fecha" value="${escapeHtml(ev.fecha)}" />
      </div>
      <div class="field">
        <label class="field-label" for="ev-result">Resultado</label>
        <select class="select" id="ev-result">
          <option value="">—</option>
          ${RESULTADOS.map(r => `<option value="${r}" ${ev.resultado === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
        <span class="field-hint">Para MP: Si = OK, C1-C8 = causa, FS = fuera de servicio, Baja, NU = no ubicado.</span>
      </div>
      <div class="field">
        <label class="field-label" for="ev-ejec">Ejecutor</label>
        <input class="input" id="ev-ejec" value="${escapeHtml(ev.ejecutor)}" placeholder="Nombre del técnico" />
      </div>
      <div class="field">
        <label class="field-label" for="ev-estado">Estado del equipo tras este evento</label>
        <select class="select" id="ev-estado">
          <option value="">—</option>
          ${ESTADOS.map(e => `<option value="${e}" ${ev.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="ev-empresa">Empresa proveedora</label>
        <input class="input" id="ev-empresa" value="${escapeHtml(ev.empresa)}" placeholder="Nombre o ID de empresa" />
      </div>
    </div>

    <details class="mt-3">
      <summary class="muted text-sm" style="cursor:pointer">Detalles administrativos (envío, cotización, OC, folios)</summary>
      <div class="grid grid-2 mt-3">
        <div class="field"><label class="field-label">N° envío</label><input class="input" id="ev-envio" value="${escapeHtml(ev.nEnvio)}" /></div>
        <div class="field"><label class="field-label">N° cotización</label><input class="input" id="ev-cot" value="${escapeHtml(ev.nCotizacion)}" /></div>
        <div class="field"><label class="field-label">N° OC</label><input class="input" id="ev-oc" value="${escapeHtml(ev.nOC)}" /></div>
        <div class="field"><label class="field-label">Folio</label><input class="input" id="ev-folio" value="${escapeHtml(ev.folio)}" /></div>
        <div class="field"><label class="field-label">Folio guía</label><input class="input" id="ev-folioguia" value="${escapeHtml(ev.folioGuia)}" /></div>
      </div>
    </details>

    <div class="field mt-3">
      <label class="field-label" for="ev-obs">Observación</label>
      <textarea class="textarea" id="ev-obs" rows="5" placeholder="Describí qué se hizo, qué se encontró, qué pendientes quedan…">${escapeHtml(ev.observacion)}</textarea>
      <span class="field-hint">Si quedan tareas pendientes, usá el botón <strong>Crear pendiente</strong>.</span>
    </div>

    <div class="mt-3 text-xs muted">
      ${ev.creadoEn ? `Registrado: ${new Date(ev.creadoEn).toLocaleString('es-CL')}` : ''}
      ${editId ? ` · ID interno: <code>${escapeHtml(ev.id)}</code>` : ''}
    </div>
  `;
}

function bindFields(modalEl, ev) { /* sin handlers extra por ahora */ }

function collect(modalEl, ev) {
  ev.tipo = modalEl.querySelector('#ev-tipo').value;
  ev.fecha = modalEl.querySelector('#ev-fecha').value;
  ev.resultado = modalEl.querySelector('#ev-result').value || null;
  ev.ejecutor = modalEl.querySelector('#ev-ejec').value.trim();
  ev.estado = modalEl.querySelector('#ev-estado').value || null;
  ev.empresa = modalEl.querySelector('#ev-empresa').value.trim();
  ev.nEnvio = modalEl.querySelector('#ev-envio').value.trim();
  ev.nCotizacion = modalEl.querySelector('#ev-cot').value.trim();
  ev.nOC = modalEl.querySelector('#ev-oc').value.trim();
  ev.folio = modalEl.querySelector('#ev-folio').value.trim();
  ev.folioGuia = modalEl.querySelector('#ev-folioguia').value.trim();
  ev.observacion = modalEl.querySelector('#ev-obs').value;
}

function validate(ev) {
  if (!ev.tipo) { toast({ message: 'Falta el tipo de evento.', kind: 'warn' }); return false; }
  if (!ev.fecha) { toast({ message: 'Falta la fecha.', kind: 'warn' }); return false; }
  if (ev.tipo === 'mp' && !ev.resultado) { toast({ message: 'En una MP el resultado es obligatorio.', kind: 'warn' }); return false; }
  return true;
}
