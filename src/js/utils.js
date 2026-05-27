/* Utilidades genéricas — fechas, formato, escape, IDs, throttling */

export function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/* Generador correlativo basado en timestamp (YYYYMMDDHHMMSS), con sufijo si choca */
export function timestampUid(existing) {
  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  const base = `${d.getFullYear()}${p2(d.getMonth()+1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  if (!existing || !existing.has(base)) return base;
  for (let i = 1; i < 1000; i++) {
    const cand = `${base}_${i}`;
    if (!existing.has(cand)) return cand;
  }
  return base + '_' + Math.random().toString(36).slice(2, 6);
}

export function todayISO() {
  const d = new Date();
  const p2 = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
}

export function addDaysISO(iso, n) {
  if (!iso) return iso;
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const p2 = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
}

export function diffDays(isoA, isoB) {
  if (!isoA || !isoB) return null;
  const a = new Date(isoA + 'T00:00:00').getTime();
  const b = new Date(isoB + 'T00:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function fmtDateLong(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return iso; }
}

export function fmtRelative(iso) {
  if (!iso) return '';
  const t = todayISO();
  const d = diffDays(t, iso);
  if (d === null) return '';
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d > 0)   return `en ${d} días`;
  return `hace ${Math.abs(d)} días`;
}

export function fmtBytes(n) {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n/1024).toFixed(1) + ' KB';
  return (n/1048576).toFixed(1) + ' MB';
}

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function val(v) { return (v === null || v === undefined || v === '') ? '—' : escapeHtml(v); }

export function shortName(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || '';
  return parts[0] + ' ' + parts[1][0] + '.';
}

export function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/* Convierte cualquier formato (Date, ISO con T, dd-mm-yyyy) a YYYY-MM-DD */
export function toISODate(v) {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v)) {
    const p2 = n => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p2(v.getMonth()+1)}-${p2(v.getDate())}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  if (!isNaN(d)) {
    const p2 = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
  }
  return '';
}

/* Decodifica base64 → Uint8Array (para descargar el maestro desde Drive) */
export function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/* Sanitiza nombre de archivo */
export function safeFilename(s, max = 120) {
  return String(s || 'archivo').replace(/[\/\\:*?"<>|]/g, '_').slice(0, max);
}

/* Genera nombre de carpeta Drive a partir de la key del equipo */
export function keyToFolderName(key) {
  if (!key) return 'sin-key';
  const s = String(key);
  if (s.startsWith('inv:')) return s.slice(4);
  if (s.startsWith('id:'))  return 'ID-' + s.slice(3);
  return s;
}

/* Iconos Lucide por tipo de archivo */
export function fileIconFor(mime, name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if ((mime||'').startsWith('image/') || ['png','jpg','jpeg','gif','webp'].includes(ext)) return 'image';
  if (['pdf'].includes(ext) || (mime||'').includes('pdf')) return 'file-text';
  if (['xls','xlsx','xlsm','csv'].includes(ext) || (mime||'').includes('sheet')) return 'sheet';
  if (['doc','docx'].includes(ext) || (mime||'').includes('word')) return 'file-text';
  if (['zip','rar','7z'].includes(ext)) return 'archive';
  return 'file';
}

/* Render Lucide tras inyectar HTML */
export function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/* Construye una key estable: inv:XXX si tiene N° Inventario, sino id:YYY */
export function makeEquipoKey(eq) {
  if (eq && eq.inv) return 'inv:' + String(eq.inv).trim();
  if (eq && eq.id)  return 'id:' + String(eq.id).trim();
  return null;
}
