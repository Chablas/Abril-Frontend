# Sistema de Diseño — Abril Intranet

> Referencia visual única del proyecto. Cualquier pantalla, componente o feature 
> nuevo debe seguir esta guía salvo excepción documentada explícitamente.

---

## 1. Principios generales

- Estilo **flat** — sin sombras pesadas, sin gradientes.
- Inspiración **Power BI** para dashboards ejecutivos.
- Idioma de la UI: **español (es-PE)**.
- Títulos de página en **MAYÚSCULAS** (`route.data.titulo`).
- Diseño para **desktop 1440px** — responsive no requerido.
- **No** usar librerías de componentes UI externas (sin PrimeNG, Angular Material, 
  etc.) salvo las ya instaladas: `sweetalert2`, `chart.js`, `dhtmlx-gantt`, `jspdf`, 
  `xlsx`.

---

## 2. Paleta de colores

### 2.1 Sistema UDP (uso general)

| Uso | Color | Hex |
|---|---|---|
| Primary dark (títulos, headers, botones primarios) | ██ | `#1E3A5F` |
| Primary blue (acento, badges informativos) | ██ | `#2E6DB4` |
| Green success (AL DÍA, culminado, avance alto) | ██ | `#1B6B3A` |
| Red danger (CON RETRASO, vencido, avance crítico) | ██ | `#C0392B` |
| Orange warning (SIN ACTIVIDADES, avance medio-bajo) | ██ | `#D97706` |
| Background (fondo general de páginas) | ██ | `#f0f4f8` |
| Card background | ██ | `#ffffff` |
| Border (cards y tablas) | ██ | `#E2E8F0` |
| Text primary | ██ | `#1E3A5F` |
| Text secondary | ██ | `#64748B` |
| Text muted | ██ | `#94A3B8` |

### 2.2 Sistema unificado de color jerárquico (reemplaza a BCS)

> **Estado: implementado en Cronograma de Actividades** 
> (`cronograma-actividades.css` / `.ts`). Unifica la vieja paleta BCS (4 colores 
> de rama, buena regla de profundidad) con la paleta de 10 colores del Gantt de 
> Actividades (buena cantidad de ramas, pero sin regla de profundidad clara). 
> Se queda con la cantidad de la segunda y la regla de profundidad de la 
> primera. Estilo **flat** — se quitó el efecto premium (sombras + hover 
> elevado) que tenía el Gantt. Cronograma de Hitos/BCS **no** se migró — sigue 
> con su esquema propio de 4 colores por decisión explícita (ver nota al final 
> de esta sección).

**Pool de color raíz (hasta 10 ramas sin repetir color):**

```
indigo · salvia · steel · bronze · clay · slate · amethyst · forest · ochre · graphite
```

**Regla de profundidad implementada (`buildColorMap()` en Cronograma de 
Actividades):**

| Nivel | Regla |
|---|---|
| Nivel 1 (`.lvl-0`, raíz de rama) | Color raíz de la rama, uno de los 10 — asignado por rama (`rootIdx++` solo en nodos con `parentId == null`), nunca por índice de fila. Sin sombra, sin hover. |
| Nivel 2 (`.lvl-1`, hijos directos) | Derivado en vivo del color de su raíz vía `color-mix()` (10% / 25% / 85% según la variante usada — fondo/texto/borde) |
| Nivel 3+ (`.lvl-2` y `.lvl-deep`, unificados en una sola regla) | Fondo fijo `#f8fafc` + texto fijo `#4a6580` + `border-left: 3px` con `color-mix(in srgb, var(--base-color) 25%, transparent)` — el mismo valor que usa el borde de nivel 2, no una tonalidad nueva por generación (así queda visualmente "heredado", no derivado otra vez) |

No hay nodo de "nivel 0" superior en este árbol (las 10 ramas son la raíz real), 
así que esa fila de la regla original no aplicó — se omitió en la 
implementación.

**Reglas duras respetadas:**
- Asignación de color **siempre por rama**, nunca por índice de fila plano — 
  verificado en `buildColorMap()`: los descendientes heredan el hex exacto de 
  su raíz vía `findRootColor()`.
- Sin sombras, sin `box-shadow` de elevación, sin hover que cambie fondo en 
  ningún nivel.

**Nota — Cronograma de Hitos (BCS) no migrado:** por decisión explícita, este 
sistema unificado solo vive en Cronograma de Actividades por ahora. BCS sigue 
con sus 4 colores de rama (1a–1d) tal como está documentado en el historial del 
proyecto. Si en el futuro se decide unificar también ahí, actualizar esta nota 
y replicar la regla de nivel 3+ (fondo fijo + borde) en el árbol de Hitos.

---

## 3. Tipografía

- **Font family:** Inter (fallback: sans-serif del sistema).
- KPI value: `32px bold`, color de acento según contexto.
- KPI label: `11px uppercase`, `letter-spacing: 0.5px`, `#64748B`.
- Heading de página: `24px bold`, `#1E3A5F`.
- Subheading: `14px`, `#64748B`.
- Body / tabla: `13–14px regular`.
- Badge / label: `11px uppercase bold`.

---

## 4. Espaciado y grid

Escala base en múltiplos de 4px (ajustar al valor más cercano de esta lista antes 
de usar un número suelto):

```
4px · 8px · 12px · 16px · 20px · 24px · 32px · 40px · 48px · 64px
```

- Padding de página: `20–24px`.
- Gap entre secciones: `16–20px`.
- Gap entre elementos dentro de una card (label, valor, subtexto): `8px`.
- Gap entre cards de un grid KPI: `16px`.
- Grid de KPI cards: **4 columnas** (2 filas de 4 para dashboards ejecutivos).
- Border-radius estándar: `6px` (botones, inputs) / `10px` (cards) / `4px` 
  (badges).

---

## 5. Iconografía

**Librería sugerida: [Lucide](https://lucide.dev)** (`lucide-angular`).

Por qué: es la que ya usas en el stack de artifacts/React de este mismo entorno 
(`lucide-react`), es liviana, tree-shakeable, trazo consistente (stroke, no 
relleno), y no impone un sistema de diseño propio como Material Icons — encaja 
con el estilo flat sin competir visualmente con la paleta UDP.

- Tamaño estándar en tabs/menú: `18–20px`.
- Tamaño en botones: `16px`.
- Tamaño en KPI cards / headers de sección: `24px`.
- Color: hereda el color del texto que acompaña (no íconos multicolor sueltos).
- Grosor de trazo: `1.5–2px` (default de Lucide, no lo agrupes con íconos rellenos 
  de otra librería).

---

## 6. Componentes

### 6.1 Cards
- `background: #ffffff`
- `border: 0.5px solid #E2E8F0`
- `border-radius: 10px`
- Sin `box-shadow`.
- Para dashboards ejecutivos: `border-top: 4px solid <color-acento>` en lugar de 
  fondo de color.

### 6.2 Botones

**Primarios**
- `background: #1E3A5F`
- `color: #ffffff`
- `border-radius: 6px`
- Sin sombra.

**Ghost**
- `border: 1px solid #E2E8F0`
- `background: transparent`
- `color: #1E3A5F`

**Estados de interacción (todos los botones):**
- `hover`: oscurecer el fondo ~8% (`color-mix(in srgb, <color> 92%, black)`) — 
  nunca cambiar el tamaño ni añadir sombra pesada.
- `focus`: `outline: 2px solid #2E6DB4` con `outline-offset: 2px` (accesibilidad 
  de teclado).
- `disabled`: `opacity: 0.5`, `cursor: not-allowed`, sin hover.
- `active/pressed`: oscurecer un poco más que el hover (~12%).

### 6.3 Badges de estado
- `border-radius: 4px`, `11px uppercase bold`.

| Estado | Fondo | Texto |
|---|---|---|
| AL DÍA | `#dcfce7` | `#166534` |
| CON RETRASO | `#fee2e2` | `#991b1b` |
| SIN ACTIVIDADES | `#f1f5f9` | `#64748B` |
| CULMINADO | `#dcfce7` | `#166534` |
| VENCIDO | `#fee2e2` | `#991b1b` |
| EN PROCESO | `#dbeafe` | `#1e40af` |
| PENDIENTE | `#f1f5f9` | `#64748B` |

### 6.4 Semáforos
- Círculo de `10px` sólido.
- VERDE `#1B6B3A` · AMARILLO `#D97706` · ROJO `#C0392B` · GRIS `#94A3B8` (sin 
  actividades).

### 6.5 Barras de progreso
- `height: 6px`, `border-radius: 3px`.
- `≥75%` → `#1B6B3A` (verde) · `≥50%` → `#2E6DB4` (azul) · `≥25%` → `#D97706` 
  (naranja) · `<25%` → `#C0392B` (rojo).
- Sin datos → `#E2E8F0` (gris vacío).

### 6.6 Inputs / Selects
- `border: 1px solid #E2E8F0`
- `border-radius: 6px`
- `font-size: 14px`
- `focus`: `border-color: #2E6DB4` + `outline: 2px solid rgba(46,109,180,0.2)`.
- `error` (validación fallida): `border-color: #C0392B` + texto de error `12px` 
  color `#C0392B` debajo del campo.

### 6.7 Tablas
- Header: uppercase, `11–12px`, `#64748B`, `border-bottom`.
- Filas con hover: `background: #F8FAFC`, `cursor: pointer`.
- Filas CON RETRASO: `background: #FFF5F5`.
- Scroll vertical si hay muchos registros.

### 6.8 Modales / diálogos

Misma línea flat que las cards, sin reinventar estilo aparte:

- Contenedor: `background: #ffffff`, `border-radius: 10px`, sin `box-shadow` 
  pesado — solo un `box-shadow` sutil de elevación (`0 4px 12px rgba(0,0,0,0.08)`) 
  para separarlo del overlay, ya que a diferencia de las cards en página, el modal 
  sí necesita distinguirse del fondo oscurecido detrás.
- Overlay de fondo: `rgba(13, 27, 42, 0.4)` (usa el navy de la paleta BCS nivel 0, 
  no negro puro).
- Header del modal: `24px bold #1E3A5F`, con botón de cerrar (ícono Lucide `X`, 
  `20px`, `#64748B`, hover `#1E3A5F`).
- Padding interno: `24px`.
- Footer de acciones: alineado a la derecha, gap `12px` entre botones, botón 
  primario a la derecha del todo (ghost/cancelar a la izquierda del primario).
- Ancho estándar: `480px` (confirmaciones) / `640–720px` (formularios).

### 6.9 Alertas (SweetAlert2)

Adaptar la paleta UDP en vez del estilo default de la librería:

- Éxito: ícono check, color de acento `#1B6B3A`, botón de confirmación 
  `background: #1B6B3A`.
- Error: ícono de error, color de acento `#C0392B`, botón `background: #C0392B`.
- Advertencia/confirmación destructiva: ícono warning, color de acento 
  `#D97706`, botón de confirmar en `#C0392B` si la acción es irreversible 
  (eliminar), botón de cancelar como ghost.
- Tipografía: Inter, mismo tamaño que el resto de la UI (no usar el tamaño 
  default de SweetAlert2, que suele verse más grande de lo que pide esta guía).
- `border-radius: 10px` en el popup, consistente con las cards.
- Configurar esto una sola vez como preset/helper compartido (ej. 
  `sweetalertUdp.ts` con los defaults de color ya aplicados) — no repetir la 
  configuración de colores en cada llamada suelta a `Swal.fire()`.

### 6.10 Estados vacíos

Diseño propio, no solo texto plano:

- Ícono Lucide grande (`48–64px`, color `#94A3B8`) relacionado al contexto 
  (ej. `FileX` para "sin resultados", `Calendar` para "sin fechas asignadas").
- Texto principal: `14px`, `#64748B`, centrado, debajo del ícono.
- Texto secundario opcional (sugerencia de acción, ej. "Prueba con otro 
  filtro"): `13px`, `#94A3B8`.
- Si aplica, botón ghost debajo invitando a la acción principal (ej. "+ Agregar 
  hito personalizado").
- Padding vertical generoso: `48–64px` arriba y abajo para que no se vea 
  apretado dentro de la card/tabla contenedora.

---

## 7. Skeleton loading

- Color base: `#dde5ef`
- Color shimmer: `#eaeff6`
- Animación: shimmer de izquierda a derecha.
- Aplicar en: KPI cards, filas de tabla, cualquier contenedor que espere datos 
  HTTP (regla F8 — obligatorio en todo componente que haga llamadas al iniciar).

---

## 8. Interacción y transiciones (básico)

Solo lo esencial, sin animaciones elaboradas:

- Hover de botones y filas de tabla: transición de color `150ms ease` (nada de 
  saltos instantáneos ni animaciones largas que se sientan lentas).
- Skeleton shimmer: la única animación "decorativa" permitida por defecto.
- Sin transiciones de entrada/salida de modal, sin animaciones de página, sin 
  micro-interacciones adicionales salvo que se pida explícitamente para un caso 
  puntual.

---

## 9. Gráficos (Chart.js)

- Usar la paleta UDP como base de series: azul `#2E6DB4`, verde `#1B6B3A`, 
  naranja `#D97706`, rojo `#C0392B` — en ese orden de prioridad para series 
  múltiples antes de introducir colores nuevos.
- Grid lines: `#E2E8F0`, sutil.
- Tooltip: fondo `#1E3A5F`, texto blanco, `border-radius: 6px`.
- Sin efectos 3D, sin gradientes de relleno en barras/áreas — relleno sólido o 
  semitransparente simple (`opacity: 0.15` para el área bajo la línea).
- Leyenda: `12px`, `#64748B`.

---

## 10. Excepciones documentadas

Registrar aquí cualquier pantalla que se aparte deliberadamente de esta guía, 
para que no se confunda con un error de implementación.

_Ninguna vigente por ahora._ El Gantt de Cronograma de Actividades tenía 
temporalmente sombras y hover elevado ("Cronograma Corporativo Premium"); se 
decidió **no** mantenerlo como excepción — se corrigió a flat como parte del 
sistema unificado de color jerárquico (ver sección 2.2), ya implementado en 
`cronograma-actividades.css`.

---

## 11. Checklist rápido antes de dar por terminada una pantalla nueva

- [ ] Colores tomados de esta guía, no valores sueltos inventados.
- [ ] Espaciado ajustado a la escala de múltiplos de 4px.
- [ ] Íconos de Lucide, tamaño y color según contexto (menú/botón/KPI).
- [ ] Botones con los 4 estados (default/hover/focus/disabled) cubiertos.
- [ ] Skeleton loading si el componente hace llamada HTTP al iniciar (F8).
- [ ] Manejo de error visible en pantalla, nunca silencioso (F9).
- [ ] Estado vacío con ícono + texto, no solo un textito perdido.
- [ ] Título de página en MAYÚSCULAS.
- [ ] Si hay alerta de confirmación/éxito/error, usa el preset de SweetAlert2 
      con paleta UDP, no el default de la librería.
