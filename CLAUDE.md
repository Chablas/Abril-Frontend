# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — dev server at `http://localhost:4200` (alias for `ng serve --port 4200`).
- `npm run build` — production build into `dist/` (SSR-capable; `defaultConfiguration` is `production`).
- `npm run watch` — development build in watch mode.
- `npm test` — Vitest via `@angular/build:unit-test`. Run a single spec with `npx ng test --include src/app/path/to/file.spec.ts`.
- `npm run serve:ssr:Abril` — run the server bundle after a production build (entry `server.js` → `dist/Abril/server/server.mjs`).

The package manager is pinned via `packageManager: npm@11.7.0`. Prettier config lives in `package.json` (`printWidth: 100`, `singleQuote: true`; `.html` uses the Angular parser).

## Architecture

### Angular 21 standalone app with lazy feature modules
- Bootstrap is standalone (`src/main.ts` → `App` component + `appConfig`). `appConfig` in `src/app/app.config.ts` provides `HttpClient` (fetch), the router with `PreloadAllModules` + `onSameUrlNavigation: 'reload'`, and `LOCALE_ID: 'es-PE'` (es locale registered at module load). SSR wiring exists (`app.config.server.ts`, `app.routes.server.ts`, `src/server.ts`) but `provideClientHydration` is intentionally commented out — see the "SSR" note below before re-enabling.
- Top-level routes (`src/app/app.routes.ts`) split into:
  - `auth/**` — standalone lazy module with `login`, `complete-registration`, `msal-redirect`.
  - Protected shell at `''` rendered by `Layout` (`src/app/shared/components/layout/`), guarded by `authGuard` on `canActivateChild`. Children lazy-load `security`, `projects`, `costs`, `contractors`, `arquitectura-comercial`.
  - Public `contractors/registro` mounted **outside** the authed shell (same feature, exported as `CONTRACTORS_ROUTES` vs `CONTRACTORS_ADMIN_ROUTES` in `contractors.routes.ts`).
  - Wildcard redirects to `/auth/login`.
- Each feature owns a routing module that attaches `roleGuard` + `data: { titulo, roles }` per route. The `Header` component reads `data.titulo` off the deepest activated route to render the page title, so **every new protected route must include `data.titulo` and `data.roles`**.

### Folder conventions
- `src/app/core/` — no UI. Holds `services/` (HTTP), `dtos/` (request/response types grouped by domain), `models/`, `guards/`, and `navigation/`. The `core/README.md` enforces: no components, pipes, or presentation code here.
- `src/app/features/<area>/` — feature modules (NgModule-based) with their own routing module and per-page folders (`page.ts`/`.html`/`.css`/`.spec.ts`). Pages are typically standalone components imported into the routing config, not declared in the NgModule.
- `src/app/shared/components/` — cross-feature UI (layout shell, header, sidebar, paginator, modals, file/image pickers, etc.).
- `src/environments/environment.ts` / `environment.prod.ts` — `apiUrl` + Azure tenant/client IDs. Production fileReplacements swap these at build time (see `angular.json`).

### Auth + role-based navigation
- `AuthService` (`core/services/auth.service.ts`) logs in against `${apiUrl}api/v1/auth`, stores `access_token` + `user` in `localStorage`, and decodes JWT claims (roles come from the Microsoft claim URI `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`).
- Microsoft SSO is handled separately by `MicrosoftAuthService` (`features/auth/`) via `@azure/msal-browser` + `@azure/msal-angular`. The `msal-redirect` route in the auth module completes the OAuth callback. Tenant/client IDs come from `environment.ts`.
- `authGuard` short-circuits to `true` under SSR (keep this — it prevents refresh failures) and redirects expired/missing tokens to `/auth/login`. There is **no token auto-refresh** — expiry immediately redirects to login.
- `roleGuard` reads `route.data.roles` and intersects against JWT roles; missing access redirects to `/`.
- `NavigationService` (`core/navigation/navigation.service.ts`) is the **single source of truth for the sidebar**. Each `NavModule` declares `roles`, `items`, and optional `groups` — the sidebar filters by role at render time. Adding a feature to the UI means wiring both the routing module AND this config.
- Known role strings: `ADMINISTRADOR DEL SISTEMA`, `ADMINISTRADOR DE UDP`, `USUARIO DE UDP`, `ADMINISTRADOR DE RESIDENTES`, `RESIDENTE`. Role matching is string-exact — keep uppercase and Spanish spelling.

### HTTP conventions
- There is **no `HttpInterceptor`**. Each service that needs auth builds its own `Authorization: Bearer <token>` header — see the `authHeaders()` pattern in `ArquitecturaComercialService` (and most other services). When adding a new service, follow that pattern and read `localStorage.getItem('access_token')` defensively (`typeof localStorage !== 'undefined'`) so SSR doesn't break. All services use `providedIn: 'root'` — no module-level DI needed.
- Paginated list endpoints return `PagedResponseDTO<T>` (`core/dtos/api/`), which carries `page`, `pageSize`, `totalRecords`, `totalPages`, and `data: T[]`. Pass this into the shared `Paginator` component via `pageChange` EventEmitter.
- `ErrorService.handleError(err)` centralizes HTTP error UX via SweetAlert2: 401 clears storage and bounces to login; 4xx/5xx show generic modals. Call it from service subscriber `error` branches rather than reinventing alert UI.
- `LoaderService` exposes a global `loader$` `BehaviorSubject<boolean>` that the root `App` component subscribes to. Use `loaderService.show()` / `hide()` around long requests.

### Styling + UI libraries
- Tailwind v4 via `@tailwindcss/postcss` (`.postcssrc.json`); global styles in `src/styles.css`. `dhtmlxgantt.css` is pulled in globally from `angular.json`.
- SweetAlert2 is the standard modal/confirm primitive across features.
- Charting: `chart.js` + `chartjs-plugin-datalabels` in-app, plus `dhtmlx-gantt`. The Arquitectura Comercial Gantt view additionally renders via **QuickChart** (`https://quickchart.io/chart`) — it posts the chart config when the GET URL exceeds `QUICKCHART_GET_LIMIT = 16000` chars (see `features/arquitectura-comercial/gantt/gantt.ts`).
- PDF/Excel export: `jspdf` + `jspdf-autotable`, `xlsx`, `html2canvas`.

### SSR caveat
The app is configured for Angular SSR (`@angular/ssr`, `outputMode: 'server'`, prerender-all) but client hydration is **disabled** in `app.config.ts` with comments about refresh problems. Guards short-circuit on non-browser platforms, and services guard `localStorage` access similarly. If you re-enable hydration, re-check every `localStorage` / `window` reference and the `authGuard` SSR branch.

## Conventions worth keeping

- Prettier: `printWidth: 100`, `singleQuote: true`. Angular HTML templates use the Angular parser.
- DTOs live under `core/dtos/<domain>/` and are grouped per backend resource; keep that grouping when adding new endpoints.
- Page components are often standalone (`imports: [CommonModule, FormsModule, ...]`) and imported directly into NgModule-based routing modules — this mixed style is intentional; don't "convert" one to match the other.
- Standard CRUD flow: list component calls `loaderService.show()`, fetches data, calls `loaderService.hide()` in both success and error. Confirmations use `Swal.fire({ icon: 'question', showCancelButton: true })`. Errors go through `ErrorService.handleError()`. Edit/create forms live in separate modal components that emit a result event to the parent list.
- Spanish is the primary UI language; titles in route `data.titulo` are uppercase.

## UI standard (2026): shared components, not per-page CSS

The app enforces a single visual standard through shared components — pages **cannot** opt out or hand-roll their own version of these. This is intentional: changing the shared component/token restyles every consumer at once. When building a new page, use these instead of writing custom markup:

- **Design tokens** (`src/styles.css`, inside `@theme`): `--color-abril-standard` (+ `-hover`/`-light`/`-border`) is the single teal accent used across forms, tables, and buttons; `--radius-standard: 7px` is the standard corner radius. Never hardcode the hex (`#0F6E56` etc.) in a new component — reference the variable so a future color change is a one-line edit.
- **Page header**: `app-abril-page-header` (`shared/components/abril-page-header/`). Owns the title, subtitle, tabs, and the primary "add new" action (always rendered as a fixed FAB via `[botonPrimario]`, never as an in-header button — the component enforces this). A page-specific control that must sit at tab height (e.g. a filters button) is content-projected via `<... tabsExtra>` on a direct child of `<app-abril-page-header>`; the slot is a no-op (`:empty`) when unused, so it's safe for the other 100+ consumers.
- **Combobox**: `app-search-select` (`shared/components/search-select/`). Default `color` input is `var(--color-abril-standard)`; only pass `color` explicitly when a page needs a different accent. Auto-formats ALL-CAPS backend values to Title Case for display.
- **Modal**: `app-base-modal` (`shared/components/base-modal/`). `[fullScreen]="true"` switches to a full-viewport layout (used when a form is opened via a deep link, e.g. `?nuevo=1` from the boletín) instead of the default centered modal.
- **Full-page wizard exception**: a create/edit form is only allowed to be its own routed page (`/feature/nuevo`, own URL) instead of `app-base-modal` when it's a genuine **multi-step wizard** — multiple distinct stages the user steps through (e.g. `ssoma/gestion/opt/pages/nuevo`, `.../rac/pages/nuevo`, `.../inspeccion/pages/nueva`, `.../accidentes-incidentes/pages/crear-editar`: datos del evento → observador/trabajadores → fotos/firmas). A form that's just "several fields in one screen," no matter how long, still belongs in `app-base-modal` (use `[fullScreen]="true"` if it doesn't fit centered) — length alone is not a wizard. Wizard pages share this internal structure, don't invent a new one per page:
  - **Header: always `app-abril-page-header`** — same rule as every other page, no exception for wizards. Use `[botonSecundario]="{ label: 'Cancelar', icono: 'ti-x' }"` (or "Volver"/back icon) wired to `(secondaryClick)="cancelar()"`. Never hand-roll a `.nuevo-header` + `.back-btn` + badge markup — `app-abril-page-header` already owns badge/title/subtitle/back-action. (RAC's and OPT's `nuevo` pages currently do hand-roll their own header — that's the bug, not the pattern to copy; migrate them to `app-abril-page-header` when touched.)
  - Root container: `.wizard-root`, `background: #ffffff` — never `var(--color-abril-page-bg)`, that token is for the layout shell behind the header, not page content.
  - Step indicator (only if >1 step): `.stepper` / `.step` / `.step-circle` / `.step-line`, active/done state via `--color-abril-standard`.
  - Body: `.wizard-body`, scrollable; fields via `.form-group` / `.form-label` / `.form-input` (not `.abril-input`/`.abril-label`, which are the legacy pre-2026 form classes — kept only where already in use, never copy them into a new page).
  - Footer (outside the scroll): `.wizard-footer` with `.btn-ghost` (cancelar) + `.btn-secondary` (anterior) + `.btn-primary` (siguiente/guardar).
  - Reference implementation: `features/ssoma/gestion/inspeccion/pages/nueva/` (correct header usage). RAC/OPT match everything except the header, which still needs migrating.
- **Time input**: two valid patterns, pick by whether the field has business constraints:
  - Plain time record with no constraints (e.g. "hora inicio/fin" of an inspection) → native `<input type="time" class="form-input">`, same as `<input type="date" class="form-input">` for dates. Simpler, works with the native mobile picker. Reference: `features/ssoma/gestion/inspeccion/pages/nueva/`.
  - Time that must be validated against "now" (can't pick a past hour today) or against another time field (retorno ≥ salida) → paired `app-search-select` for HH + MM (`valueField="valor" displayField="label"`, options computed dynamically from the constraint). Reference: `features/gestion-administrativa/features/solicitud-salidas/components/create/` (`horasSalidaOptions`/`minutosSalidaOptions`/`horasRetornoOptions`/`minutosRetornoOptions`). Don't reach for this pattern unless the constraint is real — it's more code than a native time input.
- **Floating action button**: `app-fab` (`shared/components/fab-button/`) for page-level "create new" actions; `*ngIf="!showModal"` so it never overlaps its own open modal.
- **Data tables/galleries**: give the `<table>` `class="abril-table"` (defined in `styles.css`) for the teal header + standard row density — don't restate `px`/`py`/`background` per `<th>`/`<td>`. Tables should not have their own bordered/rounded wrapper card; let them use the full available width (`<div class="w-full flex-1 min-h-0 overflow-auto">` around the `<table>`).
- **Filters**: don't lay filter comboboxes inline in the page body — use `app-filter-trigger` (`shared/components/filter-trigger/`, projected via `tabsExtra`) to open `app-filter-modal` (`shared/components/filter-modal/`), which wraps `app-base-modal` with a standard "Limpiar filtros" / "Listo" footer. Each combobox inside should auto-search on `(valueChange)` (`filters.x = $event; onSearch()`) — no separate "Buscar" button.
- **Bulk action buttons** (acting on a table row selection — Aprobar/Rechazar/etc.): apply the `[abrilBulkAction]="'default' | 'danger' | 'primary'"` directive (`shared/directives/abril-bulk-action.directive.ts`) to a plain `<button>` instead of writing the Tailwind classes by hand.
- **Names in tables**: pipe through `titleCase` (`shared/pipes/title-case.pipe.ts`) for any field that may come from the backend in ALL CAPS (worker names, motivo, lugar, etc.) — same logic as the combobox's built-in formatting.
- **Filters + pagination are mandatory on every `abril-table` page, no exceptions.** It doesn't matter how few rows the list has today — lists grow, and "it's small right now" is not a judgment call to make per page. Every page with `abril-table` must have: (1) `app-filter-trigger`/`app-filter-modal` with at minimum a text search (`app-search-input` + `SearchInput.matches()`), and (2) pagination via `ClientPager` (`shared/utils/client-pager.ts`) + `DEFAULT_PAGE_SIZE` (`shared/constants/pagination.ts`) + `app-paginator`. See `features/gestion-administrativa/features/configuracion/motivos/` or `.../trayectos/` for the reference wiring (`filtrosActivos` getter, `limpiarFiltros()`, `filteredX` getter feeding the pager).
- **`app-search-select` placeholder wording is standardized, don't improvise per page**: pass `label="..."` on the component itself (never wrap it in an external `<label>`) and use the exact wording below — inconsistent phrasing across RAC/OPT/Inspección/Accidentes was a real bug, not a style choice:
  - Proyecto → `placeholder="Buscar proyecto..."`
  - Trabajador/Observador/Inspector/Representante/Jefe/Responsable (any person lookup) → `placeholder="Buscar por nombre o DNI..."`
  - Empresa/Contratista (large catalogs) → `placeholder="Buscar empresa..."` / `"Buscar contratista..."`
  - Small fixed catalogs with few options (categoría, tipo, severidad, infracción) → `placeholder="Selecciona {entidad}"` (tú-imperative, no em dashes, no "Seleccionar" infinitive)
- **`app-search-select` never sorts its own `[options]`** — it renders whatever order the page passes in. Any list that represents entities with no inherent order (proyectos, empresas, trabajadores, lugares) must be sorted alphabetically (`.sort((a, b) => a.field.localeCompare(b.field))`) at the point where the page assigns it, right after mapping the API response. Lists with a deliberate non-alphabetical order (estado, severidad, meses Ene→Dic) must NOT be sorted — leave those in their defined order.
- Reference implementation: `features/gestion-administrativa/features/gestion-salidas/` and `.../solicitud-salidas/` — both fully migrated to this standard, good examples to copy from for a new page.
