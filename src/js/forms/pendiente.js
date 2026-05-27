/* Form: crear / editar Pendiente con tareas y seguimientos */

import { state, upsertPendiente, findPendiente, allPendienteIds, savePersisted } from '../state.js';
import { escapeHtml, todayISO, timestampUid, uid, renderIcons, fmtDate } from '../utils.js';
import { openModal, toast, confirmDialog } from '../ui.js';
import { schedulePush } from '../data/gas.js';
import { openSeguimientoForm } from './seguimiento.js';

const ESTADOS = ['creado', 'abierto', 'cerrado'];

export function openPendienteForm(key, editId, onSaved, preset = null) {
  const eq = state.equipos.find(e => e.key === key);
  const existing = editId ? findPendiente(key, editId) : null;
  const p = existing ? deepCopy(existing) : {
    id: timestampUid(allPendienteIds()),
    descripcion: preset?.descripcion || '',
    fecha: preset?.fecha || todayISO(),
    fechaCompromiso: '',
    proximoRecordatorio: '',
    fechaCierre: '',
    ejecutor: preset?.ejecutor || state.prefs.miUsuario || '',
    estado: 'abierto',
    tareas: [],
    actualizaciones: [],
    archivos: [],
    eventoId: preset?.eventoId || null   // trazabilidad: pendiente creado desde un evento
  };

  const footer = `
    ${editId ? '<button class="btn btn-danger" id="btn-del" type="button"><i data-lucide="trash-2"></i> Eliminar</button><span class="grow"></span>' : ''}
    <button class="btn cancel" type="button">Cancelar</button>
    <button class="btn btn-primary" id="btn-save" type="submit">Guardar</button>
  `;

  const modal = openModal({
    title: editId ? 'Editar pendiente' : 'Nuevo pendiente',
    size: 'lg',
    body: bodyHTML(p, eq),
    footer
  });
  renderIcons();
  bindLocal(modal.modalEl, p, () => {
    modal.bodyEl.innerHTML = bodyHTML(p, eq);
    renderIcons();
    bindLocal(modal.modalEl, p, () => {});
  });

  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#btn-save').addEventListener('click', () => {
    collect(modal.modalEl, p);
    if (!validate(p)) return;
    upsertPendiente(key, p);
    schedulePush();
    toast({ message: editId ? 'Pendiente actualizado.' : 'Pendiente creado.', kind: 'ok' });
    modal.close();
    onSaved?.();
  });
  modal.footer.querySelector('#btn-del')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar pendiente', message: '¿Eliminar este pendiente y sus seguimientos?', danger: true, confirmLabel: 'Eliminar' });
    if (!ok) return;
    const arr = state.pendientes[key] || [];
    const idx = arr.findIndex(x => x.id === p.id);
    if (idx < 0) return;
    const removed = arr.splice(idx, 1)[0];
    if (!arr.length) delete state.pendientes[key];
    savePersisted(); schedulePush();
    modal.close();
    toast({
      message: 'Pendiente eliminado.', kind: 'ok', durationMs: 6500,
      action: { label: 'Deshacer', onClick: () => {
        if (!state.pendientes[key]) state.pendientes[key] = [];
        state.pendientes[key].splice(idx, 0, removed);
        savePersisted(); schedulePush();
        onSaved?.();
      }}
    });
    onSaved?.();
  });
}

function bodyHTML(p, eq) {
  const linkBadge = p.eventoId
    ? `<span class="badge badge-accent" title="Pendiente vinculado a un evento"><i data-lucide="link" style="width:12px;height:12px"></i> Desde evento <code>${escapeHtml(p.eventoId)}</code></span>`
    : '';
  return `
    ${eq ? `<div class="row mb-3" style="gap:8px;flex-wrap:wrap;align-items:center">
      <span class="muted text-sm">Para: <strong>${escapeHtml(eq.equipo || '—')}</strong> · ${escapeHtml(eq.inv || eq.id || '')}</span>
      ${linkBadge}
    </div>` : ''}

    <div class="field mb-3">
      <label class="field-label" for="p-desc">Descripción <span style="color:var(--c-danger)">*</span></label>
      <textarea class="textarea" id="p-desc" rows="3" placeholder="Qué hay que hacer, decisión a tomar, lo que falta…">${escapeHtml(p.descripcion)}</textarea>
    </div>

    <div class="grid grid-2">
      <div class="field">
        <label class="field-label" for="p-fcom">Fecha compromiso</label>
        <input class="input" type="date" id="p-fcom" value="${escapeHtml(p.fechaCompromiso || '')}" />
      </div>
      <div class="field">
        <label class="field-label" for="p-frec">Próximo recordatorio</label>
        <input class="input" type="date" id="p-frec" value="${escapeHtml(p.proximoRecordatorio || '')}" />
      </div>
      <div class="field">
        <label class="field-label" for="p-ejec">Responsable</label>
        <input class="input" id="p-ejec" value="${escapeHtml(p.ejecutor || '')}" placeholder="Nombre" />
      </div>
      <div class="field">
        <label class="field-label" for="p-estado">Estado</label>
        <select class="select" id="p-estado">
          ${ESTADOS.map(e => `<option value="${e}" ${p.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="mt-4">
      <div class="row-between mb-2">
        <h4>Tareas</h4>
        <button class="btn btn-sm" id="t-add" type="button"><i data-lucide="plus"></i> Agregar tarea</button>
      </div>
      <div id="t-list">
        ${(p.tareas || []).map((t, i) => taskRow(t, i)).join('') || '<p class="muted text-sm">Sin tareas.</p>'}
      </div>
    </div>

    <div class="mt-4">
      <div class="row-between mb-2">
        <h4>Seguimientos</h4>
        <button class="btn btn-sm" id="s-add" type="button"><i data-lucide="message-square-plus"></i> Agregar seguimiento</button>
      </div>
      <div id="s-list">
        ${(p.actualizaciones || []).slice().sort((a,b) => (b.fecha||'').localeCompare(a.fecha||'')).map(a => seguimRow(a)).join('') || '<p class="muted text-sm">Sin seguimientos.</p>'}
      </div>
    </div>
  `;
}

function taskRow(t, i) {
  return `
    <div class="list-item" data-tid="${escapeHtml(t.id)}">
      <label class="check"><input type="checkbox" ${t.estado === 'cerrado' ? 'checked' : ''} class="t-check" /></label>
      <input class="input grow" value="${escapeHtml(t.descripcion || '')}" data-t-desc placeholder="Descripción de la tarea" />
      <button class="btn btn-sm btn-danger" data-t-del type="button"><i data-lucide="trash-2"></i></button>
    </div>
  `;
}

function seguimRow(a) {
  return `
    <div class="card mb-2" style="padding:10px">
      <div class="row-between">
        <div>
          <span class="badge">${escapeHtml(a.tipo || 'avance')}</span>
          <span class="text-xs muted">${fmtDate(a.fecha)} ${a.contactadoA ? '· ' + escapeHtml(a.contactadoA) : ''}</span>
        </div>
      </div>
      ${a.texto ? `<div class="mt-1 text-sm">${escapeHtml(a.texto).replace(/\n/g,'<br>')}</div>` : ''}
    </div>
  `;
}

function bindLocal(modalEl, p, refresh) {
  modalEl.querySelector('#t-add')?.addEventListener('click', () => {
    p.tareas = p.tareas || [];
    p.tareas.push({ id: 't-' + uid(), descripcion: '', estado: 'abierto' });
    refresh();
  });
  modalEl.querySelectorAll('[data-tid]').forEach(el => {
    const tid = el.dataset.tid;
    const t = p.tareas.find(x => x.id === tid);
    if (!t) return;
    el.querySelector('.t-check')?.addEventListener('change', e => {
      t.estado = e.target.checked ? 'cerrado' : 'abierto';
    });
    el.querySelector('[data-t-desc]')?.addEventListener('input', e => {
      t.descripcion = e.target.value;
    });
    el.querySelector('[data-t-del]')?.addEventListener('click', () => {
      p.tareas = p.tareas.filter(x => x.id !== tid);
      refresh();
    });
  });
  modalEl.querySelector('#s-add')?.addEventListener('click', () => {
    openSeguimientoForm(null, null, (seg) => {
      p.actualizaciones = p.actualizaciones || [];
      p.actualizaciones.push(seg);
      refresh();
    });
  });
}

function collect(modalEl, p) {
  p.descripcion = modalEl.querySelector('#p-desc').value.trim();
  p.fechaCompromiso = modalEl.querySelector('#p-fcom').value || '';
  p.proximoRecordatorio = modalEl.querySelector('#p-frec').value || '';
  p.ejecutor = modalEl.querySelector('#p-ejec').value.trim();
  p.estado = modalEl.querySelector('#p-estado').value;
  if (p.estado === 'cerrado' && !p.fechaCierre) p.fechaCierre = todayISO();
  if (p.estado !== 'cerrado') p.fechaCierre = '';
}

function validate(p) {
  if (!p.descripcion) { toast({ message: 'La descripción es obligatoria.', kind: 'warn' }); return false; }
  return true;
}

function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
