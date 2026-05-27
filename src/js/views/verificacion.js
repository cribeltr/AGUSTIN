/* Vista: Verificación de carga
   - Integridad del Excel: duplicados, parciales, headers que faltan
   - Discrepancias entre app y archivo (eventos faltantes/distintos)
   - Permite marcar discrepancias como sincronizadas
*/

import { state, savePersisted, saveSyncMarked } from '../state.js';
import { escapeHtml, val, renderIcons, fmtDate } from '../utils.js';
import { emptyState, toast } from '../ui.js';
import { schedulePush } from '../data/gas.js';
import { refreshActiveView } from '../router.js';

const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function computeIssues() {
  const issues = { faltaArchivo: [], distinto: [], soloArchivo: [] };
  state.equipos.forEach(eq => {
    if (eq.empty) return;
    const userEvs = state.eventos[eq.key] || [];
    /* Por cada evento de MP del usuario, ver si está en regRes del archivo */
    userEvs.forEach(ev => {
      if (ev.tipo !== 'mp' || !ev.fecha || !ev.resultado) return;
      const mes = parseInt(ev.fecha.slice(5, 7), 10) - 1;
      if (mes < 0 || mes > 11) return;
      const fileVal = eq.regRes[mes];
      const marker = `${eq.key}|${mes}|${ev.resultado}`;
      if (state.syncMarked.has(marker)) return;
      if (!fileVal) issues.faltaArchivo.push({ eq, ev, mes, marker });
      else if (fileVal !== ev.resultado) issues.distinto.push({ eq, ev, mes, fileVal, marker });
    });
    /* Y al revés: regRes existente sin evento del usuario */
    eq.regRes.forEach((res, mes) => {
      if (!res) return;
      const tiene = userEvs.some(ev => ev.tipo === 'mp' && ev.fecha && parseInt(ev.fecha.slice(5,7),10)-1 === mes);
      if (!tiene) {
        const marker = `solo|${eq.key}|${mes}|${res}`;
        if (state.syncMarked.has(marker)) return;
        issues.soloArchivo.push({ eq, mes, fileVal: res, marker });
      }
    });
  });
  return issues;
}

export function renderVerificacion(root) {
  if (!state.loaded) {
    root.innerHTML = emptyState({
      icon: 'file-spreadsheet',
      title: 'Sin archivo cargado',
      text: 'Cargá Programacion_MP_2026.xlsm para ver el reporte de verificación.'
    });
    renderIcons();
    return;
  }
  const v = state.verif || {};
  const issues = computeIssues();
  const issuesCount = issues.faltaArchivo.length + issues.distinto.length;

  root.innerHTML = `
    <div class="view-header">
      <div>
        <h2>Verificación de carga</h2>
        <p class="muted">${escapeHtml(state.fileName || '')} · cargado ${state.loadedAt ? fmtDate(state.loadedAt.slice(0,10)) : '—'}</p>
      </div>
    </div>

    <div class="grid grid-3 mb-4">
      ${kpi('Equipos válidos', v.validos || 0)}
      ${kpi('Familias', (v.familias || []).length)}
      ${kpi('Filas registro', v.regRows || 0)}
    </div>

    ${(v.headerWarnings && v.headerWarnings.length) ? `
      <div class="section">
        <div class="section-header"><span class="row"><i data-lucide="alert-triangle" class="muted"></i> <h3>Encabezados con problemas</h3> <span class="badge badge-warn">${v.headerWarnings.length}</span></span></div>
        <div class="section-body"><ul>${v.headerWarnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul></div>
      </div>
    ` : ''}

    ${(v.duplicados && v.duplicados.length) ? `
      <details class="section" open>
        <summary class="section-header"><span class="row"><i data-lucide="copy" class="muted"></i> <h3>Inventarios duplicados</h3> <span class="badge badge-warn">${v.duplicados.length}</span></span><i data-lucide="chevron-down" class="muted"></i></summary>
        <div class="section-body">
          <div class="table-wrap"><table class="table"><thead><tr><th>Fila</th><th>Inventario</th><th>Equipo</th></tr></thead>
          <tbody>${v.duplicados.map(d => `<tr><td>${d.rowIndex}</td><td><code>${escapeHtml(d.key.replace(/^inv:/, ''))}</code></td><td>${val(d.equipo)}</td></tr>`).join('')}</tbody></table></div>
        </div>
      </details>
    ` : ''}

    ${(v.parciales && v.parciales.length) ? `
      <details class="section">
        <summary class="section-header"><span class="row"><i data-lucide="circle-slash" class="muted"></i> <h3>Filas parciales</h3> <span class="badge">${v.parciales.length}</span></span><i data-lucide="chevron-down" class="muted"></i></summary>
        <div class="section-body">
          <div class="table-wrap"><table class="table"><thead><tr><th>Fila</th><th>Falta</th></tr></thead>
          <tbody>${v.parciales.map(p => `<tr><td>${p.rowIndex}</td><td>${escapeHtml(p.falta)}</td></tr>`).join('')}</tbody></table></div>
        </div>
      </details>
    ` : ''}

    <details class="section" ${issuesCount ? 'open' : ''}>
      <summary class="section-header"><span class="row"><i data-lucide="git-compare" class="muted"></i> <h3>Discrepancias archivo ↔ app</h3> <span class="badge ${issuesCount ? 'badge-warn' : 'badge-ok'}">${issuesCount}</span></span><i data-lucide="chevron-down" class="muted"></i></summary>
      <div class="section-body">
        ${issuesCount === 0
          ? '<p class="muted">Sin discrepancias por revisar.</p>'
          : `
            ${issues.faltaArchivo.length ? `
              <h4 class="mb-2">Falta en archivo (${issues.faltaArchivo.length})</h4>
              <p class="muted text-sm mb-3">La app tiene un MP registrado que el archivo Excel no refleja. Revisá el origen.</p>
              <div class="col">${issues.faltaArchivo.map(i => issueRow(i, 'falta')).join('')}</div>
            ` : ''}
            ${issues.distinto.length ? `
              <h4 class="mb-2 mt-4">Resultado distinto (${issues.distinto.length})</h4>
              <p class="muted text-sm mb-3">El archivo y la app tienen resultados diferentes para el mismo mes.</p>
              <div class="col">${issues.distinto.map(i => issueRow(i, 'distinto')).join('')}</div>
            ` : ''}
          `
        }
      </div>
    </details>

    ${state.syncMarked.size ? `
      <div class="row-between mt-4">
        <span class="muted text-sm">${state.syncMarked.size} discrepancias marcadas como resueltas</span>
        <button class="btn btn-sm" id="btn-unmark">Mostrar todas de nuevo</button>
      </div>
    ` : ''}
  `;
  renderIcons();

  root.querySelectorAll('[data-marker]').forEach(el => {
    el.addEventListener('click', () => {
      const marker = el.dataset.marker;
      state.syncMarked.add(marker);
      saveSyncMarked();
      schedulePush();
      toast({
        message: 'Marcada como resuelta. Se oculta de la lista.',
        kind: 'ok',
        action: { label: 'Deshacer', onClick: () => {
          state.syncMarked.delete(marker); saveSyncMarked(); schedulePush(); refreshActiveView();
        }}
      });
      refreshActiveView();
    });
  });
  root.querySelector('#btn-unmark')?.addEventListener('click', () => {
    state.syncMarked.clear(); saveSyncMarked(); schedulePush(); refreshActiveView();
  });
}

function kpi(label, n) {
  return `<div class="kpi"><div class="kpi-label">${escapeHtml(label)}</div><div class="kpi-value">${n}</div></div>`;
}

function issueRow(i, kind) {
  const mes = MES[i.mes];
  return `
    <div class="list-item">
      <div class="item-main">
        <div class="item-title">${escapeHtml(i.eq.equipo || '(sin nombre)')} · <span class="equipo-id">${escapeHtml(i.eq.inv || i.eq.id || '')}</span></div>
        <div class="item-meta">
          ${kind === 'falta'
            ? `App: <code>${escapeHtml(i.ev.resultado)}</code> en ${escapeHtml(mes)} · Archivo: <em>vacío</em>`
            : `App: <code>${escapeHtml(i.ev.resultado)}</code> · Archivo: <code>${escapeHtml(i.fileVal)}</code> · ${escapeHtml(mes)}`}
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm" data-marker="${escapeHtml(i.marker)}">Marcar resuelto</button>
      </div>
    </div>
  `;
}
