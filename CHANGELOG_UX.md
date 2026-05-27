# CHANGELOG UX — Qué cambió respecto del HTML original y por qué

> Cada cambio respecto a `GestionMP_2026_corregido_33.html` está aquí justificado. Los cambios buscan reducir fricción y carga cognitiva sin perder funciones.

---

## Shell de la app

| Antes | Ahora | Por qué |
|---|---|---|
| Header con 7+ acciones simultáneas (cargar, exportar, sync, usuario, grabar, reset, menu) | Una acción primaria visible (Cargar archivo) + menú "⋯" para configuración, export, reset | **Ley de Hick**: menos elecciones simultáneas = decisión más rápida. La acción más frecuente queda inmediata. |
| Indicador de sync como `.gas-dot` solo en header | Indicador en sidebar con texto contextual ("Sincronizado hace 5 min", "Esperando sync", "Sin backend") | El estado es relevante pero no urgente; sidebar libera espacio en el header y aporta contexto léxico además del color. |
| Sidebar compacto sin badges | Sidebar con badges numéricos rojos en "Hoy" (vencidos) y ámbar en "Pendientes" (abiertos), ocultos cuando son 0 | Permite priorizar de un vistazo sin abrir cada vista. |
| Modal genérico para texto largo (`openTextModal`) | `<textarea>` inline en cada formulario | Un modal sobre otro modal solo para editar texto es navegación inútil. |

---

## Navegación entre vistas

| Antes | Ahora | Por qué |
|---|---|---|
| `selectView()` con función global; estado de filtros se perdía al cambiar de vista | Router por hash con parámetros (`#equipos?q=ecg&servicio=UCI`) | Recargas, "atrás" del navegador y compartir enlace mantienen el contexto. **Nielsen #6 (reconocimiento vs. recuerdo)**. |
| Sin enlace permanente a una vista filtrada | Cada cambio de filtro actualiza la URL | Idem. |

---

## Vista "Hoy"

| Antes | Ahora | Por qué |
|---|---|---|
| 3 KPI cards + 3 tablas separadas | 3 KPIs + 4 secciones colapsables (Vencidos · Hoy · Próx 7 d · Próx 8–30 d) | Más resolución temporal sin más ruido; las secciones empiezan colapsadas cuando están vacías. |
| Acciones por pendiente: editar | Acciones rápidas: posponer 7 días (⏰), editar (✏️), cerrar (✓) — todas con confirmación por **Deshacer** en lugar de "¿Estás seguro?" | **Nielsen #5**: prevención de errores sin bloquear. Toast con "Deshacer" 6 s permite recuperación sin fricción. |
| Sin alerta visual sobre vencimiento | Badge "hace 3 días" en rojo · "mañana" en gris · "vence hoy" en ámbar | Etiqueta verbal humana (`fmtRelative`) más rápida de procesar que ISO. |

---

## Vista "Equipos"

| Antes | Ahora | Por qué |
|---|---|---|
| Sólo dropdowns; sin búsqueda libre | Search bar como elemento primario + 4 dropdowns | **Nielsen #7**: usuarios expertos buscan por inventario o equipo; los dropdowns sirven al perfil ocasional. |
| Tabla pesada incluso en móvil | Tabla en desktop / **tarjetas en `< 640 px`** | Scroll horizontal era el principal dolor mobile reportado en la auditoría. |
| Filtros se reseteaban al volver | Filtros persisten en URL hash | Idem que en Navegación. |
| Click en fila → modal con varias pestañas anidables | Click → modal con 3 tabs claras (Eventos · Pendientes · Información) | Reduce profundidad de navegación. |

---

## Vista "Pendientes"

| Antes | Ahora | Por qué |
|---|---|---|
| Lista plana | Agrupada por estado (Abiertos · Por iniciar · Cerrados) en secciones colapsables | Reduce ruido — el flujo principal es trabajar lo abierto. |
| Eliminar sin recuperación | Eliminar → toast "Pendiente eliminado · Deshacer" durante 6.5 s | Misma justificación que en Hoy. |
| Filtro por responsable invisible para usuarios no técnicos | Dropdown explícito + filtro `q` para texto libre | Más descubrible. |

---

## Formulario "Evento"

| Antes | Ahora | Por qué |
|---|---|---|
| 13 campos visibles a la vez | Campos esenciales (tipo, fecha, resultado, ejecutor, estado, empresa) siempre · Detalles administrativos (envío, cotización, OC, folios) en `<details>` colapsable | **Ley de Miller**: < 7±2 elementos en pantalla a la vez. Quien lo necesita lo abre. |
| Sin hint sobre códigos | Hint debajo de "Resultado" explicando Si / C1–C8 / FS / Baja / NU | **Nielsen #2**: ayuda contextual sin requerir glosario externo. |
| Botón "Analizar" en 3 lugares con comportamientos distintos | Análisis automático de líneas que empiezan con `PENDIENTES:` durante la **migración inicial** (compatibilidad con datos legacy). Re-integración del clasificador interactivo en iteración 2. | Reduce confusión hasta tener una sola implementación clara. |

---

## Formulario "Pendiente"

| Antes | Ahora | Por qué |
|---|---|---|
| Tareas como checkboxes que toggleaban estado al click | Checkbox + input editable + botón eliminar por tarea | Permite editar la descripción sin re-crear; eliminación explícita. |
| Seguimientos inline con form crammed | Botón "Agregar seguimiento" abre modal pequeño dedicado (tipo · fecha · contactado · texto) | Patrón task-oriented: una decisión a la vez. |
| Sin diferenciación visual de tipos de seguimiento | Badge con el tipo (avance / delegación / recordatorio / bloqueo / cierre) | Escaneo rápido en el log. |

---

## Vista "Verificación"

| Antes | Ahora | Por qué |
|---|---|---|
| Cabecera densa con counts por código por mes (12 × N) | 3 KPIs + secciones colapsables (Encabezados / Duplicados / Parciales / Discrepancias) | El detalle por mes/código rara vez se consulta y satura. Las KPIs comunican lo crítico (equipos válidos, familias, filas de registro). El conteo detallado puede volver como sección expandible en iteración 2 si emerge demanda. |
| Discrepancias mezcladas | Subsecciones "Falta en archivo" y "Resultado distinto" con hint explicativo | Distinción accionable; sin hint era difícil saber qué hacer con cada una. |
| "Marcar como sincronizado" sin recuperación | Mark synced + toast "Deshacer" | Idem. |

---

## Vista "Agenda"

| Antes | Ahora | Por qué |
|---|---|---|
| 4 tabs con UIs heterogéneas | 4 tabs con tarjeta consistente (card-header + acciones) | Coherencia inter-secciones. |
| Edición de CR con form largo monolítico | Form modal con selección visual de servicios (checkboxes en lista scrollable) | Más rápido para asociar muchos servicios. |
| Empresas con contactos en sub-modal | Empresas con contactos como sub-lista editable en el mismo modal (con "agregar / quitar") | Reduce niveles de navegación; ver y editar contactos en contexto. |

---

## Modales

| Antes | Ahora | Por qué |
|---|---|---|
| Modales anidados (modal → modal → modal), Esc cerraba todos | **Stack manager**: nuevo modal oculta al anterior; al cerrar el nuevo, restaura el anterior. Esc cierra solo el superior. | Elimina la pila visual confusa; preserva el contexto de retorno. |
| Sin animación de entrada | Entrada de 320 ms con scale + opacity sutil + backdrop fade 200 ms | Continuidad espacial sin distracción. |
| Confirm por `confirm()` nativo | `confirmDialog({ title, message, danger })` con botones tipados | Consistencia visual y mensajes específicos. |

---

## Toasts

| Antes | Ahora | Por qué |
|---|---|---|
| Solo info textual | Variantes ok/warn/danger/info diferenciadas por border-left de color + icono Lucide | Decodificación rápida del kind. |
| Sin acción | `action: { label, onClick }` para "Deshacer" en delete/snooze | Patrón fundamental para reducir ansiedad ante acciones destructivas. |
| Aria-live no declarado | `aria-live="polite"` en el contenedor | Lectores de pantalla anuncian sin interrumpir. |

---

## Datos y formato

| Antes | Ahora | Por qué |
|---|---|---|
| Fechas en ISO crudo | `fmtDate` (DD-MM-YYYY) en tablas · `fmtRelative` ("hace 3 días", "mañana") en cards | Comunicación en lenguaje natural. |
| `'—'` para vacíos en algunas vistas, otras vacías | `val(v)` consistente: siempre `'—'` para null/undefined/'' | Predicibilidad visual. |
| IDs visibles sin distinción tipográfica | IDs en `font-family: JetBrains Mono` | Diferenciar lo identificador de lo legible reduce errores de lectura. |

---

## Accesibilidad ganada

- Foco visible global (`box-shadow: var(--sh-focus)`) en todos los interactivos.
- Tab order natural en formularios.
- `aria-modal="true"` en cada modal; `aria-current="page"` en sidebar.
- Inputs con `font-size: 16px` en móvil (evita zoom iOS).
- Modal close button con `aria-label="Cerrar"`.
- Toast con `aria-live="polite"`.
- Contraste AA verificado en toda la paleta.

---

## Lo que se eliminó (justificado)

- **Grabador de sesión** (F-230…F-240). Generaba archivos JSON de varios MB sin destinatario claro. Bajo valor de producto. Documentado en `AUDIT.md → SUP-001`.
- **Shortcuts de fecha relativa** (`dateShortcuts`). Datepicker nativo es suficiente. Documentado en `SUP-002`.
- **Modal de texto genérico** (`openTextModal`). Reemplazado por textarea inline. Documentado en `SUP-004`.

---

## Iteración 1.1 — Estado "Oficial" en eventos MP y pendientes desde evento

| Cambio | Detalle | Por qué |
|---|---|---|
| **Estado "Oficial / No oficial" en eventos MP** | Cada evento MP nuevo nace como **No oficial** (badge ámbar visible). Al cargar un nuevo maestro, la app reconcilia automáticamente: si `regRes[mes] === resultado` del evento, lo promueve a **Oficial** (badge verde). El usuario ve un toast: "N eventos promovidos a oficiales". | Cierra el círculo de trazabilidad: el técnico carga el evento en la app antes de que aparezca en el maestro Excel, y el sistema confirma cuándo el maestro lo absorbe. Reduce dudas sobre qué quedó "registrado de verdad". |
| **Crear pendiente desde un evento** | Botón "Crear pendiente" en el form de evento y en cada tarjeta de evento del detalle de equipo. Precarga `descripcion` (de la observación, si es corta), `ejecutor` y referencia `eventoId` para trazabilidad. | Evita re-tipear contexto. Permite pasar de "registré algo que pasó" a "y queda esto por hacer" sin fricción. |
| **Export XLSX completo** (menú ⋯) | Genera hojas `Eventos`, `Pendientes`, `Equipos` con la misma nomenclatura del backend (`HEADERS[SHEET_EVENTOS]`), IDs correlativos 1..N tras ordenar por `creadoEn` ASC, columna "Fecha registro" y nueva columna "Oficial" (Sí/No). | Intercambiabilidad con la hoja Sheets: el .xlsx exportado tiene el mismo orden y columnas que la pestaña Eventos del backend, lo que facilita comparaciones y validación cruzada. |
| **Historial: columnas extra** | ID correlativo, Fecha registro, Oficial. Checkbox "Solo no oficiales" para filtrar rápidamente. | Misma motivación que arriba — el historial es donde el usuario investiga; debe ver lo mismo que ve quien consulta la Sheet. |
| **Verificación: KPIs nuevos** | "Eventos MP oficiales" / "Eventos MP no oficiales" / "Discrepancias archivo↔app" como segunda fila de KPIs. | Da visibilidad al **inventario de eventos pendientes de confirmar en el maestro** — es el dato que motivó toda la feature. |
| **Backend `Code.gs` v3.12** | Añade columna `Oficial` a `HEADERS[SHEET_EVENTOS]` y emite `Sí`/`No` en `replaceAll_`. Ejecutar `migrate()` para sumar la columna a hojas existentes (no destructivo). | Asegura paridad entre cliente y backend. |
| **No migración destructiva** | Eventos sin campo `oficial` se tratan como oficiales (`ev.oficial !== false`). Sin migración explícita. | Datos pre-feature no quedan en limbo: si ya existían, se asumen registrados (el flujo histórico era manual antes). |
| **`eventoId` en pendientes** | Pendientes creados desde un evento llevan `eventoId` referencial; visible como badge "Desde evento <id>" en el form. | Trazabilidad bidireccional. |

## Lo que **no** se cambió (intencional)

- **Nomenclatura del dominio**: "Servicio", "Familia", "Pendiente", "Seguimiento", "C1-C8", "FS", "Baja", "NU". Es el vocabulario interno del hospital — cambiar términos rompería la continuidad mental con planillas, oficios, correos.
- **Backend Apps Script**. La API JSON es limpia y bien diseñada. Reescribirla sin razón sería trabajo destructivo.
- **Esquema de localStorage**. Mismas keys (`mp_app_*_v1`), mismo formato — los datos guardados por la versión vieja son leídos sin transformación.
- **Migración v4.0** (extraer pendientes de observaciones legacy). Ejecutada al primer boot. Idéntica al original.
