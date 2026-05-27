/* Parseo del libro Excel "Programacion_MP_2026.xlsm".
   Conserva la lógica del original:
   - Hoja PMP_2026 (programación, header en fila 7)
   - Hoja Registro_MP-2026 (resultados por mes)
   - Combina ambas; computa verif (counts, duplicados, parciales, headers).
*/

import { state, saveDataCache } from '../state.js';
import { makeEquipoKey, toISODate } from '../utils.js';

const PMP_SHEET = 'PMP_2026';
const REG_SHEET = 'Registro_MP-2026';

const PMP_HEADERS_EXPECTED = [
  'Familia', 'ID', 'Carpeta', 'N° Inventario', 'Equipo', 'Servicio', 'Unidad',
  'Ubicación', 'Procedencia', 'Marca', 'Modelo', 'N° Serie', 'Año',
  'VUR', 'Clasificación', 'Enuncia. Baja', 'Frecuencia',
  'Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const HEADER_ALIASES = {
  'N° Inventario': ['N Inventario', 'No Inventario', 'Nº Inventario', 'Inventario'],
  'N° Serie': ['N Serie', 'Nº Serie', 'Serie'],
  'Ubicación': ['Ubicacion'],
  'Año': ['Ano', 'Anio'],
  'Clasificación': ['Clasificacion'],
  'Enuncia. Baja': ['Enuncia Baja', 'Baja']
};

const MES_KEYS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function normalizeHeader(h) {
  return String(h || '').trim().replace(/\s+/g, ' ');
}
function matchesAlias(expected, actual) {
  if (normalizeHeader(actual) === normalizeHeader(expected)) return true;
  const aliases = HEADER_ALIASES[expected] || [];
  return aliases.some(a => normalizeHeader(actual) === normalizeHeader(a));
}

/* Parsea workbook completo. Devuelve { ok, warnings, equipos, verif } */
export function parseWorkbook(wb) {
  const warnings = [];
  const pmp = wb.Sheets[PMP_SHEET];
  const reg = wb.Sheets[REG_SHEET];
  if (!pmp) return { ok: false, error: `Falta hoja "${PMP_SHEET}"`, warnings };

  /* PMP: header en fila 7 (índice 6), datos desde fila 8 */
  const pmpRows = window.XLSX.utils.sheet_to_json(pmp, { header: 1, defval: '' });
  if (pmpRows.length < 8) return { ok: false, error: 'PMP_2026 sin datos', warnings };
  const headers = pmpRows[6].map(normalizeHeader);
  /* Mapear índices contra expected */
  const idx = {};
  PMP_HEADERS_EXPECTED.forEach(expected => {
    const i = headers.findIndex(h => matchesAlias(expected, h));
    if (i < 0) warnings.push(`Falta columna esperada: "${expected}"`);
    idx[expected] = i;
  });

  const equipos = [];
  for (let r = 7; r < pmpRows.length; r++) {
    const row = pmpRows[r];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;
    const get = h => idx[h] >= 0 ? row[idx[h]] : '';
    const eq = {
      rowIndex: r + 1,
      fam:        String(get('Familia') || '').trim(),
      id:         String(get('ID') || '').trim(),
      carpeta:    String(get('Carpeta') || '').trim(),
      inv:        get('N° Inventario') !== '' ? String(get('N° Inventario')).trim() : null,
      equipo:     String(get('Equipo') || '').trim(),
      servicio:   String(get('Servicio') || '').trim(),
      unidad:     String(get('Unidad') || '').trim(),
      ubicacion:  String(get('Ubicación') || '').trim(),
      procedencia:String(get('Procedencia') || '').trim(),
      marca:      String(get('Marca') || '').trim(),
      modelo:     String(get('Modelo') || '').trim(),
      serie:      String(get('N° Serie') || '').trim(),
      anio:       String(get('Año') || '').trim(),
      vur:        String(get('VUR') || '').trim(),
      clas:       String(get('Clasificación') || '').trim(),
      enuBaja:    String(get('Enuncia. Baja') || '').trim(),
      frecuencia: String(get('Frecuencia') || '').trim(),
      pmpMeses:   MES_KEYS.map(m => String(get(m) || '').trim() || null),
      regProg:    new Array(12).fill(null),
      regRes:     new Array(12).fill(null),
      regObs:     null,
      empty:      false
    };
    eq.empty = !eq.equipo && !eq.inv && !eq.id;
    eq.key = makeEquipoKey(eq);
    equipos.push(eq);
  }

  /* Registro: combinar por key (inv o id), buscar columnas "Programado" y "Resultado" por mes */
  const codeCounts = {};
  const resCounts = {};
  let regRowsCount = 0;
  if (reg) {
    const regRows = window.XLSX.utils.sheet_to_json(reg, { header: 1, defval: '' });
    if (regRows.length >= 2) {
      const rHead = regRows[6] ? regRows[6].map(normalizeHeader) : regRows[0].map(normalizeHeader);
      const headerRowIdx = regRows[6] && rHead.length > 5 ? 6 : 0;
      const ridx = {};
      ['N° Inventario', 'ID'].forEach(h => {
        const i = rHead.findIndex(x => matchesAlias(h, x));
        if (i >= 0) ridx[h] = i;
      });
      MES_KEYS.forEach(m => {
        const progI = rHead.findIndex(x => normalizeHeader(x) === `Programado ${m}` || normalizeHeader(x) === `${m} Programado`);
        const resI  = rHead.findIndex(x => normalizeHeader(x) === `Resultado ${m}` || normalizeHeader(x) === `${m} Resultado`);
        ridx['prog_'+m] = progI;
        ridx['res_'+m]  = resI;
      });
      const byKey = new Map();
      equipos.forEach(eq => { if (eq.key) byKey.set(eq.key, eq); });
      for (let r = headerRowIdx + 1; r < regRows.length; r++) {
        const row = regRows[r];
        if (!row) continue;
        const inv = ridx['N° Inventario'] >= 0 ? String(row[ridx['N° Inventario']] || '').trim() : '';
        const id  = ridx['ID']            >= 0 ? String(row[ridx['ID']] || '').trim() : '';
        const k   = inv ? ('inv:' + inv) : (id ? ('id:' + id) : null);
        if (!k) continue;
        const eq = byKey.get(k);
        if (!eq) continue;
        regRowsCount++;
        MES_KEYS.forEach((m, mi) => {
          const pi = ridx['prog_'+m], si = ridx['res_'+m];
          if (pi >= 0) {
            const v = String(row[pi] || '').trim();
            if (v) {
              eq.regProg[mi] = v;
              codeCounts[v] = (codeCounts[v] || 0) + 1;
            }
          }
          if (si >= 0) {
            const v = String(row[si] || '').trim();
            if (v) {
              eq.regRes[mi] = v;
              resCounts[v] = (resCounts[v] || 0) + 1;
            }
          }
        });
      }
    } else {
      warnings.push('Registro_MP-2026 está vacío o sin encabezados reconocibles.');
    }
  } else {
    warnings.push(`Falta hoja "${REG_SHEET}" — sólo se cargará la programación.`);
  }

  /* Duplicados, parciales, familias */
  const dupSet = new Set(), seen = new Map(), duplicados = [];
  equipos.forEach(eq => {
    if (eq.empty) return;
    if (eq.inv) {
      const k = 'inv:' + eq.inv;
      if (seen.has(k)) { dupSet.add(k); duplicados.push({ key: k, rowIndex: eq.rowIndex, equipo: eq.equipo }); }
      else seen.set(k, true);
    }
  });
  const parciales = equipos.filter(eq => !eq.empty && (!eq.equipo || !eq.servicio)).map(eq => ({ rowIndex: eq.rowIndex, falta: !eq.equipo ? 'Equipo' : 'Servicio' }));
  const familias = [...new Set(equipos.map(e => e.fam).filter(Boolean))].sort();
  const validos = equipos.filter(e => !e.empty).length;
  const slots = equipos.length;

  return {
    ok: true,
    warnings,
    equipos,
    verif: {
      pmpRows: pmpRows.length - 7,
      regRows: regRowsCount,
      validos,
      slots,
      familias,
      codeCounts,
      resCounts,
      duplicados,
      parciales,
      headerWarnings: warnings.filter(w => w.startsWith('Falta columna'))
    }
  };
}

/* Lee archivo (File) y lo carga al state */
export async function loadFile(file) {
  if (!window.XLSX) throw new Error('SheetJS no cargado');
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array', cellDates: false });
  const parsed = parseWorkbook(wb);
  if (!parsed.ok) throw new Error(parsed.error);
  state.equipos = parsed.equipos;
  state.fileName = file.name;
  state.loadedAt = new Date().toISOString();
  state.verif = parsed.verif;
  state.loaded = true;
  saveDataCache();
  return parsed;
}

/* Carga desde bytes (usado al restaurar maestro desde Drive) */
export async function loadFromBytes(bytes, name = 'Maestro') {
  if (!window.XLSX) throw new Error('SheetJS no cargado');
  const wb = window.XLSX.read(bytes, { type: 'array', cellDates: false });
  const parsed = parseWorkbook(wb);
  if (!parsed.ok) throw new Error(parsed.error);
  state.equipos = parsed.equipos;
  state.fileName = name;
  state.loadedAt = new Date().toISOString();
  state.verif = parsed.verif;
  state.loaded = true;
  saveDataCache();
  return parsed;
}

/* ---------- Estado del equipo según regRes + eventos del usuario ---------- */
export function getEquipoEstadoExtended(eq, eventosByKey) {
  if (!eq) return { estado: 'no_registrado', desde: null, dias: null };
  /* Usuario tiene prioridad: si último evento operativo es más reciente que un C/FS, gana */
  const userEvs = (eventosByKey?.[eq.key] || []).slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const lastUser = userEvs[0];
  if (lastUser && lastUser.estado) {
    const today = new Date().toISOString().slice(0, 10);
    return { estado: lastUser.estado, desde: lastUser.fecha, dias: diffDaysSimple(lastUser.fecha, today) };
  }
  /* Sino, derivar del último mes con resultado */
  let lastRes = null, lastMonth = -1;
  for (let i = 11; i >= 0; i--) {
    if (eq.regRes[i]) { lastRes = eq.regRes[i]; lastMonth = i; break; }
  }
  if (!lastRes) return { estado: 'no_registrado', desde: null, dias: null };
  const year = new Date().getFullYear();
  const desde = `${year}-${String(lastMonth + 1).padStart(2, '0')}-15`;
  const today = new Date().toISOString().slice(0, 10);
  const dias = diffDaysSimple(desde, today);
  let estado = 'operativo';
  if (lastRes === 'Si') estado = 'operativo';
  else if (lastRes.match(/^C[1-8]$/)) estado = 'no operativo';
  else if (lastRes === 'FS') estado = 'fuera_servicio';
  else if (lastRes === 'Baja') estado = 'baja';
  else if (lastRes === 'NU') estado = 'no_ubicado';
  return { estado, desde, dias, codigo: lastRes };
}

function diffDaysSimple(a, b) {
  if (!a || !b) return null;
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000);
}
