# CONTEXT_INSPECCION_frontend.md — Módulo Inspecciones Frontend
# Angular 21 standalone, feature slice en features/ssoma/gestion/inspeccion/
# Última actualización: 2026-06-16

---

## TAREA DE ESTA SESIÓN
Implementar el módulo frontend completo de Inspecciones.
Seguir EXACTAMENTE el patrón de features/ssoma/gestion/opt/ para:
- Estructura de carpetas
- AbrilPageHeaderComponent
- CSS :host { display:flex; flex-direction:column; flex:1; min-height:0 }
- Root div con class="flex-1 min-h-0"
- Mobile-first 375px
- Patrón de servicios y DTOs

---

## ESTRUCTURA DE CARPETAS

```
features/ssoma/gestion/inspeccion/
  inspeccion.dtos.ts
  inspeccion.service.ts
  inspeccion.routes.ts
  pages/
    dashboard/
      inspeccion-dashboard.component.ts
      inspeccion-dashboard.component.html
      inspeccion-dashboard.component.css
    lista/
      inspeccion-lista.component.ts
      inspeccion-lista.component.html
      inspeccion-lista.component.css
    nueva/
      inspeccion-nueva.component.ts
      inspeccion-nueva.component.html
      inspeccion-nueva.component.css
    detalle/
      inspeccion-detalle.component.ts
      inspeccion-detalle.component.html
      inspeccion-detalle.component.css
```

---

## ARCHIVOS A MODIFICAR

1. `ssoma.routes.ts` — agregar `{ path: 'gestion/inspeccion', loadChildren: () => import('./gestion/inspeccion/inspeccion.routes') }`
2. `layout.ts` — `isFullPage()` incluir `/ssoma/gestion/inspeccion`
3. `navigation.service.ts` — agregar "Inspecciones" en grupo gestion-ssoma igual que OPT y RAC

---

## DTOs — inspeccion.dtos.ts

```typescript
// Catálogos
export interface InspeccionTipoDto {
  id: number;
  nombre: string;
  ambito: 'Seguridad' | 'Salud' | 'Ambiente';
}

export interface InspeccionChecklistItemDto {
  id: number;
  tipoId: number;
  pregunta: string;
  categoria: string | null;
  orden: number;
}

// Agrupación frontend para render del checklist
export interface ChecklistGrupo {
  categoria: string;
  items: InspeccionChecklistItemDto[];
}

// Request
export interface InspeccionRespuestaRequest {
  itemId: number;
  resultado: 'Cumple' | 'NoCumple' | 'NA';
  observacion?: string;
}

export interface InspeccionHallazgoRequest {
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area?: string;
  responsableNombre?: string;
  responsableCargo?: string;
  fechaLimite?: string; // ISO date
  accionCorrectiva?: string;
  latitud?: number;
  longitud?: number;
  fotosBase64: string[]; // base64 desde cámara
}

export interface CrearInspeccionRequest {
  proyectoId: number;
  tipoId: number;
  empresaId?: number;
  esPlanificada: boolean;
  fecha: string; // ISO date
  horaInicio?: string; // "HH:mm"
  horaFin?: string;    // "HH:mm"
  area?: string;
  responsableArea?: string;
  inspectorNombre?: string;
  inspectorCargo?: string;
  inspectorEmpresa?: string;
  firmaInspectorBase64?: string;
  representanteNombre?: string;
  representanteCargo?: string;
  firmaRepresentanteBase64?: string;
  descripcionCausas?: string;
  conclusiones?: string;
  respuestas: InspeccionRespuestaRequest[];
  hallazgos: InspeccionHallazgoRequest[];
}

export interface CerrarHallazgoRequest {
  accionCorrectiva: string;
  evidenciaCierreBase64?: string;
}

// Respuestas
export interface InspeccionHallazgoFotoDto {
  id: number;
  url: string;
  descripcion: string | null;
  orden: number;
}

export interface InspeccionHallazgoDto {
  id: number;
  descripcion: string;
  tipo: 'Critico' | 'Mayor' | 'Menor';
  area: string | null;
  responsableNombre: string | null;
  responsableCargo: string | null;
  fechaLimite: string | null;
  estado: 'Abierto' | 'EnProceso' | 'Cerrado';
  accionCorrectiva: string | null;
  evidenciaCierreUrl: string | null;
  fechaCierre: string | null;
  latitud: number | null;
  longitud: number | null;
  fotos: InspeccionHallazgoFotoDto[];
}

export interface InspeccionRespuestaDto {
  itemId: number;
  pregunta: string;
  categoria: string | null;
  orden: number;
  resultado: 'Cumple' | 'NoCumple' | 'NA';
  observacion: string | null;
}

export interface InspeccionDetalleDto {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  tipoId: number;
  tipoNombre: string;
  tipoAmbito: string;
  empresaId: number | null;
  empresaNombre: string | null;
  esPlanificada: boolean;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  area: string | null;
  responsableArea: string | null;
  inspectorNombre: string | null;
  inspectorCargo: string | null;
  inspectorEmpresa: string | null;
  firmaInspectorUrl: string | null;
  representanteNombre: string | null;
  representanteCargo: string | null;
  firmaRepresentanteUrl: string | null;
  descripcionCausas: string | null;
  conclusiones: string | null;
  totalItems: number;
  totalCumple: number;
  totalNoCumple: number;
  totalNa: number;
  tasaCumplimiento: number | null;
  estado: string;
  createdAt: string;
  respuestas: InspeccionRespuestaDto[];
  hallazgos: InspeccionHallazgoDto[];
}

export interface InspeccionListItemDto {
  id: number;
  proyectoNombre: string;
  tipoNombre: string;
  tipoAmbito: string;
  empresaNombre: string | null;
  esPlanificada: boolean;
  fecha: string;
  area: string | null;
  inspectorNombre: string | null;
  totalHallazgos: number;
  hallazgosCriticos: number;
  hallazgosAbiertos: number;
  tasaCumplimiento: number | null;
  estado: string;
  createdAt: string;
}

// Dashboard
export interface InspeccionTendenciaMensualDto {
  anio: number;
  mes: number;
  mesNombre: string;
  total: number;
  tasaPromedio: number | null;
}

export interface InspeccionPorTipoDto {
  tipoNombre: string;
  ambito: string;
  total: number;
  tasaPromedio: number | null;
}

export interface InspeccionHallazgoPorAreaDto {
  area: string;
  total: number;
  criticos: number;
  abiertos: number;
}

export interface InspeccionHallazgoRecurrenteDto {
  descripcion: string;
  ocurrencias: number;
  ultimoTipo: string;
}

export interface InspeccionDashboardDto {
  totalInspecciones: number;
  totalEsteMes: number;
  hallazgosAbiertos: number;
  hallazgosCriticosAbiertos: number;
  tasaCumplimientoPromedio: number | null;
  tasaCumplimientoEsteMes: number | null;
  tendenciaMensual: InspeccionTendenciaMensualDto[];
  porTipo: InspeccionPorTipoDto[];
  hallazgosPorArea: InspeccionHallazgoPorAreaDto[];
  hallazgosRecurrentes: InspeccionHallazgoRecurrenteDto[];
}
```

---

## SERVICIO — inspeccion.service.ts

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  InspeccionDashboardDto, InspeccionDetalleDto, InspeccionListItemDto,
  InspeccionTipoDto, InspeccionChecklistItemDto, CrearInspeccionRequest,
  CerrarHallazgoRequest
} from './inspeccion.dtos';

@Injectable({ providedIn: 'root' })
export class InspeccionService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}api/v1/ssoma-inspeccion`;

  getCatalogos(): Observable<{ tipos: InspeccionTipoDto[] }> {
    return this.http.get<{ tipos: InspeccionTipoDto[] }>(`${this.base}/catalogos`);
  }

  getChecklist(tipoId: number): Observable<InspeccionChecklistItemDto[]> {
    return this.http.get<InspeccionChecklistItemDto[]>(`${this.base}/checklist/${tipoId}`);
  }

  getList(params: {
    proyectoId?: number; tipoId?: number; estado?: string;
    fechaDesde?: string; fechaHasta?: string; page?: number; pageSize?: number;
  }): Observable<{ items: InspeccionListItemDto[]; total: number; page: number; pageSize: number }> {
    let p = new HttpParams();
    if (params.proyectoId) p = p.set('proyectoId', params.proyectoId);
    if (params.tipoId) p = p.set('tipoId', params.tipoId);
    if (params.estado) p = p.set('estado', params.estado);
    if (params.fechaDesde) p = p.set('fechaDesde', params.fechaDesde);
    if (params.fechaHasta) p = p.set('fechaHasta', params.fechaHasta);
    p = p.set('page', params.page ?? 1);
    p = p.set('pageSize', params.pageSize ?? 20);
    return this.http.get<any>(this.base, { params: p });
  }

  getDashboard(proyectoId?: number, anio?: number): Observable<InspeccionDashboardDto> {
    let p = new HttpParams();
    if (proyectoId) p = p.set('proyectoId', proyectoId);
    if (anio) p = p.set('anio', anio);
    return this.http.get<InspeccionDashboardDto>(`${this.base}/dashboard`, { params: p });
  }

  getDetalle(id: number): Observable<InspeccionDetalleDto> {
    return this.http.get<InspeccionDetalleDto>(`${this.base}/${id}`);
  }

  crear(request: CrearInspeccionRequest): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.base, request);
  }

  cerrarHallazgo(id: number, request: CerrarHallazgoRequest): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrl}api/v1/ssoma-inspeccion-hallazgo/${id}/cerrar`, request
    );
  }
}
```

---

## RUTAS — inspeccion.routes.ts

```typescript
import { Routes } from '@angular/router';
export const INSPECCION_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/inspeccion-dashboard.component')
      .then(m => m.InspeccionDashboardComponent),
    data: { titulo: 'INSPECCIONES' }
  },
  {
    path: 'lista',
    loadComponent: () => import('./pages/lista/inspeccion-lista.component')
      .then(m => m.InspeccionListaComponent),
    data: { titulo: 'INSPECCIONES' }
  },
  {
    path: 'nueva',
    loadComponent: () => import('./pages/nueva/inspeccion-nueva.component')
      .then(m => m.InspeccionNuevaComponent),
    data: { titulo: 'NUEVA INSPECCIÓN' }
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/detalle/inspeccion-detalle.component')
      .then(m => m.InspeccionDetalleComponent),
    data: { titulo: 'DETALLE INSPECCIÓN' }
  }
];
export default INSPECCION_ROUTES;
```

---

## PÁGINA 1 — DASHBOARD

### KPI Cards (5 cards)
```
Total inspecciones | Este mes | Tasa cumplimiento global | Tasa este mes | Hallazgos abiertos
```
- Tasa cumplimiento: badge color verde ≥80 / amarillo ≥60 / rojo <60
- Hallazgos críticos abiertos: badge rojo si > 0

### Chart 1 — Tendencia mensual (Chart.js línea)
- Eje X: 12 meses del año
- Eje Y izq: cantidad inspecciones (barras)
- Eje Y der: tasa cumplimiento % (línea)
- Gráfico mixto bar + line — mismo patrón que rac-dashboard

### Chart 2 — Por tipo (barras horizontales CSS, NO Chart.js)
- Top 10 tipos con barra proporcional
- Badge ambito: azul=Seguridad, verde=Salud, naranja=Ambiente

### Tabla — Hallazgos por área
- Columnas: Área / Total / Críticos / Abiertos
- Fila highlight si críticos > 0

### Cards — Hallazgos recurrentes
- Top 5 más repetidos con chip tipo (Crítico/Mayor/Menor) y contador ocurrencias

### AbrilPageHeaderComponent
```
badge="SSOMA"
titulo="Inspecciones"
subtitulo="Gestión de inspecciones de seguridad"
tabs: [
  { label: 'Dashboard', route: '/ssoma/gestion/inspeccion/dashboard' },
  { label: 'Inspecciones', route: '/ssoma/gestion/inspeccion/lista' }
]
botonPrimario: { label: 'Nueva inspección', icon: 'ti-plus' }
(primaryClick) → router.navigate(['/ssoma/gestion/inspeccion/nueva'])
```

---

## PÁGINA 2 — LISTA

### Filtros (top bar)
- Proyecto (dropdown)
- Tipo inspección (dropdown con los 32 tipos)
- Estado (Borrador / En Proceso / Cerrada)
- Fecha desde / hasta
- Botón limpiar filtros

### Tabla desktop
Columnas: Fecha | Proyecto | Tipo | Ámbito badge | Inspector | Tasa % | Hallazgos | Estado | Acciones
- Tasa: badge coloreado verde/amarillo/rojo
- Hallazgos: chip rojo si hay críticos abiertos
- Estado chip: Borrador=gris / En Proceso=amarillo / Cerrada=verde
- Acción: botón ver detalle

### Cards mobile (< 768px)
- Card por inspección con datos principales
- Badge tipo ámbito + estado + tasa

### AbrilPageHeaderComponent — mismo que dashboard con tabs

---

## PÁGINA 3 — NUEVA INSPECCIÓN (wizard 4 pasos mobile-first)

### Paso 1 — Cabecera
```
Proyecto (dropdown required)
Tipo de inspección (dropdown required — 32 tipos)
Empresa (dropdown opcional)
Fecha (date picker, default hoy)
Hora inicio / Hora fin (time inputs HH:mm)
Área inspeccionada (text)
Responsable del área (text — del PowerApp)
Planeada / No planeada (toggle)
```

### Paso 2 — Checklist (ESTILO iAuditor/SafetyCulture)
- Al seleccionar tipo en paso 1, se carga el checklist via `GET /checklist/{tipoId}`
- Items agrupados por `categoria` (subtítulo agrupador en gris)
- Cada item: fila compacta con la pregunta + 3 botones inline:
  ```
  [✓ Cumple]  [✗ No cumple]  [— N/A]
  ```
  - ✓ verde cuando activo, ✗ rojo cuando activo, — gris cuando activo
  - Al tocar ✗ No cumple: aparece campo de observación debajo del item (textarea pequeño)
  - Sticky header con contador: "X / Y respondidos" y barra de progreso
  - Botones muy compactos en mobile — mínimo 44px touch target
  - Scroll vertical libre — NO paginado

### Paso 3 — Hallazgos
- Botón "Agregar hallazgo" → abre panel inline (no modal)
- Cada hallazgo tiene:
  ```
  Descripción (textarea required)
  Tipo: [Crítico] [Mayor] [Menor] — 3 botones toggle
  Área (text)
  Responsable nombre (text libre)
  Responsable cargo (text)
  Fecha límite (date)
  Acción correctiva (textarea)
  Fotos: botón cámara → input type=file accept="image/*" capture="environment"
         preview de miniaturas con botón eliminar
  ```
- Lista de hallazgos agregados con chip tipo + descripción truncada + botón eliminar
- Hallazgos críticos highlighted en rojo

### Paso 4 — Cierre y firmas
```
Descripción causas resultados desfavorables (textarea — del PowerApp)
Conclusiones y recomendaciones (textarea — del PowerApp)
Inspector nombre (text)
Inspector cargo (text)
Inspector empresa (text)
Firma inspector (canvas — mismo patrón que OPT)
Representante nombre (text — RM 050)
Representante cargo (text)
Firma representante (canvas — mismo patrón que OPT)
```

### Barra de progreso wizard
```
[1 Cabecera] → [2 Checklist] → [3 Hallazgos] → [4 Cierre]
```
- Paso actual resaltado
- No se puede avanzar sin completar campos required del paso actual
- Validación: paso 1 requiere proyectoId y tipoId
- Paso 2: cargar checklist al avanzar desde paso 1 (si tipoId cambió)

### Score en tiempo real (paso 2)
- Header sticky muestra: "X Cumple · Y No cumple · Z N/A → Tasa: XX%"
- Se actualiza con cada respuesta

### Navegación wizard
- Botones Anterior / Siguiente en footer fijo
- En paso 4: botón "Guardar inspección" que hace POST y redirige al detalle

---

## PÁGINA 4 — DETALLE

### Header con AbrilPageHeaderComponent
```
badge="SSOMA"
titulo="Inspección #{id}"
subtitulo="{tipoNombre} — {proyectoNombre}"
botonSecundario: { label: 'Descargar PDF', icon: 'ti-download' } (Fase 2)
```

### Meta card (igual que OPT detalle)
Grid 3 columnas:
```
Proyecto | Tipo | Empresa
Fecha | Hora inicio-fin | Área
Inspector | Inspector cargo | Planeada/No planeada
Responsable área | Estado | Tasa cumplimiento gauge
```

### Score gauge (SVG — igual que OPT detalle)
- Semicírculo con porcentaje de cumplimiento
- Verde ≥80, amarillo ≥60, rojo <60
- Contadores debajo: Cumple / No cumple / N/A

### Sección — Checklist respondido
- Agrupado por categoría (acordeón colapsable)
- Cada item: pregunta + chip resultado (verde/rojo/gris) + observación si existe
- Solo mostrar items con resultado (ocultar N/A por defecto, toggle "Mostrar N/A")

### Sección — Hallazgos
- Cards por hallazgo con chip tipo (Crítico=rojo/Mayor=naranja/Menor=amarillo)
- Estado badge: Abierto=rojo / En Proceso=amarillo / Cerrado=verde
- Fotos en grid de miniaturas con lightbox (abrir full)
- Botón "Cerrar hallazgo" si estado=Abierto → drawer con:
  ```
  Acción correctiva (textarea required)
  Evidencia (foto base64)
  Botón confirmar cierre
  ```

### Sección — Conclusiones (del PowerApp)
- Descripción causas + Conclusiones como texto legible

### Sección — Firmas (2 firmas)
- Inspector: imagen firma + nombre + cargo
- Representante: imagen firma + nombre + cargo

---

## REGLAS CSS OBLIGATORIAS

```css
/* Todos los componentes */
:host {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Root div */
/* class="flex-1 min-h-0" en el template */

/* Checklist item — estilo iAuditor */
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-tertiary);
}

.checklist-pregunta {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.checklist-acciones {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.btn-resultado {
  padding: 6px 10px;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--color-border-tertiary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  min-width: 44px; /* touch target */
  min-height: 44px;
}

.btn-resultado--cumple.active { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
.btn-resultado--nocumple.active { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.btn-resultado--na.active { background: var(--color-background-secondary); color: var(--color-text-secondary); }

/* Categoría header */
.checklist-categoria {
  padding: 6px 12px;
  background: var(--color-background-secondary);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-tertiary);
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Score header sticky */
.checklist-score-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--color-background-primary);
  border-bottom: 2px solid var(--color-border-secondary);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

/* Hallazgo tipo badges */
.badge-critico { background: #fee2e2; color: #991b1b; }
.badge-mayor   { background: #fef3c7; color: #92400e; }
.badge-menor   { background: #fefce8; color: #713f12; }

/* Ambito badges */
.badge-seguridad { background: #dbeafe; color: #1e40af; }
.badge-salud     { background: #d1fae5; color: #065f46; }
.badge-ambiente  { background: #d1fae5; color: #166534; }

/* Mobile 375px */
@media (max-width: 480px) {
  .checklist-acciones {
    flex-direction: column;
    gap: 2px;
  }
  .btn-resultado {
    padding: 4px 6px;
    font-size: 11px;
    min-width: 36px;
  }
}
```

---

## FIXES APLICADOS (2026-06-16)

### inspeccion-nueva.component.html — SearchSelect props incorrectos
El componente `SearchSelect` usa `valueField`/`displayField`, NO `labelKey`/`valueKey`.
Se corrigieron ambos SearchSelect:
- Proyecto: `valueField="projectId"` `displayField="projectDescription"`
- Responsable área: `valueField="workerId"` `displayField="apellidoNombre"`

### inspeccion-nueva.component.ts — workers en forkJoin
Workers se carga en el `forkJoin` inicial del `ngOnInit`, igual que opt-nuevo.

### inspeccion-detalle.component.ts — spUrl() para imágenes SharePoint
Método `spUrl(url)` resuelve URLs relativas a la base de SharePoint:
```
https://abrilinmob.sharepoint.com/sites/SSOMA-Powerapps/InspeccionesAbril2026/
```
Si la URL ya es absoluta (http/https) la devuelve tal cual (compatibilidad con nuevas
inspecciones que guardan `downloadUrl` directa via `SubirArchivoYObtenerUrlAsync`).

Aplicado en el HTML a: firmaInspectorUrl, firmaRepresentanteUrl, fotos de hallazgos, evidenciaCierreUrl.

---

## NOTAS IMPORTANTES

1. **Checklist — carga lazy**: `getChecklist(tipoId)` se llama solo al avanzar del paso 1 al paso 2, no antes. Si el usuario vuelve al paso 1 y cambia el tipo, recargar el checklist y resetear las respuestas.

2. **Score en tiempo real**: Calcular `tasa = (cumple / (cumple + noCumple)) * 100` en el componente — no esperar al backend.

3. **Fotos de hallazgos**: Usar `input type="file" accept="image/*" capture="environment"` para cámara directa en mobile. Convertir a base64 con `FileReader`. Mostrar miniatura inmediata. Máximo 5 fotos por hallazgo.

4. **Canvas firmas**: Mismo patrón exacto que opt-nuevo. Copiar la implementación del canvas de OPT.

5. **Paso 2 scroll**: El contenedor del checklist debe tener `overflow-y: auto` con altura calculada (`height: calc(100vh - 200px)` aproximado). El score header es sticky dentro de ese contenedor.

6. **Observación en No cumple**: Al marcar NoCumple, insertar un `<textarea>` debajo del item con animación slide-down (max-height transition). Al desmarcar, colapsar y limpiar el valor.

7. **Hallazgos — fotos base64**: Las fotos van en `hallazgo.fotosBase64[]` del request. El backend las sube a SharePoint en `InspeccionesAbril2026/Inspecciones/{id}/hallazgos/{hallazgoId}/`.

8. **Cerrar hallazgo desde detalle**: El drawer de cierre usa `cerrarHallazgo(id, request)` del servicio. Al cerrar exitosamente, recargar el detalle completo.

9. **Sin Gantt**: Este módulo no tiene vista Gantt.

10. **PDF RM 050**: El botón "Descargar PDF" en el detalle es Fase 2. Agregarlo deshabilitado con tooltip "Próximamente".
