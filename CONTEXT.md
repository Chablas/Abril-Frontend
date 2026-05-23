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
| GET | `/dashboard` | `getDashboardData` (v1 — legado) |
| GET | `/dashboard-v2?categoriaId=&proyectoId=&userId=&semana=&mes=&anio=` | `getDashboardV2(DashboardFiltroDTO)` |
| GET | `/proyectos` | `getProyectos` — lista simple `{ id, nombre }` |
| GET | `/alertas/{tipoAlerta}?...` | `getActividadesPorAlerta(tipo, filtro)` → `ActividadAlertaDTO[]` |
| POST | `/alertas/enviar` | `enviarAlertasActividades(EnviarAlertaRequestDTO)` |
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
/habilitacion                          → redirect 'trabajadores'
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
```

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
.filters-row { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
.filter-ss-wrap { flex: 1.5; min-width: 130px; }
.filter-sel { flex: 1; min-width: 90px; width: auto !important; }
```

### sctr-subir — mejoras y fixes CONTRATISTA

**`sctr-subir.ts`**:
- `EmpresaContratistaService` inyectado
- `isContratista()` añadido
- `loadInitial()` bifurcado: CONTRATISTA auto-setea `model.empresaId` desde JWT y carga solo proyectos afiliados (con mapeo `{proyectoId, proyectoNombre} → {projectId, projectDescription}`); auto-selecciona si solo hay un proyecto

**`sctr-subir.html`**:
- Filtro Obra/Staff en paso 2: `*ngIf="!loadingWorkers && trabajadores.length > 0 && !isContratista()"` — oculto para CONTRATISTA
- Tooltip dinámico bajo selector Tipo de póliza:
  - Renovación: *"Para trabajadores que ya cuentan con SCTR/Vida Ley aprobado y se va a renovar la póliza vigente."*
  - Inclusión: *"Para trabajadores nuevos, reingresados o con SCTR/Vida Ley en estado Falta o Rechazado."*

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
this.proyectos = data.map((p: any) => ({
  projectId: p.proyectoId,
  projectDescription: p.proyectoNombre,
}) as ProjectGetDTO);
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

| Rol (string exacto) | Acceso |
|---------------------|--------|
| `GESTOR AC` | Ve todos los proyectos y todas las actividades sin filtro de empresa/usuario. Puede editar cualquier actividad. |
| `USUARIO AC` | Ve solo los proyectos/actividades donde `userId === su propio userId` o `userId2 === su propio userId`. Dropdowns Responsable 1 y 2 solo muestran su propio nombre o vacío. |

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
  proyectos : this.service.getProyectos().pipe(catchError(() => of([]))),
  workers   : this.service.getSupervisoresAc().pipe(catchError(() => of([]))),
})
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

| Símbolo | Descripción |
|---------|-------------|
| `categoriaActiva: number\|null` | Pill activa. null = TODOS |
| `filtro: DashboardFiltroDTO` | Filtro unificado (userId, proyectoId, semana, mes, anio, categoriaId) |
| `getFiltroActual()` | Spread de `filtro` + `categoriaId: categoriaActiva` |
| `aplicarDashboard(d)` | Llena todos los arrays y llama `renderCharts()` con `setTimeout(50)` |
| `destruirCharts()` | Destruye los 4 charts antes de re-renderizar |
| `getInitials(nombre)` | 2 iniciales (primer y último token) |
| `primerApellido(nombre)` | Primer token — etiqueta eje X del chart de tareas |
| `getAvatarBg/Color(p)` | Verde/azul/rojo por progreso |
| `getComentario/Bg/Color(sup)` | Badge vs promedio |
| `promedioEficiencia` | Media aritmética de `supervisores[].progreso` |
| `equipoEquilibrado` | max - min ≤ 30pp |
| `getProyectada(p)` | `min(100, p * 1.12)` |
| `getHitoColor(dias)` | Rojo (≤3 o <0) / naranja (≤7) / azul (resto) |
| `hitosUrgentesCnt/EstaSemanaCnt/ProximosCnt` | Contadores footer hitos |
| `diasLabel(dias)` | "Vencido Xd" / "Hoy" / "Xd" |
| `getSpiColor/Label(spi)` | Color e string del SPI |
| `getSubtitulo()` | "Semana N · MesNombre YYYY" |
| `todosMarcados` getter | Todos los items del modal alertas están en `seleccionados` |
| `hitosIniciar/hitosVencer/hitosVencidos` | Getters filtrando `hitosCriticos` por rango de días |

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
