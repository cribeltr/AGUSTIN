/* Vista: Agenda — Servicios / Centros de Responsabilidad / Directorio / Empresas */

import { state, savePersisted, ensureAgendaShape } from '../state.js';
import { escapeHtml, val, uid, renderIcons } from '../utils.js';
import { openModal, toast, confirmDialog, emptyState } from '../ui.js';
import { schedulePush } from '../data/gas.js';
import { navigate, refreshActiveView } from '../router.js';

export function renderAgenda(root, params = {}) {
  ensureAgendaShape();
  const tab = params.tab || 'servicios';
  const q = params.q || '';

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>Agenda</h2>
        <p class="muted">Contactos por servicio, centros de responsabilidad, directorio externo y proveedores.</p>
      </div>
    </div>

    <div class="tabs" role="tablist">
      ${tabBtn('servicios', 'Servicios', tab, Object.keys(state.agenda.servicios).length)}
      ${tabBtn('centros', 'Centros', tab, state.agenda.centros.length)}
      ${tabBtn('directorio', 'Directorio', tab, state.agenda.directorio.length)}
      ${tabBtn('empresas', 'Empresas', tab, state.agenda.empresas.length)}
    </div>

    <div class="filter-bar">
      <div class="search-input grow">
        <i data-lucide="search"></i>
        <input class="input" id="ag-q" placeholder="Buscar…" value="${escapeHtml(q)}" />
      </div>
      <button class="btn btn-primary" id="ag-add"><i data-lucide="plus"></i> Agregar</button>
    </div>

    <div id="ag-body"></div>
  `;
  renderIcons();

  root.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => navigate('agenda', { tab: t.dataset.tab })));
  root.querySelector('#ag-q').addEventListener('input', e => {
    const v = e.target.value;
    clearTimeout(window.__agq);
    window.__agq = setTimeout(() => navigate('agenda', { tab, q: v }), 200);
  });
  root.querySelector('#ag-add').addEventListener('click', () => addForm(tab));

  renderBody(root.querySelector('#ag-body'), tab, q);
}

function tabBtn(key, label, current, count) {
  return `<button class="tab" role="tab" data-tab="${key}" aria-selected="${current === key}">${escapeHtml(label)} <span class="badge" style="margin-left:6px">${count}</span></button>`;
}

function renderBody(el, tab, q) {
  if (tab === 'servicios') renderServicios(el, q);
  else if (tab === 'centros') renderCentros(el, q);
  else if (tab === 'directorio') renderDirectorio(el, q);
  else if (tab === 'empresas') renderEmpresas(el, q);
}

/* ---------- Servicios ---------- */
function renderServicios(el, q) {
  const ql = q.toLowerCase();
  const entries = Object.entries(state.agenda.servicios)
    .filter(([s]) => !ql || s.toLowerCase().includes(ql))
    .sort((a,b) => a[0].localeCompare(b[0]));
  if (!entries.length) {
    el.innerHTML = emptyState({
      icon: 'users',
      title: 'Sin servicios en la agenda',
      text: 'Los servicios aparecen acá cuando hay equipos asignados, o creá uno manualmente con "Agregar".'
    });
    renderIcons();
    return;
  }
  el.innerHTML = entries.map(([srv, data]) => {
    const sup = data.supervisor || {};
    const enc = data.encargado || {};
    const otros = data.otros || [];
    const cr = (state.agenda.centros || []).find(c => (c.servicios || []).includes(srv));
    return `
      <div class="card mb-3">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(srv)}</div>
            ${cr ? `<div class="card-subtle">CR: ${escapeHtml(cr.nombre)}</div>` : ''}
          </div>
          <button class="btn btn-sm" data-edit-srv="${escapeHtml(srv)}"><i data-lucide="pencil"></i> Editar</button>
        </div>
        <div class="grid grid-2">
          ${contactBlock('Supervisor', sup)}
          ${contactBlock('Encargado', enc)}
        </div>
        ${otros.length ? `
          <div class="mt-3">
            <div class="text-xs muted mb-2">Otros contactos</div>
            ${otros.map(o => contactBlock(o.rol || 'Contacto', o, srv, o.id)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  renderIcons();
  el.querySelectorAll('[data-edit-srv]').forEach(b => b.addEventListener('click', () => editServicio(b.dataset.editSrv)));
}

function contactBlock(label, c, srv, otroId) {
  if (!c || !(c.nombre || c.email || c.anexo || c.celular)) {
    return `<div class="text-sm muted"><strong>${escapeHtml(label)}:</strong> —</div>`;
  }
  return `
    <div class="text-sm">
      <div class="text-xs muted">${escapeHtml(label)}</div>
      <div class="semibold">${escapeHtml(c.nombre || '—')}</div>
      <div class="muted">${escapeHtml(c.email || '')} ${c.anexo ? '· anexo ' + escapeHtml(c.anexo) : ''} ${c.celular ? '· ' + escapeHtml(c.celular) : ''}</div>
    </div>
  `;
}

function editServicio(srv) {
  const data = state.agenda.servicios[srv] || { supervisor: null, encargado: null, otros: [] };
  const footer = `<button class="btn cancel" type="button">Cancelar</button><button class="btn btn-primary" id="srv-save">Guardar</button>`;
  const modal = openModal({
    title: 'Editar servicio: ' + srv,
    size: 'md',
    body: `
      <h4 class="mb-2">Supervisor</h4>
      ${contactFields(data.supervisor || {}, 'sup')}
      <h4 class="mt-4 mb-2">Encargado de equipos</h4>
      ${contactFields(data.encargado || {}, 'enc')}
    `,
    footer
  });
  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#srv-save').addEventListener('click', () => {
    data.supervisor = readContact(modal.modalEl, 'sup');
    data.encargado = readContact(modal.modalEl, 'enc');
    state.agenda.servicios[srv] = data;
    savePersisted(); schedulePush();
    toast({ message: 'Servicio guardado.', kind: 'ok' });
    modal.close();
    refreshActiveView();
  });
}

function contactFields(c, p) {
  return `
    <div class="grid grid-2">
      <div class="field"><label class="field-label">Nombre</label><input class="input" id="${p}-nombre" value="${escapeHtml(c.nombre || '')}" /></div>
      <div class="field"><label class="field-label">Email</label><input class="input" type="email" id="${p}-email" value="${escapeHtml(c.email || '')}" /></div>
      <div class="field"><label class="field-label">Anexo</label><input class="input" id="${p}-anexo" value="${escapeHtml(c.anexo || '')}" /></div>
      <div class="field"><label class="field-label">Celular</label><input class="input" id="${p}-cel" value="${escapeHtml(c.celular || '')}" /></div>
    </div>
  `;
}

function readContact(modalEl, p) {
  return {
    nombre: modalEl.querySelector('#' + p + '-nombre').value.trim(),
    email: modalEl.querySelector('#' + p + '-email').value.trim(),
    anexo: modalEl.querySelector('#' + p + '-anexo').value.trim(),
    celular: modalEl.querySelector('#' + p + '-cel').value.trim()
  };
}

/* ---------- Centros (CR) ---------- */
function renderCentros(el, q) {
  const ql = q.toLowerCase();
  const list = (state.agenda.centros || []).filter(c => !ql || c.nombre.toLowerCase().includes(ql));
  if (!list.length) {
    el.innerHTML = emptyState({ icon: 'building', title: 'Sin centros', text: 'Creá tu primer Centro de Responsabilidad.' });
    renderIcons();
    return;
  }
  el.innerHTML = list.map(cr => `
    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">${escapeHtml(cr.nombre)}</div>
          <div class="card-subtle">Servicios: ${(cr.servicios||[]).map(escapeHtml).join(', ') || '—'}</div>
        </div>
        <div class="row">
          <button class="btn btn-sm" data-edit-cr="${escapeHtml(cr.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-sm btn-danger" data-del-cr="${escapeHtml(cr.id)}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      ${cr.jefe ? contactBlock('Jefe CR', cr.jefe) : '<div class="text-sm muted">Sin jefe asignado</div>'}
    </div>
  `).join('');
  renderIcons();
  el.querySelectorAll('[data-edit-cr]').forEach(b => b.addEventListener('click', () => editCR(b.dataset.editCr)));
  el.querySelectorAll('[data-del-cr]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar CR', message: '¿Eliminar este Centro de Responsabilidad?', danger: true, confirmLabel: 'Eliminar' });
    if (!ok) return;
    state.agenda.centros = state.agenda.centros.filter(x => x.id !== b.dataset.delCr);
    savePersisted(); schedulePush();
    refreshActiveView();
  }));
}

function editCR(crId) {
  const cr = (state.agenda.centros || []).find(c => c.id === crId) || { id: 'cr-' + uid(), nombre: '', jefe: {}, servicios: [] };
  const isNew = !state.agenda.centros.some(c => c.id === cr.id);
  const allServicios = [...new Set(state.equipos.map(e => e.servicio).filter(Boolean))].sort();
  const footer = `<button class="btn cancel" type="button">Cancelar</button><button class="btn btn-primary" id="cr-save">Guardar</button>`;
  const modal = openModal({
    title: isNew ? 'Nuevo Centro de Responsabilidad' : 'Editar CR',
    size: 'md',
    body: `
      <div class="field mb-3"><label class="field-label">Nombre</label><input class="input" id="cr-nombre" value="${escapeHtml(cr.nombre || '')}" /></div>
      <h4 class="mb-2">Jefe del CR</h4>
      ${contactFields(cr.jefe || {}, 'cr')}
      <h4 class="mt-4 mb-2">Servicios asignados</h4>
      <div class="col" style="max-height:220px; overflow-y:auto; border:1px solid var(--c-border); border-radius:var(--r-md); padding:8px">
        ${allServicios.map(s => `
          <label class="check"><input type="checkbox" value="${escapeHtml(s)}" ${(cr.servicios||[]).includes(s) ? 'checked' : ''} class="cr-srv" /> ${escapeHtml(s)}</label>
        `).join('') || '<p class="muted text-sm">Cargá equipos para listar servicios.</p>'}
      </div>
    `,
    footer
  });
  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#cr-save').addEventListener('click', () => {
    cr.nombre = modal.modalEl.querySelector('#cr-nombre').value.trim();
    if (!cr.nombre) { toast({ message: 'El nombre es obligatorio.', kind: 'warn' }); return; }
    cr.jefe = readContact(modal.modalEl, 'cr');
    cr.servicios = [...modal.modalEl.querySelectorAll('.cr-srv:checked')].map(c => c.value);
    if (isNew) state.agenda.centros.push(cr);
    savePersisted(); schedulePush();
    toast({ message: 'Centro guardado.', kind: 'ok' });
    modal.close();
    refreshActiveView();
  });
}

/* ---------- Directorio ---------- */
function renderDirectorio(el, q) {
  const ql = q.toLowerCase();
  const list = (state.agenda.directorio || []).filter(d => !ql || (d.nombre + d.organizacion + d.email).toLowerCase().includes(ql));
  if (!list.length) {
    el.innerHTML = emptyState({ icon: 'book-user', title: 'Directorio vacío', text: 'Agregá referentes externos (proveedores, organismos, etc.)' });
    renderIcons();
    return;
  }
  el.innerHTML = list.map(d => `
    <div class="card mb-2">
      <div class="card-header">
        <div>
          <div class="card-title">${escapeHtml(d.nombre || '—')}</div>
          <div class="card-subtle">${escapeHtml(d.categoria || '')} ${d.organizacion ? '· ' + escapeHtml(d.organizacion) : ''}</div>
        </div>
        <div class="row">
          <button class="btn btn-sm" data-edit-dir="${escapeHtml(d.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-sm btn-danger" data-del-dir="${escapeHtml(d.id)}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="text-sm muted">${escapeHtml(d.email || '')} ${d.telefono ? '· ' + escapeHtml(d.telefono) : ''}</div>
      ${d.notas ? `<div class="text-sm mt-2">${escapeHtml(d.notas)}</div>` : ''}
    </div>
  `).join('');
  renderIcons();
  el.querySelectorAll('[data-edit-dir]').forEach(b => b.addEventListener('click', () => editDirectorio(b.dataset.editDir)));
  el.querySelectorAll('[data-del-dir]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar', message: '¿Eliminar entrada del directorio?', danger: true, confirmLabel: 'Eliminar' });
    if (!ok) return;
    state.agenda.directorio = state.agenda.directorio.filter(x => x.id !== b.dataset.delDir);
    savePersisted(); schedulePush();
    refreshActiveView();
  }));
}

function editDirectorio(id) {
  const d = (state.agenda.directorio || []).find(x => x.id === id) || { id: 'd-' + uid() };
  const isNew = !state.agenda.directorio.some(x => x.id === d.id);
  const footer = `<button class="btn cancel">Cancelar</button><button class="btn btn-primary" id="d-save">Guardar</button>`;
  const modal = openModal({
    title: isNew ? 'Nueva entrada de directorio' : 'Editar entrada',
    size: 'md',
    body: `
      <div class="grid grid-2">
        <div class="field"><label class="field-label">Nombre</label><input class="input" id="d-nombre" value="${escapeHtml(d.nombre || '')}" /></div>
        <div class="field"><label class="field-label">Categoría</label><input class="input" id="d-cat" value="${escapeHtml(d.categoria || '')}" /></div>
        <div class="field"><label class="field-label">Organización</label><input class="input" id="d-org" value="${escapeHtml(d.organizacion || '')}" /></div>
        <div class="field"><label class="field-label">Email</label><input class="input" type="email" id="d-email" value="${escapeHtml(d.email || '')}" /></div>
        <div class="field"><label class="field-label">Teléfono</label><input class="input" id="d-tel" value="${escapeHtml(d.telefono || '')}" /></div>
      </div>
      <div class="field mt-3"><label class="field-label">Notas</label><textarea class="textarea" id="d-notas" rows="3">${escapeHtml(d.notas || '')}</textarea></div>
    `,
    footer
  });
  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#d-save').addEventListener('click', () => {
    Object.assign(d, {
      nombre: modal.modalEl.querySelector('#d-nombre').value.trim(),
      categoria: modal.modalEl.querySelector('#d-cat').value.trim(),
      organizacion: modal.modalEl.querySelector('#d-org').value.trim(),
      email: modal.modalEl.querySelector('#d-email').value.trim(),
      telefono: modal.modalEl.querySelector('#d-tel').value.trim(),
      notas: modal.modalEl.querySelector('#d-notas').value.trim()
    });
    if (!d.nombre) { toast({ message: 'El nombre es obligatorio.', kind: 'warn' }); return; }
    if (isNew) state.agenda.directorio.push(d);
    savePersisted(); schedulePush();
    toast({ message: 'Entrada guardada.', kind: 'ok' });
    modal.close();
    refreshActiveView();
  });
}

/* ---------- Empresas ---------- */
function renderEmpresas(el, q) {
  const ql = q.toLowerCase();
  const list = (state.agenda.empresas || []).filter(e => !ql || e.nombre.toLowerCase().includes(ql));
  if (!list.length) {
    el.innerHTML = emptyState({ icon: 'briefcase', title: 'Sin empresas proveedoras', text: 'Agregá empresas que provean servicios técnicos.' });
    renderIcons();
    return;
  }
  el.innerHTML = list.map(e => `
    <div class="card mb-3">
      <div class="card-header">
        <div>
          <div class="card-title">${escapeHtml(e.nombre)}</div>
          <div class="card-subtle">${escapeHtml(e.direccion || '')}</div>
        </div>
        <div class="row">
          <button class="btn btn-sm" data-edit-emp="${escapeHtml(e.id)}"><i data-lucide="pencil"></i></button>
          <button class="btn btn-sm btn-danger" data-del-emp="${escapeHtml(e.id)}"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      ${(e.contactos || []).length ? `
        <div class="mt-2">
          ${e.contactos.map(c => `
            <div class="list-item">
              <div class="item-main">
                <div class="item-title">${escapeHtml(c.nombre || '—')}${c.cargo ? ' · ' + escapeHtml(c.cargo) : ''}</div>
                <div class="item-meta">${escapeHtml(c.email || '')} ${c.telefono ? '· ' + escapeHtml(c.telefono) : ''} ${c.celular ? '· ' + escapeHtml(c.celular) : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div class="text-sm muted mt-2">Sin contactos</div>'}
    </div>
  `).join('');
  renderIcons();
  el.querySelectorAll('[data-edit-emp]').forEach(b => b.addEventListener('click', () => editEmpresa(b.dataset.editEmp)));
  el.querySelectorAll('[data-del-emp]').forEach(b => b.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Eliminar empresa', message: '¿Eliminar esta empresa y sus contactos?', danger: true, confirmLabel: 'Eliminar' });
    if (!ok) return;
    state.agenda.empresas = state.agenda.empresas.filter(x => x.id !== b.dataset.delEmp);
    savePersisted(); schedulePush();
    refreshActiveView();
  }));
}

function editEmpresa(id) {
  const e = (state.agenda.empresas || []).find(x => x.id === id) || { id: 'e-' + uid(), contactos: [] };
  const isNew = !state.agenda.empresas.some(x => x.id === e.id);
  const work = JSON.parse(JSON.stringify(e));
  const footer = `<button class="btn cancel">Cancelar</button><button class="btn btn-primary" id="e-save">Guardar</button>`;
  const modal = openModal({
    title: isNew ? 'Nueva empresa' : 'Editar empresa',
    size: 'md',
    body: empresaBody(work),
    footer
  });
  const refresh = () => { modal.bodyEl.innerHTML = empresaBody(work); renderIcons(); bindContactos(); };
  const bindContactos = () => {
    modal.modalEl.querySelector('#e-add-c').addEventListener('click', () => {
      work.contactos = work.contactos || [];
      work.contactos.push({ id: 'c-' + uid(), nombre: '', cargo: '', email: '', telefono: '', celular: '' });
      refresh();
    });
    modal.modalEl.querySelectorAll('[data-c-del]').forEach(b => b.addEventListener('click', () => {
      work.contactos = work.contactos.filter(x => x.id !== b.dataset.cDel);
      refresh();
    }));
  };
  renderIcons();
  bindContactos();
  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#e-save').addEventListener('click', () => {
    work.nombre = modal.modalEl.querySelector('#e-nombre').value.trim();
    work.direccion = modal.modalEl.querySelector('#e-dir').value.trim();
    if (!work.nombre) { toast({ message: 'El nombre es obligatorio.', kind: 'warn' }); return; }
    (work.contactos || []).forEach(c => {
      const row = modal.modalEl.querySelector(`[data-cid="${c.id}"]`);
      if (!row) return;
      c.nombre = row.querySelector('[data-c-nombre]').value.trim();
      c.cargo  = row.querySelector('[data-c-cargo]').value.trim();
      c.email  = row.querySelector('[data-c-email]').value.trim();
      c.telefono = row.querySelector('[data-c-tel]').value.trim();
      c.celular = row.querySelector('[data-c-cel]').value.trim();
    });
    Object.assign(e, work);
    if (isNew) state.agenda.empresas.push(e);
    savePersisted(); schedulePush();
    toast({ message: 'Empresa guardada.', kind: 'ok' });
    modal.close();
    refreshActiveView();
  });
}

function empresaBody(e) {
  return `
    <div class="grid grid-2 mb-3">
      <div class="field"><label class="field-label">Nombre</label><input class="input" id="e-nombre" value="${escapeHtml(e.nombre || '')}" /></div>
      <div class="field"><label class="field-label">Dirección</label><input class="input" id="e-dir" value="${escapeHtml(e.direccion || '')}" /></div>
    </div>
    <div class="row-between mb-2">
      <h4>Contactos</h4>
      <button class="btn btn-sm" id="e-add-c" type="button"><i data-lucide="plus"></i> Agregar</button>
    </div>
    ${(e.contactos || []).map(c => `
      <div class="card mb-2" data-cid="${escapeHtml(c.id)}" style="padding:10px">
        <div class="grid grid-2">
          <div class="field"><label class="field-label">Nombre</label><input class="input" data-c-nombre value="${escapeHtml(c.nombre)}" /></div>
          <div class="field"><label class="field-label">Cargo</label><input class="input" data-c-cargo value="${escapeHtml(c.cargo)}" /></div>
          <div class="field"><label class="field-label">Email</label><input class="input" data-c-email value="${escapeHtml(c.email)}" /></div>
          <div class="field"><label class="field-label">Teléfono</label><input class="input" data-c-tel value="${escapeHtml(c.telefono)}" /></div>
          <div class="field"><label class="field-label">Celular</label><input class="input" data-c-cel value="${escapeHtml(c.celular)}" /></div>
        </div>
        <div class="row" style="justify-content:flex-end; margin-top:6px">
          <button class="btn btn-sm btn-danger" data-c-del="${escapeHtml(c.id)}" type="button"><i data-lucide="trash-2"></i> Quitar</button>
        </div>
      </div>
    `).join('')}
  `;
}

function addForm(tab) {
  if (tab === 'centros') editCR(null);
  else if (tab === 'directorio') editDirectorio(null);
  else if (tab === 'empresas') editEmpresa(null);
  else toast({ message: 'Los servicios se crean asignando equipos a un servicio en el archivo Excel.', kind: 'info' });
}
