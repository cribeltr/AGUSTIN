/* UI primitives — Toast (con Deshacer), Modal stack, Loading overlay, Confirm */

import { escapeHtml, renderIcons } from './utils.js';

/* ============================================================
   TOAST con acción "Deshacer"
   ============================================================ */
const TOAST_HOST_ID = 'toast-stack';
function toastHost() {
  let host = document.getElementById(TOAST_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = TOAST_HOST_ID;
    host.className = 'toast-stack';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

/**
 * toast({ message, kind, action?, durationMs? })
 * kind: 'ok' | 'warn' | 'danger' | 'info'
 * action: { label, onClick } — opcional; útil para Deshacer
 */
export function toast({ message, kind = 'info', action, durationMs = 4500 }) {
  const host = toastHost();
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  const icon = kind === 'ok' ? 'check-circle-2' : kind === 'warn' ? 'alert-triangle' : kind === 'danger' ? 'alert-octagon' : 'info';
  el.innerHTML = `
    <i data-lucide="${icon}" aria-hidden="true"></i>
    <div class="toast-body">${escapeHtml(message)}</div>
    ${action ? `<button type="button" class="toast-action">${escapeHtml(action.label)}</button>` : ''}
    <button type="button" class="toast-close btn-ghost btn-icon btn-sm" aria-label="Cerrar"><i data-lucide="x"></i></button>
  `;
  host.appendChild(el);
  renderIcons();

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    el.style.transition = 'opacity 180ms, transform 180ms';
    el.style.opacity = '0';
    el.style.transform = 'translateX(12px)';
    setTimeout(() => el.remove(), 200);
  };

  el.querySelector('.toast-close')?.addEventListener('click', dismiss);
  if (action) {
    el.querySelector('.toast-action')?.addEventListener('click', () => {
      try { action.onClick?.(); } catch(e) { console.error(e); }
      dismiss();
    });
  }
  const t = setTimeout(dismiss, durationMs);
  return { dismiss: () => { clearTimeout(t); dismiss(); } };
}

/* ============================================================
   MODAL stack — sin anidación visual: el modal nuevo reemplaza
   al anterior con animación; al cerrar, vuelve.
   ============================================================ */
const MODAL_HOST_ID = 'modal-host';
const modalStack = [];

function modalHost() {
  let host = document.getElementById(MODAL_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = MODAL_HOST_ID;
    document.body.appendChild(host);
  }
  return host;
}

/**
 * openModal({ title, body, size, footer, onClose })
 * body: HTML string o función que recibe el contenedor body y lo rellena
 * footer: HTML string opcional para botones (la X ya está en el header)
 * size: 'sm' | 'md' (default) | 'lg'
 * returns: { close(), bodyEl, modalEl }
 */
export function openModal({ title = '', body = '', size = 'md', footer = '', onClose, dismissible = true } = {}) {
  const host = modalHost();
  /* Si hay un modal previo, lo ocultamos (no destruimos) */
  if (modalStack.length) {
    const prev = modalStack[modalStack.length - 1];
    prev.backdropEl.style.display = 'none';
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  if (title) backdrop.setAttribute('aria-label', title);

  const sizeCls = size === 'lg' ? 'modal-lg' : size === 'sm' ? 'modal-sm' : '';
  backdrop.innerHTML = `
    <div class="modal ${sizeCls}" tabindex="-1">
      ${title ? `
        <div class="modal-header">
          <h2 class="modal-title">${escapeHtml(title)}</h2>
          <button type="button" class="btn-ghost btn-icon btn-sm modal-close" aria-label="Cerrar"><i data-lucide="x"></i></button>
        </div>
      ` : ''}
      <div class="modal-body"></div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;
  host.appendChild(backdrop);
  const modalEl  = backdrop.querySelector('.modal');
  const bodyEl   = backdrop.querySelector('.modal-body');
  if (typeof body === 'function') body(bodyEl);
  else bodyEl.innerHTML = body;
  renderIcons();

  /* Foco inicial */
  setTimeout(() => {
    const focusable = modalEl.querySelector('input, select, textarea, button:not(.modal-close)');
    (focusable || modalEl).focus();
  }, 60);

  const entry = { backdropEl: backdrop, modalEl, bodyEl, onClose };
  modalStack.push(entry);

  const close = () => {
    const idx = modalStack.indexOf(entry);
    if (idx < 0) return;
    modalStack.splice(idx, 1);
    backdrop.style.transition = 'opacity 160ms';
    backdrop.style.opacity = '0';
    setTimeout(() => {
      backdrop.remove();
      try { onClose?.(); } catch(e) { console.error(e); }
      /* Restaurar el anterior si existe */
      if (modalStack.length) {
        const prev = modalStack[modalStack.length - 1];
        prev.backdropEl.style.display = '';
      }
    }, 170);
  };

  if (dismissible) {
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    backdrop.querySelector('.modal-close')?.addEventListener('click', close);
  }

  return { close, bodyEl, modalEl, footer: backdrop.querySelector('.modal-footer') };
}

export function closeAllModals() {
  [...modalStack].reverse().forEach(m => m.backdropEl.remove());
  modalStack.length = 0;
}

/* Captura Escape para cerrar modal superior */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!modalStack.length) return;
  const top = modalStack[modalStack.length - 1];
  /* Si el modal tiene un .modal-close, simulamos clic para mantener la animación */
  const btn = top.modalEl.querySelector('.modal-close');
  if (btn) btn.click();
});

/* ============================================================
   CONFIRM — confirmación bloqueante simple (modal-sm)
   ============================================================ */
export function confirmDialog({ title = 'Confirmar', message = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise(resolve => {
    const footer = `
      <button type="button" class="btn cancel">${escapeHtml(cancelLabel)}</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm">${escapeHtml(confirmLabel)}</button>
    `;
    const m = openModal({
      title,
      size: 'sm',
      body: `<p>${escapeHtml(message)}</p>`,
      footer,
      onClose: () => resolve(false)
    });
    m.footer.querySelector('.cancel').addEventListener('click', () => { m.close(); });
    m.footer.querySelector('.confirm').addEventListener('click', () => {
      resolve(true);
      /* Borra el handler del onClose para evitar resolve doble */
      m.modalEl.parentElement.onClose = null;
      m.close();
    });
  });
}

/* ============================================================
   LOADING overlay (fullscreen)
   ============================================================ */
let loadingEl = null;
export function showLoading(message = 'Cargando…', sub = '') {
  if (loadingEl) {
    loadingEl.querySelector('.loading-msg').textContent = message;
    loadingEl.querySelector('.loading-sub').textContent = sub;
    return;
  }
  loadingEl = document.createElement('div');
  loadingEl.className = 'loading-overlay';
  loadingEl.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <div class="loading-msg semibold">${escapeHtml(message)}</div>
    <div class="loading-sub muted text-sm">${escapeHtml(sub)}</div>
  `;
  document.body.appendChild(loadingEl);
}
export function hideLoading() {
  if (!loadingEl) return;
  loadingEl.remove();
  loadingEl = null;
}

/* ============================================================
   Empty state helper
   ============================================================ */
export function emptyState({ icon = 'inbox', title, text, action }) {
  return `
    <div class="empty">
      <i data-lucide="${icon}"></i>
      <div class="empty-title">${escapeHtml(title || '')}</div>
      ${text ? `<div class="empty-text">${escapeHtml(text)}</div>` : ''}
      ${action ? `<button class="btn btn-primary" data-empty-action>${escapeHtml(action.label)}</button>` : ''}
    </div>
  `;
}
