import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PresupuestoMaterialesService } from '../../presupuesto.service';
import { LoaderService } from '../../../../../../core/services/loader.service';
import { ErrorService } from '../../../../../../core/services/error.service';
import {
  PresupuestoResumenDto, GenerarPresupuestoDto, HitoCriticoDisponibleDto,
  PersonalHitoDto, PersonalHitoItemInputDto, RatioProyectoDto,
  DriverProyectoDto, RatiosDriversRecomendadosDto, ActualizarDriversDto,
  KitResumenDto, KitDetalleDto, KitCalculoLineaDto, KitProyectoGuardadoDto,
  VigilanciaHitoDto, VigilanciaHitoItemInputDto,
  FamiliaFijaDisponibleDto, ServicioFijoDto,
} from '../../presupuesto.dtos';
import { AbrilPageHeaderComponent } from '../../../../../../shared/components/abril-page-header/abril-page-header.component';
import { PRESUPUESTO_TABS } from '../../presupuesto.tabs';
import { SearchSelect } from '../../../../../../shared/components/search-select/search-select';
import Swal from 'sweetalert2';
import { MilestoneScheduleService } from '../../../../../../core/services/milestoneSchedule.service';
import { MilestoneScheduleHistoryService } from '../../../../../../core/services/milestoneScheduleHistory.service';
import { MilestoneService } from '../../../../../../core/services/milestone.service';
import { MilestoneGetDTO } from '../../../../../../core/dtos/milestone/milestone.model';
import { MilestoneScheduleCreateDTO } from '../../../../../../core/dtos/milestoneSchedule/milestoneScheduleCreate.model';

interface FilaPersonalHito extends PersonalHitoItemInputDto {
  hitoDescripcion: string;
  hitoFecha: string | null;
  total: number;
  /** null solo para Prevencionista (sin categoría) — Vígia siempre 'PEON', Monitor/Encapsulador
   * eligen entre 'OFICIAL'/'PEON'. */
  categoria: 'OFICIAL' | 'PEON' | null;
}

interface FilaVigilancia extends VigilanciaHitoItemInputDto {
  hitoDescripcion: string;
  hitoFecha: string | null;
  total: number;
}

interface FilaServicio {
  familiaId: number;
  nombreFamilia: string;
  unidadMedida: string | null;
  metrado: number;
  precioUnitario: number;
  total: number;
  descripcion: string | null;
}

interface ProyectoSimple {
  projectId: number;
  projectDescription: string;
}

/** El driver del proyecto, con el estado transitorio de edición mezclado directo en el objeto —
 * la card de Datos Base siempre está editable, sin un modo "edición" aparte. */
type DriverEditable = DriverProyectoDto & {
  _dirty?: boolean;
  _guardando?: boolean;
  _recalcularRatios?: boolean;
};

type ProyectoSubTab =
  | 'presupuesto' | 'cronograma' | 'personal' | 'vigilancia'
  | 'servicios' | 'ratios' | 'kits' | 'calculo-tecnico';

/** Diferencia en semanas entre dos fechas 'YYYY-MM-DD' (o lo que traiga el hito) — para prellenar
 * "Semanas" cuando el usuario elige etapa de salida en vez de tipearlas a mano. */
function semanasEntreFechas(fechaIngreso: string | null, fechaSalida: string | null): number {
  if (!fechaIngreso || !fechaSalida) return 0;
  const dias = (new Date(fechaSalida).getTime() - new Date(fechaIngreso).getTime()) / 86400000;
  return dias > 0 ? Math.round((dias / 7) * 100) / 100 : 0;
}

/** Fila editable de la tabla de cronograma — misma data que /mejora-continua/milestone-schedule,
 * mostrada aquí como tabla simple (sin Gantt) para poder llenar fechas rápido. */
interface FilaHito {
  milestoneId: number | null;
  customDescription?: string | null;
  text: string;
  plannedStartDate: string;
  plannedEndDate: string | null;
  esHitoCritico: boolean;
}

// ── Incremento temporal de la cuadrilla de acero (pasa de contratista a "casa" en proyectos
// nuevos, con excepción de Cedro 33 y Kaurí que se quedan como estaban). Sacado del histórico
// real de CAMELIA (único de los 3 proyectos con esta partida ya finalizado; 2A Ingenieria &
// Negocios S.A.C., 110 días, 31/10/24-03/07/25): 15.671 HH / 19.446 m² = 0,8059 HH/m².
// Trabajadores: no hay identidad de persona en esa fuente (solo cabezas por día), así que se
// estima desde el pico de personal en un solo día (31) + 10% de rotación asumida (no medida) =
// 34,1 personas / 19.446 m² = 0,0018 trab/m². Usar solo hasta que el primer proyecto que ya
// tenga esta cuadrilla como "casa" complete su propio historial real — ahí reemplazar por el
// ratio medido en vez de esta estimación.
const ACERO_HH_POR_M2 = 0.8059;
const ACERO_TRABAJADORES_POR_M2 = 0.0018;

type CategoriaLabor = 'OFICIAL' | 'PEON';

interface RolPersonalConfig {
  /** Clave que se persiste tal cual en el campo `rol` de siempre (sin tocar el backend). */
  rolKey: string;
  /** Agrupador visual del header (columna ancha con sub-columnas Oficial/Peón cuando aplica). */
  rolBase: string;
  categoria: CategoriaLabor | null;
  /** Sub-etiqueta de columna: '' para Prevencionista/Vígia (una sola columna, sin ambigüedad). */
  label: string;
  /** true en la primera columna de cada rolBase — ahí va la línea vertical divisoria entre roles
   * (no alcanza con "primer elemento del array": cada grupo de 2 columnas tiene su propio inicio). */
  esInicioGrupo: boolean;
}

/** Prevencionista: sin categoría, tarifa propia, una sola columna.
 * Monitor/Vígia/Encapsulador: dos columnas propias (Oficial y Peón) cada uno — se puede cargar
 * cantidad en ambas a la vez para la misma etapa (ej. 2 monitores oficiales Y 3 monitores peones). */
const ROLES_PERSONAL_CONFIG: RolPersonalConfig[] = [
  { rolKey: 'PREVENCIONISTA', rolBase: 'PREVENCIONISTA', categoria: null, label: '', esInicioGrupo: true },
  { rolKey: 'MONITOR-OFICIAL', rolBase: 'MONITOR', categoria: 'OFICIAL', label: 'Oficial', esInicioGrupo: true },
  { rolKey: 'MONITOR-PEON', rolBase: 'MONITOR', categoria: 'PEON', label: 'Peón', esInicioGrupo: false },
  { rolKey: 'VIGIA-OFICIAL', rolBase: 'VIGIA', categoria: 'OFICIAL', label: 'Oficial', esInicioGrupo: true },
  { rolKey: 'VIGIA-PEON', rolBase: 'VIGIA', categoria: 'PEON', label: 'Peón', esInicioGrupo: false },
  { rolKey: 'ENCAPSULADOR-OFICIAL', rolBase: 'ENCAPSULADOR', categoria: 'OFICIAL', label: 'Oficial', esInicioGrupo: true },
  { rolKey: 'ENCAPSULADOR-PEON', rolBase: 'ENCAPSULADOR', categoria: 'PEON', label: 'Peón', esInicioGrupo: false },
];

/** Grupos de columnas para el header de dos filas (rolBase con colspan + sub-labels). */
interface GrupoRolPersonal { rolBase: string; cols: RolPersonalConfig[] }
const GRUPOS_ROL_PERSONAL: GrupoRolPersonal[] = (() => {
  const grupos: GrupoRolPersonal[] = [];
  for (const cfg of ROLES_PERSONAL_CONFIG) {
    const grupo = grupos.find((g) => g.rolBase === cfg.rolBase);
    if (grupo) grupo.cols.push(cfg);
    else grupos.push({ rolBase: cfg.rolBase, cols: [cfg] });
  }
  return grupos;
})();

const SEMANAS_POR_MES = 4.345;

@Component({
  selector: 'app-proyecto-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AbrilPageHeaderComponent, SearchSelect],
  templateUrl: './proyecto-page.html',
  styleUrl: './proyecto-page.css',
})
export class ProyectoPage implements OnInit {
  /** Igual que PRESUPUESTO_TABS, salvo "Datos Base": acá apunta directo a ESTE proyecto en vez
   * de al redirector (/drivers) — así la pestaña se marca activa mientras estás en la ficha,
   * que es justo donde vive Datos Base ahora, y un click no te saca del proyecto que ya elegiste. */
  get headerTabs() {
    return PRESUPUESTO_TABS.map((t) =>
      t.label === 'Datos Base' && this.projectId
        ? { ...t, route: `/ssoma/gestion/presupuesto-materiales/proyecto/${this.projectId}` }
        : t,
    );
  }
  private svc    = inject(PresupuestoMaterialesService);
  private loader = inject(LoaderService);
  private error  = inject(ErrorService);
  cdr            = inject(ChangeDetectorRef);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private milestoneScheduleSvc        = inject(MilestoneScheduleService);
  private milestoneScheduleHistorySvc = inject(MilestoneScheduleHistoryService);
  private milestoneSvc                = inject(MilestoneService);

  projectId!: number;
  presupuestos: PresupuestoResumenDto[] = [];
  loading = false;
  mostrarFormGenerar = false;
  generando = false;

  // ── Navegación por sub-tabs de la ficha (reemplaza las secciones apiladas de antes) ──
  activeSubTab: ProyectoSubTab = 'presupuesto';
  readonly subTabs: { id: ProyectoSubTab; label: string; icon: string }[] = [
    { id: 'presupuesto', label: 'Presupuesto', icon: 'ti-report-money' },
    { id: 'cronograma', label: 'Cronograma', icon: 'ti-calendar-time' },
    { id: 'personal', label: 'Personal', icon: 'ti-users' },
    { id: 'vigilancia', label: 'Vigilancia', icon: 'ti-shield-lock' },
    { id: 'servicios', label: 'Servicios', icon: 'ti-tool' },
    { id: 'ratios', label: 'Ratios', icon: 'ti-chart-bar' },
    { id: 'kits', label: 'Kits / BOM', icon: 'ti-package' },
    { id: 'calculo-tecnico', label: 'Cálculo técnico', icon: 'ti-calculator' },
  ];

  cambiarSubTab(id: ProyectoSubTab): void {
    this.activeSubTab = id;
    if (id === 'kits' && !this.kitsCargados) this.cargarKits();
    if (id === 'servicios' && !this.serviciosCargados) this.loadServicios();
    this.cdr.markForCheck();
  }

  formGenerar: GenerarPresupuestoDto = {};

  // ── Datos Base (Área/HH/Trabajadores), siempre visible arriba de las sub-tabs. También se usa
  // para sugerir HH/Trabajadores desde el histórico al generar presupuesto (más abajo). ──
  readonly hhFuenteOpts = [
    { id: 'HH_REAL', label: 'Real (proyecto finalizado)' },
    { id: 'HH_PROYECTADO', label: 'Proyectado (activo)' },
    { id: 'HH_CALCULADO_MEDIANA', label: 'Calculado por mediana' },
  ];
  proyectos: ProyectoSimple[] = [];
  driverProyecto: DriverEditable | null = null;
  ratiosDriversRecomendados: RatiosDriversRecomendadosDto | null = null;
  sugiriendoDrivers = false;

  // ── Adicional de cuadrilla de acero (temporal, ver constantes arriba) ──
  incluirAcero = false;
  private aceroHhAplicado = 0;
  private aceroTrabAplicado = 0;

  hitosCriticos: HitoCriticoDisponibleDto[] = [];
  loadingHitos = false;
  asignandoHitos = false;

  // ── Dotación de personal por hito, mostrada aquí mismo junto a los hitos críticos ──
  readonly rolesPersonalConfig = ROLES_PERSONAL_CONFIG;
  readonly gruposRolPersonal = GRUPOS_ROL_PERSONAL;
  personalFilas: FilaPersonalHito[] = [];
  personalLoading = false;
  personalGuardando = false;
  // Tarifas mensuales globales: una por bolsa de costo (Prevencionista, Oficial, Peón) — no por
  // etapa, así que se editan una sola vez y aplican a toda la matriz.
  costoPrevencionista = 0;
  costoOficial = 0;
  costoPeon = 0;
  // Última tarifa sugerida obtenida del backend (promedio de otros proyectos) — se guarda aparte
  // para poder "Restablecer" aunque el usuario ya haya editado costoOficial/costoPeon a mano.
  tarifaOficialSugerida: number | null = null;
  tarifaPeonSugerida: number | null = null;

  // ── Vigilancia externa por hito (facturada por punto/turno, precio desde Ratios) ───────────
  vigilanciaFilas: FilaVigilancia[] = [];
  vigilanciaLoading = false;
  vigilanciaGuardando = false;
  precioVigilanciaActual = 0;

  private loadVigilancia(hitos: HitoCriticoDisponibleDto[]): void {
    if (hitos.length === 0) {
      this.vigilanciaFilas = [];
      return;
    }
    this.vigilanciaLoading = true;
    this.cdr.markForCheck();
    // El precio y las filas llegan en requests separados — cualquiera de los dos puede resolver
    // primero. Los totales calculados al cargar (existente?.total) quedan desactualizados apenas
    // cambia el precio de Ratios, así que hay que recalcular TODAS las filas cuando el precio llega
    // (sea antes o después de tener las filas) — si no, el total queda pegado en el valor viejo
    // guardado (o en 0 si nunca se guardó con precio > 0), igual que pasaba antes en Personal.
    this.svc.getPrecioVigilanciaActual().subscribe({
      next: (p) => {
        this.precioVigilanciaActual = p.precioUnitario;
        for (const f of this.vigilanciaFilas) this.recalcularTotalVigilancia(f);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.svc.getVigilanciaHitos(this.projectId).subscribe({
      next: (existentes) => {
        this.vigilanciaFilas = hitos.map((hito) => {
          const existente = existentes.find((e) => e.hitoId === hito.hitoId);
          return {
            hitoId: hito.hitoId,
            hitoDescripcion: hito.hitoDescripcion,
            hitoFecha: hito.hitoFecha,
            hitoSalidaId: existente?.hitoSalidaId ?? null,
            cantidadPuntos: existente?.cantidadPuntos ?? 0,
            semanas: existente?.semanas ?? 0,
            total: existente?.total ?? 0,
          };
        });
        for (const f of this.vigilanciaFilas) this.recalcularTotalVigilancia(f);
        this.vigilanciaLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.vigilanciaLoading = false; this.cdr.markForCheck(); },
    });
  }

  onEtapaSalidaVigilanciaChange(fila: FilaVigilancia): void {
    if (fila.hitoSalidaId) {
      const salida = this.hitosCriticos.find((h) => h.hitoId === fila.hitoSalidaId);
      fila.semanas = semanasEntreFechas(fila.hitoFecha, salida?.hitoFecha ?? null);
    }
    this.recalcularTotalVigilancia(fila);
  }

  recalcularTotalVigilancia(fila: FilaVigilancia): void {
    fila.total = fila.cantidadPuntos * this.precioVigilanciaActual * (fila.semanas / SEMANAS_POR_MES);
  }

  get vigilanciaTotalGeneral(): number {
    return this.vigilanciaFilas.reduce((acc, f) => acc + (f.total || 0), 0);
  }

  guardarVigilancia(): void {
    if (this.vigilanciaGuardando) return;
    const items = this.vigilanciaFilas
      .filter((f) => f.cantidadPuntos > 0)
      .map((f) => ({
        hitoId: f.hitoId,
        hitoSalidaId: f.hitoSalidaId ?? null,
        cantidadPuntos: f.cantidadPuntos,
        semanas: f.semanas,
      }));

    this.vigilanciaGuardando = true;
    this.loader.show();
    this.svc.guardarVigilanciaHitos(this.projectId, { items }).subscribe({
      next: () => {
        this.vigilanciaGuardando = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Vigilancia guardada', timer: 2000, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.vigilanciaGuardando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Servicios de costo fijo (VariableBase = FIJO) — cantidad manual, precio desde Ratios ──
  serviciosFilas: FilaServicio[] = [];
  serviciosCargados = false;
  serviciosLoading = false;
  serviciosGuardando = false;

  private loadServicios(): void {
    this.serviciosLoading = true;
    this.cdr.markForCheck();
    this.svc.getServiciosFijosDisponibles(this.projectId).subscribe({
      next: (disponibles: FamiliaFijaDisponibleDto[]) => {
        this.svc.getServiciosFijos(this.projectId).subscribe({
          next: (existentes: ServicioFijoDto[]) => {
            this.serviciosFilas = disponibles.map((d) => {
              const ex = existentes.find((e) => e.familiaId === d.familiaId);
              return {
                familiaId: d.familiaId,
                nombreFamilia: d.nombreFamilia,
                unidadMedida: d.unidadMedida,
                metrado: ex?.metrado ?? 0,
                precioUnitario: ex?.precioUnitario ?? 0,
                total: ex?.total ?? 0,
                descripcion: ex?.descripcion ?? null,
              };
            });
            this.serviciosCargados = true;
            this.serviciosLoading = false;
            this.cdr.markForCheck();
          },
          error: () => { this.serviciosLoading = false; this.cdr.markForCheck(); },
        });
      },
      error: () => { this.serviciosLoading = false; this.cdr.markForCheck(); },
    });
  }

  recalcularTotalServicio(fila: FilaServicio): void {
    fila.total = fila.metrado * fila.precioUnitario;
  }

  get serviciosTotalGeneral(): number {
    return this.serviciosFilas.reduce((acc, f) => acc + (f.total || 0), 0);
  }

  guardarServicios(): void {
    if (this.serviciosGuardando) return;
    const items = this.serviciosFilas
      .filter((f) => f.metrado > 0)
      .map((f) => ({ familiaId: f.familiaId, metrado: f.metrado, descripcion: f.descripcion }));

    this.serviciosGuardando = true;
    this.loader.show();
    this.svc.guardarServiciosFijos(this.projectId, { items }).subscribe({
      next: () => {
        this.serviciosGuardando = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Servicios guardados', timer: 2000, showConfirmButton: false });
        this.loadServicios();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.serviciosGuardando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Ratios calculados del proyecto ──────────────────────────────────
  ratios: RatioProyectoDto[] = [];
  loadingRatios = false;
  mostrarRatios = false;
  calculandoRatios = false;

  // ── Kits / BOM (Botiquín, Estación de Emergencia): calculadora embebida acá mismo, para no
  // tener que salir a la pestaña global — el resultado es informativo, la cantidad final se
  // sigue cargando a mano en el presupuesto (no hay todavía un hook que la inyecte sola). ──
  mostrarKits = false;
  kits: KitResumenDto[] = [];
  kitsCargados = false;
  kitSeleccionadoId: number | null = null;
  kitDetalle: KitDetalleDto | null = null;
  cantidadKits: number | null = null;
  resultadoKit: KitCalculoLineaDto[] = [];

  // ── Cálculo técnico por metrado (Barandas FRP, Rodapié, Tubería PVC, Ducto) — calculadora
  // informativa igual que Kits/BOM: el resultado se ve acá, la cantidad final se sigue cargando
  // a mano en el presupuesto (cantidadManual). "Punto de Anclaje Textil" no tiene fórmula, se
  // carga siempre 100% manual (así lo pidió el responsable SSOMA).
  mostrarCalculoTecnico = false;

  // Baranda VERTICAL (parantes): FRP 25mm de 1.7m — uno cada 1.0m (espaciamiento REAL todavía sin
  // confirmar, este es un valor aproximado de partida).
  // Baranda HORIZONTAL: DOBLE línea corrida en todo el largo (Horizontal = 2×ml, confirmado exacto
  // contra 8 filas de referencia real, sin excepción) — con FRP 21mm. La pieza real varía entre 1.50
  // y 2.00 m según el tramo, así que acá solo se informa el total en ml — no tiene sentido convertir
  // a "unidades" con una sola longitud de pieza fija, sería otro dato inventado.
  barandasMl: number | null = null;
  private static readonly BARANDA_PIEZA_FRP25_ML = 1.7;
  private static readonly BARANDA_ESPACIAMIENTO_POSTE_ML = 1.0;

  /** ml de FRP 25mm (vertical/parantes) — un poste cada 1.0m, en piezas de 1.7m. */
  get barandasVerticalMl(): number {
    if (!this.barandasMl || this.barandasMl <= 0) return 0;
    return Math.ceil(this.barandasMl / ProyectoPage.BARANDA_ESPACIAMIENTO_POSTE_ML) * ProyectoPage.BARANDA_PIEZA_FRP25_ML;
  }
  /** Número de barras FRP 25mm (piezas de 1.7m) — cada una necesita un poste/tramo de tubería
   * PVC 1" de 60cm, así que esta cantidad alimenta directo el cálculo de Tubería de abajo. */
  get barandasFrp25Unidades(): number {
    return this.barandasVerticalMl > 0 ? Math.ceil(this.barandasVerticalMl / ProyectoPage.BARANDA_PIEZA_FRP25_ML) : 0;
  }
  get barandasFrp25Ml(): number { return this.barandasVerticalMl; }

  /** ml de FRP 21mm (horizontal, doble línea) — total = 2 × ml. Sin "unidades": la pieza real varía
   * 1.50-2.00m, así que convertir a cantidad de piezas con una sola longitud fija sería inventar un
   * dato — acá solo importa el total en ml. */
  get barandasHorizontalMl(): number {
    return this.barandasMl && this.barandasMl > 0 ? this.barandasMl * 2 : 0;
  }
  get barandasFrp21Ml(): number { return this.barandasHorizontalMl; }

  // Rodapié: mismos metros lineales que Barandas (van juntos en el mismo tramo de obra) — triplay
  // 8mm de 2.44 x 1.22, tira de 20cm de ancho cortada del lado de 1.22m → 6 tiras de 2.44m por
  // plancha = 14.64 ml utilizables por plancha.
  private static readonly RODAPIE_ML_POR_PLANCHA = 14.64;
  get rodapiePlanchas(): number {
    return this.barandasMl && this.barandasMl > 0
      ? Math.ceil(this.barandasMl / ProyectoPage.RODAPIE_ML_POR_PLANCHA)
      : 0;
  }

  // Tubería PVC 1": un poste (60cm) por cada barra FRP 25mm requerida; barra de 3m cortada
  // cada 60cm = 5 tramos por barra, exacto.
  get tuberiaCantidadTubos(): number { return this.barandasFrp25Unidades; }
  get tuberiaBarras(): number {
    return this.tuberiaCantidadTubos > 0 ? Math.ceil(this.tuberiaCantidadTubos / 5) : 0;
  }

  // Ducto: fenólico 18mm, plancha de 2.44×1.22. El área que se tipea es el TOTAL de todos los
  // ductos del proyecto juntos, pero en obra cada ducto se corta y arma por separado — ductos
  // chicos desperdician proporcionalmente mucho más material que uno grande (una plancha entera se
  // gasta igual para tapar un tramo de 2m² que uno de 20m²). +40% de exceso aproxima ese
  // desperdicio de fragmentación: verificado contra un cálculo real ducto-por-ducto (777m² total,
  // 6 ductos de distinto tamaño) que dio 385 planchas reales, contra ~261 de tratar los 777m² como
  // un área única sin margen — la diferencia real ronda +40-50%, no el +10% que había antes.
  private static readonly FENOLICO_LADO_A = 2.44;
  private static readonly FENOLICO_LADO_B = 1.22;
  private static readonly FENOLICO_AREA_PLANCHA = ProyectoPage.FENOLICO_LADO_A * ProyectoPage.FENOLICO_LADO_B;
  private static readonly FENOLICO_EXCESO = 1.40;
  // Bastidor de listón 2"x3"x12' (12' = 3.6576 ml) — va UNO POR PLANCHA (marco perimetral de cada
  // plancha individual), no un perímetro del área total: perímetro de 1 plancha = 2×(2.44+1.22) =
  // 7.32 ml ÷ 3.6576 ml/bastidor ≈ 2 bastidores por plancha, que es justo la proporción real
  // (746 listones ÷ 385 planchas ≈ 1.94 en tu cálculo de referencia).
  private static readonly LISTON_ML_POR_BASTIDOR = 3.6576;
  private static readonly LISTON_ML_POR_PLANCHA =
    2 * (ProyectoPage.FENOLICO_LADO_A + ProyectoPage.FENOLICO_LADO_B);
  ductoAreaM2: number | null = null;

  /** Marcelinos (= Punto de Anclaje Textil en el catálogo, família id 275): sin fórmula, cantidad
   * 100% manual — se junta acá con Barandas/Ducto para tenerlo todo en un solo lugar ordenado en
   * vez de ir a buscar la línea en Presupuesto → Detalle. El número que se carga acá es solo de
   * referencia para el responsable SSOMA; el override real que cuenta para el presupuesto sigue
   * siendo el de la línea de material (cantidad_manual), este es un recordatorio rápido. */
  marcelinosCantidad: number | null = null;

  /** "Cálculo técnico" es un ayudante informativo (la cantidad final del presupuesto se sigue
   * cargando a mano, ver la nota en el HTML) — pero sus inputs igual deben sobrevivir un F5 o un
   * cambio de sub-tab, así que se persisten en localStorage por proyecto (no hay tabla en backend
   * para esto, sería sobre-ingeniería para tres números que no afectan el presupuesto real). */
  private claveCalculoTecnicoLocal(): string {
    return `presupuesto_materiales_calculo_tecnico_${this.projectId}`;
  }

  private cargarCalculoTecnicoLocal(): void {
    this.barandasMl = null;
    this.ductoAreaM2 = null;
    this.marcelinosCantidad = null;
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(this.claveCalculoTecnicoLocal());
    if (!raw) return;
    try {
      const datos = JSON.parse(raw);
      this.barandasMl = datos.barandasMl ?? null;
      this.ductoAreaM2 = datos.ductoAreaM2 ?? null;
      this.marcelinosCantidad = datos.marcelinosCantidad ?? null;
    } catch { /* localStorage corrupto o de otra versión — se ignora */ }
  }

  /// Família id 275 en el catálogo = "Punto de Anclaje Textil" (Marcelinos). Hardcodeada como
  /// FamiliaVigilancia en VigilanciaHitoRepository — misma familia de patrón en este módulo.
  private static readonly FAMILIA_ID_MARCELINOS = 275;
  marcelinosGuardando = false;

  /** A diferencia de Barandas/Ducto (puramente informativos), Marcelinos SÍ tiene que llegar al
   * presupuesto real — es la cantidad manual real de "Punto de Anclaje Textil". Escribe directo en
   * la línea del presupuesto vigente del proyecto (requiere que ya se haya generado un presupuesto). */
  guardarMarcelinosEnPresupuesto(): void {
    if (this.marcelinosGuardando) return;
    this.marcelinosGuardando = true;
    this.loader.show();
    this.svc.actualizarCantidadManualPorFamilia(this.projectId, ProyectoPage.FAMILIA_ID_MARCELINOS, this.marcelinosCantidad)
      .subscribe({
        next: () => {
          this.marcelinosGuardando = false;
          this.loader.hide();
          Swal.fire({ icon: 'success', title: 'Marcelinos actualizado en el presupuesto', timer: 2000, showConfirmButton: false });
        },
        error: (err: HttpErrorResponse) => {
          this.marcelinosGuardando = false;
          this.loader.hide();
          this.error.handleError(err);
        },
      });
  }

  guardarCalculoTecnicoLocal(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      this.claveCalculoTecnicoLocal(),
      JSON.stringify({
        barandasMl: this.barandasMl,
        ductoAreaM2: this.ductoAreaM2,
        marcelinosCantidad: this.marcelinosCantidad,
      }),
    );
  }
  get ductoPlanchasFenolico(): number {
    if (!this.ductoAreaM2 || this.ductoAreaM2 <= 0) return 0;
    const areaEfectiva = this.ductoAreaM2 * ProyectoPage.FENOLICO_EXCESO;
    return Math.ceil(areaEfectiva / ProyectoPage.FENOLICO_AREA_PLANCHA);
  }
  get ductoBastidoresListon(): number {
    const planchas = this.ductoPlanchasFenolico;
    if (planchas <= 0) return 0;
    return Math.ceil((planchas * ProyectoPage.LISTON_ML_POR_PLANCHA) / ProyectoPage.LISTON_ML_POR_BASTIDOR);
  }

  toggleCalculoTecnico(): void {
    this.mostrarCalculoTecnico = !this.mostrarCalculoTecnico;
    this.cdr.markForCheck();
  }

  toggleKits(): void {
    this.mostrarKits = !this.mostrarKits;
    if (this.mostrarKits && !this.kitsCargados) this.cargarKits();
    this.cdr.markForCheck();
  }

  private cargarKits(): void {
    this.svc.listarKits().subscribe({
      next: (kits) => {
        this.kits = kits;
        this.kitsCargados = true;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => { this.error.handleError(err); this.cdr.markForCheck(); },
    });
    this.cargarKitsGuardados();
  }

  /** Todos los kits ya guardados en el presupuesto de este proyecto — puede haber varios tipos a la
   * vez (ej. Botiquín x3 y Estación de Emergencia x1 simultáneamente), por eso es una lista propia y
   * no se mezcla con la calculadora de arriba (que sirve para calcular/agregar un kit más). */
  kitsGuardados: KitProyectoGuardadoDto[] = [];
  kitsGuardadosLoading = false;
  private cargarKitsGuardados(): void {
    this.kitsGuardadosLoading = true;
    this.cdr.markForCheck();
    this.svc.getKitsGuardados(this.projectId).subscribe({
      next: (guardados) => {
        this.kitsGuardados = guardados;
        this.kitsGuardadosLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.kitsGuardadosLoading = false; this.cdr.markForCheck(); },
    });
  }

  get kitsGuardadosTotal(): number {
    return this.kitsGuardados.reduce((acc, k) => acc + (k.total || 0), 0);
  }

  eliminarKitGuardado(kitId: number, nombreKit: string): void {
    Swal.fire({
      icon: 'question', title: `¿Quitar "${nombreKit}" del presupuesto?`,
      showCancelButton: true, confirmButtonText: 'Sí, quitar', cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.loader.show();
      this.svc.eliminarKitGuardado(this.projectId, kitId).subscribe({
        next: () => { this.loader.hide(); this.cargarKitsGuardados(); },
        error: (err: HttpErrorResponse) => { this.loader.hide(); this.error.handleError(err); },
      });
    });
  }

  get kitsOpts(): any[] {
    return this.kits.map((k) => ({ ...k, _label: `${k.nombre} (${k.nombreTipo})` }));
  }

  onSeleccionarKit(): void {
    this.resultadoKit = [];
    this.cantidadKits = null;
    if (this.kitSeleccionadoId == null) { this.kitDetalle = null; return; }
    this.loader.show();
    this.svc.getKit(this.kitSeleccionadoId).subscribe({
      next: (kit) => { this.kitDetalle = kit; this.loader.hide(); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.error.handleError(err); this.cdr.markForCheck(); },
    });
  }

  calcularKit(): void {
    if (!this.kitSeleccionadoId || !this.cantidadKits || this.cantidadKits <= 0) return;
    this.loader.show();
    this.svc.calcularKit(this.kitSeleccionadoId, this.cantidadKits).subscribe({
      next: (lineas) => { this.resultadoKit = lineas; this.loader.hide(); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => { this.loader.hide(); this.error.handleError(err); this.cdr.markForCheck(); },
    });
  }

  kitGuardando = false;

  /** Guarda el kit calculado en el presupuesto real del proyecto — solo reemplaza ESE kit (por
   * kitId), no los demás kits ya guardados con otro tipo, y recalcula el total del presupuesto
   * (mismo mecanismo que Servicios/Vigilancia/Personal). */
  guardarKit(): void {
    if (this.kitGuardando || !this.kitSeleccionadoId || !this.cantidadKits || this.cantidadKits <= 0) return;
    this.kitGuardando = true;
    this.loader.show();
    this.svc.guardarKit(this.projectId, { kitId: this.kitSeleccionadoId, cantidadKits: this.cantidadKits }).subscribe({
      next: () => {
        this.kitGuardando = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Kit guardado en el presupuesto', timer: 2000, showConfirmButton: false });
        this.cargarKitsGuardados();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.kitGuardando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  get kitTotalGeneral(): number {
    return this.resultadoKit.reduce((acc, l) => acc + (l.total || 0), 0);
  }

  get kitConsumibles(): KitCalculoLineaDto[] {
    return this.resultadoKit.filter((r) => r.esConsumible);
  }

  get kitDurables(): KitCalculoLineaDto[] {
    return this.resultadoKit.filter((r) => !r.esConsumible);
  }

  // ── Cronograma de hitos (tabla simple, misma data que /mejora-continua/milestone-schedule) ──
  hitosSchedule: FilaHito[] = [];
  loadingSchedule = false;
  guardandoSchedule = false;
  errorSchedule: string | null = null;
  catalogoHitos: MilestoneGetDTO[] = [];
  nuevoHitoTexto = '';
  private milestoneScheduleHistoryId: number | null = null;

  private catalogoHitosCargado = false;

  ngOnInit(): void {
    this.loadRatiosDriversRecomendados();

    // El catálogo de hitos se carga una sola vez (no depende del proyecto): la tabla siempre
    // debe salir armada con TODOS los hitos estándar (con fecha vacía si aún no se llenó), no
    // solo con lo que ya esté guardado.
    this.milestoneSvc.getAllMilestone().subscribe({
      next: (m) => {
        this.catalogoHitos = m;
        this.catalogoHitosCargado = true;
        this.cdr.markForCheck();
        if (this.projectId) this.loadScheduleTable();
      },
      error: (err: HttpErrorResponse) => {
        console.error('[cronograma] error cargando catálogo de hitos', err);
        this.errorSchedule = `Error al cargar catálogo de hitos (${err.status}): ${err.error?.message ?? err.message}`;
        this.cdr.markForCheck();
      },
    });

    // El projectId viaja en la ruta y puede cambiar sin recrear el componente (el combobox del
    // header navega a /proyecto/:otroId sobre la misma ruta) — por eso se suscribe a paramMap en
    // vez de leer snapshot una sola vez, y todo lo que depende del proyecto se recarga acá.
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('projectId'));
      if (!id || id === this.projectId) return;
      this.projectId = id;
      this.svc.setUltimoProyectoId(id);
      this.cargarCalculoTecnicoLocal();
      this.mostrarFormGenerar = false;
      this.formGenerar = {};
      this.incluirAcero = false;
      this.aceroHhAplicado = 0;
      this.aceroTrabAplicado = 0;
      this.serviciosCargados = false;
      this.load();
      this.loadHitosCriticos();
      this.loadRatios();
      this.loadDriverProyecto();
      if (this.catalogoHitosCargado) this.loadScheduleTable();
      if (this.activeSubTab === 'servicios') this.loadServicios();
      this.cdr.markForCheck();
    });
  }

  cambiarProyecto(id: number | null): void {
    if (!id || id === this.projectId) return;
    this.svc.setUltimoProyectoId(id);
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/proyecto', id]);
  }

  /** Arma la tabla combinando lo ya guardado en el cronograma con los hitos del catálogo que
   * todavía no tienen fecha — así la tabla siempre aparece completa y lista para llenar. */
  private construirFilasDesdeCatalogo(guardados: FilaHito[]): FilaHito[] {
    const idsGuardados = new Set(guardados.map((h) => h.milestoneId).filter((id) => id != null));
    const faltantes: FilaHito[] = this.catalogoHitos
      .filter((m) => !idsGuardados.has(m.milestoneId))
      .map((m) => ({
        milestoneId: m.milestoneId,
        text: m.milestoneDescription,
        plannedStartDate: '',
        plannedEndDate: null,
        esHitoCritico: false,
      }));
    return [...guardados, ...faltantes];
  }

  loadScheduleTable(): void {
    this.loadingSchedule = true;
    this.errorSchedule = null;
    this.cdr.markForCheck();
    this.milestoneScheduleHistorySvc.getAllMilestoneScheduleHistory({ projectId: this.projectId }).subscribe({
      next: (historial) => {
        if (historial.length === 0) {
          this.milestoneScheduleHistoryId = null;
          this.hitosSchedule = this.construirFilasDesdeCatalogo([]);
          this.loadingSchedule = false;
          this.cdr.markForCheck();
          return;
        }
        this.milestoneScheduleHistoryId = historial[0].milestoneScheduleHistoryId;
        this.milestoneScheduleSvc
          .getByMilestoneScheduleHistoryId({ milestoneScheduleHistoryId: this.milestoneScheduleHistoryId })
          .subscribe({
            next: (items) => {
              const guardados = items
                .filter((i) => i.active)
                .sort((a, b) => a.order - b.order)
                .map((i) => ({
                  milestoneId: i.milestoneId,
                  text: i.milestoneDescription,
                  plannedStartDate: i.plannedStartDate?.substring(0, 10) ?? '',
                  plannedEndDate: i.plannedEndDate ? i.plannedEndDate.substring(0, 10) : null,
                  esHitoCritico: i.esHitoCritico,
                }));
              this.hitosSchedule = this.construirFilasDesdeCatalogo(guardados);
              this.loadingSchedule = false;
              this.cdr.markForCheck();
            },
            error: (err: HttpErrorResponse) => {
              console.error('[cronograma] error cargando items del historial', err);
              this.errorSchedule = `Error al cargar hitos (${err.status}): ${err.error?.message ?? err.message}`;
              this.loadingSchedule = false;
              this.cdr.markForCheck();
            },
          });
      },
      error: (err: HttpErrorResponse) => {
        console.error('[cronograma] error cargando historial de cronograma', err);
        this.errorSchedule = `Error al cargar cronograma (${err.status}): ${err.error?.message ?? err.message}`;
        this.loadingSchedule = false;
        this.cdr.markForCheck();
      },
    });
  }

  agregarHitoPersonalizado(): void {
    const texto = this.nuevoHitoTexto.trim();
    if (!texto) return;
    this.hitosSchedule.push({
      milestoneId: null,
      customDescription: texto,
      text: texto,
      plannedStartDate: '',
      plannedEndDate: null,
      esHitoCritico: false,
    });
    this.nuevoHitoTexto = '';
    this.cdr.markForCheck();
  }

  quitarHitoSchedule(index: number): void {
    this.hitosSchedule.splice(index, 1);
    this.cdr.markForCheck();
  }

  guardarSchedule(): void {
    // Solo se guardan los hitos que ya tienen fecha de inicio — los del catálogo que aún están
    // vacíos se quedan visibles en la tabla para llenarlos después, no bloquean el guardado.
    const conFecha = this.hitosSchedule.filter((h) => !!h.plannedStartDate);
    if (conFecha.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin fechas', text: 'Ingresa al menos la fecha de inicio de un hito antes de guardar.' });
      return;
    }
    if (this.guardandoSchedule) return;
    this.guardandoSchedule = true;
    this.loader.show();
    const milestoneSchedules: MilestoneScheduleCreateDTO[] = conFecha.map((h, i) => ({
      milestoneId: h.milestoneId,
      customDescription: h.milestoneId == null ? h.customDescription : undefined,
      plannedStartDate: h.plannedStartDate,
      plannedEndDate: h.plannedEndDate || null,
      order: i + 1,
      esHitoCritico: h.esHitoCritico,
    }));
    this.milestoneScheduleHistorySvc.createMilestoneScheduleHistory({
      projectId: this.projectId,
      milestoneSchedules,
      forceSave: true,
    }).subscribe({
      next: () => {
        this.guardandoSchedule = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Cronograma guardado', timer: 1500, showConfirmButton: false });
        this.loadScheduleTable();
        this.loadHitosCriticos();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.guardandoSchedule = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  loadRatios(): void {
    this.loadingRatios = true;
    this.cdr.markForCheck();
    this.svc.getRatiosPorProyecto(this.projectId).subscribe({
      next: (r) => {
        this.ratios = r;
        this.loadingRatios = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingRatios = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleRatios(): void {
    this.mostrarRatios = !this.mostrarRatios;
    this.cdr.markForCheck();
  }

  /** Calcula (o recalcula) el ratio de consumo por família de este proyecto, contra sus propios
   * datos base (HH/Área/Trabajadores) — sin esto la tabla de ratios nunca deja de estar vacía. */
  calcularRatios(): void {
    if (this.calculandoRatios) return;
    this.calculandoRatios = true;
    this.mostrarRatios = true;
    this.cdr.markForCheck();
    this.svc.calcularRatios(this.projectId).subscribe({
      next: () => {
        this.calculandoRatios = false;
        this.loadRatios();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.calculandoRatios = false;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  loadHitosCriticos(): void {
    this.loadingHitos = true;
    this.cdr.markForCheck();
    this.svc.getHitosCriticosDisponibles(this.projectId).subscribe({
      next: (hitos) => {
        this.hitosCriticos = hitos;
        this.loadingHitos = false;
        this.cdr.markForCheck();
        this.loadPersonalPanel(hitos);
        this.loadVigilancia(hitos);
      },
      error: () => {
        this.loadingHitos = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadPersonalPanel(hitos: HitoCriticoDisponibleDto[]): void {
    if (hitos.length === 0) {
      this.personalFilas = [];
      return;
    }
    this.personalLoading = true;
    this.cdr.markForCheck();
    this.svc.getPersonalHitos(this.projectId).subscribe({
      next: (existentes) => {
        this.construirFilasPersonal(hitos, existentes);
        this.personalLoading = false;
        this.cdr.markForCheck();
        this.sugerirTarifasPersonalSiFaltan();
      },
      error: () => { this.personalLoading = false; this.cdr.markForCheck(); },
    });
  }

  /** Siempre pide la tarifa sugerida (promedio de lo cargado en otros proyectos) y la guarda en
   * tarifaOficialSugerida/tarifaPeonSugerida para el botón "Restablecer" — pero solo la APLICA
   * automáticamente si el proyecto todavía no tiene tarifa propia cargada (costoOficial/Peon en 0).
   * Si el usuario ya la tipeó o la editó, nunca se pisa sola. */
  private sugerirTarifasPersonalSiFaltan(): void {
    this.svc.getTarifasPersonalSugeridas(this.projectId).subscribe({
      next: (t) => {
        this.tarifaOficialSugerida = t.oficial;
        this.tarifaPeonSugerida = t.peon;
        if (this.costoOficial === 0) this.costoOficial = t.oficial;
        if (this.costoPeon === 0) this.costoPeon = t.peon;
        for (const f of this.personalFilas) this.sincronizarTarifaFila(f);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /** Vuelve la tarifa de la categoría a la última sugerencia calculada — por si el usuario la
   * editó a mano y quiere volver al valor automático sin tener que recordarlo. */
  restablecerTarifaSugerida(tipo: 'OFICIAL' | 'PEON'): void {
    const sugerida = tipo === 'OFICIAL' ? this.tarifaOficialSugerida : this.tarifaPeonSugerida;
    if (sugerida == null) return;
    this.actualizarTarifa(tipo, sugerida);
  }

  private construirFilasPersonal(hitos: HitoCriticoDisponibleDto[], existentes: PersonalHitoDto[]): void {
    this.personalFilas = [];
    for (const hito of hitos) {
      // Etapa de salida y Semanas son por HITO, no por rol (se editan una sola vez y se propagan a
      // todas las filas) — así que se sacan de CUALQUIER fila ya guardada de este hito, no de la
      // fila específica de cada rol. Si eso no se hace, un rol que se guarda por primera vez (nunca
      // tuvo su propia fila en ss_presupuesto_personal_hito) arranca con semanas=0 y su Total da 0
      // aunque tenga cantidad y tarifa cargadas.
      const referenciaHito = existentes.find((e) => e.hitoId === hito.hitoId && e.hitoSalidaId != null)
        ?? existentes.find((e) => e.hitoId === hito.hitoId);
      for (const cfg of ROLES_PERSONAL_CONFIG) {
        const existente = existentes.find((e) => e.hitoId === hito.hitoId && e.rol === cfg.rolKey);
        this.personalFilas.push({
          hitoId: hito.hitoId,
          hitoDescripcion: hito.hitoDescripcion,
          hitoFecha: hito.hitoFecha,
          hitoSalidaId: referenciaHito?.hitoSalidaId ?? null,
          rol: cfg.rolKey,
          categoria: cfg.categoria,
          cantidad: existente?.cantidad ?? 0,
          semanas: referenciaHito?.semanas ?? 0,
          costoMensual: existente?.costoMensual ?? 0,
          total: existente?.total ?? 0,
        });
      }
    }

    // Tarifas globales: la primera fila con costo guardado de cada bolsa define la tarifa vigente.
    this.costoPrevencionista = this.personalFilas.find((f) => f.rol === 'PREVENCIONISTA' && f.costoMensual > 0)?.costoMensual ?? 0;
    this.costoOficial = this.personalFilas.find((f) => f.categoria === 'OFICIAL' && f.costoMensual > 0)?.costoMensual ?? 0;
    this.costoPeon = this.personalFilas.find((f) => f.categoria === 'PEON' && f.costoMensual > 0)?.costoMensual ?? 0;

    for (const f of this.personalFilas) this.sincronizarTarifaFila(f);
    this.actualizarPersonalPorHito();
  }

  private tarifaPara(categoria: 'OFICIAL' | 'PEON' | null): number {
    if (categoria === null) return this.costoPrevencionista;
    return categoria === 'OFICIAL' ? this.costoOficial : this.costoPeon;
  }

  private sincronizarTarifaFila(f: FilaPersonalHito): void {
    f.costoMensual = this.tarifaPara(f.categoria);
    this.recalcularTotalPersonal(f);
  }

  actualizarTarifa(tipo: 'PREVENCIONISTA' | 'OFICIAL' | 'PEON', valor: number): void {
    if (tipo === 'PREVENCIONISTA') this.costoPrevencionista = valor;
    if (tipo === 'OFICIAL') this.costoOficial = valor;
    if (tipo === 'PEON') this.costoPeon = valor;
    for (const f of this.personalFilas) this.sincronizarTarifaFila(f);
    this.cdr.markForCheck();
  }

  /** Recalcula el agrupado por hito UNA vez (no en cada ciclo de change detection). Antes era un
   * getter que reconstruía un array/Map nuevo en cada acceso — con `personalPorHito` leído desde
   * el *ngFor del template, Angular lo evaluaba en cada tick, veía una referencia distinta cada
   * vez, y entraba en un ciclo de repintado que nunca se estabilizaba (el freeze real). */
  private actualizarPersonalPorHito(): void {
    const grupos = new Map<number, { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }>();
    for (const fila of this.personalFilas) {
      if (!grupos.has(fila.hitoId)) {
        grupos.set(fila.hitoId, { hitoId: fila.hitoId, hitoDescripcion: fila.hitoDescripcion, hitoFecha: fila.hitoFecha, filas: [] });
      }
      grupos.get(fila.hitoId)!.filas.push(fila);
    }
    this.personalPorHito = Array.from(grupos.values());
  }

  /** Etapas disponibles para "Etapa de salida" en el select de una fila — cualquier hito crítico
   * del cronograma (incluido el mismo de ingreso, por si entra y sale el mismo día no tiene caso,
   * pero no se restringe para no complicar la lista). */
  get etapasSalidaOpts(): HitoCriticoDisponibleDto[] {
    return this.hitosCriticos;
  }

  /** Al elegir/quitar la etapa de salida, recalcula "Semanas" desde las fechas reales del cronograma
   * (mismo criterio que aplicará el backend al guardar) y deja "Semanas" de solo lectura en ese caso. */
  onEtapaSalidaChange(fila: FilaPersonalHito): void {
    if (fila.hitoSalidaId) {
      const salida = this.hitosCriticos.find((h) => h.hitoId === fila.hitoSalidaId);
      fila.semanas = semanasEntreFechas(fila.hitoFecha, salida?.hitoFecha ?? null);
    }
    this.recalcularTotalPersonal(fila);
  }

  /** Prevencionista no suma al presupuesto — es solo un recordatorio de cuándo debe ingresar a la
   * obra, no una dotación que se cobra. Se guarda su cantidad/etapa igual, pero costo 0 siempre.
   * La tarifa ("costoMensual" en el modelo, por compatibilidad) se carga y calcula por SEMANA, igual
   * que la planilla real — no se convierte a mensual (÷ SEMANAS_POR_MES como antes). */
  recalcularTotalPersonal(fila: FilaPersonalHito): void {
    fila.total = fila.rol === 'PREVENCIONISTA'
      ? 0
      : fila.cantidad * fila.costoMensual * fila.semanas;
  }

  // ── Vista matriz: etapas como filas, roles como columnas ────────────────
  // Etapa de salida y Semanas son por ETAPA (una sola vez, no por rol) — se propagan a todas
  // las filas de ese hito. El S/ mes es por ROL (una sola vez, no por etapa) — se propaga a
  // todas las filas de ese rol. El dato que de verdad varía celda por celda es la Cantidad.

  private obtenerFila(hitoId: number, rol: string): FilaPersonalHito | undefined {
    return this.personalFilas.find((f) => f.hitoId === hitoId && f.rol === rol);
  }

  cantidadCelda(hitoId: number, rol: string): number {
    return this.obtenerFila(hitoId, rol)?.cantidad ?? 0;
  }

  actualizarCantidadCelda(hitoId: number, rol: string, valor: number): void {
    const f = this.obtenerFila(hitoId, rol);
    if (!f) return;
    f.cantidad = valor;
    this.recalcularTotalPersonal(f);
    this.cdr.markForCheck();
  }

  etapaSalidaHito(hitoId: number): number | null {
    return this.personalFilas.find((f) => f.hitoId === hitoId)?.hitoSalidaId ?? null;
  }

  actualizarEtapaSalidaHito(hitoId: number, hitoSalidaId: number | null): void {
    const hito = this.hitosCriticos.find((h) => h.hitoId === hitoId);
    let semanas: number | null = null;
    if (hitoSalidaId) {
      const salida = this.hitosCriticos.find((h) => h.hitoId === hitoSalidaId);
      semanas = semanasEntreFechas(hito?.hitoFecha ?? null, salida?.hitoFecha ?? null);
    }
    for (const f of this.personalFilas) {
      if (f.hitoId === hitoId) {
        f.hitoSalidaId = hitoSalidaId;
        if (semanas !== null) f.semanas = semanas;
        this.recalcularTotalPersonal(f);
      }
    }
    this.cdr.markForCheck();
  }

  semanasHito(hitoId: number): number {
    return this.personalFilas.find((f) => f.hitoId === hitoId)?.semanas ?? 0;
  }

  actualizarSemanasHito(hitoId: number, semanas: number): void {
    for (const f of this.personalFilas) {
      if (f.hitoId === hitoId) {
        f.semanas = semanas;
        this.recalcularTotalPersonal(f);
      }
    }
    this.cdr.markForCheck();
  }

  totalHito(hitoId: number): number {
    return this.personalFilas
      .filter((f) => f.hitoId === hitoId)
      .reduce((acc, f) => acc + (f.total || 0), 0);
  }

  /** Agrupado por hito para pintar una sección por hito con sus roles debajo — se recalcula solo
   * en actualizarPersonalPorHito(), no en cada ciclo de change detection (ver esa nota). */
  personalPorHito: { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }[] = [];

  get personalTotalGeneral(): number {
    return this.personalFilas.reduce((acc, f) => acc + (f.total || 0), 0);
  }

  guardarPersonal(): void {
    if (this.personalGuardando) return;
    // La cantidad es lo que decide si la fila se guarda — la tarifa puede cargarse después y no
    // debe borrar cantidades ya tipeadas (antes exigía costoMensual > 0 y esto hacía perder
    // Monitor/Vígia/Encapsulador enteros si "S/ mes Oficial/Peón" todavía estaba en 0).
    // Prevencionista además fuerza costoMensual a 0 al mapear — es el recordatorio de ingreso, no
    // suma al presupuesto.
    const items = this.personalFilas
      .filter((f) => f.cantidad > 0)
      .map((f) => ({
        hitoId: f.hitoId,
        hitoSalidaId: f.hitoSalidaId ?? null,
        rol: f.rol,
        cantidad: f.cantidad,
        semanas: f.semanas,
        costoMensual: f.rol === 'PREVENCIONISTA' ? 0 : f.costoMensual,
      }));

    this.personalGuardando = true;
    this.loader.show();
    this.svc.guardarPersonalHitos(this.projectId, { items }).subscribe({
      next: () => {
        this.personalGuardando = false;
        this.loader.hide();
        Swal.fire({ icon: 'success', title: 'Dotación de personal guardada', timer: 2000, showConfirmButton: false });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.personalGuardando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  asignarHitos(): void {
    if (this.asignandoHitos) return;
    this.asignandoHitos = true;
    this.loader.show();
    this.svc.asignarHitos(this.projectId).subscribe({
      next: (res) => {
        this.asignandoHitos = false;
        this.loader.hide();
        Swal.fire({
          icon: 'success',
          title: 'Hitos asignados',
          text: `${res.lineasActualizadas} línea(s) de consumo repartidas entre los hitos críticos.`,
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.asignandoHitos = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Abre la pantalla real de Cronograma de Hitos (/mejora-continua/milestone-schedule) ya posicionada
   * en este proyecto, saltándose la lista de tarjetas. Es la misma pantalla que se usa en
   * producción — no hay un formulario duplicado dentro de SSOMA. */
  irACronograma(): void {
    this.router.navigate(['/mejora-continua/milestone-schedule'], {
      queryParams: { projectId: this.projectId, projectDescription: this.proyectNombre },
    });
  }

  load(): void {
    this.loading = true;
    this.loader.show();
    this.svc.getPresupuestosPorProyecto(this.projectId).subscribe({
      next: (p) => {
        this.presupuestos = p;
        this.loading = false;
        this.loader.hide();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Trae los drivers de TODOS los proyectos (mismo endpoint que Datos Base): arma el combobox
   * del header para cambiar de proyecto sin salir de la ficha, y separa el de este proyecto para
   * la card editable de arriba. */
  private loadDriverProyecto(): void {
    this.svc.getDrivers().subscribe({
      next: (drivers) => {
        this.proyectos = drivers
          .map((d) => ({ projectId: d.projectId, projectDescription: d.projectDescription }))
          .sort((a, b) => a.projectDescription.localeCompare(b.projectDescription));
        const actual = drivers.find((d) => d.projectId === this.projectId) ?? null;
        this.driverProyecto = actual ? { ...actual, _recalcularRatios: false } : null;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  private loadRatiosDriversRecomendados(): void {
    this.svc.getRatiosDriversRecomendados().subscribe({
      next: (r) => { this.ratiosDriversRecomendados = r; this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  marcarSucioDriver(): void {
    if (this.driverProyecto) this.driverProyecto._dirty = true;
    this.cdr.markForCheck();
  }

  get puedeCalcularPorMedianaDriver(): boolean {
    return !!this.ratiosDriversRecomendados?.hh && !!this.ratiosDriversRecomendados?.trabajadores;
  }

  /** Calcula HH y Trabajadores de la card de Datos Base con el ratio recomendado (mediana
   * histórica) × Área Techada — visible siempre arriba, no escondido detrás de un lápiz. */
  calcularPorMedianaDriver(): void {
    const d = this.driverProyecto;
    if (!d) return;
    const area = Number(d.areaTechadaM2) || 0;
    if (area <= 0) {
      Swal.fire({ icon: 'warning', title: 'Falta el Área', text: 'Ingrese primero el Área Techada (m²) para poder calcular HH y Trabajadores.' });
      return;
    }
    if (!this.ratiosDriversRecomendados?.hh || !this.ratiosDriversRecomendados?.trabajadores) {
      Swal.fire({ icon: 'warning', title: 'Sin ratio recomendado', text: 'Todavía no hay un ratio de HH/Trabajadores recomendado calculado.' });
      return;
    }
    d.hhTotalCasa = Math.round(area * this.ratiosDriversRecomendados.hh.ratioRecomendado * 100) / 100;
    d.trabajadores = Math.round(area * this.ratiosDriversRecomendados.trabajadores.ratioRecomendado);
    d.hhFuente = 'HH_CALCULADO_MEDIANA';
    this.marcarSucioDriver();
  }

  guardarDriver(): void {
    const d = this.driverProyecto;
    if (!d) return;
    if (!d.hhTotalCasa && !d.areaTechadaM2) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Ingrese al menos HH o Área.' });
      return;
    }
    d._guardando = true;
    this.cdr.markForCheck();
    const dto: ActualizarDriversDto = {
      hhTotalCasa: d.hhTotalCasa ?? 0,
      areaTechadaM2: d.areaTechadaM2 ?? 0,
      trabajadores: d.trabajadores ?? 0,
      hhFuente: d.hhFuente,
      recalcularRatios: !!d._recalcularRatios,
    };
    this.svc.actualizarDrivers(d.projectId, dto).subscribe({
      next: (res) => {
        d._guardando = false;
        d._dirty = false;
        Swal.fire({
          icon: 'success',
          title: 'Drivers actualizados',
          text: `${res.ratiosCalculados} ratios recalculados.`,
          timer: 2000,
          showConfirmButton: false,
        });
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        d._guardando = false;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Prellena HH y Trabajadores usando el ratio recomendado (mediana) por m² de área techada,
   * calculado a partir de los proyectos históricos que el responsable marcó como incluidos en
   * Ratios · Dotación. Nunca se aplica solo: el campo queda editable para que confirmes o ajustes. */
  sugerirDesdeHistorico(): void {
    const area = this.formGenerar.areaTechadaM2 || this.driverProyecto?.areaTechadaM2 || 0;
    if (!area) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el Área Techada',
        text: 'Este proyecto no tiene Área Techada configurada. Ingrésala en el campo de arriba antes de sugerir.',
      });
      return;
    }
    if (this.sugiriendoDrivers) return;
    this.sugiriendoDrivers = true;
    this.svc.getRatiosDriversRecomendados().subscribe({
      next: (r) => {
        this.ratiosDriversRecomendados = r;
        this.sugiriendoDrivers = false;
        if (r.hh) this.formGenerar.hhTotalCasa = Math.round(area * r.hh.ratioRecomendado);
        if (r.trabajadores) this.formGenerar.trabajadores = Math.round(area * r.trabajadores.ratioRecomendado);
        if (!r.hh && !r.trabajadores) {
          Swal.fire({ icon: 'info', title: 'Sin ratios calculados', text: 'Ve a Ratios y corre "Calcular" en Ratios de Dotación primero.' });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Sugerencia aplicada',
            text: `HH y Trabajadores estimados según ${r.hh?.nProyectos ?? r.trabajadores?.nProyectos} proyecto(s) histórico(s). Podés ajustarlos antes de generar.`,
            timer: 3000,
            showConfirmButton: false,
          });
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.sugiriendoDrivers = false;
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Suma o quita el adicional estimado de la cuadrilla de acero (ver ACERO_HH_POR_M2 /
   * ACERO_TRABAJADORES_POR_M2 arriba) sobre lo que ya haya en el formulario — nunca reemplaza,
   * solo incrementa/decrementa, para no pisar un ajuste manual o una sugerencia previa. */
  toggleAcero(): void {
    const area = this.formGenerar.areaTechadaM2 || this.driverProyecto?.areaTechadaM2 || 0;
    if (!area) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el Área Techada',
        text: 'Ingresa el Área Techada antes de activar el adicional de acero.',
      });
      this.incluirAcero = false;
      this.cdr.markForCheck();
      return;
    }
    if (this.incluirAcero) {
      this.aceroHhAplicado = Math.round(area * ACERO_HH_POR_M2);
      this.aceroTrabAplicado = Math.round(area * ACERO_TRABAJADORES_POR_M2);
      this.formGenerar.hhTotalCasa = (this.formGenerar.hhTotalCasa || 0) + this.aceroHhAplicado;
      this.formGenerar.trabajadores = (this.formGenerar.trabajadores || 0) + this.aceroTrabAplicado;
    } else {
      this.formGenerar.hhTotalCasa = Math.max(0, (this.formGenerar.hhTotalCasa || 0) - this.aceroHhAplicado);
      this.formGenerar.trabajadores = Math.max(0, (this.formGenerar.trabajadores || 0) - this.aceroTrabAplicado);
      this.aceroHhAplicado = 0;
      this.aceroTrabAplicado = 0;
    }
    this.cdr.markForCheck();
  }

  generar(): void {
    if (this.generando) return;
    this.generando = true;
    this.loader.show();
    this.svc.generarPresupuesto(this.projectId, this.formGenerar).subscribe({
      next: (p) => {
        this.generando = false;
        this.mostrarFormGenerar = false;
        this.loader.hide();
        this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', p.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.generando = false;
        this.loader.hide();
        this.error.handleError(err);
        this.cdr.markForCheck();
      },
    });
  }

  irADetalle(id: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', id]);
  }

  irAControl(id: number): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/presupuesto', id, 'control']);
  }

  volver(): void {
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales']);
  }

  estadoClass(estado: string): string {
    return estado === 'APROBADO' ? 'badge-ok' : 'badge-warn';
  }

  get proyectNombre(): string {
    return this.presupuestos[0]?.projectDescription ?? `Proyecto #${this.projectId}`;
  }
}
