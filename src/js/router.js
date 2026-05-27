/* Router de vistas minimal — hash-based; persiste filtros via hash params */

const routes = new Map();
let currentView = null;

export function registerRoute(name, renderFn) {
  routes.set(name, renderFn);
}

export function navigate(name, params) {
  const hash = '#' + name + (params ? '?' + new URLSearchParams(params).toString() : '');
  if (location.hash !== hash) location.hash = hash;
  else render();
}

export function getCurrentView() { return currentView; }

export function getRouteParams() {
  const h = location.hash.slice(1);
  const q = h.indexOf('?');
  if (q < 0) return {};
  return Object.fromEntries(new URLSearchParams(h.slice(q + 1)));
}

function render() {
  const h = location.hash.slice(1) || 'hoy';
  const [name, query] = h.split('?');
  const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};
  const fn = routes.get(name) || routes.get('hoy');
  currentView = name;
  /* Mark active sidebar item */
  document.querySelectorAll('[data-route]').forEach(el => {
    el.setAttribute('aria-current', el.dataset.route === name ? 'page' : 'false');
  });
  /* Render into content area */
  const contentEl = document.getElementById('view-root');
  if (contentEl) {
    contentEl.innerHTML = '<div class="view"></div>';
    try { fn(contentEl.firstElementChild, params); }
    catch (err) {
      console.error(err);
      contentEl.firstElementChild.innerHTML = `<div class="empty"><div class="empty-title">Error al renderizar</div><div class="empty-text">${err.message}</div></div>`;
    }
  }
  /* Mark title in header */
  const titleEl = document.getElementById('header-title-text');
  if (titleEl) titleEl.textContent = ROUTE_TITLES[name] || name;
}

const ROUTE_TITLES = {
  hoy: 'Hoy',
  equipos: 'Equipos',
  pendientes: 'Pendientes',
  verificacion: 'Verificación de carga',
  agenda: 'Agenda',
  historial: 'Historial'
};

export function initRouter() {
  window.addEventListener('hashchange', render);
  render();
}

export function refreshActiveView() { render(); }
