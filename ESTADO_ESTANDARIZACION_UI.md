# Estado de estandarización UI 2026 — Abril-Frontend

Último commit relevante: `e2f622a` (push a `master` ya hecho).

## Qué es esto

Estamos migrando toda la app Angular a un estándar visual único documentado en `CLAUDE.md`
("UI standard (2026)"): componentes compartidos obligatorios (`app-abril-page-header`,
`app-search-select`, `app-search-input`, `app-filter-trigger`/`app-filter-modal`,
`app-status-badge`, `abrilBulkAction`, `titleCase`, clase `.abril-table`, `app-paginator`,
`ClientPager`). Ninguna página puede tener CSS/markup propio "a su manera" salvo que sea
un tipo de página genuinamente distinto (dashboard/tracker), y eso también debe
documentarse, no improvisarse.

## Bug raíz ya resuelto (importante, no revertir)

`src/app/shared/components/layout/layout.html` — el div `.page-content` no tenía
`display:flex` (le faltaba la clase `flex flex-col`). Sin eso, el `:host{display:flex;
flex-direction:column}` de CADA página quedaba inerte, y por eso ninguna página lograba
"header fijo, solo la tabla hace scroll". Ya está arreglado con una sola línea.

## Segundo bug raíz encontrado y resuelto (esta sesión)

Muchas páginas de `ssoma/gestion` tenían su **propio sistema de colores viejo**, aislado
del estándar real:
- Fondo de página gris/beige propio (`background: var(--color-abril-page-bg)` o hex
  directo `#f5f3ef`) en el contenedor raíz (`.lista-root` / `:host`), en vez de blanco.
  El token compartido `--color-abril-page-bg` es para el **layout general** (detrás del
  header), no para el contenido de una página — las páginas correctamente migradas
  fuerzan `bg-white` (ver `gestion-administrativa/features/gestion-salidas/` como
  referencia).
- Verde oscuro bespoke `#1b3a2d` / verde claro `#eaf2ee` (en vez del teal real
  `--color-abril-standard: #0F6E56` / `--color-abril-standard-light`).

Ya corregido en: `rac-lista`, `rac-penalidades`, `opt-lista`, `inspeccion-lista`,
`accidente-lista` (fondo raíz → blanco), y en 23 archivos CSS + 6 archivos TS
(SweetAlert2 `confirmButtonColor`, canvas `strokeStyle`) de SSOMA (verde → teal).

## Qué falta (pendiente, no se ha tocado)

1. **Dashboards con fondo gris propio, cada uno distinto** (no se tocaron porque son un
   tipo de página diferente — dashboard/tracker, no galería — y no existe todavía un
   estándar de fondo para dashboards):
   - `ssoma/gestion/indicadores-proactivos/pages/dashboard-acumulado/dashboard-acumulado.component.css`
   - `.../seguimiento-indicadores.component.css`
   - `.../desempeno-supervisor.component.css`
   - `ssoma/salud-ocupacional/paso/pages/dashboard/paso-dashboard.component.css`
   - `ssoma/gestion/opt/pages/dashboard/opt-dashboard.css`
   - `ssoma/gestion/inspeccion/pages/dashboard/inspeccion-dashboard.component.css`
   Decisión pendiente con el usuario: o se define un token de fondo para dashboards, o se
   deja blanco igual que las galerías.

2. **`ssoma/gestion/indicadores-proactivos/pages/programacion/prog-inspeccion.component.css`**
   tiene su propia paleta azul completa (`--p-primary: #0f4c75`, `--p-bg-page: #f4f6f9`,
   etc.), con muchos más usos que los demás archivos. No se tocó por precaución — requiere
   revisar cada uso antes de reemplazar en bloque.

3. **Estándar de "KPI cards arriba de una tabla"**: confirmado con el usuario que **no
   existe** un patrón documentado. Se usó ad hoc en
   `ssoma/salud-ocupacional/programaciones/programaciones.html` (`.kpis-row.shrink-0` +
   tabla en `flex-1 min-h-0`). Falta decidir si se documenta en `CLAUDE.md` como patrón
   oficial o se crea un componente compartido.

4. **Tabs que no caben (11 pestañas en salud-ocupacional)**: hipótesis fuerte (no 100%
   confirmada con navegador real, no se pudo verificar visualmente) de que
   `.abril-tabs__tab` en `shared/components/abril-page-header/abril-page-header.component.css`
   no tiene `white-space: nowrap` ni `.abril-tabs__nav` tiene `overflow-x: auto`, causando
   que el texto de pestañas largas ("Tópico Médico", "Asistente Social") se parta en dos
   líneas cuando hay muchas pestañas, rompiendo la altura del header y en cascada el
   `sticky thead` de la tabla (visto en capturas de EMOs) y posiblemente ocultando el botón
   de Filtros (visto en Asistente Social/Programaciones). **Esto NO se ha arreglado
   todavía** — es el siguiente paso más importante.

5. **Módulo PASO** (`ssoma/salud-ocupacional/paso` y dashboards relacionados): pendiente,
   requiere conversación de diseño aparte (es un tracker/actividad, no una galería CRUD
   simple).

6. Tarea en background ya lanzada (no confirmada si se resolvió): investigar componentes
   placeholder (`template: ''`) en `ssoma/gestion/charlas/pages/{asistencia,evidencia,
   programa,lista}/` — las rutas reales apuntan a `charlas-dashboard.component.ts`, esos
   archivos parecen código muerto.

## Cómo verificar

- Compilación: `npx tsc --noEmit -p tsconfig.app.json` (no usar `ng build` para checks
  rápidos).
- **No usar navegador/preview** para verificar visualmente — el usuario lo hace él mismo.
- Usar siempre execution-runtime (o Grep/Read directo) para explorar el código, no
  asumir contenido de archivos sin leerlos primero — varias veces en esta sesión se dio
  por buena una migración sin haber leído el CSS completo del contenedor raíz.
