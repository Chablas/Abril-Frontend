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
  DriverProyectoDto, RatiosDriversRecomendadosDto,
  KitResumenDto, KitDetalleDto, KitCalculoLineaDto,
  VigilanciaHitoDto, VigilanciaHitoItemInputDto,
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
}

interface FilaVigilancia extends VigilanciaHitoItemInputDto {
  hitoDescripcion: string;
  hitoFecha: string | null;
  total: number;
}

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

const ROLES_PERSONAL: string[] = [
  'PREVENCIONISTA', 'MONITOR', 'VIGIA', 'ENCAPSULADOR',
  'CAPATAZ', 'OFICIAL', 'OPERARIO', 'PEON', 'AYUDANTE',
];
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
  readonly headerTabs = PRESUPUESTO_TABS;
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

  formGenerar: GenerarPresupuestoDto = {};

  // ── Sugerencia de HH/Trabajadores desde el histórico de otros proyectos ──
  // Nunca se aplica sola: solo prellena el formulario, el responsable confirma o ajusta.
  driverProyecto: DriverProyectoDto | null = null;
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
  readonly rolesPersonal = ROLES_PERSONAL;
  personalFilas: FilaPersonalHito[] = [];
  personalLoading = false;
  personalGuardando = false;

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
    this.svc.getPrecioVigilanciaActual().subscribe({
      next: (p) => { this.precioVigilanciaActual = p.precioUnitario; this.cdr.markForCheck(); },
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

  // Barandas: por cada 3.4 ml se requieren 3 barras FRP de 25mm x 1.7m + 4 barras FRP de 21mm x 2m.
  // Sin merma (vienen cortadas), redondeo hacia arriba por tramo — la variación es mínima.
  barandasMl: number | null = null;
  get barandasTramos(): number {
    return this.barandasMl && this.barandasMl > 0 ? Math.ceil(this.barandasMl / 3.4) : 0;
  }
  get barandasFrp25Ml(): number { return this.barandasTramos * 3 * 1.7; }
  get barandasFrp21Ml(): number { return this.barandasTramos * 4 * 2; }
  /** Número de barras FRP 25mm (piezas de 1.7m) — cada una necesita un poste/tramo de tubería
   * PVC 1" de 60cm, así que esta cantidad alimenta directo el cálculo de Tubería de abajo. */
  get barandasFrp25Unidades(): number { return this.barandasTramos * 3; }

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

  // Ducto (un solo ducto): fenólico 18mm 2.44x1.22 con +10% de exceso; perímetro estimado
  // asumiendo forma cuadrada (lado = raíz del área) para dimensionar el listón de refuerzo;
  // bastidor de listón 2"x3"x12' (12' = 3.6576m). Sin merma adicional.
  private static readonly FENOLICO_AREA_PLANCHA = 2.44 * 1.22;
  private static readonly LISTON_ML_POR_BASTIDOR = 3.6576;
  ductoAreaM2: number | null = null;
  get ductoPlanchasFenolico(): number {
    if (!this.ductoAreaM2 || this.ductoAreaM2 <= 0) return 0;
    const areaEfectiva = this.ductoAreaM2 * 1.10;
    return Math.ceil(areaEfectiva / ProyectoPage.FENOLICO_AREA_PLANCHA);
  }
  get ductoPerimetroEstimado(): number {
    if (!this.ductoAreaM2 || this.ductoAreaM2 <= 0) return 0;
    const lado = Math.sqrt(this.ductoAreaM2);
    return 4 * lado;
  }
  get ductoBastidoresListon(): number {
    const perimetro = this.ductoPerimetroEstimado;
    return perimetro > 0 ? Math.ceil(perimetro / ProyectoPage.LISTON_ML_POR_BASTIDOR) : 0;
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

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    this.load();
    this.loadHitosCriticos();
    this.loadRatios();
    this.loadDriverProyecto();
    // El catálogo de hitos se carga primero: la tabla siempre debe salir armada con TODOS los
    // hitos estándar (con fecha vacía si aún no se llenó), no solo con lo que ya esté guardado.
    this.milestoneSvc.getAllMilestone().subscribe({
      next: (m) => {
        this.catalogoHitos = m;
        this.cdr.markForCheck();
        this.loadScheduleTable();
      },
      error: (err: HttpErrorResponse) => {
        console.error('[cronograma] error cargando catálogo de hitos', err);
        this.errorSchedule = `Error al cargar catálogo de hitos (${err.status}): ${err.error?.message ?? err.message}`;
        this.cdr.markForCheck();
      },
    });
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
      },
      error: () => { this.personalLoading = false; this.cdr.markForCheck(); },
    });
  }

  private construirFilasPersonal(hitos: HitoCriticoDisponibleDto[], existentes: PersonalHitoDto[]): void {
    this.personalFilas = [];
    for (const hito of hitos) {
      for (const rol of ROLES_PERSONAL) {
        const existente = existentes.find((e) => e.hitoId === hito.hitoId && e.rol === rol);
        this.personalFilas.push({
          hitoId: hito.hitoId,
          hitoDescripcion: hito.hitoDescripcion,
          hitoFecha: hito.hitoFecha,
          hitoSalidaId: existente?.hitoSalidaId ?? null,
          rol,
          cantidad: existente?.cantidad ?? 0,
          semanas: existente?.semanas ?? 0,
          costoMensual: existente?.costoMensual ?? 0,
          total: existente?.total ?? 0,
        });
      }
    }
    this.actualizarPersonalPorHito();
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

  recalcularTotalPersonal(fila: FilaPersonalHito): void {
    fila.total = fila.cantidad * fila.costoMensual * (fila.semanas / SEMANAS_POR_MES);
  }

  /** Agrupado por hito para pintar una sección por hito con sus roles debajo — se recalcula solo
   * en actualizarPersonalPorHito(), no en cada ciclo de change detection (ver esa nota). */
  personalPorHito: { hitoId: number; hitoDescripcion: string; hitoFecha: string | null; filas: FilaPersonalHito[] }[] = [];

  get personalTotalGeneral(): number {
    return this.personalFilas.reduce((acc, f) => acc + (f.total || 0), 0);
  }

  guardarPersonal(): void {
    if (this.personalGuardando) return;
    const items = this.personalFilas
      .filter((f) => f.cantidad > 0 && f.costoMensual > 0)
      .map((f) => ({
        hitoId: f.hitoId,
        hitoSalidaId: f.hitoSalidaId ?? null,
        rol: f.rol,
        cantidad: f.cantidad,
        semanas: f.semanas,
        costoMensual: f.costoMensual,
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

  /** Área techada del proyecto (para poder sugerir HH/Trabajadores aunque el usuario no
   * haya escrito un override). Reutiliza el mismo endpoint que la pantalla de Drivers. */
  private loadDriverProyecto(): void {
    this.svc.getDrivers().subscribe({
      next: (drivers) => {
        this.driverProyecto = drivers.find((d) => d.projectId === this.projectId) ?? null;
        this.cdr.markForCheck();
      },
      error: () => {},
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
    this.router.navigate(['/ssoma/gestion/presupuesto-materiales/drivers']);
  }

  estadoClass(estado: string): string {
    return estado === 'APROBADO' ? 'badge-ok' : 'badge-warn';
  }

  get proyectNombre(): string {
    return this.presupuestos[0]?.projectDescription ?? `Proyecto #${this.projectId}`;
  }
}
