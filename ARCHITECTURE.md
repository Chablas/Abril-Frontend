# Arquitectura del proyecto — Frontend

## Estructura general

El proyecto usa **arquitectura por features**. Cada funcionalidad es
independiente y vive en su propia carpeta. Existen servicios y componentes
bajo la antigua estructura por capas que están **deprecados** y necesitan
refactorizarse — no seguir esa estructura para código nuevo.

## Organización de carpetas

```
src/app/
├── features/
│ ├── costs/
│ │ ├── features/
│ │ │ ├── adjudicaciones/
│ │ │ └── correos-por-proyecto/
│ │ └── shared/ ← archivos compartidos solo dentro del módulo
│ ├── contractors/
│ └── microsoft-auth/
├── shared/ ← componentes reutilizables globales
│ └── components/
│ ├── base-modal/
│ ├── search-select/
│ ├── file-selector/
│ ├── file-preview/
│ ├── view-toggle/
│ └── paginator/
└── core/ ← servicios y DTOs reutilizables globales
├── services/
│ ├── auth.service.ts
│ ├── loader.service.ts
│ └── error.service.ts
├── navigation/
└── dtos/

## ¿Qué es una feature?
Una feature es una funcionalidad específica que aparece como ítem en el
sidebar de la aplicación. Cada entrada del menú lateral corresponde
exactamente a una feature y tiene su propia carpeta dentro del módulo
al que pertenece.
Ejemplos:
- "Adjudicaciones" → `costs/features/adjudicaciones/`
- "Homologación de Contratistas" → `contractors/features/contractor-registration/`
- "Gestión de Contratistas" → `contractors/features/contractor-management/`
No se considera feature a un subcomponente interno de una funcionalidad
(como un modal de creación o un componente de tabla): esos viven dentro
de la carpeta de su feature como parte de su estructura interna libre.
## Reglas
### ✅ Código nuevo
- Cada feature va dentro de `features/{modulo}/features/{nombre-feature}/`
- Dentro de cada feature hay **estructura libre**: se pueden crear las
  subcarpetas que la funcionalidad requiera (`components/`, `services/`,
  `dtos/`, `guards/`, etc.)
- Cada módulo registra sus rutas en `{modulo}.routes.ts`
- Los componentes deben ser **standalone** (`standalone: true`)
### ❌ No hacer
- No crear componentes, servicios ni DTOs directamente bajo `src/app/` o
  en carpetas raíz genéricas fuera de `features/`, `shared/` o `core/`
- No compartir archivos entre features salvo que 2 o más los usen.
  En ese caso: si los usan features del mismo módulo → mover a
  `features/{modulo}/shared/`. Si los usan módulos distintos → mover a
  `shared/` o `core/` según corresponda
- No poner lógica de negocio en los componentes de página — delegarla
  al servicio de la feature
## `shared/` — Componentes reutilizables globales
Contiene componentes Angular standalone reutilizables por cualquier feature:
| Componente | Selector | Descripción |
|---|---|---|
| `base-modal` | `app-base-modal` | Contenedor de modal con título y botón de cierre |
| `search-select` | `app-search-select` | Select con búsqueda, acepta cualquier lista de objetos |
| `file-selector` | `app-file-selector` | Input de archivo estilizado con hint y evento de selección |
| `file-preview` | `app-file-preview` | Lista de archivos seleccionados con botón de eliminar |
| `view-toggle` | `app-view-toggle` | Toggle de modos de vista (tabla/tarjetas) con íconos SVG |
| `paginator` | `app-paginator` | Paginador genérico con eventos de cambio de página |
Para agregar un componente compartido, crear la carpeta en
`shared/components/{nombre}/` con sus archivos `.ts`, `.html` y `.css`.
## `core/` — Servicios reutilizables globales
Contiene servicios y DTOs usados por múltiples features:
| Carpeta | Descripción |
|---|---|
| `core/services/auth.service.ts` | Lectura del token y roles del usuario |
| `core/services/loader.service.ts` | Control del spinner global |
| `core/services/error.service.ts` | Manejo centralizado de errores HTTP |
| `core/navigation/` | Configuración del menú lateral por roles |
| `core/dtos/` | Interfaces compartidas (paginación, respuestas API, etc.) |

> ⚠️ **Aviso — carpetas deprecadas en `core/`**
>
> Las carpetas `src/app/core/dtos/`, `src/app/core/services/` y
> `src/app/core/models/` contienen archivos que fueron creados bajo la
> **antigua arquitectura por capas** y están **deprecados**.
>
> - No agregar nuevos archivos en estas carpetas.
> - Los servicios nuevos reutilizables deben crearse dentro del servicio
>   de su feature. Si realmente son globales y los usan 2 o más módulos,
>   crear una carpeta propia en `core/` con nombre descriptivo
>   (ej. `core/auth/`, `core/error/`) en lugar de seguir acumulando en
>   `core/services/` o `core/dtos/`.
> - Los modelos e interfaces nuevos compartidos entre módulos van en
>   `shared/` o dentro del `shared/` del módulo correspondiente, no en
>   `core/models/`.
## Registro de rutas
Cada módulo expone su array de rutas en `{modulo}.routes.ts` y se importa
en `app.routes.ts`:
```typescript