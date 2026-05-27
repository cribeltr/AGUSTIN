# Gestión MP 2026 · HHHA

App de gestión de mantención preventiva para equipamiento biomédico del Hospital. Reescritura UX/UI completa del SPA original (~5.800 líneas en un solo HTML) sobre un esquema modular, con un sistema de diseño explícito y paridad de funciones documentada.

> **Estado de esta entrega (iteración 1)** — scaffold completo, sistema de diseño aplicado, capa de datos + sincronización con Google Sheets operativa, y las vistas Hoy / Equipos / Pendientes / Verificación / Agenda / Historial implementadas. La matriz de paridad detallada (qué IDs están listos, qué queda) vive en [`AUDIT.md`](./AUDIT.md). El backend Google Apps Script original se reutiliza sin cambios desde [`apps_script/Code.gs`](./apps_script/Code.gs).

---

## Cómo correr en local

Requisito: cualquier servidor estático (los módulos ES no funcionan con `file://`).

```bash
# opción A — Python (cualquier versión 3)
python3 -m http.server 8080

# opción B — Node
npx serve .

# opción C — VS Code: extensión "Live Server" → click derecho en index.html → Open with Live Server
```

Luego abrí `http://localhost:8080/`. La app arranca, lee/escribe en `localStorage` y no necesita backend para uso de un solo usuario.

---

## Cómo desplegar en Google Apps Script (multi-usuario)

El backend (sincronización Sheets + Drive + maestro persistente + adjuntos) ya existe y está intacto en [`apps_script/Code.gs`](./apps_script/Code.gs). La app web se entrega como **un único `Index.html` con todo embebido**, generado con:

```bash
node build.mjs
# → escribe dist/Index.html (≈ 174 KB)
```

Pasos:

1. Crear un Google Sheet (`MP2026_Backend` o el nombre que prefieras).
2. **Extensiones → Apps Script**.
3. En el editor de Apps Script:
   - Pegar el contenido de `apps_script/Code.gs` en `Code.gs`.
   - Crear un archivo HTML llamado `Index` (sin `.html`) y pegar el contenido de `dist/Index.html`.
4. Ejecutar la función `setup` una vez (autoriza permisos).
5. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**
   - Acceso: **Cualquiera** (o "Cualquier usuario con cuenta Google" si querés restringir).
6. Copiar la URL terminada en `/exec`.
7. Abrirla — la app se sirve directamente y guarda los datos en el mismo Sheet.

Para uso individual sin backend, basta con abrir la app local: la sincronización con Sheets queda como opcional y se configura desde el menú **⋯ → Sincronización**.

---

## Estructura del proyecto

```
.
├── index.html               # Entry de desarrollo (módulos ES)
├── build.mjs                # Bundler simple → dist/Index.html para GAS
├── dist/
│   └── Index.html           # Build de un solo archivo (deployable a GAS)
├── apps_script/
│   └── Code.gs              # Backend GAS (sin cambios respecto del original)
├── src/
│   ├── css/
│   │   ├── tokens.css       # Design tokens (color, type, spacing, motion)
│   │   ├── base.css         # Reset + tipografía base
│   │   ├── components.css   # Primitivos: Button, Input, Card, Modal, Toast, Tabs, Table…
│   │   └── app.css          # Layout shell (sidebar / header / content) y responsive
│   └── js/
│       ├── main.js          # Entry: boot, header, sidebar, badges
│       ├── state.js         # Estado global, persistencia, pub/sub, migración v4.0
│       ├── utils.js         # Fechas, escape, IDs, debounce, conversiones
│       ├── ui.js            # Toast (con Deshacer), Modal stack, Loading, Confirm
│       ├── router.js        # Router minimal por hash, params persistentes
│       ├── data/
│       │   ├── excel.js     # Parseo Programacion_MP_2026.xlsm; estado equipo
│       │   └── gas.js       # Sync push/pull, maestro, adjuntos, ping
│       ├── views/
│       │   ├── hoy.js
│       │   ├── equipos.js
│       │   ├── pendientes.js
│       │   ├── verificacion.js
│       │   ├── agenda.js
│       │   └── historial.js
│       └── forms/
│           ├── equipo-detail.js
│           ├── evento.js
│           ├── pendiente.js
│           ├── seguimiento.js
│           └── gas-settings.js
├── AUDIT.md                 # Inventario funcional, matriz de paridad, suposiciones
├── DESIGN_SYSTEM.md         # Tokens, componentes, principios visuales
└── CHANGELOG_UX.md          # Qué cambió respecto del HTML original y por qué
```

---

## Flujo de uso

1. **Cargar archivo** (`Programacion_MP_2026.xlsm`) desde el botón superior. La app parsea las hojas `PMP_2026` y `Registro_MP-2026`, computa equipos, programación y resultados.
2. **Hoy** muestra KPIs y pendientes priorizados (vencidos · hoy · próximos 7 días). Click en un pendiente → editar, posponer o cerrar (con Deshacer).
3. **Equipos** lista la flota; búsqueda libre + filtros por familia, servicio, ubicación y estado. Click → detalle con tabs (Eventos · Pendientes · Información).
4. **Pendientes** lista completa agrupada por estado, con eliminación reversible.
5. **Verificación** reporta integridad del Excel y discrepancias entre app y archivo.
6. **Agenda** organiza contactos por servicio, centros de responsabilidad, directorio externo y proveedores.
7. **Configurar sync** (menú ⋯) para conectar al backend Apps Script: pegá la URL y guardá. La sincronización automática se ejecuta tras cada cambio (debounced 1.5 s).

---

## Datos & persistencia

- `mp_app_data_v1` — equipos parseados del Excel (caché).
- `mp_app_state_v1` — eventos, pendientes, agenda.
- `mp_app_sync_v1` — markers de discrepancias resueltas.
- `mp_app_gas_v1` — config del backend (URL, autoSync, lastSync).
- `mp_app_prefs_v1` — preferencias (nombre de usuario, sidebar colapsada).
- `mp_app_mig_v40` — flag de migración ejecutada.

Formato 100% compatible con el original — los datos guardados por la versión anterior son leídos sin transformación.

---

## Accesibilidad

- Contraste verificado AA (≥ 4.5:1 en texto, ≥ 3:1 en texto grande).
- Navegación por teclado completa (Tab / Shift+Tab / Enter / Esc).
- Foco visible global (`:focus-visible` con anillo azul).
- Labels en todos los campos; modales con `role="dialog"` y `aria-modal`.
- Inputs en móvil con `font-size: 16px` para evitar zoom forzado en iOS.

---

## Decisiones técnicas

- **Vanilla JS + módulos ES**, sin framework. Coherente con el original; menos peso, despliegue trivial.
- **CSS custom con tokens** (no Tailwind). Sistema de diseño explícito y auditable.
- **SheetJS** vía CDN para parseo Excel (igual que el original).
- **Lucide** para iconografía (1.5 px stroke, coherente y ligero).
- **Backend reutilizado**: el `Code.gs` original tiene una API JSON limpia y bien diseñada; no había razón para rehacerlo.

Ver decisiones de diseño en `DESIGN_SYSTEM.md` y el detalle de paridad en `AUDIT.md`.

---

## Próximos pasos

Lo que está pendiente para iteración 2 está enumerado y priorizado en `AUDIT.md` sección "Pendiente por implementar". Resumen rápido:

- Adjuntos (upload/list/delete en formularios de eventos y pendientes).
- Exportes XLSX completos (todos los equipos con eventos consolidados).
- Clasificador de observaciones (sugerir pendientes desde texto libre).
- Grabador de sesión (utilidad de telemetría — bajo valor, evaluar).
- Modo oscuro.
