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
