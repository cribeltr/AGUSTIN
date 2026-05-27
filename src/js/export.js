/* Export XLSX — replica el formato y nomenclatura del backend GAS (Code.gs:replaceAll_).
   - Eventos: IDs correlativos 1..N tras ordenar por creadoEn ASC; fallback a fecha.
   - Columnas idénticas a HEADERS[SHEET_EVENTOS], + "Oficial".
   - Pendientes: IDs correlativos 1..N tras ordenar por fecha ASC.
   - Incluye "Fecha registro" (creadoEn) en cada fila de evento.
*/

import { state } from './state.js';
import { todayISO } from './utils.js';

const TIPO_LABEL = {
  mp:'Mantención preventiva', reporte_servicio:'Reporte de servicio',
  visita_tecnica:'Visita técnica', cotizacion:'Cotización', oc:'Orden de Compra',
  envio:'Envío a Serv. Técnico', solicitud:'Solicitud de trabajo',
  recepcion:'Recepción', reparacion:'Reparación'
};

/* Headers idénticos al backend (apps_script/Code.gs) para que el .xlsx sea
   intercambiable con la hoja Sheets. La columna final "Oficial" extiende
   el esquema (los lectores antiguos la ignoran). */
const EVENTO_HEADERS = [
  'ID Evento','N° Inventario','Equipo','Servicio','Familia','Tipo de evento',
  'Fecha','Fecha registro','Resultado','Ejecutor','Estado del equipo',
  'Empresa','Técnico (visita)','N° Envío','N° Cotización','N° OC','Folio',
  'Folio guía','Observación','Adjuntos (URL)','Actualizado','Oficial'
];

const PENDIENTE_HEADERS = [
  'ID Pendiente','N° Inventario','Equipo','Servicio','Descripción',
  'Fecha creación','Fecha compromiso','Próximo recordatorio','Fecha cierre',
  'Ejecutor','Estado','Tareas','Seguimientos','Adjuntos (URL)','Actualizado'
];

function keyToNInv(key) {
  if (!key) return '';
  const s = String(key);
  if (s.startsWith('inv:')) return s.slice(4);
  if (s.startsWith('id:'))  return 'ID-' + s.slice(3);
  return s;
}

function eqInfoFor(key) {
  const eq = state.equipos.find(e => e.key === key);
  return eq ? {
    nInv: eq.inv || ('ID-' + eq.id),
    equipo: eq.equipo || '',
    servicio: eq.servicio || '',
    fam: eq.fam || ''
  } : { nInv: keyToNInv(key), equipo: '', servicio: '', fam: '' };
}

function fmtArchivos(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(a => `${a.nombre || 'archivo'}: ${a.url || ''}`).join('\n');
}

function fmtTareas(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(t => `[${t.estado === 'cerrado' ? 'x' : ' '}] ${t.descripcion || ''}`).join('\n');
}

function fmtSegs(arr) {
  if (!arr || !arr.length) return '';
  return arr.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(a => {
    const tipo = a.tipo ? `[${a.tipo}]` : '';
    const cont = a.contactadoA ? ` → ${a.contactadoA}` : '';
    return `${a.fecha || ''} ${tipo}${cont}: ${a.texto || ''}`;
  }).join('\n');
}

/* ---------- Eventos ---------- */
export function buildEventoRows() {
  const now = new Date().toISOString();
  /* Aplanar todos los eventos y ordenar por creadoEn ASC; fallback a fecha */
  const flat = [];
  Object.entries(state.eventos).forEach(([key, arr]) => {
    (arr || []).forEach(ev => flat.push({ key, ev }));
  });
  flat.sort((a, b) => {
    const fa = a.ev.creadoEn || a.ev.fecha || '';
    const fb = b.ev.creadoEn || b.ev.fecha || '';
    return String(fa).localeCompare(String(fb));
  });
  const rows = [EVENTO_HEADERS.slice()];
  flat.forEach(({ key, ev }, i) => {
    const eqI = eqInfoFor(key);
    rows.push([
      i + 1,                              // ID Evento (correlativo)
      eqI.nInv,
      eqI.equipo,
      eqI.servicio,
      eqI.fam,
      TIPO_LABEL[ev.tipo] || ev.tipo || '',
      ev.fecha || '',
      ev.creadoEn || '',                  // Fecha registro
      ev.resultado || '',
      ev.ejecutor || '',
      ev.estado || '',
      ev.empresa || '',
      '',                                  // Técnico (visita): reservado para futuro
      ev.nEnvio || '',
      ev.nCotizacion || '',
      ev.nOC || '',
      ev.folio || '',
      ev.folioGuia || '',
      ev.observacion || '',
      fmtArchivos(ev.archivos),
      now,
      (ev.oficial === false && ev.tipo === 'mp') ? 'No' : 'Sí'
    ]);
  });
  return rows;
}

export function buildPendienteRows() {
  const now = new Date().toISOString();
  const flat = [];
  Object.entries(state.pendientes).forEach(([key, arr]) => {
    (arr || []).forEach(p => flat.push({ key, p }));
  });
  flat.sort((a, b) => String(a.p.fecha || '').localeCompare(String(b.p.fecha || '')));
  const rows = [PENDIENTE_HEADERS.slice()];
  flat.forEach(({ key, p }, i) => {
    const eqI = eqInfoFor(key);
    rows.push([
      i + 1,                              // ID Pendiente (correlativo)
      eqI.nInv,
      eqI.equipo,
      eqI.servicio,
      p.descripcion || '',
      p.fecha || '',                      // Fecha creación
      p.fechaCompromiso || '',
      p.proximoRecordatorio || '',
      p.fechaCierre || '',
      p.ejecutor || '',
      p.estado || '',
      fmtTareas(p.tareas),
      fmtSegs(p.actualizaciones),
      fmtArchivos(p.archivos),
      now
    ]);
  });
  return rows;
}

export function exportXLSX() {
  if (!window.XLSX) throw new Error('SheetJS no cargado');
  const wb = window.XLSX.utils.book_new();

  const evRows = buildEventoRows();
  const evSheet = window.XLSX.utils.aoa_to_sheet(evRows);
  window.XLSX.utils.book_append_sheet(wb, evSheet, 'Eventos');

  const peRows = buildPendienteRows();
  const peSheet = window.XLSX.utils.aoa_to_sheet(peRows);
  window.XLSX.utils.book_append_sheet(wb, peSheet, 'Pendientes');

  /* Hoja resumen "Equipos" con la lista del archivo cargado */
  if (state.equipos.length) {
    const eqHeaders = ['N° Inventario','Equipo','Familia','Servicio','Ubicación','Marca','Modelo','N° Serie','Año','Frecuencia'];
    const eqRows = [eqHeaders, ...state.equipos.filter(e => !e.empty).map(e => [
      e.inv || ('ID-' + e.id), e.equipo, e.fam, e.servicio, e.ubicacion,
      e.marca, e.modelo, e.serie, e.anio, e.frecuencia
    ])];
    const eqSheet = window.XLSX.utils.aoa_to_sheet(eqRows);
    window.XLSX.utils.book_append_sheet(wb, eqSheet, 'Equipos');
  }

  const fname = `gestion_mp_2026_${todayISO()}.xlsx`;
  window.XLSX.writeFile(wb, fname);
}

/* Export para una sola sección (usado en Historial) */
export function exportHistorialXLSX(eq, eventos) {
  if (!window.XLSX) throw new Error('SheetJS no cargado');
  const wb = window.XLSX.utils.book_new();
  /* Mismas columnas que Eventos del export global, pero solo el equipo */
  const rows = [EVENTO_HEADERS.slice()];
  const sorted = eventos.slice().sort((a, b) => String(a.creadoEn || a.fecha || '').localeCompare(b.creadoEn || b.fecha || ''));
  sorted.forEach((ev, i) => {
    rows.push([
      i + 1,
      eq.inv || ('ID-' + eq.id),
      eq.equipo || '',
      eq.servicio || '',
      eq.fam || '',
      TIPO_LABEL[ev.tipo] || ev.tipo || '',
      ev.fecha || '',
      ev.creadoEn || '',
      ev.resultado || '',
      ev.ejecutor || '',
      ev.estado || '',
      ev.empresa || '',
      '',
      ev.nEnvio || '',
      ev.nCotizacion || '',
      ev.nOC || '',
      ev.folio || '',
      ev.folioGuia || '',
      ev.observacion || '',
      fmtArchivos(ev.archivos),
      new Date().toISOString(),
      (ev.oficial === false && ev.tipo === 'mp') ? 'No' : 'Sí'
    ]);
  });
  const ws = window.XLSX.utils.aoa_to_sheet(rows);
  window.XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  const name = (eq.equipo || eq.key).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  window.XLSX.writeFile(wb, `historial_${name}_${todayISO()}.xlsx`);
}
