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
    ├── clinica/                  # standalone routes (agenda, programaciones, activar cuenta pública)
    ├── configuracion/            # standalone routes (admin: empresas, proyectos, trabajadores)
    ├── contractors/              # standalone routes (pública + admin)
    ├── costs/                    # NgModule (adjudicaciones)
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
   /habilitacion                            → HABILITACION_ROUTES
   /clinica                                 → CLINICA_ROUTES
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
/configuracion              → redirect 'companies'
/configuracion/companies    → Companies (Razones Sociales)
/configuracion/projects     → Projects (Proyectos + botón Emails SSOMA)
/configuracion/workers      → Workers (Lista de Trabajadores)
```

### Guards
- `authGuard` (`core/guards/auth.guard.ts`): SSR → `true` (¡no quitar! evita problemas con refresh); sin token → `/auth/login`; token expirado → logout + login.
- `roleGuard` (`core/guards/role.guard.ts`): verifica acceso en dos pasos:
  1. Si `route.data.featureKey` existe → busca en `localStorage.allowed_features` (array JSON cargado al login desde BD). Si está incluido → permite.
  2. Fallback: si `route.data.roles` existe → verifica contra JWT roles (solo para contratistas u otros casos legacy).
  - Sin match en ninguno de los dos → redirige a `/`.
  - **Regla**: rutas nuevas deben usar `featureKey` registrado en BD, no `roles` directos.

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
| `DocumentViewer` | `app-document-viewer` | `shared/components/document-viewer/` | Visor de documentos modal. Inputs: `archivoUrl` (ruta relativa o URL), `nombre`. Output: `closed`. Llama `getArchivoUrl(path)` para obtener URL firmada, luego fetch-as-blob para PDF/imagen. `archivoUrl = ''` cierra el visor. Reutilizable en cualquier feature de habilitación. |

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
| GET | `/catalogos/clinicas/{id}/emails` | `CatalogosSaludService.getClinicaEmails` |
| POST | `/catalogos/clinicas/{id}/emails` | `CatalogosSaludService.createClinicaEmail` |
| DELETE | `/catalogos/clinicas/{id}/emails/{emailId}` | `CatalogosSaludService.deleteClinicaEmail` |
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
- `ActividadListItemDTO` — fila de tabla (incluye `estado` computado y `retraso` días). Campo `tipo` renombrado a `partidaDeControl: string | null`. Campos añadidos: `categoriaId`, `categoriaNombre`, `especialidadId`, `especialidadNombre`.
- `ActividadPatchBody` — solo fechas programadas/efectivas, userId, observaciones.
- `CreateActividadBody` — nombre, tipo, projectId, etapaId, userId, fechas programadas. Campos opcionales: `categoriaId?: number | null`, `especialidadId?: number | null`.
- `UpdateActividadBody` — igual que Create más inicioEfectivo, finEfectivo, observaciones. Campos opcionales: `categoriaId?: number | null`, `especialidadId?: number | null`.
- `AcEtapaDTO { id, nombre }` — catálogo de etapas del backend.
- **Nota**: `GanttActividadDTO` conserva `tipo: string | null` (NO renombrado).

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
- `POST api/v1/contractorRegistration` (registro nuevo contratista): requiere auth (JWT). El backend sube archivos a SharePoint solo si se envían. Sin archivos, el registro funciona sin config SharePoint.
- `POST /habilitacion/empresas` (registro empresa — `/habilitacion/registro-empresa`): público `[AllowAnonymous]`. Devuelve 400 con `{ message }` si el RUC ya existe en `ss_empresa_contratista` o `contributor`.
- **Homologación** (`PATCH /ContractorManagement/{id}/approve`): ahora auto-envía email de activación al aprobar. Ya no es necesario llamar manualmente a `send-credentials` después.
- **Activación de credenciales** (`POST /auth/contractor-credentials`): si el email ya tiene `app_user`, reutiliza el usuario (actualiza contraseña) en vez de retornar 400.
- **Login contratista**: `login.ts` usa `authService.loginContratista(email, password)` (no `authService.login()`).
- **`allowedFeatures`** del token contratista ahora viene de BD (`role_feature` del rol CONTRATISTA), no hardcodeado. Administrar desde pgAdmin asignando features al rol.
- **`empresaId` en JWT contratista** = `contributor_id` (no `contractor_id`).

### `features/arquitectura-comercial/` — ✅ Completo
- Dashboard, Actividades (CRUD completo), Gantt, Plantilla.
- Gantt usa **dhtmlx-gantt** + **QuickChart** (POST cuando GET URL > `QUICKCHART_GET_LIMIT = 16000` chars).
- **Actividades — CRUD completo**: editar actividad (PUT), eliminar actividad (DELETE con Swal confirm), crear consulta/hito/entregable (POST).
- **Tabla actividades**: columnas Etapa, **Partida de Control**, **Categoría**, **Especialidad** (badges pill `bg-gray-100`). Colspan separadores = 18.
- **Botón "+ Nueva Consulta"**: visible cuando `tipoFiltro === 'CONSULTA'`. Abre `components/nueva-consulta/`. Body fijo: `categoriaId: 2, especialidadId: 2`.
- **Botón "+ Nuevo Hito"**: visible cuando `tipoFiltro === 'HITO'`. Abre `components/nuevo-hito/`. Campos: etapaNombre, actividad (3 opciones), mes (12 opciones), correlativo, especialidadId (1=EJECUCIÓN / 2=CONTROL). Fijos: `categoriaId: 3 (POST VENTA), tipo: 'HITO'`. Nombre: `${etapaNombre}_${actividad}  (${mes}) ${correlativo.padStart(2,'0')}`.
- **Botón "+ Nuevo Entregable"**: visible cuando `tipoFiltro === 'ENTREGABLE'`. Abre `components/nuevo-entregable/`. Campos: etapaNombre, reporte (5 opciones), categoriaId (3=POST VENTA / 4=ALMACENES). Fijos: `especialidadId: 2, tipo: 'ENTREGABLE'`. Nombre: `${etapaNombre}_${reporte}`.
- **Modales Nuevo Hito / Nuevo Entregable**: auto-seleccionan etapa "POST VENTA Y EXPERIENCIA" al abrir. Etapas cacheadas en el componente (guard `etapas.length > 0` + `applyDefaultEtapa()` en cada apertura).
- **Modal Nueva Consulta**: nombre generado como `{etapa}_RFI_{numero}_{ubicacion}`. Etapa del nombre es lista fija hardcodeada (NO carga del endpoint `/etapas`). Etapa para columna sí carga del endpoint.
- **Modal Editar Actividad**: `components/editar-actividad/`. Campo `tipo` del form mapea a `partidaDeControl` de `ActividadListItemDTO` (campo local del form sigue llamándose `tipo` para el body del backend).
- **Eliminar**: botón basura en cada fila → Swal → DELETE → `loadActividades()`.
- **DTOs añadidos**: `CreateActividadBody`, `UpdateActividadBody` (en `core/dtos/arquitectura-comercial/actividades.model.ts`).
- **Métodos de servicio añadidos**: `createActividad()`, `updateActividad()`, `deleteActividad()` (en `ArquitecturaComercialService`).

### `features/ssoma/salud-ocupacional/` — ✅ Completado
- Dashboard, EMOs, Programaciones, Interconsultas, Convalidaciones, Catálogos (Clínicas/Médicos/Tipos de EMO con CRUD).

### `features/configuracion/` — ✅ Completo
Standalone routes. Razones Sociales (read-only), Proyectos (CRUD con emails SSOMA), Trabajadores (read-only — crear/editar worker migrado a Habilitación).

### `features/gestion-administrativa/` — ✅ Implementado (detalle en §14)
Solicitud de Salidas, Gestión de Salidas. Configuración: Motivos de Salida, Lugares de Origen/Destino. Todas las rutas usan `featureKey`. DTOs auto-contenidos dentro del feature.

### `features/mejora-continua/` — ✅ Implementado (detalle en §15)
Lecciones Aprendidas. Configuración: Áreas/Subáreas (con PSSS scope), Relaciones, Plantillas. Todas las rutas usan solo `roleGuard` (el shell padre aplica `authGuard`).

### `features/habilitacion/` — ✅ Completo (detalle en §12)
Plataforma completa mobile-first.
**Cambios 2026-05-18/19:** `trabajadores.html` — lista y botón "Crear" visibles para rol `CONTRATISTA` (`isContratista()`); pills de filtro Casa/Contratista ocultos para contratistas; upload oculto para ítem 12 (Induccion Obra); APROBAR/RECHAZAR gated por `!isContratista() && isAdmin()`; marcarInduccion oculto para contratistas. `onFileSelected()` usa `res.path` (ruta relativa) en vez de `res.url` para `panelArchivoUrl` — evita almacenar URL absoluta que expira en BD. **`WorkerCreateEdit` migrado desde Configuración** — modal unificado crear/editar con lógica diferenciada Casa vs Contratista, soporte DNI/CE, catálogos en cascada (Área→Subárea→Jefatura), combobox Categoría/Ocupación desde `/catalogos/categorias` y `/catalogos/ocupaciones`. `onDniBlur()` encadena 4 pasos: formato, RENIEC (solo DNI), restringidos, existencia en BD. Ver §12 para subcomponentes y endpoints.

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
/habilitacion                          → redirect 'trabajadores'
/habilitacion/trabajadores             → Plataforma Trabajadores
/habilitacion/empresa                  → Plataforma Empresa
/habilitacion/equipos                  → Equipos y Máquinas
/habilitacion/bandeja                  → Bandeja de Aprobaciones
/habilitacion/sctr-vidaley             → SCTR y Vida Ley
/habilitacion/control-acceso           → Control de Acceso (ADMINISTRADOR SSOMA, ADMINISTRADOR DE UDP)
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
- **Panel de entregables (`trabajadores.html`)** — restricciones de UI para contratistas:
  - Upload zone oculto para el ítem `itemId === 12` ("Induccion Obra"): `*ngIf="selectedEntregable?.itemId !== 12"`.
  - Botones APROBAR y RECHAZAR solo visibles cuando `!isContratista() && isAdmin()`.
  - Botón "✓ marcarInduccion" en la sección Proyectos asignados oculto para contratistas: `*ngIf="!p.induccionCompletada && !isContratista()"`.

### Auth contratistas
- Login en `/auth/login` con selector empresa + password.
- JWT contratista trae `role='CONTRATISTA'` y `empresaId` (= `contributor_id`, **no** `ss_empresa_contratista.id`).
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
| GET | `/catalogos/categorias` (cached `shareReplay(1)`) |
| GET | `/catalogos/ocupaciones` (cached `shareReplay(1)`) |
| GET | `/restringidos?dni=&soloActivos=` |
| POST | `/restringidos` |
| DELETE | `/restringidos/{id}` |
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
| GET | `/equipos/entregables/{id}/versiones` |
| GET | `/control-acceso/consulta?proyectoId=&search=` |
| GET | `/control-acceso/inducciones-hoy` (sin params) |
| POST | `/control-acceso/inducciones/{induccionId}/confirmar-ingreso` |
| GET | `/control-acceso/no-autorizados?proyectoId=` |
| GET | `/control-acceso/tareo?proyectoId=&fecha=` |
| POST | `/control-acceso/tareo` |
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

**`UploadResultDto`**: `{ url: string; path: string }`. El campo `path` es la ruta relativa que se almacena en `panelArchivoUrl` (y luego en `archivoUrl` del entregable). El campo `url` es la URL firmada temporal para abrir/descargar.

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
6. Botón ENVIAR (contratista): habilitado si `panelArchivoUrl || panelObsAbril`.
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
- Backend: `GET /inducciones/trabajadores-por-programar` — sin esto paso 2 de Programar Inducción no carga.
- Backend: confirmar `PATCH /bandeja/induccion/{id}` — frontend ya configurado.
- Frontend: pantalla gestión de trabajadores restringidos (listar, agregar, desactivar vía `/restringidos` endpoints — backend listo).
- Frontend: tour guiado / onboarding para contratistas en primer acceso tras activar cuenta.
- Seguridad: cerrar `[AllowAnonymous]` en `WorkersController` (SSOMA) antes de producción.
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

---

## Sesión 2026-05-06 — Módulo Clínica + Salud Ocupacional

### Nuevos archivos creados:
- features/clinica/ — módulo completo nuevo
  * clinica.routes.ts — rutas /agenda y /programaciones con rol CLINICA
  * pages/agenda/agenda.ts/html/css — agenda del día con flujo completo
  * pages/agenda/components/completar-emo/ — modal registrar resultado EMO
  * pages/programaciones/programaciones.ts/html/css — historial programaciones
  * pages/activar/activar.ts/html/css — activación cuenta clínica (ruta pública)
  * services/clinica-programacion.service.ts — getProgramacionesHoy, getProgramacionesFiltradas, accionClinica
  * dtos/clinica.model.ts — ProgramacionClinicaDto, ClinicaAccionDto, EstadoProgramacionClinica
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
  * KPIs panel 7 contadores arriba de la tabla
  * Filtro por clínica (clinicaId)
  * Badge AUTO en lista y calendario
  * Badge 📧 para fechaNotificacion
  * Acciones nuevas: accionClinica para rechazar desde admin
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
| Método | HTTP | Endpoint |
|--------|------|----------|
| `getClinicaEmails(clinicaId)` | GET | `/catalogos/clinicas/{id}/emails` |
| `createClinicaEmail(clinicaId, dto)` | POST | `/catalogos/clinicas/{id}/emails` |
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

### Sub-rutas
```
/mejora-continua/lessons-learned               → LeccionesAprendidas  (featureKey: mejora-continua.lessons-learned)
/mejora-continua/configuration/areas           → Areas                (featureKey: mejora-continua.config.areas)
/mejora-continua/configuration/relations       → Relations            (featureKey: mejora-continua.config.relations)
/mejora-continua/configuration/templates       → Templates            (featureKey: mejora-continua.config.templates)
```

### Sub-features internas

**`features/lessons-learned/`**
- Subcomponentes: `card`, `create`, `detail`, `list`.
- DTOs: `lessonFilters`, `lessonList`, `lessonPeriod`, `phaseStageSubStageSubSpecialty`.
- Servicio: `LeccionesAprendidasService`.

**`features/configuration/areas-subareas/`**
- Layout dos paneles: `area-list` (izquierdo) + `sub-area-list` (derecho). Edición inline con modales `area-edit`/`sub-area-edit`.
- Incluye `psss-scope-edit` — edita el alcance PSSS de cada subárea.
- Servicios: `AreaService`, `SubareaService`, `PsssScopeService`.

**`features/configuration/relations/`**
- Tabla de relaciones con filtros. Servicio: `RelationsService`.

**`features/configuration/templates/`**
- CRUD de plantillas PSSS. DTO: `psss-template.model.ts`. Servicio: `PsssTemplateService`.

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
