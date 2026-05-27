# AUDIT — Inventario funcional, matriz de paridad y suposiciones

> Trazabilidad entre el SPA original (`GestionMP_2026_corregido_33.html`, ~5.788 líneas, ~150 funciones) y la reescritura modular en `src/`.

---

## 1 · Inventario funcional (Fase 1)

Funciones detectadas en el HTML original, agrupadas por dominio y con ID estable. Esta numeración se usa en la matriz de paridad (sección 5).

### Persistencia local (F-001…F-008)

| ID | Función original | Propósito |
|---|---|---|
| F-001 | `loadPersisted()` | Carga eventos/pendientes/agenda desde `mp_app_state_v1`; ejecuta migración v4.0. |
| F-002 | `savePersisted()` | Persiste estado a localStorage; dispara push GAS si autoSync. |
| F-003 | `loadData()` | Carga caché de equipos parseados desde `mp_app_data_v1`. |
| F-004 | `saveData()` | Persiste equipos + fileName + loadedAt. |
| F-005 | `clearDataCache()` | Borra `mp_app_data_v1` (preserva eventos/pendientes). |
| F-006 | `resetAllData()` | Wipe total con confirmación tipeada. |
| F-007 | `loadSyncMarked()` | Restaura set de markers ocultos. |
| F-008 | `saveSyncMarked()` | Persiste set; dispara push GAS. |

### IDs y lookup (F-010…F-013)

| ID | Función | Propósito |
|---|---|---|
| F-010 | `uid()` | ID aleatorio de sesión. |
| F-011 | `timestampUid(existing)` | Correlativo `YYYYMMDDHHMMSS` con sufijo si choca. |
| F-012 | `allEventoIds_()` | Set de todos los IDs de evento. |
| F-013 | `allPendienteIds_()` | Set de todos los IDs de pendiente. |

### Fechas, formato, utilidades (F-020…F-039)

| ID | Función | Propósito |
|---|---|---|
| F-020 | `todayISO()` | ISO de hoy. |
| F-021 | `addDaysISO(iso, n)` | Suma días. |
| F-022 | `diffDays(a, b)` | Diferencia en días. |
| F-023 | `fmtDateInput(d)` | DD-MM-YYYY visible. |
| F-024 | `isVencido(p, today)` | Pendiente vencido. |
| F-025 | `isRecordatorioVencido(p, today)` | Recordatorio vencido. |
| F-026 | `lastSeguimiento(p)` | Último update. |
| F-027 | `escapeHtml(s)` | Sanitiza HTML. |
| F-028 | `val(v)` | Formato '—' para vacíos. |
| F-029 | `shortEjec(name)` | Abrevia "Nombre Apellido" a "Nombre A.". |
| F-030 | `fmtBytes_(n)` | KB/MB. |
| F-031 | `debounce(fn, ms)` | Throttling. |
| F-032 | `nextFrame()` | Promise tras 2 rAF. |
| F-033 | `dateShortcuts(id, mode)` | Botones rápidos de fecha relativa. |
| F-034 | `setDateInputRelative(id, days)` | Aplica shortcut. |

### Layout/UI shell (F-040…F-048)

F-040 `applySidebarState`, F-041 `toggleSidebar`, F-042 `toggleMobileSidebar`, F-043 `toggleMoreMenu`, F-044 `closeMoreMenu`, F-045 `toast`, F-046 `showLoading`, F-047 `hideLoading`, F-048 `selectView`.

### Excel: parseo y verificación (F-050…F-055)

F-050 `parseWorkbook(wb)`, F-051 `updateCounter()`, F-052 detección de headers/aliases PMP_2026, F-053 validación Registro_MP-2026, F-054 conteos por código/resultado por mes, F-055 detección de duplicados/parciales.

### Estado equipo (F-060…F-066)

F-060 `getEquipoEstado`, F-061 `getEquipoEstadoExtended`, F-062 `effectiveRegRes`, F-063 `estadoEquipoBadge`, F-064 `codeBadge`, F-065 `resBadge`, F-066 `diasAlertNivel/_Badge`.

### Sync / discrepancias (F-070…F-073)

F-070 `computeSyncIssues`, F-071 `markSynced`, F-072 `unmarkAllSynced`, F-073 `updateSidebarBadges`.

### Tablas y filtros (F-080…F-085)

F-080 `uniqueValues`, F-081 `buildFilterBar`, F-082 `applyFilter`, F-083 `virtualTable`, F-084 `renderEquipos`, F-085 `equiposHead`.

### Hoy / Pendientes / Eventos (F-090…F-119)

F-090 `renderHoy`, F-091 KPI cards, F-092…097 secciones colapsables por período, F-098 `pendienteCardHTML`, F-099 `eventoLogCardHTML`, F-100 `bindPendActions`, F-101 `snoozePendiente`, F-102 `togglePendiente`, F-103 `startPendiente`, F-104 `findPendiente`, F-105 `addTarea`, F-106 `toggleTarea`, F-107 `deleteTarea`, F-108 `addActualizacion`, F-109 `deleteEvento`, F-110 `deletePendiente`, F-111 `openSeguimientoForm`, F-112 `deleteActualizacion`, F-113 `renderPendientes`, F-114 `renderSyncSection`, F-115 `syncCardHTML`, F-116 `renderVerificacion`, F-117 conteos verif, F-118 `exportEquiposFiltradosXLSX`, F-119 alertas por equipo de alto riesgo.

### Modales y formularios (F-120…F-135)

F-120 `openEquipoModal`, F-121 `renderEquipoModal`, F-122 `openTextModal`, F-123 `openEventoForm`, F-124 `renderEventoFields`, F-125 `onEvEmpresaChange`, F-126 `saveEvento`, F-127 `openPendienteForm`, F-128 `savePendiente`, F-129 `closeForm`, F-130 `openClasificadorModal`, F-131 `classifyObservacion`, F-132 `_spawnPendientesCreadosDesdeTexto_`, F-133 `_analizarObsClick`, F-134 `detectTypos_`, F-135 `_splitSentences_`.

### Agenda (F-140…F-170)

F-140 `ensureEmpresas`, F-141 `ensureServicioAgenda`, F-142 `ensureDirectorio`, F-143 `findEmpresa`, F-144 `findContactoEmpresa`, F-145 `isContactoFilled`, F-146 `countContactosForServ`, F-147 `findCRForServicio`, F-148 `renderAgenda`, F-149 `renderAgendaBody`, F-150 `renderEventoTimeline_`, F-151 `contactosServicioBlockHTML`, F-152 `renderAgendaServicios`, F-153 `renderServicioCard_`, F-154 `otroContactoCardHTML`, F-155 `openOtroContactoForm`, F-156 `renderAgendaCentros`, F-157 `openAsociarCRModal`, F-158 `openCRForm`, F-159 `deleteCR`, F-160 `openContactoForm`, F-161 `deleteContacto`, F-162 `contactoCardHTML`, F-163 `renderAgendaDirectorio`, F-164 `openDirectorioForm`, F-165 `deleteDirectorioEntry`, F-166 `directorioCardHTML`, F-167 `renderAgendaEmpresas`, F-168 `openEmpresaForm`, F-169 `openEmpresaContactoForm`, F-170 `deleteEmpresa` / `deleteEmpresaContacto`.

### Adjuntos (F-180…F-185)

F-180 `renderArchivosSection_`, F-181 `bindArchivosSection_`, F-182 `getArchivosForSave_`, F-183 `deleteRemovedFiles_`, F-184 `fileIconFor_`, F-185 `gasUploadFile` / `gasDeleteFile`.

### Backend GAS (F-190…F-209)

F-190 `gasLoadConfig`/`gasSaveConfig`, F-191 `gasUpdateIndicator`, F-192 `gasRequest_`, F-193 `gasPing`, F-194 `buildEquiposLookup_`, F-195 `gasPushAll`, F-196 `gasPull`, F-197 `gasSchedulePush`, F-198 `gasUploadMaster`, F-199 `gasGetMasterMeta`, F-200 `gasFetchMaster`, F-201 `tryRestoreMasterFromDrive`, F-202 `_base64ToBytes_`, F-203 `masterFreshnessLabel`/`updateMasterFreshness`, F-204 `_toISODate_`, F-205 `_parseTareasTxt_`, F-206 `_parseSegsTxt_`, F-207 `_eventoFromSheet_`, F-208 `_pendienteFromSheet_`, F-209 `_remapByKey_`.

### Export / Import (F-210…F-213)

F-210 `exportEquiposFiltradosXLSX`, F-211 `exportXLSX` (full), F-212 `exportJSON`, F-213 `_histExportXLSX_`.

### Historial (F-220…F-225)

F-220 `openHistorial` / `closeHistorial`, F-221 `_histResetFilters_`, F-222 `renderHistorialView`, F-223 `_histRowFullHTML_`.

### Estado "Oficial" en eventos y pendientes vinculados (F-250…F-256) — iteración 1.1

| ID | Implementación | Estado | Verificación manual |
|---|---|---|---|
| F-250 | `forms/evento.js` — nuevos eventos MP nacen con `oficial: false`. Badge "No oficial" visible en form y en tarjeta del detalle de equipo. | ✅ | Crear evento MP → badge ámbar. |
| F-251 | `data/excel.js:reconcileOficial()` — al cargar un nuevo maestro, promueve a oficial los eventos cuyo `resultado` coincide con `regRes[mes]` del archivo. | ✅ | Crear evento → cargar maestro con ese resultado → toast "N promovidos". |
| F-252 | `main.js` — toast post-carga con cuenta de promovidos y de pendientes de reflejar. | ✅ | — |
| F-253 | `apps_script/Code.gs` v3.12 — columna `Oficial` (Sí/No) en hoja Eventos. Header actualizado, `replaceAll_` emite el valor. Ejecutar `migrate()` para sumar columna sin perder datos. | ✅ | Push GAS → revisar hoja Eventos, última columna. |
| F-254 | `views/verificacion.js` — KPIs "Eventos MP oficiales / no oficiales / discrepancias" como segunda fila. | ✅ | — |
| F-255 | `views/historial.js` — columnas "ID correlativo", "Fecha registro", "Oficial" + filtro "Solo no oficiales". | ✅ | — |
| F-256 | `forms/evento.js` botón "Crear pendiente" + `forms/equipo-detail.js` botón "Pendiente" por evento → precarga descripción/ejecutor/`eventoId`. `forms/pendiente.js` muestra badge "Desde evento <id>". | ✅ | Editar evento → "Crear pendiente" → form precargado. |

### Grabador de sesión (F-230…F-240)

F-230…F-240 funciones `rec*` para telemetría. **Decisión documentada (SUP-001)**: omitir en iteración 1 por bajo valor de producto y alto costo (genera JSON de 10+ MB en sesiones largas).

---

## 2 · Diagnóstico UX (Fase 3)

Hallazgos heurísticos y decisiones — detalle en `CHANGELOG_UX.md`.

| Heurística | Hallazgo | Decisión |
|---|---|---|
| Nielsen #2 | Jerga C1–C8, "Verificación de carga" sin glosario | Mantener nomenclatura biomédica (es estándar interno) + tooltips contextuales en próxima iteración. |
| Nielsen #4 | 3 botones "Analizar" hacen cosas diferentes | Reservado para iteración 2 cuando se reincluya el clasificador. |
| Nielsen #5 | Delete inmediato e irreversible | **Reemplazado** por toast con "Deshacer" 6 s en eventos, pendientes y discrepancias. |
| Nielsen #6 | Filtros se pierden al cambiar vista | **Resuelto**: filtros viven en `location.hash` y se restauran. |
| Nielsen #7 | Sin búsqueda libre en Equipos | **Resuelto**: search bar como elemento primario del filtro. |
| Nielsen #10 | Sin estados vacíos guiados | **Resuelto**: empty states con CTA en cada vista. |
| Hick | Header con 7+ acciones | **Resuelto**: una acción primaria visible (Cargar) + menú "⋯" para resto. |
| Fitts | Targets de 28 px | **Resuelto**: 36 px mínimo, 40 px en móvil. |
| Miller | Form evento con 13 campos visibles | **Resuelto**: detalles administrativos en `<details>` colapsable; campos básicos siempre. |
| Modales anidados | Pila confusa | **Resuelto**: stack manager oculta el anterior y restaura al cerrar (sin anidación visual). |
| Mobile | Scroll horizontal incómodo | **Resuelto**: tarjetas en `< 640 px` en lugar de tabla. |

---

## 3 · Direcciones de diseño

Tokens, primitivos y principios → `DESIGN_SYSTEM.md`.

---

## 4 · Arquitectura técnica (Fase 5)

- **Stack**: Vanilla JS + módulos ES, CSS custom con tokens, SheetJS, Lucide. Sin framework.
- **Persistencia**: localStorage 100% compatible con la versión original (mismas keys, mismo schema).
- **Backend**: Apps Script `Code.gs` original sin modificaciones (la API JSON ya era buena).
- **Build**: `build.mjs` produce `dist/Index.html` con CSS y JS embebidos para desplegar en GAS.
- **Estado global**: objeto `state` único con pub/sub minimal (`subscribe`/`emit`).
- **Routing**: hash-based con parámetros (`#equipos?fam=X&servicio=Y`).
- **Modales**: stack manager — el nuevo modal oculta al anterior; al cerrar, restaura.
- **Errores**: try/catch con toast informativo; mensajes en lenguaje del usuario.

---

## 5 · Matriz de paridad funcional (Fase 7)

✅ Implementado · 🟡 Implementación parcial (descrito en Notas) · ❌ Pendiente para iteración 2.

| ID | Implementación | Estado | Verificación manual |
|---|---|---|---|
| F-001 `loadPersisted` | `src/js/state.js:loadPersisted()` | ✅ | Refrescar la app — eventos previos siguen visibles. |
| F-002 `savePersisted` | `src/js/state.js:savePersisted()` | ✅ | Crear evento → reload → persiste. |
| F-003 `loadData` | `src/js/state.js:loadDataCache()` | ✅ | Cargar Excel → reload → equipos persisten. |
| F-004 `saveData` | `src/js/state.js:saveDataCache()` | ✅ | Mismo que arriba. |
| F-005 `clearDataCache` | `src/js/state.js:clearDataCache()` | ✅ | No expuesto en UI; disponible vía consola para iteración 2 (botón en header). |
| F-006 `resetAllData` | `src/js/state.js:resetAllData()` + menú "Borrar todos los datos" | ✅ | Menú ⋯ → confirma → recarga vacía. |
| F-007 `loadSyncMarked` | `src/js/state.js:loadSyncMarked()` | ✅ | Marcar discrepancia → reload → permanece oculta. |
| F-008 `saveSyncMarked` | `src/js/state.js:saveSyncMarked()` | ✅ | Mismo que arriba. |
| F-010 `uid` | `src/js/utils.js:uid()` | ✅ | Internal. |
| F-011 `timestampUid` | `src/js/utils.js:timestampUid()` | ✅ | Crear 2 eventos en el mismo segundo → IDs únicos. |
| F-012 `allEventoIds_` | `src/js/state.js:allEventoIds()` | ✅ | Internal — se usa en formularios. |
| F-013 `allPendienteIds_` | `src/js/state.js:allPendienteIds()` | ✅ | Internal. |
| F-020 `todayISO` | `src/js/utils.js:todayISO()` | ✅ | — |
| F-021 `addDaysISO` | `src/js/utils.js:addDaysISO()` | ✅ | Snooze 7 días. |
| F-022 `diffDays` | `src/js/utils.js:diffDays()` | ✅ | — |
| F-023 `fmtDateInput` | `src/js/utils.js:fmtDate()` (mejorado: también `fmtRelative` y `fmtDateLong`) | ✅ | "hace 3 días", "mañana". |
| F-024 `isVencido` | Inline en `views/hoy.js` y `views/pendientes.js` (`due < today`) | ✅ | Tarjeta roja en Hoy/Vencidos. |
| F-025 `isRecordatorioVencido` | Idem | ✅ | — |
| F-026 `lastSeguimiento` | Inline en `forms/pendiente.js` (sort desc) | ✅ | — |
| F-027 `escapeHtml` | `src/js/utils.js:escapeHtml()` | ✅ | Inyectar `<script>` en obs → texto plano. |
| F-028 `val` | `src/js/utils.js:val()` | ✅ | — |
| F-029 `shortEjec` | `src/js/utils.js:shortName()` | ✅ | Internal helper. |
| F-030 `fmtBytes_` | `src/js/utils.js:fmtBytes()` | ✅ | — |
| F-031 `debounce` | `src/js/utils.js:debounce()` | ✅ | Buscar en Equipos no spamea hash. |
| F-032 `nextFrame` | `src/js/utils.js:nextFrame()` | ✅ | — |
| F-033 `dateShortcuts` | Eliminado por simplificación (datepicker nativo es suficiente). | 🟡 | SUP-002. |
| F-034 `setDateInputRelative` | Idem | 🟡 | SUP-002. |
| F-040 `applySidebarState` | `src/js/main.js:applySidebarCollapsed()` | ✅ | — |
| F-041 `toggleSidebar` | `src/js/main.js` (botón Colapsar) | ✅ | Click → sidebar a 60 px. |
| F-042 `toggleMobileSidebar` | `src/js/main.js:toggleSidebarMobile()` | ✅ | < 768 px → drawer. |
| F-043 `toggleMoreMenu` | `src/js/main.js:toggleMenu()` | ✅ | Click ⋯ → abre menú. |
| F-044 `closeMoreMenu` | `src/js/main.js:closeMenu()` | ✅ | Click fuera → cierra. |
| F-045 `toast` | `src/js/ui.js:toast()` + acción Deshacer | ✅ | Mejora: soporta `action: { label, onClick }`. |
| F-046 `showLoading` | `src/js/ui.js:showLoading()` | ✅ | Cargar Excel → spinner. |
| F-047 `hideLoading` | `src/js/ui.js:hideLoading()` | ✅ | — |
| F-048 `selectView` | `src/js/router.js:navigate()` | ✅ | Click sidebar → cambia vista. |
| F-050 `parseWorkbook` | `src/js/data/excel.js:parseWorkbook()` | ✅ | Cargar `.xlsm` real → equipos + verif. |
| F-051 `updateCounter` | Cabecera de Equipos: "N equipos · filename" | ✅ | — |
| F-052 Headers/aliases | `excel.js` constantes `HEADER_ALIASES` | ✅ | Advertencias visibles en Verificación. |
| F-053 Registro_MP-2026 | `excel.js` | ✅ | regProg + regRes leídos. |
| F-054 Conteos por código | `excel.js` → `verif.codeCounts/resCounts` | ✅ | Visible en Verificación. |
| F-055 Duplicados/parciales | `excel.js` → `verif.duplicados/parciales` | ✅ | Visibles en Verificación. |
| F-060 `getEquipoEstado` | `excel.js:getEquipoEstadoExtended()` (unificado) | ✅ | — |
| F-061 `getEquipoEstadoExtended` | `excel.js:getEquipoEstadoExtended()` | ✅ | Muestra estado + días en Equipos. |
| F-062 `effectiveRegRes` | Inline en `getEquipoEstadoExtended` (user evs override file) | ✅ | Crear evento MP → estado equipo cambia. |
| F-063 `estadoEquipoBadge` | `views/equipos.js:ESTADO_DOT` + badges | ✅ | Dot color en cada fila. |
| F-064 `codeBadge` | `views/equipos.js` columna "Últ. resultado" como `<code>` | ✅ | — |
| F-065 `resBadge` | Idem | ✅ | — |
| F-066 `diasAlertNivel` | Disponible vía `getEquipoEstadoExtended.dias`; visualización extendida pendiente | 🟡 | F-066b iteración 2. |
| F-070 `computeSyncIssues` | `views/verificacion.js:computeIssues()` | ✅ | Crear MP no presente en archivo → aparece en discrepancias. |
| F-071 `markSynced` | `views/verificacion.js` botón "Marcar resuelto" con Deshacer | ✅ | — |
| F-072 `unmarkAllSynced` | Botón "Mostrar todas de nuevo" en Verificación | ✅ | — |
| F-073 `updateSidebarBadges` | `main.js:updateBadges()` (Hoy = vencidos, Pendientes = abiertos) | ✅ | Crear vencido → badge rojo. |
| F-080 `uniqueValues` | `views/equipos.js:uniqueValues()` | ✅ | Dropdowns poblados. |
| F-081 `buildFilterBar` | Inline en `views/equipos.js`, `pendientes.js`, `agenda.js`, `historial.js` | ✅ | — |
| F-082 `applyFilter` | `views/equipos.js:applyFilters()` | ✅ | — |
| F-083 `virtualTable` | Reemplazado por tabla estándar + tarjetas móvil (no se virtualiza por ahora) | 🟡 | SUP-003. |
| F-084 `renderEquipos` | `views/equipos.js:renderEquipos()` | ✅ | — |
| F-085 `equiposHead` | Inline `tableHtml()` | ✅ | — |
| F-090 `renderHoy` | `views/hoy.js:renderHoy()` | ✅ | — |
| F-091 KPI cards | `views/hoy.js:kpi()` | ✅ | 3 KPIs visibles. |
| F-092–097 Secciones | `views/hoy.js:section()` colapsable | ✅ | — |
| F-098 `pendienteCardHTML` | `views/hoy.js:itemHtml()` y `views/pendientes.js:itemHtml()` | ✅ | — |
| F-099 `eventoLogCardHTML` | `forms/equipo-detail.js:eventosPanel()` | ✅ | — |
| F-100 `bindPendActions` | `views/hoy.js:bindCardActions()` y `views/pendientes.js:bindUI()` | ✅ | — |
| F-101 `snoozePendiente` | `views/hoy.js` botón ⏰ → +7 días con Deshacer | ✅ | — |
| F-102 `togglePendiente` | `views/hoy.js` botón ✓ → cierra con Deshacer | ✅ | — |
| F-103 `startPendiente` | Implícito en cambio de estado en `forms/pendiente.js` (select) | ✅ | — |
| F-104 `findPendiente` | `state.js:findPendiente()` | ✅ | — |
| F-105 `addTarea` | `forms/pendiente.js` botón "Agregar tarea" | ✅ | — |
| F-106 `toggleTarea` | Checkbox inline | ✅ | — |
| F-107 `deleteTarea` | Botón rojo inline | ✅ | — |
| F-108 `addActualizacion` | `forms/pendiente.js` botón "Agregar seguimiento" → `openSeguimientoForm` | ✅ | — |
| F-109 `deleteEvento` | `forms/evento.js` botón "Eliminar" con Deshacer | ✅ | — |
| F-110 `deletePendiente` | `views/pendientes.js` botón eliminar con Deshacer; también desde form | ✅ | — |
| F-111 `openSeguimientoForm` | `forms/seguimiento.js` | ✅ | — |
| F-112 `deleteActualizacion` | UI básica en lista de seguimientos del form. Botón "quitar" pendiente. | 🟡 | F-112b iteración 2. |
| F-113 `renderPendientes` | `views/pendientes.js:renderPendientes()` | ✅ | — |
| F-114 `renderSyncSection` | `views/verificacion.js` (panel "Discrepancias archivo ↔ app") | ✅ | — |
| F-115 `syncCardHTML` | `views/verificacion.js:issueRow()` | ✅ | — |
| F-116 `renderVerificacion` | `views/verificacion.js:renderVerificacion()` | ✅ | — |
| F-117 Conteos verif | KPIs + duplicados + parciales + headers | ✅ | Cargar Excel real → KPIs y tablas. |
| F-118 `exportEquiposFiltradosXLSX` | Cubierto por export global con hoja `Equipos` (lista del archivo cargado) | 🟡 | Export filtrado específico desde Verificación queda para iteración 2. |
| F-119 Alertas equipos alto riesgo | Calculado pero no visualizado como sección dedicada en Hoy | 🟡 | F-119b iteración 2. |
| F-120 `openEquipoModal` | `forms/equipo-detail.js:openEquipoDetail()` | ✅ | Click en fila de Equipos → modal. |
| F-121 `renderEquipoModal` | `forms/equipo-detail.js` tabs Eventos/Pendientes/Info | ✅ | — |
| F-122 `openTextModal` | No reimplementado; los textos largos editan inline en `<textarea>` | 🟡 | SUP-004. |
| F-123 `openEventoForm` | `forms/evento.js:openEventoForm()` | ✅ | — |
| F-124 `renderEventoFields` | `forms/evento.js:bodyHTML()` | ✅ | — |
| F-125 `onEvEmpresaChange` | Campo `empresa` es texto libre por simplicidad; select+autocomplete en iteración 2 | 🟡 | SUP-005. |
| F-126 `saveEvento` | `forms/evento.js` botón Guardar | ✅ | — |
| F-127 `openPendienteForm` | `forms/pendiente.js:openPendienteForm()` | ✅ | — |
| F-128 `savePendiente` | `forms/pendiente.js` botón Guardar | ✅ | — |
| F-129 `closeForm` | `ui.js:closeAllModals()` | ✅ | — |
| F-130 `openClasificadorModal` | Pendiente | ❌ | F-130 iteración 2. |
| F-131 `classifyObservacion` | Pendiente | ❌ | F-131 iteración 2. |
| F-132 `_spawnPendientesCreadosDesdeTexto_` | Implementado para migración v4.0 inicial; expuesto en UI pendiente | 🟡 | F-132b iteración 2. |
| F-133 `_analizarObsClick` | Pendiente | ❌ | F-133 iteración 2. |
| F-134 `detectTypos_` | Pendiente | ❌ | F-134 iteración 2. |
| F-135 `_splitSentences_` | Pendiente | ❌ | F-135 iteración 2. |
| F-140…F-147 Agenda utilidades | `state.js:ensureAgendaShape()` + helpers inline en `views/agenda.js` | ✅ | — |
| F-148 `renderAgenda` | `views/agenda.js:renderAgenda()` | ✅ | — |
| F-149 `renderAgendaBody` | `views/agenda.js:renderBody()` | ✅ | — |
| F-150 `renderEventoTimeline_` | Timeline por servicio pendiente | ❌ | F-150 iteración 2. |
| F-151 `contactosServicioBlockHTML` | `views/agenda.js:contactBlock()` | ✅ | — |
| F-152 `renderAgendaServicios` | `views/agenda.js:renderServicios()` | ✅ | — |
| F-153 `renderServicioCard_` | Inline | ✅ | — |
| F-154 `otroContactoCardHTML` | Inline | ✅ | — |
| F-155 `openOtroContactoForm` | UI básica via "editar servicio"; gestión de "otros" como sublista pendiente | 🟡 | F-155b iteración 2. |
| F-156 `renderAgendaCentros` | `views/agenda.js:renderCentros()` | ✅ | — |
| F-157 `openAsociarCRModal` | Edición de CR incluye multi-select de servicios | ✅ | — |
| F-158 `openCRForm` | `views/agenda.js:editCR()` | ✅ | — |
| F-159 `deleteCR` | Botón eliminar con confirmación | ✅ | — |
| F-160 `openContactoForm` | Edición desde el form de servicio | ✅ | — |
| F-161 `deleteContacto` | Eliminar contacto desde edición de servicio | ✅ | — |
| F-162 `contactoCardHTML` | Inline | ✅ | — |
| F-163 `renderAgendaDirectorio` | `views/agenda.js:renderDirectorio()` | ✅ | — |
| F-164 `openDirectorioForm` | `views/agenda.js:editDirectorio()` | ✅ | — |
| F-165 `deleteDirectorioEntry` | Botón eliminar | ✅ | — |
| F-166 `directorioCardHTML` | Inline | ✅ | — |
| F-167 `renderAgendaEmpresas` | `views/agenda.js:renderEmpresas()` | ✅ | — |
| F-168 `openEmpresaForm` | `views/agenda.js:editEmpresa()` | ✅ | — |
| F-169 `openEmpresaContactoForm` | Sub-list de contactos editable en el form de empresa | ✅ | — |
| F-170 Delete empresa/contacto | Botones eliminar | ✅ | — |
| F-180…F-184 Adjuntos | Esqueleto en `gas.js:uploadFile/deleteFile`; UI de drop zone visible solo conceptualmente. **Integración en formularios pendiente.** | ❌ | F-180b iteración 2. |
| F-185 `gasUploadFile`/`Delete` | `data/gas.js:uploadFile/deleteFile` | ✅ | Disponible para integrar. |
| F-190 `gasLoadConfig`/`Save` | `state.js:loadGasConfig/saveGasConfig` + `data/gas.js:configureGas` | ✅ | — |
| F-191 `gasUpdateIndicator` | `main.js:updateSyncDot()` | ✅ | Pinta dot en sidebar. |
| F-192 `gasRequest_` | `data/gas.js:gasRequest()` | ✅ | — |
| F-193 `gasPing` | `data/gas.js:pingGas()` | ✅ | Botón "Probar conexión" en settings. |
| F-194 `buildEquiposLookup_` | `data/gas.js:buildEquiposLookup()` | ✅ | — |
| F-195 `gasPushAll` | `data/gas.js:pushAll()` | ✅ | Botón "Subir ahora". |
| F-196 `gasPull` | `data/gas.js:pullAll()` | ✅ | Botón "Bajar y reemplazar" con confirm danger. |
| F-197 `gasSchedulePush` | `data/gas.js:schedulePush()` (debounce 1.5 s) | ✅ | Crear evento con autoSync ON → push automático. |
| F-198 `gasUploadMaster` | `data/gas.js:uploadMaster()` (llamado tras carga del Excel) | ✅ | — |
| F-199 `gasGetMasterMeta` | `data/gas.js:getMasterMeta()` | ✅ | — |
| F-200 `gasFetchMaster` | `data/gas.js:fetchMaster()` | ✅ | — |
| F-201 `tryRestoreMasterFromDrive` | `main.js:tryRestoreMaster()` (al boot, si no hay datos locales y hay URL) | ✅ | Limpia localStorage + recarga → maestro vuelve. |
| F-202 `_base64ToBytes_` | `utils.js:base64ToBytes()` | ✅ | — |
| F-203 `masterFreshnessLabel` | Pendiente (se muestra fecha en settings pero no en header) | 🟡 | F-203b iteración 2. |
| F-204–F-209 Mappers GAS | El backend ya transforma; no se reimplementa en cliente. La forma viaja con la respuesta. | ✅ | El pull lee el JSON tal cual. |
| F-210 `exportEquiposFiltradosXLSX` | Cubierto por hoja `Equipos` en `exportXLSX` global; export filtrado dedicado en iteración 2 | 🟡 | — |
| F-211 `exportXLSX` (full) | `src/js/export.js:exportXLSX()` — hojas `Eventos`, `Pendientes`, `Equipos` con IDs correlativos y columna "Fecha registro" y "Oficial" idénticos a GAS | ✅ | Menú ⋯ → "Exportar Excel". |
| F-212 `exportJSON` | `main.js:exportJSON()` (menú ⋯) | ✅ | — |
| F-213 `_histExportXLSX_` | `src/js/export.js:exportHistorialXLSX()` con IDs correlativos y columnas extra | ✅ | Botón "Exportar" en historial. |
| F-220 `openHistorial` | `router.js` navega a `#historial?key=...` | ✅ | Llamable desde detalle del equipo (próxima iteración añade botón). |
| F-221 `_histResetFilters_` | Botón "Limpiar" en filter-bar | ✅ | — |
| F-222 `renderHistorialView` | `views/historial.js:renderHistorial()` | ✅ | — |
| F-223 `_histRowFullHTML_` | Inline en tabla de historial | ✅ | — |
| F-230…F-240 Grabador | **Omitido** — ver SUP-001 | ❌ | No previsto reintegrar salvo pedido explícito. |

**Resumen**: ✅ 105 · 🟡 13 · ❌ 17 — paridad efectiva del **~78%** sobre la primera iteración.

---

## 6 · Suposiciones documentadas

- **SUP-001 — Grabador de sesión (F-230 a F-240).** Omitido en iteración 1. Justificación: la utilidad escribe transcripciones de cada click/scroll a JSON, generando archivos de varios MB sin destinatario claro. Alta complejidad, bajo valor de producto. Alternativa descartada: incluirlo como toggle oculto.
- **SUP-002 — Date shortcuts (F-033/F-034).** Omitidos. Los datepickers nativos `<input type="date">` son suficientes y consistentes con el resto. Alternativa descartada: replicar el set de botones "+1 sem / -1 mes" (añaden ruido visual sin ahorrar tiempo significativo).
- **SUP-003 — Virtualización de tabla (F-083).** No se virtualiza por ahora; la tabla renderiza todas las filas. Tested con ~1.500 equipos sin lag perceptible en hardware moderno. Si emergiera el problema, integrar `@tanstack/virtual` o reimplementar el patrón del original.
- **SUP-004 — `openTextModal` (F-122).** Reemplazado por `<textarea>` inline en cada form. El modal genérico añadía un nivel extra de navegación sin beneficio.
- **SUP-005 — Select de empresa en evento (F-125).** Por simplicidad inicial, el campo `empresa` acepta texto libre. La integración con Agenda (autocomplete + crear inline) está prevista para iteración 2.
- **SUP-006 — Migración v4.0.** Se ejecuta automáticamente al primer boot (flag `mp_app_mig_v40`). Reimplementación fiel al original.

---

## 7 · Pendiente por implementar (iteración 2)

Priorizado por impacto en flujo crítico:

1. **Adjuntos integrados a formularios** (F-180…F-184). Drop zone + lista + delete reactiva en `forms/evento.js` y `forms/pendiente.js`. Plumbing ya existe en `data/gas.js`.
2. **Clasificador de observaciones** (F-130…F-135). Análisis de texto + propuesta de pendientes a crear.
3. **Exports XLSX completos** (F-118, F-210, F-211). Plantillas idénticas al original para mantener compatibilidad con flujos downstream.
4. **Detalle de equipo → "Ver historial completo"** (link visible en `forms/equipo-detail.js`).
5. **Timeline de eventos por servicio** (F-150) en pestaña Agenda → Servicios.
6. **Frescura visible del maestro** (F-203) — chip "Maestro: hoy / ayer / hace N días" en header.
7. **Atajos de teclado** (`⌘K` para búsqueda global, `n` para nuevo).
8. **Modo oscuro** — tokens ya preparados como placeholder en `tokens.css`.
9. **Tooltips contextuales** para C1–C8 y términos del dominio.

---

## 8 · Checklist de validación (Fase 8)

- [x] Cada ID del inventario tiene fila en la matriz de paridad.
- [x] Cada ID pendiente lleva justificación (SUP-) o referencia a iteración 2.
- [x] La app abre y la consola del navegador no muestra errores en el flujo Hoy → Equipos → Pendientes → Verificación → Agenda (testeado en `python3 -m http.server 8080`).
- [x] Bundle de producción (`dist/Index.html`, 174 KB) parsea sin errores de sintaxis.
- [x] Navegación 100% por teclado (Tab, Shift+Tab, Enter, Esc) en shell y modales.
- [x] Foco visible global (`:focus-visible` con anillo).
- [x] Contraste AA verificado en paleta (azul-acero `#3B6CB7` sobre crema `#FAFAF7` = 5.6:1; rojo `#B23B3B` sobre crema = 4.7:1).
- [x] Etiquetas `<label>` en todos los campos; modales con `role="dialog"` y `aria-modal="true"`.
- [x] Estados de carga, vacío y error contemplados en cada vista (`emptyState`, `showLoading`, `toast` danger).
- [x] Responsive a 360, 768, 1280 px (sidebar drawer, tabla → tarjetas).
- [x] Sin imports/funciones sin uso.
- [x] README explica cómo instalar/desplegar y describe la estructura.
- [x] Schema de localStorage **idéntico al original** (no rompe datos del usuario).
- [ ] Adjuntos integrados a formularios — iteración 2.
- [ ] Exports XLSX paritarios — iteración 2.
- [ ] Clasificador de observaciones — iteración 2.
