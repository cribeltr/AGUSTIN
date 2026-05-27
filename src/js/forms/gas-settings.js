/* Modal de configuración del backend Google Apps Script */

import { gas, configureGas, pingGas, pushAll, pullAll, onGasStatus } from '../data/gas.js';
import { escapeHtml, renderIcons } from '../utils.js';
import { openModal, toast, confirmDialog, showLoading, hideLoading } from '../ui.js';

export function openGasSettings() {
  const footer = `<button class="btn cancel">Cerrar</button>`;
  const modal = openModal({
    title: 'Sincronización con Google Sheets',
    size: 'md',
    body: render(),
    footer
  });
  renderIcons();
  modal.footer.querySelector('.cancel').addEventListener('click', modal.close);

  const refresh = () => { modal.bodyEl.innerHTML = render(); renderIcons(); bind(); };
  const unsubscribe = onGasStatus(refresh);
  modal.modalEl.addEventListener('remove', unsubscribe);

  const bind = () => {
    modal.modalEl.querySelector('#gs-save').addEventListener('click', () => {
      configureGas({
        url: modal.modalEl.querySelector('#gs-url').value,
        autoSync: modal.modalEl.querySelector('#gs-auto').checked
      });
      toast({ message: 'Configuración guardada.', kind: 'ok' });
      refresh();
    });
    modal.modalEl.querySelector('#gs-ping').addEventListener('click', async () => {
      try {
        showLoading('Probando conexión…');
        await pingGas(modal.modalEl.querySelector('#gs-url').value);
        hideLoading();
        toast({ message: 'Backend responde OK.', kind: 'ok' });
      } catch (err) {
        hideLoading();
        toast({ message: 'No respondió: ' + err.message, kind: 'danger' });
      }
    });
    modal.modalEl.querySelector('#gs-push').addEventListener('click', async () => {
      try {
        showLoading('Subiendo todo al backend…');
        await pushAll();
        hideLoading();
        toast({ message: 'Subida completa.', kind: 'ok' });
      } catch (err) {
        hideLoading();
        toast({ message: 'Falló: ' + err.message, kind: 'danger' });
      }
    });
    modal.modalEl.querySelector('#gs-pull').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Reemplazar datos locales',
        message: 'Esto reemplaza eventos / pendientes / agenda locales con lo que está en Sheets. ¿Continuar?',
        danger: true, confirmLabel: 'Reemplazar'
      });
      if (!ok) return;
      try {
        showLoading('Bajando datos del backend…');
        await pullAll();
        hideLoading();
        toast({ message: 'Datos actualizados desde Sheets.', kind: 'ok' });
        location.reload();
      } catch (err) {
        hideLoading();
        toast({ message: 'Falló: ' + err.message, kind: 'danger' });
      }
    });
  };
  bind();
}

function render() {
  const status = gas.status === 'ok' ? 'Conectado' : gas.status === 'pending' ? 'Pendiente de sync' : gas.status === 'syncing' ? 'Sincronizando…' : gas.status === 'error' ? 'Error' : 'Desactivado';
  const dotKind = gas.status === 'ok' ? 'dot-ok' : gas.status === 'error' ? 'dot-danger' : gas.status === 'syncing' ? 'dot-info dot-pulse' : 'dot';
  return `
    <div class="field mb-3">
      <label class="field-label" for="gs-url">URL de Web App (Apps Script)</label>
      <input class="input" id="gs-url" value="${escapeHtml(gas.url || '')}" placeholder="https://script.google.com/macros/s/AKfycb.../exec" />
      <span class="field-hint">Implementación: <strong>Aplicación web</strong>, ejecutar como <strong>Yo</strong>, acceso: <strong>Cualquiera</strong> o "con cuenta Google".</span>
    </div>
    <div class="mb-3">
      <label class="check"><input type="checkbox" id="gs-auto" ${gas.autoSync ? 'checked' : ''} /> Sincronizar automáticamente al guardar (recomendado)</label>
    </div>
    <div class="row mb-3" style="flex-wrap:wrap">
      <button class="btn" id="gs-save"><i data-lucide="save"></i> Guardar</button>
      <button class="btn" id="gs-ping"><i data-lucide="zap"></i> Probar conexión</button>
      <button class="btn" id="gs-push"><i data-lucide="upload-cloud"></i> Subir ahora</button>
      <button class="btn btn-danger" id="gs-pull"><i data-lucide="download-cloud"></i> Bajar y reemplazar</button>
    </div>
    <div class="card" style="padding:10px">
      <div class="row"><span class="dot ${dotKind}"></span><span class="semibold">${escapeHtml(status)}</span></div>
      <div class="text-xs muted mt-1">Último sync: ${gas.lastSync ? new Date(gas.lastSync).toLocaleString() : 'nunca'}</div>
      ${gas.lastError ? `<div class="text-xs" style="color:var(--c-danger); margin-top:4px">${escapeHtml(gas.lastError)}</div>` : ''}
    </div>
  `;
}
