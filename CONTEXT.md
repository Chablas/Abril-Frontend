# CONTEXT.md — Abril Frontend

Contexto operativo para sesiones de Claude Code. Complementa a `CLAUDE.md` (que se carga automáticamente) con info de implementación, decisiones, estado de módulos y atajos para no escanear el código entero.

> **Convenciones**: rutas tipo `path/file.ts:NN` apuntan al archivo y línea referida.
> El idioma de la UI es **español (es-PE)**; títulos en `route.data.titulo` van en MAYÚSCULAS.

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
    ├── configuracion/            # standalone routes (admin: empresas, proyectos, trabajadores)
    ├── contractors/              # standalone routes (pública + admin)
    ├── costs/                    # NgModule (adjudicaciones)
    ├── home/                     # Inicio
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

### Convención `configuracion/` (módulo nuevo, standalone routes)
```
features/configuracion/
├── configuracion.routes.ts       # CONFIGURACION_ROUTES (export const)
└── pages/
    ├── companies/                # Razones Sociales (read-only)
    ├── projects/                 # Proyectos + botón Emails SSOMA (PATCH)
    └── workers/                  # Lista de Trabajadores (read-only, paged)
```
Reutiliza servicios/DTOs de SSOMA (`CatalogosSaludService.getEmpresas`, `EmoService.getEmosPorTrabajador`) y de core (`ProjectService.getProjectPaged`, `patchProjectEmails`). El modal `ProjectEmailsForm` se reutiliza por **import cross-feature** desde `features/projects/configuration/pages/proyectos/components/project-emails-form/`.

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
/contractors                                → CONTRACTORS_ROUTES (público — registro contratistas)
/**                                         → redirect /auth/login
```

### Sub-rutas `/configuracion`
```
/configuracion              → redirect 'companies'
/configuracion/companies    → Companies (Razones Sociales)
/configuracion/projects     → Projects (Proyectos + botón Emails SSOMA)
/configuracion/workers      → Workers (Lista de Trabajadores)
```

### Guards
- `authGuard` (`core/guards/auth.guard.ts`): SSR → `true` (¡no quitar! evita problemas con refresh); sin token → `/auth/login`; token expirado → logout + login.
- `roleGuard` (`core/guards/role.guard.ts`): lee `route.data.roles` (string[]) y exige al menos uno presente en JWT roles.

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
data: { titulo: 'TÍTULO EN MAYÚSCULAS', roles: ['ROL_X', 'ROL_Y'] }
```
El `Header` lee `data.titulo` de la ruta activa más profunda.

### Sidebar
Fuente única: `core/navigation/navigation.service.ts` (`config: NavModule[]`). Cada `NavModule` tiene `key`, `label`, `iconKey`, `baseRoute`, `roles`, `items[]`, `groups[]`.
**Agregar feature al menú = wirear ruta + entry en `navigation.service.ts`.**

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
    const token = localStorage.getItem('access_token');   // ⚠️ NO defensivo
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
- `.badge` — pill 999px, 0.72rem/600. Combinar con chip-* para color.

### Tabs (patrón usado en `emos/components/emo-detail/` y `catalogos/`)
```css
.tabs            { display: flex; gap: .25rem; border-bottom: 1px solid #e5e7eb; }
.tabs button     { padding: .55rem .85rem; border-bottom: 2px solid transparent; }
.tabs button.active { color: #111827; border-bottom-color: #64bc04; }
```

> **Pages legacy de `features/projects/configuration/pages/proyectos/`** usan Tailwind directamente (no este sistema). Cuando edites ahí, sigue su estilo Tailwind para no romper consistencia local.

---

## 6. Componentes compartidos (`shared/components/`)

Importables como standalone desde cualquier feature.

| Componente | Selector | Path | Notas |
|------------|----------|------|-------|
| `BaseModal` | `app-base-modal` | `shared/components/base-modal/` | Inputs: `title`, `width` (default `w-[1000px]`). Output: `closeModal`. Slot `<ng-content>`. Cierra al hacer mousedown sobre backdrop. |
| `Paginator` | `app-paginator` | `shared/components/paginator/` | Inputs: `totalRecords`, `currentPage`, `totalPages`. Output: `pageChange`. Hasta 5 botones visibles. |
| `SearchSelect` | `app-search-select` | `shared/components/search-select/` | Dropdown con búsqueda. Inputs: `options`, `valueField` (default `id`), `displayField` (default `name`), `value`, `placeholder`, `showLabel`, `label`, `allowClear` (default `true`). Output: `valueChange`. Botón X inline para limpiar valor cuando `allowClear = true`. |
| `ViewToggle` | `app-view-toggle` | `shared/components/view-toggle/` | Toggle list/calendar/grid según `modes: ViewToggleMode[]`. |
| `Layout` | — | `shared/components/layout/` | Shell autenticado. Renderiza Header + Sidebar + `<router-outlet>`. |
| `Header`, `Sidebar`, `SidebarMobile`, `NavIcon` | — | `shared/components/header,sidebar*,nav-icon/` | Usados por Layout. **`NavIcon`** acepta `key` (string) y `size` (number); registra SVGs por `iconKey` en un `ngSwitch`. Keys actuales: `projects`, `contractors`, `costs`, `security`, `ssoma`, `config`. Para añadir un módulo al sidebar con icono nuevo, hay que **agregar un `<svg *ngSwitchCase="'<key>'">`** en `nav-icon.html`. |
| `FileSelector`, `FilePreview`, `ImagePreview`, `DraggableImage`, `CameraWeb` | varios | `shared/components/file-selector,file-preview,image-preview,draggable-image,camera-web/` | Manejo de archivos/imágenes. |

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
| Método | Endpoint | Servicio |
|--------|----------|----------|
| POST | `/api/v1/auth/login` | `AuthService.login` |
| POST | `/api/v1/auth/set-password` | `AuthService.setPassword` |
| POST | `/api/v1/auth/forgot-password` | `AuthService.forgotPassword` |
| GET (paged) | `/api/v1/user/paged?page=N` | `UserService.getUserPaged` |
| POST | `/api/v1/user` | `UserService.createUser` |
| PUT | `/api/v1/user/{id}` | `UserService.updateUser` |
| PATCH | `/api/v1/user/{id}/toggle` | `UserService.toggleUser` |
| GET | `/api/v1/role` | `RoleService` |
| GET | `/api/v1/person` | `PersonService` |
| POST | `/api/v1/microsoft` | `MicrosoftAuthService` (login MS) |

### Proyectos
| Método | Endpoint | Servicio |
|--------|----------|----------|
| GET | `/api/v1/project/paged?page=N` | `ProjectService.getProjectPaged` |
| GET | `/api/v1/project/paged-with-residents?page=N` | `ProjectService.getProjectPagedWithResidents` |
| GET | `/api/v1/project/with-resident-by-userId` | `ProjectService.getWithResidentByUserId` |
| POST | `/api/v1/project` | `ProjectService.createProject` |
| PUT | `/api/v1/project` | `ProjectService.editProject` |
| DELETE | `/api/v1/project/{id}` | `ProjectService.deleteProject` |
| GET | `/api/v1/project/{id}/emails` | `ProjectService.getProjectEmails` |
| PATCH | `/api/v1/project/{id}/emails` | `ProjectService.patchProjectEmails` |
| GET (paged + filtros) | `/api/v1/project/paged?search=…&estado=…&companyId=…` | `ProjectService.getProjectsPaged` |
| — | `/api/v1/projectResident` | `ProjectResidentService` |
| — | `/api/v1/userProject` | `UserProjectService` |

### Configuración (proyectos)
| Endpoint | Servicio |
|----------|----------|
| `/api/v1/area` | `AreaService` |
| `/api/v1/phase` | `PhaseService` |
| `/api/v1/stage` | `StageService` |
| `/api/v1/substage` | `SubStageService` |
| `/api/v1/layer` | `LayerService` |
| `/api/v1/subspecialty` | `SubspecialtyService` |
| `/api/v1/phaseStageSubStageSubSpecialty` | `PhaseStageSubStageSubSpecialtyService` |
| `/api/v1/milestone` | `MilestoneService` |

### SSOMA — Salud Ocupacional
Base: `${apiUrl}api/v1/ssoma/salud-ocupacional`

| Método | Endpoint | Servicio |
|--------|----------|----------|
| GET | `/dashboard` | `DashboardSaludService` |
| GET | `/workers/search?...` | `WorkerSearchService` |
| GET | `/workers/{id}/historial-emo` | `EmoService.getHistorial` |
| POST | `/workers` | `WorkerService.createWorker` |
| PUT | `/workers/{id}` | `WorkerService.updateWorker` |
| PATCH | `/workers/{id}/retirar` | `WorkerService.retirarWorker` |
| GET (paged) | `/emos` | `EmoService.getEmos` |
| GET (paged) | `/emos/por-trabajador` | `EmoService.getEmosPorTrabajador` |
| GET | `/emos/{id}` | `EmoService.getEmo` |
| POST | `/emos` | `EmoService.createEmo` |
| PUT | `/emos/{id}` | `EmoService.updateEmo` |
| PATCH | `/emos/{id}/estado` | `EmoService.patchEstado` |
| GET (paged) | `/programaciones` | `ProgramacionService.getProgramaciones` |
| GET | `/programaciones/{id}` | `ProgramacionService.getProgramacion` |
| POST | `/programaciones` | `ProgramacionService.createProgramacion` |
| PUT | `/programaciones/{id}` | `ProgramacionService.updateProgramacion` |
| PATCH | `/programaciones/{id}/estado` | `ProgramacionService.patchEstado` |
| GET (paged) | `/interconsultas` | `InterconsultaService.getInterconsultas` |
| GET | `/interconsultas/{id}` | `InterconsultaService.getInterconsulta` |
| PUT | `/interconsultas/{id}` | `InterconsultaService.updateInterconsulta` |
| GET (paged) | `/convalidaciones` | `ConvalidacionService.getConvalidaciones` |
| GET | `/convalidaciones/{id}` | `ConvalidacionService.getConvalidacion` |
| POST | `/convalidaciones` | `ConvalidacionService.createConvalidacion` |
| PUT | `/convalidaciones/{id}` | `ConvalidacionService.updateConvalidacion` |
| GET | `/catalogos/clinicas` | `CatalogosSaludService.getClinicas` (cached) |
| POST | `/catalogos/clinicas` | `CatalogosSaludService.createClinica` |
| PUT | `/catalogos/clinicas/{id}` | `CatalogosSaludService.updateClinica` |
| GET | `/catalogos/medicos` | `CatalogosSaludService.getMedicos` (cached) |
| POST | `/catalogos/medicos` | `CatalogosSaludService.createMedico` |
| PUT | `/catalogos/medicos/{id}` | `CatalogosSaludService.updateMedico` |
| GET | `/catalogos/emo-tipos` | `CatalogosSaludService.getEmoTipos` (cached) |
| POST | `/catalogos/emo-tipos` | `CatalogosSaludService.createEmoTipo` |
| PUT | `/catalogos/emo-tipos/{id}` | `CatalogosSaludService.updateEmoTipo` |
| GET | `/catalogos/examen-tipos` | `CatalogosSaludService.getExamenTipos` (cached) |
| GET | `/catalogos/restriccion-tipos` | `CatalogosSaludService.getRestriccionTipos` (cached) |
| GET | `/catalogos/empresas` | `CatalogosSaludService.getEmpresas` (cached) |

> **Catálogos cacheados** usan `shareReplay(1)`. Llamar `invalidateCache()` después de mutar un catálogo para refrescar dropdowns.

### Arquitectura Comercial
Base: `${apiUrl}api/v1/arquitectura-comercial`

| Método | Endpoint | Servicio |
|--------|----------|----------|
| GET | `/dashboard` | `getDashboardData` |
| GET | `/filters` | `getFilters` |
| GET | `/proyectos-con-actividades` | `getProyectosConActividades` |
| GET | `/supervisores-ac` | `getSupervisoresAc` |
| GET | `/actividades?proyectoId=&tipo=&search=&soloActivas=&pagina=&porPagina=` | `getActividades` |
| POST | `/actividades` | `createActividad` (body: `CreateActividadBody`) |
| PUT | `/actividades/{id}` | `updateActividad` (body: `UpdateActividadBody`) |
| PATCH | `/actividades/{id}` | `patchActividad` (body: `ActividadPatchBody`) |
| DELETE | `/actividades/{id}` | `deleteActividad` |
| POST | `/actividades/generar` | `generarActividades` (body: `{ proyectoId }`) |
| POST | `/actividades/reasignar-encargado` | `reasignarEncargado` |
| PATCH | `/proyectos/{id}` | `patchProyecto` |
| GET | `/plantilla` | `getPlantilla` |
| POST | `/plantilla` | `createPlantilla` |
| PATCH | `/plantilla/{id}` | `patchPlantilla` |
| GET | `/categorias` | `getCategorias` |
| GET | `/especialidades` | `getEspecialidades` |
| GET | `/etapas` | `getEtapas` |
| GET | `/gantt` | `getGantt` |

**DTOs clave** (`core/dtos/arquitectura-comercial/actividades.model.ts`):
- `ActividadListItemDTO` — fila de tabla (incluye `estado` computado y `retraso` días).
- `ActividadPatchBody` — solo fechas programadas/efectivas, userId, observaciones.
- `CreateActividadBody` — nombre, tipo, projectId, etapaId, userId, fechas programadas.
- `UpdateActividadBody` — igual que Create más inicioEfectivo, finEfectivo, observaciones.
- `AcEtapaDTO { id, nombre }` — catálogo de etapas del backend.

---

## 8. Estado actual de cada módulo

### `features/auth/` — ✅ Completo
- Login (form propio + Microsoft via MSAL).
- `complete-registration` (set password con token).
- `msal-redirect` callback.

### `features/home/` — ✅ Completo
- Página Inicio simple post-login.

### `features/security/` — ✅ CRUD completo
- `/security/users` (gestión de usuarios). Rol: `ADMINISTRADOR DEL SISTEMA`.
- Lista paginada con búsqueda client-side. CRUD completo: crear, editar, toggle activo/inactivo.
- Ver §13 para detalles de implementación.

### `features/projects/` — ✅ Producción / 🔵 En evolución
Sub-features: lecciones, dashboard, milestone-schedule (gantt), IVT control, cuaderno obra, informes, seguimiento residentes, configuración (áreas/fases/etapas/etc.). Todos completados. Proyectos incluye botón **"Emails SSOMA"** → modal `ProjectEmailsForm` (PATCH `/api/v1/project/{id}/emails`).

### `features/costs/` — ⚠️ Solo Adjudicaciones
- `/costs/adjudicaciones`. Rol: `ADMINISTRADOR DEL SISTEMA`.

### `features/contractors/` — ✅ Completo
- Doble routing: `CONTRACTORS_ROUTES` (`/contractors/registro`, público) + `CONTRACTORS_ADMIN_ROUTES` (`/contractors/management`, autenticado).

### `features/arquitectura-comercial/` — ✅ Completo
- Dashboard, Actividades (CRUD completo), Gantt, Plantilla.
- Gantt usa **dhtmlx-gantt** + **QuickChart** (POST cuando GET URL > `QUICKCHART_GET_LIMIT = 16000` chars).
- **Actividades — CRUD completo**: editar actividad (PUT), eliminar actividad (DELETE con Swal confirm), crear consulta (POST).
- **Botón "+ Nueva Consulta"**: visible solo cuando `tipoFiltro === 'CONSULTA'` (`actividades.html`). Abre `components/nueva-consulta/`.
- **Modal Nueva Consulta**: nombre generado como `{etapa}_RFI_{numero}_{ubicacion}`. Etapa del nombre es lista fija hardcodeada `['ETAPA 1', 'ETAPA 2', 'ETAPA 3', 'ETAPA 4']` (NO carga del endpoint `/etapas`). Etapa para columna sí carga del endpoint.
- **Modal Editar Actividad**: `components/editar-actividad/`. Campos: nombre, tipo (ENTREGABLE/HITO/CONSULTA), etapa (del endpoint), responsable, 4 fechas, observaciones. Pre-poblado desde `ActividadListItemDTO` en `ngOnChanges`.
- **Eliminar**: botón basura en cada fila → Swal → DELETE → `loadActividades()`.
- **DTOs añadidos**: `CreateActividadBody`, `UpdateActividadBody` (en `core/dtos/arquitectura-comercial/actividades.model.ts`).
- **Métodos de servicio añadidos**: `createActividad()`, `updateActividad()`, `deleteActividad()` (en `ArquitecturaComercialService`).

### `features/ssoma/salud-ocupacional/` — ✅ Completado
- Dashboard, EMOs, Programaciones, Interconsultas, Convalidaciones, Catálogos (Clínicas/Médicos/Tipos de EMO con CRUD).

### `features/configuracion/` — ✅ Completo
Standalone routes. Razones Sociales (read-only), Proyectos (CRUD con emails SSOMA), Trabajadores (CRUD completo).

### Branches actuales
- Working: `feature/arquitectura-comercial`.
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
- Cada ruta protegida **debe** declarar `data.titulo` y `data.roles`.
- Para que aparezca en sidebar: agregar en `core/navigation/navigation.service.ts:config`.

### DTOs
- Sufijo difiere: `core/dtos/*` usa `DTO` (mayúsculas), SSOMA usa `Dto`. **No uniformizar**.
- Páginas standalone **NO** se declaran en `declarations` del NgModule.

### Backend pitfalls (ASP.NET / PostgreSQL)
- **`AuditoriaInterceptor` debe ser Singleton** (no Scoped) — usar `services.AddSingleton<AuditoriaInterceptor>()`.
- **Columnas jsonb** en `AuditoriaCambio` requieren `.HasColumnType("jsonb")` en `OnModelCreating`.
- **Snapshot EF desfasado**: antes de aplicar migraciones, leer `Up()` operación por operación.
- **`@microsoft.graph.downloadUrl` y `Content-Disposition`**: el endpoint `/habilitacion/archivos/url` devuelve URLs con `Content-Disposition: attachment` — usar fetch-as-blob (ver §12 "Visor de documentos PDF").
- **`esAbril` en BD**: el campo viene `false` para todos los registros actuales (criterio `ContributorName.Contains("ABRIL")` no matchea). **No filtrar por `esAbril`** — mostrar todas las empresas.

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
6. **Roles**: `data: { titulo: 'TÍTULO', roles: [...] }` en cada ruta.
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
/habilitacion                          → redirect 'trabajadores'
/habilitacion/trabajadores             → Plataforma Trabajadores
/habilitacion/empresa                  → Plataforma Empresa
/habilitacion/equipos                  → Equipos y Máquinas
/habilitacion/bandeja                  → Bandeja de Aprobaciones
/habilitacion/sctr-vidaley             → SCTR y Vida Ley
/habilitacion/inducciones              → Programar Inducción (ruta activa, SIN item en sidebar)
/habilitacion/registros-modelo         → Registros Modelo
/habilitacion/evaluacion-supervisores  → Evaluación Supervisores
/habilitacion/auditoria                → Auditoría (solo ADMINISTRADOR SSOMA)
/habilitacion/reglas                   → Reglas de Entregables (solo ADMINISTRADOR SSOMA)
```

> **Inducciones no aparece en el sidebar** — el item fue eliminado de `navigation.service.ts`. La ruta sigue activa pero se accede desde el botón "Programar Inducción" dentro de Trabajadores. Las inducciones se gestionan desde la Bandeja de Aprobaciones (tipo INDUCCION).

### Restricciones del rol CONTRATISTA
- CONTRATISTA solo ve en sidebar: Trabajadores, Registros Modelo. No ve: Empresa, Equipos, SCTR/Vida Ley, Bandeja, Evaluación Supervisores, Reglas, Auditoría.
- Filtro server-side por `empresaId`: el backend detecta rol CONTRATISTA en JWT y filtra automáticamente. El frontend nunca envía `empresaId` para CONTRATISTA.

### Auth contratistas
- Login en `/auth/login` con selector empresa + password.
- JWT contratista trae `role='CONTRATISTA'` y `empresaId`.
- Contratistas **NO** pueden aprobar documentos — solo dejan en estado `Enviado`.

### Base URL backend
```ts
HABILITACION_BASE = `${environment.apiUrl}api/v1/habilitacion`
```

### Endpoints disponibles
| Método | Endpoint |
|--------|----------|
| GET/POST/PUT | `/empresas` |
| GET | `/empresas/{id}/proyectos` |
| POST/DELETE | `/empresas/{id}/proyectos/{proyectoId}` |
| GET | `/catalogos/items-trabajador` |
| GET | `/catalogos/items-empresa` |
| GET | `/catalogos/items-equipo` |
| GET | `/catalogos/criterios` |
| GET | `/catalogos/areas` |
| GET | `/catalogos/subareas?area={area}` |
| POST | `/auth/login` (contratista) |
| GET | `/auth/empresas` |
| GET | `/trabajadores` (paginado) |
| GET | `/trabajadores/{id}` (detalle) |
| PUT | `/trabajadores/{id}` (editar perfil) |
| GET | `/trabajadores/{id}/entregables` |
| PUT | `/trabajadores/entregables/{id}` |
| GET | `/trabajadores/entregables/{id}/versiones` |
| PATCH | `/trabajadores/{id}/cambiar-obra` |
| PATCH | `/trabajadores/{id}/reingreso` |
| GET | `/trabajadores/{workerId}/proyectos` |
| POST | `/trabajadores/{workerId}/proyectos` |
| DELETE | `/trabajadores/{workerId}/proyectos/{proyectoId}` |
| PATCH | `/trabajadores/{workerId}/proyectos/{proyectoId}/induccion` |
| GET | `/bandeja` (paginado) |
| PATCH | `/bandeja/trabajador/{id}` |
| PATCH | `/bandeja/empresa/{id}` |
| PATCH | `/bandeja/equipo/{id}` |
| PATCH | `/bandeja/induccion/{id}` (aprobar inducción — sin body de vigencia) |
| GET | `/empresas/{id}/entregables` |
| PUT | `/empresas/{id}/entregables/{itemId}` |
| GET/POST | `/sctr-vidaley` |
| GET | `/sctr-vidaley/{id}` |
| PATCH | `/sctr-vidaley/{id}/aprobar` |
| GET | `/sctr-vidaley/por-trabajador/{workerId}` |
| GET | `/sctr-vidaley/proximos-vencer` |
| GET | `/sctr-vidaley/trabajadores-por-empresa?proyectoId=X&tipo=Y&estadoSctr=Z&estadoVidaLey=W` |
| GET/POST/PUT | `/equipos` |
| GET | `/equipos/{id}/entregables` |
| PUT | `/equipos/entregables/{id}` |
| GET | `/inducciones` (paginado) |
| POST | `/inducciones` (batch — body `InduccionBatchCreateDto`) |
| PATCH | `/inducciones/{id}/estado` |
| PATCH | `/inducciones/{id}/aprobar` |
| POST | `/inducciones/aprobar-batch` body `{ ids }` |
| GET | `/inducciones/trabajadores-por-programar?proyectoId=X&empresaId=Y` |
| GET/POST/PUT/DELETE | `/reglas` |
| GET | `/auditoria` |
| GET | `/archivos/ver?url={encodedUrl}` |
| GET | `/archivos/descargar?url={encodedUrl}` |

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
`pages/bandeja/bandeja.ts/.html/.css` — layout idéntico a SCTR y Vida Ley (lista izquierda + visor PDF derecho).

#### Tabs horizontales
```
Todos | Trabajadores | Empresas | Inducciones | Equipos
```
Cada tab tiene color de borde activo propio:
- Todos: `border #111827`
- Trabajadores: `#3b82f6` (azul)
- Empresas: `#22c55e` (verde)
- Inducciones: `#f59e0b` (naranja)
- Equipos: `#9ca3af` (gris)

Clases: `tab-active-all`, `tab-active-blue`, `tab-active-green`, `tab-active-orange`, `tab-active-gray`.

#### Chip colors por tipo
- `TRABAJADOR` = chip-blue
- `EMPRESA` = chip-green
- `EQUIPO` = chip-gray
- `INDUCCION` = chip-orange

#### Layout principal
```css
.bandeja-layout { display: flex; flex-direction: column; gap: 0.75rem; height: calc(100vh - 120px); }
.bandeja-columns { display: grid; grid-template-columns: 300px 1fr; gap: 1rem; flex: 1; overflow: hidden; min-height: 0; }
.col-items, .col-detalle { display: flex; flex-direction: column; overflow: hidden; }
.doc-body { flex: 1; min-height: 0; overflow: hidden; background: #f9fafb; display: flex; align-items: center; justify-content: center; }
.doc-body iframe { width: 100%; height: 100%; display: block; border: 0; }
```

#### Card seleccionada
```css
.bandeja-card.selected { background: #f0fdf4; border-color: #64bc04; }
```

#### Patrón blob URL para PDF
Igual que SCTR: `sharepointService.getArchivoUrl(archivoUrl)` → `fetch(res.url)` → `.blob()` → `URL.createObjectURL(blob)` → `sanitizer.bypassSecurityTrustResourceUrl(blobUrl)`. Se revoca en `revokeDocBlobUrl()` al cerrar/destruir.

#### Flujo de aprobación por tipo
- **TRABAJADOR/EMPRESA/EQUIPO**: Swal input para fecha de vigencia → `bandejaService.aprobarXxx(id, { vigencia })`.
- **INDUCCION**: Swal simple sin campo vigencia → `bandejaService.aprobarInduccion(id)` → PATCH `/bandeja/induccion/{id}` con body `{}`.

Tras aprobar/rechazar: `this.selectedItem = null; this.clearDocPanel();` y luego `loadItems()`.

#### Estado
```ts
selectedItem: BandejaItemDto | null = null;
docSafeUrl: SafeResourceUrl | null = null;
loadingDoc = false;
private docBlobUrl = '';
filtroTipo = '';  // '' = Todos
```

### Modal "Programar Inducción"
`pages/trabajadores/components/programar-induccion/` — 2 pasos.

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

### Notas importantes
- EMO es read-only — viene del módulo SSOMA, no se puede subir.
- SCTR/Vida Ley flujo masivo — un doc cubre múltiples workers.
- Auditoría solo para admins.

### Pendiente
- Validar modal Editar perfil contra backend real (casing `obraOficina`, `sctr` boolean vs string).
- Backend: `GET /inducciones/trabajadores-por-programar` — sin esto paso 2 de Programar Inducción no carga.
- Backend: `POST /api/v1/habilitacion/archivos/subir` (hoy cae al fallback `pending-upload://`).
- Backend: 4 endpoints multiproyecto `/trabajadores/{workerId}/proyectos` (hoy silenciado a array vacío).
- Backend: confirmar `PATCH /bandeja/induccion/{id}` — frontend ya configurado.
- PRs a `master` (backend debe deployarse antes que frontend).
- Deploy a producción + primer usuario admin.

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
| Método | Endpoint |
|--------|----------|
| GET | `/api/v1/user/paged?page=N` |
| POST | `/api/v1/user` |
| PUT | `/api/v1/user/{id}` |
| PATCH | `/api/v1/user/{id}/toggle` |

### `UserService` — `buildAuthHeaders`
```ts
function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```
Nunca envía `Bearer null`.
