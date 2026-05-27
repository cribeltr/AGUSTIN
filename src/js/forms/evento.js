/* Form: crear / editar Evento */

import { state, upsertEvento, findEvento, allEventoIds } from '../state.js';
import { escapeHtml, todayISO, timestampUid, renderIcons, val } from '../utils.js';
import { openModal, toast, confirmDialog } from '../ui.js';
import { schedulePush } from '../data/gas.js';

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

export function openEventoForm(key, editId, onSaved) {
  const eq = state.equipos.find(e => e.key === key);
  const existing = editId ? findEvento(key, editId) : null;
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
    archivos: []
  };

  const footer = `
    ${editId ? '<button class="btn btn-danger" id="btn-del" type="button"><i data-lucide="trash-2"></i> Eliminar</button><span class="grow"></span>' : ''}
    <button class="btn cancel" type="button">Cancelar</button>
    <button class="btn btn-primary" id="btn-save" type="submit">Guardar</button>
  `;

  const modal = openModal({
    title: editId ? 'Editar evento' : 'Nuevo evento',
    size: 'lg',
    body: bodyHTML(ev, eq),
    footer
  });
  renderIcons();
  bindFields(modal.modalEl, ev);

  modal.footer.querySelector('.cancel')?.addEventListener('click', modal.close);
  modal.footer.querySelector('#btn-save').addEventListener('click', () => {
    collect(modal.modalEl, ev);
    if (!validate(ev)) return;
    upsertEvento(key, ev);
    schedulePush();
    toast({ message: editId ? 'Evento actualizado.' : 'Evento registrado.', kind: 'ok' });
    modal.close();
    onSaved?.();
  });
  modal.footer.querySelector('#btn-del')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar evento', message: '¿Eliminar este evento?', danger: true, confirmLabel: 'Eliminar' });
    if (!ok) return;
    /* Eliminación con deshacer */
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

function bodyHTML(ev, eq) {
  return `
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
      <span class="field-hint">Las líneas que empiecen con <code>PENDIENTES:</code> se sugerirán como tareas a crear.</span>
    </div>
  `;
}

function bindFields(modalEl, ev) { /* solo handlers de UI */ }

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
