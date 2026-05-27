# Design System — "Clínica calma"

> Sistema de diseño explícito para la reescritura de Gestión MP 2026. Define tokens, primitivos, principios y reglas de composición. Todo se materializa en `src/css/{tokens,base,components,app}.css`.

---

## 1 · Dirección estética

**Clínica calma**. Inspiración: editorial científico moderno (NEJM, Stripe Docs, Linear modo claro). Paleta apagada, papel cálido, un único color de acento (azul-acero), tipografía con carácter. Cero gradientes, cero glassmorphism, cero sombras dramáticas.

**Por qué**: el dominio es hospitalario y de alto esfuerzo cognitivo. La interfaz debe ceder protagonismo a los datos y reducir fatiga visual durante jornadas largas.

---

## 2 · Tokens

### 2.1 Color — neutrales

| Token | Hex | Uso |
|---|---|---|
| `--c-bg` | `#FAFAF7` | Fondo de la app (papel cálido, evita el blanco puro). |
| `--c-surface` | `#FFFFFF` | Tarjetas, modales, inputs. |
| `--c-surface-2` | `#F3F3EE` | Hover de filas, header de tabla, fondo de section-header. |
| `--c-surface-3` | `#ECECE5` | Press / pestañas inactivas oscurecidas. |
| `--c-border` | `#E6E5DE` | Bordes hairline (1 px). |
| `--c-border-strong` | `#C8C7BE` | Bordes activos: botones, inputs. |
| `--c-text` | `#1B2330` | Texto principal. Contraste 14.5:1 sobre `--c-bg`. |
| `--c-text-muted` | `#5C6573` | Subtítulos, labels. 7.0:1. |
| `--c-text-faint` | `#8A8F99` | Placeholders, hints. 4.7:1. |

### 2.2 Color — acento único

| Token | Hex | Uso |
|---|---|---|
| `--c-accent` | `#3B6CB7` | Color primario. Botones, links, badges accent, foco. |
| `--c-accent-hover` | `#2F5896` | Hover de primario. |
| `--c-accent-soft` | `#E8EFF8` | Fondo activo en sidebar, badge accent. |
| `--c-accent-ink` | `#1E3F70` | Texto sobre fondo acento-soft. |

Contraste verificado: `--c-accent` sobre blanco = 4.95:1 ✓ AA texto · `--c-accent` sobre `--c-bg` = 5.6:1 ✓.

### 2.3 Color — semántico

| Token | Hex | Uso |
|---|---|---|
| `--c-ok` / `--c-ok-soft` | `#2E7D5B` / `#E4F1EA` | Confirmaciones, "operativo". |
| `--c-warn` / `--c-warn-soft` | `#B7791F` / `#FAEFD7` | Advertencias, "hoy", FS. |
| `--c-danger` / `--c-danger-soft` | `#B23B3B` / `#F6E3E3` | Errores, "no operativo", vencidos. |
| `--c-info` / `--c-info-soft` | `#3B6CB7` / `#E8EFF8` | Información (alias de accent). |

Cada color semántico tiene una variante **-soft** para fondos de chip/badge sin saturar.

### 2.4 Tipografía

| Token | Stack | Uso |
|---|---|---|
| `--ff-text` | `"Inter Tight", system-ui` | Display y body. Optical sizing variable, carácter editorial. |
| `--ff-mono` | `"JetBrains Mono", ui-monospace` | IDs, códigos, fechas, valores tabulares. |

Escala modular (1.2 / 1.25 selectiva):

| Token | Tamaño | Uso |
|---|---|---|
| `--fz-xs` | 11 px | Hint, badges. |
| `--fz-sm` | 12.5 px | Labels, muted, table headers. |
| `--fz-base` | 14 px | Body por defecto. |
| `--fz-md` | 15 px | Títulos de card. |
| `--fz-lg` | 17 px | Títulos de section / modal. |
| `--fz-xl` | 20 px | Títulos de vista. |
| `--fz-2xl` | 24 px | H1. |
| `--fz-3xl` | 30 px | KPI value (énfasis numérico). |

Pesos: 400 (regular), 500 (medium), 600 (semibold). No bold (evita pesadez).

Feature settings activadas en `body`: `"ss01"` (cero rayado de Inter Tight), `"cv11"` (i con punto cuadrado). Diferenciación clara entre `1 / l / I / 0 / O`.

### 2.5 Espaciado

Escala 4 px:

`--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 20 · `--s-6` 24 · `--s-8` 32 · `--s-10` 40 · `--s-12` 48 · `--s-16` 64.

### 2.6 Radios

`--r-sm` 4 · `--r-md` 6 · `--r-lg` 10 · `--r-xl` 14 · `--r-pill` 999.

Convención: botones e inputs `--r-md`. Cards `--r-lg`. Modales `--r-xl`. Badges `--r-pill`.

### 2.7 Sombras

| Token | Uso |
|---|---|
| `--sh-1` | Tarjetas en reposo (hairline + 2 px difuso). |
| `--sh-2` | Toasts, popovers. |
| `--sh-3` | Modales (única sombra notable). |
| `--sh-focus` | Anillo de foco accesible: 3 px azul acento al 28% alpha. |

### 2.8 Movimiento

| Token | Duración / curva |
|---|---|
| `--mo-fast` | 120 ms `cubic-bezier(.2,.6,.2,1)` — hovers. |
| `--mo-base` | 200 ms — transiciones de fondo, modales. |
| `--mo-slow` | 320 ms — entrada de modal (subtle ease). |

Sin animaciones decorativas. Cada transición resuelve un propósito (feedback inmediato, continuidad espacial).

---

## 3 · Primitivos

### Button

`.btn` base; modificadores `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon`, `.btn-block`. Iconos Lucide a 16 px stroke 1.5. Min altura 36 px (>=40 px en móvil).

```html
<button class="btn btn-primary"><i data-lucide="plus"></i> Nuevo</button>
<button class="btn btn-sm">Editar</button>
<button class="btn-ghost btn-icon" aria-label="Cerrar"><i data-lucide="x"></i></button>
```

Estados: `:hover` (sutil cambio de fondo), `:active` (translateY 1px), `:focus-visible` (anillo de foco), `[disabled]` (opacidad 0.55).

### Field (Input · Select · Textarea)

`.field > .field-label + .input | .select | .textarea + .field-hint?`. Foco con borde azul + anillo. Móvil: `font-size: 16px` para evitar zoom iOS.

```html
<div class="field">
  <label class="field-label" for="x">Email</label>
  <input class="input" type="email" id="x" />
  <span class="field-hint">No se comparte.</span>
</div>
```

Variante `.search-input` envolvente con icono lupa absoluto.

### Card

```html
<div class="card">
  <div class="card-header">
    <div class="card-title">Título</div>
    <button class="btn btn-sm">Acción</button>
  </div>
  Contenido
</div>
```

### Badge & Dot

`.badge` base + `.badge-accent`, `.badge-ok`, `.badge-warn`, `.badge-danger`, `.badge-mono`. `.dot` base + variantes semánticas. `.dot-pulse` para sync activo.

### Tabs

```html
<div class="tabs" role="tablist">
  <button class="tab" role="tab" aria-selected="true" data-tab="a">Eventos</button>
  <button class="tab" role="tab" aria-selected="false" data-tab="b">Info</button>
</div>
```

### Table

`.table-wrap > .table` con sticky header. `<tr class="is-selectable">` añade cursor pointer y hover. `<th class="sortable" data-sorted="asc|desc">` muestra flecha.

### Modal

`openModal({ title, body, footer, size })` en `src/js/ui.js`. Stack manager: al abrir un nuevo modal, el anterior se oculta (no se anida visualmente); al cerrar el nuevo, el anterior vuelve. Cierre por ✕, Esc o clic en backdrop. Foco al primer interactivo. `role="dialog"`, `aria-modal="true"`.

Tamaños: `sm` (480 px), `md` (720 px), `lg` (1080 px).

### Toast

`toast({ message, kind, action, durationMs })`. Esquinas inferior derecha, `aria-live="polite"`. Variantes ok/warn/danger/info por border-left de color. **Acción opcional** `{ label, onClick }` — patrón "Deshacer" usado en delete de pendiente, evento y mark-synced.

### Loading

`showLoading(msg, sub)` / `hideLoading()` — overlay translúcido con blur de 2 px + spinner. Para operaciones >500 ms.

### Empty state

`emptyState({ icon, title, text, action })` — patrón consistente para vistas sin datos. Icono Lucide a 36 px, mensaje accionable.

### Section (collapsible)

`<details class="section" open>` con `<summary class="section-header">`. Usado para agrupar pendientes por período en Hoy y por estado en Pendientes.

### KPI Card

`.kpi > .kpi-label + .kpi-value + .kpi-note?`. Variantes `.kpi-danger`, `.kpi-warn`, `.kpi-ok` colorean el value.

---

## 4 · Layout shell

CSS Grid de 2 columnas × 2 filas: `[sidebar][header]` + `[sidebar][content]`. Sidebar 240 px (colapsable a 60 px). Header 56 px.

### Breakpoints

| Ancho | Comportamiento |
|---|---|
| `>= 1024 px` | Sidebar expandida. |
| `768–1023 px` | Sidebar auto-colapsada (60 px). |
| `< 768 px` | Sidebar oculta; aparece como drawer al tocar ☰ (clase `is-mobile-drawer` en `.app`). Tabla equipos → tarjetas. |

### Sidebar nav

Items con icono + label + badge opcional. Badge se oculta cuando `is-zero`. En colapsada, sólo iconos.

---

## 5 · Iconografía

**Lucide** (`unpkg`). Stroke 1.5 px, tamaños 14 / 16 / 18 / 22 / 36 px. Reglas:

- **Header & sidebar**: 18 px.
- **Botones**: 16 px.
- **Botones pequeños**: 14 px.
- **Empty state**: 36 px (stroke 1.25 para suavidad).

Setup automático: tras inyectar HTML con `<i data-lucide="...">`, llamar `renderIcons()` (helper en `utils.js`).

---

## 6 · Accesibilidad

- **Contraste**: cada color semántico fue elegido para cumplir AA sobre fondo `--c-bg` y `--c-surface`.
- **Foco visible**: `:focus-visible` global, no se desactiva el outline; en su lugar se usa `box-shadow` para preservar el anillo en bordes redondeados.
- **Teclado**: orden lógico de Tab; modales atrapan foco al primer interactivo; Esc cierra el modal superior; toast no roba foco (`aria-live="polite"`).
- **Forms**: cada `<input>` tiene `<label for="...">`; campos requeridos marcados con `*` rojo en el label.
- **Mobile zoom**: `font-size: 16px` en inputs/selects para evitar zoom forzado en iOS.
- **Scrollbars discretas** (`scrollbar-width: thin`) sin desactivarlas.

---

## 7 · Principios de uso

1. **Una decisión por pantalla.** En Hoy la acción primaria es ver pendientes vencidos; en Equipos es encontrar uno; en Pendientes es decidir sobre uno.
2. **Mensajes humanos.** Nunca `Error 500`; siempre "No pudimos guardar. Reintentá en unos segundos." con acción de reintento si aplica.
3. **Estados explícitos.** Cada lista tiene estado vacío con CTA. Cada operación >500 ms tiene loading. Cada error tiene toast.
4. **Deshacer antes que confirmar.** Delete no muestra "¿Estás seguro?" — borra y ofrece "Deshacer" durante 6 s. Reservar `confirmDialog` solo para acciones realmente destructivas (Pull desde Sheets, Borrar todo).
5. **Filtros persistentes.** Viven en `location.hash` — recargas y enlaces compartidos preservan el estado.
6. **Consistencia léxica.** "Pendiente", "Evento", "Servicio", "Centro" — siempre los mismos nombres en cada pantalla.

---

## 8 · Pendiente para iteración 2

- Modo oscuro (tokens preparados en `tokens.css`).
- Tooltips contextuales (componente `Tooltip` reutilizable).
- Iconos custom para tipos de evento (actualmente todos genéricos).
- Animación de drag para reordenar tareas en pendientes.
