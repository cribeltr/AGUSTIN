/* Form: agregar Seguimiento (actualización) a un pendiente */

import { uid, todayISO, escapeHtml, renderIcons } from '../utils.js';
import { openModal, toast } from '../ui.js';

const TIPOS = [
  ['avance',     'Avance'],
  ['delegacion', 'Delegación'],
  ['recordatorio','Recordatorio'],
  ['bloqueo',    'Bloqueo'],
  ['cierre',     'Cierre']
];

export function openSeguimientoForm(_keyUnused, _existingUnused, onSave) {
  const footer = `
    <button class="btn cancel" type="button">Cancelar</button>
    <button class="btn btn-primary" id="s-save" type="submit">Agregar</button>
  `;
  const modal = openModal({
    title: 'Nuevo seguimiento',
    size: 'sm',
    body: `
      <div class="field mb-3">
        <label class="field-label" for="s-tipo">Tipo</label>
        <select class="select" id="s-tipo">${TIPOS.map(([k,l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      </div>
      <div class="field mb-3">
        <label class="field-label" for="s-fecha">Fecha</label>
        <input class="input" type="date" id="s-fecha" value="${todayISO()}" />
      </div>
      <div class="field mb-3">
        <label class="field-label" for="s-contact">Contactado a</label>
        <input class="input" id="s-contact" placeholder="Persona contactada (opcional)" />
      </div>
      <div class="field">
        <label class="field-label" for="s-texto">Detalle</label>
        <textarea class="textarea" id="s-texto" rows="4" placeholder="Qué pasó, qué dijeron, próximos pasos…"></textarea>
      </div>
    `,
    footer
  });
  renderIcons();

  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);
  modal.footer.querySelector('#s-save').addEventListener('click', () => {
    const seg = {
      id: 's-' + uid(),
      tipo: modal.modalEl.querySelector('#s-tipo').value,
      fecha: modal.modalEl.querySelector('#s-fecha').value || todayISO(),
      contactadoA: modal.modalEl.querySelector('#s-contact').value.trim(),
      texto: modal.modalEl.querySelector('#s-texto').value.trim()
    };
    if (!seg.texto) { toast({ message: 'Escribí el detalle del seguimiento.', kind: 'warn' }); return; }
    modal.close();
    onSave?.(seg);
  });
}
