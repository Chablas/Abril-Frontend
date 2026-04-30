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
            ├── catalogos/        # ← agregado en feature/arquitectura-comercial branch
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
| `SearchSelect` | `app-search-select` | `shared/components/search-select/` | Dropdown con búsqueda. Inputs: `options`, `valueField` (default `id`), `displayField` (default `name`), `value`, `placeholder`, `showLabel`, `label`. Output: `valueChange`. |
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
Componente:
```ts
@Input() open = false;
@Input() mode: 'create' | 'edit' = 'create';
@Input() initial: XxxDto | null = null;
@Output() closed = new EventEmitter<void>();
@Output() saved  = new EventEmitter<void>();

ngOnChanges(changes: SimpleChanges): void {
  if (changes['open'] && this.open) this.reset();
}
```
Inspirados por: `programaciones/components/programacion-create/`, `catalogos/components/clinica-form/`.

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

### Lecciones aprendidas
| Endpoint | Servicio |
|----------|----------|
| `/api/v1/lesson` | `LessonService` |

### Residentes / IVTs / Cuaderno / Informes
| Endpoint | Servicio |
|----------|----------|
| `/api/v1/residentMonitoring` | `ResidentMonitoringService` |
| `/api/v1/residentReportIncidence` | `ResidentReportIncidenceService` |
| `/api/v1/ivtcontrolpdf` | `IvtControlService` |
| `/api/v1/ConstructionSiteLogbookControl` | `ConstructionLogbookControlService` |
| `/api/v1/milestoneSchedule` | `MilestoneScheduleService` |
| `/api/v1/milestoneScheduleHistory` | `MilestoneScheduleHistoryService` |
| `/api/v1/schedule` | `ScheduleService` |

### Costos & contratistas
| Endpoint | Servicio |
|----------|----------|
| `/api/v1/projectSubContractor` | `AdjudicacionesService` (features/costs/) |
| `/api/v1/contractorRegistration` | `ContractorService` |
| `/api/v1/ContractorManagement` | `ContractorManagementService` |

### Arquitectura Comercial
| Endpoint | Servicio |
|----------|----------|
| `/api/v1/arquitectura-comercial/...` | `ArquitecturaComercialService` (core) |

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
| GET | `/catalogos/clinicas` | `CatalogosSaludService.getClinicas` (cached) / `listClinicas` |
| POST | `/catalogos/clinicas` | `CatalogosSaludService.createClinica` |
| PUT | `/catalogos/clinicas/{id}` | `CatalogosSaludService.updateClinica` |
| GET | `/catalogos/medicos` | `CatalogosSaludService.getMedicos` (cached) / `listMedicos` |
| POST | `/catalogos/medicos` | `CatalogosSaludService.createMedico` |
| PUT | `/catalogos/medicos/{id}` | `CatalogosSaludService.updateMedico` |
| GET | `/catalogos/emo-tipos` | `CatalogosSaludService.getEmoTipos` (cached) / `listEmoTipos` |
| POST | `/catalogos/emo-tipos` | `CatalogosSaludService.createEmoTipo` |
| PUT | `/catalogos/emo-tipos/{id}` | `CatalogosSaludService.updateEmoTipo` |
| GET | `/catalogos/examen-tipos` | `CatalogosSaludService.getExamenTipos` (cached) |
| GET | `/catalogos/restriccion-tipos` | `CatalogosSaludService.getRestriccionTipos` (cached) |
| GET | `/catalogos/empresas` | `CatalogosSaludService.getEmpresas` (cached) |

> **Catálogos cacheados** usan `shareReplay(1)`. Llamar `invalidateCache()` después de mutar un catálogo para refrescar dropdowns. Las mutaciones (`create*`, `update*`) ya invalidan vía `tap()` automáticamente.
> Activar/desactivar un registro: usar `update*` con el campo `activo` toggleado (no hay endpoint PATCH dedicado).

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
- **Lista paginada** con búsqueda client-side por nombre (filtra sobre la página recibida).
- **Crear** usuario: modal inline con POST `/api/v1/user`.
- **Editar** usuario: modal `UserEditForm` en `features/security/users/components/user-edit-form/` con PUT `/api/v1/user/{id}`.
- **Toggle activo/inactivo**: chip color-coded + confirmación Swal + PATCH `/api/v1/user/{id}/toggle`.
- **Reenviar credenciales**: botón `chip-gray` presente en UI, sin acción backend aún.
- Ver §13 para detalles de implementación.

### `features/projects/` — ✅ Producción / 🔵 En evolución
Sub-features:
- `lecciones-aprendidas/` — list + card + detail. ✅
- `lessons-dashboard/` — métricas + filtros. ✅
- `milestone-schedule/` — gantt de hitos. ✅
- `ivt-control/` — visitas técnicas (con generación PDF). ✅
- `construction-logbook-control/` — cuaderno obra. ✅
- `report-response-control/` — informes con tabs (active/closed). ✅
- `resident-monitoring-measurement/` — seguimiento residentes. ✅
- `configuration/` — `pages/`: areas, fases, etapas, subetapas, layers, subespecialidades, relaciones, milestones, recordatorios, **proyectos**. ✅
  - **Proyectos** ahora incluye botón **"Emails SSOMA"** en cada fila → abre modal `ProjectEmailsForm` (5 campos: residente, responsable, RRHH, coord. SSOMA, coord. admin) que hace `PATCH /api/v1/project/{id}/emails`.

> **Nota**: páginas de configuración de proyectos usan **Tailwind inline** (no el sistema CSS de SSOMA). Mantener.

### `features/costs/` — ⚠️ Solo Adjudicaciones
- `/costs/adjudicaciones` con detail. Rol: `ADMINISTRADOR DEL SISTEMA`.

### `features/contractors/` — ✅ Completo
- Doble routing: `CONTRACTORS_ROUTES` (`/contractors/registro`, público) + `CONTRACTORS_ADMIN_ROUTES` (`/contractors/management`, autenticado).

### `features/arquitectura-comercial/` — ✅ Completo (en evolución)
- Dashboard, Actividades, Gantt, Plantilla.
- Gantt usa **dhtmlx-gantt** + **QuickChart** (POST cuando GET URL > `QUICKCHART_GET_LIMIT = 16000` chars). Ver `gantt/gantt.ts`.
- Histórico: existió "Entregables" (eliminado, ver commit `dfabf16`).

### `features/ssoma/salud-ocupacional/` — ✅ Recientemente completado
- **Dashboard** — KPIs + 3 charts (chart.js). ✅
- **EMOs** — listado por worker (último EMO o "Sin EMO"); historial por worker. ✅
- **Programaciones** — vista lista + calendario semanal; estados Programada/Confirmada/Completada/No se presentó/Cancelada. ✅
- **Interconsultas** — listado + detalle editable. ✅
- **Convalidaciones** — CRUD con worker-search. ✅
- **Catálogos** (NUEVO en branch `feature/arquitectura-comercial`) — tabs Clínicas / Médicos / Tipos de EMO; cada uno con search, paginator, modal CRUD, activar/desactivar. ✅

### `features/configuracion/` — ✅ Completo
Standalone routes (no NgModule). Posición: **último item** del sidebar (después de SSOMA). `iconKey: 'config'` (engranaje). Roles: `ADMINISTRADOR DEL SISTEMA`, `ADMINISTRADOR DE UDP`.
- **Razones Sociales** (`pages/companies/`) — Tabla Razón Social / RUC / Partida Registral / Tipo Actividad / Dirección / Estado + acción Editar. Búsqueda + filtro estado, paginación client-side. GET vía `CatalogosSaludService.getEmpresas()` con `invalidateCache()`. Modal `CompanyEditForm` (mock-save: muestra "Funcionalidad en desarrollo" — backend PUT pendiente). ✅
- **Proyectos** (`pages/projects/`) — Tabla con 14 columnas (Nombre, Código, Empresa, Estado, Responsable, 5 emails, Fecha Inicio/Fin, Área m², Activo) + acciones Editar / Emails SSOMA. Filtros server-side: search, empresa, estado (`ACTIVO/FINALIZADO/INACTIVO`). Paginación server-side via `ProjectService.getProjectsPaged(query)`. Modal `ProjectEditForm` con todos los campos (PUT real, endpoint existente). Modal `ProjectEmailsForm` reutilizado (PATCH). ✅
- **Lista de Trabajadores** (`pages/workers/`) — Tabla Nombre / DNI / Empresa / Proyecto / Tipo / Estado EMO / Aptitud + acciones Editar / Retirar. Botón **"+ Nuevo Trabajador"** en header. Filtros server-side (search, aptitud, estado EMO), paginación server-side via `EmoService.getEmosPorTrabajador(query)`. Modal `WorkerEditForm` dual-mode (create/edit) — DNI editable en create, read-only en edit. CRUD completo: POST / PUT / PATCH retirar via `WorkerService` nuevo. ✅

> **Reuse cross-feature**: `ProjectEmailsForm` vive en `features/projects/configuration/pages/proyectos/components/project-emails-form/` y se importa desde `configuracion/pages/projects/`. Si crece, considerar mover a `shared/components/`.

### Branches actuales
- Working: `feature/arquitectura-comercial`.
- Main para PRs: `master`.

---

## 9. Pitfalls conocidos

### SSR (servidor)
- **Hydration desactivado a propósito** (`app.config.ts:25`). Reactivar requiere revisar todos los accesos a `localStorage`/`window` (auth.guard, services con cache localStorage, etc.).
- En `authGuard:15` el SSR retorna `true` directo. **No quitar** — sin esto, refresh en cliente fallaba.
- En servicios SSOMA usar `typeof localStorage !== 'undefined'` (ya hecho en `http-base.ts`). En servicios de `core/services/*` el patrón antiguo no es defensivo (lee `localStorage` directamente) — está OK porque `authGuard` filtra antes, pero **ojo si reactivas SSR**.

### Auth & roles
- Roles vienen del claim Microsoft (`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`). Si el backend cambia el claim URI, romperá `AuthService.getRoles`.
- Match de roles es **string exact** (uppercase español). No normalizar.

### HTTP
- **No hay interceptor.** Cada request requiere construir manualmente el header. Olvidarse = 401.
- `ErrorService.handleError` ya esconde el loader — no llamar `loaderService.hide()` además.
- Caches con `shareReplay(1)` (`CatalogosSaludService`) → tras un POST/PUT, invalida con `invalidateCache()` o usa los métodos `create*/update*` que ya lo hacen vía `tap()`.

### Ruteo & nav
- Cada ruta protegida **debe** declarar `data.titulo` y `data.roles`. Olvidarlo deja el header sin título y la ruta sin gating.
- Para que aparezca en sidebar: agregar la entry en `core/navigation/navigation.service.ts:config`. Es la única fuente de verdad.

### Estilos
- `features/projects/configuration/pages/proyectos/` usa Tailwind inline (estilo legacy). Modales nuevos en proyectos pueden usar `BaseModal` para no mezclar (ver `project-emails-form/`).
- En SSOMA usar el sistema CSS documentado en §5 (clases `.card`, `.field-input`, `.btn-primary`, `.chip-*`, etc.). Inline Tailwind solo para layout puntual (`flex`, `gap`, `text-*`).

### DTOs
- Sufijo difiere: `core/dtos/*` usa `DTO` (mayúsculas), SSOMA usa `Dto`. **No "uniformes"**, romperías muchos imports.
- Páginas standalone se importan en routing modules pero **NO** se declaran en `declarations` del NgModule. Si lo haces, falla compilación.

### Build / dev
- Vitest reemplazó Karma — usar `npx ng test --include <spec>` para correr uno solo.
- `npm start` corre en puerto 4200; backend default `localhost:5236` (configurable en `environment.ts`).
- En Windows + Git Bash, paths con espacios deben quotearse. El working dir habitual está en `C:\Users\<user>\Abril-Frontend`.

### Backend pitfalls (ASP.NET / PostgreSQL)
- **`AuditoriaInterceptor` debe ser Singleton** (no Scoped). Al usar `IDbContextFactory<>` el interceptor se instancia por factory y no por request HTTP — si está registrado como Scoped arroja `ObjectDisposedException`. Registrar con `services.AddSingleton<AuditoriaInterceptor>()`.
- **Columnas `datos_anteriores` / `datos_nuevos`** en la entidad `AuditoriaCambio` requieren `.HasColumnType("jsonb")` en `OnModelCreating`. Sin eso EF Core las mapea como `text` y PostgreSQL rechaza la inserción directa de objetos JSON serializados.
- **Swagger** solo funciona con `--launch-profile Development`. El bloque `if (app.Environment.IsDevelopment())` que envuelve `app.UseSwagger()` exige que `ASPNETCORE_ENVIRONMENT=Development`; garantizar que `launchSettings.json` tenga ese perfil con la variable seteada.
- **Snapshot EF desfasado de la BD**: `AppDbContextModelSnapshot.cs` puede divergir del estado real cuando se hacen cambios manuales en BD o se renombran entidades sin migración. Cuando esto pasa, `dotnet ef migrations add` genera operaciones espurias (drops/creates de tablas que ya están sincronizadas) además del cambio real que querés. Síntoma: la migración generada tiene 30+ operaciones cuando esperabas 5. **Antes de aplicar**, leé el `Up()` operación por operación y borrá las que no querés. Para drops de tablas con FKs externas no listadas en el snapshot, usar `migrationBuilder.Sql("DROP TABLE x CASCADE")` con `IF EXISTS` en vez del helper `DropTable` (que se queja si encuentra FKs huérfanas no declaradas).
- **`@microsoft.graph.downloadUrl` y `Content-Disposition`**: el endpoint `GET /habilitacion/archivos/url` devuelve URLs temporales (~1h) de Microsoft Graph. Esas URLs vienen con header `Content-Disposition: attachment; filename="…"`, lo que hace que el browser fuerce descarga al ponerlas en `<iframe src>` o `<img src>`. Por eso el frontend usa fetch-as-blob (`document-viewer.ts:cargarComoBlob`) — no cambies eso a un binding directo sin entender la implicancia.

### Catálogos SSOMA — específico
- `EmoTipoDto` y `MedicoSimpleDto`/`ClinicaSimpleDto` se extendieron con campos opcionales (`activo?`, `descripcion?`, `email?`, etc.) para soportar el admin sin romper los dropdowns que ya consumían estos DTOs en `programacion-create`/`emo-create`. **No quitar los `?` ni cambiar nombres de campos.**
- Activar/desactivar usa **PUT con payload completo** (no PATCH), por contrato con backend (`GET/POST/PUT` documentados en spec original).
- La paginación es **client-side** sobre el array completo que retorna el GET — para pequeños catálogos es OK; si crecen mucho, migrar a `PagedResponseDTO<T>` server-side.

### DTOs extendidos por Configuración (campos opcionales)
Mismo principio: backend puede o no devolver los campos; UI fallbackea a `—`. **No remover los `?`** ni cambiar nombres.
- `core/dtos/project/project.model.ts` → `ProjectGetDTO` ahora incluye `projectCode?`, `companyId?`, `companyName?`.
- `features/ssoma/.../dtos/catalogos.model.ts` → `EmpresaSimpleDto` incluye `direccion?`, `activo?` (además del original `esAbril`).
- `features/ssoma/.../dtos/emo.model.ts` → `EmoPorTrabajadorDto` incluye `proyectoId?`, `proyecto?`.

### Configuración — específico
- El módulo **reutiliza servicios SSOMA y core**, salvo cuando un dominio nuevo lo justifica (ej.: `WorkerService` para CRUD de trabajadores vive en `features/ssoma/.../services/worker.service.ts`, NO en `configuracion/`). Regla: el servicio vive donde está el dominio backend, no donde se consume.
- `Companies` llama a `service.invalidateCache()` antes de `getEmpresas()` para forzar lectura fresca aunque el observable esté cacheado por `shareReplay(1)`.
- `ProjectEmailsForm` se **importa cross-feature** desde `features/projects/...` — el path relativo es profundo pero válido. No mover sin actualizar ambos consumidores.
- **Workers CRUD** completo: `POST /workers`, `PUT /workers/{id}`, `PATCH /workers/{id}/retirar` (vía `WorkerService`). Botón "Retirar" se muestra solo si `(item.estadoWorker ?? 'ACTIVO') === 'ACTIVO'`.
- **Companies edit** y **Projects edit form completo** wirean a sus respectivos backends; sólo `CompanyEditForm` muestra Swal "Funcionalidad en desarrollo" porque el PUT de empresas aún no existe.

---

## 10. Checklist al agregar una feature SSOMA nueva

1. **DTO**: archivo en `features/ssoma/salud-ocupacional/dtos/<nombre>.model.ts`.
2. **Service**: archivo en `services/<nombre>.service.ts` usando `SALUD_OCUPACIONAL_BASE` + `buildAuthHeaders()` + `buildParams()`.
3. **Page standalone**: carpeta `<nombre>/` con `<nombre>.{ts,html,css}`. Imports: `CommonModule`, `FormsModule`, `Paginator`, `SearchSelect`, etc.
4. **Modales**: subcarpeta `<nombre>/components/<nombre>-create/` (o `-form/`) con `BaseModal`. Inputs `open/mode/initial`, outputs `closed/saved`.
5. **CSS**: copiar el set base de §5 (card, filters, table, btn-*, chip-*).
6. **Ruta**: agregar en `salud-ocupacional.routes.ts` con `data.titulo: 'SALUD OCUPACIONAL - <NOMBRE>'`.
7. **Nav**: agregar `{ label, route }` en `core/navigation/navigation.service.ts` dentro del grupo "Salud Ocupacional" del module `ssoma`.
8. **Build**: `npx ng build --configuration development` para verificar antes de commit.

## 10.b Checklist al agregar un módulo top-level nuevo (estilo `configuracion/`)

1. **Carpeta**: `features/<nombre>/` con `<nombre>.routes.ts` (export `<NOMBRE>_ROUTES: Routes`).
2. **Pages standalone**: `pages/<page>/<page>.{ts,html,css}` siguiendo el sistema CSS de §5.
3. **app.routes.ts**: agregar lazy `loadChildren: () => import('./features/<nombre>/<nombre>.routes').then(m => m.<NOMBRE>_ROUTES)` dentro del `Layout` autenticado.
4. **Sidebar**: `NavModule` nuevo en `core/navigation/navigation.service.ts:config` con `key`, `label`, `iconKey` (string libre), `baseRoute`, `roles`, `items[]` (o `groups[]`).
5. **Icono**: agregar `<svg *ngSwitchCase="'<iconKey>'">` en `shared/components/nav-icon/nav-icon.html` (color `#64BC04`, viewBox 0 0 24 24).
6. **Roles**: cada page con `data: { titulo: 'TÍTULO', roles: [...] }`. Si toda la sección comparte roles, basta con `roles` en el `NavModule` para sidebar — pero el `roleGuard` per-route sigue siendo necesario para gating real.
7. **Reuse**: si reutilizas modales/forms de otra feature, importa con path relativo. Si crece a >2 consumidores, mover a `shared/components/`.
8. **Build**: `npx ng build --configuration development`.

---

## 11. Archivos de referencia rápida

- Patrón page CRUD completo: `features/ssoma/salud-ocupacional/programaciones/programaciones.ts`
- Patrón modal create con dropdowns: `features/ssoma/salud-ocupacional/programaciones/components/programacion-create/programacion-create.ts`
- Patrón page con tabs: `features/ssoma/salud-ocupacional/catalogos/catalogos.ts`
- Patrón page admin (cliente paginado): `features/ssoma/salud-ocupacional/catalogos/components/catalogo-clinicas/catalogo-clinicas.ts`
- Patrón modal CRUD con `mode: 'create' | 'edit'`: `features/ssoma/salud-ocupacional/catalogos/components/clinica-form/clinica-form.ts`
- Patrón service SSOMA con cache + mutaciones: `features/ssoma/salud-ocupacional/services/catalogos-salud.service.ts`
- Patrón service core legacy: `core/services/project.service.ts`
- Patrón módulo top-level standalone: `features/configuracion/configuracion.routes.ts`
- Patrón page CRUD completo (create/edit/retire/list): `features/configuracion/pages/workers/workers.ts`
- Patrón modal dual-mode con campo read-only condicional: `features/configuracion/pages/workers/components/worker-edit-form/worker-edit-form.ts`
- Patrón service SSOMA mínimo (POST/PUT/PATCH sin cache): `features/ssoma/salud-ocupacional/services/worker.service.ts`
- Patrón page read-only client-paged: `features/configuracion/pages/companies/companies.ts`
- Patrón page con paginación server + acción modal: `features/configuracion/pages/projects/projects.ts`
- Patrón modal con form simple (PATCH único): `features/projects/configuration/pages/proyectos/components/project-emails-form/project-emails-form.ts`
- Sidebar config: `core/navigation/navigation.service.ts`
- Iconos sidebar: `shared/components/nav-icon/nav-icon.html` (cases por `iconKey`)
- Error handling central: `core/services/error.service.ts`
- Base modal: `shared/components/base-modal/base-modal.ts`
- Paginator: `shared/components/paginator/paginator.ts`
- Search-select: `shared/components/search-select/search-select.ts`

---

## 12. Módulo Habilitación SSOMA

### Ubicación
`features/habilitacion/` — standalone routes (igual que `configuracion/`).
- `iconKey: 'habilitacion'` (escudo o documento, agregar en `nav-icon.html`).
- Roles: `ADMINISTRADOR SSOMA`, `ADMINISTRADOR DE UDP`, `CONTRATISTA`.

### Sub-rutas
```
/habilitacion                          → redirect 'trabajadores'
/habilitacion/trabajadores             → Plataforma Trabajadores
/habilitacion/empresa                  → Plataforma Empresa
/habilitacion/equipos                  → Equipos y Máquinas
/habilitacion/bandeja                  → Bandeja de Aprobaciones
/habilitacion/sctr-vidaley             → SCTR y Vida Ley
/habilitacion/inducciones              → Programar Inducción
/habilitacion/registros-modelo         → Registros Modelo
/habilitacion/evaluacion-supervisores  → Evaluación Supervisores
/habilitacion/auditoria                → Auditoría (solo ADMINISTRADOR SSOMA)
/habilitacion/reglas                   → Reglas de Entregables (solo ADMINISTRADOR SSOMA)
```

### Restricciones del rol CONTRATISTA
- **Navegación** (`navigation.service.ts`): los items del módulo Habilitación llevan `roles` por item. CONTRATISTA solo ve: Trabajadores, Inducciones, Registros Modelo. No ve: Empresa, Equipos, SCTR/Vida Ley, Bandeja, Evaluación Supervisores, Reglas, Auditoría.
- **Rutas** (`habilitacion.routes.ts`): cada ruta tiene `roleGuard` con `data.roles`. CONTRATISTA solo tiene acceso a `/trabajadores`, `/inducciones`, `/registros-modelo`, `/cambiar-password`.
- **Filtro server-side por empresaId**: el backend (`HabTrabajadorController.GetWorkers`) detecta el rol CONTRATISTA en el JWT y filtra por el claim `empresaId` automáticamente. El frontend **nunca envía `empresaId`** en los query params para CONTRATISTA (`filtroEmpresaId: null → undefined → omitido por buildHabParams`).

### Auth contratistas
- Login en `/auth/login` con selector empresa (dropdown) + password.
- JWT contratista trae claim `role='CONTRATISTA'` y claim `empresaId`.
- Contratistas ven **solo** sus trabajadores y su empresa.
- Contratistas **NO** pueden aprobar documentos — solo dejan en estado `Enviado`.
- Usar `AuthService` existente para verificar rol `CONTRATISTA`.

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
| GET | `/catalogos/areas` (lista de áreas, cacheado client-side) |
| GET | `/catalogos/subareas?area={area}` (subáreas filtradas, incluye `jefatura`) |
| POST | `/auth/login` (contratista) |
| GET | `/auth/empresas` (dropdown login) |
| GET | `/trabajadores` (paginado) |
| GET | `/trabajadores/{id}` (detalle para edición de perfil) |
| PUT | `/trabajadores/{id}` (editar perfil) |
| GET | `/trabajadores/{id}/entregables` |
| PUT | `/trabajadores/entregables/{id}` |
| GET | `/trabajadores/entregables/{id}/versiones` |
| PATCH | `/trabajadores/{id}/cambiar-obra` |
| PATCH | `/trabajadores/{id}/reingreso` |
| GET | `/bandeja` (paginado + cursor) |
| PATCH | `/bandeja/trabajador/{id}` |
| PATCH | `/bandeja/empresa/{id}` |
| PATCH | `/bandeja/equipo/{id}` |
| GET | `/empresas/{id}/entregables` |
| PUT | `/empresas/{id}/entregables/{itemId}` |
| GET/POST | `/sctr-vidaley` |
| GET | `/sctr-vidaley/{id}` |
| PATCH | `/sctr-vidaley/{id}/aprobar` |
| GET | `/sctr-vidaley/por-trabajador/{workerId}` |
| GET | `/sctr-vidaley/proximos-vencer` |
| GET/POST/PUT | `/equipos` |
| GET | `/equipos/{id}/entregables` |
| PUT | `/equipos/entregables/{id}` |
| GET/POST | `/inducciones` |
| GET/POST/PUT/DELETE | `/reglas` |
| GET | `/auditoria` |
| GET | `/archivos/ver?url={encodedUrl}` |
| GET | `/archivos/descargar?url={encodedUrl}` |

### Estados de entregables
`Falta` → `Enviado` → `Aprobado` / `Rechazado` / `No Aplica`

Colores:
- `Falta` = rojo
- `Enviado` = amarillo / naranja
- `Aprobado` = verde
- `Rechazado` = rojo oscuro
- `No Aplica` = gris

### SCTR / Vida Ley — estados especiales
`Aprobado`, `Rechazado`, `Parcial`, `Falta`, `Enviado`.

### Estado habilitación worker
- `Habilitado` = chip verde
- `No Autorizado` = chip rojo

### Notas importantes
- **EMO es read-only** — viene del módulo SSOMA, no se puede subir.
- **SCTR/Vida Ley flujo masivo** — un doc cubre múltiples workers.
- Contratista no puede ver workers de otra empresa (`403` del backend).
- Versiones de documentos disponibles por entregable.
- Auditoría implementada en backend — pantalla solo para admins.

### Auth contratistas — flujo completo

Endpoints (`api/v1/habilitacion/auth/...`):
- `POST /login` — body `{ email, password }` → `ContratistaTokenDto { token, empresaId, razonSocial, tipo }`. Token guardado en `localStorage.access_token` (mismo key que login Abril).
- `POST /activar` — body `{ token, password }` → `ContratistaTokenDto`. **Auto-login**: persiste el token retornado y redirige a `/habilitacion/trabajadores`.
- `POST /reset-password` — body `{ token, nuevaPassword }` → `void`. Tras éxito redirige a `/auth/login` (no auto-login).
- `POST /solicitar-reset` — body `{ email }` → `void`. La UI siempre muestra "Si el correo está registrado, recibirás un enlace en breve." en `next` y `error` (no revelar existencia).
- `PATCH /cambiar-password` — body `{ passwordActual, passwordNuevo }` → `void`. Requiere JWT.

Métodos en `core/services/auth.service.ts`: `loginContratista(email, password)`, `activarCuenta({token, password})`, `resetPassword({token, nuevaPassword})`, `solicitarReset(email)`, `isContratista()`. La persistencia del token contratista vive en el helper privado `persistContratistaToken()`.

`getRoles()` lee `decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ?? decoded.role` para soportar tanto el JWT Microsoft (Abril) como el JWT contratista (`role` plano).

Detección de cuenta no activada en login: el handler matchea `err.error?.message` con `/no\s+(ha\s+)?(sido\s+)?activad[ao]/i` y muestra un Swal especial con CTA "Reenviar activación" → `/auth/recuperar-contratista`.

### Rutas públicas (FUERA del Layout autenticado)

En `src/app/app.routes.ts`:
```
/habilitacion/registro-empresa     → registro-empresa (RegistroEmpresa)
/auth/activar-contratista          → activar-contratista (ActivarContratista) — query: ?token=…&tipo=activacion-contratista|reset-contratista
/auth/recuperar-contratista        → recuperar-contratista (RecuperarContratista)
/registros-modelo                  → registros-modelo (dual-mount, data: { publicMode: true })
```

`registros-modelo` está **dual-montado**: en `/registros-modelo` (público, con header propio) y en `/habilitacion/registros-modelo` (dentro del Layout). El componente lee `route.snapshot.data['publicMode']` para decidir si renderiza el `<header>` con logo Abril.

### Subida de archivos a SharePoint

`features/habilitacion/services/sharepoint-upload.service.ts` expone `subirArchivo(file, contexto)` → POST `multipart/form-data` a `/api/v1/habilitacion/archivos/subir`.

**Patrón fallback**: las páginas Trabajadores / Empresa / Equipos llaman al servicio en `onFileSelected()` y, si el endpoint retorna error (404 mientras no exista, 500, etc.), guardan `panelArchivoUrl = 'pending-upload://' + file.name` para que el flujo de UI siga funcionando. Mientras sube se muestra `📎 Subiendo {{ panelArchivoNombre }}…` controlado por `uploadingFile: boolean`.

Contextos usados:
- Trabajadores: `habilitacion/trabajadores/{workerId}`
- Empresa: `habilitacion/empresas/{empresaId}`
- Equipos: `habilitacion/equipos/{equipoId}`
- Logos de empresa (registro público): `habilitacion/logos`

**Logo en registro-empresa** (`pages/registro-empresa/`): campo opcional "Logo de empresa" (JPG/PNG ≤ 2 MB). Llama a `SharepointUploadService.subirArchivo` durante el registro público. Mientras sube, el botón "Registrar Empresa" queda deshabilitado (`uploadingFile = true`). Si falla, muestra `Swal.fire` directo (NO `ErrorService.handleError`, que redirige a login en 401 — la página es pública). El campo `logoUrl` se incluye en el payload `EmpresaContratistaCreateDto`.

> **Backend pendiente**: `POST /archivos/subir` aún no existe (TODO marcado en `sharepoint-upload.service.ts`). El fallback `pending-upload://` permite testear el flujo end-to-end sin backend.

### Componentes nuevos

- `shared/components/password-strength/` (standalone, `app-password-strength`) — input `password: string`, calcula débil/media/fuerte por longitud (≥8) + presencia de mayús/dígito/símbolo. Usado en `activar-contratista` y `cambiar-password`.

### Diseño enterprise de Trabajadores
`pages/trabajadores/trabajadores.html` y `.css` rediseñados completamente (layout 3 columnas, sin tocar `.ts`):
- **Panel izquierdo** (300px): buscador con icono lupa, lista de worker-cards con indicador `border-left: 3px solid #64bc04` al seleccionar, chips de estado, acciones admin (cambiar obra, reingreso).
- **Panel central** (flex): barra de nombre/estado del worker seleccionado; tabla `<table>` con columnas DOCUMENTO / ESTADO / VIGENCIA / ACCIONES; estado vacío con SVG inline.
- **Panel derecho** (360px): modo Filtros (radio pills Tipo + select Estado) cuando no hay entregable activo; modo Documento (upload zone dashed + vigencia + aprobar/rechazar/observaciones) cuando hay entregable seleccionado y es accionable.
- Stats bar superior (solo admin): total de trabajadores + botón Actualizar.
- Toda la lógica TypeScript intacta — no se modificó `.ts`.

### Modal "Editar perfil" del trabajador
`pages/trabajadores/components/editar-perfil/` — standalone, abre desde un botón ✏️ en `worker-hdr` (visible sólo para `!isContratista()`).

Campos editables:
- `apellidoNombre` (texto, requerido)
- `celular` (texto)
- `fechaNacimiento`, `fechaRetiro` (date inputs, ISO substring 0-10)
- `sctr` (dropdown Sí/No, mapea a `boolean | null`) — **visible sólo para `obraOficina === 'Oficina Central'`**
- `area`, `subarea`, `jefatura` — **visibles sólo para `obraOficina === 'Staff' || 'Oficina Central'`**

Cascada área → subárea → jefatura:
- Cambio de área dispara `getSubareas(area)` y limpia `subarea` + `jefatura`.
- Cambio de subárea autocompleta `jefatura` desde el item encontrado en `subareas[]`.
- `jefatura` siempre es readonly (`field-readonly`), nunca lo edita el usuario.

DTOs (en `dtos/catalogos.model.ts`):
```ts
AreaCatDto    { area: string }
SubareaCatDto { id?: number; subarea: string; area: string; jefatura: string }
```
**Importante**: el shape backend usa `area` y `subarea` como nombres de campo (no `nombre`). Los `<app-search-select>` se configuran con `valueField="area"`/`displayField="area"` para áreas y `valueField="subarea"`/`displayField="subarea"` para subáreas.

DTOs trabajador (en `dtos/trabajador.model.ts`):
- `WorkerDetalleDto` (respuesta de `GET /trabajadores/{id}`) — incluye `obraOficina`, `area`, `subarea`, `jefatura`, `sctr: boolean`, `celular`, `fechaNacimiento`, `fechaRetiro`.
- `WorkerEditDto` (payload de `PUT /trabajadores/{id}`) — mismos campos optional. En el submit usar `?? undefined` (no `||`) para preservar `false` en `sctr`.
- `WorkerHabilitacionListDto` también lleva `obraOficina?: string` para que el filtro Staff/Oficina Central funcione antes de que llegue el detalle.

### Auto-marcar entregable como "Enviado" tras upload
`Trabajadores.onFileSelected()` (`pages/trabajadores/trabajadores.ts`): tras un upload exitoso a SharePoint, el método `autoMarcarEnviado()` dispara automáticamente un `PUT /trabajadores/entregables/{id}` con `estado: 'Enviado'` + el `archivoUrl` recién subido. Aplica para **cualquier estado actual** (Falta, Rechazado, Aprobado, Vencido, etc.) y se reinicia a Enviado al subir un archivo nuevo. La UI refleja el cambio inmediatamente vía `actualizarEntregableLocal()` (chip de tabla central + chip del header del drawer). El botón "ENVIAR DOCUMENTO" sigue existiendo para re-enviar tras editar observación/vigencia sin subir archivo.

### Visor de documentos PDF — fetch como blob
`shared/components/document-viewer/document-viewer.ts`: el endpoint `GET /habilitacion/archivos/url` devuelve `@microsoft.graph.downloadUrl` que viene con header `Content-Disposition: attachment`. Si pasás esa URL directo al `<iframe src>` o `<img src>`, el browser dispara descarga en vez de previsualizar.

Solución: para tipos `pdf` e `img`, el componente hace `fetch(res.url)` → `.blob()` → `URL.createObjectURL(blob)` y bindea ese object URL al iframe/img. Los blob URLs no llevan `Content-Disposition` así que se renderizan inline. El object URL se trackea en `this.blobUrl` y se libera con `URL.revokeObjectURL` en `reset()` (al cerrar el visor o destruir el componente). Para Office sigue usando `view.officeapps.live.com/op/embed.aspx?src=` porque ese viewer hace fetch server-side de Microsoft a Microsoft.

El botón "Descargar" sigue usando la URL Graph original (`tempUrl`), donde sí queremos el `Content-Disposition: attachment`.

### SearchSelect — botón X clearable
`shared/components/search-select/search-select.ts`: agregado `@Input() allowClear: boolean = true` (opt-out). Cuando hay valor seleccionado y `allowClear` es true, aparece un ícono X dentro del trigger junto al chevron. Click en la X dispara `clear($event)` que `stopPropagation`, setea `value = null` y emite `valueChange.emit(null)` sin abrir el dropdown. Accesible por teclado (`tabindex="0"`, `keydown.enter`).

### Empresas en cambiar-obra → tabla legacy `companies` (vía `contributor`)
`cambiar-obra.ts`: el dropdown "Razón social" usa `CatalogosSaludService.getEmpresas()` (endpoint `GET /api/v1/ssoma/salud-ocupacional/catalogos/empresas`), **no** `EmpresaContratistaService` (que hablaba con `ss_empresa_contratista`). Esto es porque la FK `worker_vinculaciones.empresa_id` en backend referencia la tabla legacy (`fk_worker_vinculaciones_companies_empresa_id` → ahora `contributor` tras la consolidación). Si se enviara un id de `ss_empresa_contratista`, EF rompería con FK violation. El template usa `displayField="nombre"` sobre `EmpresaSimpleDto` (campos `id`, `nombre`, `esAbril`).

Fix de UX en el mismo modal: dropdowns "Nueva obra" y "Razón social" usan `<app-search-select>` para filtrado en vivo. Opciones de Staff/Oficina son `Obra | Staff | Oficina Central` (ya no existe "Ninguno").

### Estado actual
- Sprints 1-8 completados.
- Auth contratistas: login email+password, activación, reset, cambio password.
- Páginas completadas: Trabajadores (rediseño enterprise + modal Editar perfil), Empresa, Equipos, Bandeja, SCTR/Vida Ley, Inducciones, Registros Modelo, Evaluación Supervisores, Auditoría, Reglas, Registro Empresa (público, con logo upload), Activar Cuenta (público), Recuperar Contraseña (público), Cambiar Contraseña.
- Restricciones CONTRATISTA implementadas en rutas y navegación.
- Modal Editar perfil con cascada áreas/subareas/jefatura, SCTR Sí/No (Oficina Central), área/subárea (Staff/Oficina Central), endpoints `GET/PUT /trabajadores/{id}` y `GET /catalogos/areas|subareas`.
- Auto-marcar entregable a "Enviado" tras upload de archivo (en cualquier estado previo).
- Visor PDF inline funcionando con blob workaround para `@microsoft.graph.downloadUrl`.
- Migración backend Project (legacy, tabla `project`) vs Projects (nueva, tabla `projects`): consolidada en **`project` legacy**. Se dropeó `projects` con CASCADE y se recablearon 10 FKs (`worker_vinculaciones`, `ss_empresa_contratista`, `ss_empresa_proyecto`, `ss_equipo`, `ss_eval_supervisor`, `ss_hab_empresa`, `ss_induccion`, `ss_sctr_vidaley`, `resident_report_incidence`, `project_sub_contractor`). Migración: `20260430053121_SwitchProyectoFkToProjectLegacy`.

**Trabajado el 2026-04-30:**
- **Baja individual y masiva** en `pages/trabajadores/`:
  - Checkboxes por fila (`worker-card--checked`) + barra de selección masiva (`selection-bar`) con conteo y botón "Dar de baja seleccionados" (`bajaMasiva`).
  - Botón "Dar de baja" por fila solo para activos (`estadoWorker !== 'RETIRADO'`), solo admin.
  - Backend: `PATCH /trabajadores/{id}/retirar` y `PATCH /trabajadores/baja-masiva` con `{ workerIds }`.
- **Toggle `soloRetirados`** — modo exclusivo: `false` (default) excluye RETIRADO; `true` muestra solo RETIRADO. Renombrado desde `incluirRetirados` en frontend y backend (`HabTrabajadorController`). Cuando activo: oculta checkboxes/barra baja, muestra botón "Reingreso".
- **Modal `reingreso-form`** (`components/reingreso-form/`) — campos: fecha reingreso, nuevo proyecto (SearchSelect, placeholder dinámico con proyecto actual), nueva razón social (SearchSelect, solo visible si `contrataCasa === 'Casa'`). Panel izquierdo readonly con datos actuales (trabajador, proyecto actual, razón social actual). Swal confirm antes de `PATCH /trabajadores/{id}/reingreso`. DTOs: `WorkerReingresoDto { nuevoProyectoId?, nuevaEmpresaId?, fechaReingreso? }`.
- **Historial de eventos** (`components/historial-eventos/`) — timeline visual GET `/trabajadores/{workerId}/eventos`. Colores por tipo: BAJA (rojo), REINGRESO (verde), CAMBIO_OBRA (azul), CAMBIO_EMPRESA (naranja), ENTREGABLE_RESETEADO (gris). Botón reloj visible para todos los roles, independiente de `soloRetirados`. DTO: `WorkerEventoDto { id, tipoEvento, descripcion?, proyectoAnterior?, proyectoNuevo?, empresaAnterior?, empresaNueva?, datos?, createdAt }`.
- **Fix historial de versiones** (`components/versiones-doc/`) — botón "Ver" anterior navegaba directo a la URL sin JWT → 401. Fix: `abrirVisor(archivoUrl)` pasa el path relativo a `DocumentViewer` que llama `getArchivoUrl` internamente. Eliminada doble llamada que causaba 400. Eliminados imports `SharepointUploadService` y `HttpErrorResponse` del componente.
- **Filtros adicionales** en `pages/trabajadores/`: `proyectoId` (SearchSelect) y `empresaId` / razón social (SearchSelect, oculto si `filtroContratistaCasa === 'Contratista'`). Catálogos cargados en `loadCatalogos()` via `ProjectService` y `CatalogosSaludService`. Fix bug: parámetro renombrado de `estado` a `estadoHabilitacion` en query params.
- **Módulo Habilitación Empresa rediseñado** (`pages/empresa/`):
  - Vista tarjetas de proyectos activos con progreso (N/total aprobados), badge estado (Habilitado / En proceso / Con rechazos), colores borde verde/amber/rojo.
  - Progreso calculado con N llamadas paralelas `getEntregables(empresaId, proyectoId)` (una por proyecto activo), resultado cacheado en `progresoPorProyecto: Map<number, ProgresoProyecto>`.
  - Modal `proyectos-empresa` (`components/proyectos-empresa/`): lista proyectos activos + disponibles, botones Activar/Desactivar con Swal confirm. Endpoints: `GET /proyectos-disponibles`, `POST /activar-proyecto`, `DELETE /desactivar-proyecto`.
  - Eliminados filtros mes/año (legacy PowerApps) de todos los llamados al servicio.
  - Admin usa `CatalogosSaludService.getEmpresas()` (tabla `contributor`) con `displayField="nombre"`. Eliminado `EmpresaContratistaService` del componente.
  - Drawer lateral para entregables: contratista (upload + obs), admin (ver doc + obs + Guardar + Aprobar/Rechazar).
- **Fix `EmpresaNombre` en lista trabajadores**: usaba `ss_empresa_contratista`; corregido para usar `contributor` vía `CatalogosSaludService`.
- **Fix dropdown razón social en `cambiar-obra`**: quitado filtro `esAbril` que vaciaba la lista (el campo `esAbril` viene `false` para todos en BD actual). Se muestran todas las empresas sin filtrar.

### Pendiente
- Validar end-to-end el modal Editar perfil contra backend real (esp. cómo viene `sctr` — boolean vs string, y casing exacto de `obraOficina`).
- Verificar `EsAbril` en `CatalogosRepository.ListEmpresas` (criterio actual: `ContributorName.ToUpper().Contains("ABRIL")`) — viene `false` para todos en BD actual.
- PRs a `master` (frontend + backend coordinados; backend debe deployarse antes que el frontend en master, sino los endpoints `/trabajadores/{id}` GET+PUT, `/catalogos/areas`, `/catalogos/subareas` no existirán).
- Deploy a producción.
- Crear primer usuario admin.
- Backend: implementar `POST /api/v1/habilitacion/archivos/subir` para activar la subida real a SharePoint (hoy se cae al fallback `pending-upload://`).

---

## 13. Módulo Seguridad — Usuarios

### Ubicación
`features/security/` — NgModule (`SeguridadModule`). Ruta: `/security/users`. Rol: `ADMINISTRADOR DEL SISTEMA`.

### Archivos clave
```
features/security/
├── seguridad-module.ts
├── seguridad-routing-module.ts
└── pages/
    └── users/
        ├── users.ts / .html               # contenedor: orquesta lista + modal
        ├── list/
        │   ├── list.ts / .html / .css     # tabla paginada + búsqueda + acciones
        └── components/
            └── user-edit-form/
                ├── user-edit-form.ts / .html / .css  # modal edición
```

### Flujo completo
1. `users.ts` es el shell: renderiza `<app-user-list>` y `<app-user-edit-form>`.
2. `list.ts` carga usuarios paginados (`UserService.getUserPaged(page)`), filtra client-side por `searchTerm` sobre `apellidoNombre`/`fullName`.
3. Editar: `list` emite `(editUser)="openEditForm($event)"` → `users.ts` abre el modal con el `UserDTO` seleccionado.
4. Toggle: `list.ts` llama `userService.toggleUser(id)` con confirmación Swal + `cdr.detectChanges()`.
5. Al guardar en el modal: `users.ts` recibe `(saved)="onEditSaved()"` → cierra modal y fuerza reload.

### Endpoints
| Método | Endpoint | Acción |
|--------|----------|--------|
| GET | `/api/v1/user/paged?page=N` | Lista paginada |
| POST | `/api/v1/user` | Crear usuario |
| PUT | `/api/v1/user/{id}` | Editar usuario |
| PATCH | `/api/v1/user/{id}/toggle` | Activar / desactivar |

### DTOs relevantes
- `core/dtos/user/user.model.ts` → `UserDTO { userId, person: PersonDTO, role, active, ... }`
- `core/dtos/user/userCreate.model.ts` → `UserCreateDTO`
- `core/dtos/user/userUpdate.model.ts` → `UserUpdateDTO { firstNames, firstLastName, secondLastName, email, phoneNumber, roleId }`
- `PersonDTO` solo expone `fullName` (nombre completo combinado). Los campos individuales (`firstNames`, etc.) los rellena el usuario en el modal de edición.

### UserEditForm — detalles
- Patrón modal canónico: `@Input() open`, `@Input() initial: UserDTO | null`, `@Output() closed`, `@Output() saved`.
- `ngOnChanges` resetea el formulario cuando `open` cambia a `true`.
- Barra de referencia (`ref-bar`) muestra `initial.person.fullName` + DNI como solo-lectura; los campos de nombre se dejan vacíos para que el admin los complete.
- `canSubmit` valida: `firstNames`, `firstLastName`, `email` no vacíos + `roleId > 0`.

### UserService — `buildAuthHeaders`
`core/services/user.service.ts` usa la función local `buildAuthHeaders()` (mismo patrón que `http-base.ts` de SSOMA):
```ts
function buildAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('access_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```
Nunca envía `Bearer null` — retorna `{}` si no hay token.

### Búsqueda client-side
`list.ts` tiene `searchTerm = ''` y getter `filteredData: UserDTO[]` que filtra `fullName.toLowerCase().includes(searchTerm.toLowerCase())`. La paginación sigue siendo server-side; el filtro solo afecta la página actual mostrada.
