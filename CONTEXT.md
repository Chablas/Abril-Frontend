# CONTEXT.md — Abril Frontend

Contexto operativo para sesiones de Claude Code. Complementa a `CLAUDE.md` (que se carga automáticamente) con info de implementación, decisiones, estado de módulos y atajos para no escanear el código entero.

> **Convenciones**: rutas tipo `path/file.ts:NN` apuntan al archivo y línea referida.
> El idioma de la UI es **español (es-PE)**; títulos en `route.data.titulo` van en MAYÚSCULAS.
> **Última actualización**: 2026-06-12 — **PASO mejoras UI**: instanciar-modal: título "Agregar PASO al Proyecto"; carga proyectos via `forkJoin` (PASOs del año + proyectos), filtra `estado === 'ACTIVO'` estricto y excluye proyectos con PASO existente del año; setter `anio` recarga lista automáticamente; campo "Mes de inicio" enviado como `mesInicio` en `InstanciarPasoDto`. paso-lista: checkbox "Ver históricos" con getter `programasFiltrados` (años actual y anterior); `proyectosActivos: Set<number>` cargado en `ngOnInit` forkJoin con `ProjectService` para excluir proyectos FINALIZADOS/INACTIVOS del dropdown; `verEvidencia()` patrón fetch+blob. ejecucion-modal: `ejecucionGuardada` persiste ejecución post-upload para mostrar evidencia sin cerrar modal; `ultimaEjecucionConEvidencia` getter prioriza `ejecucionGuardada`; botones "Ver" (→ `abrirVisor` → `DocumentViewer`) + "Descargar" (→ `descargarDocumento` → `SharepointUploadService.getArchivoUrl`) — patrón idéntico a `trabajadores.ts`; `<app-document-viewer>` al final del template.
>
> **2026-06-11 (v2)** — PASO: ruta correcta es `/ssoma/gestion/paso/` (ssoma.routes.ts monta PASO en `path: 'gestion/paso'`, NO en `salud-ocupacional/paso`). Fixes paso-lista: TabAmbito sin SSOMA, `activo !== false` en countTab/actividadesTab, historicoData como `PasoHistoricoAnioDto[]`, getter historicoTotales agrega array, historicoDataFiltrada sin filtro, cambiarVista siempre recarga historico, onProyectoChange resetea vista a 'mes', loadDetalle resetea historicoData y recarga historico al cambiar proyecto en vista proyecto, CSS tabla histórica, SPI null handling. paso-dashboard: irADetalle/irANuevoPrograma usan `/ssoma/gestion/paso/`, botón "Nuevo programa" usa sessionStorage. instanciar-modal: usa ProjectGetDTO y getProjectsPaged. paso-nav: rutas `/ssoma/gestion/paso/...`.
>
> **2026-06-08** — bandeja: aprobación mes a mes para items empresa mensuales (BandejaItemDto.meses[], seleccionarMesBandeja(), aprobar/rechazar usan id del mes, chips de mes con color por estado). empresa: closeDrawer() solo llama guardarObservaciones() si panelObsContratista tiene contenido (evita PUT vacío innecesario). versiones-doc: columna "Subido por" → "Archivo" (muestra nombreArchivo del primer archivo o nombre extraído de archivoUrl).
>
> **2026-06-07** — empresa: vigencia estimada en drawer mensual (getVigenciaEstimada, sentinel IDs, día 27 mes siguiente), sección "ARCHIVOS ENVIADOS" en no-mensuales, validación vigencia futura en enviarDocumento(), reset panelVigencia al reabrir drawer en estado Enviado/Rechazado. bandeja: panel detalle-meta (vigencia editable, selector archivos múltiples por mes), vigenciaEditable pre-calculada en selectItem(), seleccionarArchivo(), aprobar() pasa vigencia al backend. DTOs: archivos? en EmpresaEntregableDto y BandejaItemDto.
>
> **2026-06-06 (v3)** — empresa.ts: investigación bug estado no se actualiza en lista sin refresh. NgZone inyectado, optimistic update en ngZone.run(), setTimeout 500ms antes de recargarEntregables(). Bug raíz pendiente: probable race condition backend.
>
> **2026-06-06 (v2)** — Empresa mensual: dropdown selector de mes con dots de estado, historial de envíos inline, drag & drop fix (_dropJustHappened flag), validación de extensiones en addFiles(), fix mes incorrecto en enviarDocumento (mesFijo/anioFijo + callback recargarEntregables), fix archivos mes no visibles (recargarEntregables con afterLoad callback), fix eliminarArchivo URL (empresaId+archivoId), backend: EnviarDocumentoRequest Mes/Anio, CrearOActualizarEntregableMesAsync desde /archivos/enviar.
>
> **2026-06-03** — Módulo PASO completo: DTOs, 3 servicios, 5 componentes reutilizables (spi-badge, ejecucion-modal, instanciar-modal, actividad-tree, paso-gantt), 5 páginas (dashboard, lista, detalle, actividad-detalle, alertas), rutas lazy bajo `/ssoma/gestion/paso/`, item de navegación en sidebar. Módulo Evaluaciones: pantalla asignaciones supervisores, rediseño `/evaluaciones/evaluar`.
>
> **2026-06-02** — `sctr-subir` refactor: modal 2 pasos (datos básicos → trabajadores+visor). Fechas movidas al paso 2 como inputs flatpickr (material_green, `appendTo:body`, cierre manual con `mousedown capture`). `safeArchivoUrl` cacheado en `_safeArchivoUrl` (evita reload de iframe en cada change detection). Drag & drop en `.panel-visor` (`dragenter/dragover/drop` + `isDragging` overlay). Submit exitoso no cierra modal: resetea fechas + recarga workers. Columnas worker-row en grid (`1.5rem minmax(0,2fr) minmax(0,0.9fr) 4rem`), DNI extraído a `<span class="worker-dni">`, `.wizard-paso2` asimétrico (`0.6fr 1fr`). flatpickr en `angular.json` styles (`material_green.css`); import `* as flatpickr`, callable resuelto con `.default ?? flatpickr`.

---

## 1. Stack y comandos

- **Angular 21 standalone** (`@angular/core ^21.0.0`), TypeScript ~5.9, RxJS ~7.8.
- **SSR**: configurado (`@angular/ssr`, `outputMode: 'server'`) pero **hydration desactivado** (`provideClientHydration` comentado en `app.config.ts:25`). Guards y servicios protegen accesos a `localStorage`/`window`.
- **Estilos**: Tailwind v4 (`@tailwindcss/postcss`) + CSS por componente. `dhtmlxgantt.css` global desde `angular.json`.
- **Locale**: `LOCALE_ID = 'es-PE'`.
- **Auth**: JWT en `localStorage.access_token`, claims Microsoft (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`). MSAL Angular para flujo Microsoft.
- **UI libs**: `sweetalert2` (todos los modales/confirmaciones), `chart.js` + `chartjs-plugin-datalabels`, `dhtmlx-gantt`, `quickchart.io` (gantt), `jspdf`, `jspdf-autotable`, `xlsx`, `html2canvas`.

### Comandos

```bash
npm start                 # ng serve --port 4200
npm run build             # producción → dist/Abril
npm run watch             # build dev en watch
npm test                  # Vitest (vía @angular/build:unit-test)
npx ng test --include src/app/path/to/file.spec.ts   # un solo spec
npm run serve:ssr:Abril   # corre dist/Abril/server/server.mjs
```

- Package manager pinned: `npm@11.7.0`.
- Prettier: `printWidth: 100`, `singleQuote: true`, parser `angular` para `.html` (en `package.json`).

### Environments

`src/environments/environment.ts`:

```ts
{ production: false, apiUrl: 'http://localhost:5236/', ssr: false,
  azure: { tenantId, clientId } }
```

Producción: `environment.prod.ts` (sustituido por `angular.json` fileReplacements).

> **Nota**: `apiUrl` termina en `/`. Las rutas se concatenan como `${environment.apiUrl}api/v1/...` (sin `/` inicial).

---

## 2. Estructura de carpetas

```
src/app/
├── app.config.ts            # providers (router, http, locale)
├── app.routes.ts            # rutas raíz
├── core/                    # SIN UI — solo servicios/DTOs/guards
│   ├── dtos/<dominio>/      # DTOs agrupados por backend resource
│   ├── guards/              # authGuard, roleGuard
│   ├── models/
│   ├── navigation/          # navigation.service.ts (sidebar config)
│   └── services/            # un servicio por recurso backend
├── shared/components/       # UI cross-feature (layout, modales, paginator…)
└── features/
    ├── arquitectura-comercial/   # NgModule
    ├── auth/                     # NgModule (login, msal, set-password)
    ├── clinica/                  # standalone routes (dashboard, agenda, programaciones, interconsultas, activar cuenta pública)
    ├── configuracion/            # standalone routes (admin: empresas, proyectos, trabajadores)
    ├── contractors/              # standalone routes (pública + admin)
    ├── costs/                    # NgModule (adjudicaciones)
    ├── evaluaciones/             # standalone routes (dashboard-gerencia, evaluar-residente, historial, configuracion-plantilla)
    ├── gestion-administrativa/   # standalone routes (solicitud-salidas, gestion-salidas, config)
    ├── habilitacion/             # standalone routes (trabajadores, empresa, equipos, bandeja…)
    ├── home/                     # Inicio
    ├── mejora-continua/          # standalone routes (lessons-learned, áreas, relaciones, plantillas)
    ├── portal-trabajador/        # página pública — consulta habilitación por DNI
    ├── projects/                 # NgModule (lecciones, IVTs, hitos, config…)
    ├── security/                 # NgModule (creación usuarios)
    └── ssoma/                    # standalone routes
        └── salud-ocupacional/
            ├── salud-ocupacional.routes.ts
            ├── dashboard/
            ├── emos/
            ├── programaciones/
            ├── interconsultas/
            ├── convalidaciones/
            ├── catalogos/
            ├── services/         # http-base.ts + un servicio por recurso
            ├── dtos/
            ├── shared/           # utils del módulo (no UI compartida global)
            └── paso/             # Módulo PASO — lazy desde ssoma.routes.ts → /ssoma/gestion/paso
                ├── paso.routes.ts
                ├── dtos/paso.dtos.ts
                ├── services/     # paso.service.ts | paso-actividad.service.ts | paso-ejecucion.service.ts
                ├── components/   # spi-badge | ejecucion-modal | instanciar-modal | actividad-tree | paso-gantt
                └── pages/        # dashboard | lista | detalle | actividad-detalle | alertas
```

### Convención `configuracion/` (módulo NgModule con routes internas)

```
features/configuracion/
├── configuracion-module.ts       # ConfiguracionModule (NgModule) con rutas internas
├── pages/
│   ├── companies/                # Razones Sociales (read-only)
│   └── workers/                  # Lista de Trabajadores (read-only, paged)
└── features/
    ├── proyectos/components/     # Proyectos + botón Emails SSOMA (PATCH)
    └── area/                     # Módulo Área (tipos, items, jerarquía)
        ├── components/
        │   ├── area.ts/html/css  # Shell con SectionTabs (tabs: Áreas / Jerarquía / Tipos)
        │   ├── area-type/        # CRUD de tipos de área
        │   ├── area-item/        # CRUD de ítems de área
        │   └── area-scope/       # Árbol de jerarquía (area-scope-branch + area-scope-list)
        ├── dtos/                 # areaType.model.ts, areaItem.model.ts, areaScope.model.ts
        └── services/             # area-type.service.ts, area-item.service.ts, area-scope.service.ts
```

Redirect interno: `''` → `'proyectos'`. Reutiliza servicios/DTOs de SSOMA (`CatalogosSaludService.getEmpresas`, `EmoService.getEmosPorTrabajador`) y de core (`ProjectService.getProjectPaged`, `patchProjectEmails`). El modal `ProjectEmailsForm` se reutiliza por **import cross-feature** desde `features/projects/configuration/pages/proyectos/components/project-emails-form/`.

### Convención dentro de `features/<area>/`

- Cada feature **NgModule-based** tiene `<area>-module.ts` + `<area>-routing-module.ts`.
- Los **page components** se declaran como **standalone** (`imports: [CommonModule, FormsModule, ...]`) y se importan directo en el routing module — **NO se declaran en `declarations`**. Esta mezcla es intencional, no la "uniformes".
- Subcarpetas: `pages/<page>/` (en projects/), o el page directo en la raíz del feature (en ssoma/).
- Componentes auxiliares de un page: `<page>/components/<sub>/`.

### `core/dtos/<dominio>/`

- Un dominio por recurso backend (`project/`, `lesson/`, `area/`, `phase/`, …).
- Sufijos: `*.model.ts` (interfaces). Tipos por verbo: `XxxGetDTO`, `XxxCreateDTO`, `XxxEditDTO`, `XxxPagedDTO`, etc.
- En SSOMA (en `features/ssoma/.../dtos/`) los nombres son sin sufijo `DTO`: `ProgramacionListDto`, `EmoDetalleDto` (PascalCase + `Dto`).

---

## 3. Auth, rutas y navegación

### Rutas raíz (`src/app/app.routes.ts`)

```
/auth/**                                    → AuthModule (login, msal-redirect, complete-registration)
/                                           → Layout (sidebar+header) + authGuard
   /security                                → SeguridadModule
   /projects                                → ProyectosModule
   /costs                                   → CostsModule
   /contractors                             → CONTRACTORS_ADMIN_ROUTES
   /arquitectura-comercial                  → ArquitecturaComercialModule
   /ssoma                                   → SSOMA_ROUTES
     /ssoma/salud-ocupacional               → SALUD_OCUPACIONAL_ROUTES
     /ssoma/gestion/paso                    → PASO_ROUTES (lazy, featureKey: ssoma.gestion.paso)
   /configuracion                           → CONFIGURACION_ROUTES
   /habilitacion                            → HABILITACION_ROUTES
   /clinica                                 → CLINICA_ROUTES (dashboard, agenda, programaciones, interconsultas, emos)
   /evaluaciones                            → EVALUACIONES_ROUTES
   /gestion-administrativa                  → GESTION_ADMINISTRATIVA_ROUTES
   /mejora-continua                         → MEJORA_CONTINUA_ROUTES
/contractors                                → CONTRACTORS_ROUTES (público — registro contratistas)
/habilitacion/registro-empresa             → RegistroEmpresa (público)
/auth/activar-contratista                  → ActivarContratista (público)
/auth/recuperar-contratista                → RecuperarContratista (público)
/auth/contractor-credentials               → ContractorCredentials (público)
/clinica/activar                           → ActivarClinica (público)
/portal-trabajador                         → PortalTrabajador (público)
/registros-modelo                          → RegistrosModelo (publicMode: true)
/**                                         → redirect /auth/login
```

### Sub-rutas `/configuracion`

```
/configuracion              → redirect 'proyectos'
/configuracion/proyectos    → Proyectos (Proyectos + botón Emails SSOMA, featureKey: configuracion.proyectos)
/configuracion/area         → Area (Tipos/Ítems/Jerarquía — tabs con SectionTabs, featureKey: configuracion.area)
/configuracion/companies    → Companies (Razones Sociales, featureKey: configuracion.companies)
/configuracion/workers      → Workers (Lista de Trabajadores, featureKey: configuracion.workers)
```

### Guards

- `authGuard` (`core/guards/auth.guard.ts`): SSR → `true` (¡no quitar! evita problemas con refresh); sin token → `/auth/login`; token expirado → logout + login.
- `roleGuard` (`core/guards/role.guard.ts`): verifica acceso en dos pasos:
  1. Si `route.data.featureKey` existe → busca en `localStorage.allowed_features` (array JSON cargado al login desde BD). Si está incluido → permite.
  2. Fallback: si `route.data.roles` existe → verifica contra JWT roles; **además** si el array incluye `'CONTRATISTA'`, verifica `authService.isContratista()` (lee `localStorage.user.tipo`) como segundo fallback — necesario porque contratistas usan auth propio (tipo en localStorage), no claims JWT Microsoft.
  - Sin match en ninguno de los dos → redirige a `/`.
  - **Regla**: rutas nuevas deben usar `featureKey` registrado en BD, no `roles` directos.
  - **Dos sistemas de auth conviven**: `getRoles()` lee claims JWT Microsoft; `isContratista()` lee `localStorage.user.tipo === 'CONTRATISTA'`. Son independientes. Rutas CONTRATISTA funcionales usan `featureKey` (en `allowed_features` del token contratista). Dashboard usa solo `authGuard` + redirect interno en el componente.

### Roles conocidos (string-exact, MAYÚSCULAS, español)

```
ADMINISTRADOR DEL SISTEMA
ADMINISTRADOR DE UDP
USUARIO DE UDP
ADMINISTRADOR DE RESIDENTES
RESIDENTE
```

### Cada ruta protegida debe declarar

```ts
data: { titulo: 'TÍTULO EN MAYÚSCULAS', featureKey: 'modulo.nombre-pantalla' }
```

El `Header` lee `data.titulo` de la ruta activa más profunda. El `featureKey` debe estar registrado en BD; mientras no lo esté, omitirlo (la ruta será accesible a todos los autenticados) o usar `roles` como fallback temporal.

### Sidebar

Fuente única: `core/navigation/navigation.service.ts` (`config: NavModule[]`). Cada `NavModule` tiene `key`, `label`, `iconKey`, `baseRoute`, `items[]`, `groups[]`. Cada `NavItem` puede tener `featureKey` (primario) o `roles[]` (fallback). `isItemAllowed()` sigue la misma lógica que `roleGuard`.
**Agregar feature al menú = wirear ruta + entry en `navigation.service.ts` con `featureKey`.**

---

## 4. Convenciones de código

### Componentes

- **Standalone con `imports`**, naming PascalCase (`Programaciones`, `EmoHistorial`, `CatalogoClinicas`).
- Selectors: `app-<feature>-<page>` (`app-salud-programaciones`, `app-catalogo-clinicas`).
- Templates en archivos separados (`*.html` + `*.css`), no inline.
- Inyección **constructor-based** (no `inject()` salvo en guards).
- Estado de loading: `loading: boolean` local + `LoaderService.show()/hide()` global.
- Cambios manuales con `ChangeDetectorRef.detectChanges()` después de async.

### Servicios HTTP — patrón estándar

**No hay `HttpInterceptor`.** Cada servicio construye su propio header `Authorization: Bearer <token>`.

Patrón canónico (en `core/services/<resource>.service.ts`):

```ts
@Injectable({ providedIn: 'root' })
export class XxxService {
  private readonly apiUrl = `${environment.apiUrl}api/v1/<resource>`;

  constructor(private http: HttpClient) {}

  getXxx(): Observable<XxxDTO> {
    const token = localStorage.getItem('access_token'); // ⚠️ NO defensivo
    return this.http.get<XxxDTO>(this.apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
```

Patrón mejor (usado en SSOMA — `salud-ocupacional/services/http-base.ts`):

```ts
export const SALUD_OCUPACIONAL_BASE = `${environment.apiUrl}api/v1/ssoma/salud-ocupacional`;

export function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function buildParams(source: Record<string, unknown>): HttpParams { … }
```

**Cuando crees un servicio nuevo**, sigue el patrón de SSOMA (defensivo SSR + helper `buildParams`).

### Manejo de errores

Centralizado en `ErrorService.handleError(err: HttpErrorResponse)` (`core/services/error.service.ts`):

- `401` → limpia storage, `Swal` "Sesión expirada", redirige a `/auth/login`.
- `4xx` → `Swal` "Error".
- `5xx` → `Swal` "Error del servidor".

Usar siempre desde subscribers:

```ts
this.service.foo().subscribe({
  next: …,
  error: (err: HttpErrorResponse) => this.errorService.handleError(err),
});
```

**Nota**: `handleError` ya llama a `loaderService.hide()` internamente.

### LoaderService

`core/services/loader.service.ts` — `BehaviorSubject<boolean>` global. El `App` root suscribe a `loader$` y muestra spinner. Llamar `show()`/`hide()` antes y después de requests largos.

### DTO conventions

- Core (`core/dtos/`): sufijo `DTO` en mayúsculas (`ProjectGetDTO`).
- SSOMA (`features/ssoma/.../dtos/`): sufijo `Dto` en PascalCase (`ProgramacionListDto`).
- **NO mezclar estilos** dentro del mismo dominio.
- Paginación: `core/dtos/api/pagedResponse.model.ts` → `PagedResponseDTO<T> { page, pageSize, totalRecords, totalPages, data }`.
- Mensajes: `core/dtos/api/ApiMessage.model.ts` → `ApiMessageDTO { message }`.

### Selectores de empresa — regla de fuente de datos

- **SIEMPRE** usar `CatalogosSaludService.getEmpresas()` → endpoint `GET /ssoma/salud-ocupacional/catalogos/empresas` → tabla `contributor`. `EmpresaSimpleDto { id, nombre, esAbril }`, `displayField="nombre"`.
- **NUNCA** usar `EmpresaContratistaService.getEmpresas()` para selectores de razón social en el módulo Habilitación — esa tabla es `ss_empresa_contratista` y su FK rompe con `worker_vinculaciones.empresa_id` que referencia `contributor`.
- **NO filtrar por `esAbril`** — el campo viene `false` para todos en BD actual (criterio `ContributorName.Contains("ABRIL")` no matchea). Mostrar todas las empresas.

### Patrón modal canónico (Habilitación)

```ts
@Input() open = false;
@Input() initial: XxxDto | null = null;
@Output() closed = new EventEmitter<void>();
@Output() saved  = new EventEmitter<void>();

ngOnChanges(changes: SimpleChanges): void {
  if (changes['open'] && this.open) this.resetAndLoad();
}
```

Template: `<app-base-modal *ngIf="open" ... (closeModal)="close()">`. El `*ngIf="open"` monta/desmonta el modal (no `[open]` binding — `BaseModal` no tiene ese @Input).

### `soloRetirados` — modo exclusivo

- `soloRetirados = false` (default) → backend filtra `Estado != 'RETIRADO'` (solo activos).
- `soloRetirados = true` → backend filtra `Estado == 'RETIRADO'` (solo retirados).
- No hay modo "todos" — es exclusivo.
- Cuando `soloRetirados = true`: ocultar checkboxes, barra de baja masiva y botón "Dar de baja"; mostrar botón "Reingreso".

### Estilos

- **Tailwind utilities** + **CSS por componente** (no global). Mezcla intencional.
- Cada feature/page maneja su propio `.css`.
- Color de marca: `#64BC04` (verde Abril) / `#5aa904` (hover) / `#E5F7D1` (light fill) / `#0086A5` (azul accent legacy).

---

## 5. Sistema de diseño (clases CSS reutilizadas)

Las clases de abajo se repiten en `features/ssoma/salud-ocupacional/.../*.css` y constituyen el **lenguaje visual base** de las nuevas features. Cuando crees un page nuevo en SSOMA, **copia/pega** este set CSS.

### Layout & cards

- `.card` — fondo blanco, `border-radius: 10px`, sombra suave 1px.
- `.filters-card` — variante con padding 1rem 1.25rem.
- `.section-bar` — flex, `align-items: end`, `justify-content: space-between`.
- `.section-title` (1.05rem/700, `#111827`), `.section-sub` (0.82rem, `#6b7280`).

### Inputs / forms

- `.field-label` — uppercase 0.72rem, gris 600.
- `.field-input` — border `#d6dee5` 1px, radius 12px, padding 0.55rem 0.75rem; focus → border `#64bc04` + shadow rgba(100,188,4,0.18).
- `.search-input` — wrapper con icono + input transparente.
- `.filters-grid` — grid responsive (`2fr 1fr`, `1.8fr 1fr 1fr 1fr`, etc.).
- `.grid-2` — dos columnas en form modal; `.col-span-2` → `grid-column: 1/-1`.
- `.form-wrapper`, `.form-footer` — patrón estándar de modales con BaseModal.

### Botones

- `.btn-primary` — verde `#64bc04`, blanco, padding 0.55rem 0.95rem, radius 10px, hover `#5aa904`.
- `.btn-ghost` — transparente, gris, hover gris claro.
- `.btn-link` — texto verde, hover underline.
- `.btn-chip` — píldora pequeña 0.72rem; combinaciones:
  - `.chip-green` (activar/confirmar)
  - `.chip-orange` (desactivar/no-presentó)
  - `.chip-gray` (cancelar/inactivo)
  - `.chip-blue` (editar/info)

### Tabla

- `.table-wrapper` (overflow-x), `.data-table` (collapse, 0.88rem).
- Thead: bg `#f9fafb`, uppercase 0.72rem, gris.
- Tbody td: padding 0.7rem 1rem, border-bottom `#f3f4f6`.
- `.row-actions` — flex right + wrap + gap 0.35rem.
- `.empty-row` — text-center, 2.5rem padding, `#9ca3af`.
- `.paginator-wrapper` — padding 0.75rem 1rem, top-border.

### Badge

- `.badge` — pill 999px, 0.72rem/600. Combinar con chip-\* para color.

### Tabs (patrón usado en `emos/components/emo-detail/` y `catalogos/`)

```css
.tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid #e5e7eb;
}
.tabs button {
  padding: 0.55rem 0.85rem;
  border-bottom: 2px solid transparent;
}
.tabs button.active {
  color: #111827;
  border-bottom-color: #64bc04;
}
```

> **Pages legacy de `features/projects/configuration/pages/proyectos/`** usan Tailwind directamente (no este sistema). Cuando edites ahí, sigue su estilo Tailwind para no romper consistencia local.

---

## 6. Componentes compartidos (`shared/components/`)

Importables como standalone desde cualquier feature.

| Componente                                                                   | Selector              | Path                                                                                     | Notas                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BaseModal`                                                                  | `app-base-modal`      | `shared/components/base-modal/`                                                          | Inputs: `title`, `width` (default `w-[1000px]`). Output: `closeModal`. Slot `<ng-content>`. Cierra al hacer mousedown sobre backdrop.                                                                                                                                                                                                  |
| `Paginator`                                                                  | `app-paginator`       | `shared/components/paginator/`                                                           | Inputs: `totalRecords`, `currentPage`, `totalPages`. Output: `pageChange`. Hasta 5 botones visibles.                                                                                                                                                                                                                                   |
| `SearchSelect`                                                               | `app-search-select`   | `shared/components/search-select/`                                                       | Dropdown con búsqueda. Inputs: `options`, `valueField` (default `id`), `displayField` (default `name`), `value`, `placeholder`, `showLabel`, `label`, `allowClear` (default `true`). Output: `valueChange`. Botón X inline para limpiar valor cuando `allowClear = true`.                                                              |
| `ViewToggle`                                                                 | `app-view-toggle`     | `shared/components/view-toggle/`                                                         | Toggle list/calendar/grid según `modes: ViewToggleMode[]`.                                                                                                                                                                                                                                                                             |
| `SectionTabs`                                                                | `app-section-tabs`    | `shared/components/section-tabs/section-tabs.ts`                                         | Pestañas reutilizables estilo corporativo (borde inferior `#64BC04`). Inputs: `tabs: SectionTab[]`, `value: string\|null`. Output: `valueChange`. `SectionTab { id, label, badge?, disabled? }`. La pestaña activa eleva borde lateral+superior verde con `-mb-px`. Soporta two-way binding: `[(value)]="activeSection"`.                |
| `Layout`                                                                     | —                     | `shared/components/layout/`                                                              | Shell autenticado. Renderiza Header + Sidebar + `<router-outlet>`.                                                                                                                                                                                                                                                                     |
| `Header`, `Sidebar`, `SidebarMobile`, `NavIcon`                              | —                     | `shared/components/header,sidebar*,nav-icon/`                                            | Usados por Layout. **`NavIcon`** acepta `key` (string) y `size` (number); registra SVGs por `iconKey` en un `ngSwitch`. Keys actuales: `projects`, `contractors`, `costs`, `security`, `ssoma`, `config`. Para añadir un módulo al sidebar con icono nuevo, hay que **agregar un `<svg *ngSwitchCase="'<key>'">`** en `nav-icon.html`. |
| `FileSelector`, `FilePreview`, `ImagePreview`, `DraggableImage`, `CameraWeb` | varios                | `shared/components/file-selector,file-preview,image-preview,draggable-image,camera-web/` | Manejo de archivos/imágenes.                                                                                                                                                                                                                                                                                                           |
| `DocumentViewer`                                                             | `app-document-viewer` | `shared/components/document-viewer/`                                                     | Visor de documentos modal. Inputs: `archivoUrl` (ruta relativa o URL), `nombre`. Output: `closed`. Llama `getArchivoUrl(path)` para obtener URL firmada, luego fetch-as-blob para PDF/imagen. `archivoUrl = ''` cierra el visor. Reutilizable en cualquier feature de habilitación.                                                    |

**Importación correcta** (standalone):

```ts
import { BaseModal } from '../../../shared/components/base-modal/base-modal';
import { Paginator } from '.../paginator/paginator';
import { SearchSelect } from '.../search-select/search-select';
```

### Patrón de modal CRUD (canónico)

```html
<app-base-modal *ngIf="open" [title]="title" width="w-[700px]" (closeModal)="close()">
  <div class="form-wrapper">
    <div class="grid-2">
      <div class="col-span-2">
        <label class="field-label">Nombre *</label>
        <input class="field-input" [(ngModel)]="model.nombre" />
      </div>
    </div>
    <footer class="form-footer">
      <button class="btn-ghost" (click)="close()">Cancelar</button>
      <button class="btn-primary" [disabled]="!canSubmit" (click)="submit()">
        {{ saving ? 'Guardando…' : 'Guardar' }}
      </button>
    </footer>
  </div>
</app-base-modal>
```

---

## 7. Endpoints del backend

Todos los servicios apuntan a `${environment.apiUrl}api/v1/<resource>`.

### Auth & usuarios (`core/services/`)

| Método      | Endpoint                       | Servicio                          |
| ----------- | ------------------------------ | --------------------------------- |
| POST        | `/api/v1/auth/login`           | `AuthService.login`               |
| POST        | `/api/v1/auth/set-password`    | `AuthService.setPassword`         |
| POST        | `/api/v1/auth/forgot-password` | `AuthService.forgotPassword`      |
| GET (paged) | `/api/v1/user/paged?page=N`    | `UserService.getUserPaged`        |
| POST        | `/api/v1/user`                 | `UserService.createUser`          |
| PUT         | `/api/v1/user/{id}`            | `UserService.updateUser`          |
| PATCH       | `/api/v1/user/{id}/toggle`     | `UserService.toggleUser`          |
| GET         | `/api/v1/role`                 | `RoleService`                     |
| GET         | `/api/v1/person`               | `PersonService`                   |
| POST        | `/api/v1/microsoft`            | `MicrosoftAuthService` (login MS) |

### Proyectos

| Método                | Endpoint                                              | Servicio                                      |
| --------------------- | ----------------------------------------------------- | --------------------------------------------- |
| GET                   | `/api/v1/project/paged?page=N`                        | `ProjectService.getProjectPaged`              |
| GET                   | `/api/v1/project/paged-with-residents?page=N`         | `ProjectService.getProjectPagedWithResidents` |
| GET                   | `/api/v1/project/with-resident-by-userId`             | `ProjectService.getWithResidentByUserId`      |
| POST                  | `/api/v1/project`                                     | `ProjectService.createProject`                |
| PUT                   | `/api/v1/project`                                     | `ProjectService.editProject`                  |
| DELETE                | `/api/v1/project/{id}`                                | `ProjectService.deleteProject`                |
| GET                   | `/api/v1/project/{id}/emails`                         | `ProjectService.getProjectEmails`             |
| PATCH                 | `/api/v1/project/{id}/emails`                         | `ProjectService.patchProjectEmails`           |
| GET (paged + filtros) | `/api/v1/project/paged?search=…&estado=…&companyId=…` | `ProjectService.getProjectsPaged`             |
| —                     | `/api/v1/projectResident`                             | `ProjectResidentService`                      |
| ~~—~~                 | ~~`/api/v1/userProject`~~                             | ~~`UserProjectService`~~ (**eliminado** 2026-05-29) |
| Método                | Endpoint                                              | Servicio                                                                        |
| --------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| GET                   | `/api/v1/project/paged?page=N`                        | `ProjectService.getProjectPaged`                                                |
| GET                   | `/api/v1/project/paged-with-residents?page=N`         | `ProjectService.getProjectPagedWithResidents`                                   |
| GET                   | `/api/v1/project/with-resident-by-userId`             | `ProjectService.getWithResidentByUserId`                                        |
| POST                  | `/api/v1/project`                                     | `ProjectService.createProject`                                                  |
| PUT                   | `/api/v1/project`                                     | `ProjectService.editProject`                                                    |
| DELETE                | `/api/v1/project/{id}`                                | `ProjectService.deleteProject`                                                  |
| GET                   | `/api/v1/project/{id}/emails`                         | `ProjectService.getProjectEmails`                                               |
| PATCH                 | `/api/v1/project/{id}/emails`                         | `ProjectService.patchProjectEmails`                                             |
| PATCH (multipart)     | `/api/v1/project/{id}/foto`                           | `ProjectService.uploadProjectFoto` (FormData `foto`; responde `{ message, fotoUrl }`) |
| GET (paged + filtros) | `/api/v1/project/paged?search=…&estado=…&companyId=…` | `ProjectService.getProjectsPaged`                                               |
| —                     | `/api/v1/projectResident`                             | `ProjectResidentService`                                                        |
| —                     | `/api/v1/userProject`                                 | `UserProjectService`                                                            |

### Configuración (proyectos)

| Endpoint                                 | Servicio                                |
| ---------------------------------------- | --------------------------------------- |
| `/api/v1/area`                           | `AreaService`                           |
| `/api/v1/phase`                          | `PhaseService`                          |
| `/api/v1/stage`                          | `StageService`                          |
| `/api/v1/substage`                       | `SubStageService`                       |
| `/api/v1/layer`                          | `LayerService`                          |
| `/api/v1/subspecialty`                   | `SubspecialtyService`                   |
| `/api/v1/phaseStageSubStageSubSpecialty` | `PhaseStageSubStageSubSpecialtyService` |
| `/api/v1/milestone`                      | `MilestoneService`                      |

### SSOMA — Salud Ocupacional

Base: `${apiUrl}api/v1/ssoma/salud-ocupacional`

| Método      | Endpoint                                    | Servicio                                             |
| ----------- | ------------------------------------------- | ---------------------------------------------------- |
| GET         | `/dashboard`                                | `DashboardSaludService`                              |
| GET         | `/workers/search?...`                       | `WorkerSearchService`                                |
| GET         | `/workers/{id}/historial-emo`               | `EmoService.getHistorial`                            |
| POST        | `/workers`                                  | `WorkerService.createWorker`                         |
| PUT         | `/workers/{id}`                             | `WorkerService.updateWorker`                         |
| PATCH       | `/workers/{id}/retirar`                     | `WorkerService.retirarWorker`                        |
| GET (paged) | `/emos`                                     | `EmoService.getEmos`                                 |
| GET (paged) | `/emos/por-trabajador`                      | `EmoService.getEmosPorTrabajador`                    |
| GET         | `/emos/{id}`                                | `EmoService.getEmo`                                  |
| POST        | `/emos`                                     | `EmoService.createEmo`                               |
| PUT         | `/emos/{id}`                                | `EmoService.updateEmo`                               |
| PATCH       | `/emos/{id}/estado`                         | `EmoService.patchEstado`                             |
| GET (paged) | `/programaciones`                           | `ProgramacionService.getProgramaciones`              |
| GET         | `/programaciones/{id}`                      | `ProgramacionService.getProgramacion`                |
| POST        | `/programaciones`                           | `ProgramacionService.createProgramacion`             |
| PUT         | `/programaciones/{id}`                      | `ProgramacionService.updateProgramacion`             |
| PATCH       | `/programaciones/{id}/estado`               | `ProgramacionService.patchEstado`                    |
| GET (paged) | `/interconsultas`                           | `InterconsultaService.getInterconsultas`             |
| GET         | `/interconsultas/{id}`                      | `InterconsultaService.getInterconsulta`              |
| PUT         | `/interconsultas/{id}`                      | `InterconsultaService.updateInterconsulta`           |
| GET (paged) | `/convalidaciones`                          | `ConvalidacionService.getConvalidaciones`            |
| GET         | `/convalidaciones/{id}`                     | `ConvalidacionService.getConvalidacion`              |
| POST        | `/convalidaciones`                          | `ConvalidacionService.createConvalidacion`           |
| PUT         | `/convalidaciones/{id}`                     | `ConvalidacionService.updateConvalidacion`           |
| GET         | `/catalogos/clinicas`                       | `CatalogosSaludService.getClinicas` (cached)         |
| POST        | `/catalogos/clinicas`                       | `CatalogosSaludService.createClinica`                |
| PUT         | `/catalogos/clinicas/{id}`                  | `CatalogosSaludService.updateClinica`                |
| GET         | `/catalogos/clinicas/{id}/emails`           | `CatalogosSaludService.getClinicaEmails`             |
| POST        | `/catalogos/clinicas/{id}/emails`           | `CatalogosSaludService.createClinicaEmail`           |
| DELETE      | `/catalogos/clinicas/{id}/emails/{emailId}` | `CatalogosSaludService.deleteClinicaEmail`           |
| GET         | `/catalogos/medicos`                        | `CatalogosSaludService.getMedicos` (cached)          |
| POST        | `/catalogos/medicos`                        | `CatalogosSaludService.createMedico`                 |
| PUT         | `/catalogos/medicos/{id}`                   | `CatalogosSaludService.updateMedico`                 |
| GET         | `/catalogos/emo-tipos`                      | `CatalogosSaludService.getEmoTipos` (cached)         |
| POST        | `/catalogos/emo-tipos`                      | `CatalogosSaludService.createEmoTipo`                |
| PUT         | `/catalogos/emo-tipos/{id}`                 | `CatalogosSaludService.updateEmoTipo`                |
| GET         | `/catalogos/examen-tipos`                   | `CatalogosSaludService.getExamenTipos` (cached)      |
| GET         | `/catalogos/restriccion-tipos`              | `CatalogosSaludService.getRestriccionTipos` (cached) |
| GET         | `/catalogos/empresas`                       | `CatalogosSaludService.getEmpresas` (cached)         |

> **Catálogos cacheados** usan `shareReplay(1)`. Llamar `invalidateCache()` después de mutar un catálogo para refrescar dropdowns.

### SSOMA — PASO (Programa Anual de Seguridad, Salud Ocupacional y Medio Ambiente)

Base: `${apiUrl}api/v1/ssoma-paso` — controller unificado. Actividades y ejecuciones como sub-rutas.

| Método | Endpoint | Servicio |
| ------ | -------- | -------- |
| GET    | `/api/v1/ssoma-paso?anio=&proyectoId=&estado=&esPlantilla=` | `PasoService.getAll` |
| GET    | `/api/v1/ssoma-paso/{id}` | `PasoService.getById` |
| POST   | `/api/v1/ssoma-paso` | `PasoService.create` |
| PUT    | `/api/v1/ssoma-paso/{id}` | `PasoService.update` |
| PATCH  | `/api/v1/ssoma-paso/{id}/aprobar` | `PasoService.aprobar` |
| POST   | `/api/v1/ssoma-paso/{id}/instanciar` | `PasoService.instanciar` |
| GET    | `/api/v1/ssoma-paso/{id}/gantt` | `PasoService.getGantt` |
| GET    | `/api/v1/ssoma-paso/{id}/spi` | `PasoService.getSpi` |
| GET    | `/api/v1/ssoma-paso/{id}/reporte?format=excel\|pdf` | `PasoService.exportReporte` (Blob) |
| GET    | `/api/v1/ssoma-paso/dashboard` | `PasoService.getDashboard` |
| GET    | `/api/v1/ssoma-paso/alertas` | `PasoService.getAlertas` |
| GET    | `/api/v1/ssoma-paso/categorias` | `PasoService.getCategorias` |
| GET    | `/api/v1/ssoma-paso/actividad/{id}` | `PasoActividadService.getById` |
| POST   | `/api/v1/ssoma-paso/actividad` | `PasoActividadService.create` |
| PUT    | `/api/v1/ssoma-paso/actividad/{id}` | `PasoActividadService.update` |
| DELETE | `/api/v1/ssoma-paso/actividad/{id}` | `PasoActividadService.delete` |
| POST   | `/api/v1/ssoma-paso/ejecucion` | `PasoEjecucionService.create` |
| PATCH  | `/api/v1/ssoma-paso/ejecucion/{id}/evidencia` | `PasoEjecucionService.subirEvidencia` (multipart, campo `file`) |
| GET    | `/api/v1/ssoma-paso/{id}/resumen-mes?anio=&mes=` | `PasoService.getResumenMes` → `PasoResumenMesDto` |
| GET    | `/api/v1/ssoma-paso/proyecto/{proyectoId}/historico` | `PasoService.getHistorico` → `PasoHistoricoAnioDto[]` |
| GET    | `/api/v1/ssoma-paso/actividad/{id}/auditoria` | `PasoService.getAuditoria` → `PasoAuditoriaDto[]` |

**DTOs clave** (`paso/dtos/paso.dtos.ts`):
- `PasoActividadDto.categoriaAmbito: 'Seguridad' | 'Salud' | 'Ambiente'` — SSOMA **no** es valor válido.
- `PasoResumenMesDto`: `totalProgramadas`, `completadas`, `pendientes`, `vencidas`, `porcentajeAvance`, `seguridad/salud/ambiente/ssoma: PasoResumenMesAmbitoDto`, `actividades: PasoResumenMesActividadDto[]`.
- `PasoHistoricoAnioDto`: `anio`, `totalProgramadas`, `totalEjecutadas`, `totalVencidas`, `spiGeneral`, `spiColor`, `porcentajeAvance`.
- Colores por ámbito: Seguridad→azul, Salud→verde, Ambiente→teal. SPI: ≥0.95=verde, 0.80-0.94=amarillo, <0.80=rojo.

### Evaluaciones — Asignaciones de Supervisores

| Método | Endpoint | Servicio |
| ------ | -------- | -------- |
| GET    | `/api/v1/evaluaciones/asignaciones-supervisor` | `EvAsignacionesService.getSupervisores` |
| GET    | `/api/v1/evaluaciones/asignaciones-supervisor/proyectos` | `EvAsignacionesService.getProyectos` |
| PUT    | `/api/v1/evaluaciones/asignaciones-supervisor/{supervisorWorkerId}` | `EvAsignacionesService.updateAsignaciones` (body: `{ projectIds: number[] }`) |

**DTOs**: `SupervisorAsignacionDto { workerId, nombreCompleto, cargo, subarea, proyectos: ProyectoAsignadoDto[] }`, `ProyectoAsignadoDto { projectId, projectDescription }`. Filtra subareas `Unidad de Proyectos` y `Planeamiento BIM`.

### Arquitectura Comercial

Base: `${apiUrl}api/v1/arquitectura-comercial`

| Método | Endpoint                                                                 | Servicio                                                         |
| ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| GET    | `/dashboard`                                                             | `getDashboardData` (v1 — legado)                                 |
| GET    | `/dashboard-v2?categoriaId=&proyectoId=&userId=&semana=&mes=&anio=`      | `getDashboardV2(DashboardFiltroDTO)`                             |
| GET    | `/proyectos`                                                             | `getProyectos` — lista simple `{ id, nombre }`                   |
| GET    | `/alertas/{tipoAlerta}?...`                                              | `getActividadesPorAlerta(tipo, filtro)` → `ActividadAlertaDTO[]` |
| POST   | `/alertas/enviar`                                                        | `enviarAlertasActividades(EnviarAlertaRequestDTO)`               |
| GET    | `/filters`                                                               | `getFilters`                                                     |
| GET    | `/proyectos-con-actividades`                                             | `getProyectosConActividades`                                     |
| GET    | `/supervisores-ac`                                                       | `getSupervisoresAc`                                              |
| GET    | `/actividades?proyectoId=&tipo=&search=&soloActivas=&pagina=&porPagina=` | `getActividades`                                                 |
| POST   | `/actividades`                                                           | `createActividad` (body: `CreateActividadBody`)                  |
| PUT    | `/actividades/{id}`                                                      | `updateActividad` (body: `UpdateActividadBody`)                  |
| PATCH  | `/actividades/{id}`                                                      | `patchActividad` (body: `ActividadPatchBody`)                    |
| DELETE | `/actividades/{id}`                                                      | `deleteActividad`                                                |
| POST   | `/actividades/generar`                                                   | `generarActividades` (body: `{ proyectoId }`)                    |
| POST   | `/actividades/reasignar-encargado`                                       | `reasignarEncargado`                                             |
| PATCH  | `/proyectos/{id}`                                                        | `patchProyecto`                                                  |
| GET    | `/plantilla`                                                             | `getPlantilla`                                                   |
| POST   | `/plantilla`                                                             | `createPlantilla`                                                |
| PATCH  | `/plantilla/{id}`                                                        | `patchPlantilla`                                                 |
| GET    | `/categorias`                                                            | `getCategorias`                                                  |
| GET    | `/especialidades`                                                        | `getEspecialidades`                                              |
| GET    | `/etapas`                                                                | `getEtapas`                                                      |
| GET    | `/gantt`                                                                 | `getGantt`                                                       |

**DTOs nuevos** (`core/dtos/arquitectura-comercial/arquitectura-comercial-alert.model.ts`):

- `DashboardFiltroDTO { categoriaId, proyectoId, userId, semana, mes, anio }` — filtro unificado del dashboard.
- `ActividadAlertaDTO { id, nombre, proyecto, responsable1/2, emailResp1/2, fechaInicio/Fin, estado, spi, tipo, categoria, diasRestantes }`.
- `EnviarAlertaRequestDTO { actividadIds: number[], tipoAlerta: string }`.

**Extensiones en** `core/dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model.ts`:

- `HitoCriticoDTO`: añadido `id: number`.
- `ArqComercialDashboardDTO`: añadidos `tareasPorArquitectoDetalle`, `avanceSemanal`, `eficienciaSpi`, `categorias`.
- Nuevos interfaces: `TareasPorArquitectoDTO { userId, nombre, hitos, entregables, consultas, total, avancePct }`, `AvanceSemanalDTO { semana, programado, real }`, `EficienciaSpiDTO { semana, spi }`, `CategoriaItemDTO { id, nombre }`.

**DTOs clave** (`core/dtos/arquitectura-comercial/actividades.model.ts`):

- `ActividadListItemDTO` — fila de tabla. Campos clave: `orden` (ex `indice`), `spi?: number | null`, `partidaDeControl: string | null` (ex `tipo`), `categoriaId/Nombre`, `especialidadId/Nombre`, `userId`, `responsableNombre`, `userId2: number | null`, `responsableNombre2: string | null`, `encargado1`, `estado`, `retraso`.
- `ActividadPatchBody` — campos opcionales: fechas programadas/efectivas, `userId`, `userId2`, `observaciones`, `estado`, `activo`.
- `CreateActividadBody` — `nombre, tipo, projectId, etapaId, userId, inicioProgramado, finProgramado`. Opcionales: `categoriaId`, `especialidadId`.
- `UpdateActividadBody` — igual que Create más `userId2: number | null`, `inicioEfectivo`, `finEfectivo`, `observaciones`. Opcionales: `categoriaId`, `especialidadId`.
- `AcEtapaDTO { id, nombre }` — catálogo de etapas del backend.
- **Nota**: `GanttActividadDTO` conserva `tipo: string | null` (NO renombrado) y usa `orden` en vez de `indice`.

---

## 8. Estado actual de cada módulo

### `features/auth/` — ✅ Completo

- Login (form propio + Microsoft via MSAL).
- `complete-registration` (set password con token).
- `msal-redirect` callback.
- **Panel izquierdo del login** rediseñado: logo arriba + sección "Videos Tutoriales" con 7 cards scrollables (max ~3.8 visibles). Cada card abre el link de Loom en nueva pestaña. Array `tutorialVideos` en `login.ts` (readonly). Estilos glassmorphism en `login.css` (`.tutorial-card`, `.tutorial-play`, `.tutorial-scroll` con scrollbar delgado). Fondo y accent color (`#64bc04`) consistentes con la identidad existente.

### `features/home/` — ✅ Completo

- Página Inicio simple post-login.

### `features/security/` — ✅ CRUD completo

- `/security/users` (gestión de usuarios). Rol: `ADMINISTRADOR DEL SISTEMA`.
- Lista paginada con búsqueda client-side. CRUD completo: crear, editar, toggle activo/inactivo.
- Ver §13 para detalles de implementación.

### `features/projects/` — ✅ Producción / 🔵 En evolución

Sub-features: lecciones, dashboard, milestone-schedule (gantt), IVT control, cuaderno obra, informes, seguimiento residentes, configuración (áreas/fases/etapas/etc.). Todos completados. Proyectos incluye botón **"Emails SSOMA"** → modal `ProjectEmailsForm` (PATCH `/api/v1/project/{id}/emails`).

#### `milestone-schedule/` — Cronograma de Hitos (gantt) — 🔵 rediseño 2026-05-27
Componente standalone (`milestone-schedule.ts/.html/.css`) sobre **dhtmlx-gantt v9 free**. Vista de lista de proyectos → historial de cronogramas → gantt de hitos.

- **Lista de proyectos = grid de cards** (no tabla). `schedules: ProjectGetDTO[]` (array plano — NO `PagedResponseDTO`; se asigna con `this.schedules = response.data ?? []`). Input de búsqueda con **debounce 400 ms** (`onSearchChange()` → `clearTimeout` + `setTimeout` → `loadSchedules(1, searchQuery || undefined)`): búsqueda **server-side**, no client-side; `projectsFiltered` getter simplemente devuelve `this.schedules`. `loadSchedules(page, search?)` llama `ProjectService.getProjectPagedWithResidents(page, search, 12)` (pageSize=12 fijo). Grid responsive 1/2/3/4 cols. Cada card: bloque 120px con **foto del proyecto** (`projectImages[projectId]`) o **placeholder iniciales** sobre color determinístico (`getProjectColor` hash → 8 colores, `getInitials` = 2 primeras palabras). Subida foto vía ícono cámara (hover) → `onProjectImageChange()` → `ProjectService.uploadProjectFoto()`. Ícono ojo → `openMilestoneScheduleHistory(item.projectId, item.projectDescription)` (abre historial de versiones, **no** edición).
- **KPI cards (3)**: Total / Culminados / En proceso. Getter `kpis` sobre `ganttTasks` (`gantt.getTaskByTime()`).
- **Estados — solo 2**: `getEstado(task)` = `task['fechaRealFin'] != null ? 'CULMINADO' : 'EN_PROCESO'`. Colores gantt vía `getGanttClass` → clases `ms-culminado` (#16a34a) / `ms-en-proceso` (#2563eb). Columna "Estado" con badges (`.estado-*`). **Reglas gantt son globales en `styles.css`** (`.gantt_task_line.ms-*`, `.gantt_task_content` overlay) — dhtmlx inyecta fuera del scope del componente.
- **Acciones (editar / eliminar / culminar)** viven en el **modal "VER HITO"**, no en columnas del grid. `toggleCulminar()` alterna `fechaRealFin` (hoy ↔ null), sincroniza `selectedTask` y el DTO. Métodos `editTask/deleteTask/toggleCulminar` son `public` (los llama el template).
- **Milestones (sin fecha fin)**: se construyen con `{ type:'milestone', duration:0, end_date: start_date }` (NUNCA `null`/`undefined` — dhtmlx revienta con `calculateEndDate`). `gantt.templates.task_end_date` guarda contra fechas no-Date. Render como **círculo** (no rombo): `task_class` añade `gantt_milestone`; CSS global `.gantt_task_line.gantt_milestone .gantt_task_content` = 14px redondo centrado con `translate(-50%,-50%)`.
- **`undatedTasks: any[]`** — lista paralela para hitos sin fecha (plantilla fake-data de proyecto nuevo sin cronograma). dhtmlx-gantt ignora silenciosamente tareas con `start_date: null`; éstas se gestionan **fuera del Gantt** en `undatedTasks`. Template muestra dos estados vacíos: `*ngIf="noMilestones && undatedTasks.length > 0"` → tabla de hitos pendientes con botón "Agregar fecha" → `editUndatedTask(task)`; `*ngIf="noMilestones && undatedTasks.length === 0"` → pantalla vacía SVG. `editUndatedTask(task)` lee del array (no de `gantt.getTask()`). `saveEditTask()` detecta si el ítem está en `undatedTasks` (`findIndex` por `milestoneId`) y lo **promueve al Gantt**: `undatedTasks.splice(idx,1)` → si es el primero: `this.noMilestones=false`, `initGantt(false)`, `gantt.parse({data:[taskData],...})`; si ya hay otros en gantt: `gantt.addTask(taskData)`. `backToList()` limpia `undatedTasks = []`.
- **`gantt.showDate(new Date())`** se llama después de **cada** `gantt.parse(...)` para posicionar el scroll en la fecha actual.
- **Línea "Hoy"**: dhtmlx free **no tiene `addMarker`** → se dibuja `div#today-line-custom` manual en `drawTodayLine()` (posición por `gantt.getState().min/max_date`). Como vive dentro del stacking context del gantt, **no se puede poner detrás de modales solo con z-index**: las 5 flags de modal son **getter/setter** que llaman `updateTodayLineVisibility()` (oculta la línea si hay cualquier modal abierto). `BaseModal` overlay subido a `z-[1000]`/contenido `z-[1001]` (bajo SweetAlert ~1060 y loader 9998).
- **Densidad compacta** (~zoom 80%): `row_height:28`, `bar_height:16`, `gantt.config['milestone_height']=16` (bracket notation — `milestone_height` es index-signature en dhtmlx types, dot-notation causa TS4111), `scale_height:44`; escala día con `format:'%d'` (solo número, sin nombre de mes); `min_column_width:16`; KPIs y botones con padding reducido; reglas `app-milestone-schedule .gantt_*` en `styles.css`.
- **`gantt.config.csp = false`** al inicio de `initGantt()` — necesario para que dhtmlx no sanitice el SVG/HTML de los templates de columnas.

### `features/costs/` — ⚠️ Solo Adjudicaciones

- `/costs/adjudicaciones`. Rol: `ADMINISTRADOR DEL SISTEMA`.

### `features/contractors/` — ✅ Completo

- Doble routing: `CONTRACTORS_ROUTES` (`/contractors/registro`, público) + `CONTRACTORS_ADMIN_ROUTES` (`/contractors/management`, autenticado).
- `POST api/v1/contractorRegistration` (registro nuevo contratista): requiere auth (JWT). El backend sube archivos a SharePoint solo si se envían. Sin archivos, el registro funciona sin config SharePoint.
- `POST /habilitacion/empresas` (registro empresa — `/habilitacion/registro-empresa`): público `[AllowAnonymous]`. Devuelve 400 con `{ message }` si el RUC ya existe en `ss_empresa_contratista` o `contributor`.
- **Homologación** (`PATCH /ContractorManagement/{id}/approve`): ahora auto-envía email de activación al aprobar. Ya no es necesario llamar manualmente a `send-credentials` después.
- **Activación de credenciales** (`POST /auth/contractor-credentials`): si el email ya tiene `app_user`, reutiliza el usuario (actualiza contraseña) en vez de retornar 400.
- **Login contratista**: `login.ts` usa `authService.loginContratista(email, password)` (no `authService.login()`).
- **`allowedFeatures`** del token contratista ahora viene de BD (`role_feature` del rol CONTRATISTA), no hardcodeado. Administrar desde pgAdmin asignando features al rol.
- **`empresaId` en JWT contratista** = `contributor_id` (no `contractor_id`).

### `features/arquitectura-comercial/` — ✅ Completo

- Dashboard (v2 enterprise con modales de alertas, hitos y 4 charts — ver §17), Actividades (CRUD completo), Gantt, Plantilla.
- Gantt usa **dhtmlx-gantt** + **QuickChart** (POST cuando GET URL > `QUICKCHART_GET_LIMIT = 16000` chars).
- **Actividades — CRUD completo**: editar actividad (PUT), eliminar actividad (DELETE con Swal confirm), crear consulta/hito/entregable (POST).
- **Tabla actividades**: columnas Etapa, **Partida de Control**, **Categoría**, **Especialidad** (badges pill `bg-gray-100`), **SPI** (verde/naranja/rojo según ≥1/≥0.8/<0.8), **Responsable 1** (texto read-only `encargado1`), **Responsable 2** (dropdown `[ngModel]="a.userId2"` → `patchActividad`). Colspan separadores = 19. Columna acciones sticky: `.th-actions-sticky` + `.td-actions-sticky` (`position:sticky; right:0`).
- **Botón "+ Nueva Consulta"**: visible cuando `tipoFiltro === 'CONSULTA'`. Abre `components/nueva-consulta/`. Body fijo: `categoriaId: 2, especialidadId: 2`.
- **Botón "+ Nuevo Hito"**: visible cuando `tipoFiltro === 'HITO'`. Abre `components/nuevo-hito/`. Campos: etapaNombre, actividad (3 opciones), mes (12 opciones), correlativo, especialidadId (1=EJECUCIÓN / 2=CONTROL). Fijos: `categoriaId: 3 (POST VENTA), tipo: 'HITO'`. Nombre generado: `${etapaNombre}_${actividad}  (${mes}) ${correlativo.padStart(2,'0')}`. **Checkbox "Nombre personalizado"**: `nombrePersonalizado = false` por defecto; cuando ON, `canSubmit` solo exige `nombreLibre.trim()` no vacío y `submit()` usa `nombreLibre` en vez del nombre calculado.
- **Botón "+ Nuevo Entregable"**: visible cuando `tipoFiltro === 'ENTREGABLE'`. Abre `components/nuevo-entregable/`. Campos: etapaNombre, reporte (5 opciones), categoriaId (3=POST VENTA / 4=ALMACENES). Fijos: `especialidadId: 2, tipo: 'ENTREGABLE'`. Nombre generado: `${etapaNombre}_${reporte}`. **Checkbox "Nombre personalizado"**: igual que Nuevo Hito — `nombrePersonalizado`/`nombreLibre` con misma lógica de `canSubmit`/`submit()`.
- **Modales Nuevo Hito / Nuevo Entregable**: auto-seleccionan etapa "POST VENTA Y EXPERIENCIA" al abrir. Etapas cacheadas en el componente (guard `etapas.length > 0` + `applyDefaultEtapa()` en cada apertura).
- **Modal Nueva Consulta**: nombre generado como `{etapa}_RFI_{numero}_{ubicacion}`. Etapa del nombre es lista fija hardcodeada (NO carga del endpoint `/etapas`). Etapa para columna sí carga del endpoint.
- **Modal Editar Actividad**: `components/editar-actividad/`. Campo `tipo` del form mapea a `partidaDeControl` de `ActividadListItemDTO` (campo local del form sigue llamándose `tipo` para el body del backend).
- **Eliminar**: botón basura en cada fila → Swal → DELETE → `loadActividades()`.
- **DTOs añadidos**: `CreateActividadBody`, `UpdateActividadBody` (en `core/dtos/arquitectura-comercial/actividades.model.ts`).
- **Métodos de servicio añadidos**: `createActividad()`, `updateActividad()`, `deleteActividad()` (en `ArquitecturaComercialService`).

### `features/ssoma/salud-ocupacional/paso/` — 🔵 Módulo PASO (2026-06-11)

Programa Anual de Seguridad, Salud Ocupacional y Medio Ambiente. Lazy bajo `/ssoma/salud-ocupacional/paso/`.

**Rutas**:
```
/paso/dashboard        → PasoDashboardComponent   (featureKey: ssoma.paso.dashboard)
/paso/lista            → PasoListaComponent        (featureKey: ssoma.paso.lista)
/paso/alertas          → PasoAlertasComponent      (featureKey: ssoma.paso.alertas)
/paso/actividad/:id    → PasoActividadDetalleComponent
/paso/:id              → PasoDetalleComponent
```

**Vista lista** (`PasoListaComponent`) — toggle `vista: 'mes'|'año'|'proyecto'`:
- **Mes**: navegador de mes + `resumenMes` (endpoint `resumen-mes`). KPI strip solo muestra toggle; KPIs de mes aparecen en sección `mes-kpis` abajo.
- **Año**: árbol de actividades por ámbito (tabs Seguridad / Salud / Ambiente). `actividadesTab` filtra por `categoriaAmbito === tabActiva`.
- **Proyecto**: tabla por año (`PasoHistoricoAnioDto[]`) con columnas Año | Programadas | Ejecutadas | Vencidas | SPI | Avance + fila de totales (`historicoTotales` getter). Si `paso.proyectoId` es null muestra aviso.
- `TabAmbito = 'Seguridad' | 'Salud' | 'Ambiente'` — SSOMA eliminado en lista, detalle y actividad-tree.
- `loadHistorico(proyectoId)` se dispara en `loadDetalle()` si ya estás en vista Proyecto, o en `cambiarVista('proyecto')` si `historicoData` es null.

**Componentes reutilizables**:
- `SpiBadgeComponent` — pill con semáforo: ≥0.95 verde / 0.80-0.94 amarillo / <0.80 rojo.
- `EjecucionModalComponent` — registra ejecución + drag & drop evidencia.
- `InstanciarModalComponent` — wizard 2 pasos: proyecto+año → confirmar. Usa `ProjectService.getWithResidentByUserId()`.
- `ActividadTreeComponent` — agrupa `PasoActividadDto[]` por `categoriaId`. `@Input() ambito: 'Seguridad'|'Salud'|'Ambiente'`.
- `PasoGanttComponent` — existe pero **desconectado** (no se usa en lista/detalle).

**Sidebar**: entrada "Prog. Anual SSOMA" en grupo "Salud Ocupacional" de `navigation.service.ts` (featureKey `ssoma.paso.dashboard`).

### `features/evaluaciones/asignaciones/` — ✅ Asignaciones de Supervisores (2026-06-03)

Pantalla para la jefa de UDP para asignar proyectos a supervisores de subareas "Unidad de Proyectos" y "Planeamiento BIM".

- Ruta: `/evaluaciones/asignaciones` (featureKey: `evaluaciones.asignaciones`)
- Modal de edición con checkboxes. DTOs: `SupervisorAsignacionDto.nombreCompleto`, `ProyectoAsignadoDto.projectId/projectDescription`.
- Nav item condicional (`*ngIf="hasAsignaciones"`) añadido al topbar de las 4 páginas existentes de evaluaciones.

### `features/evaluaciones/pages/evaluar-residente/` — 🔄 Rediseño (2026-06-03)

Grid 2 columnas de cards (1 col mobile ≤640px). Paleta de 8 colores por `projectId % 8`. Buscador con focus ring. Contador "X/Y evaluados". Badge "✓ Evaluado" con opacidad 60% en cards ya evaluadas. Lógica de evaluación sin cambios.

### `features/clinica/` — ✅ Módulo Clínica (nuevo en 2026-05-26)

Panel de gestión para la clínica ocupacional (rol: `clinica.agenda` featureKey).

**Sub-rutas** (`clinica.routes.ts`):

```
/clinica              → redirect 'dashboard'
/clinica/dashboard    → ClinicaDashboard  (métricas hoy + nav a subrutas)
/clinica/agenda       → Agenda            (programaciones del día + acciones)
/clinica/programaciones → ProgramacionesClinica (historial filtrable)
/clinica/interconsultas → InterconsultasClinica (derivaciones pendientes)
/clinica/emos         → ClinicaEmos       (control de EMOs — solo lectura)
/clinica/activar      → ActivarClinica    (público)
```

**Sidebar**: entrada única en `navigation.service.ts` (`key: 'clinica'`, 1 item → `/clinica/dashboard`). `sidebar.ts:onModuleClick` para `'clinica'` navega directo (sin dropdown) — mismo patrón que `control-acceso`.

**Dashboard** (`pages/dashboard/`): carga métricas reales en `ngOnInit` vía `ClinicaProgramacionService` (programaciones hoy + semana) e `InterconsultaService` (pendientes). Grid 3-columnas nav-cards + grid 3-columnas métricas con `has-alert` cuando hay interconsultas pendientes. Nav-cards: Agenda del Día, Programaciones, Interconsultas, **Control de EMOs**.

**Control de EMOs** (`pages/emos/`): vista de solo lectura del endpoint `GET /emos/por-trabajador`. Reutiliza `EmoService`, `CatalogosSaludService`, DTOs (`EmoPorTrabajadorDto`, `EmoPorTrabajadorQuery`), utils (`aptitudBadgeClass`, `diasVencerBadgeClass`) y el componente `EmoDetail` directamente de `ssoma/salud-ocupacional/`. Sin botón crear ni editar. Click en fila con EMO abre `<app-emo-detail>`; botón historial navega a `/ssoma/salud-ocupacional/emos/{workerId}/historial`. `featureKey: 'clinica.agenda'`.

**Agenda** (`pages/agenda/`) — rediseño enterprise 2026-05-28:

- Layout full-screen (`:host flex-col flex-1`), header `#0f172a` con `linear-gradient`, stats-bar, controls-row, cards-zone con grid 3 columnas responsive (→2 en ≤1100px, →1 en ≤640px).
- **Card estructura 3 zonas**: `.card-top` (nombre/DNI + badge estado + `.card-chips` con chip-groups etiquetados "Tipo"/"Categoría"/"Ocupación"/"EMO"), `.card-dates` (banda `#f8fafc` con fecha programada + hora + vence EMO + check-in), `.card-actions` (margin-top:auto).
- **Modal aceptar**: hora obligatoria con validación triple (`!hora || trim==='' || =='--:--'`); grid 2 col fecha+hora; error inline `.dm-error-inline`.
- **Tab system**: propiedad `activeTab: 'agenda'|'interconsultas'`. Tab Interconsultas carga `cargarInterconsultas()` en `ngOnInit` + en `cambiarTab()` si no hay datos. `ChangeDetectorRef.detectChanges()` forzado en `next`/`error` y `cambiarTab`.
- **Tab Interconsultas**: tabla full-width con columnas Trabajador, Especialidad, F.Derivación, Días (calculados con `calcularDiasPendientes(fechaDerivacion)`), Estado, botón `ic-btn-accion` ("🔧 Gestionar"/"📋 Ver detalle"). Helpers: `icEstadoClass()`, `icDiasClass(dias)`, `calcularDiasPendientes()`. HTTP GET a `/interconsultas` con `HttpParams`.
- **Modal levantamiento interconsulta** (`icDetalle`/`icPaso`/`icLevantamiento`): backdrop `modal-overlay`, caja centrada `ic-modal-box` 580px. Paso 1: fecha+resultado (grid 2col) + diagnóstico + archivo (upload). POST `/interconsultas/{id}/documentos` + PATCH `/interconsultas/{id}/resultado`. Paso 2: mensaje de éxito.
- **DTOs ampliados** (`clinica.model.ts`): `ProgramacionClinicaDto` añadidos `fechaVencimientoEmo?: string|null`, `categoria?: string|null`, `tipoTrabajador?: string|null`, `ocupacion?: string|null`. `ClinicaAccionDto` añadido `horaNueva?: string`.

**Programaciones** (`pages/programaciones/`) — rediseño 2026-05-28:

- Full-screen idéntico a agenda: header gradient oscuro, `.controls-row` blanca, `.table-zone` scroll. Badge de conteo `items.length` en header. Loading dots verdes, empty state `📋`. `| date:'dd/MM/yyyy'` en fecha.

**Interconsultas** (`pages/interconsultas/`) — rediseño 2026-05-28:

- Mismo estándar visual: header `linear-gradient #0f172a→#1e293b`, `.controls-row` blanca, `.table-zone` con `.table-card`. Badges días: `ic-chip-red/orange/green/muted`. Badges estado: `chip-orange/green/gray` (border-radius 6px). Modales dark conservados íntegramente.

**`layout.ts` `isFullPage()`** incluye: `/clinica/dashboard`, `/clinica/agenda`, `/clinica/interconsultas`, `/clinica/programaciones` (header global oculto en todas estas rutas).

**Servicios de Clínica** (`features/clinica/services/clinica-programacion.service.ts`):

- Base: `${apiUrl}api/v1/ssoma/salud-ocupacional/programaciones`
- `getProgramacionesHoy(clinicaId?)` → GET con `desde=hoy&hasta=hoy`
- `getProgramacionesFiltradas({ desde, hasta, estado })` → GET con filtros
- `accionClinica(id, body)` → PATCH `/{id}/clinica-accion` con `ClinicaAccionDto { accion: Aceptar|Rechazar|CheckIn|Completar, motivoRechazo?, checkInHora?, emoResultadoId?, horaNueva?, fechaNueva? }`

**DTOs** (`features/clinica/dtos/clinica.model.ts`): `ProgramacionClinicaDto`, `ClinicaAccionDto`, `EstadoProgramacionClinica`.

### `features/ssoma/salud-ocupacional/` — ✅ Completado

- Dashboard, EMOs, Programaciones, Interconsultas, Convalidaciones, Catálogos (Clínicas/Médicos/Tipos de EMO con CRUD).

### `features/configuracion/` — ✅ Completo

Standalone routes. Razones Sociales (read-only), Proyectos (CRUD con emails SSOMA), Trabajadores (read-only — crear/editar worker migrado a Habilitación).

### `features/gestion-administrativa/` — ✅ Implementado (detalle en §14)

Solicitud de Salidas, Gestión de Salidas. Configuración: Motivos de Salida, Lugares de Origen/Destino. Todas las rutas usan `featureKey`. DTOs auto-contenidos dentro del feature.

### `features/mejora-continua/` — ✅ Implementado (detalle en §15)

Lecciones Aprendidas. Configuración: Áreas (lesson-areas), Relaciones por Área (areas-subareas + PSSS scope), Plantillas, Tipos de Catálogo, Ítems de Catálogo, Recordatorios. **`Relations` eliminado** (2026-05-29). Todas las rutas usan solo `roleGuard` (el shell padre aplica `authGuard`).

### `features/habilitacion/` — ✅ Completo (detalle en §12)

Plataforma completa mobile-first.
**Cambios 2026-05-18/19:** `trabajadores.html` — lista y botón "Crear" visibles para rol `CONTRATISTA` (`isContratista()`); pills de filtro Casa/Contratista ocultos para contratistas; upload oculto para ítem 12 (Induccion Obra); APROBAR/RECHAZAR gated por `!isContratista() && isAdmin()`; marcarInduccion oculto para contratistas; botones "Dar de baja" y "Reingreso" + checkboxes + barra masiva visibles para `isAdmin() || isContratista()`; "Cambiar obra" sigue solo para `isAdmin()`. `onFileSelected()` usa `res.path` (ruta relativa) en vez de `res.url` para `panelArchivoUrl` — evita almacenar URL absoluta que expira en BD. **`WorkerCreateEdit` migrado desde Configuración** — modal unificado crear/editar con lógica diferenciada Casa vs Contratista, soporte DNI/CE, catálogos en cascada (Área→Subárea→Jefatura), combobox Categoría/Ocupación desde `/catalogos/categorias` y `/catalogos/ocupaciones`. `onDniBlur()` encadena 4 pasos: formato, RENIEC (solo DNI), restringidos, existencia en BD. Ver §12 para subcomponentes y endpoints.
**Cambios 2026-05-19:**

- **Componente `inducciones`** (`pages/inducciones/`): reescrito completo. Tabla de seguimiento para CONTRATISTA. Badge con 3 estados: `REALIZADA` → "Completada" (verde), `PROGRAMADA + ingresoConfirmado=true` → "Ingresó" (amarillo), `PROGRAMADA + ingresoConfirmado=false` → "Pendiente" (rojo). Llama `InduccionService.getList(params)` con `empresaId` del JWT. Filtros: estado, fechaDesde, fechaHasta. CSS usa `.badge`, `.badge-green`, `.badge-yellow`, `.badge-red`, `.badge-orange`, `.badge-gray`.
- **Sidebar Inducciones para CONTRATISTA**: `navigation.service.ts` — entrada `{ label: 'Inducciones', route: '/habilitacion/inducciones', roles: ['CONTRATISTA'] }` en el grupo Gestión. Solo visible para CONTRATISTA (usa `roles` en vez de `featureKey`).
- **`InduccionListDto`**: añadidos `ingresoConfirmado: boolean` y `fechaIngreso?: string` para alimentar la lógica de badges.
- **`InduccionService.getList()`**: nuevo método que llama `GET /inducciones` y retorna `InduccionListDto[]` (no paginado).
- **`reingreso-form.ts`** (`components/reingreso-form/`): branch CONTRATISTA en `loadCatalogos()` — carga proyectos vía `EmpresaContratistaService.getProyectos(empresaId)` en vez de todos los proyectos.
- **Fix `res.url` → `res.path`** al subir archivos (3 componentes): `empresa.ts:364`, `sctr-subir.ts:305`, `registro-empresa.ts:92`. Todos almacenaban `res.url` (URL firmada temporal) en vez de `res.path` (path relativo estable) → `archivoUrl` en BD quedaba con URL expirada. `trabajadores.ts` y `equipos.ts` ya estaban correctos.
- **Fix dropdown proyectos en Programar Inducción** (2 componentes): `inducciones/components/programar-induccion/programar-induccion.ts` y `trabajadores/trabajadores.ts` (`loadCatalogos()`). Cuando `authService.hasRole('CONTRATISTA')`, carga proyectos vía `EmpresaContratistaService.getProyectos(empresaId)` y mapea `{ proyectoId, proyectoNombre } → { projectId, projectDescription }`. Antes cargaba todos los proyectos.
  **Cambios 2026-05-20:**
- **`worker-create-edit.html`**: eliminado `*ngIf="esOficinaCentral"` del div de Área — ahora visible para Staff y Oficina Central. El dropdown de Subárea ya depende de `model.area` (no de `esOficinaCentral`), así que Staff puede seleccionar área y disparar `getSubareas(area)`.
- **`worker-create-edit.ts`**: `onObraOficinaChange()` resetea `model.area`, `model.subarea`, `model.jefatura` y `subareas = []` al cambiar tipo. `canSubmit` para `esStaffOOficina` exige `model.subarea` no vacío además de email corporativo y celular.
- **`sctr-vidaley.ts`**: `aprobarSeleccionados()` y `rechazarSeleccionados()` ahora llaman `loadDocumentos(this.currentPage)` Y `loadTrabajadores()` después del Swal, refrescando ambos tabs.
- **`sctr-subir.html`**: chip de estado del worker en paso 2 usa `model.tipo === 'VIDA_LEY' ? w.estadoVidaLey : w.estadoSctr` en lugar de `w.estadoSctr` siempre.
- **`trabajadores.html` — panel contratista**: upload zone deshabilitado cuando `requiereVigencia && !panelVigencia` (no dispara click, clase `upload-zone--active` retirada); botón "Reemplazar archivo" con `[disabled]="selectedEntregable.requiereVigencia && !panelVigencia"`; eliminado botón "ENVIAR DOCUMENTO" del panel contratista (el envío ocurre automáticamente en `autoMarcarEnviado()` al terminar el upload); mensaje de error rojo debajo del campo vigencia cuando `requiereVigencia && !panelVigencia`; textarea observaciones con `(blur)="guardarObservaciones()"`.
- **`trabajadores.ts`**: `selectEntregable()` inicializa `panelVigencia = '2040-12-31'` cuando `!e.requiereVigencia` (sentinel), vacío cuando `requiereVigencia && sin vigencia previa`. `panelObsAbril` se inicializa desde `e.obsContratista` para contratistas, `e.obsAbril` para admins. `autoMarcarEnviado()` next() ahora incluye `vigencia: this.panelVigencia` en `actualizarEntregableLocal()`. Nuevo método `guardarObservaciones()`: PUT solo con `{ estado, obsContratista }` sin tocar archivo ni vigencia; next() sincroniza `obsContratista` en el objeto local de `this.entregables`.
- **`induccion.service.ts`**: `aprobarBatch()` corregido de `http.post` a `http.patch` → PATCH `/inducciones/aprobar-batch`.
- **`bandeja` — tab Inducciones rediseñado**: reemplazada lista vertical plana por tarjetas agrupadas por `proyectoId+empresaId+fecha`. Cada tarjeta muestra: proyecto, empresa, fecha, flags Altura/Eléctrico, contador "N/M asistieron", checkbox "Seleccionar todos los asistentes", chips por worker (verde+checkbox si `ingresoConfirmado=true` pre-seleccionado, gris sin checkbox si false), botón "Aprobar seleccionados (N)" → llama `InduccionService.aprobarBatch(ids)`. Tab Inducciones no muestra el dropdown "Todos los responsables" ni el split izquierda/derecha — usa layout full-width. `InduccionListDto` añadido `contrataCasa?: string`. `bandeja.ts` inyecta `InduccionService`; `setTipo('INDUCCION')` llama `loadInducciones()` en vez de `loadItems()`; `groupInducciones()` agrupa client-side. Aprobar en tab TRABAJADOR/EMPRESA/EQUIPO: modal sin campo de fecha editable — si el item tiene vigencia se muestra como `<input type="date" readonly>`.

**Cambios 2026-05-24:**

- **`dashboard-contratista`** (NUEVO) `pages/dashboard-contratista/`: panel enterprise de resumen para CONTRATISTA. Grid 2×2 (Proyectos | Entregables Empresa / Trabajadores | Equipos). Nav superior con pills para Trabajadores, Empresa, Equipos, SCTR, Inducciones. Sin scroll externo (`height: 100%`, `overflow: hidden`). Skeleton shimmer en loading. Skeleton KPI en header. Standalone + `RouterModule`. Ruta: solo `authGuard`; `ngOnInit()` redirige a `trabajadores` si no es contratista.
- **Panel "Usuarios" en dashboard-contratista**: pill "Usuarios" en top-nav toglea `activeSection: 'resumen' | 'usuarios'`. Cuando `'usuarios'`, muestra `<app-contratista-usuarios>` a pantalla completa en `.usuarios-section`. El dashboard decodifica el JWT (`jwtDecode`, claim `sub`) para obtener `currentUserId` y lo pasa al componente.
  - **`ContratistaUsuarioService`** (`habilitacion/services/contratista-usuario.service.ts`): CRUD contra `GET|POST /api/v1/contratista-usuarios?contractorId=`, `PUT /{id}`, `PATCH /{id}/desactivar`. DTOs: `ContratistaUsuarioDto`, `InvitarUsuarioDto`, `ActualizarUsuarioDto`. Usa `buildHabHeaders()` + `buildHabParams()`.
  - **`ContratistaUsuarios`** (`pages/dashboard-contratista/components/contratista-usuarios/`): tabla con Nombre, Email, Rol (badge color por OWNER/ADMIN/GESTOR), Scope, Estado (chip verde/gris), Acciones (Editar | Desactivar/Activar). `@Input() contractorId`, `@Input() currentUserId`. `esOwner` getter: busca `userId === currentUserId && rolNombre === 'OWNER'`. Acciones y botón "Invitar" solo visibles si `esOwner`. Modales vía `Swal.fire({ html, didOpen, preConfirm })` con campos: Email (solo invitar), Rol (ADMIN|GESTOR), Scope (TODOS|POR_PROYECTO), checkboxes proyectos (cargados de `HabEmpresaService.getProyectosDisponibles`). CSS propio `.cu-*` en `contratista-usuarios.css`.
- **`roleGuard`** (`core/guards/role.guard.ts`): añadido fallback `authService.isContratista()` en el bloque `allowedRoles` cuando el array incluye `'CONTRATISTA'`. Sin esto, el guard rechazaba contratistas en rutas sin `featureKey` porque sus roles no están en JWT Microsoft.
- **`sidebar.ts`**: `onModuleClick` para `module.key === 'habilitacion'` ahora brancha: si `isContratista()` → navega a `/habilitacion`, si no → navega a `/`. Inyectado `AuthService`. `module.key === 'control-acceso'` navega directo a `/habilitacion/control-acceso` en un clic (sin dropdown intermedio).
- **`habilitacion.routes.ts`**: redirect `''` cambiado de `'trabajadores'` a `'dashboard-contratista'`.
- **Fixes vigencia panel contratista** (3 componentes):
  - `trabajadores.ts`: campo vigencia editable (input date) gated por `requiereVigenciaAnteUpload`; upload bloqueado si no hay fecha; `guardarEntregable()` rama contratista incluye `vigencia: panelVigencia`.
  - `equipos.ts`: `autoMarcarEnviado()` computa `vigencia` antes del payload y la reutiliza en `actualizarEntregableLocal`; `guardarEntregable()` tiene rama contratista con `{ archivoUrl?, vigencia?, obsContratista? }`.
  - `empresa.ts`: `guardarAdmin()` renombrado a `guardarEntregable()` con rama contratista idéntica.
- **Botón "ENVIAR DOCUMENTO" eliminado** de `empresa.html` y `equipos.html` — flujo auto-save al subir.

**Cambios 2026-05-26 — Módulo Clínica + integración Programar EMO en Trabajadores:**

- **`ProgramacionCreate`** (`ssoma/salud-ocupacional/programaciones/components/programacion-create/`):
  - `@Input()` nuevos: `preselectedWorkerId`, `preselectedWorkerNombre`, `preselectedWorkerDni`, `preselectedEmpresaId`. `ngOnInit` pre-carga `this.worker` (con `dni: preselectedWorkerDni ?? ''`) y `this.empresaId` desde los inputs.
  - Campos **eliminados** del formulario y del TS: `hora`, `medicoId`, `motivo`, `notas`. Array `medicos` y getter `medicosFiltrados` eliminados. `onClinicaChange` simplificado a solo asignar `clinicaId`.
  - Método `onTipoEmoChange(id)` para actualizar `tipoEmoId` con log durante desarrollo.
  - Payload: campo renombrado `fecha` → `fechaProgramada`. Mismo cambio en `ProgramacionCreateDto` (`ssoma/dtos/programacion.model.ts`).
- **`WorkerHabilitacionListDto`** (`habilitacion/dtos/trabajador.model.ts`): añadidos `tieneEmo?: boolean` y `diasRestantesEmo?: number | null`.
- **`trabajadores.ts`** (`habilitacion/pages/trabajadores/`): importa `ProgramacionCreate`. Propiedades `mostrarProgramarEmo`, `workerParaProgramarEmo`. Métodos `abrirProgramarEmo(worker)` y `onProgramarEmoSaved()`.
- **`trabajadores.html`**: botón "Programar EMO" (icono ECG) en `div.wc-actions` por worker card, condición `isAdmin() && w.estadoWorker !== 'RETIRADO' && w.contrataCasa === 'Casa' && (!w.tieneEmo || (w.diasRestantesEmo !== null && w.diasRestantesEmo !== undefined && w.diasRestantesEmo <= 6))`. `<app-programacion-create>` al final del template con 4 inputs: `preselectedWorkerId`, `preselectedWorkerNombre`, `preselectedWorkerDni`, `preselectedEmpresaId`.
- **`agenda.ts`** (`clinica/pages/agenda/`): método `aceptar()` reemplazado por `Swal.fire` con input `type="time"` (hora obligatoria, `preConfirm` valida) antes de llamar `ejecutarAccion(..., { accion: 'Aceptar', checkInHora: result.value })`. Importa `Swal`. Métodos añadidos: `initials(nombre)`, `avatarBg(nombre)` (color determinista por hash), `timelineDot(estado)`.
- **`agenda.html`**: rediseño enterprise completo — stats pills (Total/Atendidos/Por confirmar + btn Refresh), secciones con dot de color, cards con avatar circular de iniciales (`[style.background]="avatarBg(...)"`) + meta-row (tipoEmo, empresa, hora, DNI) + acciones por estado, rechazo inline en card. `motivoRechazo` visible solo cuando `rechazandoId === item.id`.
- **`agenda.css`**: reemplazado completo — `.stat-pill`, `.agenda-card`, `.card-avatar`, `.card-meta`, `.btn-action` (`.btn-accept/.btn-reject/.btn-checkin/.btn-complete`), `.badge-chip` con variantes chip-\*, `.loading-dot` con animación pulse, `.empty-state`.
- **`completar-emo.ts`**: refactorizado completo — eliminados `numeroInforme`, `urlResultado`, `icCentro`, `icCie10`, `uploadingAptitud/Emo`; añadido `lecturaRealizada: boolean` (checkbox, controla si se guarda `fechaLectura`); `canSubmit` ahora exige `archivoAptitud && archivoEmo` cuando `requiereDocumentos`, y al menos 1 restricción cuando `requiereRestriccion`; `interconsultaInline` simplificado (solo `especialidad`, `diagnostico`, `requiereSeguimiento`).
- **`completar-emo.html`**: reescrito — checkbox "Se realizó lectura del EMO" + campo fecha condicional; sección Restricciones* con hint "Debes agregar al menos una"; sección Documentos* (2 file inputs PDF obligatorios); interconsulta simplificada (especialidad + diagnóstico + checkbox seguimiento solo para "No Apto").
- **`completar-emo.css`**: añadidos `.checkbox-row`, `.fecha-lectura-row`, `.field-hint`.
- **`interconsultas.ts`** (`clinica/pages/interconsultas/`): `load()` — detección explícita de array: `Array.isArray(res)` → `Array.isArray(res?.items)` → `Array.isArray(res?.data)` → `[]`.

**Cambios 2026-05-27 — Admin usuarios contratista + fixes contratista-usuarios:**

- **`ContratistaUsuarios`** (`habilitacion/pages/dashboard-contratista/components/contratista-usuarios/`): añadido `@Input() forceAdminMode: boolean = false`. El getter `esOwner` retorna `true` directamente cuando `forceAdminMode === true`, ignorando `currentUserId` y `rolNombre`. Permite usar el componente en modo admin sin usuario logueado.
- **`ContratistaUsuarios` — CLINICA_CONTRACTOR_ID**: constante privada `CLINICA_CONTRACTOR_ID = 644`. `buildFormHtml()` acepta `isClinica?: boolean`. Cuando `isClinica = true`, el selector `swal-system-role` muestra solo `<option value="14">Clínica</option>` en vez de las opciones 11/49. `abrirModalInvitar()` activa `showTipoAcceso` para contractor 572 o 644 y pasa `isClinica` solo para 644.
- **`AdminContratistaUsuarios`** (NUEVO) `pages/admin-contratista-usuarios/`: página admin standalone para gestionar usuarios de cualquier empresa contratista. Carga lista de empresas via `EmpresaContratistaService.getEmpresasLogin()` (`GET api/v1/habilitacion/auth/empresas`). Selector de empresa (`EmpresaSimpleDto { id, razonSocial, nombreComercial? }`). Al seleccionar, muestra `<app-contratista-usuarios [contractorId]="..." [currentUserId]="null" [forceAdminMode]="true">`. Ruta: `admin-usuarios-contratista`, solo `authGuard`, título `HABILITACIÓN - GESTIÓN USUARIOS CONTRATISTA`.

### `features/evaluaciones/` — 🔵 En desarrollo (2026-05-31)

Módulo de evaluación de residentes. `isFullPage()` en `layout.ts` cubre todas sus rutas.

**Sub-rutas** (`evaluaciones.routes.ts`):
```
/evaluaciones              → redirect 'dashboard'
/evaluaciones/dashboard    → DashboardGerencia  (featureKey: evaluaciones.dashboard)
/evaluaciones/evaluar      → EvaluarResidente   (featureKey: evaluaciones.evaluar)
/evaluaciones/historial    → Historial          (featureKey: evaluaciones.historial)
/evaluaciones/configuracion → ConfiguracionPlantilla (featureKey: evaluaciones.configuracion)
```

**Base URL backend**: `${apiUrl}api/v1/evaluaciones/`

| Servicio | Endpoints clave |
|---|---|
| `EvPeriodoService` | `GET /periodos/activo`, `GET /periodos`, `PUT /{id}/activar` |
| `EvPlantillaService` | `GET /plantilla/areas`, `GET /plantilla/{area}`, `PUT /{id}` |
| `EvEvaluacionService` | `POST /residentes`, `GET /residentes/mis-evaluaciones`, `GET /residentes/residentes-evaluables`, `GET /residentes/mi-subarea` |
| `EvDashboardService` | `GET /dashboard/gerencia?periodoId=`, `GET /dashboard/tendencia` |

**DTOs**: `ev-periodo.model.ts`, `ev-plantilla.model.ts`, `ev-evaluacion.model.ts`, `ev-dashboard.model.ts` (en `features/evaluaciones/dtos/`).

**`EvaluarResidente` — convenciones críticas**:
- Campo del JSON: `nombreCompleto` (no `nombre`). Interfaz local `ResidenteItem { userId, nombreCompleto, projectId, projectNombre, puedeVerTodos }`.
- `puedeVerTodos = true` → Modo A: buscador dropdown con todos los residentes.
- `puedeVerTodos = false` → Modo B: lista directa filtrable por proyecto.
- Área se determina automáticamente desde `GET /residentes/mi-subarea` → `miSubarea`. Fallback: `'Todos'`. El usuario NO selecciona el área manualmente.
- Layout: columna única, criterios 2-col CSS grid (`display:contents` en wrapper), footer sticky (1 fila), panel "Mis evaluaciones" colapsable al fondo (`misEvalColapsado = true` por defecto).

**`DashboardGerencia` — convenciones críticas**:
- Chart.js importado como módulo: `import Chart from 'chart.js/auto'` (no `window['Chart']`).
- `implements OnInit, AfterViewInit`. `renderCharts()` llamado en `AfterViewInit` y en `loadDashboard` (`setTimeout 100ms`). `setVista()` usa `detectChanges()` síncrono antes del timeout para garantizar canvas en DOM.
- Colores cíclicos: `private readonly COLORES` (7 pares bg/border), método `color(i)`.
- Dos vistas: `vistaActiva = 'mensual' | 'tendencia'`. `charts-area` y `tendencia-area` con `*ngIf`. `renderCharts()` solo renderiza el gráfico de la vista activa.
- `residenteActivoTendencia: number | null` — controla qué línea se resalta en tendencia. Se setea al hacer click en canvas (`onTendenciaClick`) o al cambiar residente estando en vista tendencia. Al cargar se resetea a `null`. Comparación con `Number()` coercion para evitar type mismatch.
- `renderBarras`: colores fijos `#1E3A5F` (actual) / `#CBD5E1` (anterior). Plugin inline `separators` dibuja líneas punteadas entre grupos. Datalabels sobre barras. Eje Y min 10, max 20.
- `renderTendencia`: ordena meses por clave `YYYY-MM`. Filtra `tendencia` por `<= hoy`. Eje X callback muestra año solo en enero. Click en canvas resalta la línea del dataset clickeado.
- Heatmap Panel 2: usa `residenteActivo?.promediosPorArea ?? dashboard.promediosPorArea`. Tabs por área en detalle. `criterios-grid` muestra `crit-evaluador-header` + criterios + `crit-comentario`.
- Panel comentarios (tendencia-area): filtrado por `residenteActivo.userId`.
- `console.log` de debug en `renderTendencia` y `loadDashboard` — quitar antes de producción.

**Sidebar**: módulo `evaluaciones` en `navigation.service.ts` con `iconKey: 'star'`. Requiere agregar ese key en `nav-icon.html` si se quiere icono custom.

### Branches actuales

- Working: `master` y `feature/arquitectura-comercial` (ambas en sync — cherry-pick en cada commit).
- Main para PRs: `master`.

---

## 9. Pitfalls conocidos

### SSR

- **Hydration desactivado a propósito** (`app.config.ts:25`). Reactivar requiere revisar todos los accesos a `localStorage`/`window`.
- En `authGuard:15` el SSR retorna `true` directo. **No quitar**.
- Servicios SSOMA usan `typeof localStorage !== 'undefined'` (defensivo). Servicios en `core/services/*` no son defensivos (OK si no reactivas SSR).

### Auth & roles

- Roles vienen del claim Microsoft. Match es **string exact** (uppercase español). No normalizar.
- `getRoles()` soporta tanto JWT Microsoft (`http://schemas.microsoft.com/...role`) como JWT contratista (`role` plano).

### HTTP

- **No hay interceptor.** Cada request requiere construir manualmente el header. Olvidarse = 401.
- `ErrorService.handleError` ya esconde el loader — no llamar `loaderService.hide()` además.
- Caches con `shareReplay(1)` → tras POST/PUT, invalida con `invalidateCache()`.

### Ruteo & nav

- Cada ruta protegida **debe** declarar `data.titulo` y `data.featureKey` (o `data.roles` como fallback temporal hasta registrar en BD).
- Para que aparezca en sidebar: agregar en `core/navigation/navigation.service.ts:config` con `featureKey` coincidente.

### DTOs

- Sufijo difiere: `core/dtos/*` usa `DTO` (mayúsculas), SSOMA usa `Dto`. **No uniformizar**.
- Páginas standalone **NO** se declaran en `declarations` del NgModule.

### Habilitación — servicios y worker-create-edit

- **`buildHabHeaders()` ≠ `buildAuthHeaders()`** — son funciones en módulos distintos (`habilitacion/services/http-base.ts` vs `ssoma/.../http-base.ts`). Todos los servicios de Habilitación usan `buildHabHeaders()`. Usar `buildAuthHeaders()` genera 401 silencioso.
- **`onDniBlur()` encadena 4 pasos sincrono→async**: (1) validación formato DNI/CE, (2) RENIEC (solo DNI, best-effort), (3) verificar restringidos, (4) verificar existencia en BD. El flag `verificandoDni` se mantiene `true` durante los 4 pasos — cada paso llama al siguiente en su callback `next`/`error`. Solo el paso 4 pone `verificandoDni = false`.
- **Lógica Casa vs Contratista en `verificarExistenciaEnBd()`**: rol Abril siempre bloquea (activo o retirado). Contratista bloquea si activo o si retirado en su misma empresa; permite si retirado en otra empresa. Usa `authService.getEmpresaId()` (lee `localStorage.user.empresaId`).
- **`TipoDocumento` no se guarda en BD** — campo de transporte en `WorkerUpsertDto`. El frontend lo infiere del formato del DNI existente al abrir el modal en modo edit (`/^\d{8}$/.test(dni)` → DNI, else → CE).

### Backend pitfalls (ASP.NET / PostgreSQL)

- **`AuditoriaInterceptor` debe ser Singleton** (no Scoped) — usar `services.AddSingleton<AuditoriaInterceptor>()`.
- **Columnas jsonb** en `AuditoriaCambio` requieren `.HasColumnType("jsonb")` en `OnModelCreating`.
- **Snapshot EF desfasado**: antes de aplicar migraciones, leer `Up()` operación por operación.
- **`@microsoft.graph.downloadUrl` y `Content-Disposition`**: el endpoint `/habilitacion/archivos/url` devuelve URLs con `Content-Disposition: attachment` — usar fetch-as-blob (ver §12 "Visor de documentos PDF").
- **`esAbril` en BD**: el campo viene `false` para todos los registros actuales (criterio `ContributorName.Contains("ABRIL")` no matchea). **No filtrar por `esAbril`** — mostrar todas las empresas.
- **Nombres de trabajadores vienen de `person.full_name`**: la tabla `workers` tiene FK `person_id → person`. El nombre que muestra la lista de trabajadores (`apellidoNombre`, `nombre`) se resuelve desde `person.full_name`. Si un worker se importa sin crear su registro en `person` y linkearlo vía `person_id`, aparece sin nombre en la UI. **Toda migración masiva de workers DEBE crear el registro en `person` primero y asignar `workers.person_id` correctamente.**

---

## 10. Checklist al agregar una feature SSOMA nueva

1. **DTO**: archivo en `features/ssoma/salud-ocupacional/dtos/<nombre>.model.ts`.
2. **Service**: archivo en `services/<nombre>.service.ts` usando `SALUD_OCUPACIONAL_BASE` + `buildAuthHeaders()` + `buildParams()`.
3. **Page standalone**: carpeta `<nombre>/` con `<nombre>.{ts,html,css}`. Imports: `CommonModule`, `FormsModule`, `Paginator`, `SearchSelect`, etc.
4. **Modales**: subcarpeta `<nombre>/components/<nombre>-create/` (o `-form/`) con `BaseModal`. Inputs `open/mode/initial`, outputs `closed/saved`.
5. **CSS**: copiar el set base de §5.
6. **Ruta**: agregar en `salud-ocupacional.routes.ts` con `data.titulo: 'SALUD OCUPACIONAL - <NOMBRE>'`.
7. **Nav**: agregar `{ label, route }` en `core/navigation/navigation.service.ts` dentro del grupo correspondiente.
8. **Build**: `npx ng build --configuration development` para verificar antes de commit.

## 10.b Checklist al agregar un módulo top-level nuevo

1. **Carpeta**: `features/<nombre>/` con `<nombre>.routes.ts` (export `<NOMBRE>_ROUTES: Routes`).
2. **Pages standalone**: `pages/<page>/<page>.{ts,html,css}`.
3. **app.routes.ts**: agregar lazy `loadChildren` dentro del `Layout` autenticado.
4. **Sidebar**: `NavModule` nuevo en `navigation.service.ts:config`.
5. **Icono**: agregar `<svg *ngSwitchCase="'<iconKey>'">` en `nav-icon.html`.
6. **Auth**: `data: { titulo: 'TÍTULO', featureKey: 'modulo.pantalla' }` en cada ruta. Registrar el `featureKey` en BD para que `roleGuard` y el sidebar lo reconozcan.
7. **Build**: `npx ng build --configuration development`.

---

## 11. Archivos de referencia rápida

- Patrón page CRUD completo: `features/ssoma/salud-ocupacional/programaciones/programaciones.ts`
- Patrón modal create con dropdowns: `features/ssoma/salud-ocupacional/programaciones/components/programacion-create/programacion-create.ts`
- Patrón page con tabs: `features/ssoma/salud-ocupacional/catalogos/catalogos.ts`
- Patrón service SSOMA con cache + mutaciones: `features/ssoma/salud-ocupacional/services/catalogos-salud.service.ts`
- Patrón service core legacy: `core/services/project.service.ts`
- Patrón módulo top-level standalone: `features/configuracion/configuracion.routes.ts`
- Patrón page CRUD completo (create/edit/retire/list): `features/configuracion/pages/workers/workers.ts`
- Patrón modal crear/editar con lógica por rol + DNI/CE + catálogos en cascada: `features/habilitacion/pages/trabajadores/components/worker-create-edit/worker-create-edit.ts`
- Patrón layout lista + visor PDF (SCTR-style): `features/habilitacion/pages/sctr-vidaley/sctr-vidaley.ts`
- Patrón layout lista + visor PDF (Bandeja): `features/habilitacion/pages/bandeja/bandeja.ts`
- Sidebar config: `core/navigation/navigation.service.ts`
- Iconos sidebar: `shared/components/nav-icon/nav-icon.html`
- Error handling central: `core/services/error.service.ts`
- Base modal: `shared/components/base-modal/base-modal.ts`
- Paginator: `shared/components/paginator/paginator.ts`
- Search-select: `shared/components/search-select/search-select.ts`

---

## 12. Módulo Habilitación SSOMA

### Ubicación

`features/habilitacion/` — standalone routes.

- `iconKey: 'habilitacion'`.
- Roles: `ADMINISTRADOR SSOMA`, `ADMINISTRADOR DE UDP`, `CONTRATISTA`.

### Sub-rutas

```
/habilitacion                          → redirect 'dashboard-contratista'
/habilitacion/dashboard-contratista    → Dashboard CONTRATISTA (solo authGuard; redirect interno a /habilitacion/trabajadores si no es contratista)
/habilitacion/trabajadores             → Plataforma Trabajadores
/habilitacion/empresa                  → Plataforma Empresa
/habilitacion/equipos                  → Equipos y Máquinas
/habilitacion/bandeja                  → Bandeja de Aprobaciones
/habilitacion/sctr-vidaley             → SCTR y Vida Ley
/habilitacion/control-acceso           → Control de Acceso (ADMINISTRADOR SSOMA, ADMINISTRADOR DE UDP)
/habilitacion/inducciones              → Seguimiento de Inducciones (CONTRATISTA — aparece en sidebar Gestión)
/habilitacion/registros-modelo         → Registros Modelo
/habilitacion/evaluacion-supervisores  → Evaluación Supervisores
/habilitacion/auditoria                → Auditoría (solo ADMINISTRADOR SSOMA)
/habilitacion/reglas                   → Reglas de Entregables (solo ADMINISTRADOR SSOMA)
/habilitacion/admin-usuarios-contratista → AdminContratistaUsuarios (solo authGuard — gestión admin de usuarios contratista)
```

> **Entrada CONTRATISTA**: el sidebar "Gestión de Ingresos" llama `onModuleClick({ key: 'habilitacion' })` en `sidebar.ts`. Si `isContratista()` → navega a `/habilitacion` (que redirige a `dashboard-contratista`). Si admin → navega a `/` (home). El `dashboard-contratista` a su vez redirige internamente a `trabajadores` si el visitante no es contratista (doble protección).

> **Inducciones** — aparece en el sidebar del grupo Gestión **solo para CONTRATISTA** (`roles: ['CONTRATISTA']`). Es una vista de solo lectura (seguimiento de estado) para el contratista. Los admins gestionan inducciones desde Trabajadores (botón "Programar Inducción") y las aprueban desde Bandeja (tipo INDUCCION).

### Restricciones del rol CONTRATISTA

- CONTRATISTA solo ve en sidebar: Trabajadores, Empresa, Equipos, SCTR y Vida Ley, **Inducciones**, Registros Modelo. No ve: Bandeja, Evaluación Supervisores, Reglas, Auditoría. (Inducciones visible por `roles: ['CONTRATISTA']` directo, sin `featureKey`.)
- Filtro server-side por `empresaId`: el backend detecta rol CONTRATISTA en JWT y filtra automáticamente. El frontend nunca envía `empresaId` para CONTRATISTA.
- **Panel de entregables (`trabajadores.html`)** — restricciones de UI para contratistas:
  - Upload zone oculto para el ítem `itemId === 12` ("Induccion Obra"): `*ngIf="selectedEntregable?.itemId !== 12"`.
  - Botones APROBAR y RECHAZAR solo visibles cuando `!isContratista() && isAdmin()`.
  - Botón "✓ marcarInduccion" en la sección Proyectos asignados oculto para contratistas: `*ngIf="!p.induccionCompletada && !isContratista()"`.
- **Worker cards (`trabajadores.html`)** — acciones disponibles para contratistas:
  - Botón "Dar de baja": `*ngIf="(isAdmin() || isContratista()) && !soloRetirados && w.estadoWorker !== 'RETIRADO'"` — contratistas pueden dar de baja sus propios workers; backend filtra por `empresaId` del JWT.
  - Botón "Reingreso": `*ngIf="(isAdmin() || isContratista()) && w.estadoWorker === 'RETIRADO'"` — contratistas pueden reingresar sus propios workers retirados.
  - Checkboxes de selección masiva: `*ngIf="(isAdmin() || isContratista()) && !soloRetirados && w.estadoWorker !== 'RETIRADO'"`.
  - Barra "Dar de baja seleccionados": `*ngIf="(isAdmin() || isContratista()) && haySeleccionados && !soloRetirados"`.
  - Botón "Cambiar obra": sigue siendo `*ngIf="isAdmin()"` exclusivo — contratistas no cambian obra.

### Auth contratistas

- Login en `/auth/login` con selector empresa + password.
- JWT contratista trae `role='CONTRATISTA'` y `empresaId` (= `contributor_id`, **no** `ss_empresa_contratista.id`).
- Contratistas **NO** pueden aprobar documentos — solo dejan en estado `Enviado`.

### Base URL backend

```ts
HABILITACION_BASE = `${environment.apiUrl}api/v1/habilitacion`;
```

### Endpoints disponibles

| Método              | Endpoint                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------- |
| GET/POST/PUT        | `/empresas`                                                                               |
| GET                 | `/empresas/{id}/proyectos`                                                                |
| POST/DELETE         | `/empresas/{id}/proyectos/{proyectoId}`                                                   |
| GET                 | `/catalogos/items-trabajador`                                                             |
| GET                 | `/catalogos/items-empresa`                                                                |
| GET                 | `/catalogos/items-equipo`                                                                 |
| GET                 | `/catalogos/criterios`                                                                    |
| GET                 | `/catalogos/areas`                                                                        |
| GET                 | `/catalogos/subareas?area={area}`                                                         |
| GET                 | `/catalogos/categorias` (cached `shareReplay(1)`)                                         |
| GET                 | `/catalogos/ocupaciones` (cached `shareReplay(1)`)                                        |
| GET                 | `/restringidos?dni=&soloActivos=`                                                         |
| POST                | `/restringidos`                                                                           |
| DELETE              | `/restringidos/{id}`                                                                      |
| POST                | `/auth/login` (contratista)                                                               |
| GET                 | `/auth/empresas`                                                                          |
| GET                 | `/trabajadores` (paginado)                                                                |
| GET                 | `/trabajadores/{id}` (detalle)                                                            |
| PUT                 | `/trabajadores/{id}` (editar perfil)                                                      |
| GET                 | `/trabajadores/{id}/entregables`                                                          |
| PUT                 | `/trabajadores/entregables/{id}`                                                          |
| GET                 | `/trabajadores/entregables/{id}/versiones`                                                |
| PATCH               | `/trabajadores/{id}/cambiar-obra`                                                         |
| PATCH               | `/trabajadores/{id}/reingreso`                                                            |
| GET                 | `/trabajadores/{workerId}/proyectos`                                                      |
| POST                | `/trabajadores/{workerId}/proyectos`                                                      |
| DELETE              | `/trabajadores/{workerId}/proyectos/{proyectoId}`                                         |
| PATCH               | `/trabajadores/{workerId}/proyectos/{proyectoId}/induccion`                               |
| GET                 | `/bandeja` (paginado)                                                                     |
| PATCH               | `/bandeja/trabajador/{id}`                                                                |
| PATCH               | `/bandeja/empresa/{id}`                                                                   |
| PATCH               | `/bandeja/equipo/{id}`                                                                    |
| PATCH               | `/bandeja/induccion/{id}` (aprobar inducción — sin body de vigencia)                      |
| GET                 | `/empresas/{id}/entregables`                                                              |
| PUT                 | `/empresas/{id}/entregables/{itemId}`                                                     |
| GET/POST            | `/sctr-vidaley`                                                                           |
| GET                 | `/sctr-vidaley/{id}`                                                                      |
| PATCH               | `/sctr-vidaley/{id}/aprobar`                                                              |
| GET                 | `/sctr-vidaley/por-trabajador/{workerId}`                                                 |
| GET                 | `/sctr-vidaley/proximos-vencer`                                                           |
| GET                 | `/sctr-vidaley/trabajadores-por-empresa?proyectoId=X&tipo=Y&estadoSctr=Z&estadoVidaLey=W` |
| GET/POST/PUT        | `/equipos`                                                                                |
| GET                 | `/equipos/{id}/entregables`                                                               |
| PUT                 | `/equipos/entregables/{id}`                                                               |
| GET                 | `/equipos/entregables/{id}/versiones`                                                     |
| GET                 | `/control-acceso/consulta?proyectoId=&search=`                                            |
| GET                 | `/control-acceso/inducciones-hoy` (sin params)                                            |
| POST                | `/control-acceso/inducciones/{induccionId}/confirmar-ingreso`                             |
| GET                 | `/control-acceso/no-autorizados?proyectoId=`                                              |
| GET                 | `/control-acceso/tareo?proyectoId=&fecha=`                                                |
| POST                | `/control-acceso/tareo`                                                                   |
| GET                 | `/inducciones` (paginado)                                                                 |
| POST                | `/inducciones` (batch — body `InduccionBatchCreateDto`)                                   |
| PATCH               | `/inducciones/{id}/estado`                                                                |
| PATCH               | `/inducciones/{id}/aprobar`                                                               |
| POST                | `/inducciones/aprobar-batch` body `{ ids }`                                               |
| GET                 | `/inducciones/trabajadores-por-programar?proyectoId=X&empresaId=Y`                        |
| GET/POST/PUT/DELETE | `/reglas`                                                                                 |
| GET                 | `/auditoria`                                                                              |
| GET                 | `/archivos/ver?url={encodedUrl}`                                                          |
| GET                 | `/archivos/descargar?url={encodedUrl}`                                                    |

### Estados de entregables

`Falta` → `Enviado` → `Aprobado` / `Rechazado` / `No Aplica`

Colores: Falta=rojo, Enviado=amarillo/naranja, Aprobado=verde, Rechazado=rojo oscuro, No Aplica=gris.

### Estado habilitación worker

- `Habilitado` = chip verde
- `No Autorizado` = chip rojo

### Rutas públicas (FUERA del Layout autenticado)

```
/habilitacion/registro-empresa     → RegistroEmpresa
/auth/activar-contratista          → ActivarContratista (?token=…&tipo=activacion-contratista|reset-contratista)
/auth/recuperar-contratista        → RecuperarContratista
/registros-modelo                  → dual-mount (publicMode: true)
```

### Subida de archivos a SharePoint

`features/habilitacion/services/sharepoint-upload.service.ts` → POST `multipart/form-data` a `/api/v1/habilitacion/archivos/subir`.

**`UploadResultDto`**: `{ url: string; path: string }`. El campo `path` es la ruta relativa que se almacena en `panelArchivoUrl` (y luego en `archivoUrl` del entregable). El campo `url` es la URL firmada temporal para abrir/descargar.

> **⚠️ Siempre usar `res.path`, NUNCA `res.url`** al guardar el resultado del upload. `res.url` es la URL firmada que expira; `res.path` es la ruta relativa estable que luego se resuelve vía `getArchivoUrl(path)`. Componentes corregidos: `empresa.ts`, `sctr-subir.ts`, `registro-empresa.ts`. Los componentes `trabajadores.ts` y `equipos.ts` ya usaban `res.path` correctamente.

**Patrón fallback**: si el endpoint retorna error, guardar `panelArchivoUrl = 'pending-upload://' + file.name` y `uploadingFile: boolean` para continuar el flujo UI.

### Visor de documentos PDF — fetch como blob

`shared/components/document-viewer/document-viewer.ts`: URLs de Microsoft Graph vienen con `Content-Disposition: attachment`. Solución: `fetch(url) → .blob() → URL.createObjectURL(blob) → bypassSecurityTrustResourceUrl(blobUrl)`. Los blob URLs se renderizan inline (sin `Content-Disposition`). Revocar con `URL.revokeObjectURL` en `reset()`. **No cambiar a binding directo sin entender esto.**

### Patrón loadWorkers con callback (Trabajadores)

`pages/trabajadores/trabajadores.ts`: `loadWorkers(page, afterLoad?: () => void)`. El parámetro `afterLoad` se invoca dentro del `next` del subscribe, **después** de que `this.workers` está poblado. Permite re-seleccionar un worker tras reload:

```ts
loadWorkers(page: number = this.currentPage, afterLoad?: () => void): void {
  this.limpiarSeleccion();
  // ... build params ...
  this.trabajadorHabService.getTrabajadores(params).subscribe({
    next: (res) => {
      this.workers = res.data ?? [];
      // ...
      afterLoad?.();  // ← se llama aquí, workers ya disponibles
      this.cdr.detectChanges();
    },
  });
}
```

Uso en `onCambiarObraSaved()`:

```ts
onCambiarObraSaved(): void {
  this.modalCambiarObraOpen = false;
  const prevId = this.workerParaAccion?.workerId ?? this.selectedWorker?.workerId ?? null;
  this.workerParaAccion = null;
  this.loadWorkers(this.currentPage, () => {
    if (prevId) {
      const updated = this.workers.find((w) => w.workerId === prevId);
      if (updated) this.selectWorker(updated);
    }
  });
}
```

> `prevId` se captura **antes** de `workerParaAccion = null` y antes de `limpiarSeleccion()` (que limpia `selectedWorker`).

### Modal Cambiar Obra — inicialización y lógica contratistas

`pages/trabajadores/components/cambiar-obra/cambiar-obra.ts`:

- `staffOficina` se inicializa con el valor actual del worker (`worker?.obraOficina ?? 'Obra'`) en `ngOnChanges`, sobreescribiendo el default `'Obra'` de `empty()`.
- El dropdown "Razón social" usa `CatalogosSaludService.getEmpresas()` (NO `EmpresaContratistaService`).
- Opciones de `staffOficina`: `Obra | Staff | Oficina Central`.
- **Contratistas**: los campos "Razón social" y "Staff / Oficina" se ocultan con `*ngIf="worker?.contrataCasa === 'Casa'"`. El payload fuerza `empresaId = null` en `submit()` si `contrataCasa !== 'Casa'`.

### Bandeja de Aprobaciones — layout SCTR-style

`pages/bandeja/bandeja.ts/.html/.css` — lista izquierda + visor PDF derecho. Header (`app-header`) oculto al entrar via `ngOnInit` (añade `.hidden-bandeja`) y restaurado en `ngOnDestroy`. `data.titulo = ''` en la ruta.

#### Tabs horizontales

```
Todos | Trabajadores | Empresas | Inducciones | Equipos
```

Clases activas: `tab-active-all` / `tab-active-blue` / `tab-active-green` / `tab-active-orange` / `tab-active-gray`.

#### Chip colors por tipo

`TRABAJADOR`=chip-blue · `EMPRESA`=chip-green · `EQUIPO`=chip-gray · `INDUCCION`=chip-orange

#### Layout CSS

```css
:host {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.bandeja-layout {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  height: 100%;
  overflow: hidden;
}
.bandeja-columns {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 1rem;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  height: calc(100vh - 110px);
}
.col-items,
.col-detalle {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}
```

#### Filtros client-side (fila horizontal sobre `.bandeja-columns`, oculta en tab INDUCCION)

```ts
filtroTexto = ''; // búsqueda libre por entidadNombre
filtroEmpresa = ''; // búsqueda libre por empresaNombre
filtroProyecto = ''; // dropdown exacto por proyectoNombre
filtroEntregable = ''; // dropdown exacto por nombreEntregable
filtroResponsable = ''; // server-side: param del endpoint /bandeja (SSOMA | ADMINISTRACION)
```

Getters: `proyectosDisponibles`, `entregablesDisponibles` — únicos de `items`, A→Z. `filteredItems` aplica los 4 filtros client-side y ordena por `entidadNombre` (localeCompare 'es'). `loadItems` limpia `selectedIds` al recargar.

#### Aprobación masiva (tabs Todos/Trabajadores/Empresas/Equipos)

```ts
selectedIds = new Set<number>();
get allItemsSelected(): boolean   // todos los filteredItems seleccionados
get someItemsSelected(): boolean  // alguno seleccionado (para indeterminate)
toggleSelect(id)                  // toggle individual
toggleAllItems()                  // toggle todos los filteredItems
aprobarMasivo()                   // Swal confirm → bulkAprobar por tipo
```

- **Tab con tipo fijo**: una sola llamada `bandejaService.bulkAprobar(ids, filtroTipo)`.
- **Tab "Todos"**: agrupa `selectedIds` por `item.tipo` y hace `forkJoin` de una llamada por tipo.
- Endpoint: PATCH `/bandeja/bulk-aprobar` body `{ ids, tipo }`.
- Header de lista: checkbox "Seleccionar todos" (`[indeterminate]`) + botón "✓ Aprobar (N)" visible cuando `selectedIds.size > 0`.
- Cada `.bandeja-card` es flex-row: `<input.card-checkbox>` + `<div.bc-content>`. Click en checkbox no propaga a `selectItem`.

#### Panel detalle-meta (col derecha, entre detalle-header y doc-body)

Campos visibles cuando hay `selectedItem`:

- **VIGENCIA**: `<input type="date" [(ngModel)]="vigenciaEditable">` — siempre visible. Valor pre-calculado en `selectItem()` y `seleccionarMesBandeja()`.
- **Chips de mes** (`*ngIf="selectedItem.esMensual && selectedItem.meses?.length > 0"`): un chip por mes (`mes.mes/mes.anio`). El chip seleccionado toma el color del estado del mes (verde=Aprobado, naranja=Enviado, rojo=Rechazado). Los no-seleccionados siempre gris. Click → `seleccionarMesBandeja(m)`.
- **Archivos múltiples del mes** (`*ngIf="mesSeleccionadoBandeja?.archivos?.length > 1"`): chips "📄 N" para items mensuales.
- **Archivos múltiples sin mes** (`*ngIf="!esMensual && selectedItem.archivos?.length > 1"`): chips "📄 N" para items no-mensuales.

#### Lógica vigenciaEditable (pre-calculada al seleccionar)

```ts
// En selectItem():
if (item.esMensual && item.meses?.length > 0) {
  mesSeleccionadoBandeja = item.meses[0];
  vigenciaEditable = item.meses[0].vigencia ? new Date(...).toISOString().substring(0,10) : '';
  // luego carga archivo del mes[0]
} else {
  mesSeleccionadoBandeja = null;
  sentinel → '2040-12-31'; else → item.vigencia ?? ''
}

// En seleccionarMesBandeja(mes):
sentinel → '2040-12-31'
else → día 27 del mes siguiente (mesSig/anioSig)
si mes.vigencia existe → lo usa directamente
```

#### Aprobación/rechazo con mes seleccionado

```ts
aprobar(item): void {
  const id = (item.esMensual && mesSeleccionadoBandeja) ? mesSeleccionadoBandeja.id : item.id;
  executeAction({ ...item, id }, { estado: 'Aprobado', vigencia: vigenciaEditable || undefined }, 'Aprobado');
}
```

El `executeAction()` redirige a `aprobarEmpresa(mesId, payload)` — el backend espera el ID del mes, no del item padre.

#### BandejaItemDto — campos clave

```ts
interface BandejaItemDto {
  id: number; tipo: string; nombreEntregable: string;
  entidadNombre: string; empresaNombre?: string; proyectoNombre?: string;
  estado: string; vigencia?: string; archivoUrl?: string;
  archivos?: { nombreArchivo: string; archivoUrl: string }[];
  itemId?: number; esMensual?: boolean; mes?: number; anio?: number;
  mesesPendientes?: number;
  meses?: {
    id: number; mes: number; anio: number; estado: string; vigencia?: string;
    archivos?: { id: number; nombreArchivo: string; archivoUrl: string; esZip: boolean; orden: number }[];
  }[];
}
```

#### Flujo aprobación unitaria

- **TRABAJADOR/EQUIPO**: `executeAction(item, { estado, vigencia })` → `aprobarTrabajador/Equipo(item.id, payload)`.
- **EMPRESA no-mensual**: `executeAction(item, { estado, vigencia })` → `aprobarEmpresa(item.id, payload)`.
- **EMPRESA mensual**: `executeAction({ ...item, id: mesSeleccionadoBandeja.id }, { estado, vigencia })` → `aprobarEmpresa(mesId, payload)`.
- **INDUCCION**: aprobación masiva via `aprobarGrupo()` — sin vigencia.

#### Nomenclatura — colisión resuelta

`allSelected(grupo)` de inducciones renombrado a `allInduccionSelected(grupo)` para evitar conflicto con el getter `allItemsSelected` de selección masiva.

#### Patrón blob URL para PDF (sin cambios)

`sharepointService.getArchivoUrl(archivoUrl)` → `fetch` → `.blob()` → `URL.createObjectURL` → `bypassSecurityTrustResourceUrl`. Revocado en `revokeDocBlobUrl()`.

#### SCTR/Vida Ley — orden alfabético

`sctr-subir.ts:loadWorkers()` ordena `trabajadores` por `apellidoNombre` (localeCompare 'es') al recibirlos del backend.

### Modal "Programar Inducción" — proyectos filtrados por empresa

`pages/trabajadores/components/programar-induccion/` — 2 pasos.

> **Fuente de proyectos**: el modal recibe `[proyectos]` del padre (`trabajadores.ts`). El padre lo carga en `loadCatalogos()`: si CONTRATISTA → `EmpresaContratistaService.getProyectos(empresaId)` mapeado a `ProjectGetDTO`; si admin → `ProjectService.getProjectsPaged(200)`.

Hay una segunda instancia en `inducciones/components/programar-induccion/` (carga proyectos propia en `loadProyectos()`): misma lógica de branch por rol.

**Paso 1**: Proyecto (obligatorio), Fecha programada (obligatorio), Trabajo en altura (checkbox), Equipo eléctrico (checkbox).

**Paso 2**: Lista de trabajadores con:

- Pills Todos/Obra/Staff-Oficina Central (solo si `empresaEsAbril` — actualmente siempre oculto por bug `esAbril=false` en BD).
- Buscador por nombre/DNI.
- Selección individual + "Seleccionar todos".
- Badge amarillo `"Ya indujo · puede homologar"` si `worker.yaIndujo === true` — worker sigue siendo seleccionable.
- Contador de seleccionados.

Submit → `InduccionService.crearBatch(InduccionBatchCreateDto)` → POST `/inducciones`.

`InduccionTrabajadorDto`:

```ts
{ workerId, apellidoNombre, dni, obraOficina?, empresaId?, empresaNombre?, yaIndujo? }
```

### Modal WorkerCreateEdit — Crear/Editar Worker

`pages/trabajadores/components/worker-create-edit/` — migrado desde `configuracion/pages/workers/`.

**Inputs/Outputs**: `[open]`, `[mode: 'create'|'edit']`, `[worker: WorkerHabilitacionListDto|null]`, `(closed)`, `(saved)`, `(buscarWorker: EventEmitter<string>)`.

**Flujo crear**: selección TipoDocumento (DNI/CE) → `onDniBlur()` (4 pasos) → formulario → `WorkerService.createWorker(WorkerUpsertDto)` (endpoint SSOMA).

**Flujo editar**: prefill desde `WorkerHabilitacionListDto` (lista) + `getWorker(workerId)` para `celular/sctr/area/subarea/jefatura` → `WorkerService.updateWorker(id, WorkerUpsertDto)`.

**Diferencias Casa vs Contratista**:

- Contratista: oculta campos org (Contrata/Casa, Obra/Oficina, Empresa, Proyecto, Área, Subárea, Jefatura, SCTR). Payload fuerza `contrataCasa: 'Contratista'`.
- Rol Abril: muestra todos los campos + catálogos de empresa/proyecto/área/subárea.

**Catálogos cargados en `resetAndLoad()` (todos los roles)**: `getCategorias()`, `getOcupaciones()` — ambos cacheados con `shareReplay(1)`.

**Catálogos solo rol Abril**: `getEmpresas()`, `getProjectsPaged()`, `getAreas()`. Subáreas: lazy al seleccionar área (`getSubareas(area)`, sin cache).

**SCTR**: solo editable cuando `obraOficina === 'Oficina Central'`. Para otros valores, `sctr` forzado a `true` y checkbox deshabilitado.

**`(buscarWorker)`**: se emite cuando el usuario confirma "Ir a buscarlo" en el Swal de existencia. El padre (`trabajadores.ts`) cierra el modal, pone el DNI en `search`, y llama `loadWorkers(1)`.

### Multiproyecto (workers Casa y Contratistas)

Workers Casa y Contratistas pueden estar asignados a múltiples proyectos. Gestionado vía 4 endpoints bajo `/trabajadores/{workerId}/proyectos`. UI dentro de `pages/trabajadores/` (sin nueva ruta).

DTOs: `WorkerProyectoDto { id, workerId, proyectoId, proyectoNombre?, induccionCompletada, activo, fechaInicio, fechaFin? }`, `AgregarProyectoDto { proyectoId, empresaId?, fechaInicio? }`.

**Botón "+ Agregar proyecto"**: visible para todos los workers (Casa y Contratistas). El modal `agregar-proyecto` diferencia la fuente de proyectos:

- **Casa**: `ProjectService.getProjectsPaged({ page: 1, pageSize: 200 })` — todos los proyectos.
- **Contratista**: `EmpresaContratistaService.getProyectos(empresaId)` → `GET /habilitacion/empresas/{id}/proyectos` — solo los proyectos asignados a esa empresa. El resultado (`EmpresaProyectoDto { proyectoId, proyectoNombre }`) se mapea a `{ projectId, projectDescription }` para compatibilidad con el `SearchSelect`.

`agregar-proyecto` recibe 4 inputs: `workerId`, `workerNombre`, `contrataCasa`, `empresaId`. La rama se decide en `loadCatalogos()` según `contrataCasa !== 'Casa' && empresaId !== null`.

> ⚠️ **Gate del modal agregar-proyecto**: usar flag aparte (`mostrarAgregarProyecto`) en el padre. `[workerId]="mostrarAgregarProyecto ? selectedWorker?.workerId ?? null : null"`. NO bindear directamente a `selectedWorker?.workerId` — abriría el modal cada vez que se selecciona un worker.

### Diseño Trabajadores (layout 3 columnas)

- **Columna izquierda** (270px): filter-bar compacta (2 filas) + lista de worker-cards + paginator.
- **Columna central** (flex): header del worker + tabla de entregables (ojo=viewer inline, clip=nueva pestaña) + sección proyectos asignados.
- **Columna derecha** (360px): filtros (radio pills + select estado) o drawer de documento (upload + vigencia + acciones).

**Fix de layout columna central** (`trabajadores.css`): `min-height: 0` añadido a `.col-workers, .col-entregables` (grid items) y a `.table-scroll` (flex child). Sin esto el `overflow-y: auto` del scroll de entregables no respeta los límites del grid y el scrollbar desborda la pantalla.

**Sección proyectos asignados**: movida fuera de `.table-scroll` — ahora es un hermano `flex-shrink: 0; max-height: 220px; overflow-y: auto; border-top` dentro de `.col-entregables`. La tabla de entregables y la sección de proyectos scrollean independientemente.

Filter-bar fila 1: búsqueda + pills Todos/Contratistas/Casa + toggle retirados + Actualizar + **"Programar Inducción"** (admin, `.btn-induccion`).

### Página Equipos — patrón drawer (igual a Trabajadores)

`pages/equipos/equipos.ts` — mismo patrón que trabajadores pero para equipos y maquinaria.

**Layout**: lista de equipo-cards (izquierda) + tabla de entregables (derecha) + drawer lateral (panel de documento).

**Flujo del drawer**:

1. `selectEquipo(eq)` → llama `loadEntregablesEquipo(eq.id)`.
2. `selectEntregable(e)` → puebla `panelVigencia`, `panelArchivoUrl`, `panelArchivoNombre`, `panelObsAbril`, `panelEstado`; abre drawer.
3. Upload → staging local: `archivosPendientes: ArchivoStagingDto[]`. Botón **ENVIAR** llama `enviarDocumento()` → sube archivos secuencialmente con `subirArchivoMultiple()` → llama `sharepointService.enviarDocumento()` al terminar todos. **Ya NO existe `autoMarcarEnviado()`.**
4. `actualizarEntregableLocal(updates)`: `findIndex` en `entregables[]` → spread merge → actualiza `selectedEntregable` — **sin reload** de la lista completa.
5. Campo observaciones unificado: `panelObsAbril` sirve para ambos roles. Payload envía como `obsContratista` (si es contratista) o `obsAbril` (si es admin).
6. Rama contratista en `guardarEntregable()`: payload solo con `{ archivoUrl?, vigencia?, obsContratista? }` — sin `estado` ni campos admin.
7. Botón GUARDAR (admin): habilitado si no se requiere vigencia, o si `panelVigencia` está completo.

**Staging multi-archivo** (los 3 componentes):
- `panelArchivoUrl` y `panelArchivoNombre` eliminados como propiedades → reemplazados por `archivosPendientes: ArchivoStagingDto[]`.
- Getters: `get uploadingFile()` = `archivosPendientes.some(a => a.subiendo)`, `get panelArchivoUrl()` = primer archivo con path.
- `onFileSelected()`: acepta múltiples archivos, los agrega al staging sin subir inmediatamente.
- `quitarArchivo(idx)`: elimina un archivo del staging.
- `enviarDocumento()`: sube secuencialmente + llama `/archivos/enviar` al final.

**Vigencia contratista** (los 3 componentes):
- `requiereVigencia=true` → input date editable.
- `requiereVigencia=false` → span readonly con fecha formateada.
- Items permanentes en empresa (itemId 12/13): muestra texto "Permanente", no input.

**Historial de versiones**: `versionesLoader = (id) => equipoService.getVersiones(id)` pasado a `<app-hab-versiones-doc [loader]="versionesLoader">`.

**`vigencia` sin requiereVigencia**: el payload envía `'2040-12-31'` como fecha dummy cuando `requiereVigencia === false` (en `guardarEntregable` admin).

### Página Control de Acceso — mobile-first operaciones en obra

`pages/control-acceso/control-acceso.ts/.html/.css` + subcomponente `components/tareo/`.
Servicio: `features/habilitacion/services/control-acceso.service.ts`.

**4 tabs**: Consulta | Inducción | No Autorizados | Tareo.

**Tab Consulta — búsqueda de trabajadores**:

- `GET /control-acceso/consulta?proyectoId=&search=` → `ConsultaResultDto[]`.
- Un resultado → tarjeta directa. Múltiples → lista compacta; tocar → tarjeta.
- Tarjeta: banner de estado (`.ca-status-habilitado` verde #64BC04 / `.ca-status-no-autorizado` rojo #ef4444).
- Condición de clase: `[class]="r.estadoHabilitacion === 'Habilitado' ? 'ca-status-habilitado' : 'ca-status-no-autorizado'"`. El backend devuelve el string `'Habilitado'` (no `'AUTORIZADO'`).
- Body con scroll: `max-height: calc(100vh - 220px); overflow-y: auto` en `.ca-result-body`.
- `oficinaId = 36`: cuando el proyecto seleccionado es Oficina Central (id 36), se oculta la sección de entregables.
- **Entregables**: lista de filas limpias (no chips). Solo se muestran los `Aprobado` no vencidos (`entregablesVigentes()`). Faltantes/rechazados y vencidos aparecen únicamente en las secciones "Documentos faltantes" / "Por vencer" de arriba. Ícono a la izquierda: ✓ verde `#22c55e` (vigente o sin vigencia), ⚠ amarillo `#eab308` (≤ 7 días). Contenedor `.ca-ent-card`: borde `1px solid #e5e7eb`, `border-radius: 12px`, `max-height: 320px; overflow-y: auto`, sombra sutil.
- EMO (Certificado de Aptitud Médica) se obtiene desde `worker_emos`, no desde `ss_hab_trabajador`.

**DTOs** (`control-acceso.service.ts`):

```ts
EntregableResumenDto { nombre, estado, vigencia: string | null }
ConsultaResultDto {
  workerId, apellidoNombre, nombre, empresa, dni,
  estadoHabilitacion: string,      // 'Habilitado' | 'No Autorizado' | otros
  documentosFaltantes: string[] | null,
  documentosPorVencer: { nombre, vigencia }[] | null,
  sctrEstado: string | null, sctrVigencia: string | null,
  entregables: EntregableResumenDto[] | null,
}
InduccionHoyDto {
  induccionId, apellidoNombre, dni, empresaNombre,
  fechaProgramada: string, trabajoAltura: boolean,
  equipoElectrico: boolean, estado: string, ingresoConfirmado: boolean,
}
```

**`entregableIcono(e)`** (reemplaza `getEntregableClass`):

- Solo se llama sobre entregables filtrados por `entregablesVigentes()` (Aprobado + no vencido).
- vigencia ≤ 7 días → `{ icono: '⚠', color: '#eab308' }`
- sin vigencia o > 7 días → `{ icono: '✓', color: '#22c55e' }`

**Tab Inducción**:

- No requiere proyecto seleccionado. `loadInducciones()` se llama en `ngOnInit` y al cambiar a ese tab.
- `GET /control-acceso/inducciones-hoy` sin parámetros.
- Botón "Confirmar" → `POST /control-acceso/inducciones/{induccionId}/confirmar-ingreso`. Al confirmar, muta localmente `ingresoConfirmado: true` (spread, no depende del body del response) y el botón cambia a "✓ Confirmado" deshabilitado. Contador `confirmadosCount` es getter que recuenta el array.
- Cambiar de proyecto no resetea `inducciones`.

**Diseño CSS** (§5-compatible):

- Header: fondo blanco, padding compacto, título + `app-search-select` en una sola fila.
- Tabs: patrón §5 (`.tabs button.active { border-bottom-color: #64bc04 }`).
- Sin card wrapper en buscador — input + botón directamente en `.ca-search-row`.
- Chips nuevos: `.chip-red` (#fee2e2/#dc2626), `.chip-yellow` (#fef9c3/#a16207).

**Tab No Autorizados**:

- Card por trabajador: `apellidoNombre` + `empresaNombre · DNI` + badge "No autorizado" (`#fee2e2/#dc2626`, `border-radius: 20px`).
- Filtro client-side por empresa con `<select class="ca-select">`. Getter `empresasNA` extrae empresas únicas. Getter `noAutorizadosFiltrados` filtra el array.
- DTO: `{ workerId, apellidoNombre, dni: string|null, empresaNombre, proyectoNombre, estadoHabilitacion }`.

**Subcomponente Tareo** (`components/tareo/tareo.ts` + `tareo.html` + `tareo.css`):

- `@Input() proyectoId!: number`. `OnChanges` → `loadTareo()`.
- **Carga en 3 pasos**: `forkJoin(getPartidas(), getEmpresasTareo(proyectoId))` en paralelo → construye arrays locales con `cantidad: 0` → luego `getTareo(proyectoId, fecha)` rellena cantidades existentes y guarda `tareoId`.
- **Endpoints**:
  - `GET /tareo/partidas` → catálogo `TareoPartidaDto { id, nombre }` (tabla `ss_tareo_partida`)
  - `GET /tareo/empresas?proyectoId=` → `TareoEmpresaDto { empresaId, empresaNombre }`
  - `GET /tareo?proyectoId=&fecha=` → tareo existente del día
  - `POST /tareo` si `tareoId` es null, `PUT /tareo/{id}` si ya existe
- **Layout**: `tareo-root` flex-column con `height: calc(100vh - 200px)`. Fecha en `.tareo-top` (flex-shrink: 0). Lista unificada en `.tareo-lista` (flex: 1; min-height: 0; overflow-y: auto — único scroll). Botón en `.tareo-footer` (flex-shrink: 0; border-top).
- **Lista unificada**: Casa + Contratistas en una sola lista. Headers de sección con `position: sticky; top: 0` (azul para Casa, verde para Contratistas). Total en fila final con fondo `#111827`.
- **DTOs**: `TareoDetalleCasaDto { partidaId, cantidadPersonas }`, `TareoDetalleContratistaDto { empresaId, cantidadPersonas }`, `TareoDto { id?, proyectoId, fecha, detallesCasa[], detallesContratista[] }`.
- `puedeGuardar` habilita el botón solo si al menos un valor > 0. Botón muestra "Guardar tareo" o "Actualizar tareo" según `tareoId`.
- **Pitfall CSS**: no usar `max-height + overflow-y` en contenedores internos dentro de `.tareo-lista` — genera scroll anidado que Chromium corta. Un solo scroll en `.tareo-lista`.

### Componente VersionesDoc (genérico)

`pages/trabajadores/components/versiones-doc/versiones-doc.ts` — usado tanto por Trabajadores como por Equipos.

```ts
@Input() open = false;
@Input() entregableId: number | undefined;
@Input() loader!: (id: number) => Observable<DocumentoVersionDto[]>;
@Output() closed = new EventEmitter<void>();
```

Importar como:

```ts
import { VersionesDoc } from '../trabajadores/components/versiones-doc/versiones-doc';
```

Selector: `app-hab-versiones-doc`.

### Notas importantes

- EMO es read-only — viene del módulo SSOMA, no se puede subir.
- SCTR/Vida Ley flujo masivo — un doc cubre múltiples workers.
- Auditoría solo para admins.

### Pendiente

- Frontend: pantalla gestión de trabajadores restringidos (listar, agregar, desactivar vía `/restringidos` endpoints — backend listo).
- Frontend: tour guiado / onboarding para contratistas en primer acceso tras activar cuenta.
- Seguridad: cerrar `[AllowAnonymous]` en `WorkersController` (SSOMA) antes de producción.
- PRs a `master` (backend debe deployarse antes que frontend).
- Deploy a producción + primer usuario admin.
- Verificar que `ingreso_confirmado` y `fecha_ingreso` ya están creados en BD (columnas manuales en `ss_induccion`).
- Bug potencial: `InduccionController.GetAsync()` — confirmar que empresaId se inyecta del JWT también en `GET /inducciones/trabajadores-por-programar` cuando CONTRATISTA.

---

## 13. Módulo Seguridad — Usuarios

### Ubicación

`features/security/` — NgModule (`SeguridadModule`). Ruta: `/security/users`. Rol: `ADMINISTRADOR DEL SISTEMA`.

### Flujo completo

1. `users.ts` es el shell: renderiza `<app-user-list>` y `<app-user-edit-form>`.
2. `list.ts` carga usuarios paginados, filtra client-side por `apellidoNombre`/`fullName`.
3. Toggle: confirmación Swal + PATCH `/api/v1/user/{id}/toggle`.
4. Al guardar en modal: cierra y fuerza reload.

### Endpoints

| Método | Endpoint                    |
| ------ | --------------------------- |
| GET    | `/api/v1/user/paged?page=N` |
| POST   | `/api/v1/user`              |
| PUT    | `/api/v1/user/{id}`         |
| PATCH  | `/api/v1/user/{id}/toggle`  |

### `UserService` — `buildAuthHeaders`

```ts
function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

Nunca envía `Bearer null`.

---

## Sesión 2026-05-06 — Módulo Clínica + Salud Ocupacional

### Nuevos archivos creados:

- features/clinica/ — módulo completo nuevo
  - clinica.routes.ts — rutas /agenda y /programaciones con rol CLINICA
  - pages/agenda/agenda.ts/html/css — agenda del día con flujo completo
  - pages/agenda/components/completar-emo/ — modal registrar resultado EMO
  - pages/programaciones/programaciones.ts/html/css — historial programaciones
  - pages/activar/activar.ts/html/css — activación cuenta clínica (ruta pública)
  - services/clinica-programacion.service.ts — getProgramacionesHoy, getProgramacionesFiltradas, accionClinica
  - dtos/clinica.model.ts — ProgramacionClinicaDto, ClinicaAccionDto, EstadoProgramacionClinica
- features/ssoma/salud-ocupacional/reportes/reportes.ts/html/css — exportar Excel SUNAFIL
- features/ssoma/salud-ocupacional/services/reporte.service.ts — exportarSunafilMensual()
- features/portal-trabajador/portal-trabajador.ts/html/css — portal público búsqueda por DNI
- core/services/programacion-alertas.service.ts — BehaviorSubject rechazados$, polling 5min

### Cambios en archivos existentes:

- app.routes.ts — ruta lazy /clinica + ruta pública /portal-trabajador + /clinica/activar
- core/navigation/navigation.service.ts — módulo Clínica agregado con roles:[] temporal. Item "Reportes" en grupo Salud Ocupacional. getModules() trata roles:[] como sin restricción
- core/services/auth.service.ts — loginClinica() + persistClinicaToken()
- features/auth/pages/login/ — tercer tab "Clínica" con FormGroup y submitClinica()
- shared/components/sidebar/ — badge rojo contador programaciones rechazadas hoy
- shared/estado.utils.ts — 9 estados nuevos en dict PROGRAMACION
- features/ssoma/salud-ocupacional/programaciones/:
  - KPIs panel 7 contadores arriba de la tabla
  - Filtro por clínica (clinicaId)
  - Badge AUTO en lista y calendario
  - Badge 📧 para fechaNotificacion
  - Acciones nuevas: accionClinica para rechazar desde admin
- features/ssoma/salud-ocupacional/dtos/programacion.model.ts — EstadoProgramacion extendido, ProgramacionListDto con origen/checkInHora/motivoRechazo/fechaNotificacion
- features/ssoma/salud-ocupacional/services/programacion.service.ts — método accionClinica()

### Rutas nuevas:

- /clinica/agenda — agenda del día (roles:[] temporal, cambiar a CLINICA en prod)
- /clinica/programaciones — historial (roles:[] temporal)
- /clinica/activar — activación cuenta (pública, fuera del shell)
- /ssoma/salud-ocupacional/reportes — reporte SUNAFIL
- /portal-trabajador — portal público (fuera del shell)

### Pendiente para prod:

- Cambiar roles:[] a roles:['CLINICA'] en navigation.service.ts módulo clínica
- Restaurar data.roles: ['CLINICA'] en clinica.routes.ts
- Probar login clínica con kgadea@serviperu.com.pe / Clinica2025!

---

## Sesión 2026-05-06 — Emails múltiples por clínica (SSOMA Catálogos)

### Contexto

El campo `email` único de `ss_clinica` se reemplaza por una tabla `ss_clinica_emails` con múltiples contactos. El frontend ya no usa `ClinicaSimpleDto.email` para crear/editar.

### Nuevos DTOs (`dtos/catalogos.model.ts`)

```ts
ClinicaEmailDto        { id, email, nombre }         // respuesta GET
ClinicaEmailCreateDto  { email, nombre }              // payload POST
```

### Nuevos métodos de servicio (`services/catalogos-salud.service.ts`)

| Método                                   | HTTP   | Endpoint                                    |
| ---------------------------------------- | ------ | ------------------------------------------- |
| `getClinicaEmails(clinicaId)`            | GET    | `/catalogos/clinicas/{id}/emails`           |
| `createClinicaEmail(clinicaId, dto)`     | POST   | `/catalogos/clinicas/{id}/emails`           |
| `deleteClinicaEmail(clinicaId, emailId)` | DELETE | `/catalogos/clinicas/{id}/emails/{emailId}` |

Ninguno usa cache. `deleteClinicaEmail` devuelve `Observable<void>`.

### `clinica-form` — modal crear/editar clínica

- Campo email único **eliminado** del formulario y del payload `ClinicaUpsertDto`.
- Estado local: `emails: EmailEntry[]` (interfaz local `{ email, nombre, id? }`) + `deletedEmailIds: number[]` (privado).
- `reset()`: en modo edit carga emails via `getClinicaEmails(initial.id)` (async, error silencioso).
- `agregarEmail()` — push `{ email: '', nombre: '' }`.
- `eliminarEmail(i)` — si el item tiene `id`, lo acumula en `deletedEmailIds`; luego splice.
- `submit()` — guarda la clínica, recibe `clinicaId` en la respuesta, llama `syncEmails(clinicaId)`.
- `syncEmails()` — `forkJoin` de POST (emails sin id con email no vacío) + DELETE (deletedEmailIds). Si ops vacías, llama `onSaveSuccess()` directo.
- UI: sección "Emails de contacto" con header flex (label + botón "+ Agregar email"), filas `email-row` (grid `1fr 1fr auto`: input email, input nombre, botón 🗑), mensaje vacío si no hay filas.

### `catalogo-clinicas` — lista de clínicas

- `emailsMap: Map<number, string>` — clave `clinicaId`, valor emails separados por coma.
- `load()`: tras `listClinicas()`, hace `forkJoin` de `getClinicaEmails(id)` por cada clínica. Cada inner observable lleva `.pipe(catchError(() => of([])))` para fallo silencioso individual. Construye el Map y luego llama `applyFilters(1)`.
- `applyFilters()`: búsqueda ahora consulta `emailsMap.get(c.id)` en lugar de `c.email`.
- `toggleActivo()`: `email: item.email ?? null` eliminado del payload.
- Template: `{{ emailsMap.get(item.id) || '—' }}` en columna Email.

### Pitfall N+1

`load()` dispara 1 + N requests (1 listClinicas + N getClinicaEmails). Aceptable para catálogos de clínicas (volumen bajo). Si el backend crece, considerar endpoint `/catalogos/clinicas/con-emails`.

---

## 14. Módulo Gestión Administrativa

### Ubicación

`features/gestion-administrativa/` — standalone routes. Montado en `/gestion-administrativa`.

### Sub-rutas

```
/gestion-administrativa                          → redirect 'solicitud-salidas'
/gestion-administrativa/solicitud-salidas        → SolicitudSalidas  (featureKey: gestion-administrativa.solicitud-salidas)
/gestion-administrativa/gestion-salidas          → GestionSalidas    (featureKey: gestion-administrativa.gestion-salidas)
/gestion-administrativa/configuracion/motivos    → GaMotivos         (featureKey: gestion-administrativa.config.motivos)
/gestion-administrativa/configuracion/lugares    → GaLugares         (featureKey: gestion-administrativa.config.lugares)
```

### API base

`api/v1/gestion-administrativa/`

### Servicios

- `SolicitudSalidasService` — `getMySolicitudes()`, `getFormData()` (catálogos para el form), `create(dto)`.
- `GestionSalidasService` — lista y gestión de solicitudes por administradores.
- `MotivoService` — CRUD motivos de salida.
- `LugarService` — CRUD lugares de origen/destino.

### Estructura interna

Cada sub-feature tiene su propia carpeta con `dtos/`, `services/`, `components/` o `pages/`. **Los DTOs NO van a `core/dtos/` — se mantienen dentro del feature.**

### Guards

Todas las rutas: `[authGuard, roleGuard]` + `featureKey`.

---

## 15. Módulo Mejora Continua

### Ubicación

`features/mejora-continua/` — standalone routes. Montado en `/mejora-continua`.

### Sub-rutas (actualizadas 2026-05-29)

```
/mejora-continua/lessons-learned                  → LeccionesAprendidas  (featureKey: mejora-continua.lessons-learned)
/mejora-continua/configuration/areas              → LessonAreas          (featureKey: mejora-continua.config.areas)
/mejora-continua/configuration/area-relations     → Areas                (featureKey: mejora-continua.config.area-relations)
/mejora-continua/configuration/templates          → Templates            (featureKey: mejora-continua.config.templates)
/mejora-continua/configuration/catalog-types      → CatalogTypes         (featureKey: mejora-continua.config.catalog-types)
/mejora-continua/configuration/catalog-items      → CatalogItems         (featureKey: mejora-continua.config.catalog-items)
/mejora-continua/configuration/reminders          → LessonReminders      (featureKey: mejora-continua.config.reminders)
```

> **Eliminado**: `/mejora-continua/configuration/relations` — la feature `relations/` fue borrada del proyecto (2026-05-29).

### Sub-features internas

**`features/lessons-learned/`**

- Subcomponentes: `card`, `create`, `detail`, `list`.
- DTOs: `lessonFilters`, `lessonList`, `lessonPeriod`, `phaseStageSubStageSubSpecialty`, `scope-item.model.ts` (nuevo 2026-05-29).
- Servicio: `LeccionesAprendidasService`.

**`features/configuration/lesson-areas/`** *(nuevo 2026-05-29)*

- Lista simple de áreas para configurar en Lecciones Aprendidas (toggle activo/inactivo por área).
- DTO: `LessonAreaConfigItemDto` (`lesson-area.dto.ts`).
- Servicio: `LessonAreaService`.

**`features/configuration/areas-subareas/`**

- Layout dos paneles: `area-list` (izquierdo) + `sub-area-list` (derecho). Edición inline con modales `area-edit`/`sub-area-edit`.
- Incluye `psss-scope-edit` — edita el alcance PSSS de cada subárea (refactorizado 2026-05-29 con nuevos servicios de scope/catalog).
- Servicios: `AreaService`, `SubareaService`, `PsssScopeService`.
- Servicios nuevos (2026-05-29): `scope.service.ts`, `catalog.service.ts` en `features/configuration/scope/`.

**~~`features/configuration/relations/`~~** — **ELIMINADO** (2026-05-29). No usar ni referenciar.

**`features/configuration/templates/`**

- CRUD de plantillas PSSS. DTO: `psss-template.model.ts`. Servicio: `PsssTemplateService`.
- `template-edit` refactorizado 2026-05-29 con nuevos campos de scope/catalog.

**`features/configuration/catalog-types/`** *(nuevo 2026-05-29)*

- CRUD de tipos de catálogo. Componente: `CatalogTypes`. Subcomponente: `catalog-type-form/`.
- DTO: (`catalog-types.ts` interno). Servicio: propio dentro de la carpeta.

**`features/configuration/catalog-items/`** *(nuevo 2026-05-29)*

- CRUD de ítems de catálogo asociados a un tipo. Componente: `CatalogItems`. Subcomponente: `catalog-item-form/`.
- Servicio: propio dentro de la carpeta.

**`features/configuration/lesson-reminders/`** *(nuevo 2026-05-29)*

- Recordatorios de lecciones aprendidas. Componente: `LessonReminders` con `SectionTabs` (tabs: **Usuarios** / **Staff de proyectos**).
- Tab Usuarios: lista paginada de recordatorios (`LessonReminderDTO`). Subcomponente: `lesson-reminder-create/`.
- Tab Staff: lista de staff por proyecto. Subcomponente: `project-staff-list/`.
- DTOs: `lessonReminder.model.ts`, `lessonReminderCreate.model.ts`, `lessonReminderCreateData.model.ts`, `projectStaffReminder.model.ts`.
- Servicio: `LessonReminderService`.

### Sidebar (navigation.service.ts)

Grupo "Configuración" en `mejora-continua`:

```
Áreas                  → /mejora-continua/configuration/areas          (lesson-areas)
Relaciones por área    → /mejora-continua/configuration/area-relations  (areas-subareas)
Plantillas             → /mejora-continua/configuration/templates
Tipos de Catálogo      → /mejora-continua/configuration/catalog-types
Ítems de Catálogo      → /mejora-continua/configuration/catalog-items
Recordatorios Lecciones→ /mejora-continua/configuration/reminders
```

### Guards

Todas las rutas usan solo `[roleGuard]` con `featureKey` (el shell padre aplica `authGuard` vía `canActivateChild`).

---

## 16. Sesión 2026-05-19 — flujo worker-create-edit contratistas

### worker-create-edit — cambios

**Archivo:** `features/habilitacion/pages/trabajadores/components/worker-create-edit/worker-create-edit.ts`

**`verificarExistenciaEnBd()`:**

- Llama `getTrabajadores({ search: dni, pageSize: 1, page: 1, soloVerificacion: true })`
- `soloVerificacion: true` bypasea el filtro de empresa en el backend → permite detectar si el DNI ya existe en cualquier empresa
- Lógica de bloqueo para contratistas:
  - `estaActivo` en cualquier empresa → bloquea siempre
  - `estaActivo` en misma empresa → además muestra "Ir a buscarlo" (`puedeIrABuscar = true`)
  - `estaActivo` en otra empresa → bloquea sin opción de ir a buscar
  - No activo pero en misma empresa → bloquea + muestra "Ir a buscarlo" (para reingreso)
- El botón "Ir a buscarlo" emite `(buscarWorker)` solo cuando `puedeIrABuscar`

**`canSubmit` getter:**

- Contratistas requieren: `proyectoId`, `categoria`, `ocupacion`, `condicionMedica`, `fechaIngreso`
- Staff/Oficina requieren: `emailCorporativo`
- Celular, emailPersonal, notas nunca obligatorios

**`submit()` payload:**

- `empresaId`: para contratistas usa `authService.getEmpresaId()` (ContributorId del JWT); para Casa usa `model.empresaId`
- `proyectoId`: `model.proyectoId ?? null`

**Archivo:** `features/habilitacion/pages/trabajadores/components/worker-create-edit/worker-create-edit.html`

- `condicionMedica` en bloque contratista: cambiado de `<input type="text">` a `<select>` con opciones Apto / Apto con restricciones, marcado como `*` (obligatorio)
- `condicionMedica` en sección "Estado y notas" (Casa): también convertido a `<select>`, sin `*` (opcional)
- Campos obligatorios contratista marcados con `*`: Proyecto, Categoría, Ocupación, Condición médica, Fecha de ingreso

### WorkerUpsertDto — campos nuevos

**Archivo:** `src/app/features/ssoma/salud-ocupacional/dtos/emo.model.ts`

Añadidos a `WorkerUpsertDto`:

```typescript
empresaId?: number | null;
proyectoId?: number | null;
```

### TrabajadorHabilitacionService — soloVerificacion

**Parámetro `soloVerificacion?: boolean`** añadido a `TrabajadoresQueryParams` (o equivalente) y pasado como query param al endpoint `GET /habilitacion/trabajadores?soloVerificacion=true`.
Permite búsqueda global sin filtro de empresa para verificar duplicados de DNI.

### trabajadores.ts — fix archivo_url guarda URL absoluta en BD

**Archivo:** `features/habilitacion/pages/trabajadores/trabajadores.ts` línea 445

Bug: `onFileSelected()` asignaba `this.panelArchivoUrl = res.url` (URL absoluta de SharePoint que expira) tras subir un archivo. Todos los `updateEntregable` posteriores enviaban esa URL al backend, que la guardaba en `ss_hab_trabajador.archivo_url`.

Fix: `this.panelArchivoUrl = res.path` — el path relativo permanente (`habilitacion/trabajadores/{id}/YYYYMMDD_archivo.pdf`).

`UploadResultDto` en `sharepoint-upload.service.ts` ya tenía `path: string` y `url: string` — no requirió cambios en el servicio.

**Síntoma detectado:** log `"GetDownloadUrlAsync: URL absoluta detectada"` en backend al intentar visualizar documentos subidos previamente — indica registros históricos con URL absoluta en BD que ya expiraron.

---

## 17. Sesión 2026-05-19 (segunda parte) — bugs y mejoras CONTRATISTA en Equipos y SCTR

### Equipos — botón Crear y Editar visibles para CONTRATISTA

**`equipos.html`**:

- Botón "Nuevo equipo" (línea 43): `*ngIf="isAdmin()"` → `*ngIf="isAdmin() || isContratista()"`
- Botón Editar en card (línea 80): misma condición — CONTRATISTA puede editar sus propios equipos
- Filtro "Todas las razones sociales": envuelto en `*ngIf="!isContratista()"` — no visible para CONTRATISTA

**`equipos.ts`**:

- `EmpresaContratistaService` inyectado
- `loadCatalogos()` bifurcado por rol: CONTRATISTA carga solo proyectos afiliados vía `getProyectos(empresaId)` con mapeo `{proyectoId, proyectoNombre} → {projectId, projectDescription}`; admin carga todos los proyectos y todas las empresas

### equipo-form — campos ocultos y auto-set para CONTRATISTA

**`equipo-form.ts`**:

- `isContratista()` añadido
- `loadCatalogos()` bifurcado: CONTRATISTA auto-setea `model.propietarioEmpresaId = empresaId` desde JWT, carga proyectos afiliados con mapeo, auto-selecciona si `proyectos.length === 1`
- `submit()`: campos `emailAdmin` y `emailSsoma` forzados a `undefined` para CONTRATISTA

**`equipo-form.html`**:

- "Empresa propietaria": `*ngIf="!isContratista()"` — oculto, se auto-setea desde JWT
- "Email Admin" y "Email SSOMA": `*ngIf="!isContratista()"` — no aplica a contratistas

### SCTR/Vida Ley — lista filtrada por empresa para CONTRATISTA

**`sctr-vidaley.ts`** `ngOnInit()`:

```typescript
if (this.isContratista()) {
  const id = this.authService.getEmpresaId();
  if (id) this.filtroEmpresaId = id;
}
```

Sin este bloque, CONTRATISTA veía todas las pólizas del sistema.

**Backend** `SctrVidaLeyController.GetPaged`: inyecta `empresaId` del JWT cuando `tipo == "CONTRATISTA"` (ver CONTEXT.md backend).

### SCTR/Vida Ley — filtros horizontales

**`sctr-vidaley.html`**: reemplazado `filters-card` con grid de 2 columnas por `filters-row` (flex horizontal).

**`sctr-vidaley.css`**:

```css
.filters-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}
.filter-ss-wrap {
  flex: 1.5;
  min-width: 130px;
}
.filter-sel {
  flex: 1;
  min-width: 90px;
  width: auto !important;
}
```

### sctr-subir — mejoras y fixes CONTRATISTA

**`sctr-subir.ts`**:

- `EmpresaContratistaService` inyectado
- `isContratista()` añadido
- `loadInitial()` bifurcado: CONTRATISTA auto-setea `model.empresaId` desde JWT y carga solo proyectos afiliados (con mapeo `{proyectoId, proyectoNombre} → {projectId, projectDescription}`); auto-selecciona si solo hay un proyecto

**`sctr-subir.html`**:

- Filtro Obra/Staff en paso 2: `*ngIf="!loadingWorkers && trabajadores.length > 0 && !isContratista()"` — oculto para CONTRATISTA
- Tooltip dinámico bajo selector Tipo de póliza:
  - Renovación: _"Para trabajadores que ya cuentan con SCTR/Vida Ley aprobado y se va a renovar la póliza vigente."_
  - Inclusión: _"Para trabajadores nuevos, reingresados o con SCTR/Vida Ley en estado Falta o Rechazado."_

**`sctr-subir.css`**:

- `wizard-paso2 min-height`: 420px → 600px
- `visor-frame` y `iframe` `min-height`: 320px → 500px
- `.field-hint` añadido (font-size 0.75rem, color #64748b)

### SCTR/Vida Ley — historial de versiones en Tab Trabajadores

**`sctr-vidaley.ts`**:

```typescript
import { VersionesDoc } from '../trabajadores/components/versiones-doc/versiones-doc';
// ...
modalVersionesOpen = false;
versionesLoader = (id: number) => this.trabajadorHabService.getVersiones(id);

verVersiones(): void { this.modalVersionesOpen = true; }
closeVersiones(): void { this.modalVersionesOpen = false; }
```

`VersionesDoc` añadido al array `imports[]`.

**`sctr-vidaley.html`**:

- Botón "Ver historial de versiones" en `.wdetalle-actions`, visible cuando `selectedWorker?.sctrHabId` existe
- Componente al final del template:

```html
<app-hab-versiones-doc
  [open]="modalVersionesOpen"
  [entregableId]="selectedWorker?.sctrHabId ?? null"
  [loader]="versionesLoader"
  (closed)="closeVersiones()"
/>
```

El `sctrHabId` es el `SsHabTrabajador.id` — el mismo que acepta el endpoint `GET /habilitacion/trabajadores/entregables/{id}/versiones`.

### Mapeo obligatorio para getProyectos() de EmpresaContratistaService

El backend devuelve `{ proyectoId, proyectoNombre }`. El frontend espera `ProjectGetDTO { projectId, projectDescription }`. Patrón aplicado en **3 lugares**:

```typescript
this.proyectos = data.map(
  (p: any) =>
    ({
      projectId: p.proyectoId,
      projectDescription: p.proyectoNombre,
    }) as ProjectGetDTO,
);
if (this.proyectos.length === 1) {
  this.model.proyectoId = this.proyectos[0].projectId;
}
```

Archivos: `equipo-form.ts`, `equipos.ts`, `sctr-subir.ts`.

---

## Sesión 2026-05-19 (tarde) — feature/arquitectura-comercial

### sctr-vidaley — filtroEmpresaId fijado desde JWT para CONTRATISTA

`ngOnInit`: si el rol del JWT es `CONTRATISTA`, se extrae `empresaId` del token y se asigna a `filtroEmpresaId`, bloqueando el filtro de empresa para que el contratista solo vea sus propias pólizas.

### sctr-vidaley — filtros en barra horizontal full-width

Los filtros del tab Pólizas se extrajeron de la columna `col-docs` (240 px) a una fila `<div class="filters-card card">` de ancho completo ubicada entre el tab-bar y el `sctr-columns`. CSS: `.filters-row { flex-wrap: nowrap }`, `.filter-year { flex: 0 0 84px }`, `.filter-ss-wrap { min-width: 160px }`. Elimina scroll lateral al filtrar.

### sctr-vidaley — historial de versiones por worker en tab Pólizas

Workers en el panel derecho del tab Pólizas son seleccionables: `[class.selected]="selectedPolizaWorker?.workerId === w.workerId"` + `(click)="selectPolizaWorker(w)"`. Al seleccionar un worker con `sctrHabId` definido, aparece botón "Ver historial" en `.sctr-split-actions`. Segunda instancia de `app-hab-versiones-doc` al final del template, ligada a `selectedPolizaWorker?.sctrHabId`.

**Campos nuevos en `sctr.model.ts`**: `sctrHabId?: number` en `SctrWorkerDto`.

**Campos nuevos en `sctr-vidaley.ts`**: `modalVersionesPolizaOpen`, `selectedPolizaWorker: SctrWorkerDto | null`, métodos `selectPolizaWorker()`, `verVersionesPoliza()`, `closeVersionesPoliza()`. `clearDocPanel()` limpia también `selectedPolizaWorker`.

### sctr-subir — proyectos solo afiliados para CONTRATISTA

`loadProyectos()`: si rol es `CONTRATISTA`, llama a `EmpresaContratistaService.getProyectos()` (proyectos afiliados) en lugar del listado general. Opción Obra/Staff ocultada. Tooltip diferenciado: "Renovación" vs "Inclusión".

### sctr-subir — loadWorkers bifurcado por tipo

`loadWorkers()`: cuando `tipo === 'VIDA_LEY'` envía el parámetro `estadoVidaLey` al backend; cuando `tipo === 'SCTR'` envía `estadoSctr`. Antes siempre enviaba `estadoSctr` → workers con `estadoSctr='Aprobado'` pero `estadoVidaLey='Falta'` no aparecían en la lista de paso 2 para Vida Ley.

### sctr-subir — modal 95vh×95vw, PDF maximizado, scroll interno

`base-modal` recibe `[height]="modalHeight"` cuando es paso 2: `'h-[95vh] max-h-[95vh]'`. Cuando `height` está definido, el backdrop usa `overflow-hidden flex items-center justify-center` y el contenido interno usa `flex flex-col flex-1 min-h-0 overflow-hidden` — sin scroll de página. `.wizard-paso2` pasó de `height: calc(100vh - 320px)` a `flex: 1; min-height: 0; overflow: hidden`.

`base-modal` — cambio aditivo: nuevo `@Input() height: string = ''`; sin `height`, comportamiento idéntico al anterior.

### equipo-form — empresa propietaria y proyectos afiliados para CONTRATISTA

`empresa_propietaria_id` auto-seteado desde el JWT en `ngOnInit` para CONTRATISTA (no editable). `loadProyectos()` llama a `EmpresaContratistaService.getProyectos()` para CONTRATISTA. Campos de emails del equipo ocultos para CONTRATISTA.

### equipos — botón Crear/Editar visible para CONTRATISTA

Los botones Crear y Editar equipo ahora son visibles para el rol CONTRATISTA. Filtros de proyectos y empresa usan solo proyectos/empresas afiliados para CONTRATISTA.

### inducciones — getBadge caso "PROGRAMADA"

`getBadge()`: añadido caso `'PROGRAMADA'` que retorna badge naranja. Antes el estado quedaba sin badge al no estar en el switch.

### login — tab Abril simplificado a solo botón Microsoft

`login.html`: reemplazado `<form *ngIf="activeTab === 'abril'"...>` (con campos Correo, Contraseña, botón INICIAR SESIÓN y separador "o") por `<div *ngIf="activeTab === 'abril'" class="flex justify-center">` que contiene únicamente el botón "Iniciar sesión con Microsoft". Los métodos `submit()`, `form`, `FormGroup` permanecen en `login.ts` (no se eliminaron, los usan otros flujos potenciales).

---

## Sesión 2026-05-20 — Arquitectura Comercial: panel proyectos, SPI, sticky acciones, días hábiles

### `actividades.model.ts` — cambios de DTO

- `ActividadListItemDTO`: campo `indice` renombrado a `orden`; añadido `spi?: number | null`.
- `GanttActividadDTO`: campo `indice` renombrado a `orden`.

### `features/arquitectura-comercial/actividades/` — panel izquierdo de proyectos

- Toggle "Sin actividades" (switch CSS puro con `peer`): OFF → muestra solo proyectos con actividades; ON → muestra solo proyectos sin actividades. Contador del header cambia según modo.
- Footer `+ Nuevo proyecto` sticky al pie del aside (siempre visible): `routerLink="/configuracion/proyectos"`.
- Altura del aside corregida: `:host` cambiado de `height:100%` a `flex:1; min-height:0; overflow:hidden` en `actividades.css` — evita el desborde de 70px que ocurría porque `height:100%` incluía el espacio del `<app-header>` en el `flex-col` padre del normalLayout. Estructura del aside usa inline styles garantizados (`height:100%`, `flex:1; overflow-y:auto; min-height:0`, `flex-shrink:0`).

### `actividades.html` — tabla

- **Columna SPI**: añadida entre Especialidad y Estado. Muestra valor numérico (`1.2-2`) con color inline: `>= 1` → `#16a34a` (verde), `>= 0.8 y < 1` → `#d97706` (naranja), `< 0.8` → `#dc2626` (rojo), `null/0` → "—" gris. `colspan` actualizado a 19.
- **Columna acciones sticky**: `<th>` y `<td>` de botones lápiz/basura son `position:sticky; right:0`. Clases `.th-actions-sticky` (bg `#1a4731`) y `.td-actions-sticky` (bg `#ffffff` / `#F9FAFB` par). Definidas en `actividades.css`.

### `components/editar-actividad/` — días hábiles

- Modal ampliado a `w-[800px]`.
- Nuevos campos locales en `EditarActividadForm`: `diasHabiliesProg` y `diasHabilesEfect` (no van al payload).
- Grid 3 columnas (`1fr 120px 1fr`) para fechas programadas y efectivas: **Inicio | Días hábiles | Fin**.
- `calcularFechaFin(inicio, dias)`: itera desde `inicio` sumando días saltando sábado (`getDay()===6`) y domingo (`===0`); el inicio cuenta como día 1.
- `contarDiasHabiles(inicio, fin)`: cuenta días hábiles inclusive para recálculo inverso al editar fin manualmente.
- Handlers: `onInicioProgChange`, `onDiasProgChange`, `onFinProgChange`, `onInicioEfectChange`, `onDiasEfectChange`, `onFinEfectChange`.
- `populateForm()` calcula los días al abrir si ambas fechas existen. `submit()` sin cambios — el fin calculado se incluye en el payload normalmente.

---

## Sesión 2026-05-20 — Rediseño Home Habilitación

### Home (inicio.ts / inicio.html / inicio.css)

- Bento grid por grupos al hacer clic en "Habilitación" en sidebar: sin submenús, clic directo a cada sección
- 3 grupos visuales: GESTIÓN (Trabajadores, Empresa, Equipos y Máquinas, SCTR y Vida Ley, Inducciones), OPERACIONES (Reglas de Entregables, Auditoría, Clínicas), ADMINISTRACIÓN (Bandeja de Aprobaciones, Registros Modelo, Evaluación Supervisores)
- Cards: fondo #fff, border-radius 14px, border 1px solid #ececec, hover translateY(-2px) + sombra suave
- Card Trabajadores: acento lila #f8f6ff / #5b4fcf
- Íconos por grupo: GESTIÓN indigo (#eef2ff/#4f46e5), OPERACIONES verde (#f0fdf4/#16a34a), ADMINISTRACIÓN ámbar (#fff7ed/#ea580c)
- Labels de grupo: 11px uppercase color #6b7280 font-weight 600

### sidebar.ts / sidebar.html

- onModuleClick(): clic en "habilitacion" navega a '/' y cierra dropdown; demás módulos conservan toggleMenu()
- Estado activo visual en sidebar cuando ruta es '/'

### navigation.service.ts

- "Control de Acceso" eliminado de grupos de Habilitación → nuevo módulo independiente key: 'control-acceso' apuntando a /habilitacion/control-acceso
- Labels visibles en home: "Habilitación" → "Gestión de Ingresos", "SSOMA" → "Salud" (solo en inicio.ts, rutas y sidebar sin cambio)
- navigation.service.ts: key 'ssoma' label → 'Salud', key 'habilitacion' label → 'Gestión de Ingresos' (keys y rutas sin cambio)
- Orden grupos bento: ADMINISTRACIÓN → OPERACIONES → GESTIÓN (getter `orderedGroups` en inicio.ts reordena sin tocar NavigationService ni sidebar)

---

## Sesión 2026-05-21 — Arquitectura Comercial: Responsable 2, roles AC, nombre personalizado

### `actividades.model.ts` — campos Responsable 2

- `ActividadListItemDTO`: añadidos `userId2: number | null` y `responsableNombre2: string | null`.
- `ActividadPatchBody`: añadido `userId2?: number | null`.
- `UpdateActividadBody`: añadido `userId2: number | null`.

### `actividades.html` y `actividades.ts` — dropdown Responsable 2

- Columna "Responsable 2" en la tabla usa `[ngModel]="a.userId2"` y `(ngModelChange)="onResponsable2Change(a, $event)"`.
- `onResponsable2Change(a, userId2)` añadido en `actividades.ts` → llama `patchField(a.id, 'userId2', userId2)` → PATCH `/actividades/{id}`.
- Columna "Responsable 1" conserva su comportamiento (texto `a.encargado1`, solo lectura).

### `components/editar-actividad/` — campo Responsable 2

- `EditarActividadForm` interface: añadido `userId2: number | null`.
- `empty()`: inicializa `userId2: null`.
- `populateForm()`: asigna `userId2: this.actividad.userId2`.
- `submit()`: incluye `userId2: this.model.userId2` en `UpdateActividadBody`.
- `editar-actividad.html`: campo "Responsable" dividido en dos selects en grid-2: **"Responsable 1"** (`model.userId`) y **"Responsable 2"** (`model.userId2`), ambos con la lista `supervisores`.

### `components/nuevo-entregable/` y `components/nuevo-hito/` — nombre personalizado

- Dos propiedades nuevas en cada componente: `nombrePersonalizado = false` y `nombreLibre = ''`.
- Se resetean a `false`/`''` en `ngOnChanges` al abrir el modal.
- `canSubmit`: si `nombrePersonalizado` → solo exige `nombreLibre.trim()` no vacío; si OFF → lógica original de campos requeridos.
- `submit()`: `nombre = nombrePersonalizado ? nombreLibre.trim() : nombreCalculado`.
- HTML: campo "Nombre generado" muestra `readonly` cuando `!nombrePersonalizado` y input libre cuando `nombrePersonalizado`. Checkbox "Nombre personalizado" debajo de ambos inputs con `[(ngModel)]="nombrePersonalizado"`.
- El campo `nombreCalculado` sigue calculándose en segundo plano aunque no se use cuando el checkbox está ON.

### Roles Arquitectura Comercial — diseño acordado (pendiente implementar)

Dos roles nuevos a registrar en BD y wiring en `roleGuard` + sidebar:

| Rol (string exacto) | Acceso                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GESTOR AC`         | Ve todos los proyectos y todas las actividades sin filtro de empresa/usuario. Puede editar cualquier actividad.                                                             |
| `USUARIO AC`        | Ve solo los proyectos/actividades donde `userId === su propio userId` o `userId2 === su propio userId`. Dropdowns Responsable 1 y 2 solo muestran su propio nombre o vacío. |

**Implementación pendiente (frontend)**:

- `ArquitecturaComercialService` deberá pasar el userId del JWT como query param cuando el rol sea `USUARIO AC` — el backend filtrará server-side.
- El sidebar y `roleGuard` usarán `featureKey: 'arquitectura-comercial.*'` para ambos roles.
- `getSupervisoresAc()` seguirá devolviendo la lista completa; el filtrado de qué puede editar se controla en el backend.

### Pendientes módulo Arquitectura Comercial

1. **Merge y deploy**: merge `feature/arquitectura-comercial` → `master` → deploy backend primero → deploy frontend. Verificar migraciones de BD (`userId2` en tabla `ac_actividades`).
2. **Cron / recálculo automático SPI**: el backend debe calcular `spi` periódicamente (o en cada PATCH de fechas). Acordar frecuencia con backend: sugerido cron diario + recálculo on-demand al actualizar `finEfectivo` o `finProgramado`.
3. **Curva S**: nueva vista en el módulo AC — gráfico de avance programado vs avance real acumulado por semana/mes. Datos: `inicioProgramado`/`finProgramado` para la curva base y `inicioEfectivo`/`finEfectivo` para la curva real. Implementar en `features/arquitectura-comercial/curva-s/` con Chart.js (línea doble + área fill).

---

## §17 — Dashboard Arquitectura Comercial v2 Enterprise (2026-05-21)

### Archivos clave

- `features/arquitectura-comercial/dashboard/dashboard.ts` — lógica completa (Charts, modales, filtros, helpers)
- `features/arquitectura-comercial/dashboard/dashboard.html` — template completo
- `features/arquitectura-comercial/dashboard/dashboard.css` — sistema de diseño flat
- `core/dtos/arquitectura-comercial/arquitectura-comercial-alert.model.ts` — DTOs nuevos de alertas
- `core/dtos/arquitectura-comercial/arquitectura-comercial-dashboard.model.ts` — extendido con 4 interfaces nuevas

### Paleta y diseño general

- Fondo raíz: `#F0F2F5`. Cards: `background:#fff; border:0.5px solid #E2E8F0; border-radius:10px`. Sin sombras (flat design).
- Colores semánticos: Culminadas `#1B6B3A`, En Proceso `#2E6DB4`, Vencidas `#C0392B`, Pendientes `#D97706`, base `#1E3A5F`.

### Modo full-screen (sin header global)

- `layout.ts` `isFullPage()` incluye `/arquitectura-comercial/dashboard` → renderiza solo `<router-outlet>` sin `<app-header>`.
- Ruta `dashboard` en routing module lleva `hideHeader: true` como refuerzo secundario.

### Flujo de datos — `cargar()`

```ts
forkJoin({
  dashboard: this.service.getDashboardV2(f),
  proyectos: this.service.getProyectos().pipe(catchError(() => of([]))),
  workers: this.service.getSupervisoresAc().pipe(catchError(() => of([]))),
});
```

`getProyectos()` y `getSupervisoresAc()` llevan `catchError(() => of([]))` — si fallan, el dashboard igual carga con arrays vacíos en los selectores. `filtro.anio` se inicializa al año actual en `generarFiltrosTiempo()`.

### Header

- 4 selects: arquitecto (`filtro.userId`), semana, mes, proyecto.
- Botón Buscar llama `buscar()` → solo recarga `getDashboardV2`.

### Category pills

- `.cat-pills` — fila de pills: "TODOS" (null) + `*ngFor categorias` desde `dashboard.categorias`.
- Pill activo: `background:#1E3A5F; color:#fff`. Punto de color: `cat-pill-dot` con `background:#fff !important` cuando activo.
- `seleccionarCategoria(id)` actualiza `categoriaActiva` + `filtro.categoriaId` y llama `buscar()`.

### KPI Grid y Alertas

- `repeat(7, 1fr)` / `repeat(4, 1fr)`.
- Alert cards llevan `.alert-clickable` (cursor:pointer, hover translateY-1px + box-shadow). Click → `abrirModalAlerta('VENCIDA'|'VENCE_SEMANA'|'ARRANQUE'|'HITO_PROXIMO')`.

### Main Grid — 3 columnas

**Col izquierda — Ranking Eficiencia**

- `*ngFor supervisores let i = index`: número de posición `.rank-pos`, avatar 34px con iniciales, doble barra `.dual-bar-track` (`.bar-real` 8px / `.bar-proyectada` 4px opacity:0.45).
- Badge `.rank-badge` con comentario inteligente vs `promedioEficiencia`.
- Footer `.equilibrio-tag`: verde/rojo según `equipoEquilibrado` (varianza ≤30pp).

**Col centro — 4 charts**

1. **Distribución donut** (`#distribucionCanvas` 100×100px en `.donut-canvas-wrap`) + leyenda vertical `.donut-legend-v`.
2. **Avance semanal** (`#avanceCanvas`, `.chart-wrap-md` height:120px) — bar chart barras dobles: Programado (azul claro) + Real (verde).
3. **Eficiencia SPI** (`#eficienciaCanvas`, `.chart-wrap-md`) — line chart últimas 3 semanas. SPI × 100 = %. Datalabels `anchor:'end'`.

**Col derecha — Hitos + Tareas**

- Hitos Críticos: vista top 6 `.hitos-preview` (sin scroll). Botón "Ver todos (N)" → `abrirModalHitos()`.
- Tareas por arquitecto (`#tareasCanvas`, `.chart-wrap-lg` height:160px) — bar stacked: Hitos (azul), Entregables (verde), Consultas (naranja). Top 8 por `primerApellido(nombre)`.

### Modal Alertas

- `abrirModalAlerta(tipo)` → `GET /alertas/{tipo}?...` → tabla `ActividadAlertaDTO[]` con checkboxes.
- `.modal-backdrop` (backdrop-filter:blur(2px)) + `.modal-box` (max-width:820px, max-height:88vh, animación `slideUp`).
- Toolbar: "Seleccionar todos" (`toggleTodos`) + contador `seleccionados.size`.
- Tabla sticky thead: nombre, proyecto, tipo (badge coloreado), responsable1/2, fechaFin, estado, SPI, días.
- Footer: botón "Enviar alerta (N)" → `enviarAlertasActividades({ actividadIds: [...seleccionados], tipoAlerta })` → POST `/alertas/enviar`.

### Modal Hitos

- `abrirModalHitos()` — muestra los 3 tabs con getters: `hitosIniciar` (diasRestantes 0-7), `hitosVencer` (8-30), `hitosVencidos` (<0).
- `.hito-tabs` con `.hito-tab.active` (border-bottom `#1E3A5F`). `.tab-badge` por tab.
- Botón "Alertar" por fila → `alertarHito(hito)` → POST `/alertas/enviar` con `[hito.id]`.
- `.btn-alert-urgent` en tab Vencidos (rojo).

### Métodos y getters en `dashboard.ts`

| Símbolo                                      | Descripción                                                           |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `categoriaActiva: number\|null`              | Pill activa. null = TODOS                                             |
| `filtro: DashboardFiltroDTO`                 | Filtro unificado (userId, proyectoId, semana, mes, anio, categoriaId) |
| `getFiltroActual()`                          | Spread de `filtro` + `categoriaId: categoriaActiva`                   |
| `aplicarDashboard(d)`                        | Llena todos los arrays y llama `renderCharts()` con `setTimeout(50)`  |
| `destruirCharts()`                           | Destruye los 4 charts antes de re-renderizar                          |
| `getInitials(nombre)`                        | 2 iniciales (primer y último token)                                   |
| `primerApellido(nombre)`                     | Primer token — etiqueta eje X del chart de tareas                     |
| `getAvatarBg/Color(p)`                       | Verde/azul/rojo por progreso                                          |
| `getComentario/Bg/Color(sup)`                | Badge vs promedio                                                     |
| `promedioEficiencia`                         | Media aritmética de `supervisores[].progreso`                         |
| `equipoEquilibrado`                          | max - min ≤ 30pp                                                      |
| `getProyectada(p)`                           | `min(100, p * 1.12)`                                                  |
| `getHitoColor(dias)`                         | Rojo (≤3 o <0) / naranja (≤7) / azul (resto)                          |
| `hitosUrgentesCnt/EstaSemanaCnt/ProximosCnt` | Contadores footer hitos                                               |
| `diasLabel(dias)`                            | "Vencido Xd" / "Hoy" / "Xd"                                           |
| `getSpiColor/Label(spi)`                     | Color e string del SPI                                                |
| `getSubtitulo()`                             | "Semana N · MesNombre YYYY"                                           |
| `todosMarcados` getter                       | Todos los items del modal alertas están en `seleccionados`            |
| `hitosIniciar/hitosVencer/hitosVencidos`     | Getters filtrando `hitosCriticos` por rango de días                   |

### CSS clave

- `.cat-pills` / `.cat-pill` / `.cat-pill.active` / `.cat-pill-dot`.
- `.alert-clickable` — cursor:pointer, hover translateY(-1px) + box-shadow.
- `.alert-top` — flex row space-between (número + ícono SVG).
- `.donut-canvas-wrap` — 100×100px, `canvas { width:100%!important; height:100%!important }`.
- `.donut-legend-v` — flex-col gap:6px.
- `.chart-wrap-md` (h:120px) / `.chart-wrap-lg` (h:160px) — `position:relative; canvas absolute inset:0`.
- `.right-col` — flex-col gap:10px.
- `.hitos-preview` — flex-col gap:6px, overflow:hidden (top 6, sin scroll).
- `.btn-ver-todos` — fondo `#EFF6FF`, color `#2E6DB4`.
- `.modal-backdrop` — fixed inset:0 rgba(15,23,42,0.55) backdrop-filter:blur(2px) `@keyframes fadeIn`.
- `.modal-box` — border-radius:12px, max-width:820px, max-height:88vh, `@keyframes slideUp`.
- `.modal-table thead` — `position:sticky; top:0; background:#F8FAFC`.
- `.row-selected` — background `#EFF6FF`.
- `.hito-tabs` / `.hito-tab.active` (border-bottom `#1E3A5F`) / `.tab-badge`.
- `.btn-alert-row` / `.btn-alert-urgent` / `.btn-enviar` / `.btn-cancelar`.

---

## §MIGRACIÓN MASIVA 2026-05-22

### Archivos Excel preparados

#### 1. Lista_contratistas_limpia.xlsx — 74 empresas → `contributor` + `contractor_email`

- `contributor_name` ← RazonSocial, `contributor_nombre_comercial` ← NombreComercial
- `contributor_ruc` ← RUC, `sp_password_temp` ← Password, `id_sharepoint` ← IDListaCont
- 4 emails por empresa → `contractor_email` (Gerente, Administrador, Residente, SSOMA)
- `es_abril = false`, `active = true` siempre

#### 2. entregables_empresa_estandarizados.xlsx — 8,300 filas → `ss_hab_empresa`

- Cols: NombreComercial, project_id_BD, item_id, estado, vigencia
- 352 combinaciones empresa+proyecto × 25 items c/u
- NombreComercial = llave de cruce con `contributor` post-import

#### 3. trabajadores_limpios.xlsx — 2,339 trabajadores (914 Casa + 1,425 Contratistas) → `person` + `workers` + `worker_vinculaciones` + `ss_hab_worker_proyecto`

- Cols: id_trabajador, dni, nombre_completo, email_personal, fecha_ingreso, fecha_nacimiento, categoria, ocupacion, area, subarea, obra_oficina, contrata_casa, condicion_medica, notas, puntos_infraccion, celular, sctr, project_id_BD, empresa_nombre, proyectos_habilitado
- `empresa_nombre`: Casa → `contributor_id` BD directo (int) | Contratista → NombreComercial (cruce post-import)
- `proyectos_habilitado`: lista de project_id_BD separados por coma → `ss_hab_worker_proyecto` (aplica a ambos tipos)
- 0 DNI duplicados, 0 IDProyecto no mapeado ✅
- ⚠️ **Orden obligatorio de inserción**: primero insertar en `person` (`full_name` ← nombre_completo), luego insertar en `workers` con `person_id` apuntando al registro creado. Si `workers.person_id` es NULL o no existe el `person`, la lista de trabajadores aparece sin nombres en la UI (el campo `apellidoNombre` viene de `person.full_name`).

#### 4. entregables_trabajadores_limpios.xlsx — 26,223 filas → `ss_hab_trabajador`

- Cols: id_trabajador, item_id, estado, vigencia
- `id_trabajador` = llave de cruce con workers post-import
- Lógica aplicada: `ss_item_trabajador.aplica_a` + `aplica_categoria` + `aplica_obra_oficina` + `excluye_obra_oficina` + `excluye_categoria_contratista`
- **NOTA**: `ss_item_trabajador_regla` NO se usa — lógica hardcodeada en `ss_item_trabajador`
- Casa: 15–17 items/trabajador | Contratistas: 8–9 items/trabajador

#### Pendiente procesar

- EMOs → `worker_emos`
- Equipos → `ss_equipo` + `ss_hab_equipo`
- SCTR trabajadores → `ss_sctr_vidaley_worker`

### Orden de borrado (dependencias FK)

**Hijos de workers** (borrar antes de reimportar workers):
`ss_hab_trabajador`, `worker_vinculaciones`, `ss_hab_worker_proyecto`, `ss_induccion`, `worker_emos`, `ss_programacion_emos`, `ss_sctr_vidaley_worker`, `ss_alertas_emo`, `ss_eval_supervisor`, `ss_hab_bloqueo_log`, `ss_interconsultas`, `ss_seguimientos_medicos`, `worker_eventos`, `ga_solicitud_salida`

> **⚠️ PRESERVAR**: `ss_trabajador_restringido` (178 registros — blacklist, NO borrar)

**Hijos de contributor (externos)** (borrar antes de reimportar contratistas):
`ss_hab_empresa`, `ss_empresa_proyecto`, `ss_equipo`, `ss_tareo_detalle_contratista`, `ss_sctr_vidaley`, `worker_emos(empresa_origen)`, `worker_emo_convalidaciones`, `ss_hab_documento_version`

**Tablas NO tocar**:
`ss_clinica_*`, catálogos SSOMA, Phase/Stage/Layer, AcPlantillas, `ac_categorias`, `ac_especialidades`, `ac_etapas`, `role`, `feature`, `role_feature`, `project`, `app_user`, `ss_trabajador_restringido`

### Flujo activación empresa — ✅ IMPLEMENTADO

**Ruta pública**: `/auth/activar-empresa` (registrada en `app.routes.ts`, fuera del shell autenticado)
**Componente**: `ActivarEmpresaComponent` — `features/auth/pages/activar-empresa/activar-empresa.component.ts`
**Login**: enlace "¿Primera vez? Activa tu cuenta aquí" agregado en `login.html`

**Paso 1 — Validar identidad**:

- Inputs: RUC (11 dígitos, validado con `/^\d{11}$/`) + `spPassword` (contraseña temporal)
- `POST /api/v1/habilitacion/auth/validar-migracion { ruc, spPassword }`
- Respuesta exitosa devuelve `{ nombreComercial }` → se muestra como badge de confirmación en paso 2
- Error → Swal `icon:'error'` con `err.error?.message ?? 'RUC o contraseña temporal incorrectos'`

**Paso 2 — Crear cuenta**:

- Inputs: email + nueva contraseña (con `PasswordStrengthComponent`) + confirmar contraseña
- Reglas: ≥8 chars, ≥1 mayúscula, ≥1 dígito
- `POST /api/v1/habilitacion/auth/activar-migracion { ruc, spPassword, email, password }`
- Éxito → Swal success → `router.navigate(['/auth/login'])`
- Usa `HttpClient` directo (sin `AuthService`) — no necesita token

**Notas de implementación**:

- `paso: 1 | 2` controla el `*ngIf` entre los dos formularios
- `ruc` y `spPassword` se conservan en memoria durante el paso 2 (se reenvían en el body de activar-migracion)
- No usa `LoaderService` ni `ErrorService` — manejo local con `saving: boolean` y Swal inline

### Multi-usuario por empresa (segunda fase — no implementar aún)

Tablas: `ss_contratista_usuario`, `ss_contratista_usuario_proyecto`, `ss_contratista_auditoria`
Roles: `OWNER` | `ADMIN` | `GESTOR` con scope `ALL` | `BY_PROJECT`

---

## §Sesión 2026-05-24 — Panel entregables CONTRATISTA (trabajadores + empresa) y fixes

### activar-empresa.component.ts — fix ChangeDetectorRef

`features/auth/pages/activar-empresa/activar-empresa.component.ts`

- `ChangeDetectorRef` inyectado en el constructor.
- `submitPaso1()` callback `next`: `this.cdr.detectChanges()` llamado después de `this.paso = 2; this.saving = false`.
- **Síntoma previo**: el backend devolvía 200 y el componente actualizaba `this.paso = 2` internamente, pero Angular no renderizaba el paso 2 — la pantalla quedaba bloqueada en el formulario de paso 1.

### induccion.service.ts — getTrabajadoresPorProgramar acepta search?

`features/habilitacion/services/induccion.service.ts`

```ts
getTrabajadoresPorProgramar(
  proyectoId: number,
  empresaId?: number | null,
  search?: string,
): Observable<InduccionTrabajadorDto[]>
```

`buildHabParams({ proyectoId, empresaId, search })` maneja los 3 params — `undefined` se omite automáticamente.

**Endpoint actualizado** en §12: `GET /inducciones/trabajadores-por-programar?proyectoId=X&empresaId=Y&search=Z`.

### programar-induccion (pages/trabajadores) — preselectedEmpresaId desde JWT

`features/habilitacion/pages/trabajadores/trabajadores.ts`

- Añadida propiedad `preselectedEmpresaId: number | null = null`.
- Reemplazado getter `programarInduccionEmpresaId` (que devolvía el `empresaId` del primer worker seleccionado — incorrecto) por método:

```ts
abrirProgramarInduccion(): void {
  this.preselectedEmpresaId = this.authService.isContratista()
    ? (this.authService.getEmpresaId() ?? null)
    : null;
  this.mostrarProgramarInduccion = true;
}
```

`trabajadores.html`: botón llama `abrirProgramarInduccion()` y binding actualizado a `[preselectedEmpresaId]="preselectedEmpresaId"`.

**Componente destino** (`trabajadores/components/programar-induccion/`) ya tenía `@Input() preselectedEmpresaId` y lo usaba en `loadWorkers()` — no requirió cambios.

> ⚠️ Hay **dos** componentes `ProgramarInduccion` con el mismo selector pero distintas rutas:
>
> - `inducciones/components/programar-induccion/` — carga proyectos propia, busca workers vía `getTrabajadoresPorProgramar`
> - `trabajadores/components/programar-induccion/` — recibe `[proyectos]` del padre, 2 pasos, usa `preselectedEmpresaId`
>
> No confundirlos al editar.

### Panel entregables CONTRATISTA en Trabajadores

`features/habilitacion/pages/trabajadores/trabajadores.html` — bloque `*ngIf="isContratista()"`:

- **Estado**: chip read-only (`btn-chip`) — sin dropdown editable.
- **Vigencia**: texto read-only (pipe `date`) — sin input editable.
- **Upload zone**: idéntica al bloque admin (zona activa, spinner, file-card con visualizar/descargar/reemplazar, fallback pending-upload).
- El contratista sube archivos → `autoMarcarEnviado()` cambia estado a `Enviado` automáticamente.

`features/habilitacion/pages/trabajadores/trabajadores.ts`:

- `guardarEntregable()` — bifurcado por rol:
  - **Contratista**: payload solo `{ archivoUrl?, obsContratista? }` — sin `estado` ni `vigencia`.
  - **Admin**: payload completo con `{ estado, vigencia, archivoUrl?, obsAbril? }`.
- `WorkerEntregableUpdateDto.estado` cambiado a `estado?: string` (opcional) para soportar payloads parciales.
- **Auto-save observaciones contratista**:
  - `guardarObservaciones()`: captura `id` y `obs` como locales antes del posible reset; llama `updateEntregable(id, { obsContratista })` sin `estado`; errores a través de `errorService.handleError`.
  - `closeDrawer()`: llama `guardarObservaciones()` ANTES de `selectedEntregable = null` — cubre overlay click, botón X, ESC y selección de nuevo trabajador.
  - HTML: `(blur)="guardarObservaciones()"` en textarea TUS OBSERVACIONES del bloque contratista.

### Panel entregables empresa — bug estado post-ENVIAR (2026-06-06)

`features/habilitacion/pages/empresa/empresa.ts` — investigación activa:

**Síntoma**: tras ENVIAR un entregable mensual, el chip de estado en la tabla no cambia a "Enviado" hasta refrescar la página manualmente.

**Cambios aplicados en esta sesión**:
- `NgZone` añadido al import y al constructor (`private ngZone: NgZone`).
- Optimistic update en `enviarDocumento()` next: `this.entregables[idx] = { ...this.entregables[idx], estado: 'Enviado' }` + `this.entregables = [...this.entregables]` envuelto en `this.ngZone.run(() => {...})`.
- `recargarEntregables()` diferida 500ms con `setTimeout(..., 500)` para evitar race condition donde el backend aún no ha committeado el nuevo estado al momento del GET.
- `console.log('entregables frescos:', ...)` en el `next` de `recargarEntregables()` (diagnóstico — quitar en producción).
- afterLoad callback también hace `this.entregables[idx] = { ...frescoEntregable }` + `this.entregables = [...this.entregables]` + `cdr.detectChanges()`.

**Hipótesis pendiente de confirmar**: `recargarEntregables()` obtiene datos stale del backend (el estado del entregable padre no se recalcula inmediatamente tras el POST a `/archivos/enviar`) y sobreescribe el optimistic update. Confirmar con el console.log: si muestra `estado: 'Falta'` (viejo), es race condition backend → incrementar timeout o no sobreescribir estado en afterLoad. Si muestra `estado: 'Enviado'` (correcto), el problema es Angular CD y debe revisarse si algún ancestro usa OnPush.

**Estado del Layout**: no usa `ChangeDetectionStrategy.OnPush` (Default). `App` tampoco. El componente `Empresa` tampoco.

### Panel entregables empresa — auto-save y reglas por itemId

`features/habilitacion/pages/empresa/empresa.ts`:

- `guardarObservaciones()`: captura `id` y `obs` locales; llama `updateEntregable(empresaId, id, { obsContratista })` sin `estado`; errores a `errorService.handleError`.
- `closeDrawer()`: llama `guardarObservaciones()` antes de `selectedEntregable = null`.
- `EmpresaEntregableUpdateDto.estado` cambiado a `estado?: string` (opcional).
- Getters de reglas por `itemId` (`ss_item_empresa.id`):

```ts
private readonly SCTR_VIDA_LEY_IDS = [15, 16];       // bloqueados — gestión externa
private readonly VIGENCIA_ANTE_UPLOAD_IDS = [11, 12, 20, 22]; // requieren vigencia antes de upload

get esSCTRoVidaLey(): boolean { … }          // itemId ∈ [15, 16]
get requiereVigenciaAnteUpload(): boolean { … } // itemId ∈ [11, 12, 20, 22]
get uploadBloqueadoPorVigencia(): boolean { … } // requiereVigenciaAnteUpload && !panelVigencia
```

`features/habilitacion/pages/empresa/empresa.html`:

- **IDs 15 y 16 (SCTR / Vida Ley)**: drawer muestra bloque `.info-readonly-block` con mensaje "Este entregable se gestiona en la pantalla SCTR / Vida Ley." — bloques CONTRATISTA y ADMIN ocultos con `&& !esSCTRoVidaLey`; botones de footer también ocultos.
- **IDs 11, 12, 20, 22 (vigencia obligatoria)**: upload zone reemplazada por zona `.upload-zone--disabled` con "Ingresa la fecha de vigencia primero." mientras `uploadBloqueadoPorVigencia`. Aplica a ambos roles.
- `(blur)="guardarObservaciones()"` en textarea TUS OBSERVACIONES del bloque contratista.

`features/habilitacion/pages/empresa/empresa.css`:

- `.upload-zone--disabled { opacity:0.55; cursor:not-allowed; background:#f8fafc }`.
- `.info-readonly-block { flex row; gap 0.6rem; padding 0.875rem 1rem; background #f1f5f9; border #e2e8f0; border-radius 8px; font-size 0.825rem; color #475569 }`.

> **Tabla de referencia rápida itemId empresa** (`ss_item_empresa`):
> | itemId | Nombre | Regla |
> |--------|--------|-------|
> | 11, 12, 20, 22 | (varios) | Vigencia obligatoria antes de upload |
> | 15, 16 | SCTR, Vida Ley | Read-only — gestión en pantalla SCTR/Vida Ley |
>
> No confundir con items de trabajador: en `ss_item_trabajador`, SCTR=11 y Vida Ley=13.

---

## §Sesión 2026-05-25 — SCTR/Vida Ley mejoras, fix duplicados trabajadores

### sctr.model.ts — campos nuevos

`SctrWorkerDto`: añadido `vigencia?: string` (fecha vencimiento por trabajador en `ss_sctr_vidaley_worker`).

`SctrTrabajadorEstadoDto`: añadidos `fechaVencimiento?: string` y `updatedAt?: string` (para ordenar Tab Trabajadores por más reciente).

### sctr-vidaley — filtro proyecto client-side (Tab Pólizas)

`filtroProyecto = ''` en `sctr-vidaley.ts`.

Getter `proyectosDisponibles: string[]` — valores únicos de `documentos.map(d => d.proyectoNombre)`, A→Z con `localeCompare('es')`.

Getter `filteredDocumentos: SctrVidaLeyDto[]` — filtra por `proyectoNombre === filtroProyecto` (sin request al backend). `*ngFor` en lista de docs cambia a `filteredDocumentos`.

Dropdown `<select [(ngModel)]="filtroProyecto">` al final de `.filters-row` en `sctr-vidaley.html`.

### sctr-vidaley — aprobación masiva desde panel derecho (Tab Pólizas)

Propiedades nuevas: `docWorkersSeleccionados = new Set<number>()`, `savingDocAprobar = false`.

Getters: `docAllChecked`, `docSomeChecked`, `canAprobarDoc`.

Métodos: `toggleDocWorker`, `toggleAllDocWorkers`, `aprobarDocWorkersSeleccionados` (Swal confirm → `sctrService.aprobar(selectedDoc.id, dto)` con `tipo: selectedDoc.tipo`), `aprobarTodosDocWorkers` (Swal confirm → mismo endpoint con todos los workers). `clearDocPanel()` resetea también `docWorkersSeleccionados`.

`sctr-vidaley.html` — `.sctr-split-right`:

- Header `.sctr-workers-header` (`*ngIf="isAdmin()"`) con checkbox "Seleccionar todos" (`[indeterminate]`), contador y botón "Aprobar todos".
- Cada `.sctr-worker-item` tiene checkbox admin-only (`stopPropagation` para no interferir con `selectPolizaWorker`).
- Footer `.sctr-split-actions-bar` (`*ngIf="isAdmin()"`) con contador + botón "Aprobar seleccionados".
- Worker cards muestran `w.vigencia` si existe: `{{ w.vigencia | date:'dd/MM/yyyy' }}`.

`sctr-vidaley.css`: nuevas clases `.sctr-workers-header` y `.sctr-split-actions-bar`. Split ratio: `.sctr-split-left { flex: 0 0 60% }` (era 70%), `.sctr-split-right { flex: 0 0 40% }` (era 30%).

### sctr-vidaley — filtros client-side en Tab Trabajadores

Propiedades nuevas: `wFiltroNombre = ''`, `wFiltroEmpresaTexto = ''`.

Getter `filteredTrabajadores: SctrTrabajadorEstadoDto[]`: filtra por nombre y empresa (text libre case-insensitive), ordena por `updatedAt` desc (null al final). `*ngFor` cambia a `filteredTrabajadores`. Cards muestran `fechaVencimiento` si existe.

Dos inputs `.wfilters-text-row` (Buscar nombre + Buscar empresa) encima del `.wfilters-grid` en `sctr-vidaley.html`. Nueva clase CSS `.wfilters-text-row { display: flex; gap: 0.5rem }`.

### trabajadores — fix deduplicación por workerId (línea 209)

**Causa**: el backend retorna múltiples filas para el mismo `workerId` cuando un worker tiene ≥2 proyectos activos (JOIN con proyectos). Frontend los mostraba todos como cards duplicadas.

**Fix** en `loadWorkers()` después de recibir `res.data`:

```ts
this.workers = [...new Map((res.data ?? []).map((w) => [w.workerId, w])).values()];
```

El `Map` con clave `workerId` deduplica conservando la última aparición por worker.

---

## §Sesión 2026-05-25 (tarde) — sctr-vidaley rediseño completo panel Pólizas

### Layout 3 columnas (Tab Pólizas)

Rediseño total de la vista Tab Pólizas: de `sctr-columns` (2 columnas split 60/40) a `sctr-3col` con 3 columnas side-by-side dentro de un único card:

- `.col-polizas` — `width: 280px; flex-shrink: 0` — lista de pólizas + paginator
- `.col-workers` — `width: 260px; flex-shrink: 0` — panel de workers
- `.col-pdf` — `flex: 1; min-width: 0` — visor PDF

Cada columna tiene `overflow-y: auto` propio con `height: 100%`. El contenedor `.sctr-3col` es `display: flex; flex: 1; min-height: 0; overflow: hidden; border-radius: 10px`.

Top bar compactada a `sctr-top` (card) con:

- `sctr-top-row1`: título + tabs + spacer + botón "Subir SCTR/Vida Ley" (~30px)
- `sctr-top-filters`: filtros horizontales (`*ngIf="activeTab === 'polizas'"`) (~38px)

Root: `height: calc(100vh - 60px); display: flex; flex-direction: column; gap: 0.35rem`.

### Doc cards — diseño compacto 2 filas + fila fechas

Cada card de póliza en `.col-polizas` usa `padding: 6px 10px` y 3 filas:

- `.doc-row1`: `[TIPO]` + empresa nombre + badge estado (`[ngClass]="getEstadoClass(doc.estado)"` sobre `class="btn-chip"` — augmenta, no reemplaza)
- `.doc-row2`: `proyectoNombre — mes año | N trab.` (separadores `.doc-sep` color `#d1d5db`)
- `.doc-row3` (`*ngIf="doc.fechaInicio || doc.vigencia"`): `Ini: dd/MM/yyyy — Fin: dd/MM/yyyy`

Badge estado usa `getEstadoClass(doc.estado)` real, no hardcodeado a verde.

`doc.fechaInicio` y `doc.vigencia` ya existían en `SctrVidaLeyDto` — no requirió cambios en el modelo.

### Panel workers (col-workers) — checkbox + selección masiva

- Header (`*ngIf="isAdmin()"`): checkbox "Seleccionar todos" con `[indeterminate]="docSomeChecked && !docAllChecked"` + contador workers
- Cada `.sctr-worker-item`: checkbox individual admin-only con `$event.stopPropagation()`
- Footer `.workers-footer` unificado: `display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px; border-top`
  - `.sel-count` (0.72rem, #64748b) siempre visible
  - Botones `btn-aprobar-sel` y `btn-rechazar-sel` envueltos en `*ngIf="docWorkersSeleccionados.size > 0"`
  - Enlace "Ver historial de versiones" (`.historial-link`, 0.7rem, #16a34a) siempre visible

### filteredDocWorkers — solo workers no aprobados

```ts
get filteredDocWorkers(): SctrWorkerDto[] {
  if (!this.selectedDoc) return [];
  return this.selectedDoc.workers.filter((w) => w.estado !== 'Aprobado');
}
```

Checkboxes y botones de aprobación masiva operan sobre este subset.

### SctrWorkerDto — fechaVencimiento

`sctr.model.ts`: añadido `fechaVencimiento?: string` a `SctrWorkerDto`. Se muestra debajo del badge de estado en cada worker card:

```html
<span *ngIf="w.fechaVencimiento" class="muted-line"
  >Vence: {{ w.fechaVencimiento | date:'dd/MM/yyyy' }}</span
>
```

### filtroEstado default 'Enviado'

`filtroEstado = 'Enviado'` (antes `''`). La lista arranca filtrando pólizas en estado Enviado.

### Fixes 2026-05-30

- **`sctr-subir.html`**: campo Proyecto cambiado a **obligatorio** (`Proyecto *`, `placeholder="Selecciona un proyecto"`).
- **`sctr-subir.ts` `submit()`**: guard antes del payload — si `!model.proyectoId` lanza Swal warning y hace `return`. El backend ya recibía `proyectoId` como opcional, pero ahora el frontend lo exige.
- **`sctr-vidaley.ts` `filteredDocWorkers` / `filteredPolizaWorkers`**: excluyen workers con estado `'Rechazado'` además de `'Aprobado'`. Antes los Rechazados aparecían en el panel de aprobación masiva.
- **`sctr-vidaley.ts` `recalcularEstadoLocal(doc)`** (método privado): actualiza `doc.estado` (`'Enviado'` si hay workers en `'En revision'`/`'Enviado'`, `'Aprobado'` si no), sincroniza `this.documentos[idx].estado` y llama `cdr.detectChanges()`. Usado por `aprobarWorkerIndividual` y `confirmarRechazarWorker` para reflejar cambios sin recargar del backend.

### Aprobación directa sin Swal confirm

`aprobarWorkerIndividual`, `aprobarDocWorkersSeleccionados`, `rechazarDocWorkersSeleccionados` ejecutan directo sin `Swal.fire` de confirmación.

`rechazarDocWorkersSeleccionados` es método nuevo: llama `sctrService.aprobar(selectedDoc.id, { workerIdsAprobados: [], workerIdsRechazados: [...docWorkersSeleccionados], tipo, obsAbril })`.

### verHistorialVersiones — stub vacío

```ts
verHistorialVersiones(): void {}
```

Añadido antes de `verVersionesPoliza()`. El enlace en el footer llama este stub; implementación pendiente.

### Tipografía worker cards

```css
.sctr-worker-item .worker-info strong {
  font-size: 0.78rem;
  font-weight: 500;
}
.sctr-worker-item .worker-info .muted-line {
  font-size: 0.7rem;
  color: #64748b;
}
```

---

## §Sesión 2026-05-25 (noche) — sctr-vidaley Tab Trabajadores rediseño + bandeja cards

### sctr-vidaley — Tab Trabajadores rediseño 3 columnas

El tab Trabajadores reemplazó `trabajadores-layout` (grid 2 col) por `sctr-3col` — mismo contenedor y clases CSS del Tab Pólizas.

**Filtros movidos al top bar**: nueva `sctr-top-filters *ngIf="activeTab === 'trabajadores'"` con empresa SearchSelect (admin), proyecto SearchSelect, tipo select, estado select, inputs nombre y empresa texto, btn Buscar — idéntico al patrón de Tab Pólizas.

**Col 1 (`.col-polizas`, 280px)**: cards de trabajadores con layout en 4 filas:

- Fila 1: `[tipo chip SCTR/VIDA LEY]` `[estado badge]` `Vence: fecha` (alineado derecha, solo si existe)
- Fila 2: `apellidoNombre` (0.82rem, font-weight 600)
- Fila 3: `DNI xxx`
- Fila 4: `empresa · proyecto` (0.72rem, gris)
- Fila 5 (`*ngIf="!w.sctrId"`): botón "Rechazar" outline rojo (`border: 1.5px solid #dc2626; color: #dc2626; background: white; border-radius: 4px`)

**Col 2 (`.col-workers`, 260px)**: workers de `selectedPoliza` no aprobados — idéntico al col-workers del Tab Pólizas:

- Header: checkbox select-all + contador
- Lista `.sctr-split-workers`: checkbox individual, nombre/DNI/vence, badge estado, botones ✓/✗ inline
- Panel rechazar inline: `rechazandoWorkerId` + `rechazandoMotivoInline` (mismo estado compartido)
- Footer `.workers-footer`: Aprobar/Rechazar seleccionados (`*ngIf="polizaWorkersSeleccionados.size > 0"`) + historial link

**Col 3 (`.col-pdf`, flex:1)**: PDF viewer con header (tipo, mes, año, worker nombre + empresa, badge estado), vigencia, iframe `polizaSafeUrl`.

**TS nuevos métodos y getters**:

```ts
getPolizaWorkerEstado(w): string    // estadoVidaLey o estadoSctr según wFiltroTipo
get filteredPolizaWorkers()         // workers de selectedPoliza donde estado !== 'Aprobado'
polizaAllChecked / polizaSomeChecked // ahora sobre filteredPolizaWorkers
toggleAllPolizaWorkers()            // ahora sobre filteredPolizaWorkers
aprobarPolizaWorkerIndividual(w)    // PATCH aprobar 1 worker en selectedPoliza
confirmarRechazarPolizaWorker(w)    // PATCH rechazar 1 worker con motivo inline
rechazarSeleccionados()             // simplificado — sin motivoRechazo en payload
rechazarSinPoliza(w)                // recibe SctrTrabajadorEstadoDto directamente (no usa selectedWorker)
clearPolizaPanel()                  // ahora también resetea rechazandoWorkerId + rechazandoMotivoInline
```

### bandeja — cards rediseño

**HTML** (`bandeja.html`): `bc-fecha` reemplaza `fechaEnvio` por `vigencia`:

```html
<span class="bc-fecha" *ngIf="item.vigencia">Vence: {{ item.vigencia | date:'dd/MM/yyyy' }}</span>
```

**CSS** (`bandeja.css`):

- `.bandeja-card`: `padding: 10px 12px`
- `.bandeja-card:hover`: `border-color: #16a34a; box-shadow: 0 2px 8px rgba(0,0,0,0.07)`
- `.bc-fecha`: `0.7rem / #64748b / white-space: nowrap`
- `.bc-entidad`: `0.78rem` (era 0.82rem)
- `.bc-meta`: `0.7rem / #64748b` (era 0.75rem / #6b7280)

---

## §Sesión 2026-05-26 — Validaciones guardarEntregable + EMOs tabla compacta + SearchSelect compact

### Validaciones en `guardarEntregable()` — 3 componentes Habilitación

Dentro de la rama `if (this.isContratista())` de `guardarEntregable()` se agregaron dos guards antes de construir el payload:

1. **Archivo obligatorio**: si `!panelArchivoUrl` → `Swal.fire({ icon: 'error', title: 'Debes subir un archivo antes de guardar' })` + `return`.
2. **Vigencia obligatoria**: si `selectedEntregable.requiereVigencia && !panelVigencia` → `Swal.fire({ icon: 'error', title: 'Debes ingresar la fecha de vigencia' })` + `return`.

Admins no afectados — las validaciones están dentro del bloque contratista. No se hardcodean ítems específicos; `requiereVigencia` viene del DTO.

**Archivos modificados:**

- `features/habilitacion/pages/trabajadores/trabajadores.ts` — `guardarEntregable()` línea 612
- `features/habilitacion/pages/empresa/empresa.ts` — `guardarEntregable()` línea 481
- `features/habilitacion/pages/equipos/equipos.ts` — `guardarEntregable()` línea 470

---

### EMOs — nuevas columnas en tabla `emos.html`

**`dtos/emo.model.ts` — `EmoPorTrabajadorDto`**: añadidos dos campos opcionales:

```ts
empresaOrigenNombre?: string;   // empresa con que se registró el EMO
proyectoNombre?: string;        // proyecto actual del worker
```

(Ya existían `obraOficina`, `empresa`, `proyecto` — no duplicados.)

**`emos.html` — columnas actualizadas:**

| Antes     | Después     | Campo                               |
| --------- | ----------- | ----------------------------------- |
| Empresa   | Emp. Actual | `item.empresa`                      |
| — (nueva) | Emp. Origen | `item.empresaOrigenNombre \|\| '—'` |
| — (nueva) | Proyecto    | `item.proyectoNombre \|\| '—'`      |
| — (nueva) | Tipo        | `item.obraOficina \|\| '—'`         |

`colspan` de fila vacía: 9 → 12.

`<colgroup>` con anchos fijos:

```
auto | 80px | 140px | 140px | 120px | 80px | 90px | 90px | 90px | 90px | 60px | 36px
Trab | T.EMO | Emp.Act | Emp.Or | Proy | Tipo | Fecha | Vence | Apt | Est | Días | Acc
```

> **Nota backend pendiente**: los campos `empresaOrigenNombre` y `proyectoNombre` deben ser mapeados en el endpoint `GET /emos/por-trabajador`. El frontend los muestra como `'—'` si vienen `null`/`undefined`.

---

### EMOs — UI compacta (`emos.html` + `emos.css`)

**Header**: eliminado el bloque `<div>` con `<h2>` grande + `<p>` subtítulo. Reemplazado por una sola línea `<h2 class="text-base font-semibold">` alineada con el botón "Nuevo EMO".

**Sección padding**: `<section class="p-6 space-y-4">` → `class="px-3 py-4 space-y-3"` (12px lateral).

**Tabla compacta:**

- `font-size`: `0.88rem` → `0.8rem`
- `table-layout: fixed` activado
- Padding `thead th` y `tbody td`: `0.75rem 1rem` → `6px 8px`
- `th`: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- `td`: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- `.col-worker` (primera columna): override con `white-space: normal; overflow: visible` — el nombre del trabajador puede wrappear
- `.worker-name`: `0.82rem` → `0.78rem`, `line-height: 1.2`
- `.worker-dni`: `0.72rem` → `0.7rem`

**Filtros compactos:**

- `.filters-card`: `padding: 10px 12px`, `border-radius: 8px`, sin `box-shadow`, `border: #e2e8f0`
- `.filters-grid`: `gap: 0.75rem` → `8px`
- `.filter-label`: `0.72rem` → `0.7rem`, `color: #6b7280` → `#94a3b8`, `margin-bottom: 0.35rem` → `3px`
- `.search-input`: `height: 32px`, `bg: #f8fafc`, `border: #e2e8f0`, `border-radius: 12px` → `6px`, `padding: 0 0.6rem`
- `.search-input input`: `font-size: 0.9rem` → `0.78rem`

---

### `SearchSelect` — modo compacto (`@Input() compact`)

Componente compartido en `shared/components/search-select/`. Para no romper otros usos, se añadió un input opcional:

**`search-select.ts`**: `@Input() compact: boolean = false`

**`search-select.html`** — el botón trigger aplica clases condicionales vía `[ngClass]`:

```ts
compact
  ? 'rounded-[6px] bg-[#f8fafc] pl-[8px] pr-[6px] h-[32px] text-[0.78rem] focus:ring-1 focus:ring-[#64BC04]/20'
  : 'rounded-xl bg-white pl-[12px] pr-[10px] py-[10px] text-sm focus:ring-2 focus:ring-[#64BC04]/30';

// Border:
isOpen
  ? 'border-[#64BC04] ring-2 ring-[#64BC04]/30'
  : compact
    ? 'border-[#e2e8f0]'
    : 'border-[#D6DEE5]';
```

**`emos.html`**: los tres `app-search-select` de los filtros usan `[compact]="true"`. Todos los demás usos en la app quedan sin cambios.

---

### Pendiente backend (identificado en esta sesión)

- **`GET /ssoma/salud-ocupacional/catalogos/empresas`** — agregar `WHERE es_abril = true` en el query de `contributor`. Actualmente devuelve todas las empresas (campo `es_abril = false` en todos los registros históricos — verificar que los registros Abril tengan el campo correcto antes de activar el filtro).
- **Búsqueda `GET /emos/por-trabajador?search=`** — verificar que el WHERE del backend incluya `ApellidoNombre.Contains(search, OrdinalIgnoreCase)` además de DNI. El filtrado es 100% backend (no hay filtrado local en el frontend).
- **Mapear `empresaOrigenNombre` y `proyectoNombre`** en el response del endpoint `GET /emos/por-trabajador`.

---

## §Sesión 2026-05-26 (segunda parte) — Clínica: CompletarEmo con interconsulta inline y restricciones

### `emo.model.ts` — nuevos campos y nueva interfaz

**`EmoCreateDto`**: añadidos dos campos opcionales al final:

```ts
fechaLectura?: string;
interconsultaInline?: InterconsultaInlineCreateDto;
```

**`EmoRestriccionCreateDto`**: añadido campo opcional:

```ts
vigente?: boolean;
```

**Nueva interfaz** `InterconsultaInlineCreateDto`:

```ts
export interface InterconsultaInlineCreateDto {
  especialidad: string;
  centroAtencion?: string;
  diagnostico?: string;
  cie10?: string;
  medicoDerivaId?: number;
  requiereSeguimiento: boolean;
}
```

Permite registrar una interconsulta junto con el EMO en un solo POST, sin endpoint separado.

---

### `completar-emo` — reescritura completa (clínica)

**Archivo:** `features/clinica/pages/agenda/components/completar-emo/`

#### Lógica de negocio (completar-emo.ts)

| Getter                  | Condición                                                                       | Efecto en UI                  |
| ----------------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| `requiereRestriccion`   | `aptitud === 'Apto con Restricciones'`                                          | Muestra sección restricciones |
| `requiereInterconsulta` | `aptitud === 'No Apto' \|\| aptitud === 'Observado'`                            | Muestra sección interconsulta |
| `canSubmit`             | aptitud + programacion + !saving + (si interconsulta → icEspecialidad no vacío) | Habilita botón                |

**Restricciones** (`restricciones: { descripcionLibre }[]`):

- `agregarRestriccion()` — push + limpiar input (o Enter en el campo)
- `quitarRestriccion(i)` — splice por índice
- Mapeado a `EmoRestriccionCreateDto[]` con `vigente: true` en `submit()`

**Interconsulta inline** — campos locales `icEspecialidad`, `icCentro`, `icDiagnostico`, `icCie10`, `icRequiereSeguimiento`. Construye `InterconsultaInlineCreateDto` en `submit()` solo cuando `requiereInterconsulta`.

**`fechaLectura`** — fecha opcional independiente de `fechaEmo` (que sigue siendo la fecha del día del registro).

**Flujo `submit()`** (sin cambios en la cadena de llamadas):

1. `EmoService.createEmo(emoDto)` → recibe `{ id }` del EMO creado.
2. `ClinicaProgramacionService.accionClinica(programacionId, { accion: 'Completar', emoResultadoId })`.

#### Template (completar-emo.html)

- `width="w-[640px]"` (antes 600px — más espacio para sección interconsulta).
- Grid 2 columnas `.grid-2`:
  - Row: N° Informe / URL resultado
  - Row: Fecha lectura EMO / Notas (antes solo Notas en `col-span-2`)
  - `*ngIf="requiereRestriccion"` — sección restricciones con input+botón+lista pills
  - `*ngIf="requiereInterconsulta"` — sección interconsulta con `section-divider`, campos Especialidad, Centro, CIE-10, Diagnóstico, checkbox Seguimiento
  - Alertas contextuales: roja para "No Apto", naranja para "Observado"

#### Estilos nuevos (completar-emo.css)

```css
.restriccion-row   { display: flex; gap: 8px; align-items: center }
.restriccion-list  { margin-top: 8px; flex-col; gap: 4px }
.restriccion-item  { flex row space-between; bg #f8fafc; border #e2e8f0; radius 6px; padding 4px 10px; font-size 0.82rem }
.btn-remove        { color: #dc2626; font-size: 0.75rem }
.section-divider   { 0.75rem uppercase #64748b; border-bottom #e2e8f0; padding-bottom 4px; margin-top 4px }
```

### Resumen de archivos modificados

| Archivo                                                            | Cambio                                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `ssoma/salud-ocupacional/dtos/emo.model.ts`                        | `EmoCreateDto` +2 campos; `EmoRestriccionCreateDto` +`vigente?`; nueva `InterconsultaInlineCreateDto` |
| `clinica/pages/agenda/components/completar-emo/completar-emo.ts`   | Reescritura completa (restricciones + interconsulta inline + fechaLectura)                            |
| `clinica/pages/agenda/components/completar-emo/completar-emo.html` | Reescritura completa (formulario expandido, 2 secciones condicionales, alertas)                       |
| `clinica/pages/agenda/components/completar-emo/completar-emo.css`  | Append: 5 clases nuevas para restricciones y section-divider                                          |

### Pendiente backend

- `POST /emos` — aceptar campo `interconsultaInline` en el body y crear la interconsulta en la misma transacción.
- `POST /emos` — aceptar `fechaLectura` y persistirlo en `worker_emos.fecha_lectura`.
- `EmoRestriccionCreateDto.vigente` — confirmar que el backend mapea este campo o lo ignora sin error.

---

## Sesión 2026-05-25 — Rediseño completo Dashboard de Proyectos (estilo Power BI)

Rediseño total de `features/projects/projects-dashboard/`. Los 3 endpoints del backend ya estaban listos.

### Endpoints consumidos

```
GET  /api/v1/projects-dashboard/filters
GET  /api/v1/projects-dashboard?proyectoId=&estado=&responsableId=&fechaDesde=&fechaHasta=
GET  /api/v1/projects-dashboard/{proyectoId}
```

### Archivos nuevos creados

- `features/projects/projects-dashboard/dtos/projectsDashboard.model.ts` — DTOs completos: `ProjectsDashboardFilterItemDTO`, `ResponsableSimpleDTO`, `ProjectsDashboardFiltersDTO`, `ProjectsDashboardItemDTO`, `ProjectsDashboardDTO`, `DistribucionEstadoDTO`, `RankingResponsableDTO`, `HeatmapSemanaDTO`, `HeatmapResponsableDTO`, `ActividadCriticaDTO`, `GanttTareaDTO`, `ProyectoDetalleDTO`.
- `features/projects/projects-dashboard/services/projects-dashboard.service.ts` — `getFilters()`, `getDashboard(params)`, `getProjectDetail(id)`.
- `features/projects/projects-dashboard/projects-dashboard.ts/html/css` — 8 secciones: 4 KPI cards, filtros, donut Chart.js, barras horizontales Chart.js, heatmap HTML, ranking de responsables, tabla de proyectos, panel lateral deslizable con Gantt + actividades críticas.

### Registro en routing y navegación

- `proyectos-routing-module.ts` — ruta `projects-dashboard` con `canActivate: [roleGuard]`, `featureKey: 'projects.projects-dashboard'`.
- `navigation.service.ts` — item `{ label: 'Dashboard de Proyectos', route: '/projects/projects-dashboard', featureKey: 'projects.projects-dashboard' }`.

---

## Sesión 2026-05-26 — Cronograma de Actividades + Ajustes Dashboard

### 1. Cronograma de Actividades

Módulo completo para gestionar actividades de la tabla `project_activity`.

**Archivos:**

- `features/projects/cronograma-actividades/services/cronograma-actividades.service.ts`
- `features/projects/cronograma-actividades/dtos/cronograma-actividades.dtos.ts`
- `features/projects/cronograma-actividades/cronograma-actividades.ts/html/css`

**Endpoints:**

```
GET    /api/v1/cronograma-actividades/proyectos
GET    /api/v1/cronograma-actividades/{proyectoId}/actividades
POST   /api/v1/cronograma-actividades/{proyectoId}/actividades
PUT    /api/v1/cronograma-actividades/actividades/{id}
PATCH  /api/v1/cronograma-actividades/actividades/{id}/culminar
DELETE /api/v1/cronograma-actividades/actividades/{id}
POST   /api/v1/cronograma-actividades/{proyectoId}/importar-mpp   (FormData: archivo)
```

**DTOs:**
- `ProyectoSimpleDto { projectId, projectDescription, responsableUdp }`
- `ActividadDto { projectActivityId, projectId, activityDescription, plannedStartDate, plannedEndDate, actualEndDate, progressPercentage, order, hierarchyLevel, parentId }`

**Funcionalidad:**
- Dropdown de proyectos → carga actividades en tabla.
- **Avance**: `getAvance(act)` devuelve `100` si `actualEndDate != null`, o `progressPercentage` si no. Barra coloreada verde/azul/amarillo/rojo por umbral.
- **Estado**: badges CULMINADO / VENCIDO / EN PROCESO / PENDIENTE.
- **Clic en fila** → abre modal "Editar Actividad". No hay columna de botones de acción.
- **Modal Editar**: footer `[Eliminar] [Culminar/Desculminar] [Cancelar] [Guardar]`. Eliminar alineado a la izquierda (btn-danger, margin-right:auto). Culminar/Desculminar con btn-ghost-verde.
- **Modal Crear**: footer solo `[Cancelar] [Guardar]`.
- **Importar desde MS Project**: botón visible para roles `ADMINISTRADOR DE UDP` o `ADMINISTRADOR DE RESIDENTES` (`esAdmin` getter con `authService.hasRole`). Modal con `<input type="file" accept=".mpp">`. Si el proyecto ya tiene actividades, Swal de confirmación antes de llamar al backend. Spinner mientras procesa. Al completar: cerrar modal, recargar tabla, Swal éxito.

**Jerarquía visual:**
- `ActividadDto` trae `hierarchyLevel` y `parentId` del backend (en orden correcto: padres antes que hijos).
- `buildParentIds()` → `Set<number>` de IDs que son padres (para `hasChildren()` en O(1)).
- `buildColorMap()` → `Map<id, colorBase>` construido al cargar: recorre en orden; nivel-1 toma el siguiente color de `LEVEL1_PALETTE`; nivel-2+ hereda el color del ancestro nivel-1 (`findLevel1Color()` recursivo por `parentId`). Guarda solo el **color base** de nivel-1; las variantes claro/oscuro se resuelven vía `SHADES`.
  - `NIVEL0_COLOR = '#3F51B5'`.
  - `LEVEL1_PALETTE` (8): `['#2196F3','#009688','#FF9800','#E91E63','#9C27B0','#00BCD4','#F44336','#673AB7']`.
  - `SHADES: Record<base, {claro, oscuro}>` — par claro/oscuro Material por cada color de la paleta (ej. `#2196F3 → {claro:'#E3F2FD', oscuro:'#1565C0'}`). `shadesOf(act)` busca por el base de la actividad.
- `getRowStyle(act)` (`[ngStyle]` en `<tr>`): nivel 0 → `#3F51B5`/blanco; nivel 1 → colorBase/blanco; nivel 2+ → `claro`/`oscuro`.
- `getBadgeStyle(act)` (`[ngStyle]` en el badge de estado, reemplaza al `[ngClass]` anterior): nivel 0/1 → `rgba(255,255,255,0.2)`/blanco; nivel 2+ → `oscuro+'26'` (tinte 15%)/`oscuro`. La etiqueta sigue de `getEstado(act).label`.
- Filas con `[class.row-colored]` (niveles 0–1) y `[class.row-tinted]` (nivel 2+). CSS `.row-colored td`/`.row-tinted td { color: inherit }` hace que `#`, fechas y avance hereden el color de texto del nivel. `.btn-chevron { color: inherit }` → chevron blanco en 0/1, `oscuro` en 2+.
- **Collapse/expand**: chevron ∨ (expandido) / > (colapsado, rotación CSS -90°). `collapsedIds: Set<number>`. `isVisible(act)` recursivo: sube por `parentId` hasta que ningún ancestro esté en `collapsedIds`. `toggleCollapse(act, event)` con `stopPropagation()`.
- Estado de jerarquía (`collapsedIds`, `parentIds`, `colorMap`) se limpia al cambiar de proyecto.
- `getEstado(act).css` (clases `badge-verde/rojo/...`) queda sin uso en el template tras pasar el badge a `[ngStyle]`; CSS scoped inofensivo.

**Routing:** `proyectos-routing-module.ts` ruta `cronograma-actividades`, `canActivate: [roleGuard]`, `featureKey: 'projects.cronograma-actividades'`. Roles permitidos en ruta: `USUARIO DE UDP`, `ADMINISTRADOR DE UDP`. Ítem en `navigation.service.ts` segundo del módulo proyectos.

### 2. SearchSelect — ajuste de texto

`shared/components/search-select/search-select.css` (antes vacío). Clases `.ss-trigger-label` y `.ss-option`: 13px, ellipsis, `max-width: 200px`. Aplica a todas las instancias.

### 3. Dashboard de Proyectos — alineación campos con backend

`ProjectsDashboardItemDTO` renombrado:

| Campo anterior      | Campo nuevo          |
| ------------------- | -------------------- |
| `proyectoNombre`    | `projectDescription` |
| `responsableArqCom` | `responsableNombre`  |

Archivos actualizados: modelo, html (tabla + panel header), ts (`initBarrasChart`). El campo `proyectoId` no cambió.

### 4. Dashboard de Proyectos — Gantt mejorado

- `date_format`: `'%Y-%m-%d'` → `'%d-%m-%Y %H:%i'`
- Destroy/reinit completo en cada apertura: `gantt.destructor()` + `ganttInitialized = false`
- Escala: `month` → `day` (`%d %M`)
- Añadidos: `row_height:34`, `bar_height:20`, `show_grid:true`, `grid_width:200`, `min_column_width:60`
- Columnas: Actividad (180px, tree) + Días (40px)
- `task_class` template: `gantt-culminado/gantt-vencido/gantt-en-proceso/gantt-pendiente` por estado
- Estilos `.gantt_task_line.gantt-*` en `styles.css` global (dhtmlx inyecta fuera del shadow del componente)

---

## §Sesión 2026-05-27 — Rediseño Enterprise Módulo Clínica (Dashboard + Agenda)

### Layout full-screen para Clínica

`shared/components/layout/layout.ts` — `isFullPage()` incluye `/clinica/dashboard` y `/clinica/agenda`. Estas rutas renderizan sin `<app-header>` y sin padding del wrapper.

`shared/components/layout/layout.html` — inline style bindings para forzar cero padding/fondo independientemente de Tailwind v4 specificity:

```html
[style.padding]="isFullPage() ? '0' : null" [style.background]="isFullPage() ? 'transparent' : null"
```

El sidebar permanece visible — `isFullPage()` solo elimina header y padding del área de contenido.

### Dashboard Clínica — rediseño enterprise

**Archivos:** `features/clinica/pages/dashboard/dashboard.ts/.html/.css`

#### Layout CSS (`dashboard.css`)

```css
:host {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.dash-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f0f4f8;
}
.dash-header {
  flex-shrink: 0;
  background: #0f172a;
  padding: 12px 24px;
}
.dash-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px 20px;
  gap: 10px;
  min-height: 0;
}
.kpi-section,
.ops-section {
  flex-shrink: 0;
}
.bottom-section {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 10px;
  overflow: hidden;
  min-height: 0;
}
.proximos-card {
  overflow-y: auto;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
```

#### Funcionalidades añadidas (`dashboard.ts`)

- `Router` inyectado vía `inject(Router)`.
- `navegarConFiltro(ruta, filtro?)` — navega con `queryParams` opcional.
- `get pctCompletadas()` / `get pctEnProceso()` — porcentaje para progress bars.

#### KPI cards clickables

`(click)="navegarConFiltro('/clinica/agenda')"` / `"navegarConFiltro('/clinica/emos', 'sin-emo')"` etc. Clase `.kpi-card { cursor: pointer }`.

#### Progress bars operativas

```html
<div class="ops-progress-bar">
  <div class="ops-progress-fill fill-blue" [style.width.%]="pctCompletadas"></div>
</div>
```

CSS: `.ops-progress-bar { height: 6px; background: #e2e8f0; border-radius: 3px; }` `.ops-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }`.

#### Tabla próximos EMO — columnas Vence y Días

`<th>Vence</th><th>Días</th>` — valores `item.fechaVencimiento | date:'dd MMM yyyy'` y badge coloreado por `item.diasParaVencer`.

Badges: `badge-red` (≤0), `badge-orange` (≤7), `badge-yellow` (≤30), `badge-green` (resto).

#### Pulse badge "Clínica activa"

```html
<div class="clinica-activa-badge"><span class="pulse-dot"></span> Clínica activa</div>
```

```css
.pulse-dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse-green 2s infinite;
}
@keyframes pulse-green {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.4);
  }
}
```

#### Mini-stat overflow fix

`.mini-stat-body { min-width: 0; overflow: hidden; flex: 1; }` `.mini-stat-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`.

### Agenda Clínica — rediseño enterprise + tema claro

**Archivos:** `features/clinica/pages/agenda/agenda.ts/.html/.css`

#### Layout CSS (`agenda.css`)

```css
:host {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.agenda-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f0f4f8;
}
.agenda-header {
  flex-shrink: 0;
  background: #0f172a;
  padding: 14px 20px 10px;
}
.stats-bar {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}
.controls-row {
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}
.cards-zone {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 14px 20px 16px;
  background: #f0f4f8;
}
.agenda-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-left: 4px solid transparent;
}
.card-muted {
  opacity: 0.6;
  background: #f8fafc;
}
```

#### Stats bar clickable sincronizada con chips

Los stat-items de la stats bar tienen `(click)="filtroEstado = 'Programado'"` (etc.) y `[class.stat-active]="filtroEstado === 'Programado'"`. Compartiendo el mismo binding `filtroEstado`, click en stat = activa chip correspondiente automáticamente.

#### Semáforo de fechas (`fechaClass()` en `agenda.ts`)

```ts
fechaClass(fecha: string): string {
  const hoy = new Date().toISOString().split('T')[0];
  if (fecha === hoy) return 'fecha-hoy';
  if (fecha < hoy) return 'fecha-pasada';
  return 'fecha-futura';
}
```

Colores: `fecha-hoy: #16a34a`, `fecha-pasada: #dc2626`, `fecha-futura: #2563eb`.

#### Terminal cards con opacidad

`[ngClass]="[..., esTerminal(item.estado) ? 'card-muted' : '']"` — estados Completado/Rechazado/Cancelado/No se presentó muestran la card con `opacity: 0.6`.

#### Modal confirmación aceptación (light theme)

```css
.dark-modal {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}
.dm-input {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  color-scheme: light;
}
```

### Pitfall: Tailwind v4 vs inline styles

Las clases `sm:py-[20px]` y `sm:pr-[20px]` de `layout.html` tienen especificidad suficiente para sobreponer `!important` en CSS. La solución definitiva es usar bindings inline `[style.padding]` y `[style.background]` en el template — los estilos inline siempre ganan la cascada.

### Pitfall: `:host { position: fixed; inset: 0 }` cubre el sidebar

Cuando una página usa `position: fixed; inset: 0` en `:host`, cubre el sidebar (que tiene `z-index` menor). La solución correcta para "full-screen sin sidebar" es `flex: 1; min-height: 0; overflow: hidden` — el componente ocupa el área de contenido disponible después del sidebar sin superponerlo.
Backend:

InterconsultaCreateDto — ProgramacionId, Diagnostico, Cie10 agregados; EmoId nullable
SsInterconsulta modelo — ProgramacionId, EmoId nullable
InterconsultaRepository.Create — FechaDerivacion automática, EmoId = null, Estado = "Pendiente"
InterconsultaController.Create — [FromBody] sin upload
InterconsultaController.SubirDocumento — POST /{id}/documentos restaurado con [FromForm]
EmoRepository.Create — vincula interconsulta pendiente + sube documento + asigna EmoId
EmoCreateDto — DocumentoInterconsulta: IFormFile? con [JsonIgnore]
EmoController.Create — recibe documentoInterconsulta como [FromForm]
BD — emo_id nullable, programacion_id agregado en ss_interconsultas

Frontend:

ClinicaInterconsultaCreateDto — interface creada
InterconsultaClinicaService — createInterconsulta() con FormData
agenda.ts — confirmarInterconsulta() usa el nuevo servicio

❌ Pendiente
Backend:

Confirmar que dotnet build pasa limpio (se colgó antes de reportar)

Frontend:

completar-emo.ts — agregar documentoInterconsulta: File | null = null y handler onDocumentoInterconsulta()
completar-emo.html — agregar input file dentro de \*ngIf="requiereInterconsulta"
EmoService.createEmo() — verificar que pasa documentoInterconsulta al backend (actualmente los documentos van en requests separados fire-and-forget)
Después de POST /emos exitoso, llamar POST /interconsultas/{id}/documentos con el archivo — necesita que el backend retorne el interconsultaId vinculado en la respuesta del EMO, o que el frontend consulte la interconsulta activa del worker para obtener el id

Punto crítico pendiente de diseño:

El frontend necesita saber el id de la interconsulta vinculada para llamar POST /interconsultas/{id}/documentos
Opciones:

Opción A — EmoRepository.Create retorna el interconsultaId en la respuesta del POST /emos
Opción B — Frontend llama GET /interconsultas?workerId=X&estado=Pendiente para obtener el id

Recomendación: Opción A — modificar EmoCreateResponseDto para incluir interconsultaId?: int

---

## Sesión 2026-05-30 — Cronograma de Actividades: rediseño visual + jerarquía editable + master-detail

Reescritura grande del módulo `features/projects/cronograma-actividades/`. Reemplaza la
paleta Material previa (ver §Sesión 2026-05-26) y agrega navegación maestro-detalle,
reordenamiento, cambio de jerarquía y cálculo recursivo de avance.

**Archivos:**
- `features/projects/cronograma-actividades/services/cronograma-actividades.service.ts` (nuevos endpoints + DTO ampliado)
- `features/projects/cronograma-actividades/dtos/cronograma-actividades.dtos.ts` (interfaces separadas del service)
- `features/projects/cronograma-actividades/cronograma-actividades.ts/html/css` (Vista 2 — detalle)
- `features/projects/cronograma-actividades/proyectos-cronograma-list.ts/html/css` (Vista 1 — lista, **nuevo**)
- `features/projects/proyectos-routing-module.ts` (ruta con `:proyectoId`)

### Navegación maestro-detalle (router)

```
/projects/cronograma-actividades              → ProyectosCronogramaList (Vista 1)
/projects/cronograma-actividades/:proyectoId  → CronogramaActividades  (Vista 2)
```

- **Vista 1** (`ProyectosCronogramaList`): tabla dashboard **oscura** (paleta BCS abajo). Columnas
  NO / PROYECTO / RESPONSABLE / AVANCE. Carga proyectos con `getProyectos()` y vía `forkJoin`
  las actividades de cada uno para calcular el avance del nodo de nivel 0 (recursivo). Proyecto
  sin actividades o con error → 0%. Clic en fila → `router.navigate([..., projectId])`.
- **Vista 2** (`CronogramaActividades`): lee `proyectoId` de `ActivatedRoute.snapshot`; sin id → `volver()`.
  Header con botón **← Volver** (`volver()` → navega a la lista) + nombre del proyecto; **sin dropdown**.
  `onProyectoChange()` quedó inerte (ya no hay selector). Resto de la lógica intacta.

### Paleta BCS de jerarquía (4 niveles) — reemplaza Material

`rowStyleMap: Map<id, {bg, text, border?}>` construido en `buildColorMap()`. Helpers:
`isDarkBg(act)` (true si `text === '#E0E1DD'`), `getRowStyle`, `getChevronStyle`.

- **Nivel 0**: bg `#0D1B2A`, text `#E0E1DD`.
- **Nivel 1** (`LEVEL1_ENTRIES`, por orden de aparición): `#1B263B`, `#415A77`, `#778DA9`, `#E0E1DD`
  (los dos primeros con texto `#E0E1DD`, los dos últimos con texto `#0D1B2A`).
- **Nivel 2** (`NIVEL2_MAP`, derivado del ancestro nivel-1): `#2C3E56` / `#557090` / `#8fa3b8` / `#cacbc7`.
- **Nivel 3+** (`NIVEL3_MAP`): fondo muy claro + `border-left: 3px` del color nivel-2 (vía `--lvl-border`).
- `findAncestorBgAtLevel(act, nivel)` sube por `parentId` hasta el ancestro del nivel pedido.
- Clases de fila: `row-dark`/`row-light` + `lvl-0..lvl-deep` (peso de fuente decreciente) + `row-bordered` (nivel 3+).

### Badges adaptativos al fondo

`getBadgeStyle(act)`: en filas **oscuras** devuelve colores claros semitransparentes (CULMINADO
`#86efac`, VENCIDO `#fca5a5`, EN PROCESO `#93c5fd`, PENDIENTE `#e5e7eb`); en filas **claras**
devuelve `{}` y el template aplica `[ngClass]="getEstado(act).css"` (clases `badge-*` estándar).
Template: `[ngClass]="isDarkBg(act) ? '' : getEstado(act).css"`.

### Columna Fin Real

`getFechaRealStyle(act)`: con fecha → `#90CAF9` (fondos oscuros) / `#1565C0` (fondos claros), `opacity:1`;
sin fecha → `{}` (hereda el color secundario de la fila con `opacity:0.75`). Reemplaza la clase `td-fecha-real`.
La celda de actividad usa `white-space: normal; word-break: break-word` (no trunca con ellipsis).

### Avance recursivo (solo visual, no se persiste)

`avanceMap: Map<id, number>` reconstruido en `buildAvanceMap()` (tras cargar, culminar, eliminar).
`calcularAvance(id)` memoizado: hoja → `progressPercentage` (o 100 si `actualEndDate`); padre →
`Math.round(promedio simple de hijos directos)`. `getAvance(act)` lee del mapa. En fondos claros la
barra se fuerza a `#2C3E56` (`[style.background]`); en oscuros usa las clases semáforo `fill-*`.

### Drag & Drop — Order global único (Opción A)

Handle en el `<td>` de orden (`td-drag-handle`, `[attr.draggable]="true"`, `(dragstart)`). Estado:
`dragSrc`, `dragActId`, `dropTargetId`, `dropAbove`. **Regla única**: solo se reordena entre actividades
con el **mismo `parentId`** (`mismoParentId()` / `canDropOn()` con comparación explícita de `null`).
`onDragOver` solo hace `preventDefault()` si el destino es válido (cursor prohibido si no).

`onDrop`: toma el **subárbol** de `src` (`getSubtreeSlice` — src + descendientes contiguos en el array
depth-first), lo extrae de la lista plana, lo reinserta antes/después del destino, y recalcula `order = i+1`
para **todas** las actividades. Envía la lista completa a `reordenarActividades`. **Éxito → actualiza el
array local directamente** (`this.actividades = listaPlana` + rebuild de mapas, sin GET) para evitar
parpadeo y reset de scroll; **error → solo Swal** (el array nunca se mutó, conserva el orden original).
El mensaje de error del backend se extrae con fallback `err.error (string) ?? .message ?? .detail`.
`recargarConEstado()` (preserva scroll de `.page-content` + `collapsedIds`) existe para recargas que sí
hacen GET. **Nota**: el contenedor scrollable real es `.page-content` del layout, no `window`.

### Botones de jerarquía (subir/bajar nivel)

Columna `col-jerarquia` con dos botones `btn-jerarquia` (← / →). `canSubirNivel` (`level>0`),
`canBajarNivel` (`level<3`). Bajar: busca hacia atrás el nodo anterior del **mismo nivel** como nuevo
padre; si no hay → Swal "No hay un padre disponible…". Llaman `subirNivel`/`bajarNivel` con loading + recarga.

### Crear actividad con nivel + padre

Modal crear: selector **Nivel** (1/2/3) + selector **Padre** (visible si nivel>1, lista actividades del
nivel inmediatamente superior vía getter `padresDisponibles`). `onFormNivelChange()` resetea el padre.
Validación: nivel>1 sin padre → Swal. `CrearActividadRequest` ampliado con `hierarchyLevel` + `parentId`.

### Selector de avance 0/50/100 + validación

Modal: slider reemplazado por 3 botones (`avance-opt-0/50/100`; activo: gris/azul/verde). `onProgressChange(v)`.
Al editar, el valor de BD se "snapea" al más cercano (`raw>=75→100`, `>=25→50`, resto `0`). **Validación**:
en editar, avance 100% exige Fecha Real de Fin → `errorFechaReal` muestra mensaje bajo el campo y bloquea Guardar.

### Endpoints nuevos (servicio)

```
PATCH /api/v1/cronograma-actividades/{proyectoId}/actividades/reordenar            (body: ReordenarItem[])
PATCH /api/v1/cronograma-actividades/{proyectoId}/actividades/{id}/subir-nivel
PATCH /api/v1/cronograma-actividades/{proyectoId}/actividades/{id}/bajar-nivel     (body: { parentId })
```

`ReordenarItem { projectActivityId, order }`. **Ojo**: subir/bajar-nivel llevan `{proyectoId}` en la ruta
(se corrigió una versión previa sin él). `CrearActividadRequest` ahora incluye `hierarchyLevel` + `parentId`.

---

## Sesión 2026-05-31 — Cronograma de Actividades: rediseño tema claro + paleta demo

### Tokens de diseño — `src/styles.css` + `@theme`

Bloque `@theme` añadido en `src/styles.css` (inmediatamente después de `@import 'tailwindcss'`).
Genera clases Tailwind `bg-abril-*`, `text-abril-*`, `border-abril-*`:

| Token                   | Hex       | Uso                         |
| ----------------------- | --------- | --------------------------- |
| `--color-abril-ink`     | `#0D1B2A` | Nivel 0                     |
| `--color-abril-prussian`| `#1B263B` | Nivel 1a                    |
| `--color-abril-steel`   | `#415A77` | Nivel 1b                    |
| `--color-abril-dusk`    | `#778DA9` | Nivel 1c                    |
| `--color-abril-light`   | `#E0E1DD` | Nivel 1d / texto claro      |
| `--color-abril-n2a..d`  | derivados | Nivel 2 (4 tonos)           |
| `--color-abril-success` | `#86efac` | Badge culminado (dark ctx)  |
| `--color-abril-danger`  | `#fca5a5` | Badge vencido (dark ctx)    |
| `--color-abril-info`    | `#93c5fd` | Badge en proceso (dark ctx) |
| `--color-abril-warning` | `#fde68a` | Badge pendiente (dark ctx)  |

### Paleta Demo — `features/paleta-demo/`

Nueva ruta pública **sin auth**: `app.routes.ts` → `{ path: 'paleta-demo', loadComponent: PaletaDemoComponent }`.
Accesible en `http://localhost:4200/paleta-demo` sin login — sirve como referencia de design system.

Página de 7 secciones (tema oscuro `#0D1B2A`, fuentes `Sora` + `DM Mono` via Google Fonts):
1. Paleta base (5 swatches con token + hex + clase Tailwind)
2. Derivados N2 + tokens semánticos
3. Degradados (3 barras de gradiente)
4. Badges en contexto oscuro y claro (side-by-side)
5. Tabla de jerarquía con colores reales de los 4 niveles
6. Showcase de botones (5 variantes × 2 fondos)
7. Escala tipográfica (8 especímenes)

Franja cromática en hero es interactiva: hover expande el segmento.

### Vista 1 — `ProyectosCronogramaList` — rediseño tema claro

**Tema**: fondo `#f0f4f8`, header oscuro `#0D1B2A` (se mantiene), cuerpo claro con tarjetas.

**Paleta de colores por proyecto** (`PROJECT_COLORS[]`, 8 colores cíclicos):
`#3B82F6, #14B8A6, #F59E0B, #A855F7, #EF4444, #10B981, #F97316, #6366F1`

**Cambios en `.ts`:**
- `getProjectColor(index)` — color cíclico del array
- `getProjectColorGlow(index)` — rgba a 38% del mismo color para `box-shadow`

**Cambios estructurales en `.html`:** `<table>` → lista de `div.project-card` con CSS Grid
`52px 1fr 200px 220px`. El `<tr>` no soporta `border-radius`; las tarjetas sí.

**Mecánica del borde lateral:**
- `[style.--proj-color]="getProjectColor(i)"` en cada tarjeta
- `::before` pseudo-element: `left:0; top:10px; bottom:10px; width:3px; border-radius:0 2px 2px 0`
  → no afecta el grid layout, solo visual
- Hover: `translateX(2px)` (sensación de anclaje al borde) + `brightness(1.035)`

**Barra de avance:** fill usa `[style.background]="getProjectColor(i)"` + `box-shadow: var(--proj-glow)`
+ animación `scaleX(0→1)` al renderizarse.

**Skeleton (modo claro):** shimmer `#b0c0d2 → #cdd9e6` sobre fondo `#e8edf3`.
Responsive: la columna AVANCE desaparece en ≤768px, RESPONSABLE en ≤520px.

### Vista 2 — `CronogramaActividades` — rediseño tema claro

**Tema general:** fondo `#f0f4f8`, `table-card` blanco, `thead` `#e2e8f0`, separadores `#e9eef4`.

**Nueva lógica de colores por jerarquía** — reemplaza la paleta BCS anterior:

| Nivel | Fondo     | Texto     | Borde izquierdo                   |
| ----- | --------- | --------- | --------------------------------- |
| 0     | `#1B263B` | `#E0E1DD` | ninguno                           |
| 1     | `#ffffff` | `#1B263B` | 3px `LEVEL1_COLORS[idx]` (sólido) |
| 2     | `#f0f4f8` | `#2d3f52` | 3px `rgba(color, 0.45)`           |
| 3+    | `#f8fafc` | `#4a6580` | 2px gris `#e9eef4` (CSS)          |

`LEVEL1_COLORS` (8 colores, cíclico): mismo array que Vista 1.

**Cambios en `rowStyleMap`:** tipo extendido con `color?: string` (el acento del nivel 1 que los hijos heredan).
`buildColorMap()` reescrito; nuevos helpers: `findAncestorColorAtLevel()`, `hexToRgba()`, `getBarFillColor()`.

**Separador de grupos:** `.lvl-1 td { border-top: 3px solid #f0f4f8; padding-top: 1rem }` — crea
brecha visual entre grupos en tabla `border-collapse: collapse` sin cambiar el DOM.

**Barra de avance:** fill = `getBarFillColor(act)` (color acento del mapa); nivel 0 (oscuro) mantiene
clases semáforo `fill-verde/azul/amarillo/rojo`.

**Fin Real:** `#1d4ed8` en fondos claros (era `#1565C0`).

**Skeleton:** shimmer `#dde5ef → #eaeff6` sobre fondo blanco.

**Drag & drop, collapse/expand, botones jerarquía: intactos.**

### Estado/badges — nueva lógica 2026-05-31

**Nueva firma:** `getEstado(act): 'CULMINADA' | 'VENCIDO' | 'EN PROGRESO'` (string literal, no objeto).

**Lógica** (usa avance recursivo, no `progressPercentage` crudo):
1. `getAvance(act) === 100` → `'CULMINADA'`
2. `!act.plannedEndDate` → `'EN PROGRESO'`
3. `new Date() > new Date(plannedEndDate)` (comparación por Date) → `'VENCIDO'`
4. Default → `'EN PROGRESO'`

**Helpers auxiliares:**
- `getEstadoCss(act)` — devuelve clase CSS: `badge-verde` / `badge-rojo` / `badge-azul`
- `getBadgeStyle(act)` — para filas oscuras (nivel 0): badges con color sólido opaco

**Colores badge fila oscura (#1B263B):**
- CULMINADA: `bg: #86efac, fg: #14532d`
- VENCIDO: `bg: #fca5a5, fg: #7f1d1d`
- EN PROGRESO: `bg: #93c5fd, fg: #1e3a5f`

**Colores badge filas claras (CSS classes):**
- `badge-verde`: `#dcfce7 / #166534`
- `badge-rojo`: `#fee2e2 / #991b1b`
- `badge-azul`: `#dbeafe / #1d4ed8`

Template: `[ngClass]="isDarkBg(act) ? '' : getEstadoCss(act)"`, `{{ getEstado(act) }}`.

---

## Sesión 2026-06-01 — Cronograma de Actividades: predecesoras + cascada

### DTOs nuevos (`features/projects/cronograma-actividades/dtos/cronograma-actividades.dtos.ts`)

`ActividadDto` ampliado con dos campos:
- `predecesoras: number[]` — IDs de actividades predecesoras
- `esPadre: boolean` — true si la actividad tiene hijos (calculado por el backend)

Nuevos interfaces:
```ts
CascadaCambioDto { projectActivityId, activityDescription,
                   inicioAnterior, inicioNuevo, finAnterior, finNuevo }
CascadaResultDto { hayCambios: boolean, cambios: CascadaCambioDto[] }
ActualizarPredecesorasResultDto { projectActivityId, predecesoras, previewCascada: CascadaResultDto }
```

### Endpoints nuevos

```
PUT  /api/v1/cronograma-actividades/actividades/{id}/predecesoras
     body: { predecessorIds: number[] }
     response: ActualizarPredecesorasResultDto

POST /api/v1/cronograma-actividades/{proyectoId}/recalcular-cascada/preview
     response: CascadaResultDto

POST /api/v1/cronograma-actividades/{proyectoId}/recalcular-cascada/aplicar
     response: CascadaResultDto
```

### Selector de predecesoras (modal editar — solo hojas)

Visible cuando `modalMode === 'editar' && !editandoAct?.esPadre`.

- `formPredecesoras: number[]` — IDs seleccionados; se inicializa con `act.predecesoras ?? []` al abrir.
- `predSearch: string` — campo de búsqueda con autocomplete.
- `filtrarPredecesoras()` — filtra actividades hoja, excluye la actividad en edición, sus descendientes y las ya seleccionadas. Retorna hasta 8 resultados que coincidan por número de orden o descripción.
- `getPredChipLabel(pid)` — `"N — descripción"` usando `getDisplayIndex`.
- `agregarPredecesora(act)` — push a `formPredecesoras`, limpia `predSearch`.
- `quitarPredecesora(id)` — filter de `formPredecesoras`.
- `getDescendantIds(actId)` — BFS de descendientes (para excluirlos del selector).

Fechas programadas deshabilitadas (`[disabled]="!!editandoAct?.esPadre"`) y con clase `field-input-readonly` cuando `esPadre`. Hint "Calculado automáticamente desde las actividades hijas" visible en ese caso.

### Modal de cascada

Estado: `cascadaModalOpen = false`, `cascadaPreview: CascadaResultDto | null`, `aplicandoCascada = false`.

- `mostrarCascadaSiHayCambios(preview)` — si `preview.hayCambios` abre el modal.
- `aplicarCascada()` — POST `/aplicar`; por cada `CascadaCambioDto` en `result.cambios`, patch quirúrgico `plannedStartDate`/`plannedEndDate` en `this.actividades` por `projectActivityId` → `buildAvanceMap()` + `buildColorMap()` → `cdr.detectChanges()` → cierra modal.
- `cancelarCascada()` — cierra el modal sin tocar datos.

HTML: overlay `*ngIf="cascadaModalOpen"` (no cierra al click en backdrop — requiere decisión explícita), box `.cascada-modal-box` 700px, header `#1B263B`, tabla scrolleable (`max-height: 320px`) con columnas **Actividad / Inicio ant→nuevo / Fin ant→nuevo**. Cada celda de fecha contiene `<div class="cascada-fecha-inner">` (`flex-direction: column`): fecha anterior tachada en gris → `↓` → fecha nueva en azul bold. **CSS clave**: `.cascada-td-fecha { display: table-cell; min-width: 120px }` — el `display: table-cell` es explícito para evitar que un reset o herencia flex anule el comportamiento de celda. Footer `[Cancelar] [Aplicar cambios]`, ambos `disabled` mientras `aplicandoCascada`.

### Badge de predecesoras en tabla

`getPredTooltip(act)` — retorna `"Predecesoras: N. nombre, ..."` para el tooltip nativo.

Badge `← N` (donde N = cantidad) dentro de `.actividad-cell`, tras el texto de la actividad:
```html
<span *ngIf="act.predecesoras?.length" class="pred-badge" [title]="getPredTooltip(act)">
  ← {{ act.predecesoras.length }}
</span>
```
CSS `.pred-badge`: píldora `#dbeafe / #1d4ed8`, `0.65rem`, `font-weight: 700`. Variante `.row-dark .pred-badge`: `rgba(219,234,254,0.18) / #93c5fd`.

### Bug fix — predecesoras silenciosamente borradas al guardar

`cerrarModal()` resetea `this.formPredecesoras = []`. El flujo en `guardar()` llamaba `cerrarModal()` **antes** de llamar a `actualizarPredecesoras()`, por lo que el PUT llegaba con `predecessorIds: []` siempre.

**Fix**: capturar en variables locales inmutables antes del `cerrarModal()`:
```ts
const actividadId  = this.editandoId!;
const predSnapshot = [...this.formPredecesoras];
```
Todas las llamadas async posteriores usan `actividadId` y `predSnapshot` en vez de `this.editandoId` / `this.formPredecesoras`.

---

## Sesión 2026-06-01 (cont.) — Reorganización feature-local + fix modal cascada

### Reorganización a arquitectura por feature

`cronograma-actividades` y `projects-dashboard` migrados de arquitectura por capas a arquitectura por feature. Archivos eliminados de `core/`; movidos a subcarpetas locales `dtos/` y `services/` dentro de cada feature.

**Cronograma de Actividades — estructura final:**
```
features/projects/cronograma-actividades/
  ├── dtos/cronograma-actividades.dtos.ts     ← interfaces extraídas del service original
  ├── services/cronograma-actividades.service.ts
  ├── cronograma-actividades.ts / .html / .css
  └── proyectos-cronograma-list.ts / .html / .css
```
Eliminado: `core/services/cronograma-actividades.service.ts`.

**Projects Dashboard — estructura final:**
```
features/projects/projects-dashboard/
  ├── dtos/projectsDashboard.model.ts
  ├── services/projects-dashboard.service.ts
  └── projects-dashboard.ts / .html / .css
```
Eliminados: `core/services/projects-dashboard.service.ts`, `core/dtos/projects-dashboard/projectsDashboard.model.ts` (+ carpeta vacía).

Imports actualizados en `cronograma-actividades.ts`, `proyectos-cronograma-list.ts`, `projects-dashboard.ts`. El `projects-dashboard.service.ts` también actualizó su import interno al modelo (de `../dtos/...` relativo a `core/` → `../dtos/projectsDashboard.model` relativo a `services/`).

### Fix modal cascada — columna Fin aparecía vacía

**Causa raíz**: `.cascada-td-fecha { display: flex }` aplicado directamente al `<td>` anulaba `display: table-cell`, colapsando ambas celdas de fecha en la misma columna visual.

**Fix**:
- Eliminado `display: flex` del `<td>`. Agregado `display: table-cell` explícito + `min-width: 120px`.
- Contenido interno envuelto en `<div class="cascada-fecha-inner">` (`display: flex; flex-direction: column`).
- Flecha `→` (SVG horizontal) cambiada a `↓` (`<span class="cascada-arrow">`).

**Regla general**: nunca poner `display: flex` directamente en `<td>` — usa un `<div>` wrapper interno.

---

## Sesión 2026-06-01 (cont.) — Cronograma: edición inline, línea base, semáforo, predecesoras, comportamiento de filas

### Feature 1 — Edición inline de fechas (popover flotante)

Doble click en celdas **Inicio Prog.**, **Fin Prog.**, **LB Inicio**, **LB Fin** abre un popover flotante (no expande la celda):

- `startInlineEdit(act, field, event)`: captura `getBoundingClientRect()` de la celda, calcula posición con flip inteligente (si cerca del borde derecho → abre a la izquierda; cerca del fondo → abre hacia arriba). Guarda `inlinePopoverPos: { top, left }`.
- Popover: `position: fixed; z-index: 901`, `width: 240px`, border-top `--azul`, sombra `abril-prussian`. Contiene: label del campo, `<input type="date">`, botones "✓ Confirmar" y "✗ Cancelar".
- Backdrop: `position: fixed; inset: 0; z-index: 900` — click fuera cierra sin guardar.
- Enter / click ✓ → `commitInlineEdit()` → `editarActividad` (fechas programadas) o `actualizarLineaBase` (LB). Para LB: si ya tenía fecha, Swal de advertencia antes de guardar.
- Escape / click ✗ / click fuera → `cancelInlineEdit()`.
- Modo lectura: icono lápiz 11px aparece con `opacity: 0 → 0.75` al hover (`.fecha-edit-icon`). Celda en edición: fecha aparece en gris (`.td-fecha-editing .fecha-text { color: #9ca3af }`).
- `@ViewChild('popoverDateInput')` para autofocus al abrir.

**DTOs**: `ActividadDto` ampliado con `baselineStartDate?: string | null` y `baselineEndDate?: string | null`.

**Service**: `actualizarLineaBase(id, body: { baselineStartDate, baselineEndDate }): Observable<void>` → `PATCH /actividades/{id}/linea-base`.

### Feature 2 — Toggle Línea Base

Botón "Línea Base" en toolbar (`btn-secondary` + `.btn-lb-on` cuando activo). Cuando ON, aparecen 5 columnas extra en la tabla después de "Fin Prog.":

| Columna | Descripción |
|---|---|
| LB Inicio | `baselineStartDate` — editable inline (hojas) |
| LB Fin | `baselineEndDate` — editable inline (hojas) |
| Desfase Ini. | `prog - lb` días; promedio en padres |
| Desfase Fin | `prog - lb` días; promedio en padres |
| Semáforo | verde ≤0d, amarillo 1–7d, rojo >7d |

- `getDesfaseDias(act, 'start'|'end')`: hojas → diferencia directa; padres → promedio hijos.
- `formatDesfase(dias)`: `+5d` / `-3d` / `0d` / `—`.
- `getDesfaseClass(dias)`: `desfase-ok` / `desfase-warn` / `desfase-late`.
- `getSemaforoClass(act)`: hojas → por desfase fin; padres → peor semáforo de hijos (recursivo). Dot 11px con box-shadow de color.

### Feature 3 — Predecesoras mejoradas

**Bug chips sin botón ×**: `.pred-chip { overflow: hidden }` clipeaba el botón. Fix: texto envuelto en `.pred-chip-label` con `overflow: hidden; text-overflow: ellipsis; min-width: 0`. El botón vive fuera del span recortado → siempre visible.

**Navegación por teclado en dropdown**: `predDropdownIdx = -1` + `@ViewChild('predInput')`. Handler `onPredKeydown(event)`:
- `↓` / `↑`: mueven el highlight saltando items deshabilitados; `scrollIntoView({ block: 'nearest' })`.
- `Enter`: selecciona el item activo si no está deshabilitado.
- `Escape`: limpia `predSearch` y cierra el dropdown.
- Tras `agregarPredecesora`: resetea índice + refocus al input para agregar siguiente.

**Búsqueda exacta por número**: si el input es solo dígitos (`/^\d+$/.test(term)`), hace match exacto de `String(getDisplayIndex(a)) === term`. Si no hay coincidencia exacta, fallback a búsqueda parcial por nombre.

**Items deshabilitados con hint**: `filtrarPredecesoras()` retorna `PredResultItem[] { act, disabled, hint }`. Muestra toda actividad que hace match:
- Es descendiente del nodo editado → `disabled: true, hint: 'Es descendiente'`
- `wouldCreateCycle()` (BFS por grafo de predecesoras) → `disabled: true, hint: 'Crearía un ciclo'`
- `[disabled]="item.disabled"` en el `<button>` + `.pred-result-disabled` con cursor not-allowed + `.pred-result-hint` en itálica gris.

**Nodos padre con predecesoras** (cambio de restricción):
- Sección predecesoras del modal ahora visible para TODOS los nodos (`*ngIf="modalMode === 'editar'"` sin `&& !editandoAct?.esPadre`).
- `filtrarPredecesoras`: eliminada la línea que deshabilitaba items con `esPadre=true`.
- `guardar()`: `if (predCambiaron)` sin guarda `!esPadre` — padres guardan sus predecesoras igual que las hojas.
- Badge `← N` ya sin restricción de `esPadre` (siempre fue `*ngIf="act.predecesoras?.length"`).

### Feature 4 — Click simple / doble click en filas

- **Click simple** → `abrirModalEditar(act)` (todos los nodos, incluido nivel 1).
- **Doble click** → `abrirGanttModal(act)`.
- **Mecanismo**: `rowClickTimer` de 250ms. `onRowClick` programa el modal con delay cancelable. `onRowDblClick` cancela el timer y abre el Gantt directamente.
- `(dblclick)="onRowDblClick(act)"` añadido al `<tr>`.
- Elementos con `stopPropagation` propio (chevron, botones de nivel, drag handle, celdas fecha-editable de hojas) no se ven afectados.

### CSS — budget Angular

`anyComponentStyle` subido de `20kB → 28kB` en `angular.json` para acomodar el crecimiento del CSS del cronograma (actualmente ~21kB tras agregar estilos de popover, línea base, semáforo y predecesoras).

---

## Sesión 2026-06-06 — Habilitación: multi-archivo staging + vigencia contratista + entregables mensuales

### Upload multi-archivo (empresa, trabajadores, equipos)

**Patrón anterior eliminado**: `panelArchivoUrl: string`, `panelArchivoNombre: string`, `uploadingFile: boolean`, `autoMarcarEnviado()`, `subirArchivo()` en upload zone.

**Nuevo patrón** (`ArchivoStagingDto` en `trabajador.model.ts`):
```ts
interface ArchivoStagingDto { file: File; nombre: string; path?: string; esZip: boolean; zipContenido?: string; subiendo: boolean; error: boolean; }
```
- Los 3 componentes tienen `archivosPendientes: ArchivoStagingDto[]`.
- `onFileSelected()` acepta múltiples archivos (input con `multiple`) y los agrega al array local.
- Botón ENVIAR llama `enviarDocumento()` → sube secuencialmente con `subirArchivoMultiple()` → llama `sharepointService.enviarDocumento()` al terminar.
- `quitarArchivo(idx)` elimina del array.
- **Nuevos endpoints** en `sharepoint-upload.service.ts`: `POST /archivos/subir-multiple`, `POST /archivos/enviar`.

### Vigencia contratista

Los 3 componentes muestran siempre el campo vigencia en la sección contratista:
- `requiereVigencia = true` → `<input type="date">` editable.
- `requiereVigencia = false` → `<span>` con fecha formateada o "—".
- `esPermanente` (empresa itemId 12/13) → texto "Permanente", input deshabilitado.

Lógica en `enviarDocumento()`:
- Contratista + requiereVigencia → envía `panelVigencia`.
- Admin → envía `panelVigencia`.
- Contratista + !requiereVigencia → `undefined` (backend calcula).

### Entregables mensuales (empresa.ts / empresa.html)

**Nuevos DTOs** en `empresa.model.ts`:
- `EntregableMesDto { id, mes, anio, estado, vigencia?, archivoUrl?, obsAbril?, obsContratista?, motivoRechazo? }`.
- `EmpresaEntregableDto` extendido: `esMensual: boolean`, `motivoRechazo?`, `meses: EntregableMesDto[]`.
- `EmpresaEntregableUpdateDto` extendido: `motivoRechazo?`, `mes?`, `anio?`.

**Nuevas propiedades en empresa.ts**:
- `mesSeleccionado: EntregableMesDto | null` — mes activo en el selector.
- `mesPanelMes: number` (0-indexed), `mesPanelAnio: number` — mes/año del selector.
- `mesesNombres[]`, getters `mesesDisponibles` (últimos 12 meses), `mesActualLabel`.

**Drawer empresa — bloques mensuales**:
- **Contratista + esMensual**: selector de mes (`onMesChange(mes, anio)`), info de estado del mes seleccionado (si ya aprobado/rechazado → bloque bloqueado), zona de upload, textarea obs. Botón ENVIAR = "ENVIAR {mesActualLabel}"; disabled si mes ya aprobado/rechazado.
- **Admin + esMensual**: tabla de meses con columnas Mes/Estado/Acciones. Por cada mes en estado `Enviado`: botones ✓ (`aprobarMesEspecifico`) y ✕ (`rechazarMesEspecifico`). Motivo de rechazo en tooltip.
- Bloques no-mensuales: condición añadida `&& !selectedEntregable.esMensual`.

**Nuevos métodos en empresa.ts**:
- `onMesChange(mes, anio)`: actualiza selector + busca `mesSeleccionado` en `e.meses`.
- `aprobarMesEspecifico(mes: EntregableMesDto)`: Swal confirm → `habEmpresaService.aprobarMes(empresaId, mes.id, { estado:'Aprobado', vigencia? })`.
- `rechazarMesEspecifico(mes: EntregableMesDto)`: Swal textarea → `habEmpresaService.aprobarMes(empresaId, mes.id, { estado:'Rechazado', motivoRechazo })`.
- `eliminarArchivoVersion(archivoId)`: Swal confirm → `habEmpresaService.eliminarArchivo(archivoId)`.

**Nuevos métodos en `hab-empresa.service.ts`**:
- `getMesesEntregable(empresaId, itemId, proyectoId)` → `GET /empresas/{id}/entregables/{itemId}/meses`.
- `aprobarMes(empresaId, entregableId, dto)` → `PATCH /empresas/{id}/entregables/{entregableId}/mes`.
- `eliminarArchivo(archivoId)` → `DELETE /archivos/{archivoId}`.

### Bandeja — badge meses pendientes

`BandejaItemDto` extendido con `itemId?`, `esMensual?`, `mes?`, `anio?`, `mesesPendientes?`.

En `bandeja.html`, debajo del nombre del entregable:
```html
<span *ngIf="item.esMensual && item.mesesPendientes > 1" class="btn-chip chip-orange">
  {{ item.mesesPendientes }} meses pendientes
</span>
```

### CSS añadido

En `empresa.css`, `trabajadores.css`, `equipos.css`:
- `.archivo-list`, `.archivo-item`, `.archivo-item--subiendo`, `.archivo-item--error`
- `.archivo-nombre`, `.archivo-zip-badge`, `.archivo-estado`, `.archivo-estado--error`

En `empresa.css` además: `.mes-estado-aprobado/enviado/rechazado/falta`.

**Commit**: `d763264` en master.

---

## Sesión 2026-06-06 (v2) — Empresa mensual: UX, bugs, drag&drop, validaciones

### Dropdown selector de mes
- Reemplazado `<select>` por dropdown custom con backdrop invisible (click-outside), dot de color + estado por mes.
- `mesDropdownOpen`, `getMesEstado(mes,anio)`, `toggleMesDropdown()`, `cerrarMesDropdown()`, `seleccionarMes(mes,anio)` en `empresa.ts`.
- Clases CSS: `.mes-dropdown`, `.mes-dropdown-trigger`, `.mes-dropdown-list`, `.mes-dropdown-item--active`, `.mes-estado-dot`, `.mes-estado-label`.

### Historial de envíos inline (solo mensual)
- Botón toggle "Ver historial de envíos" en footer del drawer; panel inline con `*ngFor` de versiones ordenadas por `createdAt` desc.
- `historialVersiones`, `loadingHistorial`, `mostrarHistorial`, `cargarHistorial()` en `empresa.ts`.
- Para no-mensuales: mantiene modal `VersionesDoc` genérico.

### Admin tabla de meses
- Celda "Ver" → `*ngFor` sobre `m.archivos[]`; fallback a `m.archivoUrl` con `ng-template #archivoFallback`.
- Botones APROBAR/RECHAZAR del footer deshabilitados con `*ngIf="!selectedEntregable.esMensual"`.

### Bug — mes incorrecto al enviar
- `mesFijo` y `anioFijo` capturados ANTES del async en `enviarDocumento()`.
- `recargarEntregables()` extendido con `afterLoad?: (list) => void` callback.
- En `next` de `enviarDocumento`: captura `itemIdFijo = selectedEntregable.itemId` antes de `closeDrawer()`, llama `recargarEntregables(callback)` donde el callback busca el entregable fresco y restaura `mesPanelMes`/`mesPanelAnio`/`mesSeleccionado`.

### Bug — archivos del mes no visibles
- `recargarEntregables` ahora llama `afterLoad?.(list)` después de actualizar `selectedEntregable`/`mesSeleccionado`.
- `this.entregables = [...list]` (nueva referencia) + `detectChanges()` adicional fuerzan re-render inmediato de la lista.

### Drag & drop
- `_dropJustHappened` flag: bloquea `triggerFileInput()` 300ms post-drop para evitar que el browser abra el picker.
- `onDrop()`: `stopImmediatePropagation()` + reset del fileInput value + flag.
- Drop zones: `(click)` movido al `div.upload-empty` interior (no en el contenedor de drag).
- `console.log` de diagnóstico agregado en `onDragOver`/`onDrop` (pendiente quitar en prod).

### Validación de extensiones en addFiles()
- Extensiones permitidas: `.pdf,.jpg,.jpeg,.png,.docx,.xlsx,.csv` (sin `.zip`).
- Archivo rechazado → `Swal.fire` warning + `continue` (no se agrega al staging).
- `accept` del input actualizado a las mismas extensiones.

### Fix eliminarArchivo URL
- `hab-empresa.service.ts`: `eliminarArchivo(empresaId, archivoId)` → `DELETE /empresas/{empresaId}/archivos/{archivoId}`.
- `empresa.ts`: llama `eliminarArchivo(this.empresaId!, archivoId)`.

### Backend (commits previos)
- `EnviarDocumentoRequest`: campos `Mes?` y `Anio?` agregados.
- `ArchivoHabilitacionController.Enviar()`: cuando `Mes`/`Anio` presentes → `CrearOActualizarEntregableMesAsync` en vez de `FindAsync`; `version.HabEmpresaId = ent.Id`.
- `IHabEmpresaRepository` inyectado en el controller.
- `HabEmpresaRepository.GetEntregablesEmpresaAsync`: archivos de cada `EntregableMesDto` con fallback al registro base (datos legacy).

**Commit frontend**: pendiente (esta sesión).
