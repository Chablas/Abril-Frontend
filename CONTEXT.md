# CONTEXT.md — Abril Frontend

Contexto operativo para sesiones de Claude Code. Complementa a `CLAUDE.md` (que se carga automáticamente) con info de implementación, decisiones, estado de módulos y atajos para no escanear el código entero.

> **Convenciones**: rutas tipo `path/file.ts:NN` apuntan al archivo y línea referida.
> El idioma de la UI es **español (es-PE)**; títulos en `route.data.titulo` van en MAYÚSCULAS.
> **Última actualización**: 2026-07-15 — Movido el componente "Cronograma de Hitos" (`milestone-schedule`) de Proyectos a Mejora Continua: nueva ruta `/mejora-continua/milestone-schedule`, featureKey renombrado, menú y 8 tab-bars actualizados.

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

## REGLAS DE CODIFICACIÓN (obligatorias en todo código nuevo)

### R1 — 1 acción de usuario = 1 llamada HTTP
Cada acción (ngOnInit de una página, click en detalle, cambio de filtro, cambio de página)
debe hacer **una sola llamada HTTP**. Nunca dos llamadas en paralelo ni secuenciales
para construir la misma vista.

```typescript
// PROHIBIDO en ngOnInit
this.service.getDatos(page).subscribe(...);
this.service.getFiltros().subscribe(...);  // segunda llamada prohibida

// CORRECTO — el backend devuelve todo junto
this.service.getDatosConFiltros(page).subscribe(res => {
  this.datos = res.data;
  this.filtros = res.filtros;
});
```

### R2 — Sin llamadas anidadas
Prohibido hacer una llamada HTTP y dentro del subscribe hacer otra.

```typescript
// PROHIBIDO
this.service.getProyecto(id).subscribe(proyecto => {
  this.service.getActividades(proyecto.id).subscribe(...); // llamada anidada prohibida
});

// CORRECTO — el endpoint GET /proyecto/{id} ya trae las actividades incluidas
this.service.getProyectoConActividades(id).subscribe(...);
```

### R3 — Estructura por features
DTOs y services van en `features/<nombre-feature>/dtos/` y `features/<nombre-feature>/services/`.
No agregar nada nuevo en `core/dtos/` ni `core/services/`.

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
            └── shared/           # utils del módulo (no UI compartida global)
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

#### Flujo aprobación unitaria (sin cambios)

- **TRABAJADOR/EMPRESA/EQUIPO**: Swal input vigencia → `bandejaService.aprobarXxx(id, { vigencia })`.
- **INDUCCION**: Swal sin vigencia → `bandejaService.aprobarInduccion(id)`.

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
3. Upload → `subirArchivo()` → `res.path` asignado a `panelArchivoUrl` → `autoMarcarEnviado()` (PUT inmediato estado='Enviado').
4. `actualizarEntregableLocal(updates)`: `findIndex` en `entregables[]` → spread merge → actualiza `selectedEntregable` — **sin reload** de la lista completa.
5. Campo observaciones unificado: `panelObsAbril` sirve para ambos roles. Payload envía como `obsContratista` (si es contratista) o `obsAbril` (si es admin).
6. Rama contratista en `guardarEntregable()`: payload solo con `{ archivoUrl?, vigencia?, obsContratista? }` — sin `estado` ni campos admin. Sin botón "ENVIAR DOCUMENTO" (eliminado); flujo es auto-save en upload.
7. Botón GUARDAR (admin): habilitado si no se requiere vigencia, o si `panelVigencia` está completo.

**Historial de versiones**: `versionesLoader = (id) => equipoService.getVersiones(id)` pasado a `<app-hab-versiones-doc [loader]="versionesLoader">`. `VersionesDoc` es el mismo componente genérico que usa Trabajadores.

**`vigencia` sin requiereVigencia**: el payload envía `'2040-12-31'` como fecha dummy cuando `requiereVigencia === false`.

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

## Sesión 2026-06-02 — Arquitectura, contratos API y rediseños UI

### Reglas de codificación establecidas (ver sección §REGLAS al inicio)
- R1: 1 acción de usuario = 1 llamada HTTP
- R2: Sin llamadas anidadas en subscribe
- R3: Estructura por features — DTOs y services en features/<nombre>/

### Fixes de llamadas múltiples
- CronogramaActividades ngOnInit: 2 llamadas → 1
  (getActividades ahora devuelve `{ proyecto, actividades }` — loadProyectos() eliminado)
- CronogramaActividades guardar() editar: 2 llamadas → 1
  (predecessorIds van en el body del PUT, cascada viene en el response)
- ProjectsDashboard ngOnInit: forkJoin eliminado → 1 llamada
  (getDashboard() devuelve filtros incluidos en el response)

### Nuevos DTOs agregados (cronograma-actividades.dtos.ts)
- `ProyectoCronogramaHeaderDto` `{ projectId, projectDescription, responsableUdp, fechaInicio }`
- `ActividadesProyectoResponseDto` `{ proyecto, actividades }`
- `EditarActividadRequest` — extendido con `predecessorIds?: number[] | null`
- `EditarActividadResultDto` `{ actividad, cascada: CascadaResultDto | null }`

### Nuevos DTOs agregados (projectsDashboard.model.ts)
- `ProjectsDashboardResponseDto` — extiende `ProjectsDashboardDTO` con campo `filtros: ProjectsDashboardFiltersDTO`

### Badge predecesoras
- Antes: mostraba conteo `← 1`
- Ahora: muestra número de orden `← 45` o `← 45, 76` o `← 45, 76 +1`
- `getPredecessorasLabel(act)` en `cronograma-actividades.ts` — usa `getDisplayIndex` (posición 1-based en array, igual que el tooltip)

### Rediseño plantilla de hitos (milestone-schedule)
- Quitado botón "Nuevo hito" en vista plantilla (`*ngIf="!noMilestones"`)
- Chip `PLANTILLA` junto al nombre del proyecto (solo visible cuando `noMilestones && undatedTasks.length > 0`)
- Subheader stats: `X hitos · X con fecha · X sin fecha · [barra 3px] X%`
- Layout compacto tipo tabla: `# | Hito | Inicio | Fin | Estado`
- Fechas como puntos de referencia (sin semáforo vencido/programado)
- Badge binario: `Con fecha` / `Sin fecha`
- Filtros: Todos / Sin fecha / Con fecha
- Búsqueda client-side por nombre del hito
- Propiedades de tarea renombradas: `plannedStart/plannedEnd` → `startDate/endDate`
- Métodos: `tieneFecha()`, `hitosFiltrados`, `statConFecha`, `statSinFecha`, `pctConFecha`, `onFechaChange()`

### Reestructura carpetas (confirmado en esta sesión)
- `cronograma-actividades/dtos/` y `cronograma-actividades/services/` separados de `core/`
- `projects-dashboard/dtos/` y `projects-dashboard/services/` separados de `core/`

---

## Sesión 2026-06-07 — Cronograma de Actividades: bug fix date picker, duración, PDF, padresActualizados

### 1. Bug fix — `commitInlineEdit()`: date picker nativo no disparaba `input`

**Problema**: el popover de edición inline usaba `[(ngModel)]="inlineEditValue"` en `<input type="date">`. El date picker nativo del browser dispara `change` (no `input`) al seleccionar una fecha sin hacer blur primero. Angular's `DefaultValueAccessor` solo escucha `input`, por lo que `inlineEditValue` nunca se actualizaba → payload enviaba `plannedEndDate: null`.

**Fix aplicado** (`cronograma-actividades.html`):
```html
<!-- antes -->
[(ngModel)]="inlineEditValue"

<!-- después -->
[value]="inlineEditValue"
(change)="inlineEditValue = $any($event.target).value"
(input)="inlineEditValue = $any($event.target).value"
```

**Regla derivada**: en cualquier `<input type="date">` donde el valor se necesite capturar en tiempo real (sin esperar blur), usar siempre `(change)` + `(input)` en lugar de solo `[(ngModel)]`.

**Fix secundario en el mismo commit**: guard `inlineEditInFlight` para evitar múltiples PUT por Enter + click simultáneo. La propiedad `private inlineEditInFlight = false` se setea antes del HTTP call y se resetea en `next`/`error`.

---

### 2. Columna DURACIÓN en la tabla

**Posición**: entre "FIN PROG." y las columnas de Línea Base.

**Método** (`cronograma-actividades.ts`):
```ts
getDuracion(act: ActividadDto): number | null {
  if (!act.plannedStartDate || !act.plannedEndDate) return null;
  const diff = new Date(act.plannedEndDate.slice(0,10)).getTime()
             - new Date(act.plannedStartDate.slice(0,10)).getTime();
  return Math.abs(Math.round(diff / 86400000)) + 1;
}
```

- Aplica a todos los nodos (padres e hijos).
- Sin fechas → muestra `"—"`.
- Formato: `"Nd"` (ej. `"45d"`).
- CSS: `.col-dur { width: 80px }`, `.td-dur { text-align: center }`.
- Columna también incluida en el skeleton de carga (mantiene alineación de columnas).

---

### 3. Export PDF client-side (`exportarPDF()`)

**Botón**: toolbar entre "Importar desde MS Project" y "Nueva Actividad". Siempre visible (no depende de `esAdmin`).

**Implementación** (`cronograma-actividades.ts`, al final del componente):
- `jsPDF('l', 'mm', 'a4')` — landscape A4.
- Header: rect `#1B263B` + texto `#E0E1DD`, nombre del proyecto (izq) y fecha de exportación `dd/mm/yyyy` (der).
- Columnas base siempre: `#, Actividad, Inicio Prog., Fin Prog., Duración, Avance%, Estado`.
- Columnas LB solo si `this.lineaBaseVisible === true`: `LB Inicio, LB Fin, Desfase Ini., Desfase Fin., Semáforo`.
- Itera `this.actividades` completo (sin filtrar por `collapsedIds`).
- Jerarquía visual: indenta `act.activityDescription` con `'  '.repeat(act.hierarchyLevel)` (2 espacios por nivel).
- Semáforo: texto `'Verde'`/`'Amarillo'`/`'Rojo'` (no se puede renderizar el dot CSS en jsPDF).
- Colores en `didParseCell`: estado y semáforo con `textColor` RGB.
- Nombre de archivo: `{projectDescription}_cronograma_{yyyy-mm-dd}.pdf` (caracteres especiales sanitizados).
- **0 llamadas HTTP** (R1 cumplido).
- No toca `buildColorMap()`, `buildAvanceMap()`, `buildParentIds()`.

---

### 4. Modal Nueva Actividad — campo Duración complementario

**Solo visible** cuando `modalMode === 'crear'`. Posición: alineado bajo "Fin Programado" (segunda columna del `field-row`).

**Variable de estado** (propiedad del componente):
```ts
nuevaDuracionDias: number | null = null;
```
Reseteada en `abrirModalCrear()` y `cerrarModal()`.

**Flujo bidireccional**:
- Usuario cambia "Fin Programado" → `onFormPlannedEndChange(val)` actualiza `formPlannedEnd` y recalcula `nuevaDuracionDias`.
- Usuario escribe en "Duración" → `onNuevaDuracionChange(val)` actualiza `nuevaDuracionDias` y recalcula `formPlannedEnd`.

**Cálculo timezone-safe** (usa `new Date(y, m-1, d)` en hora local, no UTC):
```ts
onFormPlannedEndChange(val: string): void {
  this.formPlannedEnd = val;
  if (!this.formPlannedStart || !val || val.length < 10) { this.nuevaDuracionDias = null; return; }
  const [sy,sm,sd] = this.formPlannedStart.split('-').map(Number);
  const [ey,em,ed] = val.split('-').map(Number);
  const diff = Math.round((new Date(ey,em-1,ed).getTime() - new Date(sy,sm-1,sd).getTime()) / 86400000) + 1;
  this.nuevaDuracionDias = diff >= 1 ? diff : null;
}

onNuevaDuracionChange(val: string): void {
  const n = parseInt(val, 10);
  this.nuevaDuracionDias = isNaN(n) || n < 1 ? null : n;
  if (!this.formPlannedStart || this.nuevaDuracionDias === null) return;
  const [y,m,d] = this.formPlannedStart.split('-').map(Number);
  const end = new Date(y, m-1, d);
  end.setDate(end.getDate() + this.nuevaDuracionDias - 1);
  this.formPlannedEnd = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
}
```

**Input "Fin Programado"**: reemplazado `[(ngModel)]` por `[ngModel]` + `(change)` + `(input)` (mismo patrón que el fix del popover inline).

**No toca** `guardar()`, la lógica de submit, ni métodos fuera del modal.

---

### 5. Patch local `padresActualizados` en crear/editar

**Motivación**: el backend puede actualizar el campo `esPadre`, `progressPercentage` u otros campos de los nodos padre cuando se crea/edita un hijo. El frontend aplica un patch quirúrgico sobre cada padre devuelto para mantener la tabla consistente sin recargar.

**DTOs actualizados** (`cronograma-actividades.dtos.ts`):
```ts
export interface CrearActividadResultDto {
  actividad: ActividadDto;
  padresActualizados?: ActividadDto[];
}

export interface EditarActividadResultDto {
  actividad: ActividadDto;
  cascada: CascadaResultDto | null;
  padresActualizados?: ActividadDto[];   // ← nuevo
}
```

**Servicio**: `crearActividad()` cambia de `Observable<ActividadDto>` a `Observable<CrearActividadResultDto>`.

**Patrón de patch** (aplicado en `guardar()` rama crear y rama editar):
```ts
(res.padresActualizados ?? []).forEach((padre) => {
  const idx = this.actividades.findIndex(a => a.projectActivityId === padre.projectActivityId);
  if (idx !== -1) this.actividades[idx] = { ...this.actividades[idx], ...padre };
});
```

- En **editar**: se aplica después de `patchActividadLocal(res.actividad)`, antes de `buildAvanceMap()`.
- En **crear**: se aplica antes de `cerrarModal(); this.recargar()` (el `recargar()` posterior reconcilia cualquier estado).
- **0 llamadas HTTP adicionales** (R1 cumplido). No toca funciones protegidas.

---

## Sesión 2026-06-24 — Dashboard UDP (cronograma-dashboard)

### Resumen
Nuevo módulo de dashboard ejecutivo para gerencia, accesible en `/projects/cronograma-dashboard`.
Diseñado con referencia visual tipo Power BI en Claude Design antes de implementar en Angular.

### Archivos creados (Frontend)

features/projects/cronograma-dashboard/
  ├── dtos/cronograma-dashboard.dtos.ts
  ├── services/cronograma-dashboard.service.ts
  ├── cronograma-dashboard.ts
  ├── cronograma-dashboard.html
  └── cronograma-dashboard.css

### DTOs

CronogramaDashboardKpisDto {
  totalProyectos, porcentajeAvancePromedio, proyectosAlDia,
  proyectosConRetraso, proyectosSinActividades, actividadesVencidas,
  actividadesCulminadasEstaSemana, actividadesCulminadasEsteMes
}

CronogramaDashboardProyectoDto {
  projectId, projectDescription, responsableUdp,
  totalActividades, culminadas, enProceso, vencidas, pendientes,
  porcentajeAvance, diasRetraso,
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO',
  estado: 'AL_DIA' | 'CON_RETRASO' | 'SIN_ACTIVIDADES'
}

CronogramaDashboardResponsableDto { userId, nombreCompleto }
CronogramaDashboardResponseDto { kpis, proyectos, responsables }

### Endpoint backend

GET /api/v1/cronograma-actividades/dashboard?responsableId=&estado=

Devuelve en una sola query: KPIs globales + lista de proyectos con avance calculado + lista de responsables para filtro.

KPIs globales:
- TotalProyectos — proyectos UDP activos con al menos 1 actividad
- PorcentajeAvancePromedio — promedio del avance nivel 0 por proyecto
- ProyectosAlDia — sin actividades vencidas
- ProyectosConRetraso — con al menos 1 actividad vencida (plannedEndDate < hoy y actualEndDate IS NULL)
- ProyectosSinActividades — proyectos UDP activos sin actividades
- ActividadesVencidas — total global
- ActividadesCulminadasEstaSemana / EsteMes

Por proyecto:
- Semáforo: VERDE (0 días retraso) / AMARILLO (1-7 días) / ROJO (>7 días)
- DiasRetraso: MAX días de retraso entre actividades vencidas del proyecto
- Avance: igual que getAvance() del cronograma (actualEndDate != null → 100, sino progressPercentage)

### Diseño visual

- Fondo general: #f0f4f8
- KPI cards: fondo blanco, border-top: 4px solid <color-acento>, sin sombra
- Filas CON_RETRASO en tabla: fondo #FFF5F5
- Barra de avance: verde ≥75%, azul ≥50%, naranja ≥25%, rojo <25%
- Semáforo: círculo 10px de color sólido
- Actividades en tabla: formato total / culminadas / vencidas
- Click en fila navega a /projects/cronograma-actividades/:projectId
- Skeleton shimmer mientras carga

### Routing y navegación

- Ruta: cronograma-dashboard en proyectos-routing-module.ts
- featureKey: projects.cronograma-dashboard
- titulo: DASHBOARD UDP
- roles: ['USUARIO DE UDP', 'ADMINISTRADOR DE UDP']
- Navigation item: { label: 'Dashboard UDP', route: '/projects/cronograma-dashboard', featureKey: 'projects.cronograma-dashboard' }

### SQL aplicado (defaultdb_local — PostgreSQL 17)

INSERT INTO feature (feature_key, module_id)
VALUES ('projects.cronograma-dashboard', 6)
ON CONFLICT DO NOTHING;

INSERT INTO role_feature (role_id, feature_id)
VALUES (2, 91), (3, 91)
ON CONFLICT DO NOTHING;
-- feature_id = 91, role_id 2 = ADMINISTRADOR DE UDP, role_id 3 = USUARIO DE UDP

### Notas

- El endpoint de debug GET /api/v1/debug/cronograma-dashboard-feature fue creado temporalmente y eliminado antes del merge.
- El SQL de producción (Aiven) está pendiente de aplicar cuando la conexión esté disponible.
- El diseño fue prototipado en Claude Design antes de implementar en Angular.

## Sesión 2026-06-24

### 1. Fix importación MPP — preservar actividades manuales

Columna nueva: is_manual boolean NOT NULL DEFAULT false en project_activity.
- Actividades creadas desde POST /{proyectoId}/actividades → is_manual = true
- Actividades importadas desde MPP → is_manual = false

Cambios en ImportarMppAsync:
- Solo borra actividades con is_manual = false
- Actividades manuales huérfanas (parentId ya no existe) → parentId = null, hierarchyLevel = 0
- Predecesoras de manuales que apunten a IDs borrados → se limpian
- Manuales van al final con order continuando desde el último del MPP

ImportarMppResultDto extendido: ActividadesManualesConservadas: int

Frontend Swal diferenciado:
- Si hay manuales: "Se reemplazarán las actividades importadas. Las X actividades manuales se conservarán al final."
- Sin manuales: mensaje original simplificado

SQL aplicado en VPS Abril Prod:
ALTER TABLE project_activity ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false;

### 2. Fix PercentageComplete en ImportarMppAsync

- Leer PercentageComplete de MPXJ y asignar a ProgressPercentage (cast a int, null → 0)
- Si pct >= 100 → marcar como culminada con ActualEndDate
- Si pct < 100 → ActualEndDate = null
- Math.Min(pct, 100) para valores > 100

### 3. Cronograma de Actividades — mejoras de UX

- Línea base visible por defecto: lineaBaseVisible = true al iniciar
- Botón invertido: resaltado cuando línea base está OCULTA (no cuando visible)
- Eliminar doble click Gantt: onRowDblClick eliminado, rowClickTimer eliminado, click abre modal instantáneamente sin delay
- Drag & drop libre de jerarquía: dos zonas por fila (centro 60% = anidar, bordes 20% = reordenar). Hijos se mueven con el padre. Límite nivel 3.
- Drag desde cualquier parte de la fila: draggable="true" movido del td al tr
- Botones ↑↓ en tabla: mover actividad entre hermanos sin drag
- Drop SOBRE fila: convierte fila destino en padre de la actividad arrastrada
- Fix scroll: ambas vistas (lista proyectos y detalle actividades) ahora permiten scroll vertical correctamente

### 4. Cronograma de Adjudicaciones — paleta BCS

En features/costs/features/adjudicaciones/components/detail/cronograma/cronograma-modal.html:
- Paleta BCS aplicada al panel derecho:
  · depth 0: bg #0D1B2A, text #E0E1DD
  · depth 1: bg #1B263B, text #E0E1DD
  · depth 2: bg #415A77, text #E0E1DD
  · depth >= 3: bg #ffffff, border-left 3px solid #415A77, text #1E3A5F
- Encabezado tabla: bg #1B263B, text #E0E1DD
- Drop target highlight: outline 2px solid #2E6DB4

### 5. Fix SharePoint CostosYPresupuestos

En appsettings.Development.json agregar bajo SharePoint.Sites:
"CostosYPresupuestos": { "Hostname": "abrilinmob.sharepoint.com", "SitePath": "/sites/CostosYPresupuestos" }
Resuelve error al cargar /costs/adjudicaciones.

### 6. Deploy

- npm install @microsoft/signalr @tabler/icons-webfont — dependencias faltantes
- Build exitoso con warnings (no errores)
- Frontend desplegado en VPS /var/www/abril vía scp

## Sesión 2026-06-29

### 1. SPI (Índice de Rendimiento del Cronograma) en Dashboard UDP

**Frontend — `features/projects/cronograma-dashboard/`:**
- `CronogramaDashboardProyectoDto` extendido con `spi: number`
- Propiedad `spiPromedio = 1.0` calculada en `loadDashboard()` promediando proyectos con actividades
- Métodos `spiColor(spi, estado)` y `spiLabel(spi, estado)` para color y texto del badge
- KPI card "SPI PROMEDIO" agregada (9na card, skeleton actualizado a 9)
- Columna SPI en tabla con badge coloreado: verde ≥1, naranja ≥0.9, rojo <0.9, gris SIN_ACTIVIDADES
- Estilos `.col-spi` y `.spi-badge` en `cronograma-dashboard.css`

### 2. Bugs identificados (pendientes)

- **Responsables vacíos en filtro**: el select solo muestra "Responsable: Todos", nunca carga nombres. Query 3 del dashboard trae los IDs correctos pero hay que verificar por qué no devuelve nombres.
- **Avance 0% en dashboard**: `CalcularAvanceNivel0` mezcla los 3 tipos de cronograma (ANTEPROYECTO/PROYECTO/ACTUALIZACION). El dashboard debe mostrar 3 barras separadas por tipo igual que `proyectos-cronograma-list`. Requiere cambiar `CronogramaDashboardProyectoDto` para devolver `avanceAnteproyecto`, `avanceProyecto`, `avanceProyectoActualizacion` en lugar de `porcentajeAvance`.

### 3. Setup de herramientas por PC

**PC Personal — CON headroom:**
- `headroom` v0.28.0 instalado via `py -m pip install "headroom-ai[all]"`
- Al abrir Claude Code: `headroom wrap claude` desde la carpeta del repo correspondiente
- Si el proxy se cae: `headroom proxy` en cualquier terminal, luego reabrir Claude Code
- Modelo: `claude config set model claude-sonnet-4-5`

**PC Trabajo — SIN headroom:**
- Claude Code se abre directamente con `claude` como siempre
- Sin cambios en el flujo de trabajo habitual

## Sesión 2026-07-03

### 1. Skills de cierre de sesión

Creados `.claude/skills/guardar-rama/SKILL.md` y `.claude/skills/guardar-master/SKILL.md`:
- **guardar-rama**: commitea cambios pendientes (mensaje Conventional Commits autogenerado), corre `ng build` obligatorio, actualiza `CONTEXT.md` con el resumen de sesión, hace `git fetch` + `merge` de `origin/<rama>`, y pushea sin `--force`. Se detiene si la rama es `master`, si el build falla, o si hay conflictos de merge.
- **guardar-master**: mismo flujo pero para `master` — pide confirmación explícita antes del push (muestra `git log`/`git diff` contra `origin/master`) por ser la rama de producción. Se detiene si la rama activa no es `master`.
- Ambas skills recién creadas no quedan registradas en el harness hasta la próxima sesión (se ejecutaron manualmente siguiendo el contenido del SKILL.md en esta misma sesión).

### 2. `.claude/skills/` ahora se versiona en el repo

`.gitignore` cambió de `.claude/` a:
```
.claude/*
!.claude/skills/
```
Esto deja fuera del repo el resto de `.claude/` (settings locales, etc.) pero permite que `guardar-rama/SKILL.md` y `guardar-master/SKILL.md` viajen con el repo a cualquier PC/sesión — antes quedaban solo locales.

### 3. Pendiente

- No existe todavía en este archivo una sección `REGLAS DE PROGRAMACIÓN > DEPLOY` con reglas numeradas P1-P5 (la skill `guardar-master` referencia una "regla P5" de no usar `--force" que aún no está documentada aquí). Si se formaliza, agregarla junto a `## REGLAS DE CODIFICACIÓN` (línea 49).

### 4. Merge a master vía "guardar master"

`feature/milestone-schedule-improvements` (SPI en dashboard UDP, mejoras UX cronograma de actividades, drag&drop de jerarquía, skills guardar-rama/guardar-master) se mergeó a `master` con `ddf419c`. Build de producción (`ng build`) verificado OK antes del push. Sin cambios de código nuevos en esta sesión — solo consolidación y push.

## Sesión 2026-07-05/06 — Dashboard de Indicadores Reactivos SSOMA + meta anual

### 1. `dashboard-acumulado` (Dashboard SSOMA) — rediseño

- Card de **Indicadores Reactivos (IF/IG/IA)** movida arriba de todo, ancho completo — prioridad visual pedida por el usuario (le importa a gerencia).
- Nueva **meta anual editable**: chip "Meta X" bajo cada número grande (IF/IG/IA), verde si se cumple, rojo si no, gris si no hay meta cargada ese año. Botón "Meta" abre un modal simple para cargar/editar los 3 valores contra el endpoint nuevo del backend (`meta-anual`).
- **Cierre de Accidentes** pasó a una columna ancha (antes compartía la columna angosta de 220px con el ranking) — tiles bastante más grandes, a pedido del usuario ("muy reducidos").
- **Top Proyectos** se fusionó como una franja compacta arriba de "Puntaje Mensual Alcanzado" — ya no ocupa una fila propia del grid.
- Tabla de reactivos ahora muestra 3 bloques de columnas por proyecto: Mes / Año / Total histórico (HHT, Acc, IF cada uno).

### 2. Lista de Accidentes e Incidentes (`accidente-lista`)

Nuevas columnas: **Descripción** (truncada con tooltip), **Días perdidos**, **Alta médica** (Cerrado/Abierto/— según si aplica). El orden por fecha del evento ya venía bien del backend.

### 3. Coordinación con el backend

Este trabajo depende de cambios en paralelo en `Abril_Backend` (mismo período): fix de performance en el cálculo de reactivos (1 fetch en vez de 3 por cada cambio de mes), nueva tabla `ssoma_meta_anual`, y corrección de un bug real encontrado en logs de producción (SQL crudo `interval + integer` en la consulta de días perdidos de la lista de accidentes — ya corregido en el backend antes de este push).

### Archivos clave
- `src/app/features/ssoma/gestion/indicadores-proactivos/pages/dashboard-acumulado/` (ts/html/css)
- `src/app/features/ssoma/gestion/indicadores-proactivos/indicadores-proactivos.service.ts` y `.dtos.ts` (meta anual)
- `src/app/features/ssoma/gestion/accidentes-incidentes/pages/lista/` (ts/html/css)

### Pendiente
- Cargar la meta anual real de 2026 desde el dashboard (todavía no tiene valores, sale "Sin meta").
- Cronograma de Hitos (`milestone-schedule`): el usuario reportó fechas que no coinciden con un Excel de referencia (`CRONOGRAMA HITOS CEDRO - JULIO 26.xlsx`) — se confirmó que las fechas de cada hito son 100% manuales (sin cálculo ni importación automática desde ningún lado), pero el usuario cortó la investigación ("me equivoqué, es otro tema") antes de decidir si corregir manualmente o dejarlo así.

## Sesión 2026-07-07 — Bug "Nueva semana" no aparecía en Dossier del contratista

En `habilitacion/gestion/dossier` (Panel Contratista), al crear una semana nueva con el modal "Nueva semana" el registro se creaba bien en el backend (confirmado en Network tab: `GET /dossier` devolvía la semana nueva en estado `Borrador`), pero no aparecía en la lista de la UI.

Causa: el getter `semanasFiltradas` en `dossier.ts` ocultaba toda semana en estado `Borrador` con `docsSubidos === 0`, pensado para no mostrarle al admin borradores vacíos de otros contratistas. Pero ese mismo filtro aplicaba también a la vista del contratista, ocultándole la semana que él mismo acababa de crear y dejándolo sin forma de subir documentos.

**Fix:** `semanasFiltradas` ahora no aplica ese filtro cuando `isContratista()` es true — el contratista ve todas sus semanas (incluyendo borradores recién creados); el filtro de "ocultar borradores vacíos" se mantiene solo para la vista admin.

### Archivos clave
- `src/app/features/habilitacion/pages/dossier/dossier.ts` (getter `semanasFiltradas`, línea ~74)

### Pendiente
- Ninguno — verificado con Network tab que la semana ya aparece tras el fix.

## Sesión 2026-07-04

### 1. Scroll propio en tabla de `cronograma-actividades`

**Problema**: en `/projects/cronograma-actividades/{id}` la tabla de actividades (275+ filas) scrolleaba junto con toda la página — la barra de scroll horizontal quedaba al fondo, fuera de vista, obligando a bajar todo el scroll vertical primero para poder scrollear horizontalmente.

**Fix — `features/projects/cronograma-actividades/cronograma-actividades.css`:**
- `.table-wrapper`: agregado `overflow-y: auto` + `max-height: calc(100vh - 260px)` (mismo patrón que `.gantt-full-container`, que ya usaba `calc(100vh - 220px)`; +40px porque este contenedor tiene además el toolbar de botones encima).
- `.data-table th`: agregado `position: sticky; top: 0; z-index: 2; background: #e2e8f0` para que el encabezado de columnas no se pierda al hacer scroll vertical.
- No se tocó lógica, HTML, services ni DTOs. No hizo falta ajustar el budget de `anyComponentStyle` en `angular.json` (30kB/40kB) — el CSS minificado del componente sigue dentro del límite.
- Verificado por el usuario en navegador con las 275 filas reales: scroll horizontal visible sin bajar el vertical, header sticky, drag-select de filas y triangulitos de colapsar/expandir siguen funcionando.

### 2. `.tokensave/` agregado a `.gitignore`

Directorio local generado por el MCP server `tokensave` (contiene `tokensave.db`, ~38MB) apareció como untracked. Se agregó `.tokensave/` a `.gitignore` — no debe versionarse, es cache/estado local de la herramienta.

## Sesión 2026-07-05

### 1. "Recordar última pestaña" en Cronograma de Actividades

En `/projects/cronograma-actividades/:id` la pestaña de tipo de cronograma (Anteproyecto/Proyecto/Proyecto de Actualización) ya no vuelve siempre a Anteproyecto al reingresar:

- **`services/cronograma-actividades.service.ts`**: `getUltimaPestana(proyectoId)` (`GET .../ultima-pestana`) y `actualizarUltimaPestana(proyectoId, tipoCronograma)` (`PATCH .../ultima-pestana`).
- **`dtos/cronograma-actividades.dtos.ts`**: `UltimaPestanaDto { tipoCronograma: string | null }`.
- **`cronograma-actividades.ts`**: `ngOnInit` llama `cargarUltimaPestana()` antes de cargar actividades — si el backend devuelve `null` o falla, cae a `'ANTEPROYECTO'` por defecto, sin error visible. `onTabChange()` dispara `guardarUltimaPestana()` en segundo plano (sin loader, sin bloquear UI, sin alertar si falla — es una preferencia, no algo crítico). Confirmado que `SectionTabs.valueChange` solo emite en click del usuario, no en el binding inicial, así que no hay un PATCH espurio al entrar a la página.

### 2. Bug de cascada: la tabla no reflejaba fechas tras asignar predecesora de mismo nivel

**Causa raíz (confirmada leyendo `Abril_Backend`)**: el `PUT .../actividades/{id}` ya aplica y persiste la cascada en la misma llamada (`EditarActividadAsync` → `AplicarCascadaAsync`, ver `CronogramaActividadesService.cs`/`CronogramaSchedulingService.cs` del backend) — no es un preview. El botón "Aplicar cambios" del modal disparaba una segunda llamada (`recalcular-cascada/aplicar`) que recalculaba sobre datos ya aplicados y por lo tanto siempre devolvía `cambios: []`; como ninguna otra ruta de parcheo tocaba las filas hermanas/sucesoras, la tabla se quedaba con las fechas viejas en memoria.

**Fix — `cronograma-actividades.ts`**:
- Nuevo método `patchCascadaCambios(cambios: CascadaCambioDto[])`, usado tanto en `guardar()` (parcheando directo desde `res.cascada.cambios` del PUT, que ya trae las fechas post-cascada reales) como en `aplicarCascada()` (ahora redundante pero inofensivo, se dejó sin tocar su comportamiento de red a pedido explícito).
- El backend agregó `baselineStartDate`/`baselineEndDate` a `CascadaCambioDto` — se agregó al DTO frontend y a `patchCascadaCambios` para que Línea Base también se actualice en vivo. Desfase y semáforo no necesitaron cambios: son getters (`getDesfaseDias`/`getSemaforoClass`) que leen `planned`/`baseline` en vivo desde la fila en cada render.
- `patchActividadLocal()` (compartido por `guardar()` y `commitInlineEdit()`) tampoco parcheaba `baselineStartDate`/`baselineEndDate` cuando el backend hacía auto-fill de LB al editar el fin programado manualmente — corregido.
- El botón "Cancelar" del modal de cascada **no revierte nada hoy** (el cambio ya se guardó en BD antes de que el modal aparezca) — queda pendiente como decisión de producto, no se tocó en esta sesión.

### 3. Rediseño del PDF exportado (`exportarPdf()` en `cronograma-actividades.ts`)

Con jsPDF/jspdf-autotable (sin librerías nuevas):
- **Jerarquía visual**: borde izquierdo de ~1.1mm por fila usando la paleta BCS (`#0D1B2A` nivel 0; `#1B263B`/`#415A77`/`#778DA9`/`#E0E1DD` cíclico por rama de nivel 1; derivados `#2C3E56`/`#557090`/`#8FA3B8`/`#CACBC7` para nivel 2+, heredado del ancestro de nivel 1) vía `buildPdfNivelColorMap()` + `didDrawCell`.
- **KPIs** antes de la tabla: Total actividades, Avance general, conteo Verde/Amarillo/Rojo — cards estilo dashboard (`drawPdfKpiCard`: fondo blanco, `roundedRect`, borde sutil `#E2E8F0`, sin sombra, franja superior de acento).
- **Barra de progreso** en la columna Avance% (riel gris + relleno según regla ≥75 verde/≥50 azul/≥25 naranja/<25 rojo/sin datos gris).
- **Semáforo** pasó de texto coloreado a círculo (`doc.circle`), igual que en pantalla.
- KPIs y colores de jerarquía usan una paleta y helpers propios del PDF (`PDF_NIVEL0_RGB`, `PDF_NIVEL1_RGB`, `PDF_NIVEL2_RGB`, `getPdfAvanceRgb`, `getPdfSemaforoRgb`) — independientes del `rowStyleMap` que se usa en pantalla.

### 4. Semáforo "sin datos" ahora se muestra en gris (`#94A3B8`) en vez de ocultarse

Antes, cuando una actividad no tenía baseline o fin programado (ej. "Envio de obs"), `getSemaforoClass()` devolvía `''` y el punto de semáforo se ocultaba (`*ngIf`) tanto en pantalla como en el PDF (ahí quedaba en blanco).

- **`getSemaforoClass()`**: ahora devuelve `'semaforo-gris'` en vez de `''` (tanto para hojas sin desfase calculable como para padres cuyos hijos tampoco tienen dato). Se quitó el `.filter((s) => s !== '')` en la agregación de padres, ya innecesario.
- **CSS**: nueva clase `.semaforo-gris { background: #94A3B8; ... }` junto a verde/amarillo/rojo.
- **HTML**: se quitó el `*ngIf` en el punto de semáforo (ya no hace falta, la clase nunca vuelve vacía).
- **PDF**: `getPdfSemaforoRgb()` ya no devuelve `null` — devuelve `#94A3B8` para el caso sin datos, así el círculo siempre se dibuja.
- `getSemaforoTexto()` no cambió: sigue devolviendo `'—'` para el caso gris, correcto para vistas de texto (Excel/Gantt).

### Pendiente para otra sesión

- Decisión de producto sobre el botón "Cancelar" del modal de cascada (hoy no revierte nada, ver punto 2).

## Sesión 2026-07-05 (parte 2)

### Botón "Usar plantilla" en Cronograma de Actividades

En la pestaña **Proyecto** (`tipoCronogramaActivo === 'PROYECTO'`), cuando la tabla está vacía (0 actividades), aparece un botón "Usar plantilla" junto a "Nueva Actividad" en el estado vacío.

- **`cronograma-actividades.html`**: nuevo wrapper `.empty-actions` (flex row) dentro de `.table-empty-state` con el botón condicionado por pestaña.
- **`cronograma-actividades.ts`**: `usarPlantilla()` — confirma con SweetAlert2 ("¿Cargar la plantilla estándar de Proyecto? Se crearán 61 actividades."), y si el usuario confirma, activa `loadingActividades`/`loaderService.show()` (reutiliza el skeleton existente, F8) y llama `service.aplicarPlantilla()`. Éxito → `recargar()` + toast con el conteo real de `actividadesCreadas`. Error → apaga loading y usa `errorService.handleError()` (F9).
- **`services/cronograma-actividades.service.ts`**: `aplicarPlantilla(proyectoId, body)` → `POST .../{proyectoId}/aplicar-plantilla`.
- **`dtos/cronograma-actividades.dtos.ts`**: `AplicarPlantillaRequest { tipoCronograma }` / `AplicarPlantillaResultDto { actividadesCreadas }`, verificados 1:1 contra los DTOs reales del backend (`Abril_Backend/.../CronogramaActividadesDtos.cs`) — el endpoint ya estaba implementado del lado del backend (lee `Seeds/plantilla_proyecto_seed.json`, 61 actividades).

## Sesión 2026-07-07

### Bug de cascada no aplicada en edición inline de fechas

**Síntoma**: al editar inline la fecha de una actividad con sucesoras (actividades cuya predecesora apunta a la editada), la fila editada se actualizaba al toque pero las sucesoras solo se veían correctas tras refrescar la página. Confirmado que el backend calculaba y persistía bien la cascada en la misma llamada `PUT` — el problema era 100% de frontend.

**Causa raíz**: en `commitInlineEdit()` (`cronograma-actividades.ts`) el `subscribe` del `PUT` solo llamaba a `patchActividadLocal(res.actividad)` (fila editada) y `patchPadresActualizados()` (padres), pero nunca leía `res.cascada.cambios`. En cambio `guardar()` sí llamaba a `patchCascadaCambios(res.cascada.cambios)` con esos mismos datos de la respuesta — por eso el modal de editar sí reflejaba la cascada y la edición inline no.

**Fix**: se agregó en `commitInlineEdit()`, justo después del bloque de `patchActividadLocal()`/`patchPadresActualizados()`, el mismo `if (res.cascada?.cambios?.length) { this.patchCascadaCambios(res.cascada.cambios); }` que ya existía en `guardar()`. Sin llamadas HTTP nuevas — solo se aplican datos que ya venían en la respuesta del PUT existente. No se tocó el modal de preview de cascada (`mostrarCascadaSiHayCambios`) para la edición inline.

## Sesión 2026-07-07 (continuación) — Observación por documento en Dossier + bug de staff en Charlas

### 1. El contratista no veía el comentario del revisor por documento

En el modal de subida del Dossier (`dossier-upload-modal.html`), cuando SSOMA marca un documento como "Observado" y deja un comentario (`doc.obsRevisor`), ese comentario solo se mostraba en el modal de revisión del admin (`dossier-revisar-modal.html`) — el contratista no tenía forma de saber qué corregir. Se agregó el bloque de observación por fila de documento (visible solo cuando `doc.estado === 'Observado' && doc.obsRevisor`), con estilo `.doc-obs` igual al patrón ya usado en `.obs-ssoma`.

### 2. Bug: staff no se recargaba al cambiar de proyecto en "Nueva Charla" (`/ssoma/gestion/charlas`)

**Síntoma reportado**: una coordinadora no veía el staff del proyecto en el modal "Nueva Charla", mientras que otro usuario sí lo veía para el mismo proyecto.

**Causa**: `abrirCrear()` en `charlas-dashboard.ts` solo llamaba a `loadStaff()` cuando `!this.staff.length` — una vez que `staff` se poblaba (o quedaba en 0 tras un primer intento sin resultados), nunca se volvía a pedir al backend aunque el usuario cambiara de proyecto con el selector. El endpoint `GET /ssoma-charlas/staff` en sí no depende del usuario que lo llama (filtra por `ObraOficina == "Staff"`, `Estado == "ACTIVO"` y vinculación activa en `WorkerVinculacion` para ese `proyectoId`), así que el bug era 100% de caché en el frontend.

**Fix**: `onProyectoChange()` ahora resetea `this.staff = []` antes de recargar, forzando que `abrirCrear()` vuelva a pedir el staff del proyecto recién seleccionado.

**Pendiente**: si tras este fix la coordinadora sigue sin ver staff, el problema sería de datos — revisar que los trabajadores de su proyecto tengan `obra_oficina = 'Staff'`, `estado = 'ACTIVO'` y una fila activa en `worker_vinculacion` para ese proyecto.

### Archivos clave
- `src/app/features/habilitacion/pages/dossier/components/dossier-upload-modal/dossier-upload-modal.html` y `.css`
- `src/app/features/ssoma/gestion/charlas/pages/dashboard/charlas-dashboard.ts` (`onProyectoChange`, línea ~131)

## Sesión 2026-07-07 (continuación) — RAC: campos obligatorios, filtros, indicadores

Contraparte frontend de la sesión de backend sobre RAC/indicadores (ver `Abril_Backend/CONTEXT.md` mismo día para el detalle de la investigación: fotos que no se guardaban por config de SharePoint faltante en producción, RACs huérfanos sin empresa, conteo de OPT/ATS/Charlas por vinculación incorrecta).

### 1. `rac-nuevo` — Reportante, Reportada y Fotos ahora obligatorios

Existían checkboxes "Reportar de forma anónima" y "No identificar la empresa reportada" que permitían crear un RAC sin `empresaReportanteId`/`empresaReportadaId` — 11+ RAC de julio quedaron sin empresa asignada, invisibles en cualquier filtro/indicador. Se quitaron ambos checkboxes de `rac-nuevo.html`; `canSubmit` en `rac-nuevo.ts` ahora exige `empresaReportadaId`, `empresaReportanteId` y `fotosSeleccionadas.length > 0`.

También se corrigió que si la subida de fotos fallaba (ej. por el problema de SharePoint), el código mostraba "RAC registrado ✓" igual (el `error` callback de `subirFoto` llamaba a la misma función de éxito) — ahora muestra un aviso distinto ("RAC registrado, pero las fotos no se pudieron subir") sin fingir éxito.

### 2. Lista de RAC — columnas separadas, filtros de mes y de empresa por rol

`rac-lista.html`/`.ts`: se agregaron columnas "Reportante" y "Reportada" (antes solo mostraba una "Empresa" = reportada), filtro de mes/año (arma `fechaDesde`/`fechaHasta` que el backend ya soportaba pero la UI no exponía), y dos selects de empresa separados (`filtroEmpresaReportanteId` / `filtroEmpresaReportadaId`, antes uno solo). También se compactó la tabla: código con letra más chica, botones de acciones reducidos a íconos (`.btn-icon`), columnas de empresa con salto de línea en vez de truncar con "...".

### 3. Dashboard RAC — nueva métrica "RACs Levantados por Ti"

`rac-dashboard.html`/`.ts`: card nueva visible solo para contratistas (`esContratista`), mostrando `data.totalReportados`/`totalReportadosCerrados` — antes no existía ningún conteo de cuántos RAC había reportado la propia empresa (solo se veían los RAC que le fueron atribuidos).

### 4. Indicadores proactivos — nuevo campo `actualRacsAtribuidos`

El backend separó "RACs reportados" (por empresa reportante) de "RACs atribuidos/cerrados" (por empresa reportada) — antes ambas filas de la UI ("RACS rep."/"RACS cerr.") compartían el mismo campo `actualRacs`. Se agregó `actualRacsAtribuidos` al DTO y se actualizó `seguimiento-indicadores.component.html` para que la fila "RACS cerr." use ese campo como "Prog" en vez de reutilizar `actualRacs` (que ahora significa "reportados", no "atribuidos").

### Archivos clave
- `src/app/features/ssoma/gestion/rac/pages/nuevo/rac-nuevo.ts` y `.html`
- `src/app/features/ssoma/gestion/rac/pages/lista/rac-lista.ts`, `.html`, `.css`
- `src/app/features/ssoma/gestion/rac/pages/dashboard/rac-dashboard.ts` y `.html`
- `src/app/features/ssoma/gestion/rac/dtos/rac.dtos.ts`, `services/rac.service.ts` (`RacListFiltrosState`)
- `src/app/features/ssoma/gestion/indicadores-proactivos/indicadores-proactivos.dtos.ts`, `pages/seguimiento/seguimiento-indicadores.component.html`

### Pendiente
- Verificar en el navegador (no se pudo en esta sesión) que los indicadores de RP Mural/Lumbreras cuenten correctamente tras el deploy del backend.
- 11 RAC de julio con `empresa_reportada_id = NULL` siguen sin corregir en BD (ver detalle en `Abril_Backend/CONTEXT.md`).

## Sesión 2026-07-07 (tarde) — RAC: compresión de fotos y subida resiliente

Reporte urgente en producción (mobile, `intranet.abril.pe`): al crear un RAC, el modal mostraba "RAC registrado, pero las fotos no se pudieron subir". El RAC se guardaba bien; el problema era exclusivo de las fotos.

**Causa**: `rac-nuevo.ts` subía las fotos tal cual salen de la cámara del celular (típicamente 8-15MB cada una) en paralelo vía `forkJoin`, sin comprimir. En datos móviles eso falla por timeout. Además, `forkJoin` es todo-o-nada: si UNA foto fallaba, se reportaba que fallaron todas aunque el resto sí se hubiera subido.

**Cambios**:
- Nuevo `src/app/shared/utils/image-compress.ts`: comprime cualquier imagen a máx. 1600px + JPEG calidad 0.75 vía `canvas`/`createImageBitmap` antes de subir (reduce el peso ~80-90%). Si el navegador no puede procesarla, devuelve el archivo original sin romper el flujo.
- `rac-nuevo.ts`: `onFotosChange` ahora comprime antes de guardar en `fotosSeleccionadas`. La subida por `forkJoin` ahora envuelve cada `subirFoto` en `catchError(() => of(null))` y solo marca "fallaron" si de verdad hubo un `null` en los resultados — ya no es todo-o-nada.

### Archivos clave
- `src/app/shared/utils/image-compress.ts` (nuevo)
- `src/app/features/ssoma/gestion/rac/pages/nuevo/rac-nuevo.ts`

### Pendiente
- Confirmar con el usuario en el celular real que el error ya no ocurre.
- Si sigue fallando, el siguiente sospechoso es un límite de tamaño de cuerpo en el proxy/servidor delante del backend (IIS/nginx) — eso no lo resuelve este cambio de frontend.

## Sesión 2026-07-09 — Rediseño dashboards SSOMA (acumulado y por proyecto)

Serie de iteraciones de diseño sobre `ssoma/gestion/indicadores-proactivos/indicadores-ssoma/dashboard` y `.../dashboard-proyecto`, pedidas por el usuario para que sean presentables ante gerencia y legibles al proyectar.

**Dashboard acumulado** (`pages/dashboard-acumulado/`):
- Card "Indicadores Reactivos" en una sola fila: KPIs (IF/IG/IA/HHT) en grid 2×2 a la izquierda, gráfica de accidentes del mes al centro, tabla Año/Total proyecto a la derecha (se sacó la columna Julio de la tabla porque ya la cubre la gráfica).
- Gráfica de accidentes: solo accidentes en barra (no días perdidos — un mes con muchos días, ej. 30, aplastaba la escala). Los días perdidos se muestran como segunda línea del datalabel arriba de la misma barra del proyecto (`diasPerdidos` embebido en el dataset, formatter multilínea de chartjs-plugin-datalabels).
- Columna "Total proyecto" de la tabla: tinte champagne + borde dorado (se descartaron azul/verde sólidos, se veían "poco profesionales" según el usuario).
- "Panorama General" → renombrado "Puntaje Mensual SSOMA", convertido de lista a gráfica de barras.
- "Desempeño de Supervisores": gráfica horizontal, mismo semáforo verde/ámbar/rojo que el resto (se descartó el esquema oro/plata/bronce, "se veía como un circo").
- "Cumplimiento Proactivo": un solo % por proyecto (se descartó el desglose Casa vs Contratistas), con descripción de qué mide bajo el título. Card "Mejores Proyectos" (estilo oscuro elegante, 2×2, números centrados) al costado, mejor proyecto por categoría incluyendo Cierre de Accidentes.
- Se sacaron "Cierre de Accidentes" y "Cierre de Hallazgos" como tiles independientes (redundantes con Mejores Proyectos).
- Responsive: `rx-layout` con `flex-wrap`, media query a 980px apila todo el grid a una columna (antes el contenido se recortaba en ventanas angostas).

**Dashboard por proyecto** (`pages/dashboard-proyecto/`):
- Se quitó el `kpi-strip` de RAC Generados/RAC Cerrados/OPT/ATS/Charlas/Inspecciones y el "puntaje desglosado" (Proactivos/PASSO/Cierre Acc/Cierre Hall/Bonus/Total) — redundante con los gauges de arriba.
- Los badges de cabecera se reemplazaron por cards claras (`.rx-card`) Mes vs Total proyecto (Accidentes, Días perdidos) y Año vs Total proyecto (IF, IG, IA), usando directamente los campos `...Anio`/`...Total` que ya trae `IndicadorReactivoProyectoDto` del backend (antes se recalculaba a mano acumulando meses vía `reactivoAcumulado`).
- Se agregó botón "Exportar PDF" en la toolbar — el método `exportarPDF()` (jsPDF + html2canvas) ya existía pero no estaba conectado a ningún botón.
- Se mantuvieron las 3 gráficas de tendencia mensual (Accidentes, Días Perdidos, Trabajadores Promedio) después de una idea y vuelta (se sacaron y luego se repusieron a pedido); se les quitó la leyenda redundante (duplicaba el título de la card) y se les dio más padding arriba para que el datalabel del pico no se corte.

### Bug de datos investigado (no era bug): caché de indicadores reactivos
El usuario reportó que un descanso médico de 30 días recién aprobado no se sumaba a los indicadores reactivos. Diagnóstico confirmado por SQL: el dato en BD (`ss_accidente_trabajo.dias_descanso_reales`) estaba correcto — el problema era el caché de 10 min (`IMemoryCache`) de `IndicadoresProactivosController` (`ind_reactivos_*`), que no se invalidaba al cambiar un accidente/descanso. Fix en **Abril_Backend** (repo separado, requiere su propio "guardar master"):
- `ReactivosCacheVersion` (singleton, contador simple) — nuevo en `Features/SsomaModule/IndicadoresProactivosFeature/Infrastructure/`.
- Claves de caché de `/reactivos` y `/reactivos/{proyectoId}` ahora incluyen `_v{version}`.
- `DescansoMedicoRepository.Aprobar` y `AccidenteTrabajoRepository.Create/Update/Cerrar/Delete` llaman `Bump()` tras guardar.

### Archivos clave
- `src/app/features/ssoma/gestion/indicadores-proactivos/pages/dashboard-acumulado/dashboard-acumulado.component.{ts,html,css}`
- `src/app/features/ssoma/gestion/indicadores-proactivos/pages/dashboard-proyecto/dashboard-proyecto.component.{ts,html,css}`

### Pendiente
- El fix de caché del backend (`ReactivosCacheVersion`) está commiteado solo en el working tree de `Abril_Backend` en esta sesión — falta correr "guardar master" en ESE repo por separado (el usuario debe reiniciar el backend para que tome el cambio de todos modos).
- No se verificó visualmente con navegador en ninguna iteración (instrucción explícita del usuario: él prueba visualmente en su máquina).

## Sesión 2026-07-09 (2) — CASA puede invitar usuarios de una contratista

El panel `/habilitacion/gestion/usuarios` (pestaña "Usuarios") solo aparecía para usuarios con rol CONTRATISTA. El componente `AdminContratistaUsuarios` (selector de empresa + `forceAdminMode`) ya existía y reutiliza el mismo flujo de invitación (mismo endpoint `ContratistaUsuarioController`, que solo exige `[Authorize]` sin restricción de rol), pero no estaba enlazado en ningún menú — solo accesible por URL directa `/habilitacion/admin-usuarios-contratista`.

**Cambio:** se agregó la ruta `gestion/admin-usuarios` (reutiliza `AdminContratistaUsuarios`) y la pestaña "Usuarios" al set de tabs que ve CASA/admin en `gestion-hab.component.ts`. Verificado en vivo por el usuario: funciona correctamente.

También incluido en el mismo commit un fix menor preexistente en el working tree: `charlas-dashboard.component.ts` ahora carga `loadTab3()` cuando esa pestaña está activa.

### Archivos clave
- `src/app/features/habilitacion/habilitacion.routes.ts`
- `src/app/features/habilitacion/gestion/gestion-hab.component.ts`
- `src/app/features/ssoma/gestion/charlas/charlas-dashboard.component.ts`

### Pendiente
- Ninguno conocido.

## Sesión 2026-07-10 — Interconsultas: filtros, envío de correos, columnas nuevas

Rediseño de `features/ssoma/salud-ocupacional/interconsultas` a pedido del usuario, en varias rondas iterativas (ver `CONTEXT.md` del backend para el detalle de la lógica de resolución de datos).

**Filtros**: se agregaron Razón social (solo empresas `esAbril`), Proyecto (`ProyectoHabilitadoService.getHabilitados()`) y Tipo (Staff/Oficina Central/Obra — sin "Contratista", esta pantalla es solo personal de Abril). Estado por defecto "Pendiente". Todo en una sola fila con `app-search-select` en modo `[compact]="true"` para bajar la altura, más el botón "Enviar correos" al final de la misma fila.

**Columnas nuevas**: Tipo (badge), Razón social, Proyecto actual, Jefatura, Administrador, y Categoría/Ocupación (esta última compactada como segunda línea junto al DNI del trabajador en vez de una columna propia, para no perder espacio horizontal — con truncado + tooltip donde aplica).

**Selección y envío de correos**: checkboxes por fila + "seleccionar todos", botón "Enviar correos (N)" con confirmación (SweetAlert2) y resumen de resultado.

**Layout de una sola pantalla**: la sección ya no hace scroll de página completa — los filtros quedan fijos arriba y solo `.table-wrapper` tiene scroll interno, con `thead` sticky y paginador siempre visible abajo.

### Archivos clave
- `src/app/features/ssoma/salud-ocupacional/interconsultas/interconsultas.ts` / `.html` / `.css`
- `src/app/features/ssoma/salud-ocupacional/dtos/interconsulta.model.ts`
- `src/app/features/ssoma/salud-ocupacional/services/interconsulta.service.ts`

### Pendiente
- El usuario pidió explícitamente no compilar en esta sesión — no se corrió `ng build` ni `tsc` sobre los últimos cambios (categoría/ocupación). Verificar al compilar.
- Falta que el usuario confirme visualmente en su máquina que el layout de una sola pantalla y los nuevos campos se ven bien.

## Sesión 2026-07-13 — Estandarización de wizards SSOMA (RAC/OPT/Inspección/Accidentes)

Sesión larga de estandarización visual/estructural de los formularios "nuevo"/"crear-editar" de RAC, OPT, Inspección y Accidentes, más limpieza de fondos de página en toda la app. Ver CLAUDE.md sección "UI standard (2026)" para las reglas nuevas que quedaron documentadas.

**1. Fondo de página incorrecto (`--color-abril-page-bg` en vez de blanco)**: ese token es solo para el layout general detrás del header, no para el contenido de una página. Corregido a `#ffffff` en 17 páginas: `opt-nuevo/detalle/dashboard`, `rac-nuevo`, `inspeccion-nueva/detalle/dashboard`, `accidente-crear-editar/detalle`, `paso-lista`, `paso-salud-lista`, `charlas-dashboard.component.css`, `dashboard-acumulado`, `desempeno-supervisor`, `seguimiento-indicadores`, y en clínica/evaluaciones/habilitación (`agenda`, `dashboard`, `interconsultas`, `programaciones`, `asignaciones`, `configuracion-plantilla`, `dashboard-gerencia`, `evaluar-residente`, `control-acceso`, `gestion-hab.component.css`).
No se tocó `paso-dashboard.component.css` (sistema de diseño propio completo, requiere conversación aparte) ni las páginas de `charlas/pages/{asistencia,evidencia,programa,lista}` (código muerto, sin ruta real).

**2. Header hand-rolled → `app-abril-page-header`**: RAC y OPT (`nuevo` y `opt-detalle`) reinventaban su propio header (`.nuevo-header`/`.back-btn`/`.header-badge`) en vez de usar el componente compartido. Inspección y Accidentes ya lo hacían bien — se usaron como referencia. CSS muerto correspondiente eliminado.

**3. Estándar de wizard de página completa documentado en CLAUDE.md**: un create/edit form solo puede ser página completa (en vez de `app-base-modal`) si es un wizard multi-paso real (varias etapas distintas). Estructura fija: `app-abril-page-header` (nunca hand-rolled) + `.wizard-root`/`.stepper`/`.wizard-body`/`.wizard-footer`.

**4. Estándar de input de hora documentado**: `<input type="time">` nativo para horas sin restricción (ej. Inspección), vs par `app-search-select` HH/MM solo cuando hay restricción real (no permitir hora pasada, retorno ≥ salida). Migrado Gestión de Salidas (`solicitud-salidas/components/create/`) del picker HH/MM viejo al input nativo con `[attr.min]` dinámico — simplificó ~35 líneas de lógica (`horasSalidaOptions`/`minutosSalidaOptions`/etc. eliminados).

**5. Wording de `app-search-select` unificado** (documentado en CLAUDE.md): "Buscar proyecto...", "Buscar por nombre o DNI..." (personas), "Buscar empresa.../Buscar contratista..." (catálogos grandes), "Selecciona {entidad}" (catálogos chicos). Aplicado en RAC/OPT/Inspección/Accidentes — antes había 4 wordings distintos solo para "Proyecto".

**6. RAC migrado de buscador de trabajador custom a `app-search-select`**: RAC tenía su propio widget completo (`WorkerSearchService` + debounce + `.worker-search-wrap`/`.worker-results`/`.worker-chip`) para Observador y Trabajador(es) observado(s), distinto a como lo hacen OPT e Inspección (catálogo precargado vía `TrabajadorHabService` + `app-search-select`). Migrado a ese mismo patrón. El campo "Cargo" (antes 3 cajas separadas Cargo/Categoría/Ocupación) ahora es un solo campo `categoría · ocupación`, igual que OPT — no se perdió ningún dato, solo se unificó la presentación.
Verificado: OPT e Inspección ya estaban bien (solo tenían CSS muerto de una versión anterior, limpiado). Accidentes usa una fuente de trabajadores distinta a propósito (filtrada por proyecto del evento, no todo el catálogo de la empresa) — correcto, no es una inconsistencia.

### Archivos clave
- `CLAUDE.md` — sección "UI standard (2026)", reglas nuevas de wizard/hora/placeholders.
- `src/app/features/ssoma/gestion/rac/pages/nuevo/rac-nuevo.{ts,html,css}` — migración completa.
- `src/app/features/ssoma/gestion/opt/pages/nuevo/opt-nuevo.{ts,html,css}`, `.../detalle/opt-detalle.{ts,html,css}`.
- `src/app/features/gestion-administrativa/features/solicitud-salidas/components/create/create.{ts,html}` — hora nativa.

### Pendiente (para la próxima sesión)
1. **Discutido pero no implementado**: hay 3 patrones visuales distintos para forms de un solo paso (`app-base-modal` centrado, `app-base-modal [fullScreen]="true"` — este último se ve roto/sin chrome, y el panel lateral custom de `ssoma/gestion/amonestaciones/pages/nueva/` que el usuario prefiere visualmente). Recomendación dada: crear un componente compartido de panel lateral (inspirado en el de Amonestaciones), migrar Solicitud de Salidas y Amonestaciones a él, dejar el wizard full-page solo para multi-paso real. Amonestaciones también reinventa su propio buscador de trabajador (mismo problema que tenía RAC) — migrar a `app-search-select` de paso.
2. Ancho inconsistente entre `.wizard-body` (centrado, max-width) y `.wizard-footer`/`.stepper` (ancho completo de pantalla) en los wizards — se ve como que el footer está "separado" del formulario. No corregido aún.
3. Módulo PASO (`ssoma/salud-ocupacional/paso`) sigue con su propio sistema de diseño (tipografías propias, teal distinto) — pendiente de decisión de diseño aparte.
4. No se verificó visualmente con navegador en esta sesión (instrucción explícita del usuario). Solo se verificó con `tsc --noEmit` y `ng build` (ambos limpios).

## Sesión 2026-07-13 (2) — Modal compartido SSOMA + dashboard de Arquitectura Comercial

Continuación de la sesión anterior. Los 4 pendientes de arriba quedaron resueltos (el #1 se hizo distinto a lo recomendado: en vez de panel lateral, terminó siendo un modal centrado — ver abajo). El #3 (módulo PASO) sigue sin tocar.

**1. Nuevo componente compartido `app-abril-modal-panel`** (`shared/components/abril-modal-panel/`): fondo gris + panel centrado redondeado + header de color con ícono + footer fijo. Dos variantes: `variant="teal"` (default, `--color-abril-standard`, para Gestión Administrativa/Salidas — sigue usando `app-base-modal` sin cambios) y `variant="blue"` (`--color-abril-logo-blue`, para SSOMA).

**Decisión importante que cambia lo documentado en la sesión anterior**: ya NO existe la "excepción de wizard de página completa". Todo formulario SSOMA (incluyendo los que tienen stepper multi-paso) va dentro de `app-abril-modal-panel`, nunca como página completa con `app-abril-page-header`. El stepper (círculos 1-2-3-4) se mantiene, pero ahora vive DENTRO del modal como contenido proyectado, no como header de página.

**2. Migrados a `app-abril-modal-panel` (variant blue)**: RAC, OPT, Inspección, Accidentes, Amonestaciones (Amonestaciones fue el piloto — antes tenía su propio `.panel-overlay`/`.panel-container` a mano, ahora usa el shell). Cada uno perdió su header/footer/overlay local (CSS muerto eliminado). Accidentes tiene una particularidad: el botón de guardar quedó en el footer del modal (fuera del `<form>`), así que usa `<form id="accForm">` + `<button form="accForm">` para poder seguir enviando el formulario.

**3. Azul del logo Abril**: se abrió `public/images/abril-logo.png`, no se pudo muestrear el pixel exacto (herramientas de imagen no disponibles en el sandbox), se estimó visualmente y el usuario confirmó el hex real: `#005D9D` → token `--color-abril-logo-blue` (+ `-hover`/`-light`) en `styles.css`. Distinto del teal general (`--color-abril-standard`, `#0F6E56`).

**4. Ajustes menores al mismo modal, iterando con el usuario**: quitó título "Trabajador" redundante en Amonestaciones, separó visualmente "Puntos por infracción" sin darle su propio título de sección (margin-top 20px), corrigió mayúsculas de Inspección (el estándar de case es sentence-case, no uppercase — ya no hay ambigüedad, confirmado contra `solicitud-salidas`), arregló un bug real: `.abril-field` (global, `styles.css`) le faltaba `margin-top: 9px` — por eso un combo (`app-search-select`, que sí tiene ese margen en su propio template) y un campo nativo en la misma fila quedaban desalineados verticalmente. Ya corregido a nivel global, no por página.

**5. Dashboard de Arquitectura Comercial** (`features/arquitectura-comercial/dashboard/`): el usuario lo señaló como el dashboard "que le gusta" visualmente y pidió usarlo de referencia para estandarizar los dashboards de SSOMA — pero antes de propagarlo había que arreglar el dashboard de AC mismo, que no estaba nada estandarizado a nivel de código (40+ colores hex sueltos repetidos inline). Se hizo, con alcance acotado (no se tocó el archivo completo de 1400 líneas, solo KPI cards + alertas + filtros):
   - Tokens de estado nuevos en `styles.css`: `--color-status-info/-primary/-success/-danger/-warning/-pending` (+ `-light`).
   - KPI cards: de `style="border-top-color:#hex"` repetido 7 veces → clases `.kpi-card--info/success/primary/danger/pending/teal`.
   - Alertas clickeables: de bloques con ~10 inline styles cada uno → `.alert-tile` + `.alert-tile--danger/warning/info`.
   - Filtros: la barra azul con `<select>` nativos + botón "Buscar" → `app-filter-trigger`/`app-filter-modal` + `app-search-select` con auto-búsqueda (mismo patrón que el resto de la app). Se agregó `filtrosAbiertos`, getter `filtrosActivos`, `limpiarFiltros()` en `dashboard.ts`.
   - De paso se encontró y corrigió un bug real preexistente: había una **segunda definición duplicada y muerta** de `.kpi-card`/`.kpi-sub` más abajo en el CSS que pisaba silenciosamente los estilos reales por orden de cascada (`.kpi-grid`/`.kpi-label`/`.kpi-value`/`.alert-card`/`.alert-clickable` viejos) — eliminada, confirmado que ninguna de esas clases se usa ya en el HTML actual.
   - **No se tocó** el resto del archivo (rankings, gráficos Chart.js, donut, barras horizontales, modales de detalle) — fuera del alcance acordado con el usuario para esta ronda.

### Archivos clave
- `src/app/shared/components/abril-modal-panel/{abril-modal-panel.ts,html,css}` — componente nuevo.
- `src/styles.css` — tokens `--color-abril-logo-blue*` y `--color-status-*`, fix de `margin-top: 9px` en `.abril-field`.
- `src/app/features/ssoma/gestion/{rac,opt,inspeccion,accidentes-incidentes,amonestaciones}/pages/.../*.{ts,html,css}` — migración a `app-abril-modal-panel`.
- `src/app/features/arquitectura-comercial/dashboard/{dashboard.ts,html,css}` — tokens + filtros estándar.
- `CLAUDE.md` — sección "UI standard (2026)" reescrita: ya no hay excepción de página completa, todo es `app-abril-modal-panel` (SSOMA) o `app-base-modal` (resto).

### Pendiente (para la próxima sesión)
1. **Propagar el patrón de dashboard a SSOMA**: el usuario pidió específicamente seguir con OPT, Inspección u otro dashboard de SSOMA usando el mismo patrón (tokens de estado + `app-filter-modal` + `.kpi-card`) recién validado en Arquitectura Comercial. No se llegó a hacer — se acabaron los tokens de la sesión justo después de terminar AC. Preguntar por cuál dashboard seguir (OPT, Inspección, o Salud Ocupacional, quedó sin decidir).
2. Auditoría pendiente y no iniciada de "todo lo demás" que el usuario mencionó (Salud Ocupacional, y en general cualquier página fuera de los wizards SSOMA ya migrados) contra los estándares de esta y la sesión anterior — el usuario quiere una pasada completa por la app, no solo los módulos ya tocados.
3. Módulo PASO (`ssoma/salud-ocupacional/paso`) sigue con su propio sistema de diseño (tipografías propias, teal distinto) — pendiente de decisión de diseño aparte, mencionado en ambas sesiones, nunca resuelto.
4. Dentro del dashboard de AC quedan sin tokenizar: rankings (barras con gradiente hardcodeado), donut/gráficos Chart.js (colores hardcodeados en `dashboard.ts`, no en el HTML), y los 3 modales de detalle (alertas/carga/hitos) — decidir si vale la pena extender el mismo tratamiento ahí o dejarlo así.
5. No se verificó visualmente con navegador en ningún momento de esta sesión (instrucción explícita del usuario, la hizo él en su máquina). Solo se verificó con `tsc --noEmit` y `ng build` (ambos limpios) en cada paso.

## Sesión 2026-07-12

### Fix: colores del Gantt agrupados por rama (paleta por rama)

**Síntoma**: en "Ver Gantt", los colores cicleaban fila por fila (azul, verde, naranja, navy...) en vez de agruparse por rama. Bajo cada padre raíz (ej. "Definición de plano Base ARQ") los ~7 hijos directos salían cada uno de un color distinto, cuando debían mantenerse todos en la misma familia de color heredada de su raíz.

**Causa raíz**: el esquema de color en `buildColorMap` estaba desfasado un nivel. En la data de la plantilla las ramas raíz son nodos `hierarchyLevel === 0` / `parentId == null` (hay ~15-20). El código viejo daba a las raíces el tratamiento `NIVEL0_ENTRIES` (fondo blanco + borde) y cicleaba los 4 colores base (`#4080B0`, `#8CC63F`, `#E2672C`, `#102B4E`) sobre las filas `level <= 1`, es decir sobre los **hijos directos** → de ahí el cicleo. Además `findAncestorColorAtLevel` comparaba `parent.hierarchyLevel === targetLevel` con `===` sin coerción (frágil si el nivel venía como string).

**Fix — `cronograma-actividades.ts`**:
- `buildColorMap` reescrito en 2 pasos: (1) asigna un color base de los 4 **solo a los nodos raíz**, cicleando únicamente entre raíces en orden de aparición; (2) cada descendiente hereda el color base de su raíz vía `findRootColor` (camina por `parentId` hasta el nodo sin padre) y lo aclara según profundidad con `lightenHex`/`darkenHex` (nuevos helpers de mezcla con blanco/negro). Nivel raíz = color sólido + texto blanco (o `#173404` en la rama verde vía `getBranchTextColor`); nivel 1 = base aclarado 80%; nivel 2 = 90%; nivel 3+ = 94%, todos con `border-left` del color base.
- `findAncestorColorAtLevel` eliminado y reemplazado por `findRootColor` (sin dependencia del valor numérico de nivel, con guard anti-ciclo).
- Constante `NIVEL0_ENTRIES` eliminada (quedó muerta). `NIVEL0` navy se conserva solo como fallback en `getRowStyle`/`isDarkBg`.
- Las barras del Gantt dhtmlx (`renderGanttActividades`) y el mini-gantt ya leían `rowStyleMap.color`, así que heredan el color por rama automáticamente.

**Fix — `cronograma-actividades.css`**:
- `.lvl-deep td:first-child` ahora usa `border-left: 3px solid var(--lvl-border)` (antes gris fijo) → nivel 3+ muestra el color base de la rama.
- El separador de grupo (`border-top` + `padding-top`) se movió de `.lvl-1` a `.lvl-0`, para que cada familia de rama se lea como un bloque.

**Fix — `src/styles.css`**: reglas `.gantt_task_line` / `.gantt_task_content` para que las barras dhtmlx tomen el color por rama (anula el fondo/texto blanco forzado por defecto).

**Cambio menor — `cronograma-actividades.html`**: el botón "Usar plantilla" del estado vacío ahora también aparece para `tipoCronogramaActivo === 'ANTEPROYECTO'` (antes solo `PROYECTO`).

**Nota**: un cronograma con una sola raíz ahora sale en azul base (antes navy). Si se quiere conservar el navy para raíz única, habría que reintroducirlo como excepción en el paso 1 de `buildColorMap`.

## Sesión 2026-07-13

### Paleta corporativa de 10 colores por rama + tratamiento chip + fix de hover (tabla de cronograma)

Reemplazo de la paleta de 4 colores de rama (sesión 2026-07-12) por 10 tonos corporativos, y reemplazo del precálculo manual de tintes en TS por derivación en CSS con `color-mix()`. Mismo mecanismo de herencia por rama (solo los nodos raíz — `parentId == null` — ciclan la paleta; los descendientes heredan el hex exacto de su raíz vía `findRootColor`).

**`cronograma-actividades.ts`**:
- `LEVEL1_COLORS`: 10 hex corporativos (indigo, salvia, steel, bronze, clay, slate, amethyst, forest, ochre, graphite) — deben coincidir con las custom properties `--corporate-*` del `.css`.
- `rowStyleMap` simplificado a `{ color: string; text?: string }`. `color` = hex base de la rama (igual para toda la rama, usado también por las barras del Gantt sin mezclar). `text` solo se puebla para nodos raíz (nivel 1) — blanco u oscuro (`#2C2C2A`) según contraste real calculado, no hardcodeado por índice.
- `getBranchTextColor` ahora calcula contraste WCAG AA real (`relativeLuminance` + `contrastRatio`, fórmula estándar) contra blanco, con umbral 4.5:1, en vez de un array paralelo de colores de texto por índice. Nota: con esta paleta, **bronze** sí necesita texto oscuro (3.14:1 con blanco) pero **ochre** en realidad pasa el umbral con blanco (4.55:1) — usar oscuro en ochre lo empeoraría (3.08:1) — así que ochre quedó en blanco pese a la intuición inicial de que ambos lo necesitaban.
- `lightenHex`/`darkenHex` eliminados — la derivación de fondo/borde/texto de niveles hijos ahora vive en CSS (`color-mix()`), no en TS.
- `getRowStyle()` solo expone `--base-color` (+ `color` inline solo para nivel 1/raíz). Niveles hijos no llevan color inline; lo toman de `--child-text` en CSS.

**`cronograma-actividades.css`**:
- Custom properties `--corporate-*` (10) agregadas al bloque `:host`.
- Nivel 1 (raíz): fondo sólido `var(--base-color)`, texto según `getRowStyle`, `font-weight:700`, `border-radius:12px` (solo en `td:first-child`/`td:last-child`, porque la tabla usa `border-collapse:collapse` y no se puede redondear un `<tr>` completo), `box-shadow` con `color-mix(... 25%, transparent)`. Hover: `translateY(-1px)` + shadow más pronunciada — **sin tocar el background**.
- Niveles 2/3+: `--child-bg`/`--child-border`/`--child-text` derivados con `color-mix()` desde `--base-color` (10%/25%/85%). Solo nivel 3+ (`lvl-2`/`lvl-deep`) lleva el acento `border-left: 4px solid var(--base-color) !important` — antes lo llevaban todos los niveles hijos por igual.
- **Bug de hover en nivel 1** (reportado en pantalla): el fondo se aclaraba casi a blanco al pasar el cursor, ilegible sobre texto blanco fijo. Causa raíz confirmada por especificidad CSS: la regla genérica `.row-clickable:hover td { background: rgba(0,0,0,0.038) }` (specificity `(0,3,3)`) le ganaba a la regla base `.lvl-0 td { background-color: var(--base-color) }` (`(0,2,3)`) durante el hover, porque la regla de hover específica de nivel 1 nunca re-declaraba `background-color`. Fix: `.lvl-0.row-clickable:hover td` ahora re-declara `background-color: var(--base-color)` explícitamente (specificity `(0,4,3)`, gana a todo lo demás).
- Chips de fondo propio para DESFASE INI./FIN. (`.desfase-chip`), SEMÁFORO (`.sema-chip`, halo circular) y AVANCE (`.avance-wrap` con padding+radius), todos con `rgba(255,255,255,0.85)` sobre filas `row-dark` y `rgba(0,0,0,0.04)` sobre `row-light` — mismo criterio que ya usaba el badge de ESTADO (no tocado). Los overrides de color por fila en `.avance-pct`/`.avance-bar-bg` se quitaron porque ahora esos elementos viven dentro de un chip de fondo neutro, no directo sobre el color de fila.

**Pendiente / no verificado en vivo**: el border-radius de 12px y el padding de las filas nivel 1/2 no se verificaron visualmente contra las ~81 actividades de la plantilla de Proyecto (sin acceso a browser/credenciales en este entorno) — si se ve muy espaciado en una tabla densa, bajar a 6-8px es un cambio de una sola línea (buscar `border-radius: 12px`, 4 ocurrencias).

## Sesión 2026-07-14 — Observaciones (Arquitectura Comercial): estandarización de modales, quién-levanta, fotos en celular

Módulo `arquitectura-comercial/observaciones` revisado a fondo a pedido del usuario, en varias rondas.

**Performance**: la Lista llamaba a `getDashboard()` (endpoint pesado, pensado para el desglose por supervisor) solo para calcular 4 totales. Ahora usa `getStats()` (nuevo, liviano) — ver sesión de backend del mismo día.

**Estandarización de modales** — `nueva-observacion` y `levantar-observacion` usaban `app-base-modal` con markup ad-hoc (`.form-group`/`.form-label`/`.form-input`, `<input type="file">` pelado, scroll de página en vez de interno). Migrados a `app-abril-modal-panel` (`variant="teal"`, no `"blue"` — ese es solo para SSOMA) + `app-photo-grid-picker` (mismo componente que ya usa RAC) para adjuntar fotos. `levantar-observacion.html` también se alineó a `.abril-field` (antes tenía las clases viejas, inconsistente con `nueva-observacion` que sí las usaba bien).

**"Persona que reporta"**: dejó de ser texto libre. Se autocompleta con el nombre del usuario logueado (`AuthService.getUserName()`, campo bloqueado) — **excepto** cuando la sesión es la cuenta de campo compartida (`operarioscomercial@abril.pe`, constante `CUENTAS_COMPARTIDAS` en `nueva-observacion.ts`, fácil de ampliar si hay más correos compartidos), donde sí se muestra un `app-search-select` sobre el catálogo de obreros. Se quitó "Empresa que reporta" del formulario ("todos somos Abril").

**"Quién levanta"**: mismo catálogo de obreros, ahora también obligatorio en el modal de Levantar. Ver la sesión de backend del mismo día para el detalle de cómo se determinó el criterio correcto (proyecto actual = proyecto literalmente llamado "Arquitectura Comercial", vía `worker_vinculaciones` — no `Subarea`, no `ObraOficina`, no el flag `TieneArquitecturaComercial`).

**Flujo "varias observaciones seguidas"**: se descartó el checkbox "guardar y agregar otra" (no convencía al usuario) — ahora, tras guardar, un `Swal.fire` pregunta "¿Desea añadir otra?"; si confirma, el modal sigue abierto con Proyecto/Fecha/Persona prellenados (los "fijos") y solo limpia Zona/Partida/Descripción/Foto/Levantamiento.

**Crear + levantar de una**: checkbox/botón "Adjuntar foto de levantamiento (ya se levantó)" en el modal de creación — si se marca, `save()` encadena `createObservacion` → `levantarObservacion` en el mismo submit (con `switchMap`, tolera que el levantamiento falle sin perder la observación ya creada).

**Botón Guardar deshabilitado hasta completar lo obligatorio**: getter `puedeGuardar()` (Proyecto + Descripción + Persona si es cuenta compartida + Quién-levanta si se activó el toggle) — ya no se guarda con campos vacíos mostrando error en rojo después.

**Fotos rotas en celular**: las miniaturas usaban la `webUrl` cruda de SharePoint en `<img src>`, que solo carga con sesión de Microsoft 365 activa en el navegador (por eso funcionaba en escritorio de oficina, no en celular). `ObservacionesService.fotoContenidoUrl(fotoId)` ahora apunta a un proxy del backend (`.../fotos/{fotoId}/contenido`, con el JWT por query string porque un `<img>` no manda headers). Se agregó cache-busting manual (`fotoCacheBust` Map por fotoId) para que "cambiar foto" (paso previo) se refresque al toque en vez de quedar pegado a la versión vieja en caché del navegador.

**Cambiar foto ya subida**: lápiz en hover sobre cada thumbnail de la Lista (`cambiarFoto()`), llama a `reemplazarFoto()` — oculto cuando hay más de una foto de levantamiento (ambigüedad de cuál reemplazar, sin resolver aún).

### Archivos clave
- `features/arquitectura-comercial/observaciones/components/{nueva-observacion,levantar-observacion}/*`
- `features/arquitectura-comercial/observaciones/pages/lista/observaciones-lista.{ts,html}`
- `core/services/arquitectura-comercial/observaciones.service.ts`, `core/services/arquitectura-comercial.service.ts` (`getSupervisoresAc(soloObreros)`)
- `core/services/auth.service.ts` (`getUserName()` nuevo)

### Pendiente
- Verificar en celular real que las miniaturas ya cargan tras el proxy.
- Decidir cómo reemplazar una foto de levantamiento específica cuando hay varias (hoy el lápiz se oculta en ese caso).
- Si "Quién levanta" sale vacío para alguien que debería aparecer, revisar si tiene fila vigente en `worker_vinculaciones` (ver nota en CONTEXT.md del backend, sesión del mismo día).

## Sesión 2026-07-15 — Módulo Gestión de Revisiones (nuevo, frontend) + mobile Observaciones + fixes de change detection

**Módulo nuevo `arquitectura-comercial/revisiones`**, clon casi 1:1 de Observaciones (mismo componente `nueva-observacion`/`levantar-observacion`/lista/dashboard) con una capa extra: antes de reportar una observación hay que elegir una **Revisión** (catálogo Proyecto+Tipo+Lugar → nombre autogenerado, ver backend). Piezas nuevas:
- `revision-catalogo-modal` — el popup "Agrega las revisiones que requieras" (réplica de la app legacy en Power Apps que el usuario mostró en captura): Proyecto, Tipo (`R1|R2|R1-AC|R2-AC|RF-AC`), Lugar (catálogo o "Otro lugar" manual), lista de revisiones con eliminar.
- `nueva-revision-observacion` — Proyecto → Revisión (se puebla según proyecto elegido), Zona/Ambiente, Partida, Descripción, y las fotos de **Observación y Levantamiento lado a lado desde el inicio** (a pedido explícito del usuario, distinto del checkbox-toggle que usa Observaciones) — adjuntar la de levantamiento ES la señal de que se registra el levantamiento, no hay checkbox separado.
- Catálogo "Lugar a revisar" integrado al `app-catalogo-modal` genérico compartido (nueva pestaña, tipo `lugares-revision`) — reutiliza el mismo CRUD que Partidas/Áreas responsables en vez de duplicar componente.
- Rutas (`revisiones.routes.ts`), entrada en `navigation.service.ts` ("Gestión de Revisiones"), y `layout.ts` (`isFullPage()`).

**Vista de cards en mobile** (a pedido del usuario, primero en Observaciones y después clonada a Revisiones): en pantallas ≤768px la tabla se reemplaza por una lista de cards — Código/Revisión + Estado arriba, Proyecto+Fecha y Reportado-por+Partida en pares de 2 columnas, Descripción abajo, y **Observación/Levantamiento lado a lado en dos contenedores propios con fotos más grandes** (56px vs 32px de la tabla) — si no hay foto de levantamiento aparece directo el botón "Levantar" dentro de ese mismo contenedor. CSS vive en el `styles` inline del propio componente (encapsulado, no global) — **decisión explícita**: por ahora queda scopeado solo a estas dos páginas; si funciona bien se promueve a componente compartido para toda la app (hay un comentario en el código marcando esto).

**Bug real encontrado y arreglado — layout duplicado en mobile**: había una barra gris duplicada arriba en mobile (hamburger + avatar) porque `app-header` (componente legacy, con su propio `<app-sidebar-mobile>` interno) estaba montado sin condición en `layout.html`, duplicando lo que `app-abril-page-header` ya resuelve. Se sacó del layout entero — afecta a toda la app, no solo Revisiones. Causa raíz específica de por qué Observaciones lo mostraba: la ruta no estaba en la lista `isFullPage()` de `layout.ts` (a diferencia de `/arquitectura-comercial/dashboard` y `/actividades`, que sí estaban) — se agregó junto con `/revisiones`.

**Bug real — "doble clic" para que aparezca contenido en modales compartidos**: `CatalogoModal`, `ProyectosArquitecturaComercialModal` y el nuevo `RevisionCatalogoModal` no llamaban `cdr.markForCheck()` tras sus callbacks async — con Zone.js + `provideHttpClient(withFetch())`, a veces la respuesta llegaba pero Angular no repintaba hasta el próximo evento de usuario (el "clic extra" que reportó el usuario). Se agregó `ChangeDetectorRef` + `markForCheck()` en **todos** los callbacks async de esos 3 componentes, y por el mismo motivo también en `ObservacionesLista` y `RevisionesLista` completas (filtros, lista, stats, partidas, fotos, edición) — antes solo lo tenían los dashboards y `nueva-observacion.ts`. **No confirmado si esto resuelve del todo** la demora percibida al cargar "Nueva observación" — quedó pendiente de verificar con el usuario, la sesión se cortó por límite de tokens antes de esa confirmación.

**Resiliencia**: si `/filtros` falla, antes el FAB "Nueva observación" quedaba deshabilitado para siempre con el tooltip "Cargando proyectos..." (en ambos módulos) — ahora se habilita igual aunque el request falle.

**Otros ajustes UI** (aplicados primero en Observaciones, algunos son globales):
- Botón "Filtros" (`app-filter-trigger`, compartido en TODA la app) pasó del estilo chico (26px alto) al mismo look que Catálogos/Proyectos (12px/7px padding) — cambia en cualquier página que lo use, no solo Arquitectura Comercial.
- `gap: 8px` agregado a `.abril-tabs__extra` en `abril-page-header.component.css` (global) — antes los botones de header quedaban pegados sin espacio.
- En mobile, los botones proyectados en `tabsExtra` (Catálogos/Proyectos/Filtros/Revisiones) quedan solo con ícono — el texto se envuelve en `<span class="btn-label">` y una regla `@media` en `abril-page-header.component.css` lo oculta (global, pero requiere que cada página envuelva su texto en ese span para que aplique).
- Cards KPI (Reportados/Completados/Pendientes/En Proceso): pasaron de grid 2×2 a una sola fila de 4, padding y tipografía más chicos — solo en Observaciones/Revisiones.
- Lista abre con filtro `Estado = Pendiente` por defecto en ambos módulos.
- Nueva foto "Observación" sin reemplazar: endpoint `POST .../{id}/fotos` (antes solo existía reemplazar una ya subida) — botón de upload en la lista donde antes solo se veía "—".

### Archivos clave (sesión 2026-07-15)
- `features/arquitectura-comercial/revisiones/**` (módulo completo nuevo)
- `core/dtos/arquitectura-comercial/revisiones.model.ts`, `core/services/arquitectura-comercial/revisiones.service.ts`
- `features/arquitectura-comercial/observaciones/pages/lista/observaciones-lista.{ts,html}` (cards mobile, markForCheck, KPIs)
- `shared/components/layout/{layout.html,layout.ts}` (barra gris duplicada, isFullPage)
- `shared/components/{catalogo-modal,proyectos-arquitectura-comercial-modal,filter-trigger}/*`
- `shared/components/abril-page-header/abril-page-header.component.css` (gap, btn-label mobile)
- `core/navigation/navigation.service.ts` (entrada "Gestión de Revisiones", fix bug real: módulo `habilitacion` ignoraba `featureKey` para usuarios staff)

### Pendiente
- **Confirmar si el fix de `markForCheck()` resolvió la demora real al abrir "Nueva observación"** — no se verificó tras el último cambio, sesión cortada por tokens.
- **Falta migrar el historial completo de observaciones de Revisiones** (`RevisionesArqCom.csv`, ~1000 filas) a `ac_revision_observaciones` — solo se importó el catálogo de revisiones (22 filas), no las observaciones dentro de cada una. Ver CONTEXT.md del backend para el detalle del bug de mapeo de `proyecto_id` (SharePoint vs Abril) a tener en cuenta para ese import.
- No se probó de punta a punta en el navegador el flujo completo de Revisiones (crear revisión → nueva observación → levantar) tras el último fix de timestamps del backend.
- Evaluar si conviene desacoplar el FAB "Nueva observación" de que `/filtros` haya resuelto (hoy el botón depende de `filtrosListos`), en vez de solo mitigar con `markForCheck()`.

## Sesión 2026-07-15

### Movido "Cronograma de Hitos" de Proyectos a Mejora Continua

Reubicación completa del feature `milestone-schedule`, precedida de una fase de investigación (ubicación/estructura, referencias cruzadas, esquema de BD `feature`/`module`/`role_feature`, uso puntual en SSOMA) antes de tocar nada.

**Movido con `git mv`** (conserva historial) de `src/app/features/projects/milestone-schedule/` a `src/app/features/mejora-continua/milestone-schedule/` — los 4 archivos del componente (`.ts`/`.html`/`.css`/`.spec.ts`) más `services/milestone-schedule-projects.service.ts`. Los imports internos no necesitaron tocarse: ambas rutas (`features/projects/...` y `features/mejora-continua/...`) tienen la misma profundidad, así que las referencias relativas a `core/` y `shared/` siguen resolviendo igual. Los DTOs/services compartidos (`core/services/milestoneSchedule.service.ts`, `milestoneScheduleHistory.service.ts`, `milestone.service.ts`, `core/dtos/milestone*`) **no se movieron** — siguen en `core/`, los sigue usando también SSOMA (ver abajo).

**Routing**: removida la ruta de `features/projects/proyectos.routes.ts` (y su import eager de `MilestoneSchedule`). Agregada como primera entrada de `features/mejora-continua/mejora-continua.routes.ts`, con `loadComponent` lazy (siguiendo el estilo ya establecido en ese archivo, a diferencia del import eager que tenía en `proyectos.routes.ts`) → `/mejora-continua/milestone-schedule`. `featureKey` renombrado de `projects.milestone-schedule` a `mejora-continua.milestone-schedule`. Sin redirect de la ruta vieja — dejó de existir.

**`core/navigation/navigation.service.ts`**: entrada movida del módulo `proyectos` al de `mejora-continua`, como primer ítem del submenú (antes de "Dashboard" y "Lecciones aprendidas"), con el featureKey nuevo.

**8 tab-bars actualizadas** (`app-abril-page-header [tabs]` hardcodeaba `/projects/milestone-schedule` en cada una): el propio `milestone-schedule.html` (nueva ubicación), `report-response-control.html`, `actas-reunion.html`, `cronograma-actividades/proyectos-cronograma-list.html` (no `cronograma-actividades.html` — ese no tenía la referencia), `resident-monitoring-measurement.html`, `projects-dashboard.html`, `ivt-control.html`, `construction-logbook-control.html`, `configuration/pages/milestones/milestones.html`.

**SSOMA — `ssoma/gestion/presupuesto-materiales/pages/proyecto/proyecto-page.ts`**: tiene una tabla propia de cronograma (lee/escribe contra los mismos services de `core/`, sin Gantt) con un botón "Ver Gantt" (`irACronograma()`) que navegaba a la ruta vieja — actualizado a `/mejora-continua/milestone-schedule`. Comentarios textuales en `.ts:30,90,388` y `.html:13,31` también actualizados. No se tocó la tabla propia de SSOMA ni la lógica de `queryParams` que le pasa al componente destino — **bug preexistente sin relación**: `MilestoneSchedule` nunca leyó `ActivatedRoute.queryParams`, así que `projectId`/`projectDescription` viajan pero no hacen nada; queda para otra sesión si se decide arreglarlo.

**Build**: `ng build` limpio (0 errores, mismos warnings preexistentes de siempre — bundle budget, deps CommonJS no-ESM, NG8102/NG8107 en otros módulos).

### Pendiente / fuera de alcance de esta sesión
1. **BD**: la fila del feature en la tabla `feature` (columna `feature_key` = `projects.milestone-schedule`) sigue apuntando al módulo/key viejo — falta correr en BD algo como `UPDATE feature SET feature_key = 'mejora-continua.milestone-schedule', module_id = (SELECT module_id FROM module WHERE module_name = 'Mejora Continua') WHERE feature_key = 'projects.milestone-schedule'`, y verificar cuántas filas en `role_feature` apuntan a ese `feature_id` (se confirmó el esquema por código fuente de `Abril_Backend`, pero no se pudo ejecutar el SELECT real — no hay tool de conexión a BD en este entorno).
2. El bug de `queryParams` muertos en `irACronograma()` (SSOMA) mencionado arriba, no arreglado a propósito (fuera de alcance pedido por el usuario).
3. No se verificó visualmente en navegador (sin credenciales/acceso en este entorno) — solo se validó con `ng build`.

## Sesión 2026-07-16

### Fix: tab-bar de Mejora Continua sin "Cronograma de Hitos" en 4 de 5 páginas

Al mover `milestone-schedule` a Mejora Continua (sesión 2026-07-15) solo se agregó el tab "Cronograma de Hitos" al array `[tabs]` de `milestone-schedule.html`; las otras 4 páginas del feature (`lessons-dashboard.html`, `lecciones-aprendidas.html`, `lesson-reminders.html`, `lecciones-configuracion.html`) tenían el `[tabs]` hardcodeado sin ese tab, así que al navegar entre ellas el tab desaparecía/reaparecía. Se agregó la misma entrada (`route: '/mejora-continua/milestone-schedule'`, `featureKey: 'mejora-continua.milestone-schedule'`) como primer ítem en los 5 arrays, mismo orden en los 5 archivos.

### DESIGN-VICTOR.md agregado a la raíz + referencia en CLAUDE.md

El usuario agregó `DESIGN-VICTOR.md` (sistema de diseño: colores, tipografía, espaciado, componentes, sistema unificado de color jerárquico) y pidió commitearlo + referenciarlo desde `CLAUDE.md` (sección nueva "## Sistema de diseño", apunta a `DESIGN-VICTOR.md` como referencia obligatoria para trabajo visual). Se corrigió después: la sección de tipografía documentaba `Inter` como font-family pero no hay ningún `<link>` que la cargue — se investigó el código real y se documentó lo que efectivamente se renderiza (ver inventario abajo).

**Inventario del stack visual actual** (investigación pura, sin cambios de código, para decidir si integrar la propuesta externa): Tailwind v4 vía `@tailwindcss/postcss`, CSS-first (`@import 'tailwindcss'` + `@theme` en `src/styles.css`, sin `tailwind.config.js`), usado en ~62% de los 373 `.html` del proyecto. Tipografía real: `--font-sans: 'Inter'` declarado pero **no cargado** (sin `<link>`/`@font-face`) → fallback real `system-ui`; lo que sí se carga vía Google Fonts (`src/index.html`) es **Kumbh Sans** (login, boletín, birthday-club) y **Playfair Display** (títulos de página vía `abril-page-header.component.css`, o sea casi toda la app). `@angular/material`/`@angular/cdk` están instalados pero con 0 imports reales en `src/` (dependencia muerta, a confirmar con el equipo). 259 `.css` de componente: 112 usan los tokens centralizados de `styles.css` (`--color-abril-*`), pero 184 tienen hex hardcodeado (8,386 ocurrencias totales) — mezcla de tokens centralizados + mucho valor suelto por componente.

### Rediseño completo del sistema de color jerárquico — Cronograma de Actividades

Reemplazo total de la paleta corporativa de 10 colores + `color-mix()` uniforme (sesión 2026-07-13) por un sistema de badge de fase + línea conectora de árbol + acentos por `border-left`, sobre la misma paleta de 10 colores y el mismo mecanismo de asignación por rama (`buildColorMap()`/`findRootColor()`, sin tocar — solo raíces ciclan la paleta, descendientes heredan).

**`cronograma-actividades.ts`**:
- `getRowStyle()`: variable CSS renombrada `--base-color` → `--branch-color`; ya no inyecta `color` inline en nivel 1 (el fondo sólido que necesitaba ese contraste ya no existe).
- `isDarkBg()` ahora siempre `return false` — ningún nivel tiene fondo oscuro sólido en el nuevo esquema; se mantiene el método (sin borrar) porque `getBadgeStyle`/`getFechaRealStyle`/el template lo siguen llamando.
- `getChevronStyle()` eliminado (forzaba texto blanco al chevron contra un fondo sólido que ya no existe).
- Nuevo `getNivelClase(act)`: única fuente de verdad para la clase de nivel (`lvl-0/1/2/deep`), con `Number()` defensivo — cualquier valor que no sea exactamente 0/1/2 cae en `lvl-deep`, nunca deja una fila sin clase (la plantilla "Proyecto" real llega a `hierarchyLevel` 4).
- Nuevo `esUltimoDeRama(act)`: determina si el tronco de la línea conectora sigue de largo hacia la fila siguiente o se corta a la mitad de la fila actual (último descendiente visible de la rama).
- Nuevo `phaseIndexMap` + `getFaseIndex(act)`: número de fase para el badge de nivel 1 (1ª, 2ª, 3ª rama raíz), poblado con el mismo `rootIdx` de `buildColorMap()` — **bug encontrado y corregido en esta sesión**: el badge usaba `getDisplayIndex(act)` (posición de fila en las 81 actividades, ej. 1/9/22/27/75) en vez del índice de fase (1/2/3/4/5).
- `badgeHalfWidth = 10` (mitad del badge de 20px) — usado solo para el ancho del codo horizontal del conector (`.tree-elbow`), no la posición x del tronco (esa vive hardcodeada en el `.css`, ver abajo).

**`cronograma-actividades.html`**:
- Badge de fase circular (`.phase-badge`, `{{ getFaseIndex(act) }}`) — solo en nivel 1 (`*ngIf="getNivelClase(act) === 'lvl-0'"`).
- Línea conectora del árbol (`.tree-trunk` + `.tree-elbow`) en filas de nivel 2+ — técnica de segmentos por fila (tabla `<tr>` plana, sin contenedor `.activity-group` por rama): cada fila dibuja su propio tramo de tronco + codo en L; filas consecutivas de la misma rama comparten la misma x de tronco y en conjunto se ven como una línea continua.

**`cronograma-actividades.css`** — estructura final de los 3 niveles (grosor y padding del acento **unificados** tras un ajuste posterior en la misma sesión, por pedido del usuario):
- Nivel 1 (`.lvl-0`): sin fondo sólido, `border-left: 6px solid var(--branch-color)` en `.td-actividad` (no en `td:first-child` = columna de orden — quedaba a 114px del badge).
- Nivel 2 (`.lvl-1`): `background-color: color-mix(...4%...)`, `border` de 1px a `12%` en top/right/bottom, `border-left: 6px solid var(--branch-color)` (mismo grosor que nivel 1), `color: color-mix(in srgb, var(--branch-color) 80%, #1E3A5F)`.
- Nivel 3+ (`.lvl-2`/`.lvl-deep`): `background: transparent`, `color: #64748B` fijo, `border-left: 6px solid color-mix(...25%...)` (mismo grosor, menor opacidad).
- `padding-left: 0.5rem` uniforme en `.td-actividad` los 3 niveles (antes 1rem, y antes de eso variaba por nivel).
- Sin box-shadow ni hover en ningún nivel (flat, consistente con el resto de la app).
- Línea conectora: `.tree-trunk`/`.tree-elbow` en `left: 18px` (= 8px de padding-left de `.td-actividad` + 10px de mitad del badge) — recalculado tras unificar el padding, porque `position:absolute` no hereda el padding del contenedor (se mide desde el borde, no desde donde termina el padding); si el padding-left vuelve a cambiar, hay que recalcular este valor a mano (queda documentado en el comentario del `.css`).

**Build**: `ng build` limpio en cada iteración (0 errores nuevos, mismos warnings preexistentes). No se verificó visualmente en navegador en ningún punto de esta sesión (sin acceso a browser/BD/credenciales en este entorno) — todo el trabajo de diagnóstico (ej. el bug de nivel 3+ sin colorear, resuelto confirmando que la plantilla "Proyecto" real tiene 5 niveles de profundidad vía el JSON seed del backend) se hizo por lectura de código, no por inspección visual.

### Pendiente / fuera de alcance de esta sesión
1. El grosor de 6px de nivel 1 quedó sin escalar a 8px (la alternativa que el usuario pidió probar si 6px se veía débil) — no hubo forma de verificarlo visualmente en este entorno.
2. La línea conectora del árbol es de un solo tronco por rama (ancla en el badge de nivel 1), no un sistema recursivo multinivel tipo VSCode con una guía por cada generación intermedia — simplificación deliberada, documentada en su momento, no confirmada con el usuario.
3. `@angular/material`/`@angular/cdk` parecen dependencias muertas (0 imports en `src/`) — señalado en el inventario, no removido, pendiente de confirmar con el equipo antes de tocar `package.json`.

## Sesión 2026-07-17 — Cronograma de Hitos: edición de característica del proyecto

**Contexto**: en `features/mejora-continua/milestone-schedule/` (confirmado que el feature vive físicamente ahí desde el movimiento del 2026-07-15 — no hubo ninguna referencia a una ruta "UnidadDeProyectosModule" equivocada en el código Angular que corregir), la tarjeta de cada proyecto en el listado mostraba `levelDescription` ("característica del proyecto") y `residentFullNames` en solo lectura. Se agregó edición SOLO de `levelDescription`, sin tocar la visualización del ingeniero residente (sigue leyendo de `ProjectResident` sin cambios).

**Endpoint reusado**: `PUT /api/v1/project` (`ProjectEditDto`) — el mismo que usa hoy el módulo Proyectos. Como este PUT sobreescribe el DTO completo (no un patch parcial), no había forma de armar el payload solo con los campos que trae la tarjeta del listado (`ProjectGetDTO`, que no incluye `contributorId`, fechas, métricas físicas, etc.) — la única fuente que sí trae el objeto completo es `ProyectoService.getPaged()` (feature `configuracion/features/proyectos`, `ProjectDto`), así que el modal hace: 1) GET filtrado por `projectDescription` exacto + match de `projectId` en el cliente (no existe endpoint `getById` para proyecto en ningún lado del código), 2) spread del objeto completo + solo `levelDescription` sobreescrito, 3) PUT. Esto cruza el límite de features (`mejora-continua` importa `ProyectoService`/`ProjectDto`/`ProjectEditDto` de `configuracion/features/proyectos`) — decisión deliberada por falta de un endpoint `getById` de proyecto en `core/`, no una preferencia de estilo.

**Archivos tocados**:
- `milestone-schedule.html` — ícono de lápiz junto a `levelDescription` en cada card (con `stopPropagation` para no disparar la navegación al Gantt), modal nuevo `app-base-modal` "EDITAR CARACTERÍSTICA DEL PROYECTO" con skeleton (F8) mientras carga el `ProjectDto` completo.
- `milestone-schedule.ts` — estado (`showEditProjectModal`, `editProjectLoading`, `editProjectSaving`, `editProjectFull`, `editProjectLevelDescription`) + `openEditProject` / `closeEditProjectModal` / `saveEditProjectLevelDescription`. Errores (GET o PUT) van por el `error()` ya existente del componente (F9, Swal). Al guardar, actualiza `levelDescription` directo en el array `schedules` en memoria (mismo patrón que `onProjectImageChange`) en vez de un segundo GET de refresh.
- `milestone-schedule.css` — `.skeleton-line`/`@keyframes skeleton-shimmer` (paleta `#dde5ef`/`#eaeff6` de DESIGN-VICTOR §7) y estilo del botón lápiz.
- `shared/utils/sweetalert-udp.ts` (nuevo) — preset `swalUdpSuccess`/`swalUdpError` (DESIGN-VICTOR §6.9, verde `#1B6B3A` / rojo `#C0392B`). Primer y único consumidor por ahora; el resto de la app sigue con `Swal.fire()` sin este preset.
- `styles.css` — clases globales `.swal-udp-popup`/`.swal-udp-title`/`.swal-udp-text` + overrides de color de ícono, consumidas por el preset anterior.

**Build**: `ng build` limpio (0 errores nuevos, mismos warnings preexistentes de `canvg`/`flatpickr`). No se probó visualmente en navegador (sin acceso a browser/BD/credenciales en este entorno).

### Auditoría de `app-base-modal` vs. DESIGN-VICTOR §6.8 (solo lectura, sin cambios)
En esta misma sesión se hizo un inventario exacto (pedido aparte del usuario, sin tocar código) de `shared/components/base-modal/`:
- Overlay real: `rgba(0,0,0,0.4)` (negro), no el navy `rgba(13,27,42,0.4)` de §6.8.
- `border-radius` real: `14px` (clase `rounded-lg` → `var(--radius-lg)`, remapeado por el `@theme` del proyecto — confirmado en CSS compilado, **no** es el default de Tailwind de 8px), vs `10px` en la spec.
- Header: `18px bold #0F6E56` (teal `--color-abril-standard`) vs `24px bold #1E3A5F` (navy) de la spec.
- X de cerrar: `#64BC04` (verde lima), sin estado hover definido — la spec pide `#64748B` con hover a `#1E3A5F`.
- No tiene footer propio (todo proyectado vía `<ng-content>`) — alineación/estilo de botones queda 100% a criterio de cada consumidor, sin estandarizar.
- **Sin `@Input` de color** — los colores están hardcodeados en el template; la única forma de override es `::ng-deep` desde el componente padre. Único caso existente en todo el repo: `milestone-schedule.css` (agregado en la sesión anterior, 2026-07-15/16), que empuja el título a `24px #1E3A5F` y la X a `#64748B` — parche local, no cambia el componente compartido.
- **Pendiente de decisión del usuario**: si vale la pena modificar `app-base-modal` para acercarlo a §6.8 globalmente (impactaría ~100+ pantallas) o dejarlo como está y seguir parchando por instancia vía `::ng-deep` cuando haga falta.

**Merge a master (2026-07-17)**: se mergeó `victor-frontend` → `master` sin conflictos (incluye esta sesión + trabajo previo de la rama: creación de `DESIGN-VICTOR.md`, rediseño de color jerárquico de Cronograma de Actividades, ajustes de tabs de Mejora Continua). `ng build` limpio tras el merge.

## Sesión 2026-07-20 — Cronograma de Hitos: edición restringida a RESIDENTE

**Contexto**: se pidió que en `features/mejora-continua/milestone-schedule/` solo el rol `RESIDENTE` pueda editar el cronograma (crear nueva versión, agregar/editar/eliminar hitos, marcar culminado, marcar crítico); el resto de roles con acceso a la página debe quedar en solo lectura. Antes de tocar código se hizo un reporte de solo lectura sobre el modelo de permisos actual (contenido de `core/constants/roles.ts`, uso de `AuthService.hasRole()` en otros features, y cómo se obtiene el rol en runtime desde el JWT) — confirmado que el patrón `*ngIf="authService.hasRole(Roles.X)"` ya existe en varios lugares (ej. `gestion-salidas.ts:131`, `report-response-control/list/list.html:64,75`) y no requería nada nuevo fuera del feature.

**Nota de arquitectura descubierta en el reporte (no modificada)**: el acceso a la *página* `milestone-schedule` (ruta + ítem de sidebar) no se controla con `data.roles` sino con `data.featureKey: 'mejora-continua.milestone-schedule'` (`mejora-continua.routes.ts`, `navigation.service.ts`) — el `roleGuard` revisa primero `featureKey` contra `localStorage['allowed_features']` (asignación dinámica por usuario en BD) y solo cae a `data.roles`/JWT como fallback. O sea, qué roles *ven* la página hoy se decide en BD/backend, no en el frontend. Lo que se gateó en esta sesión es distinto: los controles de *edición dentro* de la página, vía `AuthService.hasRole(Roles.RESIDENTE)` en el template — independiente del featureKey de acceso a la ruta.

**Cambios**:
- `milestone-schedule.ts` — import de `Roles` (`core/constants/roles`) + campo público `readonly Roles = Roles;` para exponerlo al template (mismo patrón que `report-response-control/list/list.ts:11,22`). `AuthService` ya estaba inyectado como `public authService` desde antes.
- `milestone-schedule.html` — 6 puntos gateados con `authService.hasRole(Roles.RESIDENTE)`:
  1. Botón "Agregar nueva versión de cronograma".
  2. `*ngIf="showEditButton"` del header de acciones del Gantt (Nuevo hito/Guardar sin cambios/Guardar) — combinado con la condición existente, no reemplazado (`showEditButton` también distingue modo ver vs. modo crear/editar).
  3. Hint "Usa 'Nuevo hito'..." del estado vacío — combinado igual.
  4. `*ngIf="showEditButton"` de los botones Editar/Marcar culminado/Eliminar del modal de detalle (incluye el trigger de `toggleCulminar`).
  5. Checkbox "Crítico" de la vista de plantilla (`toggleCritico`) — sin condición previa, se agregó `*ngIf` directo.
  6. Botón "Marcar/Quitar hito crítico ⭐" (`toggleCriticoGuardado`) — combinado con la condición existente `selectedTask?.milestoneScheduleId != null`.

**Build**: `ng build` limpio (0 errores, mismos warnings preexistentes de `canvg`/`flatpickr`). No se verificó visualmente en navegador (sin acceso a browser/BD/credenciales en este entorno).

### Pendiente / fuera de alcance de esta sesión
1. El checkbox "Rango" (`toggleRango`) y los controles "+ Agregar hito personalizado"/eliminar hito de plantilla/inputs de fecha de la tabla de plantilla **no se gatearon** — no fue pedido explícitamente (solo culminar/crítico) y esa vista completa hoy solo es alcanzable a través del botón ya oculto en el punto 1, así que queda inaccesible en la UI para no-RESIDENTE de todas formas. Si se pide blindaje explícito ahí también, falta agregarlo.
2. El texto informativo bajo el botón de crítico ("Los hitos críticos son los que cortan una etapa constructiva real...") se dejó visible para todos los roles — es explicativo, no una acción de edición.
3. `MilestoneSchedule.openProjectGantt()` (`milestone-schedule.ts`) llama a `openCreateMilestoneSchedule()` directo pero no está invocado desde ningún template — código muerto/no cableado, no se tocó ni se investigó su origen.

## Sesión 2026-07-18 — Tab-bar de Proyectos: unificación, Dashboard UDP, "Proyectos Activos" y pase de diseño

**Contexto de arranque**: el tab-bar horizontal del feature Proyectos (`app-abril-page-header` `[tabs]`) estaba hardcodeado de forma independiente en cada una de las 8 páginas del feature (mismo patrón de bug ya corregido antes en Mejora Continua: `milestone-schedule`, `lessons-dashboard`, `lecciones-aprendidas`, `lesson-reminders`, `lecciones-configuracion`), así que quedaba desincronizado cada vez que se movía o renombraba una feature.

### 1. Fix del tab-bar (8 páginas + Dashboard UDP sin tab-bar)
- Corregido el array `[tabs]` en `projects-dashboard`, `cronograma-actividades` (`proyectos-cronograma-list.html`), `ivt-control`, `construction-logbook-control`, `report-response-control`, `resident-monitoring-measurement`, `actas-reunion`, `configuration/pages/milestones` — quitado el tab "Cronograma de Hitos" (apuntaba por error a `/mejora-continua/milestone-schedule`), agregado "Dashboard UDP" (faltaba) y unificado "Actas de Reunión" en las 8.
- `cronograma-dashboard.html` ("Dashboard UDP") no usaba `app-abril-page-header` — tenía su propio header hecho a mano sin tab-bar, era la única página del feature sin navegación de vuelta. Migrado a `app-abril-page-header` con el mismo set de 9 tabs; el botón "Ir al Cronograma" se conservó como `botonSecundario`; la fecha actual se reubicó dentro de la tarjeta de filtros (antes vivía en el header manual).

### 2. Bug "Actas de Reunión" no navegaba (root cause: BD, no código)
`routerLink`/`featureKey` eran correctos en las 3 capas (F6 cumplido) — el bloqueo era silencioso vía `roleGuard`: la tabla `feature` en BD local (`abril`, `localhost:5544`) sí tenía la fila (`feature_id=166`), pero `role_feature` solo la otorgaba al rol "USUARIO DE ACTAS DE REUNION" (67), no a "ADMINISTRADOR DE UDP"/"USUARIO DE UDP" (2/3) como el resto de features de Proyectos. Aplicado en local (no en producción, pendiente de túnel SSH):
```sql
INSERT INTO role_feature (role_id, feature_id)
SELECT r.role_id, f.feature_id FROM role r CROSS JOIN feature f
WHERE f.feature_key = 'projects.actas-reunion' AND r.role_id IN (2, 3)
ON CONFLICT DO NOTHING;
```
No hay cliente `psql` en este entorno — se usó `pg` (npm) vía scripts Node ad-hoc en el scratchpad de la sesión, leyendo la connection string de `Abril_Backend/appsettings.Development.json`.

### 3. Auditoría de dropdowns "Proyecto" — filtran por `Active`?
Pedido explícito de reportar antes de tocar backend. Resultado: **4 lugares no filtran por `Project.Active`** (quedó sin corregir, pendiente de coordinar con la terminal de backend):
- Dashboard de Proyectos → `ProjectsDashboardRepository.GetFiltersDataFactory()`
- Cronograma de Actividades → `CronogramaActividadesRepository.GetProyectosAsync()`
- Control de IVTs / Cuaderno de Obra / Residentes (comparten método) → `ProjectResidentRepository.GetProjectsDescription()` (filtra `ProjectResident.Active`, no `Project.Active`)
- Lessons Dashboard (Mejora Continua) → `LessonsDashboardRepository.GetFiltersAsync()` (solo incluye proyectos con ≥1 lección activa)

Ya filtran correctamente (no tocar): create-modal de IVT/Cuaderno (`GetProjectByResidentUserId`), Milestone Schedule (`ProjectsRepository.GetPagedWithResidents`), Lecciones Aprendidas (`LessonRepository`).

**No verificable**: Actas de Reunión — no se encontró ningún controlador/repositorio de "actas-reunion"/"reunion" en el checkout local de `Abril_Backend` (rama `victor-backend`, limpia y al día con origin). Puede vivir en una rama sin mergear.

### 4. Nueva pestaña interna "Proyectos Activos" en Configuración de Hitos
`configuration/pages/milestones/` no tenía sistema de tabs internas — se agregó un switcher simple (`activeTab: 'hitos' | 'proyectos'`) sin tocar la tabla/modales existentes de hitos (solo envueltos en `*ngIf`). La pestaña nueva lista **todos** los proyectos vía `ProyectoService.getPaged()` (reusa el service de `features/configuracion/features/proyectos/`, el mismo que ya usa `milestone-schedule.ts` para editar "característica del proyecto" — `GET /api/v1/project/paged` ya devuelve activos e inactivos, solo filtra por `State`, no por `Active`, así que no hizo falta cambio de backend) con un switch por fila que llama `toggleProyectoActive()` → arma `ProjectEditDto` completo (`{ ...item, active: !item.active }`) y hace `PUT /api/v1/project`, con toast SweetAlert2 inmediato (éxito) y el `error()` ya existente del componente (modal, nunca silencioso — F9). Skeleton shimmer mientras carga (F8). FAB "Nuevo hito" del header ahora condicional a `activeTab === 'hitos'`.

### 5. Rename "Hitos" → "Configuraciones" (solo label, featureKey intacto)
`route.data.titulo` en `configuracion-routing-module.ts` → `'CONFIGURACIONES'` (F11). Tab del feature-bar renombrado en las 9 páginas. `navigation.service.ts` no tenía entrada para esta página (no está en el sidebar) — nada que tocar ahí.

### 6. Pase de diseño de ambas pestañas contra DESIGN-VICTOR.md
La página (heredada, no de esta sesión) usaba los tokens `--color-abril-primary/-accent/-border/-primary-light/-dark` (sistema de los shared components 2026, `#4CAF50`/`#00897B`/`#E5E7EB`...) en vez de la paleta UDP documentada (`#1E3A5F`/`#2E6DB4`/`#1B6B3A`/`#E2E8F0`...), más colores sueltos que no calzaban con ningún sistema (`#D7FAF4`/`#009C87` en el badge de hitos, `#E2E2E2` en los inputs del modal). Corregido en ambas pestañas y sus 2 modales (crear/editar hito):
- Badges unificados en `.milestones-badge` con la paleta exacta §6.3.
- Tabla: header sin fondo teñido, uppercase/11px/`#64748B`/border-bottom, hover de fila `#F8FAFC` (§6.7, no existía antes).
- Radios de borde a la escala real (§4): `10px` cards/modal, `6px` botones/inputs/switcher.
- Modal: overlay `rgba(13,27,42,0.4)` (era `black/40`), sombra sutil `0 4px 12px rgba(0,0,0,0.08)` (era `shadow-xl`), padding/gap normalizados a la escala de 4px, título `24px bold #1E3A5F`, botón cerrar `#64748B`→hover `#1E3A5F` (§6.8).
- Inputs/select: borde `#E2E8F0`, `6px` radius, `14px`, foco `#2E6DB4` + glow (§6.6, no existía foco antes).
- Botón "Guardar": `#1E3A5F`, `6px` radius, hover con `color-mix()`, foco visible (§6.2).
- Switcher de tabs internas y switch Activo/Inactivo (armados en la sesión anterior): recoloreados a `#1E3A5F`/`#1B6B3A` con `focus-visible`.

**Sin componente documentado en DESIGN-VICTOR.md** (no se editó el archivo, queda para decisión del usuario): el switcher de tabs internas de página y el switch Activo/Inactivo no tienen sección propia — se aplicó la paleta UDP por criterio, pendiente de documentar si se van a reusar en otras pantallas.

**Build**: `ng build` limpio en cada iteración (0 errores nuevos, mismos warnings preexistentes de `canvg`/`flatpickr`). No se probó visualmente en navegador (sin acceso a browser en este entorno).

### Pendiente / fuera de alcance de esta sesión
1. Los 4 dropdowns de filtro "Proyecto" que no respetan `Active` (sección 3) — requiere cambio de backend, coordinar con la otra terminal.
2. SQL de `role_feature` para "Actas de Reunión" — aplicado solo en local, falta aplicar en producción (túnel SSH) y avisar al usuario de prueba que cierre sesión después (regla D4).
3. Backend de "Actas de Reunión" no localizado en el checkout de `Abril_Backend` — puede estar en una rama sin mergear, sin confirmar.

## Sesión 2026-07-21 — Rediseño completo de Respuesta de Informes (report-response-control)

Rediseño integral de `features/projects/report-response-control` siguiendo el estándar UI 2026 + DESIGN-VICTOR.md. El backend ya soportaba `projectId`/`stateId` como query params opcionales en `GET /api/v1/residentReportIncidence/paged` (nada de backend en esta sesión).

### 1. Inversión de la propiedad de datos (padre = smart)
Antes el fetch HTTP vivía en `list.ts` y la paginación en el padre, acoplados por `@ViewChild(List)`. Se invirtió: `report-response-control.ts` pasa a ser el componente smart (fetch + filtros + toggle + paginación + dueño de los 3 modales). `list` y el nuevo `report-cards` quedaron **presentacionales** (`@Input() data/loading`, `@Output() respond/openView`), para que ambas vistas compartan los mismos modales.

### 2. Filtros + paginado server-side
- `filtros = { projectId, stateId }` en el padre. `load(page)` pasa `{...filtros, page}`.
- Regla respetada: **cambio de filtro → `load(1)`**; **solo `onPageChange(p)` → `load(p)`** conservando filtros; `limpiarFiltros()` → reset + `load(1)`.
- `ResidentReportIncidenceService.getReportsPaged(page, projectId?, stateId?)` arma la URL con `HttpParams`, agregando cada filtro **solo si `!= null`**.
- `app-filter-trigger` (proyectado en `tabsExtra`) + `app-filter-modal` con dos `app-search-select`: **Proyecto** (selector, catálogo vía `ProjectResidentService.getProjectsDescription()`) y **Estado** (Levantado→stateId 5 / No levantado→stateId 6, confirmado por backend). Sin filtro de especialidad (descartado).
- Cumpliendo la regla R1 (ngOnInit máx 1 GET): los proyectos del filtro se cargan **perezosamente al abrir el panel de filtros** (`abrirFiltros()`), dejando `ngOnInit` con un solo GET (la lista).

### 3. Toggle tabla/tarjetas
- `type ViewMode = 'cards' | 'table'`, default `'table'`, `setView()`.
- Estado `.active` del toggle **diseñado explícito** con paleta DESIGN-VICTOR (pastilla blanca + texto navy `#1E3A5F`, inactivo `#64748B`) — el precedente `resident-monitoring-measurement` no tenía `.active` resuelto visualmente, así que no se copió.
- **Nueva vista tarjetas** `report-cards/` a 3 columnas (`xl:grid-cols-3`, igual que resident-card): imagen o placeholder, proyecto, descripción, badge de estado, y el mismo botón/texto de respuesta con **idéntico gating de rol** (RESIDENTE ve botón, ADMINISTRADOR_RESIDENTES ve "Sin respuesta").
- Badges LEVANTADO/NO LEVANTADO con colores exactos §6.3 (`#dcfce7`/`#166534` y `#fee2e2`/`#991b1b`) en ambas vistas.
- Tabla migrada a `abril-table` + `abril-table-wrap`.

### 4. Modales
- Create modal migrado a `app-base-modal`; `app-file-selector` con `[color]="var(--color-abril-standard)"` (antes verde viejo `#64BC04`). Se removió un `console.log` residual.
- `respond-report-modal` (ya usaba `app-base-modal`): sin firma digital, solo estilo/tokens actualizados.
- FAB "Nuevo registro" vía `app-fab`, gated a ADMINISTRADOR_RESIDENTES, `*ngIf="!showCreateModal"`.

### 5. Migración de tokens
Barrido completo de `--color-abril-primary`/`#64BC04` → `--color-abril-standard` en toda la página, incluido el modal de detalle (`report-view-modal` + `report-view-detail`/`report-view-images`/`report-view-active-tab`). **0 tokens viejos restantes** (verificado por grep).

### Archivos clave
- `core/services/residentReportIncidence.service.ts` (firma de `getReportsPaged`)
- `report-response-control.ts`/`.html`/`.css` (smart component + toggle + filtros)
- `report-cards/` (nuevo, vista tarjetas)
- `list/list.ts`/`.html`/`.css` (presentacional + skeleton)
- `report-response-control-create/` y `list/respond-report-modal/` (modales)
- `list/report-view-modal/**` (barrido de tokens)

**Reglas**: F1/F4 (`ng build` limpio, 0 errores nuevos; mismos warnings preexistentes de terceros), F8 (skeleton shimmer en tabla y tarjetas), F9 (error visible vía `ErrorService`), F11 (títulos de modal en MAYÚSCULAS). No probado visualmente en navegador (sin acceso a browser en este entorno).

### Pendiente / notas
- Los `.spec.ts` del feature son smoke tests (`should create`) y no referencian la API removida — compilan sin cambios.

## Sesión 2026-07-25 — Merge de `origin/master` a `victor-frontend`

Sesión de sincronización, sin desarrollo de feature propio: se trajeron a `victor-frontend` los cambios que avanzaron en `master`/`origin/master` mientras esta rama estaba en curso.

### Qué se hizo
1. `git merge master` (local) → `Already up to date` (no había commits nuevos en el `master` local que no estuvieran ya en la rama).
2. `git fetch origin master` + `git merge origin/master` → merge limpio por estrategia `ort`, **sin conflictos** (commit `6b913131`). Nada relacionado a `report-response-control` apareció en la lista de cambios.
3. `ng build` (vía `npm run build`) tras el merge: **0 errores**, mismos warnings preexistentes de terceros (CommonJS/ESM de `canvg`, `flatpickr`).
4. Push a `origin/victor-frontend` vía skill `guardar-rama`.

### Contenido traído por el merge (no escrito en esta sesión, viene de `master`)
- Feature nuevo **`gestion-gth`** completo: rutas (`gestion-gth.routes.ts`), `reclutamiento` (lista + detalle + service + dto + colores de estado) y `solicitud-personal` (lista, nueva-solicitud, revision-long-list, seguimiento, service + dto), más `configuracion-correos` compartido (destinatarios de correo).
- **`notificaciones-bell`** nuevo en `shared/components/notificaciones/` (bell + service + dto).
- Reescritura grande de `gestion-salidas` y `solicitud-salidas` (gestión-administrativa): cambios sustanciales en `.ts`/`.html` de ambos, servicios y DTOs.
- Ajustes menores en `auth.service.ts`, `navigation.service.ts`, `roles.ts`, `app.routes.ts`, `contractor-registration`, `abril-modal-panel`, `abril-page-header`, `worker-search.model.ts`, y en SSOMA (`accidente-crear-editar`, `rac-cerrar`, `rac-detalle`).

### Estado final
- `git status --porcelain` limpio antes y después del merge — no hubo cambios propios de la rama para commitear en esta sesión.
- Rama `victor-frontend` actualizada y sincronizada con `origin/master` al momento del merge.

### Addendum — segundo `guardar-rama` en la misma sesión
Aparecieron sin commitear dos skills nuevas (`.claude/skills/actualizar-master/SKILL.md`, `.claude/skills/actualizar-rama/SKILL.md`) — complementan a `guardar-rama`/`guardar-master` para traer `origin/master` hacia la rama o hacia master local. Commiteadas (`chore: agrega skills actualizar-master y actualizar-rama`), `ng build` limpio de nuevo, y subidas a `origin/victor-frontend`.

## Sesión 2026-07-26 — Fecha de registro en informes de report-response-control

### Qué se hizo
- Se agregó el campo `createdDateTime` al DTO `ResidentReportIncidenceDTO` (`core/dtos/reportResponseControl/residentReportIncidence.model.ts`).
- Nueva columna **"Fecha de registro"** en la vista tabla (`list/list.html`), formateada con `date:'dd/MM/yyyy'`, incluyendo su celda skeleton y el ajuste del `colspan` del estado vacío (5 → 6).
- Nueva línea de fecha (mismo formato) en la vista tarjetas (`report-cards/report-cards.html`), debajo del estado y antes de la descripción.
- Los tres componentes del modal de detalle (`report-view-modal.ts`, `report-view-detail.ts`, `report-view-images.ts`) actualizaron su objeto inicial vacío para incluir `createdDateTime: ''`, manteniendo el DTO consistente en todos los puntos donde se instancia.

### Archivos clave
- `core/dtos/reportResponseControl/residentReportIncidence.model.ts`
- `features/projects/report-response-control/list/list.html`
- `features/projects/report-response-control/report-cards/report-cards.html`
- `features/projects/report-response-control/list/report-view-modal/**` (report-view-modal.ts, report-view-detail.ts, report-view-images.ts)

### Estado final
- `ng build` limpio (0 errores, mismos warnings preexistentes de terceros).
- Commit `feat: muestra fecha de registro en informes de report-response-control`.

## Sesión 2026-07-26 (2) — Refinamiento visual/UX de report-response-control

Segunda sesión del día sobre la misma pantalla: refinamiento dentro de la arquitectura ya existente (no se tocó la separación smart/presentacional entre `report-response-control`, `report-cards` y `list`, ni los filtros server-side, ni `app-base-modal` como marco de los 3 modales).

### Qué se hizo

**1. Cálculo único de "tiempo transcurrido" (`shared/elapsed-time.ts`, nuevo)**
Fuente única para las tres vistas. Expone `tiempoTranscurrido(item)` → `{ dias, texto, color, porcentaje, vencido, levantado }`, más `esLevantado()`, `diasTranscurridos()` y `textoTranscurrido()`.
- Umbrales: ≤7 d verde `#1B6B3A` · ≤30 d naranja `#D97706` · >30 d rojo `#C0392B`. **Solo aplican a NO LEVANTADO**; una incidencia levantada devuelve barra vacía y texto muted `#94A3B8`.
- Escala de la barra: `min(días/60, 1)` con piso de 4% para que una incidencia de hoy muestre color. Los umbrales y el 60 son las constantes a tocar si el negocio define un SLA real.
- `esLevantado()` acepta tanto `stateDescription === 'LEVANTADO'` como `stateId === 5` (5 = LEVANTADO, 6 = NO LEVANTADO).

**2. Tarjetas (`report-cards`)**
- Barra de urgencia de 6px al tope de la tarjeta (riel `#E2E8F0`, relleno coloreado). Va dentro del `overflow:hidden` de `.report-card`, así el radio de 10px la recorta sola.
- Texto "Hace X días/semanas/meses" en el color de urgencia, reemplazando la fecha cruda que se había agregado en la sesión anterior; la fecha quedó al lado en 11px `#94A3B8` y como tooltip.
- Pill con ícono + cantidad de imágenes adjuntas sobre la esquina inferior derecha de la miniatura (evidencia fotográfica visible sin abrir el modal).

**3. Tabla (`list`)**
Se mantiene **neutra y densa a propósito** — no replica el color de las tarjetas. La columna de fecha pasó a dos líneas: fecha cruda + tiempo transcurrido en `#94A3B8`, teñido a `#C0392B` únicamente si es NO LEVANTADO con más de 30 días. Sin barra, sin badge.

**4. Filtros**
- **Estado salió de `app-filter-modal`** y pasó a pestañas siempre visibles sobre la lista (Todos / No levantado / Levantado), con subrayado navy en la activa — deliberadamente distinto del toggle Tabla/Tarjetas, que es una pastilla, para que no compitan. Cada click hace `load(1)`.
- **Proyecto** sigue dentro del modal, pero ahora muestra un chip removible sobre la lista (`Proyecto: X ✕`) que limpia el filtro sin reabrir el modal. Se guarda `filtroProyectoLabel` al elegir la opción porque `projectOptions` se carga perezosamente.
- `filtrosActivos` ahora cuenta solo Proyecto, y `limpiarFiltros()` (botón del modal) limpia solo lo que vive en el modal — no resetea la pestaña de estado.

**5. Modal "Ver informe"**
- **Se eliminaron las pestañas** "Datos generales"/"Imágenes adjuntas": todo en una sola vista con scroll. Ancho 1000px → 680px (DESIGN §6.8 pide 640–720 para formularios).
- Proyecto, Estado, Descripción y Respuesta pasaron de cajas tipo input a texto plano con jerarquía (`.campo__label` 11px uppercase `#64748B` sobre `.campo__valor` 14px `#1E3A5F`; Estado en verde/rojo según levantado).
- Nueva fila de dos columnas Fecha de registro + Tiempo transcurrido, con separador antes de la descripción.
- Imágenes como miniaturas de 80x80 entre descripción y respuesta, con el conteo en el label ("Imágenes adjuntas (2)") y **lightbox** propio (`z-60`, sobre el backdrop `z-50` de `app-base-modal`, cierre por click fuera o ✕, contador `n / total`). Reemplaza a `app-draggable-image`.
- **`report-view-active-tab/` eliminado** (componente + spec): quedó sin consumidores al sacar las tabs y no se usaba en ninguna otra pantalla.

**6. Modal "Agregar incidencia"**
- El dropzone (`app-file-selector`) sigue siendo el elemento principal — el uso real es mayormente desde escritorio.
- "Abrir cámara" pasó de botón con borde/fondo teal a link subrayado 13px `#64748B` debajo del dropzone.
- Vista previa local de 80x80 con ✕, entre el dropzone y el campo Descripción. Se dejó de usar `app-image-preview` acá (era 120x120) pero **el componente compartido no se tocó** — sigue igual para `contractor-registration`, `lessons-learned` y `respond-report-modal`.

### Archivos clave
- `features/projects/report-response-control/shared/elapsed-time.ts` (nuevo)
- `report-response-control.ts`/`.html`/`.css` (pestañas de estado + chip de proyecto)
- `report-cards/report-cards.ts`/`.html`/`.css` (barra + texto + contador de imágenes)
- `list/list.ts`/`.html` (columna de fecha con tiempo transcurrido)
- `list/report-view-modal/**` (modal sin tabs; `report-view-detail` reestructurado, `report-view-images` reescrito como miniaturas + lightbox, `report-view-active-tab` eliminado)
- `report-response-control-create/**` (cámara secundaria + miniatura de preview)

### Notas de implementación
- Tarjetas y tabla **memoizan** el resultado de `tiempoTranscurrido()` en un `Map` por `residentReportIncidenceId`, limpiado en `ngOnChanges`, para no recalcular fechas en cada ciclo de detección de cambios (la plantilla lo consulta varias veces por fila).
- `report-view-images` usa un getter `imagenes` (`images ?? []`) para blindar la plantilla ante un `images` ausente en la respuesta del backend.

### Estado final
- `ng build` limpio: **0 errores**, mismos warnings preexistentes de terceros (CommonJS/ESM de `canvg`, `flatpickr`).
- No verificado en navegador (sin acceso a sesión autenticada en este entorno) — pendiente de revisión visual del usuario.

## Sesión 2026-07-26 (3) — Filtro de Proyecto adaptado a RESIDENTE en report-response-control

Consumido el endpoint nuevo de backend `GET /api/v1/ResidentReportIncidence/assigned-projects` para que el filtro de Proyecto se adapte según cuántos proyectos tiene asignados el usuario RESIDENTE logueado (para otros roles, sin cambios: filtro visible con todos los proyectos, como antes).

**Comportamiento por cantidad de proyectos asignados (solo aplica a `Roles.RESIDENTE`):**
- **0 proyectos:** no se llama al `GetPaged` en absoluto. Se muestra un estado vacío específico ("No tenés proyectos asignados todavía. Contactá a un administrador."), distinto del "sin resultados" genérico de la tabla/tarjetas — reemplaza toolbar + tabla/tarjetas + paginador dentro del `page-container`.
- **1 proyecto:** se oculta el filtro de Proyecto (trigger + chip) — no tiene sentido elegir entre una sola opción. El `GetPaged` se llama igual, sin `projectId` (el backend ya lo filtra solo).
- **2+ proyectos:** el filtro se muestra normal, pero `app-search-select` lista solo esos proyectos (no los ~11 totales) — se reutiliza directamente la respuesta de `assigned-projects` como `projectOptions`, marcando `projectsLoaded = true` para que `abrirFiltros()` no pise esa lista con el catálogo completo.

**Archivos clave:**
- `core/services/residentReportIncidence.service.ts` — nuevo método `getAssignedProjects()` en el service existente del feature (no se creó un service nuevo).
- `report-response-control.ts` — `ngOnInit` ramifica por rol; nuevo método privado `initResidente()`; nuevos campos `sinProyectosAsignados` y `mostrarFiltroProyecto`.
- `report-response-control.html` — filter-trigger y chip condicionados a `mostrarFiltroProyecto`; nuevo bloque `@if (sinProyectosAsignados)` con el empty-state específico.

**Excepción documentada a "1 acción = 1 HTTP":** `initResidente()` llama a `getAssignedProjects()` y, condicionalmente (solo si hay ≥1 proyecto), a `load()` (`GetPaged`) dentro del mismo `next()` — es inevitable porque el conteo de proyectos decide si corresponde llamar al segundo endpoint. Ambas llamadas tienen manejo de error independiente (no queda ningún subscribe sin `error:`). Aceptado explícitamente por el usuario en esta sesión; queda anotado en la memoria `arch-1-accion-1-http` como excepción conocida, pendiente de que backend combine ambos endpoints si se quiere eliminar.

**Bug detectado y corregido en la misma sesión:** la primera versión no seteaba `loading = true` hasta que se disparaba el segundo HTTP (`load()`), así que durante la espera de `getAssignedProjects()` el usuario veía el empty-state genérico ("No hay informes para mostrar") en vez del skeleton, y recién después aparecía el skeleton real — un parpadeo visual incorrecto. Se corrigió seteando `loading = true` al principio de `initResidente()` y apagándolo también en el early-return de 0 proyectos y en el `error:` de `getAssignedProjects()` (antes quedaba colgado en `true` si esa llamada fallaba).

### Estado final
- `ng build` limpio: 0 errores, mismos warnings preexistentes de terceros.
- No verificado en navegador — pendiente de revisión visual del usuario, en particular los 3 casos (0/1/2+ proyectos) con un usuario RESIDENTE real.

## Sesión 2026-07-26 (4) — Investigación (sin cambios de código): dashboard de Arquitectura Comercial

Sesión puramente de research, sin tocar código, a pedido del usuario para entender `features/arquitectura-comercial/dashboard/dashboard.ts` (ruta `/arquitectura-comercial/dashboard`). Queda documentado acá porque no es evidente leyendo el código superficialmente y puede ahorrar tiempo en la próxima sesión que toque este dashboard:

- **Iconografía:** Tabler Icons vía **webfont** (`@tabler/icons-webfont`, import global en `src/styles.css:4`), clases `class="ti ti-nombre"` — no es una librería de componentes Angular (no hay `lucide-angular` ni Material Icons acá). Conviven algunos SVG inline hechos a mano para botones puntuales.
- **Gráficos:** todos con **Chart.js** (`chart.js` + `chartjs-plugin-datalabels`), registrado una sola vez con `Chart.register(...registerables, ChartDataLabels)` en el propio `dashboard.ts`. Cuatro charts en este componente: `renderAvanceChart()` (curva Programado/Real), `renderEficienciaChart()` (tendencia SPI Esperado/Logrado), `renderTiposChart()` (doughnut de distribución de estados) y `renderHistoricoChart()` (línea de tasa de cierre, dentro del modal de histórico de supervisor).
- **Curva de avance y tendencia SPI comparten el mismo endpoint:** ambos (`avanceSemanal` y `eficienciaSpi`) vienen del único payload de `service.getDashboardV2(f)` (`ArquitecturaComercialService`) — no hay una llamada HTTP separada para el SPI. El único chart con endpoint propio es el histórico de supervisor (`getSupervisorHistorico(userId)`, se llama al abrir ese modal específico).
- **No hay archivo de tema/config compartido para Chart.js.** Confirmado buscando en `shared/`: no existe. Cada dashboard del sistema (arquitectura-comercial, contabilidad, costs/adjudicaciones, mejora-continua/lessons, projects-dashboard, varios de ssoma, vecinos) hace su propio `Chart.register(...)` y hardcodea sus propios colores/opciones inline — es duplicación real entre ~10 dashboards, no una convención documentada. Si en algún momento se decide unificar (paleta, tooltips, fuente de labels), no hay un punto único para tocar: hay que ir dashboard por dashboard.

## Sesión 2026-08-02 — Rediseño Ejecutivo de Módulo de Proyectos (Dashboard UDP, Lista y Detalle de Cronograma)

Estandarización visual y optimización de usabilidad del módulo de Proyectos (`/projects/cronograma-dashboard`, `/projects/cronograma-actividades` y `/projects/cronograma-actividades/:id`).

### Cambios realizados:
- **Dashboard UDP (`/projects/cronograma-dashboard`)**:
  - Rediseño de 9 KPIs ejecutivos con Tabler Icons y sombras hover.
  - Tabla de proyectos estandarizada a la guía visual `.abril-table` con barra de avance y flecha de navegación en hover.
- **Lista de Proyectos (`/projects/cronograma-actividades`)**:
  - Filtro de búsqueda dinámico en tiempo real (`filtroTexto`, `proyectosFiltrados`).
  - Rediseño a **Grid de Tarjetas Ejecutivas de 3 columnas** (`repeat(auto-fill, minmax(320px, 1fr))`) para optimizar espacio.
- **Detalle de Cronograma (`/projects/cronograma-actividades/:id`)**:
  - Cabecera ejecutiva con mini píldoras de resumen del proyecto (recuento de actividades y `% de avance global` con getter `porcentajeAvanceGlobal`).
  - **Selector Dinámico de Etapas (Pipeline)** con íconos vectoriales (`ti-file-text`, `ti-building`, `ti-refresh`) para *Anteproyecto* ➔ *Proyecto* ➔ *Actualización*.
  - **Columna Congelada (`Sticky Left Column`)**: Columnas `#` y `ACTIVIDAD` fijadas a la izquierda (`position: sticky; left: 0` y `left: 114px`) con sombra divisoria.
  - **Arrastrar y Soltar (Drag & Drop)**: Manubrio `ti-grip-vertical` exclusivo en la primera celda e indicador visual de inserción azul de 3px (`.drop-above`, `.drop-below`).
  - **Corrección de Scrollbar Horizontal Fijo**: Ajuste del layout Flex (`:host`, `.page-wrapper`, `.table-card`, `.table-wrapper`) para encajar en la altura exacta del viewport del navegador, haciendo que la barra de desplazamiento horizontal permanezca **SIEMPRE VISIBLE en pantalla** en proyectos de 81+ actividades.

### Archivos clave tocados:
- `src/app/features/projects/cronograma-dashboard/cronograma-dashboard.html` / `.css`
- `src/app/features/projects/cronograma-actividades/proyectos-cronograma-list.ts` / `.html` / `.css`
- `src/app/features/projects/cronograma-actividades/cronograma-actividades.ts` / `.html` / `.css`

### Estado final:
- `npm run build` limpio: **0 errores**, mismos warnings preexistentes de paquetes de terceros.

## Sesión 2026-08-02 (cont.) — Responsable UDP en modal editar proyecto (`/configuracion/proyectos`)

Investigación + implementación del selector de "Responsables UDP" en el modal de edición de proyecto de Configuración, aprovechando el trabajo para además resolver el ID de responsable Arq. Comercial que quedaba sin usar.

### Contexto previo (investigación)
- El modal vive en `features/configuracion/features/proyectos/components/edit/proyecto-edit.ts` (+ `.html`), patrón smart/presentacional: `proyectos.ts` (smart) pasa el `ProjectDto` completo por `@Input` a `proyecto-edit.ts` (presentacional). No hace falta un GET aparte — `ProyectoService.getPaged()` ya trae `responsableArqCom`/`responsableArqComId` resueltos (R1/R6 OK).
- Antes de este cambio, "Responsable Arq. Comercial" era un `<input type="text">` de texto libre; el campo `responsableArqComId` existía en el modelo pero nunca se seteaba desde ningún control de UI del modal (quedaba huérfano).
- Se identificó un patrón ID-driven ya existente pero en **otro feature**: `arquitectura-comercial/actividades/actividades.ts` usa `app-search-select` contra `SupervisorAcDTO[]` (`{ id, apellidoNombre }`) vía `getSupervisoresAc()` + `patchProyecto()` — sirvió de referencia de shape de DTO, pero es un flujo de PATCH aparte, no tocado.
- Se investigó también un tercer "responsable" (Residente) para una futura iteración: existe un modelo de datos **separado y ya vigente**, `core/services/projectResident.service.ts` (`api/v1/projectResident`) + `ProjectGetDTO.residentFullNames: string[]` (en `core/dtos/project/project.model.ts`, el DTO "legacy" usado por `ivt-control`/`report-response-control`/etc., **no** el `ProjectDto` local de este feature). Al ser `string[]` (no un ID único), sugiere que `project_resident` podría modelar una relación 1-a-muchos, a diferencia de Arq. Comercial/UDP que son FK únicas en `project` — pendiente de que backend confirme si "Responsable Residente" sale de un campo nuevo en `project` (mismo patrón) o de esa tabla (patrón distinto, posible multi-select). No implementado, solo investigado.

### Cambios implementados
- **`proyecto-edit.ts`**: `ProjectFormModel` con `responsableUdp`/`responsableUdpId`; `loadResponsables()` hace `forkJoin` de `proyectoService.getResponsables('ARQ_COMERCIAL')` y `getResponsables('UDP')` en `ngOnInit`, listas ordenadas alfabéticamente en el componente (no vía `sortAlpha` interno, siguiendo la convención de CLAUDE.md — mismo criterio que `[sortAlpha]="false"` en `actividades.html`). `onResponsableArqComChange`/`onResponsableUdpChange` resuelven nombre+ID juntos al elegir opción en el `app-search-select`.
- **`proyecto-edit.html`**: reemplazado el `<input>` de Arq. Comercial y agregado el de UDP, ambos `app-search-select` lado a lado (`valueField="id"`, `displayField="apellidoNombre"`, `placeholder="Buscar por nombre o DNI..."`). Skeleton (F8, `.skeleton-line`/`@keyframes skeleton-shimmer`, mismo estilo que `milestone-schedule.css`) mientras carga el catálogo; mensaje de error + botón "Reintentar" si falla (F9). El checkbox `tieneArquitecturaComercial` se mantiene solo, sin equivalente `tieneUdp` — decisión confirmada con el usuario: campo vacío = no aplica.
- **`proyecto.service.ts`**: nuevo `getResponsables(tipo: 'ARQ_COMERCIAL' | 'UDP')` → `GET /api/v1/project/responsables?tipo=...` (contrato confirmado con el usuario, backend lo está agregando en `ProjectController`).
- **`project.dto.ts` / `project-edit.dto.ts`** (DTOs locales del feature, no los de `core/dtos/project/`): agregados `responsableUdp?`/`responsableUdpId?`. También se sumaron a `ProjectDto` (lectura), no solo a `ProjectEditDto`, porque `ngOnInit` necesita leer `this.project.responsableUdp` con tipado correcto.
- Nuevo `dtos/responsable-lookup.dto.ts` (`ResponsableLookupDto { id, apellidoNombre }`, `ResponsableTipo`).
- **No tocado**: `proyecto-create.ts/html` (alta de proyecto) — quedó fuera de alcance, sigue con el input de texto libre viejo.

### Pendiente / próximos pasos
- El endpoint `GET /api/v1/project/responsables?tipo=` todavía no existe en backend al momento de este commit — no se pudo probar en browser. Cuando esté levantado, verificar que el catálogo cargue y que el guardado (`PUT /api/v1/project`) persista ambos IDs correctamente.
- "Responsable Residente" queda pendiente de una futura sesión, condicionado a que backend confirme el modelo de datos (ver investigación arriba).

### Estado final:
- `ng build` limpio: **0 errores**, mismos warnings preexistentes de terceros (`canvg`, `flatpickr`).

## Sesión 2026-08-03 — Dashboard Arquitectura Comercial + fix cámara en fotos

### 1. Ranking Eficiencia (IES) — modales de detalle clickeables
En `features/arquitectura-comercial/dashboard/dashboard.ts` / `.html`:
- Modal de carga (`modalCarga`, se abre desde las barras del ranking): los chips "✓ culminadas" / "⚠ vencidas" ahora tienen `(click)="toggleModalCargaFiltroEstado(...)"` — antes eran solo texto estático, no filtraban nada pese a parecer clickeables.
- `modalCargaFiltradas` ya no oculta PENDIENTE de forma incondicional — solo si el filtro activo no es explícitamente `'PENDIENTE'` (se agregó esa opción al dropdown de estados).
- Modal histórico de supervisor (`modalHistorico`): los tiles "Pendientes"/"Vencidas" ahora llaman `verActividadesHistorico('PENDIENTE'|'VENCIDO')`, que cierra el histórico y abre el modal de carga para ese mismo supervisor con el filtro preseleccionado (reusa `abrirModalCarga` + `getActividades`, no hubo que tocar backend). Se agregó `historicoSupervisorUserId` para poder pasarlo.

### 2. Backend — IES sin castigo por mora (10%)
`Infrastructure/Repositories/ArquitecturaComercialRepository.cs`, método `GetDashboardDataFiltrado`: se quitó el componente "Penalización mora (10%)" del cálculo del IES (confundía a los supervisores — ver ejemplo Holguín 1/1 culminada mostrando 90% en vez de 100%, que en realidad era el SPI el que bajaba el número, no la mora). Fórmula anterior:
```
IES = SPI*0.35 + Cierre*0.35 + Puntualidad*0.20 + Mora*0.10
```
Fórmula nueva (renormalizada a 100% entre los 3 componentes restantes):
```
IES = (SPI*0.35 + Cierre*0.35 + Puntualidad*0.20) / 0.90
```
Confirmado que el histórico de supervisor (`GetSupervisorHistorico`) usa una métrica distinta (tasa de cierre simple por semana), no el IES compuesto — no había datos "congelados" con la fórmula vieja que arrastrar.

### 3. Fix cámara no disponible en fotos (móvil) — Observaciones y Revisiones
Reportado: en Gestión de Observaciones/Revisiones (nueva-observación, levantar-observación, y sus equivalentes de revisiones), al adjuntar foto en celular solo aparecía la galería, no la opción de cámara. Comparado contra `features/ssoma/gestion/inspeccion/` (donde sí funciona) para encontrar la diferencia real:
- Los 4 componentes ya pasaban `[multiple]="false"` al `app-photo-grid-picker` compartido (`shared/components/photo-grid-picker/`) — esa NO era la causa.
- La diferencia real: el input de `photo-grid-picker` usaba el atributo HTML `hidden`, mientras que el patrón que funciona en inspección usa `style="display:none"`. Corregido en `photo-grid-picker.html` (ambos inputs).
- Adicionalmente se agregó un botón explícito "Tomar foto" (`capture="environment"`, sin `multiple`) junto al de "Agregar foto" (galería), como respaldo — controlado por nuevo `@Input() showCameraButton = true` en `photo-grid-picker.ts`. Se oculta si el consumidor ya pasa `[capture]` explícito.
- Como es el componente compartido, el fix beneficia automáticamente a los 4 consumidores sin tocarlos individualmente.

**Build**: `ng build` limpio (0 errores nuevos). No se probó visualmente — pendiente que el usuario confirme en celular real que la cámara ya aparece.

### Nota técnica — diff grande y ruidoso en dashboard.ts
El archivo original tenía finales de línea mixtos (CRLF/CR/LF según `file`). Al editarlo, el archivo quedó completo en CRLF consistente, generando un diff de ~1900 líneas en vez de las ~30 líneas realmente cambiadas. No afecta funcionalidad, pero conviene tenerlo en cuenta al revisar el historial/blame de ese archivo.

### Pendiente / fuera de alcance de esta sesión
1. Confirmar en dispositivo real que la cámara ya aparece en Observaciones/Revisiones tras el fix de `photo-grid-picker`.
2. Backend: recompilar/reiniciar el servicio con el cambio del IES (quitar mora) para que el ranking en producción refleje la fórmula nueva.

## Sesión 2026-08-04 — Fotos de Inspección rotas + Inspecciones colaborativas

Rama: `master`. Ver detalle completo en el CONTEXT.md del backend (misma sesión, mismos cambios de dominio) — acá solo la parte frontend.

### Fix de fotos rotas
- `spUrl()` en `inspeccion-detalle.component.ts` ya no arma la URL apuntando directo a SharePoint (exigía sesión Microsoft, por eso nunca cargaban). Ahora `precargarFotos()` descarga cada foto/firma/evidencia como blob autenticado contra el nuevo endpoint backend `.../media` (mismo patrón que ya usaba `descargarPdf`, header `Authorization` manual) y arma `object URL`s locales para los `<img src>`.
- Registros antiguos (creados antes del fix) siguen rotos — no se puede recuperar la ruta relativa desde el `webUrl` guardado.

### Inspecciones colaborativas (gerencial/cruzada/coordinadores SSOMA)
- `InspeccionTipoDto.esColaborativa`: el wizard de "Nueva inspección" (`pages/nueva/`) detecta el flag y salta el paso de checklist (paso 1 → paso 3 directo) cuando el tipo es colaborativo.
- Página nueva `pages/abiertas/` — lista inspecciones colaborativas en estado "Abierta", botón "Unirme y agregar hallazgo".
- Página nueva `pages/agregar-hallazgo/` — form liviano (sin checklist) para sumar un hallazgo suelto a una inspección ya abierta: descripción, foto(s) (máx. 5), criticidad Crítico/Mayor/Menor, fecha propuesta de levantamiento, responsable, recomendación.
- Detalle (`pages/detalle/`): sección de participantes + botones "Cerrar inspección"/"Reabrir inspección" (visibles solo cuando `data.esColaborativa`).
- Ruta nueva `abiertas` y `:id/agregar-hallazgo` en `inspeccion.routes.ts`; tab nueva en `inspeccion-tabs.ts`.
- PDF de inspecciones colaborativas ahora sale horizontal tipo Excel (una fila por hallazgo) — cambio 100% backend (`InspeccionPdfService`), sin tocar el botón "Descargar PDF" del frontend.

### Archivos clave
`features/ssoma/gestion/inspeccion/{inspeccion.dtos.ts, inspeccion.service.ts, inspeccion.routes.ts, inspeccion-tabs.ts, pages/detalle/, pages/nueva/inspeccion-nueva.component.ts, pages/abiertas/, pages/agregar-hallazgo/}`.

### Pendiente
- Confirmar visualmente en dispositivo real que "Abiertas" → "Unirme" → "Agregar hallazgo" funciona bien desde 2 sesiones/dispositivos distintos simultáneos (se probó desde el mismo usuario, faltó probar con un segundo coordinador real).
- RAC tiene el mismo bug de fotos rotas en pantalla — no se tocó en esta sesión (flag como pendiente por separado).

## Sesión 2026-08-04 (2) — Merge de `origin/master` a `victor-frontend`

Sesión de sincronización, sin desarrollo de feature propio: se trajeron a `victor-frontend` los cambios que avanzaron en `master`/`origin/master` (sesiones 2026-08-03 y 2026-08-04 arriba) mientras esta rama estaba en curso.

### Qué se hizo
1. `git fetch --prune` + `git pull origin victor-frontend`: fast-forward `e2ad6a6d..5692413a` (commits de otra sesión/PC, no de esta sesión).
2. `git merge origin/master`: un solo conflicto, en `CONTEXT.md` (log de sesiones) — ambos lados agregaban secciones cronológicas distintas al final del archivo, sin pisar contenido. Resuelto concatenando ambos bloques en orden cronológico (HEAD hasta 2026-08-02, luego master 2026-08-03/2026-08-04).
3. `ng build` tras el merge: **0 errores**, mismos warnings preexistentes de terceros (`canvg`, `flatpickr`).
4. `git fetch origin master:master`: master local actualizado a `ef06a718` (igual a `origin/master`).

### Contenido traído por el merge (no escrito en esta sesión, viene de `master`)
- Feature nuevo **`postulante-formulario`** (`gestion-gth`): formulario + service + dtos, más el modal `formulario-postulante` en `reclutamiento/components/`.
- Cambios en `reclutamiento` (detalle, dtos, service).
- Ajustes en `arquitectura-comercial/dashboard` (`.ts`/`.html`) y `app.routes.ts`.
- Cambios en `ssoma/gestion/inspeccion` (dtos, service, routes, tabs, páginas `detalle`/`nueva`) y en `shared/components/photo-grid-picker`.
- Ajuste en `habilitacion/.../worker-create-edit`.

### Estado final
- `git status --porcelain` limpio antes y después del merge — no hubo cambios propios de la rama para commitear en esta sesión (aparte del merge commit).
- Rama `victor-frontend` actualizada y sincronizada con `origin/master` al momento del merge.

## Sesión 2026-08-05 — Editar email de usuario contratista

Rama: `master`. Ver detalle completo en el CONTEXT.md del backend (misma sesión) — acá solo la parte frontend.

### Cambio
El modal "Editar" de `contratista-usuarios.ts` (usado en `admin-contratista-usuarios` y en `dashboard-contratista`) ahora muestra el campo Email precargado con el valor actual y lo envía en el PUT — antes se armaba el formulario sin ese campo y no había forma de corregir un email mal escrito o inaccesible desde la UI.

### Archivos clave
- `src/app/features/habilitacion/services/contratista-usuario.service.ts` (`ActualizarUsuarioDto.email`)
- `src/app/features/habilitacion/pages/dashboard-contratista/components/contratista-usuarios/contratista-usuarios.ts` (`buildFormHtml`, `abrirModalEditar`, `preConfirmEditar`)

### Pendiente (investigado, sin cambios de código todavía)
Personal de Oficina Central / Post Venta / Arquitectura Comercial no aparece en "Programar Inducción" porque el campo Proyecto no es obligatorio al crear trabajadores `Casa` Staff/Oficina (`worker-create-edit.ts`, getter `canSubmit`). Ver CONTEXT.md del backend para el plan completo (backfill SQL + hacer el campo obligatorio).

## Sesión 2026-08-07 — Fixes de consistencia en ranking IES y dashboard AC

### 1. `estadoGantt()` reordenado (fix real, no solo cosmético)
`dashboard.ts`: el filtro "Vencido" del modal de carga usaba `estadoGantt()`, que chequeaba `EN_PROCESO` antes que `VENCIDO` — una actividad ya arrancada pero vencida se clasificaba como "en proceso" y desaparecía del filtro, aunque el chip "N vencidas" (calculado aparte, sin ese bug) sí la contara. Reordenado para igualar `ComputeEstado` del backend (vencido se evalúa primero). Confirmado con capturas del usuario: chip decía "2 vencidas", filtro mostraba "0 mostrando" — ya no debería pasar.

### 2. Detalle semanal del ranking — botón "ver cuáles"
Pregunta real del usuario: "Carbajal tiene 3/5 culminadas, ¿cuáles 2 le faltan?" — no había forma de verlo. Se agregó:
- `verDetalleSemanaSupervisor(sup)` en `dashboard.ts`: abre el modal de carga (mismo componente que ya existía) pero filtrado a `modalCargaSoloSemanaControl = true`, que restringe `modalCargaActividades` a las que su `finProgramado` cae dentro de `semanaActual.inicio`–`fin` (mismo rango exacto que usa el backend para calcular el IES en `GetDashboardDataFiltrado`).
- Botón visible "ver cuáles" (no solo ícono, se hizo texto explícito tras feedback de que un ícono gris de 12px pasaba desapercibido) junto a "X/Y culminadas/asignadas" en cada fila del ranking, con `$event.stopPropagation()` para no disparar el click del row (que abre el histórico all-time, cosa distinta).
- Modal de carga ensanchado de `820px` a `1180px/95vw` — las columnas Actividad/Proyecto se truncaban antes de eso.

### 3. IES — umbral de SPI bajado de 1.5 a 1.0
`Abril_Backend/Infrastructure/Repositories/ArquitecturaComercialRepository.cs:1513`: `compSpi = Math.Min(spiPromedio / 1.0, 1.0) * 100` (antes `/1.5`). Motivo: dos supervisores con 100% de cierre (12/12 y 4/4) no llegaban a 100% de IES porque el componente SPI exigía un ritmo de 1.5x (50% adelantado) para el máximo — un umbral irreal. Con SPI=1.0 (a tiempo) ya se obtiene el máximo de ese componente. **Este cambio vive en el otro repo (`Abril_Backend`), no aquí** — hay que confirmarlo/pushearlo ahí también.

### Sobre el corte semanal (lunes-domingo)
Se planteó cambiarlo a "viernes a jueves" porque actividades que vencen el mismo día de la consulta (viernes) generaban confusión en el ranking. El usuario pidió explícitamente **no tocarlo** ("no cambies, déjalo así") — queda lunes-domingo tal cual estaba. No se tocó ningún código de rango de semana.

### Pendiente
1. Confirmar/pushear el cambio de SPI 1.5→1.0 en el repo `Abril_Backend` (commit separado, otra terminal).
2. Verificar en el celular que el filtro "Vencido" del modal de carga ya no da 0 resultados con chip >0.

## Sesión 2026-08-07 (2) — Diagnóstico: feature de Planeamiento BIM no aparecía en el sidebar

Sin cambios de código en este repo (working tree limpio todo el rato). El feature de Planeamiento BIM (Configuración Inicial, Carga Diaria, Bloqueos) ya estaba completo en frontend y backend desde antes (`victor-frontend`, commits `71dfe1cb`/`a0e92443`/`750e02e0`), pero el usuario no lo veía en el sidebar tras loguearse.

### Causa raíz encontrada (no fue lo que se sospechaba al inicio)
El sistema de permisos es dinámico vía `allowed_features` (tabla `feature`/`role_feature` en BD, consultada en `RoleFeatureRepository.GetAllFeatures()`), y la feature `planeamiento-bim.configuracion-inicial` nunca se había sembrado ahí — ninguna feature nueva se registra sola, hace falta un INSERT manual (convención del equipo: `Abril_Backend/Migrations/Manual/*.sql`).

Se creó y el usuario ejecutó `Abril_Backend/Migrations/Manual/20260807_PlaneamientoBimFeatureSeed.sql` (idempotente): registra el `feature_key` bajo el módulo `'Proyectos'` y lo asigna a los roles 1/2/3 (mismos que exige `[Authorize]` en `PlaneamientoBimConfiguracionController`). Verificado con `SELECT` que quedaron las 3 filas en `role_feature`.

Aun así el ítem seguía sin aparecer. Se verificó con evidencia directa en el navegador (Claude in Chrome, `window.ng.getComponent` sobre `app-sidebar`):
- Los 4 `featureKey` (`proyectos.routes.ts` ×3 + `navigation.service.ts`) son byte-idénticos (comparación de charcodes, no visual).
- `localStorage.getItem('allowed_features')` en sesión real **sí** incluye `planeamiento-bim.configuracion-inicial` (104 features, token no vencido) — o sea el seed + re-login ya habían surtido efecto.
- Pero el array `config` en memoria del `NavigationService` que corría en el navegador (`comp.navService['config']`, leído directo de la instancia real) **no tenía la entrada del todo** — 8 items en vez de 9 bajo "Proyectos".
- Conclusión: el `ng serve` (PID detectado vía `Get-NetTCPConnection -LocalPort 4200`) había arrancado a las 18:09:50, y el `git merge origin/master` de "actualizar rama" (que trajo/tocó `navigation.service.ts`) se aplicó a las 18:12:48 — 3 minutos después. El dev server seguía sirviendo el bundle compilado antes del merge; un hard-reload (`Ctrl+Shift+R`) no lo resolvió porque el problema no era cache del navegador sino que el servidor nunca recompiló.

### Pendiente / acción del usuario
El usuario paró el proceso node y va a correr `npm start` de nuevo — falta confirmar visualmente que tras el reinicio "Configuración Planeamiento BIM" aparece en el sidebar de Proyectos.

### Nota para la próxima vez
Cuando "actualizar rama" trae un merge grande mientras `ng serve` ya está corriendo, no asumir que el watch mode lo recoge solo — si algo agregado/tocado por el merge no aparece en la UI aunque el código en disco esté bien, sospechar primero del dev server desactualizado (chequear PID/hora de arranque vs hora del merge) antes de asumir un bug de datos o de permisos.

## Sesión 2026-08-08 — Skills de diseño (ui-ux-pro-max/design-system) + mejoras de UX en Dashboard UDP

### 1. Instalación y curaduría de skills de diseño
Se clonó `ui-ux-pro-max-skill` directo por `git clone` en `.claude/skills/ui-ux-pro-max` (mal ubicado, con `.git` propio anidado y una segunda copia interna del skill). Se corrigió instalando con el CLI oficial (`npx ui-ux-pro-max-cli init --ai claude`), que además trajo 6 skills relacionadas (`banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`).

Tras usarlas en la práctica durante la sesión (ver punto 2) se evaluó cuáles tenían caso de uso real en este proyecto (Angular, sin generación de imágenes con IA, sin React/shadcn):
- **Se mantienen**: `ui-ux-pro-max` (consultas puntuales de accesibilidad, `--domain ux`) y `design-system` (plantilla de referencia para specs de estado de componente Default/Hover/Active/Disabled/Focus).
- **Se eliminaron** (`rm -rf`): `banner-design`, `brand`, `design`, `slides` (orientadas a generación de assets con IA/Gemini, fuera de alcance) y `ui-styling` (shadcn/ui + React, stack incompatible con Angular).
- `DESIGN-VICTOR.md` ahora documenta esto en una sección nueva "Skills de diseño disponibles" (después de "1. Principios generales"), dejando explícito que ninguna skill reemplaza la paleta/tokens ya definidos en el documento — son solo herramientas de consulta puntual.
- `.gitignore`: agregado `**/__pycache__/`, `*.pyc` y la ruta específica de un `coverage-ui.json` generado por los tests de `ui-styling` (quedó de antes de eliminarla, ya no aplica pero no hace daño dejarlo).

### 2. Mejoras en Dashboard UDP (`cronograma-dashboard`)
Usando `ui-ux-pro-max --design-system` y `--domain ux` como input (no como fuente de verdad — la paleta UDP/BCS de `DESIGN-VICTOR.md` se mantuvo intacta):

- **Filtros y paginación** (regla dura de CLAUDE.md, sin excepciones): los `<select>` nativos de Responsable/Estado se migraron a `app-search-select` dentro de `app-filter-modal`, disparado por `app-filter-trigger` en `tabsExtra`; se agregó paginación client-side con `ClientPager` sobre `proyectos` (la llamada HTTP sigue siendo una sola, R1 intacto).
- **Accesibilidad del semáforo**: el punto de color (`.semaforo-dot`) no transmitía nada por texto — se agregó `role="img"` + `aria-label`/`title` vía `semaforoLabel()`.
- **Foco visible por teclado** (`:focus-visible`, no `:focus`) en los componentes compartidos usados por el dashboard y por el resto de la app: `app-search-select`, `app-filter-trigger`, `app-filter-modal`, y la directiva `[abrilBulkAction]` — cada uno usando su propio acento ya establecido (`--ss-accent`/`--color-abril-standard`), sin introducir el azul UDP (`#2E6DB4`) en componentes globales para no desentonar en pantallas no-UDP. Confirmado visualmente por el usuario en `app-filter-trigger`; el resto solo verificado por código/build.
- **DESIGN-VICTOR.md §6.1 (Cards)**: cambiado de "sin box-shadow" a sombra sutil + hover-elevación como estándar general del sistema (no excepción de un solo feature) — `cronograma-dashboard` ya lo implementaba así y se decidió generalizarlo.
- **Segunda pasada de detalle visual**: radius de badges a `4px`, colores de badge AL DÍA/CON RETRASO ajustados a los hex exactos de la spec, fila CON_RETRASO a `#FFF5F5`, barra de avance a `height:6px/radius:3px`, estado vacío con ícono más grande (`48px`) y más padding, grid de KPIs de `4` a `3` columnas (9 KPIs no dividían parejo en 4).
- **Iconografía**: 2 íconos KPI genéricos reemplazados por unos más específicos y consistentes con otros dashboards del proyecto — `ti-calendar-stats` → `ti-calendar-month` (Culminadas Este Mes) y `ti-chart-dots` → `ti-gauge` (SPI Promedio, mismo ícono que usa `arquitectura-comercial/dashboard` para métricas de índice). Verificado que ambas clases existen como glifos reales en `tabler-icons.min.css` instalado.

### Archivos clave
- `src/app/features/projects/cronograma-dashboard/cronograma-dashboard.{ts,html,css}`
- `src/app/shared/components/{search-select,filter-trigger,filter-modal}/*`
- `src/app/shared/directives/abril-bulk-action.directive.ts`
- `DESIGN-VICTOR.md`, `.gitignore`
- `.claude/skills/` (solo quedan `ui-ux-pro-max`, `design-system` + las 4 skills de git internas del proyecto)

### Pendiente
- Verificar visualmente con Tab los 2 `app-search-select` del modal de filtros, los botones "Limpiar filtros"/"Listo"/✕, y algún botón `[abrilBulkAction]` en otra pantalla (solo se confirmó `app-filter-trigger`).
- Evaluar si conviene agregar `color="#2E6DB4"` explícito a los `app-search-select` de este dashboard para que calcen con la paleta UDP (hoy usan el teal por defecto del componente).

## Sesión 2026-08-08 (2) — Merge de `victor-frontend` a `master` (producción)

`master` estaba 13 commits atrás de `origin/master` (sin cambios propios pendientes) — se sincronizó con `git merge --ff-only origin/master` y luego se trajo todo `victor-frontend` con `git merge victor-frontend` (fast-forward limpio, sin conflictos). Esto sube a producción, además del trabajo de la sesión de hoy (documentado arriba), el trabajo de sesiones previas de `victor-frontend` que todavía no había llegado a `master`: feature completo de **Planeamiento BIM** (Configuración Inicial, Carga Diaria, Bloqueos), y cambios en `report-response-control` (nuevo `report-cards`, `elapsed-time.ts`, reestructuración del modal de detalle). `ng build` tras el merge: 0 errores, mismos warnings preexistentes de terceros.

## Sesión 2026-08-10 — Convalidación de EMO, firma electrónica y control de cambio de puesto

Contraparte frontend de la sesión del backend (ver `Abril_Backend/CONTEXT.md`, mismo día).

- **Convalidaciones** (`create`/`review`): puesto/clasificación origen-destino ya no se
  digitan a mano — se muestran de solo lectura (el backend los resuelve del historial de
  vinculación). Antes de guardar Aprobada/Aprobada con Observaciones/Rechazada, pide PIN
  del médico + fuerza reautenticación de Microsoft (`FirmaElectronicaService`,
  `MicrosoftAuthService.getFreshSignatureToken()` con `prompt: 'login'`). Acceso directo a
  "Programar EMO" embebido en la revisión.
- **Catálogo de médicos**: nuevo `firma-digital-pad` (canvas para dibujar la firma, exporta
  PNG transparente), botón "Subir escaneado" (SSO-FO-149 firmado a mano), botón "PIN de
  firma", botón "Autorización de firma" (descarga el PDF).
- **Habilitación → Cambiar obra** (`cambiar-obra.*`): reestructurado con 4 checkboxes
  independientes (obra / razón social / puesto / clasificación) — cada campo queda
  bloqueado hasta marcar su checkbox, para no arrastrar cambios no marcados a propósito.
- **Editar trabajador** (`worker-create-edit.html`): obra, razón social, categoría,
  ocupación, puesto y clasificación pasaron a solo lectura en modo edición — ese cambio
  ahora va exclusivamente por "Cambiar obra" (el backend ya lo exige también).

### Verificado
`ng build` sin errores (solo warnings preexistentes de dependencias de terceros —
`canvg`/`rgbcolor`, `flatpickr` no-ESM). Probado en vivo con trabajador real (Justiniani
Aranda) — ver detalle en `Abril_Backend/CONTEXT.md`.

### Pendiente
Igual que el backend: subir documentos del EMO directo desde "Revisar convalidación" (hoy
solo se visualizan, no se cargan ahí).
